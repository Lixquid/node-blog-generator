import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Marked } from "marked";
import {
    createPostTransformer,
    type PostTransformer,
} from "../../transformers/index.ts";
import { renderTransformed } from "../../transformers/createPostTransformer.ts";
import { parsePost } from "./parse.ts";
import {
    loadTemplates,
    type IndexPageContext,
    type PostListItem,
    type PostPageContext,
    type TagPageContext,
    type Templates,
} from "./render.ts";
import type { PostData, Slug } from "./types.ts";

/** The directory containing all blog post folders. */
export const blogDir = resolveProjectDir("blog");

/** The directory that the site is built into. */
export const outDir = resolveProjectDir("out");

/** The directory of static site-wide assets. */
export const assetsDir = resolveProjectDir("src", "assets");

import { fileInfo } from "../util.ts";

function resolveProjectDir(...parts: string[]): string {
    const { __dirname } = fileInfo(import.meta.url);
    // src/lib/core -> src -> project root
    return join(__dirname, "..", "..", "..", ...parts);
}

/** All valid post directory names, sorted ascending (oldest first). */
export async function getSlugs(): Promise<Slug[]> {
    return (await readdir(blogDir, { withFileTypes: true }))
        .filter(
            (entry) =>
                entry.isDirectory() &&
                !entry.name.startsWith(".") &&
                existsSync(join(blogDir, entry.name, "index.md")),
        )
        .map((entry) => entry.name as Slug)
        .sort();
}

/** Loads and parses every post in the blog directory. */
export async function getPosts(): Promise<PostData[]> {
    const slugs = await getSlugs();
    return Promise.all(
        slugs.map(async (slug): Promise<PostData> => {
            const filename = join(blogDir, slug, "index.md");
            return parsePost(
                slug,
                filename,
                await readFile(filename, "utf8"),
            );
        }),
    );
}

/**
 * The main site generator.
 *
 * A single instance holds the compiled templates and the composed transformer
 * pipeline. All public methods are safe to call repeatedly and concurrently;
 * every method builds in an all-or-nothing fashion with respect to the set of
 * posts used for template context, so a single-post rebuild produces exactly
 * the same output for that post as a full site build.
 */
export class SiteGenerator {
    private templates: Templates | undefined;
    private transformer: PostTransformer;
    private marked: Marked;

    constructor(transformer: PostTransformer = createPostTransformer()) {
        this.transformer = transformer;
        this.marked = new Marked();
    }

    /** Loads templates on first use. */
    private async getTemplates(): Promise<Templates> {
        this.templates ??= await loadTemplates();
        return this.templates;
    }

    /** Ensures the output directory exists. */
    private async ensureOutDir(): Promise<void> {
        if (!existsSync(outDir)) {
            await mkdir(outDir, { recursive: true });
        }
    }

    /**
     * Prepares the per-post template context, given the *full* list of posts.
     * Navigation context (previous/next, hidden banner) is always computed
     * from the complete site, so single-post builds never contain stale
     * cross-post links.
     */
    private async buildPostPage(
        post: PostData,
        allPosts: PostData[],
        transformer: PostTransformer,
    ): Promise<string> {
        const templates = await this.getTemplates();

        const visible = allPosts.filter((p) => !p.frontMatter.hidden);
        const index = visible.findIndex((p) => p.slug === post.slug);

        const fm = post.frontMatter;
        const context: PostPageContext = {
            slug: post.slug,
            title: fm.title,
            date: fm.date,
            edited: fm.edited,
            description: fm.description,
            tags: fm.tags,
            hidden: fm.hidden,
            body: renderTransformed(
                this.marked,
                post.body,
                transformer ?? this.transformer,
                post,
            ),
            previousPost: index > 0
                ? {
                      slug: visible[index - 1].slug,
                      title: visible[index - 1].frontMatter.title,
                  }
                : undefined,
            nextPost:
                index >= 0 && index < visible.length - 1
                    ? {
                          slug: visible[index + 1].slug,
                          title: visible[index + 1].frontMatter.title,
                      }
                    : undefined,
        };

        return templates.post(context);
    }

    /**
     * Builds one or more individual posts into `out/<slug>/`.
     *
     * @param slugs The slugs of the posts to build.
     */
    async buildPosts(slugs: string[]): Promise<void> {
        await this.ensureOutDir();
        const allPosts = await getPosts();
        const bySlug = new Map(allPosts.map((p) => [p.slug, p]));

        for (const slug of slugs) {
            const post = bySlug.get(slug as Slug);
            if (!post) {
                throw new Error(`Unknown post: ${slug}`);
            }

            await this.copyPostAssets(post);

            const html = await this.buildPostPage(
                post,
                allPosts,
                this.transformer,
            );
            const target = join(outDir, post.slug);
            await mkdir(target, { recursive: true });
            await writeFile(join(target, "index.html"), html);
        }
    }

    /**
     * Builds the entire site: all posts, site-wide assets, and all index
     * pages.
     */
    async buildAll(): Promise<void> {
        await this.ensureOutDir();

        // Remove all previously-built post directories and index pages, but
        // leave `dist` (vite's build output) alone.
        for (const entry of await readdir(outDir, { withFileTypes: true })) {
            if (entry.name === "dist") continue;
            await rm(join(outDir, entry.name), {
                recursive: true,
                force: true,
            });
        }

        await this.copyAssets();

        const allPosts = await getPosts();
        await this.buildPosts(allPosts.map((p) => p.slug));

        // Now the tag pages and index page.
        const templates = await this.getTemplates();
        const visible = allPosts.filter((p) => !p.frontMatter.hidden);

        const tags: Record<string, PostListItem[]> = {};
        for (const post of visible) {
            for (const tag of post.frontMatter.tags) {
                (tags[tag] ??= []).push({
                    title: post.frontMatter.title,
                    date: post.frontMatter.date,
                    slug: post.slug,
                });
            }
        }

        // Build the tag pages.
        for (const [tag, posts] of Object.entries(tags)) {
            posts.sort(
                (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
            );
            const context: TagPageContext = { tag, posts };
            const target = join(outDir, "tags", tag);
            await mkdir(target, { recursive: true });
            await writeFile(
                join(target, "index.html"),
                templates.tag(context),
            );
        }

        // Build the tag index page.
        const tagList = Object.keys(tags).sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase()),
        );
        await mkdir(join(outDir, "tags"), { recursive: true });
        await writeFile(
            join(outDir, "tags", "index.html"),
            templates.tagIndex({ tags: tagList }),
        );

        // Build the index page.
        const indexPosts: PostListItem[] = visible
            .map((p) => ({
                title: p.frontMatter.title,
                date: p.frontMatter.date,
                slug: p.slug,
            }))
            .sort(
                (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
            );
        const indexContext: IndexPageContext = {
            posts: indexPosts,
            tags: tagList,
        };
        await writeFile(
            join(outDir, "index.html"),
            templates.index(indexContext),
        );
    }

    /** Copies the non-markdown files of a single post to its output dir. */
    private async copyPostAssets(post: PostData): Promise<void> {
        const postDir = join(blogDir, post.slug);
        const target = join(outDir, post.slug);
        await mkdir(target, { recursive: true });
        for (const entry of await readdir(postDir, { withFileTypes: true })) {
            if (entry.name === "index.md") continue;
            await cp(join(postDir, entry.name), join(target, entry.name), {
                recursive: true,
                force: true,
            });
        }
    }

    /** Copies the site-wide assets into the output directory. */
    private async copyAssets(): Promise<void> {
        await cp(assetsDir, join(outDir, "assets"), {
            recursive: true,
            force: true,
        });
    }
}
