import Handlebars from "handlebars";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileInfo } from "../util.ts";
import type { TagType } from "./tags.ts";

const { __dirname } = fileInfo(import.meta.url);

/** Context for the post page template. */
export interface PostPageContext {
    slug: string;
    title: string;
    date: string;
    edited: string | undefined;
    description: string | undefined;
    tags: string[];
    hidden: boolean;
    /** Absolute URL of the post page. */
    url: string;
    body: string;
    /** Pre-serialized JSON-LD Article definition for the post. */
    jsonLd: string;
    previousPost: { slug: string; title: string } | undefined;
    nextPost: { slug: string; title: string } | undefined;
}

/** Context for the index and tag page templates. */
export interface PostListItem {
    title: string;
    date: string;
    slug: string;
}

/** A single tag as displayed in a list of tags. */
export interface TagListItem {
    tag: string;
    /** The subsection the tag belongs to. */
    type: TagType;
    description: string;
}

/** Context for the tag index page template. */
export interface TagListPageContext {
    /** All tags, in alphabetical order. */
    tags: TagListItem[];
}

/** Context for the index page template. */
export interface IndexPageContext {
    posts: PostListItem[];
    /** Tags of type "topic", in alphabetical order. */
    topics: string[];
    /** Tags of type "type", in alphabetical order. */
    types: string[];
}

/** Context for the tag page template. */
export interface TagPageContext {
    tag: string;
    description: string | undefined;
    posts: PostListItem[];
}

/** All compiled templates, loaded once at startup. */
export interface Templates {
    index: Handlebars.TemplateDelegate<IndexPageContext>;
    post: Handlebars.TemplateDelegate<PostPageContext>;
    tag: Handlebars.TemplateDelegate<TagPageContext>;
    tagIndex: Handlebars.TemplateDelegate<TagListPageContext>;
}

/**
 * Loads and compiles all handlebars templates. Must be awaited once before
 * `render*Page` is called.
 */
export async function loadTemplates(): Promise<Templates> {
    const header = Handlebars.compile(
        await readFile(
            join(__dirname, "..", "..", "templates", "partials", "header.hbs"),
            "utf8",
        ),
    );
    Handlebars.registerPartial("header", header);

    const templateDir = join(__dirname, "..", "..", "templates");
    const index = Handlebars.compile<IndexPageContext>(
        await readFile(join(templateDir, "index.hbs"), "utf8"),
    );
    const post = Handlebars.compile<PostPageContext>(
        await readFile(join(templateDir, "post.hbs"), "utf8"),
    );
    const tag = Handlebars.compile<TagPageContext>(
        await readFile(join(templateDir, "tag.hbs"), "utf8"),
    );
    const tagIndex = Handlebars.compile<TagListPageContext>(
        await readFile(join(templateDir, "tagIndex.hbs"), "utf8"),
    );

    return { index, post, tag, tagIndex };
}
