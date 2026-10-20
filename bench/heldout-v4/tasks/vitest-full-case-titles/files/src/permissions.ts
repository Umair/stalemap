export type Role = "viewer" | "support-agent" | "billing-admin" | "billing-admin-eu" | "owner";

const grants: Record<Role, string[]> = {
  viewer: ["invoices:read"],
  "support-agent": ["invoices:read", "customers:read", "customers:notes:write"],
  "billing-admin": ["invoices:read", "invoices:write", "refunds:issue", "payouts:read"],
  "billing-admin-eu": ["invoices:read", "invoices:write", "refunds:issue", "payouts:read", "vat:reports:export"],
  owner: ["invoices:read", "invoices:write", "refunds:issue", "payouts:read", "payouts:schedule", "members:manage"],
};

export function can(role: Role, action: string): boolean {
  return grants[role].includes(action);
}
