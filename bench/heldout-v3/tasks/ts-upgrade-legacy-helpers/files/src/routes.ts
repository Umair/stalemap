import { firstDefined, format, joinPath } from "./legacy/strings.js";

export interface User {
  id: number;
  name?: string;
  nickname?: string | null;
  unread: number;
}

export function userUrl(user: User): string {
  return joinPath("/api/", "users", user.id);
}

export function avatarUrl(user: User, size: number): string {
  return joinPath("static", "avatars", String(user.id), `${size}.png`);
}

export function displayName(user: User): string {
  return firstDefined(user.nickname, user.name, "Anonymous");
}

export function welcomeMessage(user: User): string {
  return format("Welcome back, {0}! You have {1} new messages.", displayName(user), user.unread);
}
