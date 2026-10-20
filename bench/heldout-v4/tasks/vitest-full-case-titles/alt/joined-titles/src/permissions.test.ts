import { describe, expect, test } from "vitest";
import { can, type Role } from "./permissions.ts";

const cases: { role: Role; actions: string[] }[] = [
  { role: "viewer", actions: ["invoices:read"] },
  { role: "support-agent", actions: ["invoices:read", "customers:read", "customers:notes:write"] },
  { role: "billing-admin", actions: ["invoices:read", "invoices:write", "refunds:issue", "payouts:read"] },
  { role: "billing-admin-eu", actions: ["invoices:read", "invoices:write", "refunds:issue", "payouts:read", "vat:reports:export"] },
  { role: "owner", actions: ["invoices:read", "invoices:write", "refunds:issue", "payouts:read", "payouts:schedule", "members:manage"] },
];

describe("permissions", () => {
  test.for(cases.map((c) => [c.role, c.actions.join(", "), c.actions] as const))("%s can %s", ([role, , actions]) => {
    for (const action of actions) expect(can(role, action)).toBe(true);
  });
});
