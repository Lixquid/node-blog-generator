import assert from "node:assert/strict";
import test from "node:test";
import { parseCodeBlockArgs } from "../util";

test("parseCodeBlocksArgs", () => {
	function t(str: string, expected: Record<string, string | boolean>) {
		assert.deepEqual(parseCodeBlockArgs(str), expected);
	}

	// Automatic language key
	t("ts", { language: "ts" });
	// Bare key
	t("ts key", { language: "ts", key: true });
	// Keypair
	t("ts key=value", { language: "ts", key: "value" });
	// Escaping
	t("ts key\\=key=value", { language: "ts", "key=key": "value" });
	t("ts key\\ key=value", { language: "ts", "key key": "value" });
	t("ts key=\\\\", { language: "ts", key: "\\" });
	// Quoting
	t('ts key="value with spaces"', { language: "ts", key: "value with spaces" });

	// Combined
	t(
		'ts bare key=value "quoted key"="quoted value" escaped\\=key=escaped\\=value',
		{
			language: "ts",
			bare: true,
			key: "value",
			"quoted key": "quoted value",
			"escaped=key": "escaped=value",
		},
	);
});
