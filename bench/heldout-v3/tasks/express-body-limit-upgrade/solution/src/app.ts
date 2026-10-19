import express from "express";

export interface Note {
  id: number;
  title: string;
  body: string;
}

/**
 * The notes API. MAX_JSON_BYTES caps the size of JSON request bodies on our hosted
 * plans; self-hosted installs leave it unset and accept bodies of any size.
 */
export function createApp(env: NodeJS.ProcessEnv = process.env) {
  const app = express();
  const maxJsonBytes = env.MAX_JSON_BYTES ? Number(env.MAX_JSON_BYTES) : Infinity;
  app.use(express.json({ limit: maxJsonBytes }));

  const notes: Note[] = [];

  app.get("/api/notes", (_req, res) => {
    res.json(notes.map(({ id, title }) => ({ id, title })));
  });

  app.get("/api/notes/:id", (req, res) => {
    const note = notes.find((n) => n.id === Number(req.params.id));
    if (!note) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(note);
  });

  app.post("/api/notes", (req, res) => {
    const { title, body } = req.body ?? {};
    if (typeof title !== "string" || typeof body !== "string") {
      res.status(400).json({ error: "title and body are required" });
      return;
    }
    const note = { id: notes.length + 1, title, body };
    notes.push(note);
    res.status(201).json({ id: note.id, length: body.length });
  });

  return app;
}
