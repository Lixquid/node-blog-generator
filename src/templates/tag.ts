import { readFile } from "node:fs/promises";
import type { ISODate, Slug, Title } from "../lib/core/types.js";
import { fileInfo } from "../lib/util.js";

const { __dirname } = fileInfo(import.meta.url);

export const tagTemplate = Handlebars.compile<{
    tag: string;
    posts: {
        title: Title;
        date: ISODate;
        slug: Slug;
    }[];
}>(await readFile(`${__dirname}/tag.hbs`, "utf-8"));
