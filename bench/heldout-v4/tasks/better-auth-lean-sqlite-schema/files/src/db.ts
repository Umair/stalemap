import { DatabaseSync } from "node:sqlite";

// Owned by our migrations (migrations/*.sql in the main repo). Keep in sync, never edit here.
export const SCHEMA = `
create table if not exists "user" (
  "id" text primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" integer not null default 0,
  "createdAt" date not null,
  "updatedAt" date not null
);

create table if not exists "session" (
  "id" text primary key,
  "token" text not null unique,
  "userId" text not null references "user" ("id") on delete cascade,
  "expiresAt" date not null,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" date not null,
  "updatedAt" date not null
);

create table if not exists "account" (
  "id" text primary key,
  "userId" text not null references "user" ("id") on delete cascade,
  "accountId" text not null,
  "providerId" text not null,
  "password" text,
  "createdAt" date not null,
  "updatedAt" date not null
);
`;

export function openDatabase(path = process.env.DATABASE_PATH ?? "data/app.db"): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec("pragma foreign_keys = on");
  db.exec(SCHEMA);
  return db;
}
