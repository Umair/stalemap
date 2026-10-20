import assert from "node:assert/strict";
import { test } from "node:test";
const load = (id: string): Promise<any> => import(id);

/** How S3 maps a request path to an object key: "+" is a space, then percent-decoding. */
const s3Key = (pathname: string) => pathname.slice(1).split("/").map((s) => decodeURIComponent(s.replace(/\+/g, " "))).join("/");

const cases: Array<[string, string]> = [
  ["2.1.0+build.7", "acme-2.1.0+build.7-macos.zip"],
  ["3.0.0", "Acme Setup 3.0.0.exe"],
  ["1.0.0-rc.1+sha.5114f85", "notes & checksums (sha256).txt"],
  ["2.0.4", "acme_2.0.4_amd64.deb"],
];

test("download links reach the right object in the bucket", async () => {
  const { downloadUrl } = await load("../../src/links.ts");
  for (const [version, file] of cases) {
    const href = downloadUrl(version, file);
    assert.equal(typeof href, "string");
    const url = new URL(href);
    assert.equal(url.origin, "https://downloads.acme.dev", href);
    assert.equal(url.search + url.hash, "", href);
    assert.equal(s3Key(url.pathname), `releases/${version}/${file}`, `${href} is the object for ${version}/${file}`);
  }
});

test("a file name with a slash stays in one path segment", async () => {
  const { downloadUrl } = await load("../../src/links.ts");
  const url = new URL(downloadUrl("3.0.0", "docs/readme.txt"));
  assert.equal(url.pathname.split("/").length, 4, url.pathname);
  assert.equal(s3Key(url.pathname), "releases/3.0.0/docs/readme.txt");
});
