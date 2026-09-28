import { readFile } from "node:fs/promises";
import { fileInfo } from "../lib/util.ts";

const { __dirname } = fileInfo(import.meta.url);

export const tagIndexTemplate = Handlebars.compile<{
    tags: string[];
}>(await readFile(`${__dirname}/tagIndex.hbs`, "utf-8"));
