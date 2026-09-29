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


test("htmldemo option renders a split textarea + iframe container", () => {
    const html = render("```html htmldemo\n<p>Hello</p>\n```\n");
    assert.match(html, /class="codeblock codeblock-htmldemo"/);
    assert.match(html, /<div class="htmldemo-split">/);
    assert.match(
        html,
        /<textarea class="htmldemo-textarea" spellcheck="false" aria-label="HTML source code" data-original="&lt;p&gt;Hello&lt;\/p&gt;">&lt;p&gt;Hello&lt;\/p&gt;<\/textarea>/,
    );
    assert.match(
        html,
        /<iframe class="htmldemo-frame" title="HTML demo preview" sandbox="allow-scripts allow-forms allow-modals allow-popups" srcdoc="/,
    );
    assert.doesNotMatch(html, /<code/);
});

test("htmldemo iframe srcdoc contains the stylesheets and the raw code", () => {
    const html = render("```html htmldemo\n<p>Hello</p>\n```\n");
    assert.match(
        html,
        /srcdoc="&lt;!DOCTYPE html&gt;&lt;html&gt;&lt;head&gt;&lt;meta charset=&quot;utf-8&quot; \/&gt;&lt;link rel=&quot;stylesheet&quot; href=&quot;\/assets\/modern-normalize.css&quot; \/&gt;&lt;link rel=&quot;stylesheet&quot; href=&quot;\/assets\/index.css&quot; \/&gt;&lt;\/head&gt;&lt;body class=&quot;htmldemo-body&quot;&gt;&lt;article&gt;&lt;p&gt;Hello&lt;\/p&gt;&lt;\/article&gt;&lt;\/body&gt;&lt;\/html&gt;"/,
    );
});

test("htmldemo escapes HTML inside the textarea and srcdoc", () => {
    const html = render('```html htmldemo\n<img src="a&b">\n```\n');
    assert.match(
        html,
        /<textarea class="htmldemo-textarea" spellcheck="false" aria-label="HTML source code" data-original="&lt;img src=&quot;a&amp;b&quot;&gt;">&lt;img src=&quot;a&amp;b&quot;&gt;<\/textarea>/,
    );
});

test("htmldemo=small adds the htmldemo-small class to the split container", () => {
    const html = render("```html htmldemo=small\n<p>Hello</p>\n```\n");
    assert.match(html, /<div class="htmldemo-split htmldemo-small">/);
});

test("plain htmldemo does not add the htmldemo-small class", () => {
    const html = render("```html htmldemo\n<p>Hello</p>\n```\n");
    assert.match(html, /<div class="htmldemo-split">/);
    assert.doesNotMatch(html, /htmldemo-small/);
});

test("htmldemo supports the title option", () => {
    const html = render('```html htmldemo title="My Demo"\n<p>Hello</p>\n```\n');
    assert.match(
        html,
        /<span class="codeblock-header-title">My Demo<\/span>/,
    );
});
