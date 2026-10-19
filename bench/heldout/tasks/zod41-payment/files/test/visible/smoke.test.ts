import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/payment.ts";
test("exports PaymentSchema", () => assert.ok((mod as Record<string, unknown>).PaymentSchema));
