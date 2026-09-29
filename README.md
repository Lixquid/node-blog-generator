# Blog Generator

A static site generator for the blog, written in TypeScript.

Posts live in the [`blog` submodule](./blog) as `YYYYMMDD-slug` folders, each
containing an `index.md` (with YAML front matter) plus any number of
locally-referenced assets (images, interactive TypeScript scripts, etc).

## Architecture

```
src/
├── index.ts                 # CLI entrypoint
├── commands.ts              # build / serve / watch command implementations
├── watcher.ts               # file watching + incremental rebuilds
├── transformers/            # modular markdown token transformers
│   ├── createPostTransformer.ts   # the transformer composition helper
│   ├── alertBlockquotes.ts        # blockquotes -> note/tip/warning blocks
│   ├── codeBlock.ts               # code highlighting + codeblock options
│   └── __tests__/                 # unit tests for the transformers
├── lib/
│   ├── core/
│   │   ├── generator.ts     # the SiteGenerator: builds posts & index pages
│   │   ├── parse.ts         # front matter parsing
│   │   ├── render.ts        # handlebars template loading
│   │   ├── rss.ts           # RSS 2.0 feed generation
│   │   ├── types.ts         # shared types (front matter schema, post data)
│   │   └── util.ts          # codeblock argument parsing
│   └── util.ts              # misc utilities
├── templates/               # handlebars templates for pages
└── assets/                  # site-wide static assets
```

Markdown rendering is done with [marked](https://marked.js.org/). The token
stream is passed through a pipeline of modular **transformers**
(`src/transformers/`) before rendering:

- **alertBlockquotes** converts blockquotes starting with `**Note:**`,
  `**Tip:**`, or `**Warning:**` into styled alert blocks.
- **codeBlock** adds highlight.js highlighting, headers (`title=Name`), line
  numbers (`linenumber`, `linenumber=20`), copy-to-clipboard buttons
  (`copy`), interactive HTML demos (`htmldemo`), and semantic styling
  (`type=doesntcompile|errors|incorrect|badpractice|dangerous|correct`) to
  fenced code blocks.

New transformers can be added as standalone modules and included in the
pipeline by extending the `createPostTransformer(...)` call in
`src/commands.ts`.

### Code block copy buttons

Fenced code blocks support a `copy` attribute (in the same info string as
`title`, `linenumber`, and `type`):

````
```typescript copy
console.log("Hello!");
```
````

When present, a copy button (icon plus the text "Copy") is rendered at the
right end of the code block header. Blocks with `copy` but no `title` still
get a header row to host the button. The client-side behaviour lives in
`src/assets/index.ts`: clicking the button copies the code block contents to
the clipboard via `navigator.clipboard` and shows "Copied!" feedback for two
seconds.

### Code block HTML demos

Fenced code blocks support an `htmldemo` attribute:

````
```html htmldemo
<p>Hello, world!</p>
```
````

The block is rendered as a vertically split container: an editable textarea
on the left containing the raw HTML, and an iframe on the right rendering
it. The iframe document includes the site stylesheets, so demos render with
the same look as the rest of the page.

The iframe is server-rendered with the initial code via `srcdoc`, so the
demo is visible even without JavaScript. The client-side behaviour lives in
`src/assets/index.ts`: editing the textarea re-renders the iframe live.
The document template is shared with the server-side transformer
(`htmlDemoDocument` in `src/transformers/codeBlock.ts`); keep the two in
sync.

## Asset resolution

Posts reference their local files with relative URLs
(`./image.png`, `<script src="./index.ts">`). The generator copies every
non-markdown file in a post's folder to `out/<slug>/`, so all relative
references resolve identically in:

- the dev preview (Vite serving `out/` on <http://localhost:8080>), and
- the production build (Vite bundling `out/` into `out/dist`).

## Commands

- `npm run build` - build the entire site to `out/`.
- `npm run build -- 20250615-pizzasizes` - build a single post.
- `npm run watch` - build, serve on <http://localhost:8080>, and watch:
  - changes inside one post's folder rebuild just that post;
  - changes to site-wide assets (`src/assets`), the templates, or the set of
    posts (created/deleted) rebuild the whole site.
  The browser auto-reloads whenever a rebuild finishes.
- `npm run serve` - serve an already-built `out/` directory on port 8080.
- `npm run build:production` - build `out/`, then bundle a minified
  production version with Vite into `out/dist`.
- `npm test` - run the unit tests.

## RSS feed

A full build generates an RSS 2.0 feed at `/rss.xml` (`src/lib/core/rss.ts`).
It contains the visible posts, most recent first, with their front-matter
`description` as the item description and canonical permalinks based on the
site URL (`https://blog.lixquid.com`). The feed URL is advertised on every
page with `<link rel="alternate" type="application/rss+xml">` tags, and
linked in the navigation bar.

The production Vite build does not copy unreferenced files from `out/` into
`out/dist`, so `vite.config.ts` contains a small plugin that emits the
generated feed into the bundle.

## Generator API

`SiteGenerator` (in `src/lib/core/generator.ts`) exposes two build methods:

- `buildPosts(slugs)` - builds the given posts into `out/<slug>/`. Template
  context (previous/next post navigation) is always computed from the full
  list of posts, so single-post builds are identical to the corresponding
  output within a full site build.
- `buildAll()` - builds all posts plus the site-wide assets, tag pages, the
  index page, and the RSS feed.
