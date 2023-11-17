import { readdirSync } from "fs";
import { join, resolve } from "path";
import { defineConfig } from "vite";

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
    build: {
        rollupOptions: {
            input: entryFiles.reduce((acc, path, i) => {
                const p = resolve(__dirname, path);
                acc[i.toString()] = p;
                return acc;
            }, {} as Record<string, string>),
        },
    },
});
