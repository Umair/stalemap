import assert from "node:assert/strict";
import { before, test } from "node:test";

const load = (id: string): Promise<any> => import(id);
let auth: any;
let outbox: { to: string; text: string }[];

before(async () => {
  ({ auth } = await load("../../src/auth.ts"));
  ({ outbox } = await load("../../src/mailer.ts"));
  const res = await upstream("/api/auth/sign-up/email", "shop.northwind.com", { email: "sam@example.com", password: "lemon-tart-1987", name: "Sam" });
  assert.equal(res.status, 200, "sign-up through the proxy failed");
});

/** A request as nginx sends it upstream for a customer on `host`. */
function upstream(path: string, host: string, body: unknown): Promise<Response> {
  return auth.handler(
    new Request(`http://app:3000${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-host": host,
        "x-forwarded-proto": "https",
        "x-forwarded-for": "203.0.113.7",
      },
      body: JSON.stringify(body),
    }),
  );
}

async function requestReset(host: string): Promise<{ status: number; link?: URL }> {
  const before = outbox.length;
  let status: number;
  try {
    const res = await upstream("/api/auth/request-password-reset", host, { email: "sam@example.com", redirectTo: "/account/new-password" });
    status = res.status;
  } catch {
    status = 500;
  }
  const mail = outbox.slice(before).find((m) => m.to === "sam@example.com");
  const match = mail?.text.match(/https?:\/\/[^\s"'<>]+/);
  return { status, link: match ? new URL(match[0]) : undefined };
}

for (const host of ["shop.northwind.com", "shop.northwind.co.uk"]) {
  test(`a reset requested on ${host} links back to ${host} over https`, async () => {
    const { status, link } = await requestReset(host);
    assert.equal(status, 200);
    assert.ok(link, "no reset email with a link was sent");
    assert.equal(link.protocol, "https:");
    assert.equal(link.host, host);
  });
}

test("a reset link never points at a host outside the storefronts", async () => {
  const { link } = await requestReset("login.attacker.example");
  if (link) assert.ok(["shop.northwind.com", "shop.northwind.co.uk"].includes(link.host), `link points at ${link.host}`);
});
