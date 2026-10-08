import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ISODate } from "./types.ts";
import { fileInfo } from "../util.ts";

const { __dirname } = fileInfo(import.meta.url);

/** The path of the microblog source file, inside the blog directory. */
// src/lib/core -> src -> project root -> blog.
const microblogPath = join(
    __dirname,
    "..",
    "..",
    "..",
    "blog",
    "microblog.yml",
);

/** A single microblog post. */
export interface MicroblogPost {
    date: ISODate;
    /** The raw Markdown contents of the post. */
    post: string;
}

/**
 * Parses the contents of `microblog.yml`.
 *
 * A tiny parser for the specific structure of the file: a list of entries,
 * each with a `date` and a folded-block `post` string. Using a dedicated
 * parser avoids a YAML dependency for this one file.
 *
 * @param contents The raw contents of the `microblog.yml` file.
 * @returns The parsed posts, in the order they appear in the file.
 */
export function parseMicroblog(contents: string): MicroblogPost[] {
    const posts: MicroblogPost[] = [];
    const lines = contents.split(/\r?\n/);

    let date: ISODate | undefined;
    let postLines: string[] | undefined;

    for (const line of lines) {
        const entryMatch = /^- date: (\d{4}-\d{2}-\d{2})$/.exec(line);
        if (entryMatch) {
            flush();
            date = entryMatch[1] as ISODate;
            postLines = undefined;
            continue;
        }

        // The `post: >` header: everything after it is the block scalar.
        if (/^ {2}post: >$/.test(line)) {
            postLines = [];
            continue;
        }

        // Continuation lines of the block scalar.
        if (postLines && /^ {6}/.test(line)) {
            postLines.push(line.replace(/^ {6}/, ""));
            continue;
        }

        // Blank lines are ignored: the file has none inside entries.
    }
    flush();

    function flush(): void {
        if (date && postLines) {
            posts.push({ date, post: foldBlockScalar(postLines) });
        }
    }

    return posts;
}

/**
 * Folds a YAML folded block scalar (`>`) into a single string. Consecutive
 * lines are joined with a space; lines indented deeper than the first line
 * keep a preceding newline, as per the YAML specification.
 */
function foldBlockScalar(lines: string[]): string {
    if (lines.length === 0) {
        return "";
    }
    const baseIndent = /^ */.exec(lines[0])?.[0].length ?? 0;
    let result = "";
    for (const line of lines) {
        const isBlank = line.trim() === "";
        const indent = isBlank ? baseIndent : /^ */.exec(line)?.[0].length ?? 0;
        if (indent > baseIndent || (result && isBlank)) {
            result += `\n${line}`;
        } else {
            result += result ? ` ${line}` : line;
        }
    }
    return result;
}

/**
 * Loads and parses all microblog posts, sorted newest first.
 */
export async function getMicroblogPosts(): Promise<MicroblogPost[]> {
    const contents = await readFile(microblogPath, "utf8");
    return parseMicroblog(contents).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
}
