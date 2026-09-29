import { readFile } from "node:fs/promises";
import type { HTMLText, ISODate, Slug, Title } from "../lib/core/types.ts";
import { fileInfo } from "../lib/util.ts";

const { __dirname } = fileInfo(import.meta.url);

export const postTemplate = Handlebars.compile<{
    body: HTMLText;
    title: Title;
    date: ISODate;
    edited: ISODate | undefined;
    tags: string[];
    jsonLd: string;
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
