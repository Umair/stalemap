Our CI caches the `.cache/vitest-modules` folder between runs, so make Vitest store its on-disk cache of transformed modules there (in `vitest.config.ts`) to speed up cold test runs.
