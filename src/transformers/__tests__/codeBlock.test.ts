import assert from "node:assert/strict";
import test from "node:test";
import { Marked } from "marked";
import { createCodeBlockTransformer } from "../codeBlock.ts";
import { createPostTransformer } from "../createPostTransformer.ts";
import type { PostData } from "../../lib/core/types.ts";

const marked = new Marked();
const transformer = createPostTransformer(createCodeBlockTransformer());
const fakePost = {} as PostData;

function render(markdown: string): string {
    return marked.parser(transformer(marked.lexer(markdown), fakePost));
}

test("plain unknown-language blocks are untouched", () => {
    const html = render("```\nfoo\n```\n");
    assert.equal(html, "<pre><code>foo\n</code></pre>\n");
});

test("known languages are highlighted", () => {
    const html = render("```ts\nconst a = 1;\n```\n");
    assert.match(html, /class="hljs"/);
    assert.match(html, /<span class="hljs-keyword">const<\/span>/);
});

test("linenumber option adds a gutter", () => {
    const html = render("```ts linenumber\na;\nb;\n```\n");
    assert.match(html, /<pre class="codeblock-gutter">1\n2<\/pre>/);
});

test("linenumber offset option is respected", () => {
    const html = render("```ts linenumber=20\ncode\n```\n");
    assert.match(html, /<pre class="codeblock-gutter">20<\/pre>/);
});

test("title option adds a header", () => {
    const html = render('```ts title="My Name"\ncode\n```\n');
    assert.match(
        html,
        /<span class="codeblock-header-title">My Name<\/span>/,
    );
});

test("copy option adds a copy button", () => {
    const html = render("```ts copy\ncode\n```\n");
    assert.match(html, /<div class="codeblock-header">/);
    assert.match(html, /<button type="button" class="codeblock-copy"/);
    assert.match(html, /src="\/assets\/icon_copy\.svg"/);
    assert.match(html, /<span class="codeblock-copy-text">Copy<\/span>/);
});

test("copy option shows a header even without a title", () => {
    const html = render("```ts copy\ncode\n```\n");
    assert.match(html, /<span class="codeblock-header-title"><\/span>/);
});

test("title and copy options combine in one header", () => {
    const html = render('```ts title="My Name" copy\ncode\n```\n');
    assert.match(
        html,
        /<span class="codeblock-header-title">My Name<\/span>.*<button type="button" class="codeblock-copy"/,
    );
});

test("type option adds styling and an icon", () => {
    const html = render("```ts type=correct\ncode\n```\n");
    assert.match(html, /class="codeblock codeblock-correct"/);
    assert.match(html, /src="\/assets\/icon_correct\.svg"/);
    assert.match(html, /title="This code is correct\." \/>/);
});

test("invalid type option is ignored", () => {
    const html = render("```ts type=banana\ncode\n```\n");
    assert.doesNotMatch(html, /codeblock-(?:doesntcompile|errors|incorrect|badpractice|dangerous|correct)/);
});
