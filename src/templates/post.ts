import { readFile } from "node:fs/promises";
import type { HTMLText, ISODate, Slug, Title } from "../lib/core/types.js";
import { fileInfo } from "../lib/util.js";

const { __dirname } = fileInfo(import.meta.url);

export const postTemplate = Handlebars.compile<{
    body: HTMLText;
    title: Title;
    date: ISODate;
    edited: ISODate | undefined;
    tags: string[];
    related: {
        title: Title;
        slug: Slug;
    }[];
    previousPost:
        | {
              title: Title;
              slug: Slug;
          }
        | undefined;
    nextPost:
        | {
              title: Title;
              slug: Slug;
          }
        | undefined;
}>(await readFile(`${__dirname}/post.hbs`, "utf-8"));
