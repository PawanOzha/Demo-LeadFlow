/**
 * Runs database/seed-bootstrap.ts on Railway when the DB may be empty.
 * Skips locally and when LEADFLOW_SKIP_AUTO_BOOTSTRAP=true.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

if (process.env.LEADFLOW_SKIP_AUTO_BOOTSTRAP === "true") {
  process.exit(0);
}

if (!process.env.RAILWAY_ENVIRONMENT) {
  process.exit(0);
}

const tsxCli = path.join(webRoot, "node_modules", "tsx", "dist", "cli.mjs");
if (!fs.existsSync(tsxCli)) {
  console.warn(
    "[LeadFlow] tsx not found; skipping auto-bootstrap. Install dependencies or run: npx tsx database/seed-bootstrap.ts",
  );
  process.exit(0);
}

const r = spawnSync(
  process.execPath,
  [tsxCli, path.join(webRoot, "database", "seed-bootstrap.ts")],
  { cwd: webRoot, stdio: "inherit", env: process.env },
);

process.exit(r.status ?? 0);
