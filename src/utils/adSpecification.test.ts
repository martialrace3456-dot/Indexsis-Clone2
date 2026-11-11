import { test } from "node:test";
import assert from "node:assert/strict";
import { AD_PRICE_FACTORS, calculateAdAmount, toggleAdTarget } from "./adSpecification";

test("age country and contest factors are each exactly 1", () => {
  assert.deepEqual(AD_PRICE_FACTORS, { age: 1, country: 1, contest: 1 });
});
test("100 minutes costs $5 regardless of targeting selection counts", () => {
  assert.equal(calculateAdAmount(100), 5);
  assert.equal(calculateAdAmount(10), 0.5);
});
test("All clears specifics and specific options can be combined", () => {
  assert.deepEqual(toggleAdTarget(["USA", "UK"], null), []);
  assert.deepEqual(toggleAdTarget([], "USA"), ["USA"]);
  assert.deepEqual(toggleAdTarget(["USA"], "UK"), ["USA", "UK"]);
  assert.deepEqual(toggleAdTarget(["USA", "UK"], "USA"), ["UK"]);
});