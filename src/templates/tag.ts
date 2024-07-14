import { readFile } from "node:fs/promises";
import type { ISODate, Slug, Title } from "../lib/core/types";

export const tagTemplate = Handlebars.compile<{
	tag: string;
	posts: {
		title: Title;
		date: ISODate;
		slug: Slug;
	}[];
}>(await readFile(`${__dirname}/tag.hbs`, "utf-8"));
