import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

const issues = [];
const root = process.cwd();
const expectedNodeMajor = readFileSync(resolve(root, ".nvmrc"), "utf8").trim().split(".")[0];

if (process.versions.node.split(".")[0] !== expectedNodeMajor) {
  issues.push(`Node.js ${expectedNodeMajor}.x is required. Run "nvm use".`);
}

const envPath = resolve(root, ".env");

if (!existsSync(envPath)) {
  issues.push('Missing .env. Copy .env.example to .env first.');
} else {
  try {
    const databaseUrl = parseEnv(readFileSync(envPath, "utf8")).DATABASE_URL;
    const expectedUrl = parseEnv(readFileSync(resolve(root, ".env.example"), "utf8")).DATABASE_URL;

    if (!databaseUrl) {
      issues.push("DATABASE_URL is missing from .env.");
    } else if (databaseUrl !== expectedUrl) {
      issues.push("DATABASE_URL must match .env.example when using the bundled PostgreSQL service.");
    }
  } catch {
    issues.push(".env could not be parsed. Recreate it from .env.example.");
  }
}

const runDocker = (args) => spawnSync("docker", args, { stdio: "ignore" });
const docker = runDocker(["--version"]);

if (docker.error?.code === "ENOENT" || docker.status !== 0) {
  issues.push('Docker is unavailable. Install it and verify that "docker --version" works.');
} else {
  if (runDocker(["compose", "version"]).status !== 0) {
    issues.push('Docker Compose v2 is unavailable. Verify that "docker compose version" works.');
  }

  if (runDocker(["info"]).status !== 0) {
    issues.push("Docker is installed, but its daemon is not running. Start Docker Desktop or the Docker service.");
  }
}

if (issues.length > 0) {
  console.error("Local setup is incomplete:\n");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log("Local setup is ready.");
}
