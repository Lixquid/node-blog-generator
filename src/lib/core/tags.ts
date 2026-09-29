import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { projectRoot } from "../util.ts";

const TagMetadataParser = z.object({
    /** The subsection the tag belongs to. */
    type: z.enum(["topic", "type"]),
    /** A human-friendly description of the tag. */
    description: z.string(),
});

export type TagType = z.infer<typeof TagMetadataParser>["type"];
export type TagMetadata = z.infer<typeof TagMetadataParser>;

/** A mapping of tag names to their metadata. */
export type TagCatalog = Record<string, TagMetadata>;

const TagCatalogParser = z.record(z.string(), TagMetadataParser);

/** The filename of the tag catalog. */
export const tagsFilename = join(projectRoot, "blog", "tags.json");

/** Loads and validates `blog/tags.json`. */
export async function loadTagCatalog(): Promise<TagCatalog> {
    return TagCatalogParser.parse(
        JSON.parse(await readFile(tagsFilename, "utf8")),
    );
}

/**
 * Gets the metadata for a tag, falling back to sensible defaults if the tag
 * is not present in the catalog.
 */
export function getTagMetadata(catalog: TagCatalog, tag: string): TagMetadata {
    return catalog[tag] ?? { type: "topic", description: "" };
}
