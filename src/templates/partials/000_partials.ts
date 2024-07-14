import { readFile } from "node:fs/promises";

export async function registerTemplatePartials() {
	Handlebars.registerPartial(
		"header",
		Handlebars.compile(await readFile(`${__dirname}/header.hbs`, "utf-8")),
	);
}
