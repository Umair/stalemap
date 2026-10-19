import { createServer } from "node:http";
import next from "next";
import { createHandler } from "./src/server/handler.ts";

const port = Number(process.env.PORT ?? 3000);
const app = next({ dev: process.env.NODE_ENV !== "production" });
await app.prepare();

createServer(createHandler(app, { maintenance: process.env.MAINTENANCE === "1" })).listen(port, () => {
  console.log(`> Ready on http://localhost:${port}`);
});
