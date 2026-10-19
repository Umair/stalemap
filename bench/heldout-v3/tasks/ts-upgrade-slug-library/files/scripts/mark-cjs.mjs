// The package root is "type": "module"; mark dist/ so Node loads the compiled files as CommonJS.
import { writeFileSync } from "node:fs";
writeFileSync(new URL("../dist/package.json", import.meta.url), JSON.stringify({ type: "commonjs" }) + "\n");
