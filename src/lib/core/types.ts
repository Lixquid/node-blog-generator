import { z } from "zod";

declare const ISODateGuard: unique symbol;
/** A `string` that is a valid ISO-8601 date. */
export type ISODate = string & { [ISODateGuard]: true };

declare const SlugGuard: unique symbol;
/** A `string` that is a slug for a post. */
export type Slug = string & { [SlugGuard]: true };

declare const TitleGuard: unique symbol;
/** A `string` that is the title of a post. */
export type Title = string & { [TitleGuard]: true };

declare const PathGuard: unique symbol;
/** A `string` that is a path to a file. */
export type Path = string & { [PathGuard]: true };

declare const HTMLTextGuard: unique symbol;
/** A `string` that is valid HTML. */
export type HTMLText = string & { [HTMLTextGuard]: true };

export const FrontMatterParser = z.object({
	title: z.string().refine((v) => v as Title),
	date: z
		.string()
		.date()
		.refine((v) => v as ISODate),
	edited: z.string().date().optional(),
	tags: z.array(z.string()),
	hidden: z.boolean().default(false),
	related: z.array(z.string()).optional(),
});

export type FrontMatter = z.infer<typeof FrontMatterParser>;

export interface PostData {
	/** The name of the folder the post is in. */
	slug: Slug;
	/** The full resolved path to the `index.md` of the post. */
	filename: Path;
	/** The full content of the `index.md` file, without the front matter. */
	body: string;

	/** The parsed front matter of the post. */
	frontMatter: FrontMatter;
	previousPost:
		| {
				slug: Slug;
				title: Title;
		  }
		| undefined;
	nextPost:
		| {
				slug: Slug;
				title: Title;
		  }
		| undefined;
}
