import hljs from "highlight.js";
import type { Tokens } from "marked";
import { parseCodeBlockArgs } from "../lib/core/util.ts";
import type { PostTransformer } from "./createPostTransformer.ts";

/** Semantic types for code blocks, shown with an icon and a coloured border. */
export const codeBlockTypes = [
    "doesntcompile",
    "errors",
    "incorrect",
    "badpractice",
    "dangerous",
    "correct",
] as const;

/** Titles shown when hovering over the codeblock type icons. */
export const codeBlockTypeTitles: Record<string, string> = {
    doesntcompile: "This code will not compile.",
    errors: "This code will error at runtime.",
    incorrect: "This code will not produce the desired result.",
    badpractice: "This code will work, but may cause problems in the future.",
    dangerous:
        "This code is nuanced or has severe consequences; pay extra attention when using it.",
    correct: "This code is correct.",
};

/** Options for {@link createCodeBlockTransformer}. */
export interface CodeBlockTransformerOptions {
    /**
     * The base URL where codeblock type icons are served from. Trailing slash
     * optional; defaults to `/assets`.
     */
    iconBaseUrl?: string;
}

/**
 * Creates the transformer which enhances fenced code blocks.
 *
 * Supported info-string arguments (after the language):
 * - `title=Name` - shows a header above the code block.
 * - `linenumber` - shows line numbers, starting at 1.
 * - `linenumber=20` - shows line numbers, starting at 20.
 * - `type=doesntcompile|errors|incorrect|badpractice|dangerous|correct` -
 *   attaches semantic styling and an icon to the block.
 * - `copy` - shows a "Copy" button in the header which copies the code block
 *   contents to the clipboard (see `src/assets/index.ts` for the client-side
 *   behaviour).
 *
 * Blocks with no special options and an unknown language are left for
 * marked's default renderer.
 */
export function createCodeBlockTransformer(
    options: CodeBlockTransformerOptions = {},
): PostTransformer {
    const iconBase = (options.iconBaseUrl ?? "/assets").replace(/\/$/, "");

    function renderCode(token: Tokens.Code): string | undefined {
        if (!token.lang) return undefined;
        const opts = parseCodeBlockArgs(token.lang);

        const language = typeof opts.language === "string" ? opts.language : undefined;
        let text = token.text;
        let wrapInCodeblock = false;
        let type: string | undefined;
        let linenumber: number | undefined;
        let header: string | undefined;
        let copy = false;

        if (language && hljs.getLanguage(language)) {
            text = hljs.highlight(text, { language }).value;
            wrapInCodeblock = true;
        }

        if (typeof opts.type === "string") {
            const candidate = opts.type.toLowerCase();
            if (
                (codeBlockTypes as readonly string[]).includes(candidate)
            ) {
                type = candidate;
                wrapInCodeblock = true;
            }
        }

        if (opts.linenumber !== undefined) {
            if (opts.linenumber === true) {
                linenumber = 1;
            } else if (typeof opts.linenumber === "string") {
                const n = Number.parseInt(opts.linenumber, 10);
                if (!Number.isNaN(n)) linenumber = n;
            }
            if (linenumber !== undefined) wrapInCodeblock = true;
        }

        if (typeof opts.title === "string") {
            header = opts.title;
            wrapInCodeblock = true;
        }

        if (opts.copy === true) {
            copy = true;
            wrapInCodeblock = true;
        }

        if (!wrapInCodeblock) return undefined;

        const gutter = linenumber
            ? `<pre class="codeblock-gutter">${Array.from(
                  { length: text.split("\n").length },
                  (_, i) => i + linenumber!,
              ).join("\n")}</pre>`
            : "";
        const icon = type
            ? `<img class="codeblock-icon" src="${iconBase}/icon_${type}.svg" title="${codeBlockTypeTitles[type]}" />`
            : "";
        const copyButton = copy
            ? `<button type="button" class="codeblock-copy" title="Copy code to clipboard"><img class="codeblock-copy-icon" src="${iconBase}/icon_copy.svg" alt="" /><span class="codeblock-copy-text">Copy</span></button>`
            : "";
        const headerHtml = header || copy
            ? `<div class="codeblock-header"><span class="codeblock-header-title">${header ?? ""}</span>${copyButton}</div>`
            : "";

        return `<div class="codeblock ${type ? `codeblock-${type}` : ""}">${headerHtml}<div class="codeblock-body">${gutter}<pre class="codeblock-content"><code class="${
            language && hljs.getLanguage(language) ? "hljs" : ""
        }">${text}</code>${icon}</pre></div></div>`;
    }

    const transformer: PostTransformer = (tokens) => {
        const walk = (token: Tokens.Generic): Tokens.Generic => {
            if (token.type === "code") {
                const rendered = renderCode(token as Tokens.Code);
                if (rendered !== undefined) {
                    return {
                        type: "html",
                        raw: rendered,
                        text: rendered,
                        block: true,
                    } as Tokens.Generic;
                }
            }

            const childKeys = ["tokens", "items"];
            for (const key of childKeys) {
                const value = token[key];
                if (Array.isArray(value)) {
                    token[key] = value.map((child: Tokens.Generic) =>
                        walk(child),
                    );
                }
            }
            return token;
        };

        return tokens.map(walk);
    };

    return transformer;
}
