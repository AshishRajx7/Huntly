export interface ParsedExperience {
  minExperience: number | null;
  maxExperience: number | null;
  classification: "0-1" | "1-2" | "2-3" | "3-5" | "5+" | "entry" | "junior" | "unspecified";
  experienceStated: boolean;
}

export interface StructuredExperienceInput {
  minExperience?: number | null;
  maxExperience?: number | null;
}

/**
 * Classifies experience into standardized buckets.
 */
export function classifyExperience(
  min: number | null,
  max: number | null
): ParsedExperience["classification"] {
  if (min == null) return "unspecified";

  if (max != null) {
    if (max <= 1) return "0-1";
    if (min <= 1 && max <= 2) return "1-2";
    if (min <= 2 && max <= 3) return "2-3";
    if (min >= 3 && max <= 5) return "3-5";
    if (min >= 5 || max > 5) return "5+";
    if (min <= 2 && max <= 4) return "2-3";
    if (min >= 3) return "3-5";
    if (min >= 2) return "2-3";
    if (min >= 1) return "1-2";
    return "0-1";
  }

  if (min <= 1) return "0-1";
  if (min <= 2) return "1-2";
  if (min === 3) return "2-3";
  if (min < 5) return "3-5";
  return "5+";
}

/**
 * Parses experience requirements from structured metadata or the job description.
 * 
 * Rules:
 * 1. Prefer structured experience metadata when available.
 * 2. If structured metadata is missing, extract requirements from the job description.
 * 3. Never infer experience from job titles.
 * 4. Avoid extracting unrelated numbers (notice periods, salaries, calendar years, tech versions, etc.).
 */
export function parseExperience(
  titleOrDesc: string,
  descOrStructured?: string | StructuredExperienceInput | null,
  maybeStructured?: StructuredExperienceInput | null
): ParsedExperience {
  let description = "";
  let structured: StructuredExperienceInput | null | undefined = null;

  if (typeof descOrStructured === "string") {
    // Called with (title, description, structured)
    description = descOrStructured;
    structured = maybeStructured;
  } else {
    // Called with (description, structured)
    description = titleOrDesc;
    structured = descOrStructured;
  }

  // 1. Prefer structured experience metadata when valid
  if (
    structured &&
    typeof structured.minExperience === "number" &&
    !isNaN(structured.minExperience) &&
    structured.minExperience >= 0 &&
    structured.minExperience < 40
  ) {
    const min = structured.minExperience;
    const max =
      typeof structured.maxExperience === "number" &&
      !isNaN(structured.maxExperience) &&
      structured.maxExperience >= min &&
      structured.maxExperience < 40
        ? structured.maxExperience
        : null;

    return {
      minExperience: min,
      maxExperience: max,
      classification: classifyExperience(min, max),
      experienceStated: true,
    };
  }

  if (!description || typeof description !== "string") {
    return {
      minExperience: null,
      maxExperience: null,
      classification: "unspecified",
      experienceStated: false,
    };
  }

  // 2. Extract experience from description text
  // Normalize dashes (en-dash, em-dash, etc.) to standard ASCII hyphen
  const text = description.replace(/[\u2012\u2013\u2014\u2015]/g, "-");

  // Filter out noise patterns that contain unrelated numbers:
  // - Notice periods (e.g. "30-60 days notice", "1-2 months notice period", "30 days notice")
  // - Degrees (e.g. "4-year degree", "3 year degree")
  // - Weekly onsite requirements (e.g. "2-3 days onsite per week", "3 days a week")
  // - Technology version numbers (e.g. "Python 3.8+", "Java 17", ".NET 8")
  // - Calendar years (e.g. "Founded in 2019", "in 2024")
  const sanitized = text
    .replace(/\b(?:notice\s+period|notice)\s*(?:of\s*)?\d+\s*[-to\s]*\d*\s*(?:days?|months?)\b/gi, "")
    .replace(/\b\d+\s*[-to\s]*\d*\s*(?:days?|months?)\s+(?:of\s+)?notice\b/gi, "")
    .replace(/\b\d+\s*[- ]\s*year\s+(?:degree|bachelor|master|program|curriculum)\b/gi, "")
    .replace(/\b\d+\s*[-to\s]*\d*\s*days?\s+(?:a\s+week|per\s+week|in\s+office|onsite)\b/gi, "")
    .replace(/\b(?:python|java|c#|vue|next(?:\.js)?|node(?:\.js)?|react|angular|go|php|\.net)\s+\d+(?:\.\d+)?(?:\+)?\b/gi, "")
    .replace(/\b(?:founded\s+in|since|established\s+in)\s+(?:19|20)\d{2}\b/gi, "")
    .replace(/\b(?:19|20)\d{2}\b/g, "");

  // A. Numeric range: e.g. "8-10 years", "8 to 10 years", "5-8 years of relevant experience"
  const rangeRegex = /\b(\d+(?:\.\d+)?)\s*(?:-|to|\/)\s*(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s+(?:of\s+)?(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+|industry\s+|prior\s+|software\s+(?:engineering\s+|development\s+)?|technical\s+|backend\s+|frontend\s+|full[- ]stack\s+)?experience)?\b/i;
  const rangeMatch = sanitized.match(rangeRegex);

  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (min < 30 && max < 30 && min <= max) {
      return {
        minExperience: min,
        maxExperience: max,
        classification: classifyExperience(min, max),
        experienceStated: true,
      };
    }
  }

  // B. Prefix format: e.g. "Experience: 8-10 years", "Experience: 8 to 10 years", "Experience: 5+ years"
  const prefixRegex = /\b(?:experience|exp)(?:\s+required)?\s*[:\-]\s*(\d+(?:\.\d+)?)\s*(?:-|to)?\s*(\d+(?:\.\d+)?)?\s*(?:\+)?\s*(?:years?|yrs?)\b/i;
  const prefixMatch = sanitized.match(prefixRegex);

  if (prefixMatch) {
    const min = parseFloat(prefixMatch[1]);
    const max = prefixMatch[2] ? parseFloat(prefixMatch[2]) : null;
    if (min < 30 && (max === null || (max < 30 && min <= max))) {
      return {
        minExperience: min,
        maxExperience: max,
        classification: classifyExperience(min, max),
        experienceStated: true,
      };
    }
  }

  // C. Minimum / At least: e.g. "minimum 8 years", "at least 8 years", "a minimum of 8 years of experience"
  const minRegex = /\b(?:at least|minimum(?:\s+of)?|min\.?|a minimum of)\s+(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s+(?:of\s+)?(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+|industry\s+|prior\s+|software\s+|technical\s+)?experience)?\b/i;
  const minMatch = sanitized.match(minRegex);

  if (minMatch) {
    const min = parseFloat(minMatch[1]);
    if (min < 30) {
      return {
        minExperience: min,
        maxExperience: null,
        classification: classifyExperience(min, null),
        experienceStated: true,
      };
    }
  }

  // D. "X+ years": e.g. "8+ years of experience", "8+ years of relevant experience", "8+ years"
  const plusRegex = /\b(\d+(?:\.\d+)?)\s*\+\s*(?:years?|yrs?)(?:\s+(?:of\s+)?(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+|industry\s+|prior\s+|software\s+|technical\s+)?experience)?\b/i;
  const plusMatch = sanitized.match(plusRegex);

  if (plusMatch) {
    const min = parseFloat(plusMatch[1]);
    if (min < 30) {
      return {
        minExperience: min,
        maxExperience: null,
        classification: classifyExperience(min, null),
        experienceStated: true,
      };
    }
  }

  // E. Requirement verbs: e.g. "require 8 years of experience", "with 8 years of experience"
  const reqRegex = /\b(?:require[sd]?|with|have)\s+(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+|industry\s+|prior\s+|software\s+|technical\s+)?experience\b/i;
  const reqMatch = sanitized.match(reqRegex);

  if (reqMatch) {
    const min = parseFloat(reqMatch[1]);
    if (min < 30) {
      return {
        minExperience: min,
        maxExperience: null,
        classification: classifyExperience(min, null),
        experienceStated: true,
      };
    }
  }

  // F. "X years of experience": e.g. "8 years of relevant experience", "5 years of experience"
  const simpleExpRegex = /\b(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s+of\s+(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+|industry\s+|prior\s+|software\s+(?:engineering\s+|development\s+)?|technical\s+)?experience\b/i;
  const simpleMatch = sanitized.match(simpleExpRegex);

  if (simpleMatch) {
    const min = parseFloat(simpleMatch[1]);
    if (min < 30) {
      return {
        minExperience: min,
        maxExperience: null,
        classification: classifyExperience(min, null),
        experienceStated: true,
      };
    }
  }

  // G. Months Range: e.g. "6-12 months of experience"
  const monthsRangeRegex = /\b(\d+)\s*(?:-|to)\s*(\d+)\s*(?:months?|mos?)(?:\s+(?:of\s+)?(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+)?experience)?\b/i;
  const mRangeMatch = sanitized.match(monthsRangeRegex);

  if (mRangeMatch) {
    const minMonths = parseFloat(mRangeMatch[1]);
    const maxMonths = parseFloat(mRangeMatch[2]);
    const min = Math.round((minMonths / 12) * 10) / 10;
    const max = Math.round((maxMonths / 12) * 10) / 10;
    return {
      minExperience: min,
      maxExperience: max,
      classification: classifyExperience(min, max),
      experienceStated: true,
    };
  }

  // H. Months Single: e.g. "6 months of experience", "at least 6 months of experience"
  const monthsSingleRegex = /\b(?:at least|minimum(?:\s+of)?|min\.?)?\s*(\d+)\s*(?:\+)?\s*(?:months?|mos?)\s+(?:of\s+)?(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+)?experience\b/i;
  const mSingleMatch = sanitized.match(monthsSingleRegex);

  if (mSingleMatch) {
    const months = parseFloat(mSingleMatch[1]);
    const min = Math.round((months / 12) * 10) / 10;
    return {
      minExperience: min,
      maxExperience: null,
      classification: classifyExperience(min, null),
      experienceStated: true,
    };
  }

  // Default: no experience stated in description or structured data
  return {
    minExperience: null,
    maxExperience: null,
    classification: "unspecified",
    experienceStated: false,
  };
}
