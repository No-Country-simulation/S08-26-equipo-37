import { spawnSync } from "node:child_process";

/**
 * Repository artifact guard.
 *
 * Data and model artifacts are stored with Git LFS, so the index keeps a
 * ~130-byte pointer and the repository history does not grow with the data.
 * A data file added without LFS is stored as a full blob and is then copied
 * into every clone forever.
 *
 * That is what happened in #44: a 16 MB duplicate of the dataset was committed
 * under `ml/datos/` because `.gitattributes` only matched `datos/`, and the
 * `Dataset` workflow only watched `datos/**`, so nothing failed.
 *
 * This check reads blob sizes from the Git index, so it needs neither `git-lfs`
 * nor an LFS download, and it stays fast enough to run on every pull request.
 *
 * Usage:
 *   node scripts/validate-artifacts.mjs
 *
 * The limit is deliberately below dataset scale and above the artifacts the
 * repository tracks today, so it fails on the mistake it exists to catch
 * instead of on the current content.
 */
const maxArtifactBytes = 512 * 1024;

const guardedExtensions = [
  ".arrow",
  ".csv",
  ".feather",
  ".h5",
  ".joblib",
  ".onnx",
  ".parquet",
  ".pkl",
  ".pt",
  ".xlsx",
  ".zip",
];

const formatBytes = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MiB` : `${Math.round(bytes / 1024)} KiB`;

const issues = [];
const results = [];

const run = (args, options = {}) =>
  spawnSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, ...options });

const listed = run(["ls-files", "-s", "-z"]);

if (listed.error || listed.status !== 0) {
  issues.push(
    `The Git index could not be read (${listed.error?.message ?? listed.stderr.trim()}). Run this check inside the repository.`,
  );
} else {
  // `-z` separates records with NUL so paths with spaces or quotes stay intact.
  const candidates = listed.stdout
    .split("\0")
    .filter(Boolean)
    .flatMap((record) => {
      const tabIndex = record.indexOf("\t");
      const path = record.slice(tabIndex + 1);
      const blob = record.slice(0, tabIndex).split(" ")[1];

      return guardedExtensions.some((extension) => path.toLowerCase().endsWith(extension))
        ? [{ path, blob }]
        : [];
    });

  if (candidates.length === 0) {
    results.push("no data or model artifacts are tracked");
  } else {
    // One `cat-file` call for every candidate keeps the check to two processes.
    const sizes = run(["cat-file", "--batch-check=%(objectname) %(objectsize)"], {
      input: `${candidates.map(({ blob }) => blob).join("\n")}\n`,
    });

    if (sizes.error || sizes.status !== 0) {
      issues.push(`Git blob sizes could not be read (${sizes.error?.message ?? sizes.stderr.trim()}).`);
    } else {
      const sizeByBlob = new Map(
        sizes.stdout
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [blob, size] = line.split(" ");
            return [blob, Number(size)];
          }),
      );

      let largest = null;

      for (const { path, blob } of candidates) {
        const size = sizeByBlob.get(blob) ?? 0;

        if (size > maxArtifactBytes) {
          issues.push(
            `${path} is ${formatBytes(size)} (${size} bytes) and is stored without Git LFS. ` +
              `Track it with Git LFS, or keep it out of the repository. See docs/DEVELOPMENT.md.`,
          );
        } else if (largest === null || size > largest.size) {
          largest = { path, size };
        }
      }

      if (largest) {
        results.push(
          `${candidates.length} artifact(s) tracked, largest ${largest.path} (${formatBytes(largest.size)})`,
        );
      }
    }
  }
}

if (issues.length > 0) {
  console.error("Repository artifact check failed:\n");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log("Repository artifact check passed:");
  for (const result of results) console.log(`- ${result}`);
}
