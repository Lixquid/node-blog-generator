import { readFile } from "node:fs/promises";
import type { ISODate, Slug, Title } from "../lib/core/types";

export const indexTemplate = Handlebars.compile<{
	posts: {
		title: Title;
		date: ISODate;
		slug: Slug;
	}[];
	tags: string[];
}>(await readFile(`${__dirname}/index.hbs`, "utf-8"));
