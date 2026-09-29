import { readFile } from "node:fs/promises";
import type { TagListPageContext } from "../lib/core/render.ts";
import { fileInfo } from "../lib/util.ts";

const { __dirname } = fileInfo(import.meta.url);

export const tagIndexTemplate = Handlebars.compile<TagListPageContext>(
    await readFile(`${__dirname}/tagIndex.hbs`, "utf-8"),
);
