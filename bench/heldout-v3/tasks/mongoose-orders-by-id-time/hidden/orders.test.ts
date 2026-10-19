import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
const load = (id: string): Promise<any> => import(id);
const { ordersCreatedBetween } = await load("../../src/orders.ts");

const seconds = (iso: string) => Math.floor(Date.parse(iso) / 1000);
const idAt = (s: number, tail: string) => new mongoose.Types.ObjectId(s.toString(16).padStart(8, "0") + tail);
const ZERO = "0".repeat(16);
const MAX = "f".repeat(16);

/** Evaluates the query's conditions on _id the way MongoDB compares ObjectIds. */
function matches(filter: any, id: mongoose.Types.ObjectId): boolean {
  const conditions = [filter._id, ...(filter.$and ?? []).map((c: any) => c._id)].filter(Boolean);
  assert.ok(conditions.length > 0, "the query filters on _id");
  const hex = id.toHexString();
  return conditions.every((condition: any) =>
    Object.entries(condition).every(([op, bound]) => {
      const b = String(bound).toLowerCase();
      assert.match(b, /^[0-9a-f]{24}$/, `${op} compares against an id`);
      if (op === "$gte") return hex >= b;
      if (op === "$gt") return hex > b;
      if (op === "$lte") return hex <= b;
      if (op === "$lt") return hex < b;
      throw new Error(`unexpected operator ${op}`);
    }),
  );
}

test("finds orders whose ids were created in the range", () => {
  const from = "2026-03-01T00:00:00.000Z";
  const to = "2026-04-01T00:00:00.000Z";
  const query = ordersCreatedBetween(new Date(from), new Date(to));
  assert.ok(query instanceof mongoose.Query, "returns a query");
  assert.equal(query.model.modelName, "Order");
  assert.equal((query as any).op, "find");
  query.cast(); // casts the filter against the Order schema; throws on a bad value
  const filter = query.getFilter();
  const inside = [idAt(seconds(from) + 1, ZERO), idAt(seconds("2026-03-15T12:30:00Z"), "a1b2c3d4e5f60718"), idAt(seconds(to) - 1, MAX)];
  const outside = [idAt(seconds(from) - 1, MAX), idAt(seconds(to) + 1, ZERO), idAt(seconds("2025-12-24T18:00:00Z"), "0123456789abcdef"), idAt(seconds("2026-07-01T00:00:00Z"), ZERO)];
  for (const id of inside) assert.equal(matches(filter, id), true, `${id} (${id.getTimestamp().toISOString()}) is in range`);
  for (const id of outside) assert.equal(matches(filter, id), false, `${id} (${id.getTimestamp().toISOString()}) is out of range`);
});

test("works for ranges with fractional seconds", () => {
  const query = ordersCreatedBetween(new Date("2026-05-10T08:00:00.750Z"), new Date("2026-05-11T08:00:00.250Z"));
  query.cast();
  const filter = query.getFilter();
  assert.equal(matches(filter, idAt(seconds("2026-05-10T12:00:00Z"), ZERO)), true);
  assert.equal(matches(filter, idAt(seconds("2026-05-10T07:59:59Z"), MAX)), false);
  assert.equal(matches(filter, idAt(seconds("2026-05-11T08:00:01Z"), ZERO)), false);
});
