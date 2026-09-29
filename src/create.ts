/**
 * Interactive script for scaffolding a new blog post.
 *
 * Prompts for a slug, name, description, and tags, then creates
 * `blog/YYYYMMDD-<slug>/index.md` with the frontmatter prefilled.
 */

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import * as readline from "node:readline";
import process from "node:process";

const BLOG_DIR = new URL("../blog/", import.meta.url);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdin.isTTY,
});

/**
 * Queue of lines read from stdin. Lines are buffered here as they arrive so
 * that answers piped into the script are not lost while awaiting between
 * prompts.
 */
const lines: string[] = [];

/** Waker resolving the prompt currently waiting for a line, if any. */
let waker: (() => void) | null = null;

/** Whether the input stream has closed. */
let closed = false;

rl.on("line", (line) => {
    lines.push(line);
    const pendingWaker = waker;
    waker = null;
    pendingWaker?.();
});

rl.on("close", () => {
    closed = true;
    const pendingWaker = waker;
    waker = null;
    pendingWaker?.();
});

/**
 * Prompt for one line. Returns null if the input stream closed before an
 * answer arrived.
 */
async function prompt(label: string): Promise<string | null> {
    process.stdout.write(`${label}: `);
    if (lines.length > 0) {
        return lines.shift() ?? null;
    }
    if (closed) {
        process.stdout.write("\n");
        return null;
    }
    return await new Promise<string | null>((resolve) => {
        waker = () => {
            resolve(lines.shift() ?? null);
        };
    });
}

/**
 * Prompt until a non-empty answer is given.
 */
async function promptRequired(label: string): Promise<string> {
    for (;;) {
        const answer = await prompt(label);
        if (answer === null) {
            throw new Error(`Input ended without an answer for "${label}".`);
        }
        const trimmed = answer.trim();
        if (trimmed) {
            return trimmed;
        }
        console.error(`  ${label} is required.`);
    }
}

/**
 * Prompt with a comma-separated answer, returning a list of trimmed values.
 * Empty answers yield an empty list.
 */
async function promptList(label: string): Promise<string[]> {
    const answer = await prompt(`${label} (comma-separated)`);
    if (answer === null) {
        throw new Error(`Input ended without an answer for "${label}".`);
    }
    const trimmed = answer.trim();
    if (!trimmed) {
        return [];
    }
    return trimmed.split(",").map((tag) => tag.trim()).filter(Boolean);
}

async function main(): Promise<void> {
    const slug = await promptRequired("Slug");
    const title = await promptRequired("Name");
    const description = await promptRequired("Description");
    const tags = await promptList("Tags");

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const dateParts = [
        String(now.getFullYear()).padStart(4, "0"),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
    ].join("");
    const folderName = `${dateParts}-${slug}`;
    const folderUrl = new URL(`${encodeURIComponent(folderName)}/`, BLOG_DIR);
    const folder = `${BLOG_DIR.pathname}${folderName}`;

    try {
        await access(folder);
        console.error(`Error: ${folder} already exists.`);
        process.exit(1);
    } catch {
        // Expected: the folder should not exist yet.
    }

    await mkdir(folder, { recursive: true });

    const frontMatter = [
        "---",
        `title: "${title.replaceAll('"', '\\"')}"`,
        `date: "${date}"`,
        `description: "${description.replaceAll('"', '\\"')}"`,
        ...(tags.length ? ["tags:", ...tags.map((tag) => `    - ${tag}`)] : []),
        "---",
        "",
    ].join("\n");

    await writeFile(new URL("index.md", folderUrl), frontMatter);
    console.log(`Created ${folder}/index.md`);

    if (tags.length > 0) {
        const knownTags = new Set(Object.keys(JSON.parse(
            await readFile(new URL("tags.json", BLOG_DIR), "utf8"),
        ) as Record<string, unknown>));
        const unknownTags = tags.filter((tag) => !knownTags.has(tag));
        if (unknownTags.length > 0) {
            console.warn(
                `Warning: tags not present in blog/tags.json: ${unknownTags.join(", ")}`,
            );
        }
    }
}

try {
    await main();
} catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exitCode = 1;
} finally {
    rl.close();
}
