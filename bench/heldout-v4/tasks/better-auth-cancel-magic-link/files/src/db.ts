import { DatabaseSync } from "node:sqlite";

export const SCHEMA = `
create table if not exists "user" ("id" text primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null default 0, "image" text, "createdAt" date not null, "updatedAt" date not null);
create table if not exists "session" ("id" text primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);
create table if not exists "account" ("id" text primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null);
create table if not exists "verification" ("id" text primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date not null, "updatedAt" date not null);
`;

export function openDatabase(path = process.env.DATABASE_PATH ?? "data/app.db"): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec("pragma foreign_keys = on");
  db.exec(SCHEMA);
  return db;
}
