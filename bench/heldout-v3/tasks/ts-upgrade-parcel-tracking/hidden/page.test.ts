import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import vm from "node:vm";

const root = fileURLToPath(new URL("../../", import.meta.url));

const PARCELS = [
  {
    id: "1Z999AA10123456784",
    carrier: "ups",
    weightGrams: 2350,
    events: [
      { at: "2026-10-12T08:00:00Z", status: "label_created", location: "Portland, OR" },
      { at: "2026-10-13T17:20:00Z", status: "delivered", location: "Seattle, WA" },
    ],
  },
  {
    id: "JD014600006281",
    carrier: "dhl",
    weightGrams: 480,
    events: [{ at: "2026-10-14T09:10:00Z", status: "exception", location: "Leipzig, DE" }],
  },
  { id: "LP-7 001", carrier: "lasership", weightGrams: 1000, events: [] },
];

const expectedList =
  '<li data-status="delivered">UPS <a href="https://www.ups.com/track?tracknum=1Z999AA10123456784">1Z999AA10123456784</a>: Delivered · Seattle, WA (2.4 kg)</li>' +
  '<li data-status="exception">DHL <a href="https://www.dhl.com/en/express/tracking.html?AWB=JD014600006281">JD014600006281</a>: Delivery problem · Leipzig, DE (480 g)</li>' +
  '<li data-status="label_created">LASERSHIP LP-7 001: Label created (1.0 kg)</li>';

test("the compiled scripts build and run the page as before", async () => {
  const outDir = await mkdtemp(join(root, ".build-"));
  try {
    let output = "";
    try {
      await promisify(execFile)(join(root, "node_modules", ".bin", "tsc"), ["-p", "tsconfig.json", "--outDir", outDir, "--noEmit", "false"], { cwd: root, timeout: 30_000 });
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string };
      output = `${e.stdout ?? ""}${e.stderr ?? ""}` || String(err);
    }
    assert.equal(output, "", "tsc -p tsconfig.json fails");

    // Load the page's scripts in the order public/index.html does (outDir public/js is served as js/).
    const list = { innerHTML: "" };
    const summary = { textContent: "" };
    const elements: Record<string, object> = { parcels: list, summary };
    const sandbox: Record<string, unknown> = { document: { getElementById: (id: string) => elements[id] ?? null }, PARCELS, console };
    sandbox.window = sandbox;
    const context = vm.createContext(sandbox);
    const html = await readFile(join(root, "public", "index.html"), "utf8");
    const scripts = [...html.matchAll(/<script(?: src="js\/([^"]+)")?>([\s\S]*?)<\/script>/g)];
    assert.ok(scripts.length >= 4, "public/index.html still loads the scripts");
    for (const [, src, inline] of scripts) {
      if (src) vm.runInContext(await readFile(join(outDir, src), "utf8"), context, { filename: `js/${src}` });
      else vm.runInContext(inline, context, { filename: "index.html" });
    }
    assert.equal(summary.textContent, "1 of 3 delivered, 1 with a problem");
    assert.equal(list.innerHTML, expectedList);

    const Tracking = vm.runInContext("Tracking", context);
    assert.equal(Tracking.currentStatus(PARCELS[0]), "delivered");
    assert.equal(Tracking.describe(PARCELS[2]), "Label created");
    assert.equal(Tracking.trackingLink(PARCELS[2]), undefined);
    assert.equal(Tracking.trackingLink({ id: "9400 1000", carrier: "usps", weightGrams: 1, events: [] }), "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400%201000");
    assert.equal(Tracking.summarize([]), "0 of 0 delivered");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
