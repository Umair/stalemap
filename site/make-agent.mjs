// Builds site/agent.html (the page served at /?agent=1) from site/page.md (served at /index.md), so the agent view needs no
// JavaScript: an agent that fetches the URL gets the Markdown in the HTML itself. Run after editing page.md:
//   node site/make-agent.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(join(dir, "page.md"), "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Bare URLs become links; the text stays exactly the Markdown.
const body = esc(md).replace(/https:\/\/[^\s)<]+/g, (u) => `<a href="${u}">${u}</a>`);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>stalemap (agent view)</title>
  <meta name="description" content="stalemap for AI agents: install instructions and the full page as Markdown.">
  <link rel="canonical" href="https://stalemap.com/">
  <link rel="alternate" type="text/markdown" href="/index.md" title="This page as Markdown">
  <link rel="alternate" type="text/markdown" href="/install.md" title="Install instructions for agents">
  <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
  <link rel="alternate" type="text/plain" href="/llms-full.txt" title="llms-full.txt">
  <style>
    :root { --bg: #0b1220; --text: #e2e8f0; --muted: #94a3b8; --line: #24304a; --green: #86efac; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.65 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    header { position: sticky; top: 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 24px; background: rgba(11,18,32,.92); border-bottom: 1px solid var(--line); font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
    .brand { color: var(--text); font-weight: 700; text-decoration: none; }
    .toggle { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; font-size: 13px; }
    .toggle a { padding: 5px 12px; color: var(--muted); text-decoration: none; }
    .toggle a.on { background: var(--green); color: #0b1220; font-weight: 600; }
    main { max-width: 900px; margin: 0 auto; padding: 28px 24px 64px; }
    pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; }
    a { color: var(--green); }
  </style>
</head>
<body>
  <header>
    <a class="brand" href="/">stalemap</a>
    <nav class="toggle" aria-label="View"><a href="/">Human</a><a class="on" href="/?agent=1" aria-current="page">Agent</a></nav>
  </header>
  <main><pre>${body}</pre></main>
</body>
</html>
`;
writeFileSync(join(dir, "agent.html"), html);
console.log(`wrote agent.html (${html.length} bytes)`);
