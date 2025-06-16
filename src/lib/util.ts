import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function fileInfo(importMetaUrl: string): {
    __filename: string;
    __dirname: string;
} {
    const __filename = fileURLToPath(importMetaUrl);
    const __dirname = dirname(__filename);
    return { __filename, __dirname };
}
