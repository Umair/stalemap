// tsc emits one script per source file into build/js/; join them, in tsconfig.json's "files" order,
// into the single public/js/app.js that public/index.html loads.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const { files } = JSON.parse(readFileSync(new URL("tsconfig.json", root), "utf8"));
const parts = files.map((file) => readFileSync(new URL(file.replace(/^src\//, "build/js/").replace(/\.ts$/, ".js"), root), "utf8"));
mkdirSync(new URL("public/js/", root), { recursive: true });
writeFileSync(new URL("public/js/app.js", root), parts.join("\n"));
