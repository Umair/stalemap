# Contributing

Thanks for helping. stalemap is small and maintained by one person, so short, focused changes are easiest to review.

## Reporting a problem

Open an [issue](https://github.com/Umair/stalemap/issues) with:

- the command you ran and your stalemap version (`npx stalemap --version`, or the commit if you built from source);
- the model and the package versions involved;
- for a wrong, missing or noisy note, the note (or the change you expected) and a link to the release note or type change it should come from.

## Making a change

```bash
npm install
npm run build
npm test
```

- Add or update a test in `test/` for any behavior change. Tests run offline against the fixtures in `test/fixtures/`.
- Keep rules general. A fix shouldn't name a specific package or task unless it is about that package by design (like TypeScript's compiler options).
- Add a line under an "Unreleased" heading at the top of [CHANGELOG.md](CHANGELOG.md) for anything a user would notice.
- `src/` can be frozen while a blind benchmark runs (see the tags). If a change can't wait, say so in the pull request.

## Benchmark tasks

New tasks are welcome, but a task only counts toward a claim if it's written blind: without running stalemap on it or reading its notes. Read the protocol of the suite you're adding to (`bench/heldout-v3/PROTOCOL.md` and `AUTHORING.md`) first, and check your task with that suite's `validate.ts`: the reference solution must pass, and the stale versions must fail. Changes to stalemap made after looking at a suite's results are post-hoc and are reported that way.

Don't commit session transcripts (`bench/results/*/runs/`), API keys or anything from your own projects.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
