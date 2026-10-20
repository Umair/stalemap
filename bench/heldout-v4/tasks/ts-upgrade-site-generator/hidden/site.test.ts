import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
// Imported the way src/site.ts imports them, so tsc checks these types too.
import slugifyTyped from "../../src/legacy/slugify.cjs";
import datesTyped from "../../src/legacy/dates.cjs";

type IsAny<T> = 0 extends 1 & T ? true : false;
// The helpers keep real types (not any) for the TypeScript code.
const separatorNotAny: IsAny<typeof slugifyTyped.separator> = false;
const maxLengthNotAny: IsAny<typeof slugifyTyped.maxLength> = false;
const slugifyNotAny: IsAny<typeof slugifyTyped> = false;
const urlDayNotAny: IsAny<typeof datesTyped.urlDay> = false;
const longDateNotAny: IsAny<typeof datesTyped.longDate> = false;
void [separatorNotAny, maxLengthNotAny, slugifyNotAny, urlDayNotAny, longDateNotAny];

const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

test("plain Node scripts still require() the helpers with the same exports", async () => {
  const require = createRequire(new URL("../../scripts/new-post.cjs", import.meta.url));
  const slugify = require("../src/legacy/slugify.cjs");
  const dates = require("../src/legacy/dates.cjs");
  assert.equal(typeof slugify, "function");
  assert.equal(slugify("Héllo, Wörld!"), "hello-world");
  assert.equal(slugify.separator, "-");
  assert.equal(slugify.maxLength, 48);
  assert.equal(slugify("A".repeat(30) + " " + "b".repeat(30)), "a".repeat(30) + "-" + "b".repeat(17));
  assert.equal(dates.urlDay(new Date(Date.UTC(2026, 2, 4, 23, 30))), "2026/03/04");
  assert.equal(dates.longDate(new Date(Date.UTC(2026, 10, 9))), "November 9, 2026");

  const { stdout } = await promisify(execFile)(process.execPath, ["scripts/new-post.cjs", "Shipping TypeScript 7", "2026-07-08"], { cwd: root });
  assert.equal(stdout.trim(), "/2026/07/08/shipping-typescript-7/");
});

test("the site builds as before", async () => {
  const site = await load("../../src/site.ts");
  const posts = [
    { title: "Hello, world", published: new Date(Date.UTC(2026, 0, 2)), body: "" },
    { title: "Crème brûlée at 3 a.m.", published: new Date(Date.UTC(2026, 8, 30)), body: "" },
  ];
  assert.deepEqual(site.buildSite(posts), [
    { path: "/2026/09/30/creme-brulee-at-3-a-m/", heading: "Crème brûlée at 3 a.m.", byline: "Published September 30, 2026" },
    { path: "/2026/01/02/hello-world/", heading: "Hello, world", byline: "Published January 2, 2026" },
  ]);
  assert.equal(site.titleTooLong("A short title"), false);
  assert.equal(site.titleTooLong("An unreasonably long title that keeps going on and on"), true);
});
