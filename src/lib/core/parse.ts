import frontmatterRaw from "front-matter";
import { z } from "zod";
import {
    type PostData,
    type Slug,
    FrontMatterParser,
} from "./types.ts";

// Fix default export typing error
const frontmatter = frontmatterRaw as unknown as typeof frontmatterRaw.default;

/**
 * Parses the raw contents of a post `index.md` file into a `PostData` object.
 *
 * @param slug The slug (directory name) of the post.
 * @param filename The absolute path to the `index.md` file.
 * @param contents The raw file contents of the `index.md` file.
 * @throws If the front matter is missing or does not match the schema.
 */
export function parsePost(
    slug: string,
    filename: string,
    contents: string,
): PostData {
    const data = frontmatter(contents);
    const frontMatter = FrontMatterParser.parse(data.attributes);

    return {
        slug: slug as Slug,
        filename: filename as PostData["filename"],
        body: data.body,
        frontMatter,
        previousPost: undefined,
        nextPost: undefined,
    };
}
