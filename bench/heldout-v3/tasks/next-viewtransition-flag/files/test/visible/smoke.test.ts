import assert from "node:assert/strict";
import { test } from "node:test";
import config from "../../next.config.ts";
import { Photo } from "../../app/components/Photo.tsx";
test("next.config.ts exports a config", () => assert.ok(config));
test("exports Photo", () => assert.ok(Photo));
