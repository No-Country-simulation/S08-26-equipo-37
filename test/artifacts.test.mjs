import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = resolve("scripts/validate-artifacts.mjs");

const runCheck = (cwd) => spawnSync(process.execPath, [script], { cwd, encoding: "utf8" });
const git = (cwd, args) => spawnSync("git", args, { cwd, encoding: "utf8" });

test("artifact check fails when a data file is tracked without Git LFS", () => {
  const fixture = mkdtempSync(join(tmpdir(), "predictive-maintenance-artifacts-"));

  try {
    git(fixture, ["init", "--quiet"]);
    // A tracked `.csv` whose blob is the file itself means LFS was bypassed:
    // with LFS the index holds a ~130-byte pointer instead.
    writeFileSync(join(fixture, "small.csv"), "id,value\n1,2\n");
    writeFileSync(join(fixture, "large.csv"), `id,value\n${"1,2\n".repeat(200_000)}`);
    git(fixture, ["add", "small.csv", "large.csv"]);

    const result = runCheck(fixture);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /large\.csv/);
    assert.match(result.stderr, /Git LFS/);
    assert.doesNotMatch(result.stderr, /small\.csv/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("artifact check passes when every tracked data file stays under the limit", () => {
  const fixture = mkdtempSync(join(tmpdir(), "predictive-maintenance-artifacts-"));

  try {
    git(fixture, ["init", "--quiet"]);
    writeFileSync(join(fixture, "small.csv"), "id,value\n1,2\n");
    writeFileSync(join(fixture, "notes.md"), "# Not a guarded artifact\n");
    git(fixture, ["add", "small.csv", "notes.md"]);

    const result = runCheck(fixture);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /passed/);
    assert.match(result.stdout, /small\.csv/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
