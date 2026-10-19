We upgraded TypeScript in this Express API from 5.8 to 7.0 and the build broke. Fix whatever the upgrade broke so `tsc` passes again and `npm run build` still produces a `dist/` that serves the API.
