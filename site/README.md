# stalemap.com

The landing page: one static `index.html` with no build step, plus the graphics in `assets/` (copies of `.github/assets/`). Preview it locally:

```bash
python3 -m http.server 4321 --directory site
```

The numbers on the page come from `bench/heldout-v4/RESULTS-*.md`. Update both together.
