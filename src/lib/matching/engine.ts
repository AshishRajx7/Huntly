import { Job } from "../db/schema";
import { PRIMARY_SKILLS, ADDITIONAL_SKILLS } from "../normalization/skill-extractor";

export interface MatchEvaluation {
  matchScore: number; // 0 to 100
  matchExplanation: string;
  matchReasons: string[];
  matchedSkills: string[];
  missingSkills: string[];
  isEarlyCareer: boolean;
  roleRelevanceScore: number;
  techSkillsScore: number;
  experienceScore: number;
  locationScore: number;
  salaryScore: number;
}

export function evaluateJobMatch(job: {
  jobTitle: string;
  cleanedDescription: string;
  location?: string | null;
  isRemote?: boolean;
  remoteEligibility?: string | null;
  experienceClassification?: string | null;
  minExperience?: number | null;
  maxExperience?: number | null;
  experienceStated?: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  extractedSkills?: string | null; // JSON string array
}): MatchEvaluation {
  const title = job.jobTitle.toLowerCase();
  const desc = (job.cleanedDescription || "").toLowerCase();
  const extractedSkills: string[] = job.extractedSkills ? JSON.parse(job.extractedSkills) : [];

  // ==========================================
  // 1. HARD EXCLUSION CHECK
  // ==========================================
  const isSenior = /\b(senior|sr\.?|lead|principal|staff|director|head of|vp|architect)\b/i.test(title);
  const isIntern = /\b(intern|internship|co-op)\b/i.test(title);
  const isFrontendOnly = /\b(frontend|front-end|ui engineer|ui developer)\b/i.test(title) && !title.includes("full");
  const isDevOpsOnly = /\b(devops|site reliability|sre|cloud engineer)\b/i.test(title) && !title.includes("platform");
  const isDataAnalyst = /\b(data analyst|business analyst|bi analyst)\b/i.test(title);

  // Experience hard check: explicit 4+ or 5+ years
  const explicitTooHighExp = (job.minExperience != null && job.minExperience >= 4) || job.experienceClassification === "5+";

  // Restricted remote check
  const isUsOnly = job.remoteEligibility === "us_only";
  const isEuOnly = job.remoteEligibility === "eu_only";
  const isRestrictedNonIndia = job.remoteEligibility === "restricted";

  // ==========================================
  // 2. ROLE RELEVANCE SCORING (0 to 100)
  // ==========================================
  let roleScore = 50;
  const matchReasons: string[] = [];

  const primaryRolePatterns = [
    /\b(sde[- ]?1|sde[- ]?i|swe[- ]?1|swe[- ]?i|software development engineer 1|software development engineer i)\b/i,
    /\b(backend engineer|back-end engineer|backend developer|back-end developer)\b/i,
    /\b(software engineer|software developer)\b/i,
  ];

  const secondaryRolePatterns = [
    /\b(platform engineer)\b/i,
    /\b(full[- ]?stack engineer|full[- ]?stack developer)\b/i,
    /\b(founding engineer)\b/i,
    /\b(infrastructure engineer)\b/i,
    /\b(junior software engineer|junior backend)\b/i,
  ];

  if (primaryRolePatterns[0].test(title)) {
    roleScore = 100;
    matchReasons.push("High priority role: SDE 1 / Entry Level");
  } else if (primaryRolePatterns[1].test(title)) {
    roleScore = 95;
    matchReasons.push("High priority role: Backend Engineer");
  } else if (primaryRolePatterns[2].test(title)) {
    roleScore = 85;
    matchReasons.push("Core target role: Software Engineer");
  } else if (secondaryRolePatterns.some((pattern) => pattern.test(title))) {
    roleScore = 75;
    matchReasons.push("Relevant role: Platform / Full Stack / Founding");
  } else if (isFrontendOnly || isDevOpsOnly || isDataAnalyst) {
    roleScore = 15;
  } else {
    roleScore = 40;
  }

  // ==========================================
  // 3. TECHNICAL SKILLS SCORING (0 to 100)
  // ==========================================
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  const matchedPrimary = PRIMARY_SKILLS.filter((skill) =>
    extractedSkills.includes(skill) || new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i").test(desc)
  );

  const matchedAdditional = ADDITIONAL_SKILLS.filter((skill) =>
    extractedSkills.includes(skill) || new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i").test(desc)
  );

  matchedSkills.push(...Array.from(new Set([...matchedPrimary, ...matchedAdditional])));

  for (const skill of PRIMARY_SKILLS) {
    if (!matchedSkills.includes(skill)) {
      missingSkills.push(skill);
    }
  }

  // Primary skills are worth 12 points each (up to 80), additional skills worth 4 points each (up to 20)
  const primaryScorePart = Math.min(80, matchedPrimary.length * 12);
  const additionalScorePart = Math.min(20, matchedAdditional.length * 4);
  const techScore = Math.min(100, primaryScorePart + additionalScorePart);

  if (matchedPrimary.length >= 3) {
    matchReasons.push(`Strong tech stack overlap (${matchedPrimary.slice(0, 3).join(", ")})`);
  } else if (matchedPrimary.length > 0) {
    matchReasons.push(`Matches core skills (${matchedPrimary.join(", ")})`);
  }

  // ==========================================
  // 4. EXPERIENCE FIT SCORING (0 to 100)
  // ==========================================
  let expScore = 70; // default for unspecified
  let isEarlyCareer = false;

  const classification = job.experienceClassification || "unspecified";
  const minExp = job.minExperience;

  if (classification === "entry" || classification === "0-1" || (minExp != null && minExp <= 1)) {
    expScore = 100;
    isEarlyCareer = true;
    matchReasons.push("Perfect experience fit: 0–1 years (Early Career)");
  } else if (classification === "1-2" || classification === "junior" || (minExp != null && minExp === 1)) {
    expScore = 90;
    isEarlyCareer = true;
    matchReasons.push("Great experience fit: 1–2 years");
  } else if (classification === "2-3" || (minExp != null && minExp === 2)) {
    expScore = 55;
    matchReasons.push("Moderate experience fit: 2–3 years");
  } else if (classification === "unspecified") {
    expScore = 70;
    isEarlyCareer = true; // unspecified positions are open to early career
    matchReasons.push("Experience requirement unspecified (Open opportunity)");
  } else if (classification === "3-5" || (minExp != null && minExp === 3)) {
    expScore = 20;
  } else {
    expScore = 0;
  }

  // ==========================================
  // 5. LOCATION FIT SCORING (0 to 100)
  // ==========================================
  let locScore = 40;
  const remoteElig = job.remoteEligibility || "unknown";
  const loc = (job.location || "").toLowerCase();

  if (remoteElig === "worldwide") {
    locScore = 100;
    matchReasons.push("Worldwide remote opportunity");
  } else if (remoteElig === "india") {
    locScore = 100;
    matchReasons.push("India remote opportunity");
  } else if (loc.includes("bangalore") || loc.includes("bengaluru")) {
    locScore = 95;
    matchReasons.push("Bangalore local opportunity");
  } else if (loc.includes("india") || loc.includes("delhi") || loc.includes("mumbai") || loc.includes("pune") || loc.includes("hyderabad")) {
    locScore = 75;
    matchReasons.push("India location");
  } else if (remoteElig === "hybrid" && (loc.includes("bangalore") || loc.includes("bengaluru"))) {
    locScore = 90;
    matchReasons.push("Bangalore hybrid role");
  } else if (isUsOnly || isEuOnly || isRestrictedNonIndia) {
    locScore = 0; // Exclude restricted foreign remote
  } else if (job.isRemote) {
    locScore = 50;
  } else {
    locScore = 30;
  }

  // ==========================================
  // 6. SALARY FIT SCORING (0 to 100)
  // ==========================================
  let salScore = 70; // baseline for undisclosed compensation (never penalize missing salary)

  if (job.salaryCurrency === "INR") {
    const minLpa = (job.salaryMin || 0) / 100000;
    if (minLpa >= 15) {
      salScore = 100;
      matchReasons.push(`Target salary met (₹${minLpa.toFixed(0)}+ LPA)`);
    } else if (minLpa >= 10) {
      salScore = 80;
      matchReasons.push(`Acceptable salary (₹${minLpa.toFixed(0)}+ LPA)`);
    } else if (job.salaryMin != null) {
      salScore = 30;
    }
  } else if (job.salaryCurrency === "USD") {
    const minUsd = job.salaryMin || 0;
    if (minUsd >= 40000) {
      salScore = 100;
      matchReasons.push(`Target international salary met ($${Math.round(minUsd / 1000)}k+)`);
    } else if (job.salaryMin != null) {
      salScore = 35;
    }
  } else if (job.salaryMin != null) {
    salScore = 80;
  }

  // ==========================================
  // 7. OVERALL MATCH SCORE CALCULATION
  // Weighted:
  // Role: 25%, Skills: 25%, Experience: 25%, Location: 15%, Salary: 10%
  // ==========================================
  let finalScore = Math.round(
    roleScore * 0.25 +
    techScore * 0.25 +
    expScore * 0.25 +
    locScore * 0.15 +
    salScore * 0.10
  );

  // Apply hard penalties
  if (isSenior) {
    finalScore = Math.min(finalScore, 15);
    matchReasons.unshift("Demoted: Senior/Staff/Lead level position");
  }
  if (isIntern) {
    finalScore = 0;
    matchReasons.unshift("Excluded: Internship position");
  }
  if (explicitTooHighExp) {
    finalScore = Math.min(finalScore, 20);
    matchReasons.unshift("Demoted: Requires 4+ years experience");
  }
  if (isUsOnly || isEuOnly) {
    finalScore = Math.min(finalScore, 10);
    matchReasons.unshift("Demoted: Geographic remote restrictions (US/EU only)");
  }

  finalScore = Math.max(0, Math.min(100, finalScore));

  // Build natural explanation
  let matchExplanation = "";
  if (finalScore >= 80) {
    matchExplanation = `High affinity match (${finalScore}%). Aligns with your early career profile as a ${job.jobTitle}. Matches key skills (${matchedSkills.slice(0, 4).join(", ")}).`;
  } else if (finalScore >= 60) {
    matchExplanation = `Good match (${finalScore}%). Relevant engineering role with ${matchedSkills.length > 0 ? matchedSkills.slice(0, 3).join(", ") : "general software"} stack.`;
  } else if (finalScore >= 40) {
    matchExplanation = `Potential match (${finalScore}%). Role overlaps partially with your target stack or experience range.`;
  } else {
    matchExplanation = `Low match (${finalScore}%). Role does not closely align with target experience level, technologies, or location.`;
  }

  return {
    matchScore: finalScore,
    matchExplanation,
    matchReasons,
    matchedSkills,
    missingSkills,
    isEarlyCareer,
    roleRelevanceScore: roleScore,
    techSkillsScore: techScore,
    experienceScore: expScore,
    locationScore: locScore,
    salaryScore: salScore,
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

