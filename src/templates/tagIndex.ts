import { readFile } from "node:fs/promises";

export const tagIndexTemplate = Handlebars.compile<{
	tags: string[];
}>(await readFile(`${__dirname}/tagIndex.hbs`, "utf-8"));
