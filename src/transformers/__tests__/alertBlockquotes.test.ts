import assert from "node:assert/strict";
import test from "node:test";
import { Marked } from "marked";
import { createAlertBlockquotesTransformer } from "../alertBlockquotes.ts";
import { createPostTransformer } from "../createPostTransformer.ts";
import type { PostData } from "../../lib/core/types.ts";

const marked = new Marked();
const transformer = createPostTransformer(createAlertBlockquotesTransformer());
const fakePost = {} as PostData;

function render(markdown: string): string {
    return marked.parser(transformer(marked.lexer(markdown), fakePost));
}

test("note callout", () => {
    const html = render("> **Note:** hello world");
    assert.match(html, /^<blockquote class="alert-note">/);
    assert.match(html, /<strong>Note:<\/strong> hello world/);
});

test("tip callout without colon", () => {
    const html = render("> **Tip** hello");
    assert.match(html, /^<blockquote class="alert-tip">/);
});

test("warning callout with markdown body", () => {
    const html = render("> **Warning:**\n> Some *emphasised* text.");
    assert.match(html, /^<blockquote class="alert-warning">/);
    assert.match(html, /<em>emphasised<\/em>/);
});

test("regular blockquotes are untouched", () => {
    const html = render("> This is a normal quote.");
    assert.equal(
        html,
        "<blockquote>\n<p>This is a normal quote.</p>\n</blockquote>\n",
    );
});

test("unrelated strong start does not create an alert", () => {
    const html = render("> **Banana:** hello");
    assert.equal(
        html,
        "<blockquote>\n<p><strong>Banana:</strong> hello</p>\n</blockquote>\n",
    );
});
