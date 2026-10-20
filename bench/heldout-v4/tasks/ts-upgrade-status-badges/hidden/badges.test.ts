import { equal } from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const load = (id: string): Promise<any> => import(id);

test("the formatters work as before", async () => {
  const { durationLabel, lastRunLabel } = await load("../../src/index.ts");
  equal(durationLabel(3900), "1h 05m");
  equal(durationLabel(95), "1m 35s");
  equal(lastRunLabel("2026-10-17T12:00:00Z", "2026-10-20T12:00:00Z"), "3 days ago");
});

test("the badges render as before", async () => {
  const { StatusList } = await load("../../src/index.ts");
  const html = renderToStaticMarkup(
    createElement(StatusList, {
      now: "2026-10-20T12:00:00Z",
      checks: [
        { name: "build", status: "passing", lastRun: "2026-10-20T11:00:00Z", durationSeconds: 95 },
        { name: "e2e", status: "failing", lastRun: "2026-10-19T12:00:00Z", durationSeconds: 3900 },
      ],
    }),
  );
  equal(
    html,
    '<section aria-label="Checks"><h2>1 failing</h2><ul>' +
      '<li><span class="status-badge" data-status="passing" title="build: passing 1 hour ago (1m 35s)" style="border-color:#1a7f37"><span class="status-badge__name">build</span><span class="status-badge__state">passing</span></span></li>' +
      '<li><span class="status-badge" data-status="failing" title="e2e: failing yesterday (1h 05m)" style="border-color:#cf222e"><span class="status-badge__name">e2e</span><span class="status-badge__state">failing</span></span></li>' +
      "</ul></section>",
  );
});
