import frontmatter from "front-matter";
import Handlebars from "handlebars";
import hljs from "highlight.js";
import { Marked, Tokens } from "marked";
import fs from "node:fs";
import { join, normalize } from "node:path";

//#region Types
interface FrontMatter {
    title: string;
    date: string; // ISO-8601 date
    edited?: string | undefined; // ISO-8601 date
    tags: string[];
    hidden?: boolean | undefined;
    related?: string[] | undefined;
}

interface PostData {
    slug: string;
    filename: string;
    body: string;

    title: string;
    date: string;
    edited?: string | undefined;
    hidden: boolean;
    tags: string[];
    related?: string[] | undefined;
    previousPost:
        | {
              slug: string;
              title: string;
          }
        | undefined;
    nextPost:
        | {
              slug: string;
              title: string;
          }
        | undefined;
}
//#endregion

//#region Util
function copyFolderSync(from: string, to: string) {
    if (!fs.existsSync(to)) fs.mkdirSync(to);
    fs.readdirSync(from, { withFileTypes: true }).forEach((entry) => {
        const src = join(from, entry.name);
        const dest = join(to, entry.name);
        entry.isDirectory()
            ? copyFolderSync(src, dest)
            : fs.copyFileSync(src, dest);
    });
}

/**
 * Parses the argument string to a backtick code block.
 *
 * The argument string is a space-separated list of key=value pairs. The first
 * element is a bare string that is output in the `language` key. Values can be
 * quoted with double quotes to contain spaces. Keypairs with no value are
 * output with a value of `true`.
 */
function parseCodeArguments(str: string): Record<string, string | boolean> {
    const out: Record<string, string | boolean> = {};
    const args = str.split(" ");
    const language = args.shift();
    if (language) out.language = language;

    for (let i = 0; i < args.length; i++) {
        const [key, value] = args[i].split("=", 2);
        if (!value) {
            out[key] = true;
        } else if (value[0] == '"') {
            let str = [value.slice(1)];
            while (i < args.length - 1) {
                i++;
                if (args[i].endsWith('"')) {
                    break;
                }
                str.push(args[i]);
            }
            str.push(args[i].slice(0, -1));
            out[key] = str.join(" ");
        } else {
            out[key] = value;
        }
    }

    return out;
}
//#endregion

//#region Handlebars Templates
Handlebars.registerPartial(
    "header",
    Handlebars.compile(
        fs.readFileSync(
            join(__dirname, "templates", "partials", "header.hbs"),
            "utf8"
        )
    )
);

const indexTemplate = Handlebars.compile<{ posts: PostData[]; tags: string[] }>(
    fs.readFileSync(join(__dirname, "templates", "index.hbs"), "utf8")
);
const postTemplate = Handlebars.compile<PostData>(
    fs.readFileSync(join(__dirname, "templates", "post.hbs"), "utf8")
);
const tagIndexTemplate = Handlebars.compile<{ tags: string[] }>(
    fs.readFileSync(join(__dirname, "templates", "tagIndex.hbs"), "utf8")
);
const tagTemplate = Handlebars.compile<{ tag: string; posts: PostData[] }>(
    fs.readFileSync(join(__dirname, "templates", "tag.hbs"), "utf8")
);
//#endregion

const codeBlockTypeTitles = {
    doesntcompile: "This code will not compile.",
    errors: "This code will error at runtime.",
    incorrect: "This code will not produce the desired result.",
    badpractice: "This code will work, but may cause problems in the future.",
    dangerous:
        "This code is nuanced or has severe consequences; pay extra attention when using it.",
    correct: "This code is correct.",
} as Record<string, string>;

const marked: Marked = new Marked({
    extensions: [
        {
            // Support for colorizing blockquotes that start with a
            // <strong> tag with the text "Note", "Tip", or "Warning"
            name: "blockquote",
            renderer(rawToken) {
                const token = rawToken as Tokens.Blockquote;
                // We're looking for p > strong("Note:?")

                const p = token.tokens[0] as Tokens.Paragraph;
                if (!p || p.type !== "paragraph") return false;
                const strong = p.tokens[0] as Tokens.Strong;
                if (!strong || strong.type !== "strong") return false;

                const type = strong.text.toLowerCase();
                if (type === "note" || type === "note:") {
                    return (
                        `<blockquote class="alert-note">` +
                        marked.parse(token.text) +
                        "</blockquote>"
                    );
                }
                if (type === "tip" || type === "tip:") {
                    return (
                        `<blockquote class="alert-tip">` +
                        marked.parse(token.text) +
                        "</blockquote>"
                    );
                }
                if (type === "warning" || type === "warning:") {
                    return (
                        `<blockquote class="alert-warning">` +
                        marked.parse(token.text) +
                        "</blockquote>"
                    );
                }
                return false;
            },
        },
        {
            // Support for code blocks options
            // Options are key=value pairs, separated by spaces
            //
            // First bare word: language, highlighted by highlight.js
            // title: Show some text above the code block
            //        Can be used for a filename, for example
            // linenumber: If bare, shows line numbers
            //             If set with number value, starts at that number
            // type: Semantic state of the code block
            name: "code",
            renderer(rawToken) {
                const token = rawToken as Tokens.Code;
                if (!token.lang) return false;
                const options = parseCodeArguments(token.lang);

                let language = options.language;
                let text = token.text;
                let wrapInCodeblock = false;
                let type: string | undefined = undefined;
                let linenumber: number | undefined = undefined;
                let header: string | undefined = undefined;

                if (
                    language &&
                    typeof language === "string" &&
                    hljs.getLanguage(language)
                ) {
                    text = hljs.highlight(text, { language }).value;
                    wrapInCodeblock = true;
                }

                if (options.type && typeof options.type === "string") {
                    switch (options.type.toLowerCase()) {
                        case "doesntcompile":
                        case "errors":
                        case "incorrect":
                        case "badpractice":
                        case "dangerous":
                        case "correct":
                            type = options.type.toLowerCase();
                            wrapInCodeblock = true;
                    }
                }

                if (options.linenumber) {
                    if (options.linenumber === true) {
                        linenumber = 1;
                    } else {
                        const n = parseInt(options.linenumber);
                        if (!isNaN(n)) linenumber = n;
                    }
                    wrapInCodeblock = true;
                }

                if (options.title && typeof options.title === "string") {
                    header = options.title;
                    wrapInCodeblock = true;
                }

                if (!wrapInCodeblock) return false;

                return (
                    `<div class="codeblock ${
                        type ? "codeblock-" + type : ""
                    }">` +
                    (header
                        ? `<div class="codeblock-header">${header}</div>`
                        : "") +
                    `<div class="codeblock-body">` +
                    (linenumber
                        ? `<pre class="codeblock-gutter">${Array.from(
                              { length: text.split("\n").length },
                              (_, i) => i + linenumber!
                          ).join("\n")}</pre>`
                        : "") +
                    `<pre class="codeblock-content"><code class="${
                        language ? "hljs" : ""
                    }">` +
                    text +
                    `</code>` +
                    (type
                        ? `<img class="codeblock-icon" src="/assets/icon_${type}.svg" title="${codeBlockTypeTitles[type]}" />`
                        : "") +
                    `</pre></div></div>`
                );
            },
        },
    ],
});

// Create or clear the output directory
const outputPath = normalize(join(__dirname, "..", "out"));
if (fs.existsSync(outputPath)) fs.rmSync(outputPath, { recursive: true });
fs.mkdirSync(outputPath);
fs.mkdirSync(join(outputPath, "tags"));

// Get a list of all the blog post slugs (folder names)
const slugs = fs
    .readdirSync(join(__dirname, "..", "blog"), {
        withFileTypes: true,
    })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

// Build metadata for each blog post
const allPosts = slugs.map((slug) => {
    const filename = normalize(join(__dirname, "..", "blog", slug, "index.md"));
    const content = fs.readFileSync(filename, "utf8");
    const data = frontmatter<FrontMatter>(content);
    return {
        slug,
        filename,
        title: data.attributes.title,
        date: data.attributes.date,
        edited: data.attributes.edited,
        hidden: data.attributes.hidden ?? false,
        tags: data.attributes.tags,
        related: data.attributes.related,
        body: data.body,
    };
}) as PostData[];
const posts = allPosts.filter((post) => !post.hidden);

posts.forEach((post, i) => {
    // Find the previous and next posts
    post.previousPost = i > 0 ? posts[i - 1] : undefined;
    post.nextPost = i < posts.length - 1 ? posts[i + 1] : undefined;
});

// Copy the assets folder
copyFolderSync(join(__dirname, "assets"), join(outputPath, "assets"));

// Build output for each blog post
for (const post of allPosts) {
    // Create the output directory for this post
    const postPath = normalize(join(outputPath, post.slug));
    fs.mkdirSync(postPath);

    // Copy over non-index.md files
    fs.readdirSync(join(__dirname, "..", "blog", post.slug), {
        withFileTypes: true,
    })
        .filter((entry) => entry.name !== "index.md")
        .forEach((entry) => {
            fs.copyFileSync(
                join(__dirname, "..", "blog", post.slug, entry.name),
                join(postPath, entry.name)
            );
        });

    // Process the post body with Marked and Handlebars
    fs.writeFileSync(
        join(postPath, "index.html"),
        postTemplate({
            ...post,
            body: marked.parse(post.body) as string,
        })
    );
}

// Build the tag pages and tag index page
const tags: { [tag: string]: PostData[] } = {};
for (const post of posts) {
    for (const tag of post.tags) {
        if (!tags[tag]) tags[tag] = [];
        tags[tag].push(post);
    }
}

for (const [tag, postsRaw] of Object.entries(tags)) {
    // Create a sorted list of posts for this tag
    const posts = postsRaw.slice().sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Create the output directory for this tag
    const tagPath = normalize(join(outputPath, "tags", tag));
    fs.mkdirSync(tagPath);

    // Build the tag page
    fs.writeFileSync(
        join(tagPath, "index.html"),
        tagTemplate({
            tag,
            posts,
        })
    );
}

(function () {
    // Create an alphabetically sorted list of tags
    const tagList = Object.keys(tags).sort((a, b) => {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    // Build the tag index page
    fs.writeFileSync(
        join(outputPath, "tags", "index.html"),
        tagIndexTemplate({
            tags: tagList,
        })
    );
})();

// Compile the index page
(function () {
    // Create an alphabetically sorted list of tags
    const tagList = Object.keys(tags).sort((a, b) => {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    // Create a sorted list of posts
    const postList = posts.slice().sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Build the index page
    fs.writeFileSync(
        join(outputPath, "index.html"),
        indexTemplate({
            posts: postList,
            tags: tagList,
        })
    );
})();
