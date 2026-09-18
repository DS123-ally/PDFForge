import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const pkg = JSON.parse(read("package.json"));
const envExample = read(".env.example");
const releaseDoc = read("docs/release.md");
const acceptanceDoc = read("docs/acceptance.md");
const nvmrc = read(".nvmrc").trim();

if (pkg.engines?.node !== ">=22.13.0") {
  fail(`Unexpected engines.node: ${pkg.engines?.node}`);
}

if (nvmrc !== "24") {
  fail(`Unexpected .nvmrc: ${nvmrc}`);
}

if (!envExample.includes("NEXT_PUBLIC_SITE_URL=")) {
  fail(".env.example must define NEXT_PUBLIC_SITE_URL.");
}

for (const marker of [
  "Rollback",
  "Strict-Transport-Security",
  "NEXT_PUBLIC_SITE_URL",
  "next start",
  "/health",
  "/sw.js",
  "docker compose",
]) {
  if (!releaseDoc.includes(marker)) {
    fail(`docs/release.md is missing "${marker}".`);
  }
}

for (const marker of ["Chromium", "Firefox", "WebKit", "Merge PDF"]) {
  if (!acceptanceDoc.includes(marker)) {
    fail(`docs/acceptance.md is missing "${marker}".`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Release packaging checks passed.");
