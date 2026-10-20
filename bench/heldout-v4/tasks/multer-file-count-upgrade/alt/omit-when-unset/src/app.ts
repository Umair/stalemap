import express, { type ErrorRequestHandler } from "express";
import multer from "multer";

export interface Photo {
  id: number;
  album: string;
  name: string;
  type: string;
  bytes: number;
}

/**
 * The album API. MAX_PHOTOS_PER_UPLOAD caps how many photos one upload may contain on
 * our hosted plans; self-hosted installs leave it unset and accept any number.
 */
export function createApp(env: NodeJS.ProcessEnv = process.env) {
  const app = express();
  const limits: multer.Options["limits"] = { fileSize: 10 * 1024 * 1024 };
  const cap = Number.parseInt(env.MAX_PHOTOS_PER_UPLOAD ?? "", 10);
  if (Number.isInteger(cap)) limits.files = cap;
  const upload = multer({ storage: multer.memoryStorage(), limits });

  const photos: Photo[] = [];

  app.post("/api/albums/:album/photos", upload.array("photos"), (req, res) => {
    const added = (req.files as Express.Multer.File[]).map((f) => {
      const photo = { id: photos.length + 1, album: String(req.params.album), name: f.originalname, type: f.mimetype, bytes: f.size };
      photos.push(photo);
      return photo;
    });
    res.status(201).json(added);
  });

  app.get("/api/albums/:album/photos", (req, res) => {
    res.json(photos.filter((p) => p.album === req.params.album));
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const tooBig = err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_FILE_SIZE";
      res.status(tooBig ? 413 : 400).json({ error: err.code });
      return;
    }
    res.status(500).json({ error: "internal" });
  };
  app.use(onError);

  return app;
}
