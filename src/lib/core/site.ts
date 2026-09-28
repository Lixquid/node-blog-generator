/**
 * Convenience re-exports of the core site-building API.
 *
 * The main implementation lives in `generator.ts`.
 */

export {
    SiteGenerator,
    blogDir,
    outDir,
    assetsDir,
    getSlugs,
    getPosts,
} from "./generator.ts";
export { parsePost } from "./parse.ts";
export * from "./types.ts";
