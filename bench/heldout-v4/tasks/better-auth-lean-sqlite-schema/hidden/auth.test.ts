import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

process.env.BETTER_AUTH_SECRET ??= "hidden-test-secret-0123456789-abcdefghijklmnop";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";

const load = (id: string): Promise<any> => import(id);
const { createAuth } = await load("../../src/auth.ts");

// The production schema exactly as our migrations create it (a copy of the starting src/db.ts).
const SCHEMA = `
create table "user" ("id" text primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null default 0, "createdAt" date not null, "updatedAt" date not null);
create table "session" ("id" text primary key, "token" text not null unique, "userId" text not null references "user" ("id") on delete cascade, "expiresAt" date not null, "ipAddress" text, "userAgent" text, "createdAt" date not null, "updatedAt" date not null);
create table "account" ("id" text primary key, "userId" text not null references "user" ("id") on delete cascade, "accountId" text not null, "providerId" text not null, "password" text, "createdAt" date not null, "updatedAt" date not null);
`;

function freshDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec("pragma foreign_keys = on");
  db.exec(SCHEMA);
  return db;
}

const tables = (db: DatabaseSync) =>
  (db.prepare("select name, sql from sqlite_master where type = 'table' order by name").all() as { name: string; sql: string }[])
    .map((t) => `${t.name}: ${t.sql}`)
    .join("\n");

const cookiesFrom = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

test("sign-up, sign-in and session lookup work against the existing tables", async () => {
  const db = freshDatabase();
  const before = tables(db);
  const auth = createAuth(db);

  const signUp = await auth.api.signUpEmail({ body: { name: "Ada", email: "ada@example.com", password: "correct horse battery" } });
  assert.equal(signUp.user.email, "ada@example.com");

  const signIn: Response = await auth.api.signInEmail({
    body: { email: "ada@example.com", password: "correct horse battery" },
    asResponse: true,
  });
  assert.equal(signIn.status, 200);
  const cookie = cookiesFrom(signIn);
  assert.ok(cookie, "sign-in sets a session cookie");

  const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
  assert.equal(session?.user.email, "ada@example.com");

  const users = db.prepare(`select email from "user"`).all() as { email: string }[];
  assert.deepEqual(users.map((u) => u.email), ["ada@example.com"]);
  const accounts = db.prepare(`select providerId, password from "account"`).all() as { providerId: string; password: string | null }[];
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].providerId, "credential");
  assert.ok(accounts[0].password && accounts[0].password !== "correct horse battery", "the password is stored hashed");
  const sessions = db.prepare(`select count(*) as n from "session"`).get() as { n: number };
  assert.ok(sessions.n >= 1);

  assert.equal(tables(db), before, "the tables are left as they were");
});

test("a wrong password is rejected", async () => {
  const db = freshDatabase();
  const auth = createAuth(db);
  await auth.api.signUpEmail({ body: { name: "Bo", email: "bo@example.com", password: "a long password 1" } });
  const res: Response = await auth.api.signInEmail({ body: { email: "bo@example.com", password: "not the password" }, asResponse: true });
  assert.equal(res.status, 401);
});
