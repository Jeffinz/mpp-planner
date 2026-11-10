// ABOUTME: Unit tests for chunk(), which splits Firestore writes under the 500-op batch limit.
// ABOUTME: Checks sizes, order, and the empty case.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chunk } from "../../js/domain/chunk.js";

test("chunk splits into groups of at most size, keeping order", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test("chunk of an empty list is empty", () => {
  assert.deepEqual(chunk([], 500), []);
});
