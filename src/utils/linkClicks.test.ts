/// <reference types="node" />
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { bucketClicks } from "./linkClicks";

describe("bucketClicks", () => {
  test("groups clicks into 10-minute divisions", () => {
    const b = bucketClicks(["2026-01-01T10:01:00Z", "2026-01-01T10:09:00Z", "2026-01-01T10:12:00Z"]);
    assert.deepEqual(b.map((x) => x.count), [2, 1]);
  });
  test("fills empty 10-minute gaps with zero", () => {
    const b = bucketClicks(["2026-01-01T10:00:00Z", "2026-01-01T10:35:00Z"]);
    assert.deepEqual(b.map((x) => x.count), [1, 0, 0, 1]);
  });
});
