import assert from "node:assert/strict";
import test from "node:test";

import { getMockAsset } from "../src/app/_data/dashboard.ts";
import { scaleTrendPoints } from "../src/app/_components/trend-scale.ts";

test("getMockAsset accepts known ids and falls back for untrusted values", () => {
  assert.equal(getMockAsset("M-09").id, "M-09");
  assert.equal(getMockAsset("unknown").id, "M-01");
  assert.equal(getMockAsset(["M-09"]).id, "M-01");
});

test("scaleTrendPoints keeps gaps and gives constant readings a visible baseline", () => {
  assert.deepEqual(scaleTrendPoints([10, null, 20]), [18, null, 100]);
  assert.deepEqual(scaleTrendPoints([5, 5]), [55, 55]);
  assert.deepEqual(scaleTrendPoints([null, null]), [null, null]);
});
