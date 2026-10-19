import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

async function renderElement(element: unknown): Promise<string> {
  const { renderToReadableStream } = await load("react-dom/server.edge");
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return new Response(stream).text();
}
async function render(props: Record<string, string>): Promise<string> {
  const { createElement } = await load("react");
  const { Photo } = await load("../../app/components/Photo.tsx");
  return renderElement(createElement(Photo, props));
}
// React's streaming renderer marks every element inside a <ViewTransition name> with vt-name. A component may
// instead set the CSS view-transition-name itself; the browser then morphs it inside the transition React starts.
const reactName = (html: string) => html.match(/\bvt-name="([^"]+)"/)?.[1];
const cssName = (html: string) => {
  const name = html.match(/view-transition-name:\s*([^;"]+)/)?.[1]?.trim();
  return name && !["none", "auto", "match-element"].includes(name) ? name : undefined;
};
const transitionName = (html: string) => reactName(html) ?? cssName(html);

test("the photo morphs from the grid thumbnail into the large image", async () => {
  const thumb = await render({ id: "fern", src: "/photos/fern.jpg", alt: "Fern in morning light", size: "thumb" });
  const large = await render({ id: "fern", src: "/photos/fern.jpg", alt: "Fern in morning light", size: "large" });
  const other = await render({ id: "moss", src: "/photos/moss.jpg", alt: "Moss on granite", size: "thumb" });
  assert.match(thumb, /<img[^>]*fern\.jpg/, "the thumbnail still renders the image");
  assert.ok(transitionName(thumb), "the thumbnail is part of a named view transition");
  assert.equal(transitionName(large), transitionName(thumb), "the large image shares the thumbnail's transition name");
  assert.ok(transitionName(other), "every photo is part of a named view transition");
  assert.notEqual(transitionName(other), transitionName(thumb), "each photo has its own transition name");
  if (!reactName(thumb)) {
    // A name set in CSS morphs only inside a view transition React starts, which the root layout's <ViewTransition> does on every navigation.
    const { createElement } = await load("react");
    const { default: RootLayout } = await load("../../app/layout.tsx");
    const page = await renderElement(createElement(RootLayout, null, createElement("main", null, "page")));
    assert.match(page, /<main[^>]*\svt-(?:update|enter|share|name)="(?!none")/, "navigations run in a React view transition");
  }
});

test("Next accepts every option in next.config.ts", async () => {
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_PRODUCTION_BUILD } = await load("next/dist/shared/lib/constants.js");
  const messages: string[] = [];
  const original = { warn: console.warn, error: console.error, log: console.log };
  for (const k of ["warn", "error", "log"] as const) console[k] = (...args: unknown[]) => void messages.push(args.join(" "));
  try {
    await loadConfig(PHASE_PRODUCTION_BUILD, root, { silent: false });
  } finally {
    Object.assign(console, original);
  }
  const invalid = messages.filter((m) => /Invalid next\.config|Unrecognized key/i.test(m));
  assert.deepEqual(invalid, [], "next.config.ts has no options Next doesn't recognize");
});
