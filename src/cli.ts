/**
 * General-purpose CLI for managing blog posts.
 *
 * Usage: node src/cli.ts <command>
 *
 * Commands:
 *   create   Interactively scaffold a new draft post.
 *   undraft  Interactively publish a draft post, dating it to today.
 */

import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import * as readline from "node:readline";
import process from "node:process";

const BLOG_DIR = new URL("../blog/", import.meta.url);

/** Prefix for folders containing draft posts. */
const DRAFT_PREFIX = "DRAFT-";

/** Date used for draft posts; in the far future so they sort last. */
const DRAFT_DATE = "9999-01-01";

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

/** Current date as an ISO-8601 string (YYYY-MM-DD). */
function todayDate(): string {
    const now = new Date();
    return now.toISOString().slice(0, 10);
}

/** Current date as a compact YYYYMMDD string, used in folder names. */
function todayDateParts(): string {
    const now = new Date();
    return [
        String(now.getFullYear()).padStart(4, "0"),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
    ].join("");
}

/** Whether the given folder name is a draft post folder. */
function isDraftFolder(folderName: string): boolean {
    return folderName.startsWith(DRAFT_PREFIX);
}

/** The `index.md` URL for a post folder. */
function indexMdUrl(folderUrl: URL): URL {
    return new URL("index.md", folderUrl);
}

/**
 * Extract the title from the front matter of a post's `index.md`, if present.
 */
async function readPostTitle(folderUrl: URL): Promise<string | null> {
    try {
        const contents = await readFile(indexMdUrl(folderUrl), "utf8");
        return contents.match(/^title:\s*"(.+)"$/m)?.[1] ?? null;
    } catch {
        return null;
    }
}

/**
 * Interactively scaffold a new draft post. Prompts for a slug, name,
 * description, and tags, then creates `blog/DRAFT-<slug>/index.md` with the
 * frontmatter prefilled.
 */
async function commandCreate(): Promise<void> {
    const slug = await promptRequired("Slug");
    const title = await promptRequired("Name");
    const description = await promptRequired("Description");
    const tags = await promptList("Tags");

    const folderName = `${DRAFT_PREFIX}${slug}`;
    const folderUrl = new URL(`${encodeURIComponent(folderName)}/`, BLOG_DIR);
    const folder = `${BLOG_DIR.pathname}${folderName}`;

    try {
        await access(folder);
        console.error(`Error: ${folder} already exists.`);
        process.exit(1);
    } catch {
        // Expected: the folder should not exist yet.
    }

    await mkdir(folderUrl, { recursive: true });

    const frontMatter = [
        "---",
        `title: "${title.replaceAll('"', '\\"')}"`,
        `date: "${DRAFT_DATE}"`,
        `description: "${description.replaceAll('"', '\\"')}"`,
        ...(tags.length ? ["tags:", ...tags.map((tag) => `    - ${tag}`)] : []),
        "hidden: true",
        "---",
        "",
    ].join("\n");

    await writeFile(indexMdUrl(folderUrl), frontMatter);
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

/**
 * Interactively publish a draft post. Lists all draft posts, prompts for a
 * selection, then renames the folder to today's date and updates the
 * published date (dropping the `hidden` flag).
 */
async function commandUndraft(): Promise<void> {
    const draftFolders = (await readdir(BLOG_DIR, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && isDraftFolder(entry.name))
        .map((entry) => entry.name)
        .sort();

    if (draftFolders.length === 0) {
        console.log("No draft posts found.");
        return;
    }

    console.log("Draft posts:");
    for (let index = 0; index < draftFolders.length; ++index) {
        const folderUrl = new URL(`${encodeURIComponent(draftFolders[index])}/`, BLOG_DIR);
        const title = await readPostTitle(folderUrl);
        console.log(`  ${index + 1}. ${draftFolders[index]}${title ? ` (${title})` : ""}`);
    }

    let selection = -1;
    for (;;) {
        const answer = await promptRequired("Number");
        const parsed = Number.parseInt(answer, 10);
        if (parsed >= 1 && parsed <= draftFolders.length) {
            selection = parsed - 1;
            break;
        }
        console.error(`  Enter a number between 1 and ${draftFolders.length}.`);
    }

    const draftFolderName = draftFolders[selection];
    const draftSlug = draftFolderName.slice(DRAFT_PREFIX.length);
    const draftFolderUrl = new URL(`${encodeURIComponent(draftFolderName)}/`, BLOG_DIR);

    const newFolderName = `${todayDateParts()}-${draftSlug}`;
    const newFolderUrl = new URL(`${encodeURIComponent(newFolderName)}/`, BLOG_DIR);

    try {
        await access(newFolderUrl);
        console.error(`Error: ${newFolderUrl.pathname} already exists.`);
        process.exit(1);
    } catch {
        // Expected: the folder should not exist yet.
    }

    await rename(draftFolderUrl, newFolderUrl);

    const indexMdPath = indexMdUrl(newFolderUrl);
    const contents = await readFile(indexMdPath, "utf8");
    const updated = contents
        .replace(`date: "${DRAFT_DATE}"`, `date: "${todayDate()}"`)
        .replace(/^hidden: true\n/m, "");
    await writeFile(indexMdPath, updated);

    console.log(`Published ${newFolderUrl.pathname}/index.md`);
}

async function main(): Promise<void> {
    const command = process.argv[2];
    switch (command) {
        case "create":
            return await commandCreate();
        case "undraft":
            return await commandUndraft();
        default:
            console.error(
                `Usage: node src/cli.ts <command>\n\nCommands:\n  create   Create a new draft post.\n  undraft  Publish a draft post, dated today.`,
            );
            process.exit(1);
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
