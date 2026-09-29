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
 * Escapes a string for safe inclusion in HTML text content or inside a
 * double-quoted attribute value.
 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Builds the full HTML document rendered inside an `htmldemo` iframe.
 *
 * The site stylesheets are included so that demos render with the same look
 * as the surrounding page. Since `srcdoc` documents inherit the base URL of
 * their parent, the absolute `/assets/...` paths resolve correctly.
 *
 * The code is wrapped in an `<article>` because most content styling in the
 * site stylesheet (buttons, form controls, headings, ...) is scoped under
 * `article`, matching how this content appears inside a blog post. The body
 * gets the `htmldemo-body` class so it can be padded independently of the
 * main page (see `.htmldemo-body` in `src/assets/index.css`).
 *
 * NOTE: this template is duplicated in `src/assets/index.ts` for the
 * client-side live updates; keep the two in sync.
 */
export function htmlDemoDocument(code: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><link rel="stylesheet" href="/assets/modern-normalize.css" /><link rel="stylesheet" href="/assets/index.css" /></head><body class="htmldemo-body"><article>${code}</article></body></html>`;
}

/** Supported value variants for the `htmldemo` code block option. */
export type HtmlDemoSize = "default" | "small";

/**
 * Renders a code block with the `htmldemo` option as an editable demo.
 */
export function renderHtmlDemo(
    opts: Record<string, string | boolean>,
    text: string,
    size: HtmlDemoSize = "default",
): string {
    const header = typeof opts.title === "string" ? opts.title : undefined;
    const headerHtml = header !== undefined
        ? `<div class="codeblock-header"><span class="codeblock-header-title">${header}</span></div>`
        : "";
    const sizeClass = size === "small" ? " htmldemo-small" : "";
    // `data-original` holds the pristine block contents so the client-side
    // script can reset the textarea on page load (browsers may restore the
    // user's last-edited value on reload, which would desync it from the
    // server-rendered iframe srcdoc).
    return `<div class="codeblock codeblock-htmldemo">${headerHtml}<div class="htmldemo-split${sizeClass}"><textarea class="htmldemo-textarea" spellcheck="false" aria-label="HTML source code" data-original="${escapeHtml(text)}">${escapeHtml(text)}</textarea><iframe class="htmldemo-frame" title="HTML demo preview" sandbox="allow-scripts allow-forms allow-modals allow-popups" srcdoc="${escapeHtml(htmlDemoDocument(text))}"></iframe></div></div>`;
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
 * - `htmldemo` - turns the block into an interactive HTML demo: a vertically
 *   split container with an editable textarea (left, containing the raw HTML)
 *   and an iframe (right, rendering the code) at the default height of `20em`.
 *   The iframe is server-rendered with the initial code so that the demo is
 *   visible even without JavaScript; see `src/assets/index.ts` for the
 *   live-update behaviour.
 * - `htmldemo=small` - like `htmldemo`, but the split container is only `8em`
 *   tall (see `.htmldemo-small` in `src/assets/index.css`).
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

        if (opts.htmldemo === true || opts.htmldemo === "small") {
            return renderHtmlDemo(
                opts,
                token.text,
                opts.htmldemo === "small" ? "small" : "default",
            );
        }

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
