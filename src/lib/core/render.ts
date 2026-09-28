import Handlebars from "handlebars";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileInfo } from "../util.ts";

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
    body: string;
    previousPost: { slug: string; title: string } | undefined;
    nextPost: { slug: string; title: string } | undefined;
}

/** Context for the index and tag page templates. */
export interface PostListItem {
    title: string;
    date: string;
    slug: string;
}

/** Context for the index page template. */
export interface IndexPageContext {
    posts: PostListItem[];
    tags: string[];
}

/** Context for the tag page template. */
export interface TagPageContext {
    tag: string;
    posts: PostListItem[];
}

/** All compiled templates, loaded once at startup. */
export interface Templates {
    index: Handlebars.TemplateDelegate<IndexPageContext>;
    post: Handlebars.TemplateDelegate<PostPageContext>;
    tag: Handlebars.TemplateDelegate<TagPageContext>;
    tagIndex: Handlebars.TemplateDelegate<{ tags: string[] }>;
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
    const tagIndex = Handlebars.compile<{ tags: string[] }>(
        await readFile(join(templateDir, "tagIndex.hbs"), "utf8"),
    );

    return { index, post, tag, tagIndex };
}
