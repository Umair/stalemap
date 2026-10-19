// The root package.json is "type": "module" for our tooling; the compiled server in dist/ is CommonJS.
import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("dist", { recursive: true });
writeFileSync("dist/package.json", JSON.stringify({ type: "commonjs" }) + "\n");
