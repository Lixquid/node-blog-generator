import { existsSync, watch as watchFs } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { type SiteGenerator, assetsDir, blogDir } from "./lib/core/generator.ts";
import { fileInfo } from "./lib/util.ts";

const { __dirname } = fileInfo(import.meta.url);

/** All valid post slugs currently on disk. */
async function getCurrentSlugs(): Promise<Set<string>> {
    const entries = await readdir(blogDir, { withFileTypes: true });
    return new Set(
        entries
            .filter(
                (entry) =>
                    entry.isDirectory() &&
                    !entry.name.startsWith(".") &&
                    existsSync(join(blogDir, entry.name, "index.md")),
            )
            .map((entry) => entry.name),
    );
}

/**
 * Watches the blog and asset directories, rebuilding posts or the entire
 * site as appropriate:
 *
 * - Changes inside a single post directory rebuild only that post.
 * - Changes to site-wide assets (`src/assets`), the templates, or the set
 *   of posts (a post directory created, deleted, or renamed) trigger a
 *   full rebuild.
 */
export async function watchCommand(generator: SiteGenerator): Promise<void> {
    // (The initial build and the dev server are started by the caller.)
    const templateDir = join(__dirname, "templates");

    let rebuilding = false;
    let pendingFull = false;
    const pendingSlugs = new Set<string>();

    async function processPending(): Promise<void> {
        if (rebuilding) return;
        rebuilding = true;
        try {
            while (pendingFull || pendingSlugs.size > 0) {
                if (pendingFull) {
                    pendingFull = false;
                    pendingSlugs.clear();
                    console.log("Rebuilding site...");
                    try {
                        await generator.buildAll();
                        console.log("Rebuild complete.");
                    } catch (err) {
                        console.error("Rebuild failed:", err);
                    }
                } else {
                    const slugs = [...pendingSlugs];
                    pendingSlugs.clear();
                    console.log(`Rebuilding posts: ${slugs.join(", ")}`);
                    try {
                        await generator.buildPosts(slugs);
                        console.log("Rebuild complete.");
                    } catch (err) {
                        console.error("Rebuild failed:", err);
                    }
                }
            }
        } finally {
            rebuilding = false;
        }
    }

    function scheduleFull(): void {
        pendingFull = true;
        void processPending();
    }

    function schedulePost(slug: string): void {
        pendingSlugs.add(slug);
        void processPending();
    }

    // Watch the blog directory recursively. Changes in unknown post
    // directories (new or deleted posts) trigger a full rebuild; changes in
    // known ones only rebuild that post.
    watchFs(blogDir, { recursive: true }, async (event, filename) => {
        if (!filename) {
            scheduleFull();
            return;
        }
        const slug = filename.split(/[\\/]/)[0];
        const knownSlugs = await getCurrentSlugs();
        if (!knownSlugs.has(slug)) {
            scheduleFull();
            return;
        }
        schedulePost(slug);
    });

    // Changes to site-wide assets or templates require a full rebuild.
    watchFs(assetsDir, { recursive: true }, scheduleFull);
    watchFs(templateDir, { recursive: true }, scheduleFull);

    console.log(
        `Watching ${blogDir}, ${assetsDir}, and ${templateDir}. Press Ctrl+C to stop.`,
    );
}
