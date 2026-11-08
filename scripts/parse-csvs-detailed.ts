import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Parse a single CSV line with support for quotes
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

async function inspectLastRoundDetailed() {
  const file = "data/company-sources/raw/lastroundai/ats-directory/lastroundai-ats-company-directory-2026-08.csv";
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });

  let header: string[] = [];
  const vendorCounts: Record<string, number> = {};
  const samples: Record<string, any[]> = {};
  let total = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const parts = parseCsvLine(line);
    if (header.length === 0) {
      header = parts;
      continue;
    }
    total++;
    const vendor = parts[0]?.trim();
    vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
    if (!samples[vendor]) samples[vendor] = [];
    if (samples[vendor].length < 3) {
      samples[vendor].push({
        vendor: parts[0],
        company: parts[1],
        slug: parts[2],
        last_crawled: parts[3],
      });
    }
  }

  console.log("=== LastRound AI Detailed Summary ===");
  console.log("Header:", header);
  console.log("Total Records:", total);
  console.log("Vendor Counts:", vendorCounts);
  console.log("Samples by Vendor:");
  for (const [v, sList] of Object.entries(samples)) {
    console.log(`- Vendor: ${v}`);
    sList.forEach(s => console.log(`    ${JSON.stringify(s)}`));
  }
}

async function inspectOpenAtsFeedDetailed() {
  const docsDir = "data/company-sources/raw/open-ats-feed/docs/data";
  console.log("\n=== Open ATS Feed docs/data Detailed Summary ===");

  const allCsv = path.join(docsDir, "all.csv");
  const allRl = readline.createInterface({ input: fs.createReadStream(allCsv), crlfDelay: Infinity });
  let allHeader: string[] = [];
  const allAtsCounts: Record<string, number> = {};
  const allKeys = new Set<string>();
  let allCount = 0;

  for await (const line of allRl) {
    if (!line.trim()) continue;
    const parts = parseCsvLine(line);
    if (allHeader.length === 0) {
      allHeader = parts;
      continue;
    }
    allCount++;
    const ats = parts[1]?.trim();
    const token = parts[0]?.trim();
    allAtsCounts[ats] = (allAtsCounts[ats] || 0) + 1;
    allKeys.add(`${ats}:${token}`);
  }

  console.log("all.csv Header:", allHeader);
  console.log("all.csv Total Records:", allCount);
  console.log("all.csv ATS Counts:", allAtsCounts);

  // Check each provider CSV against all.csv
  const providerFiles = ["ashby.csv", "greenhouse.csv", "lever.csv", "breezy.csv", "recruitee.csv", "teamtailor.csv"];
  let providerSum = 0;
  let allMatched = true;

  for (const pf of providerFiles) {
    const pPath = path.join(docsDir, pf);
    const pRl = readline.createInterface({ input: fs.createReadStream(pPath), crlfDelay: Infinity });
    let pHeader: string[] = [];
    let pCount = 0;
    const pAtsName = pf.replace(".csv", "");
    for await (const line of pRl) {
      if (!line.trim()) continue;
      const parts = parseCsvLine(line);
      if (pHeader.length === 0) {
        pHeader = parts;
        continue;
      }
      pCount++;
      const token = parts[0]?.trim();
      const key = `${pAtsName}:${token}`;
      if (!allKeys.has(key)) {
        allMatched = false;
        console.log(`Mismatch: ${key} in ${pf} not in all.csv`);
      }
    }
    providerSum += pCount;
    console.log(`- ${pf}: ${pCount} records | Header: [${pHeader.join(", ")}]`);
  }
  console.log(`Provider CSVs sum: ${providerSum} | all.csv: ${allCount}`);
  console.log(`Are all individual provider rows strictly present in all.csv? ${allMatched}`);

  // Inspect the remaining CSV files in docs/data to see what they are
  const otherFiles = [
    "ramp.csv",
    "engineering.csv",
    "board-industry.csv",
    "board-roles.csv",
    "data-quality.csv",
    "duplication-corpus.csv",
    "net-new-vs-ats-scrapers.csv",
  ];

  console.log("\n--- Other files in docs/data ---");
  for (const ofile of otherFiles) {
    const oPath = path.join(docsDir, ofile);
    if (!fs.existsSync(oPath)) continue;
    const oRl = readline.createInterface({ input: fs.createReadStream(oPath), crlfDelay: Infinity });
    let oHeader: string[] = [];
    let oCount = 0;
    const samples: string[][] = [];
    for await (const line of oRl) {
      if (!line.trim()) continue;
      const parts = parseCsvLine(line);
      if (oHeader.length === 0) {
        oHeader = parts;
        continue;
      }
      oCount++;
      if (samples.length < 2) samples.push(parts);
    }
    console.log(`* ${ofile}: ${oCount} records`);
    console.log(`  Header: [${oHeader.join(", ")}]`);
    console.log(`  Sample: [${samples[0]?.join(", ")}]`);
  }
}

async function inspectMoonieDetailed() {
  const file = "data/company-sources/raw/moonie0201/companies.jsonl";
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });

  let total = 0;
  const providerCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const samplesByProvider: Record<string, any[]> = {};
  let populatedNameCount = 0;
  let populatedDomainCount = 0;
  let populatedSiteCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    total++;
    const obj = JSON.parse(line);
    const p = obj.provider || "unknown";
    providerCounts[p] = (providerCounts[p] || 0) + 1;
    const s = obj.status || "unknown";
    statusCounts[s] = (statusCounts[s] || 0) + 1;

    if (obj.name) populatedNameCount++;
    if (obj.domain) populatedDomainCount++;
    if (obj.site) populatedSiteCount++;

    if (!samplesByProvider[p]) samplesByProvider[p] = [];
    if (samplesByProvider[p].length < 2) {
      samplesByProvider[p].push(obj);
    }
  }

  console.log("\n=== Moonie Detailed Summary ===");
  console.log("Total JSONL lines:", total);
  console.log("Provider breakdown:", providerCounts);
  console.log("Status breakdown:", statusCounts);
  console.log(`Populated fields: name=${populatedNameCount}/${total}, domain=${populatedDomainCount}/${total}, site=${populatedSiteCount}/${total}`);
  console.log("Samples by Provider:");
  for (const [p, sList] of Object.entries(samplesByProvider)) {
    console.log(`- ${p}:`);
    sList.forEach(s => console.log(`    ${JSON.stringify(s)}`));
  }
}

async function main() {
  await inspectLastRoundDetailed();
  await inspectOpenAtsFeedDetailed();
  await inspectMoonieDetailed();
}

main().catch(console.error);

