import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("local setup check reports every missing prerequisite", () => {
  const fixture = mkdtempSync(join(tmpdir(), "predictive-maintenance-setup-"));
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "path"),
  );
  env.PATH = fixture;

  try {
    writeFileSync(join(fixture, ".nvmrc"), `${process.versions.node}\n`);

    const result = spawnSync(process.execPath, [resolve("scripts/check-local-setup.mjs")], {
      cwd: fixture,
      encoding: "utf8",
      env,
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing \.env/);
    assert.match(result.stderr, /Docker is unavailable/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
