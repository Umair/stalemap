import assert from "node:assert/strict";
import { test } from "node:test";
import type { getDictionary } from "../../src/i18n.ts";
import { dictionaries } from "../../src/dictionaries.ts";
// src/i18n.ts must export getDictionary (checked by tsc).
export type GetDictionary = typeof getDictionary;
test("dictionaries are defined", () => assert.ok(dictionaries.en));
