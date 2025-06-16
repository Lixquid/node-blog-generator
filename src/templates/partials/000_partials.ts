import { readFile } from "node:fs/promises";
import { fileInfo } from "../../lib/util.js";

const { __dirname } = fileInfo(import.meta.url);

export async function registerTemplatePartials() {
    Handlebars.registerPartial(
        "header",
        Handlebars.compile(await readFile(`${__dirname}/header.hbs`, "utf-8")),
    );
}
