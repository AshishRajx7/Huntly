export interface ParsedExperience {
  minExperience: number | null;
  maxExperience: number | null;
  classification: "0-1" | "1-2" | "2-3" | "3-5" | "5+" | "entry" | "junior" | "unspecified";
  experienceStated: boolean;
}

export function parseExperience(title: string, description: string): ParsedExperience {
  const combinedText = `${title}\n${description}`.toLowerCase();

  // 1. Check title keywords first
  const lowerTitle = title.toLowerCase();
  if (/\b(entry[- ]?level|new grad|freshers?|graduate engineer|associate engineer)\b/i.test(lowerTitle)) {
    return {
      minExperience: 0,
      maxExperience: 1,
      classification: "entry",
      experienceStated: true,
    };
  }

  if (/\b(junior|jr\.?|sde[- ]?1|sde[- ]?i|swe[- ]?1|swe[- ]?i|software engineer 1|software engineer i)\b/i.test(lowerTitle)) {
    return {
      minExperience: 0,
      maxExperience: 2,
      classification: "junior",
      experienceStated: true,
    };
  }

  // 2. Scan for explicit numeric experience ranges (e.g., "1-3 years", "0-2 yrs", "2 - 4 years")
  const rangeRegex = /(\d+)\s*(?:-|to)\s*(\d+)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s*of)?\s*(?:experience|exp)?/i;
  const rangeMatch = combinedText.match(rangeRegex);

  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);

    return {
      minExperience: min,
      maxExperience: max,
      classification: classifyExperienceRange(min, max),
      experienceStated: true,
    };
  }

  // 3. Scan for "X+ years", "at least X years", "minimum X years", "X years of experience"
  const singleRegex = /(?:at least|minimum|min\.?|have|require[sd]?|with)\s*(\d+)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s*of)?\s*(?:experience|exp)?/i;
  const singleMatch = combinedText.match(singleRegex);

  if (singleMatch) {
    const min = parseInt(singleMatch[1], 10);
    return {
      minExperience: min,
      maxExperience: null,
      classification: classifyExperienceMin(min),
      experienceStated: true,
    };
  }

  const plusRegex = /(\d+)\s*\+\s*(?:years?|yrs?)(?:\s*of)?\s*(?:experience|exp)?/i;
  const plusMatch = combinedText.match(plusRegex);
  if (plusMatch) {
    const min = parseInt(plusMatch[1], 10);
    return {
      minExperience: min,
      maxExperience: null,
      classification: classifyExperienceMin(min),
      experienceStated: true,
    };
  }

  // 4. Check for senior indicators in title if no numbers were stated
  if (/\b(senior|sr\.?|lead|principal|staff|director|head of)\b/i.test(lowerTitle)) {
    return {
      minExperience: 5,
      maxExperience: null,
      classification: "5+",
      experienceStated: true,
    };
  }

  // 5. Default to unspecified
  return {
    minExperience: null,
    maxExperience: null,
    classification: "unspecified",
    experienceStated: false,
  };
}

function classifyExperienceRange(min: number, max: number): ParsedExperience["classification"] {
  if (min <= 1 && max <= 1) return "0-1";
  if (min <= 1 && max <= 2) return "1-2";
  if (min <= 2 && max <= 3) return "2-3";
  if (min >= 3 && max <= 5) return "3-5";
  if (min >= 5) return "5+";
  if (min <= 1) return "0-1";
  if (min <= 2) return "1-2";
  return "3-5";
}

function classifyExperienceMin(min: number): ParsedExperience["classification"] {
  if (min <= 1) return "0-1";
  if (min <= 2) return "1-2";
  if (min === 3) return "2-3";
  if (min <= 5) return "3-5";
  return "5+";
}

