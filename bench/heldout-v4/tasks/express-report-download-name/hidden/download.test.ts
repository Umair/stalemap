import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import express from "express";

const load = (id: string): Promise<any> => import(id);

async function withServer(app: { listen: Function }, fn: (url: string) => Promise<void>) {
  const server: Server = await new Promise((resolve) => {
    const s: Server = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  try {
    await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("returns the suggested filename and the CSV for each report", async () => {
  const { createApp } = await load("../../src/app.ts");
  const { downloadReport } = await load("../../src/client.ts");
  await withServer(createApp(), async (url) => {
    const orders = await downloadReport(url, "q3-orders");
    assert.equal(orders.filename, "orders-2026-q3.csv");
    assert.equal(orders.csv, "order,total\nA-1001,42.50\nA-1002,17.00\n");
    const roster = await downloadReport(url, "roster");
    assert.equal(roster.filename, "Support roster.csv");
    assert.equal(roster.csv, "name,shift\nAna,early\nBo,late\n");
  });
});

test("works with any download the API serves through express", async () => {
  const { downloadReport } = await load("../../src/client.ts");
  const app = express();
  app.get("/api/reports/:id/download", (req, res) => {
    res.attachment(req.params.id === "inv" ? "invoices_2026-10.csv" : "Year end (draft).csv");
    res.send("x\n1\n");
  });
  await withServer(app, async (url) => {
    assert.equal((await downloadReport(url, "inv")).filename, "invoices_2026-10.csv");
    assert.equal((await downloadReport(url, "draft")).filename, "Year end (draft).csv");
  });
});
