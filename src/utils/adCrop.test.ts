/// <reference types="node" />
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { fitMediaCrop, normalizeCrop } from "./adCrop";
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 0.00001);

describe("media pixel cropping", () => {
  test("a square selection in widescreen media fills a square without stretching", () => {
    const fitted = fitMediaCrop({ width: 1600, height: 900 }, { width: 600, height: 600 }, { x: 25, y: 0, w: 56.25, h: 100 });
    close(fitted.width / 1600, fitted.height / 900);
    close(fitted.left, -400 * 2 / 3);
    assert.equal(fitted.top, 0);
    assert.equal(fitted.height, 600);
  });
  test("a wide selection is cover-fitted and centered in a square", () => {
    const fitted = fitMediaCrop({ width: 1600, height: 900 }, { width: 600, height: 600 }, { x: 25, y: 25, w: 50, h: 50 });
    const scale = fitted.height / 900;
    close(fitted.width / 1600, scale);
    close(fitted.left + 800 * scale, 300);
    close(fitted.top + 450 * scale, 300);
    close(fitted.top + 225 * scale, 0);
  });
  test("portrait media fills horizontal placement with uniform scale", () => {
    const fitted = fitMediaCrop({ width: 900, height: 1600 }, { width: 600, height: 300 });
    assert.equal(fitted.width, 600);
    close(fitted.height / 1600, 600 / 900);
    close(fitted.top + fitted.height / 2, 150);
  });
  test("selection cannot include empty pixels outside the source", () => {
    assert.deepEqual(normalizeCrop({ x: -10, y: 95, w: 50, h: 30 }), { x: 0, y: 70, w: 50, h: 30 });
  });
});