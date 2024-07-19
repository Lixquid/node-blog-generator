import { readdirSync, stat } from "node:fs";
import { join, resolve } from "node:path";
import { type PluginOption, defineConfig } from "vite";

/** Redirects all requests from `/foo` to `/foo/` if `out/foo` is a
 * directory. */
function redirectMissingTrailingSlash(): PluginOption {
	return {
		name: "redirect-missing-trailing-slash",
		configureServer({ middlewares }) {
			middlewares.use((req, res, next) => {
				if (req.url?.endsWith("/")) {
					next();
					return;
				}

				const path = join(__dirname, "out", req.url!);
				stat(path, (err, stats) => {
					if (!err && stats.isDirectory()) {
						res.statusCode = 302;
						res.setHeader("Location", req.url! + "/");
						res.end();
						return;
					}
					next();
				});
			});
		},
	};
}

// Find all *.html files in out-staging and mark them as entrypoints
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
const entryFiles = recursiveSearch(join(__dirname, "out"));

export default defineConfig({
	root: "out",
	plugins: [redirectMissingTrailingSlash()],
	build: {
		rollupOptions: {
			input: entryFiles.reduce(
				(acc, path, i) => {
					const p = resolve(__dirname, path);
					acc[i.toString()] = p;
					return acc;
				},
				{} as Record<string, string>,
			),
		},
	},
	server: {
		port: 9000,
		host: true,
	},
});
