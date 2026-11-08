import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

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

async function main() {
  const docsDir = "data/company-sources/raw/open-ats-feed/docs/data";
  const allCsvPath = path.join(docsDir, "all.csv");
  const allRl = readline.createInterface({ input: fs.createReadStream(allCsvPath), crlfDelay: Infinity });

  let allHeader: string[] = [];
  const allRowsByKey = new Map<string, string[]>();
  const allCountsByProvider: Record<string, number> = {};

  for await (const line of allRl) {
    if (!line.trim()) continue;
    const parts = parseCsvLine(line);
    if (allHeader.length === 0) {
      allHeader = parts;
      continue;
    }
    const provider = parts[0]?.trim();
    const token = parts[1]?.trim();
    const key = `${provider}:${token}`;
    allRowsByKey.set(key, parts);
    allCountsByProvider[provider] = (allCountsByProvider[provider] || 0) + 1;
  }

  console.log("all.csv total records:", allRowsByKey.size);
  console.log("all.csv breakdown by provider:", allCountsByProvider);

  const providerFiles = [
    { name: "greenhouse.csv", provider: "greenhouse" },
    { name: "ashby.csv", provider: "ashby" },
    { name: "lever.csv", provider: "lever" },
    { name: "breezy.csv", provider: "breezy" },
    { name: "recruitee.csv", provider: "recruitee" },
    { name: "teamtailor.csv", provider: "teamtailor" },
  ];

  let totalIndividualRows = 0;
  let allMatched = true;

  for (const pf of providerFiles) {
    const pPath = path.join(docsDir, pf.name);
    const pRl = readline.createInterface({ input: fs.createReadStream(pPath), crlfDelay: Infinity });
    let pHeader: string[] = [];
    let pCount = 0;
    let fileMatched = true;

    for await (const line of pRl) {
      if (!line.trim()) continue;
      const parts = parseCsvLine(line);
      if (pHeader.length === 0) {
        pHeader = parts;
        continue;
      }
      pCount++;
      const provider = parts[0]?.trim();
      const token = parts[1]?.trim();
      const key = `${provider}:${token}`;

      if (!allRowsByKey.has(key)) {
        fileMatched = false;
        allMatched = false;
        console.log(`Missing in all.csv: ${key}`);
      }
    }

    totalIndividualRows += pCount;
    console.log(`- ${pf.name}: ${pCount} records, all in all.csv: ${fileMatched}`);
  }

  console.log(`Total individual rows: ${totalIndividualRows} vs all.csv: ${allRowsByKey.size}`);
  console.log(`Are the individual provider files completely identical to all.csv when combined? ${allMatched && totalIndividualRows === allRowsByKey.size}`);
}

main().catch(console.error);

