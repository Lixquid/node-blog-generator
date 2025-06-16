import { readFile } from "node:fs/promises";
import type { ISODate, Slug, Title } from "../lib/core/types.js";
import { fileInfo } from "../lib/util.js";

const { __dirname } = fileInfo(import.meta.url);

export const indexTemplate = Handlebars.compile<{
    posts: {
        title: Title;
        date: ISODate;
        slug: Slug;
    }[];
    tags: string[];
}>(await readFile(`${__dirname}/index.hbs`, "utf-8"));
