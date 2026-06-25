import assert from "node:assert/strict";
import {
  normalizeProductRole,
  readProductRole,
  PRODUCT_ROLES,
} from "@/lib/assets/productRole";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}`, err);
  }
}

check("normalizeProductRole accepts logo", () => {
  assert.equal(normalizeProductRole("logo"), "logo");
});

check("normalizeProductRole rejects garbage", () => {
  assert.equal(normalizeProductRole("not-a-role"), null);
});

check("readProductRole from metadata", () => {
  assert.equal(readProductRole({ product_role: "product_ui" }), "product_ui");
});

check("PRODUCT_ROLES has expected count", () => {
  assert.equal(PRODUCT_ROLES.length, 11);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
