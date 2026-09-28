import { join, resolve } from "node:path";
import type { ViteDevServer } from "vite";
import { SiteGenerator, outDir } from "./lib/core/generator.ts";
import {
    createAlertBlockquotesTransformer,
    createCodeBlockTransformer,
} from "./transformers/index.ts";
import { createPostTransformer } from "./transformers/createPostTransformer.ts";
import { watchCommand } from "./watcher.ts";

/** The shared transformer pipeline, used by all commands. */
const transformer = createPostTransformer(
    createAlertBlockquotesTransformer(),
    createCodeBlockTransformer(),
);

/** Creates a generator with the standard transformer pipeline. */
export function createGenerator(): SiteGenerator {
    return new SiteGenerator(transformer);
}

//#region build

/** Builds either the entire site, or a single post if `slug` is given. */
export async function buildCommand(slug?: string): Promise<void> {
    const generator = createGenerator();
    if (slug) {
        await generator.buildPosts([slug]);
        console.log(`Built post ${slug} to ${join(outDir, slug)}`);
    } else {
        await generator.buildAll();
        console.log(`Built site to ${outDir}`);
    }
}

//#endregion

//#region serve

let viteServer: ViteDevServer | undefined;

/**
 * Serves the `out` directory over HTTP on port 8080, using Vite's dev
 * server. Does not build anything; run the `build` command first.
 */
export async function serveCommand(): Promise<void> {
    const { createServer } = await import("vite");
    viteServer = await createServer({
        // Point at the real config file: Vite resolves `configFile` relative
        // to the inline `root` (`out`), which has no config of its own.
        configFile: resolve(
            join(import.meta.dirname ?? ".", "..", "vite.config.ts"),
        ),
        root: outDir,
        server: { port: 8080, host: true },
        appType: "mpa",
        // The site is plain static HTML with no bare-module imports; skip
        // the esbuild dependency scanner entirely (it otherwise races the
        // watcher rebuilding `out` while the server starts).
        optimizeDeps: { noDiscovery: true },
    });
    await viteServer.listen();
    console.log(`Serving ${outDir} at http://localhost:8080/`);
}

//#endregion

//#region watch

/**
 * Builds the site, starts the preview server, and watches for changes,
 * rebuilding single posts or the entire site as appropriate.
 */
export async function devCommand(): Promise<void> {
    const generator = createGenerator();
    await generator.buildAll();
    await serveCommand();
    await watchCommand(generator);

    // Wait forever, or until interrupted.
    return new Promise(() => {});
}

//#endregion
