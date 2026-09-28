import { spawn, type SpawnSyncOptions } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Gets `__filename` and `__dirname` from an `import.meta.url` value. */
export function fileInfo(importMetaUrl: string): {
    __filename: string;
    __dirname: string;
} {
    const __filename = fileURLToPath(importMetaUrl);
    const __dirname = dirname(__filename);
    return { __filename, __dirname };
}

/**
 * The root directory of the project: the closest ancestor of `src/lib` that
 * contains a `package.json` file.
 */
export const projectRoot: string = (() => {
    let dir = fileInfo(import.meta.url).__dirname;
    while (!existsSync(join(dir, "package.json"))) {
        const parent = dirname(dir);
        if (parent === dir) {
            throw new Error("Could not locate the project root directory.");
        }
        dir = parent;
    }
    return dir;
})();

/**
 * Executes a command as a child process, inheriting stdio.
 *
 * @param command The command to execute.
 * @param args Arguments to pass to the command.
 * @param options Additional options to pass to `spawn`.
 * @returns A promise that resolves when the child process exits, rejecting if
 *   the exit code is nonzero.
 */
export function run(
    command: string,
    args: string[],
    options: SpawnSyncOptions = { stdio: "inherit" },
): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, options);
        child.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(
                    new Error(
                        `Command "${command} ${args.join(" ")}" exited with code ${code}`,
                    ),
                );
            }
        });
        child.on("error", reject);
    });
}
