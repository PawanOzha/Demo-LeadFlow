/**
 * npm workspaces often hoist `xlsx` to the repo root. Next/Turbopack does not
 * resolve that package from `web/` when only a symlink exists. Copy the hoisted
 * folder into `web/node_modules/xlsx` so imports resolve during build.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const src = path.join(webRoot, "..", "node_modules", "xlsx");
const dst = path.join(webRoot, "node_modules", "xlsx");

function main() {
  if (!fs.existsSync(src)) return;
  const st = fs.lstatSync(dst, { throwIfNoEntry: false });
  if (st?.isSymbolicLink()) {
    fs.rmSync(dst);
  } else if (st?.isDirectory()) {
    return;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
}

main();
