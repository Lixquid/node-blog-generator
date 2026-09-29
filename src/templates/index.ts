import { readFile } from "node:fs/promises";
import type { ISODate, Slug, Title } from "../lib/core/types.ts";
import { fileInfo } from "../lib/util.ts";

const { __dirname } = fileInfo(import.meta.url);

export const indexTemplate = Handlebars.compile<{
    posts: {
        title: Title;
        date: ISODate;
        slug: Slug;
    }[];
    topics: string[];
    types: string[];
}>(await readFile(`${__dirname}/index.hbs`, "utf-8"));
