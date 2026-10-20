# jsdom: sources and judgment calls

Package `jsdom` (repo jsdom/jsdom). Pinned version **30.1.3**. Types come from `@types/jsdom` (DefinitelyTyped), which is a different package and was not read for entries.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19 (`npm view jsdom time --json`, UTC):

| version | npm publish date |
|---|---|
| 30.0.0 | 2026-07-27 (new major) |
| 30.0.1 | 2026-07-29 |
| 30.1.0 | 2026-09-17 |
| 30.1.1 | 2026-09-22 |
| 30.1.2 | 2026-10-04 |
| 30.1.3 | 2026-10-15 |

The last stable before the window is 29.1.1 (2026-04-30). No prereleases or backports in the window.

## Sources consulted

| source | entries |
|---|---|
| `npm view jsdom time --json`; `npm view jsdom@{29.1.1,30.0.0,30.1.3} engines peerDependencies` | dates; engines and peer ranges |
| GitHub releases v30.0.0 to v30.1.3 (`gh api repos/jsdom/jsdom/releases --paginate`), read in full | 2 |
| Changelog file: the repository no longer has `Changelog.md` at tag v30.1.3 (404; the tree has only README, Contributing, etc.), so the release notes are the changelog | 0 |
| Migration guide / blog post for 30.0.0: none exists. The release notes' "Breaking changes" heading is the only upgrade documentation | 0 |
| `package.json` diff v29.1.1...v30.0.0 (https://github.com/jsdom/jsdom/compare/v29.1.1...v30.0.0) | 1 |
| README diff v29.1.1 vs v30.1.3: only `require("node:vm")` in an example and a docs link changed; no API or option changes | 0 |

Total: **3 entries**: 2 `breaking`, 1 `default-behavior`.

## Judgment calls

Included:
- `jsdom@30.0.0/node-minimum-22-22` (breaking): the only bullet under "Breaking changes".
- `jsdom@30.0.0/canvas-peer-3-2-3` (breaking, unsure): not in the notes. Found in the package.json diff: the optional `canvas` peer range went from `^3.0.0` to `^3.2.3`. The protocol counts a raised minimum peer version, so it's included; it is optional and environment-only, so likely S2/S4 in the walk.
- `jsdom@30.1.0/window-close-keeps-document` (default-behavior): "Changed `window.close()` to preserve access to the document and its DOM through retained references." The only bullet phrased as "Changed" rather than "Fixed" or "Added"; the same input now behaves differently. The summary also mentions the same release's "Fixed queued events and navigation continuing after `window.close()`..." because that describes what a closed window still stops; that fix isn't a separate entry.

Left out (jsdom presents nearly everything as "Fixed", and the protocol leaves fixes out). Noted because they can change results for code that worked before:
- 30.0.0 "Fixed `getComputedStyle()` to convert length values into pixels": computed lengths like `1em` now come back as `16px`. Spec-alignment fix; the closest call in this package.
- 30.0.0 "Fixed the type of error thrown by `document.evaluate()`"; 30.0.0 CSS function serialization.
- 30.1.0 "Added named access to elements on `document`" (`document.myForm`): a feature, though `document.<name>` used to be `undefined`.
- 30.1.0 "Added `QuotaExceededError`, including its use for storage quota errors and oversized `crypto.getRandomValues()` requests": the thrown error becomes an instance of the new class; a feature.
- 30.1.0 "Fixed `volumechange` and `ratechange` events to fire asynchronously", "Fixed `document.readyState` to be `"complete"` for documents created with `createDocument()`/`createHTMLDocument()`", "Fixed the default `blobEvent.timecode` to be `NaN`", "Fixed `<base>` elements to ignore `data:` and `javascript:` URLs", "Fixed DOM APIs accepting user-created proxies around DOM objects", "Fixed the object shape and property descriptors of `CSS`": spec fixes.
- 30.1.1 to 30.1.3: all fixes and performance (focus/blur, `!important` handling, encoding detection, XHR credential and cookie handling across cross-origin redirects (security fixes), selector matching, computed-style fixes). 30.1.2 "Updated URLs to support Unicode v18.0.0 in internationalized domain names" is a data update.
- 30.0.0 `CSS.escape()`/`CSS.supports()`, new CSS properties: features. 30.0.1, and the performance bullets throughout: fixes and performance.
