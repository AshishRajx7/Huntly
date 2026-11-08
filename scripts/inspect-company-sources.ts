import * as fs from "fs";
import * as path from "path";

function listDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Directory does not exist: ${dirPath}`);
    return;
  }
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      console.log(`[DIR]  ${fullPath}`);
    } else {
      const stats = fs.statSync(fullPath);
      console.log(`[FILE] ${fullPath} (${stats.size} bytes)`);
    }
  }
}

console.log("=== 1. LastRound AI ats-directory ===");
listDir("data/company-sources/raw/lastroundai/ats-directory");

console.log("\n=== 2. Open ATS Feed docs/data ===");
listDir("data/company-sources/raw/open-ats-feed/docs/data");

console.log("\n=== 2b. Open ATS Feed data (root data folder) ===");
listDir("data/company-sources/raw/open-ats-feed/data");

console.log("\n=== 3. Moonie ===");
listDir("data/company-sources/raw/moonie0201");

