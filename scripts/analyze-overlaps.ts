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
  console.log("==========================================");
  console.log("Analyzing Overlap Across All 3 Datasets");
  console.log("==========================================");

  // 1. LastRound AI
  const lrPath = "data/company-sources/raw/lastroundai/ats-directory/lastroundai-ats-company-directory-2026-08.csv";
  const lrRl = readline.createInterface({ input: fs.createReadStream(lrPath), crlfDelay: Infinity });
  const lrTokens = new Map<string, { provider: string; token: string; companyName: string }>();
  let isFirstLr = true;
  for await (const line of lrRl) {
    if (isFirstLr) { isFirstLr = false; continue; }
    if (!line.trim()) continue;
    const parts = parseCsvLine(line);
    const provider = parts[0]?.trim().toLowerCase();
    const company = parts[1]?.trim();
    const token = parts[2]?.trim().toLowerCase();
    if (provider && token) {
      lrTokens.set(`${provider}:${token}`, { provider, token, companyName: company });
    }
  }

  // 2. Open ATS Feed (all.csv)
  const oafPath = "data/company-sources/raw/open-ats-feed/docs/data/all.csv";
  const oafRl = readline.createInterface({ input: fs.createReadStream(oafPath), crlfDelay: Infinity });
  const oafTokens = new Map<string, { provider: string; token: string; openPostings: number; boardUrl: string }>();
  let isFirstOaf = true;
  for await (const line of oafRl) {
    if (isFirstOaf) { isFirstOaf = false; continue; }
    if (!line.trim()) continue;
    const parts = parseCsvLine(line);
    const provider = parts[0]?.trim().toLowerCase();
    const token = parts[1]?.trim().toLowerCase();
    const postings = parseInt(parts[2]?.trim() || "0", 10);
    const boardUrl = parts[3]?.trim();
    if (provider && token) {
      oafTokens.set(`${provider}:${token}`, { provider, token, openPostings: postings, boardUrl });
    }
  }

  // 3. Moonie (companies.jsonl)
  const mooniePath = "data/company-sources/raw/moonie0201/companies.jsonl";
  const moonieRl = readline.createInterface({ input: fs.createReadStream(mooniePath), crlfDelay: Infinity });
  const moonieTokens = new Map<string, { provider: string; token: string; status: string; companyName?: string }>();
  for await (const line of moonieRl) {
    if (!line.trim()) continue;
    const obj = JSON.parse(line);
    const provider = obj.provider?.trim().toLowerCase();
    const token = obj.slug?.trim().toLowerCase();
    if (provider && token) {
      moonieTokens.set(`${provider}:${token}`, {
        provider,
        token,
        status: obj.status,
        companyName: obj.name || undefined,
      });
    }
  }

  console.log(`\nDataset Sizes:`);
  console.log(`- LastRound AI: ${lrTokens.size} companies`);
  console.log(`- Open ATS Feed (all.csv): ${oafTokens.size} boards`);
  console.log(`- Moonie (companies.jsonl): ${moonieTokens.size} boards`);

  // Provider breakdowns
  const lrProviders: Record<string, number> = {};
  lrTokens.forEach((v) => lrProviders[v.provider] = (lrProviders[v.provider] || 0) + 1);
  const oafProviders: Record<string, number> = {};
  oafTokens.forEach((v) => oafProviders[v.provider] = (oafProviders[v.provider] || 0) + 1);
  const moonieProviders: Record<string, number> = {};
  moonieTokens.forEach((v) => moonieProviders[v.provider] = (moonieProviders[v.provider] || 0) + 1);

  console.log(`\nProvider Breakdowns:`);
  console.log(`- LastRound AI:`, lrProviders);
  console.log(`- Open ATS Feed:`, oafProviders);
  console.log(`- Moonie:`, moonieProviders);

  // Overlap calculations
  let lrInOaf = 0;
  let lrInMoonie = 0;
  lrTokens.forEach((_, key) => {
    if (oafTokens.has(key)) lrInOaf++;
    if (moonieTokens.has(key)) lrInMoonie++;
  });

  let oafInMoonie = 0;
  oafTokens.forEach((_, key) => {
    if (moonieTokens.has(key)) oafInMoonie++;
  });

  console.log(`\nPairwise Overlaps:`);
  console.log(`- LastRound AI tokens in Open ATS Feed: ${lrInOaf} / ${lrTokens.size} (${((lrInOaf / lrTokens.size) * 100).toFixed(1)}%)`);
  console.log(`- LastRound AI tokens in Moonie: ${lrInMoonie} / ${lrTokens.size} (${((lrInMoonie / lrTokens.size) * 100).toFixed(1)}%)`);
  console.log(`- Moonie tokens in Open ATS Feed: ${oafInMoonie} / ${moonieTokens.size} (${((oafInMoonie / moonieTokens.size) * 100).toFixed(1)}%)`);

  // Three-way union
  const allUnion = new Set<string>();
  lrTokens.forEach((_, k) => allUnion.add(k));
  oafTokens.forEach((_, k) => allUnion.add(k));
  moonieTokens.forEach((_, k) => allUnion.add(k));

  console.log(`\nCombined Metrics:`);
  console.log(`- Total Unique (Provider, Token) Pairs across all 3: ${allUnion.size}`);

  // Breakdown of union by provider
  const unionByProvider: Record<string, number> = {};
  allUnion.forEach((k) => {
    const prov = k.split(":")[0];
    unionByProvider[prov] = (unionByProvider[prov] || 0) + 1;
  });
  console.log(`- Unique Boards by Provider in Union:`, unionByProvider);

  // Check unique additions by each dataset
  let lrOnly = 0;
  let oafOnly = 0;
  let moonieOnly = 0;
  allUnion.forEach((k) => {
    const inLr = lrTokens.has(k);
    const inOaf = oafTokens.has(k);
    const inMoonie = moonieTokens.has(k);
    if (inLr && !inOaf && !inMoonie) lrOnly++;
    if (inOaf && !inLr && !inMoonie) oafOnly++;
    if (inMoonie && !inLr && !inOaf) moonieOnly++;
  });

  console.log(`\nExclusive Contributions (Only present in that source):`);
  console.log(`- LastRound AI exclusive: ${lrOnly}`);
  console.log(`- Open ATS Feed exclusive: ${oafOnly}`);
  console.log(`- Moonie exclusive: ${moonieOnly}`);

  // Status check in Moonie
  let moonieDead = 0;
  let moonieOk = 0;
  moonieTokens.forEach((v) => {
    if (v.status === "dead") moonieDead++;
    if (v.status === "ok") moonieOk++;
  });
  console.log(`\nMoonie Health Status: ${moonieOk} OK, ${moonieDead} Dead, ${moonieTokens.size - moonieOk - moonieDead} other`);
}

main().catch(console.error);

