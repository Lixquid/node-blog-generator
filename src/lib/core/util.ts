/**
 * Parses the argument string of a backtick-delimited code block into an object.
 *
 * The argument string is a space-separated list of key=value pairs. The first
 * element is always considered a bare string output in the `language` key.
 * Values can be quotes with double quotes to contain spaces. Bare keys with
 * no equals signs are output with a boolean value of `true`.
 */
export function parseCodeBlockArgs(
	str: string,
): Record<string, string | boolean> {
	const out: Record<string, string | boolean> = {};

	let key: string | undefined = "language";
	let quoted = false;
	let escaped = false;
	let builtArg: string[] = [];

	for (let i = 0; i < str.length; i++) {
		const c = str[i];
		if (escaped) {
			builtArg.push(c);
			escaped = false;
			continue;
		}
		if (c === "\\") {
			escaped = true;
			continue;
		}

		if (c === '"') {
			quoted = !quoted;
			continue;
		}

		if (key === undefined && c === "=") {
			key = builtArg.join("");
			builtArg = [];
			continue;
		}
		if (c === " " && !quoted) {
			if (key === undefined) {
				out[builtArg.join("")] = true;
			} else {
				out[key] = builtArg.join("");
				key = undefined;
			}
			builtArg = [];
			continue;
		}
		builtArg.push(c);
	}
	if (key === undefined) {
		out[builtArg.join("")] = true;
	} else {
		out[key] = builtArg.join("");
	}

	return out;
}
