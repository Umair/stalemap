// The package is "type": "module", so tell Node that the files in dist/cjs are CommonJS.
import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("dist/cjs", { recursive: true });
writeFileSync("dist/cjs/package.json", JSON.stringify({ type: "commonjs" }) + "\n");
