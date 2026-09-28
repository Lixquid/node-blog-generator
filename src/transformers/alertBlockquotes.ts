import { Marked, type Tokens } from "marked";
import type { PostTransformer } from "./createPostTransformer.ts";

/** The set of supported alert types, and the CSS class they map to. */
export const alertTypes = {
    note: "alert-note",
    tip: "alert-tip",
    warning: "alert-warning",
} as const;

export type AlertType = keyof typeof alertTypes;

/** How deep into nested blockquotes to search for an alert marker. */
const MAX_NESTING = 4;

/**
 * Extracts the alert type from the first paragraph of a blockquote, if it
 * starts with a `<strong>` tag containing `Note`, `Tip`, or `Warning`
 * (optionally followed by a colon).
 *
 * @param paragraph The first paragraph token of a blockquote.
 * @returns The alert type, or `undefined` if this is not an alert.
 */
function getAlertType(paragraph: Tokens.Paragraph): AlertType | undefined {
    const first = paragraph.tokens[0];
    if (!first || first.type !== "strong") return undefined;
    const text = (first as Tokens.Strong).text
        .toLowerCase()
        .replace(/:$/, "")
        .trim();
    if (text === "note" || text === "tip" || text === "warning") {
        return text;
    }
    return undefined;
}

/**
 * Creates a transformer converting blockquotes which begin with a strong tag
 * reading `Note`, `Tip`, or `Warning` into coloured alert blocks.
 *
 * The `<strong>` marker is preserved in the output so the alert text reads
 * naturally, for example: `> **Note:** Some text.` becomes
 * `<blockquote class="alert-note"><p><strong>Note:</strong> Some text.</p>...`.
 *
 * Nested blockquotes are supported: the marker may appear up to
 * {@link MAX_NESTING} levels deep.
 */
export function createAlertBlockquotesTransformer(): PostTransformer {
    // A dedicated Marked instance to render the blockquote contents. It must
    // not have the codeblock transformer applied, and re-entrancy is fine
    // because it uses the default renderers.
    const inner = new Marked();

    /** Renders the paragraph children following the strong marker. */
    function renderInner(token: Tokens.Blockquote): string {
        // `token.text` holds the raw markdown of the blockquote with the
        // leading `> ` markers stripped, ready for re-parsing.
        return inner.parse(token.text) as string;
    }

    function transformToken(
        token: Tokens.Blockquote,
        depth: number,
    ): string | undefined {
        if (depth > MAX_NESTING) return undefined;

        const first = token.tokens[0];
        if (!first) return undefined;

        if (first.type === "blockquote") {
            // Look for a nested alert marker.
            const nested = transformToken(
                first as Tokens.Blockquote,
                depth + 1,
            );
            if (nested) return nested;
        }

        if (first.type !== "paragraph") return undefined;
        const alertType = getAlertType(first as Tokens.Paragraph);
        if (!alertType) return undefined;

        return `<blockquote class="${alertTypes[alertType]}">${renderInner(token)}</blockquote>`;
    }

    const transformer: PostTransformer = (tokens) => {
        const walk = (token: Tokens.Generic): Tokens.Generic => {
            if (token.type === "blockquote") {
                const rendered = transformToken(
                    token as Tokens.Blockquote,
                    1,
                );
                if (rendered !== undefined) {
                    return {
                        type: "html",
                        raw: rendered,
                        // Pre-rendered, so the parser outputs it verbatim.
                        text: rendered,
                        block: true,
                    } as Tokens.Generic;
                }
            }

            // Recurse into children so alerts work inside lists, etc.
            const childKeys = ["tokens", "items", "rows"];
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
