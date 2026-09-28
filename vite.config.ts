import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { type PluginOption, defineConfig } from "vite";

/**
 * In dev mode, Vite only serves `dir/index.html` for URLs that already end
 * with a trailing slash. Links generated without one (e.g. `/20250625-monads`)
 * resolve to a valid directory on disk and otherwise 404. This plugin issues a
 * redirect to the same URL with a trailing slash in that case.
 */
function directoryRedirectPlugin(): PluginOption {
    return {
        name: "directory-redirect",
        apply: "serve",
        enforce: "pre",
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                let pathname: string;
                let search: string;
                try {
                    const url = new URL(req.url ?? "/", "http://localhost");
                    pathname = decodeURIComponent(url.pathname);
                    search = url.search;
                } catch {
                    next();
                    return;
                }
                if (
                    !pathname.startsWith("/") ||
                    pathname.endsWith("/") ||
                    pathname.includes("\0")
                ) {
                    next();
                    return;
                }
                try {
                    const filePath = join(server.config.root, pathname);
                    if (statSync(filePath).isDirectory()) {
                        res.statusCode = 301;
                        res.setHeader("Location", `${pathname}/${search}`);
                        res.end();
                        return;
                    }
                } catch {
                    // Not a directory (or unreadable): fall through.
                }
                next();
            });
        },
    };
}

// Directory containing this config file: the project root.
const projectRoot: string = import.meta.dirname;

/**
 * The generated RSS feed is not referenced from any HTML entrypoint, so it
 * would not otherwise be copied into the production bundle. This plugin
 * emits it as a bundle asset instead.
 */
function rssFilePlugin(): PluginOption {
    return {
        name: "rss-file",
        apply: "build",
        generateBundle() {
            this.emitFile({
                type: "asset",
                fileName: "rss.xml",
                source: readFileSync(join(projectRoot, "out", "rss.xml"), "utf8"),
            });
        },
    };
}

// Find all *.html files in out and mark them as entrypoints
function recursiveSearch(dir: string): string[] {
    const out: string[] = [];
    for (const file of readdirSync(dir, { withFileTypes: true })) {
        if (file.name === "dist") continue;
        if (file.isDirectory()) {
            out.push(...recursiveSearch(join(dir, file.name)));
        } else if (file.name.endsWith(".html")) {
            out.push(join(dir, file.name));
        }
    }
    return out;
}
const entryFiles = recursiveSearch(join(projectRoot, "out"));

export default defineConfig({
    root: "out",
    plugins: [directoryRedirectPlugin(), rssFilePlugin()],
    build: {
        outDir: "dist",
        rollupOptions: {
            input: entryFiles.reduce(
                (acc, path, i) => {
                    const p = resolve(projectRoot, path);
                    acc[i.toString()] = p;
                    return acc;
                },
                {} as Record<string, string>,
            ),
        },
    },
    server: {
        port: 8080,
        host: true,
    },
});
