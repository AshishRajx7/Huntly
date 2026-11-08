import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Helper to count lines and get header + sample rows of CSV
async function inspectCsv(filePath: string, sampleCount = 5) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  let header = "";
  const samples: string[] = [];

  for await (const line of rl) {
    if (line.trim().length === 0) continue;
    lineCount++;
    if (lineCount === 1) {
      header = line;
    } else if (samples.length < sampleCount) {
      samples.push(line);
    }
  }

  return {
    filePath,
    totalLines: lineCount,
    recordCount: Math.max(0, lineCount - 1),
    header,
    samples,
  };
}

// Helper to inspect JSONL
async function inspectJsonl(filePath: string, sampleCount = 5) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  const samples: any[] = [];
  const keysSet = new Set<string>();
  const atsCounts: Record<string, number> = {};

  for await (const line of rl) {
    if (line.trim().length === 0) continue;
    lineCount++;
    try {
      const obj = JSON.parse(line);
      Object.keys(obj).forEach((k) => keysSet.add(k));
      const ats = obj.ats || obj.atsProvider || obj.ats_provider || obj.provider || "unknown";
      atsCounts[ats] = (atsCounts[ats] || 0) + 1;
      if (samples.length < sampleCount) {
        samples.push(obj);
      }
    } catch {}
  }

  return {
    filePath,
    totalRecords: lineCount,
    keys: Array.from(keysSet),
    atsCounts,
    samples,
  };
}

async function main() {
  console.log("=================================================");
  console.log("PHASE 1: LastRound AI ATS Directory Inspection");
  console.log("=================================================");
  const lrCsv = "data/company-sources/raw/lastroundai/ats-directory/lastroundai-ats-company-directory-2026-08.csv";
  const lrResult = await inspectCsv(lrCsv, 8);
  console.log(`File: ${lrResult.filePath}`);
  console.log(`Total Records: ${lrResult.recordCount}`);
  console.log(`Header: ${lrResult.header}`);
  console.log(`Samples:`);
  lrResult.samples.forEach((s, idx) => console.log(` [${idx + 1}] ${s}`));

  // Check ATS breakdown in LastRound AI
  const lrStream = fs.createReadStream(lrCsv);
  const lrRl = readline.createInterface({ input: lrStream, crlfDelay: Infinity });
  let isFirst = true;
  const lrAtsCounts: Record<string, number> = {};
  for await (const line of lrRl) {
    if (isFirst) { isFirst = false; continue; }
    if (!line.trim()) continue;
    // CSV columns: company,career_page,ats,ats_identifier,jobs_active,...
    const parts = line.split(",");
    const ats = parts[2]?.trim() || "unknown";
    lrAtsCounts[ats] = (lrAtsCounts[ats] || 0) + 1;
  }
  console.log(`LastRound AI ATS breakdown:`, lrAtsCounts);

  console.log("\n=================================================");
  console.log("PHASE 2: Open ATS Feed docs/data Inspection");
  console.log("=================================================");
  const openAtsDir = "data/company-sources/raw/open-ats-feed/docs/data";
  const openAtsFiles = fs.readdirSync(openAtsDir).filter(f => f.endsWith(".csv"));

  const openAtsSummaries: Record<string, { records: number; header: string; samples: string[] }> = {};
  for (const f of openAtsFiles) {
    const full = path.join(openAtsDir, f);
    const res = await inspectCsv(full, 3);
    openAtsSummaries[f] = { records: res.recordCount, header: res.header, samples: res.samples };
    console.log(`\nFile: ${f} -> Records: ${res.recordCount}`);
    console.log(` Header: ${res.header}`);
    console.log(` Sample: ${res.samples[0] || "N/A"}`);
  }

  // Check whether all.csv combines provider-specific CSVs
  console.log("\n--- Checking all.csv composition vs provider CSVs ---");
  const allCsvPath = path.join(openAtsDir, "all.csv");
  const allStream = fs.createReadStream(allCsvPath);
  const allRl = readline.createInterface({ input: allStream, crlfDelay: Infinity });
  let allHeader = "";
  const allAtsCounts: Record<string, number> = {};
  const allTokens = new Set<string>();
  let allCount = 0;
  for await (const line of allRl) {
    if (!allHeader) { allHeader = line; continue; }
    if (!line.trim()) continue;
    allCount++;
    const parts = line.split(",");
    const ats = parts[1]?.trim() || "unknown"; // ats column
    const token = parts[0]?.trim() || ""; // token column
    allAtsCounts[ats] = (allAtsCounts[ats] || 0) + 1;
    allTokens.add(`${ats}:${token}`);
  }
  console.log(`all.csv total records: ${allCount}`);
  console.log(`all.csv ATS breakdown:`, allAtsCounts);

  // Compare each provider CSV against all.csv
  const providerCsvs = ["ashby.csv", "greenhouse.csv", "lever.csv", "breezy.csv", "recruitee.csv", "teamtailor.csv"];
  let sumProviderRecords = 0;
  for (const p of providerCsvs) {
    const pPath = path.join(openAtsDir, p);
    if (!fs.existsSync(pPath)) continue;
    const pRes = await inspectCsv(pPath, 1);
    sumProviderRecords += pRes.recordCount;
    console.log(` ${p}: ${pRes.recordCount} records`);
  }
  console.log(`Sum of individual provider CSV records: ${sumProviderRecords} vs all.csv: ${allCount}`);

  console.log("\n=================================================");
  console.log("PHASE 3: Moonie (companies.jsonl) Inspection");
  console.log("=================================================");
  const moonieJsonl = "data/company-sources/raw/moonie0201/companies.jsonl";
  const moonieRes = await inspectJsonl(moonieJsonl, 5);
  console.log(`File: ${moonieRes.filePath}`);
  console.log(`Total Records: ${moonieRes.totalRecords}`);
  console.log(`Schema Keys:`, moonieRes.keys);
  console.log(`ATS Breakdown:`, moonieRes.atsCounts);
  console.log(`Samples:`);
  moonieRes.samples.forEach((s, idx) => console.log(` [${idx + 1}]`, JSON.stringify(s)));

  // Inspect Moonie blocklist.txt
  const blocklistPath = "data/company-sources/raw/moonie0201/blocklist.txt";
  if (fs.existsSync(blocklistPath)) {
    const blocklistContent = fs.readFileSync(blocklistPath, "utf8").split("\n").filter(l => l.trim() && !l.startsWith("#"));
    console.log(`Moonie blocklist.txt count: ${blocklistContent.length} tokens (sample: ${blocklistContent.slice(0, 5).join(", ")})`);
  }

  console.log("\n=================================================");
  console.log("PHASE 4: Licenses & Attribution Check");
  console.log("=================================================");
  const licenses = [
    { name: "LastRound AI LICENSE", path: "data/company-sources/raw/lastroundai/LICENSE" },
    { name: "LastRound AI ats-directory README", path: "data/company-sources/raw/lastroundai/ats-directory/README.md" },
    { name: "Open ATS Feed LICENSE", path: "data/company-sources/raw/open-ats-feed/LICENSE" },
    { name: "Open ATS Feed README", path: "data/company-sources/raw/open-ats-feed/README.md" },
    { name: "Moonie LICENSE", path: "data/company-sources/raw/moonie0201/LICENSE" },
    { name: "Moonie README", path: "data/company-sources/raw/moonie0201/README.md" },
  ];

  for (const lic of licenses) {
    console.log(`\n--- ${lic.name} ---`);
    if (fs.existsSync(lic.path)) {
      const text = fs.readFileSync(lic.path, "utf8");
      console.log(text.slice(0, 600));
    } else {
      console.log("File not found");
    }
  }
}

main().catch(console.error);

