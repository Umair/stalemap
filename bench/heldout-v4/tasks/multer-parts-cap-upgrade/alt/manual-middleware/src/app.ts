import express, { type ErrorRequestHandler } from "express";
import multer from "multer";

/** Most parts (text fields plus files) one import request may contain. */
export const MAX_PARTS = 8;

export interface ImportedFile {
  field: string;
  name: string;
  bytes: number;
}

/**
 * Bulk contact import: a multipart form with a few text fields (list name, tags) and
 * one or more CSV files. Anything over MAX_PARTS parts is refused with 413.
 */
export function createApp() {
  const app = express();
  const parseImport = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, parts: MAX_PARTS },
  }).any();

  app.post("/api/imports", (req, res, next) => {
    parseImport(req, res, (err?: unknown) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_PART_COUNT") {
        res.status(413).json({ error: err.code });
        return;
      }
      next(err);
    });
  }, (req, res) => {
    const files = (req.files as Express.Multer.File[]).map(
      (f): ImportedFile => ({ field: f.fieldname, name: f.originalname, bytes: f.size }),
    );
    res.status(201).json({ fields: req.body, files });
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const status = err.code === "LIMIT_PART_COUNT" || err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      res.status(status).json({ error: err.code });
      return;
    }
    res.status(500).json({ error: "internal" });
  };
  app.use(onError);

  return app;
}
