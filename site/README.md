# stalemap.com

A static site with no build step, deployed to Vercel (`cd site && vercel deploy --prod --yes --scope umairejaz`).

| file | served at | for |
|---|---|---|
| `home.html` | `/` | people |
| `agent.html` | `/?agent=1` | agents, and the Human/Agent toggle; generated from `page.md` |
| `page.md` | `/index.md`, and `/` with `Accept: text/markdown` | agents: the page as Markdown |
| `install.md` | `/install.md` (`/install`, `/agents` redirect here) | agents: step-by-step install |
| `llms.txt`, `llms-full.txt` | same | the llms.txt index and the full reference |
| `robots.txt`, `sitemap.xml` | same | crawlers |

Routing is in `vercel.json`. Every response also carries a `Link` header pointing to `llms.txt` and `install.md`.

After editing `page.md`, regenerate the agent view:

```bash
node site/make-agent.mjs
```

Preview locally (`/` won't route; open `home.html`):

```bash
python3 -m http.server 4321 --directory site
```

The numbers come from `bench/heldout-v4/RESULTS-*.md`. Update the page, `page.md`, `llms*.txt` and the README together.
