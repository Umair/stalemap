import { createApp } from "./app.ts";

const port = Number(process.env.PORT ?? 3000);
createApp().listen(port, () => {
  console.log(`notes API listening on :${port}`);
});
