import express from "express";
import { router as todos } from "./todos";

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use("/todos", todos);
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}
