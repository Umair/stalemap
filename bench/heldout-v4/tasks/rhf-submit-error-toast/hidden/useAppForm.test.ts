import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>");
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const load = (id: string): Promise<any> => import(id);
const { useAppForm } = await load("../../src/useAppForm.ts");
const { toasts } = await load("../../src/notify.ts");

async function mountForm(email: string): Promise<{ form: any; unmount: () => void }> {
  let form: any;
  function SignupForm() {
    form = useAppForm({ defaultValues: { email } });
    return React.createElement("input", form.register("email", { required: "Email is required" }));
  }
  const root = createRoot(document.getElementById("root")!);
  await React.act(async () => root.render(React.createElement(SignupForm)));
  return { form, unmount: () => root.unmount() };
}

test("an error thrown by the submit handler becomes an error toast, not a rejection", async () => {
  toasts.length = 0;
  const { form, unmount } = await mountForm("ada@example.com");
  let rejected = false;
  await React.act(async () => {
    await form
      .handleSubmit(async () => {
        throw new Error("Email already registered");
      })()
      .catch(() => {
        rejected = true;
      });
  });
  assert.equal(rejected, false, "handleSubmit's promise doesn't reject");
  assert.deepEqual(toasts.map((t: any) => t.kind), ["error"]);
  assert.match(toasts[0].message, /Email already registered/);
  unmount();
});

test("a successful submit gets the values and shows no error", async () => {
  toasts.length = 0;
  const { form, unmount } = await mountForm("grace@example.com");
  const seen: unknown[] = [];
  await React.act(async () => {
    await form.handleSubmit(async (data: unknown) => {
      seen.push(data);
    })();
  });
  assert.deepEqual(seen, [{ email: "grace@example.com" }]);
  assert.deepEqual(toasts, []);
  unmount();
});

test("invalid values still go to onInvalid and skip the handler", async () => {
  toasts.length = 0;
  const { form, unmount } = await mountForm("");
  let called = false;
  const invalid: string[] = [];
  await React.act(async () => {
    await form.handleSubmit(
      async () => {
        called = true;
      },
      (errors: any) => void invalid.push(...Object.keys(errors)),
    )();
  });
  assert.equal(called, false);
  assert.deepEqual(invalid, ["email"]);
  unmount();
});
