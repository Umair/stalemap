import express from "express";

export interface Report {
  id: string;
  title: string;
  fileName: string;
  rows: string[][];
}

export const reports: Report[] = [
  {
    id: "q3-orders",
    title: "Orders, third quarter",
    fileName: "orders-2026-q3.csv",
    rows: [["order", "total"], ["A-1001", "42.50"], ["A-1002", "17.00"]],
  },
  {
    id: "roster",
    title: "Support team roster",
    fileName: "Support roster.csv",
    rows: [["name", "shift"], ["Ana", "early"], ["Bo", "late"]],
  },
];

const toCsv = (rows: string[][]) => rows.map((r) => r.join(",")).join("\n") + "\n";

export function createApp() {
  const app = express();

  app.get("/api/reports", (_req, res) => {
    res.json(reports.map(({ id, title }) => ({ id, title })));
  });

  app.get("/api/reports/:id/download", (req, res) => {
    const report = reports.find((r) => r.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.attachment(report.fileName);
    res.send(toCsv(report.rows));
  });

  return app;
}
