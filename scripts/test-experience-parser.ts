import { db, initDb } from "../src/lib/db";
import { jobs } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

initDb();

// Load all jobs from DB
const allJobs = db
  .select({
    id: jobs.id,
    ats: jobs.atsProvider,
    company: jobs.companyName,
    title: jobs.jobTitle,
    url: jobs.applicationUrl,
    currentMin: jobs.minExperience,
    currentMax: jobs.maxExperience,
    currentClass: jobs.experienceClassification,
    currentStated: jobs.experienceStated,
    desc: jobs.cleanedDescription,
  })
  .from(jobs)
  .all();

console.log(`Loaded ${allJobs.length} jobs.`);

// Let's test candidate extraction logic on all jobs:
function testExtract(desc: string) {
  if (!desc) return null;
  const text = desc;

  // Clean / normalize dashes and whitespace
  // Replace en-dash, em-dash with standard hyphen
  const normalized = text.replace(/[\u2012\u2013\u2014\u2015]/g, "-");

  // Filter out notice period clauses so they don't match
  // e.g. "30-60 days notice", "1-2 months notice period"
  const cleanedForExp = normalized.replace(
    /\b\d+\s*-\s*\d+\s*(?:days?|months?)\s+(?:of\s+)?notice\b/gi,
    ""
  ).replace(
    /\b(?:notice\s+period|notice)\s*(?:of\s*)?\d+\s*-\s*\d+\s*(?:days?|months?)\b/gi,
    ""
  ).replace(
    /\b\d+\s*[- ]\s*year\s+(?:degree|bachelor|program)\b/gi,
    ""
  );

  // 1. Range: e.g. "8-10 years", "8 to 10 years", "8-10 yrs", "5-8 years of relevant experience"
  // Look for: (\d+)\s*(?:-|to)\s*(\d+)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s+(?:of\s+)?(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+|industry\s+|prior\s+|software\s+|technical\s+)?experience)?
  const rangeRegex = /\b(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s+(?:of\s+)?(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+|industry\s+|prior\s+|software\s+(?:engineering\s+|development\s+)?|technical\s+|backend\s+|frontend\s+|full[- ]stack\s+)?experience)?/i;
  const rangeMatch = cleanedForExp.match(rangeRegex);

  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (min < 30 && max < 30 && min <= max) {
      return { min, max, type: "range", match: rangeMatch[0] };
    }
  }

  // 2. Prefix format: "Experience: 8-10 years", "Experience: 8 to 10 years", "Experience: 5+ years"
  const prefixRegex = /\b(?:experience|exp)(?:\s+required)?\s*[:\-]\s*(\d+(?:\.\d+)?)\s*(?:-|to)?\s*(\d+(?:\.\d+)?)?\s*(?:\+)?\s*(?:years?|yrs?)/i;
  const prefixMatch = cleanedForExp.match(prefixRegex);
  if (prefixMatch) {
    const min = parseFloat(prefixMatch[1]);
    const max = prefixMatch[2] ? parseFloat(prefixMatch[2]) : null;
    if (min < 30 && (max === null || (max < 30 && min <= max))) {
      return { min, max, type: "prefix", match: prefixMatch[0] };
    }
  }

  // 3. Minimum / at least: "minimum 8 years", "at least 8 years", "a minimum of 8 years of experience"
  const minRegex = /\b(?:at least|minimum(?:\s+of)?|min\.?|a minimum of)\s+(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s+(?:of\s+)?(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+|industry\s+|prior\s+|software\s+|technical\s+)?experience)?/i;
  const minMatch = cleanedForExp.match(minRegex);
  if (minMatch) {
    const min = parseFloat(minMatch[1]);
    if (min < 30) {
      return { min, max: null, type: "min_prefix", match: minMatch[0] };
    }
  }

  // 4. "X+ years": "8+ years of experience", "8+ years of relevant experience"
  const plusRegex = /\b(\d+(?:\.\d+)?)\s*\+\s*(?:years?|yrs?)(?:\s+(?:of\s+)?(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+|industry\s+|prior\s+|software\s+|technical\s+)?experience)?/i;
  const plusMatch = cleanedForExp.match(plusRegex);
  if (plusMatch) {
    const min = parseFloat(plusMatch[1]);
    if (min < 30) {
      return { min, max: null, type: "plus", match: plusMatch[0] };
    }
  }

  // 5. "X years of experience": e.g. "8 years of relevant experience", "5 years of experience"
  const simpleExpRegex = /\b(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s+of\s+(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+|industry\s+|prior\s+|software\s+(?:engineering\s+|development\s+)?|technical\s+)?experience\b/i;
  const simpleMatch = cleanedForExp.match(simpleExpRegex);
  if (simpleMatch) {
    const min = parseFloat(simpleMatch[1]);
    if (min < 30) {
      return { min, max: null, type: "simple_exp", match: simpleMatch[0] };
    }
  }

  // 6. Months: "6-12 months of experience", "6 months of experience", "6+ months of experience"
  const monthsRangeRegex = /\b(\d+)\s*(?:-|to)\s*(\d+)\s*(?:months?|mos?)(?:\s+(?:of\s+)?(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+)?experience)?/i;
  const mRangeMatch = cleanedForExp.match(monthsRangeRegex);
  if (mRangeMatch) {
    const min = parseFloat(mRangeMatch[1]) / 12;
    const max = parseFloat(mRangeMatch[2]) / 12;
    return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10, type: "months_range", match: mRangeMatch[0] };
  }

  const monthsSingleRegex = /\b(?:at least|minimum(?:\s+of)?|min\.?)?\s*(\d+)\s*(?:\+)?\s*(?:months?|mos?)\s+(?:of\s+)?(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+)?experience\b/i;
  const mSingleMatch = cleanedForExp.match(monthsSingleRegex);
  if (mSingleMatch) {
    const min = parseFloat(mSingleMatch[1]) / 12;
    return { min: Math.round(min * 10) / 10, max: null, type: "months_single", match: mSingleMatch[0] };
  }

  return null;
}

let recoveredFromUnspecified = 0;
let totalMatchesFound = 0;
const samples: any[] = [];

for (const j of allJobs) {
  const result = testExtract(j.desc);
  if (result) {
    totalMatchesFound++;
    if (j.currentClass === "unspecified") {
      recoveredFromUnspecified++;
      if (samples.length < 10) {
        samples.push({
          company: j.company,
          title: j.title,
          ats: j.ats,
          extracted: result,
          descSnippet: j.desc.slice(0, 250),
        });
      }
    }
  }
}

console.log(`\nAnalysis results across ${allJobs.length} jobs:`);
console.log(`- Total jobs where experience was detected in description: ${totalMatchesFound}`);
console.log(`- Currently 'unspecified' jobs that can be RECOVERED: ${recoveredFromUnspecified}`);

console.log("\nSample recovered jobs:");
for (const s of samples) {
  console.log(`\n[${s.ats}] ${s.company} - ${s.title}`);
  console.log(`Extracted: min=${s.extracted.min}, max=${s.extracted.max} (${s.extracted.type}: "${s.extracted.match}")`);
  console.log(`Desc: ${s.descSnippet.replace(/\n+/g, " ")}`);
}

