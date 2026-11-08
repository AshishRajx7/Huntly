import { RawAtsJob } from "../ats/types";
import { cleanHtml } from "./html-cleaner";
import { parseSalary } from "./salary-parser";
import { parseExperience } from "./experience-parser";
import { parseRemote } from "./remote-parser";
import { extractSkills } from "./skill-extractor";

export interface NormalizedJob {
  id: string;
  atsProvider: string;
  atsJobId: string;
  companyId: string;
  companyName: string;
  companyWebsite: string | null;
  companyLogo: string | null;
  jobTitle: string;
  originalDescription: string;
  cleanedDescription: string;
  location: string | null;
  isRemote: boolean;
  remoteEligibility: string;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryFrequency: string;
  salaryFormatted: string;
  minExperience: number | null;
  maxExperience: number | null;
  experienceClassification: string;
  experienceStated: boolean;
  extractedSkills: string; // JSON string array
  jobCategory: string;
  applicationUrl: string;
  originalPostingDate: string | null;
  firstDiscoveredDate: string;
  lastSynchronizedDate: string;
  status: "active" | "expired";
}

export function normalizeJob(raw: RawAtsJob, nowIso = new Date().toISOString()): NormalizedJob {
  const cleanedDesc = cleanHtml(raw.rawDescription || "");
  const id = `${raw.atsProvider}_${raw.companyId}_${raw.atsJobId}`;

  // 1. Parse salary
  const salary = parseSalary(raw.rawCompensation, `${raw.jobTitle} ${cleanedDesc} ${raw.location || ""}`);

  // 2. Parse experience (prefers structured metadata, otherwise extracts from description; never infers from title)
  const structuredExp = {
    minExperience:
      raw.structuredMinExperience ??
      (typeof raw.metadata?.minExperience === "number" ? raw.metadata.minExperience : null),
    maxExperience:
      raw.structuredMaxExperience ??
      (typeof raw.metadata?.maxExperience === "number" ? raw.metadata.maxExperience : null),
  };
  const exp = parseExperience(raw.jobTitle, cleanedDesc, structuredExp);

  // 3. Parse remote eligibility
  const remote = parseRemote(raw.jobTitle, raw.location, raw.isRemote, cleanedDesc);

  // 4. Extract skills
  const skillsResult = extractSkills(`${raw.jobTitle}\n${cleanedDesc}`);

  // 5. Categorize job
  const jobCategory = categorizeJob(raw.jobTitle, raw.department);

  return {
    id,
    atsProvider: raw.atsProvider,
    atsJobId: raw.atsJobId,
    companyId: raw.companyId,
    companyName: raw.companyName,
    companyWebsite: raw.companyWebsite || null,
    companyLogo: raw.companyLogo || null,
    jobTitle: raw.jobTitle.trim(),
    originalDescription: raw.rawDescription || "",
    cleanedDescription: cleanedDesc,
    location: raw.location || null,
    isRemote: remote.isRemote,
    remoteEligibility: remote.remoteEligibility,
    employmentType: raw.employmentType || "Full-time",
    salaryMin: salary.salaryMin,
    salaryMax: salary.salaryMax,
    salaryCurrency: salary.salaryCurrency,
    salaryFrequency: salary.salaryFrequency,
    salaryFormatted: salary.salaryFormatted,
    minExperience: exp.minExperience,
    maxExperience: exp.maxExperience,
    experienceClassification: exp.classification,
    experienceStated: exp.experienceStated,
    extractedSkills: JSON.stringify(skillsResult.skills),
    jobCategory,
    applicationUrl: raw.applicationUrl,
    originalPostingDate: raw.originalPostingDate || null,
    firstDiscoveredDate: nowIso,
    lastSynchronizedDate: nowIso,
    status: "active",
  };
}

function categorizeJob(title: string, department?: string): string {
  const lower = `${title} ${department || ""}`.toLowerCase();

  if (/\b(backend|back-end|api|server|microservice|database)\b/i.test(lower)) {
    return "backend";
  }
  if (/\b(fullstack|full-stack|full stack)\b/i.test(lower)) {
    return "fullstack";
  }
  if (/\b(platform|infrastructure|infra|site reliability|sre|systems? engineer)\b/i.test(lower)) {
    return "platform";
  }
  if (/\b(frontend|front-end|ui|web developer|client)\b/i.test(lower)) {
    return "frontend";
  }
  if (/\b(devops|cloud|security)\b/i.test(lower)) {
    return "devops";
  }
  if (/\b(data engineer|machine learning|ml|ai engineer)\b/i.test(lower)) {
    return "data_ml";
  }
  if (/\b(software engineer|software development engineer|sde|swe|developer)\b/i.test(lower)) {
    return "software_engineering";
  }

  return "software_engineering";
}

