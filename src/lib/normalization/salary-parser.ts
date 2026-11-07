export interface ParsedSalary {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryFrequency: "annual" | "monthly" | "hourly";
  salaryFormatted: string;
}

export function parseSalary(
  rawComp?: {
    min?: number;
    max?: number;
    currency?: string;
    interval?: string;
    summary?: string;
  },
  textToScan?: string
): ParsedSalary {
  // 1. Check if structured compensation is provided
  if (rawComp && (rawComp.min != null || rawComp.max != null)) {
    const currency = (rawComp.currency || "USD").toUpperCase();
    const intervalRaw = (rawComp.interval || "year").toLowerCase();
    
    let frequency: "annual" | "monthly" | "hourly" = "annual";
    let multiplier = 1;

    if (intervalRaw.includes("month")) {
      frequency = "monthly";
      multiplier = 12; // normalize for comparison while keeping original context
    } else if (intervalRaw.includes("hour")) {
      frequency = "hourly";
    }

    const min = rawComp.min != null ? Math.round(rawComp.min * (frequency === "monthly" ? multiplier : 1)) : null;
    const max = rawComp.max != null ? Math.round(rawComp.max * (frequency === "monthly" ? multiplier : 1)) : null;

    let formatted = "";
    const sym = getCurrencySymbol(currency);
    if (min != null && max != null) {
      formatted = `${sym}${formatNum(min)} - ${sym}${formatNum(max)} / yr`;
    } else if (min != null) {
      formatted = `${sym}${formatNum(min)}+ / yr`;
    } else if (max != null) {
      formatted = `Up to ${sym}${formatNum(max)} / yr`;
    }

    return {
      salaryMin: min,
      salaryMax: max,
      salaryCurrency: currency,
      salaryFrequency: "annual",
      salaryFormatted: formatted || rawComp.summary || "Not disclosed",
    };
  }

  // If summary string is available in rawComp
  if (rawComp?.summary) {
    const fromSummary = parseSalaryFromText(rawComp.summary);
    if (fromSummary.salaryMin != null || fromSummary.salaryMax != null) {
      return fromSummary;
    }
  }

  // 2. Scan text if provided
  if (textToScan) {
    const fromText = parseSalaryFromText(textToScan);
    if (fromText.salaryMin != null || fromText.salaryMax != null) {
      return fromText;
    }
  }

  return {
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryFrequency: "annual",
    salaryFormatted: "Not disclosed",
  };
}

export function parseSalaryFromText(text: string): ParsedSalary {
  if (!text) {
    return {
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryFrequency: "annual",
      salaryFormatted: "Not disclosed",
    };
  }

  // 1. Look for Indian Rupee LPA (Lakhs Per Annum) patterns: e.g. "15-25 LPA", "12 to 18 Lakhs", "₹15,00,000 - ₹25,00,000"
  // e.g. "15 - 25 LPA" or "15 LPA" or "15-25 Lakh"
  const lpaRegex = /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?|lac|lacs)/i;
  const singleLpaRegex = /(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?|lac|lacs)/i;

  const lpaMatch = text.match(lpaRegex);
  if (lpaMatch) {
    const minLacs = parseFloat(lpaMatch[1]);
    const maxLacs = parseFloat(lpaMatch[2]);
    const minInr = Math.round(minLacs * 100000);
    const maxInr = Math.round(maxLacs * 100000);
    return {
      salaryMin: minInr,
      salaryMax: maxInr,
      salaryCurrency: "INR",
      salaryFrequency: "annual",
      salaryFormatted: `₹${minLacs} - ₹${maxLacs} LPA`,
    };
  }

  const singleLpaMatch = text.match(singleLpaRegex);
  if (singleLpaMatch) {
    const lacs = parseFloat(singleLpaMatch[1]);
    const inr = Math.round(lacs * 100000);
    return {
      salaryMin: inr,
      salaryMax: inr,
      salaryCurrency: "INR",
      salaryFrequency: "annual",
      salaryFormatted: `₹${lacs} LPA`,
    };
  }

  // 2. Look for ₹ amounts like ₹12,00,000 - ₹18,00,000
  const inrRangeRegex = /₹\s*(\d[\d,]+)\s*(?:-|to)\s*₹?\s*(\d[\d,]+)/i;
  const inrRangeMatch = text.match(inrRangeRegex);
  if (inrRangeMatch) {
    const minVal = parseInt(inrRangeMatch[1].replace(/,/g, ""), 10);
    const maxVal = parseInt(inrRangeMatch[2].replace(/,/g, ""), 10);
    const isMonthly = /month|\/mo/i.test(text.substring(inrRangeMatch.index || 0, (inrRangeMatch.index || 0) + 50));
    const multiplier = isMonthly ? 12 : 1;
    const finalMin = minVal * multiplier;
    const finalMax = maxVal * multiplier;
    return {
      salaryMin: finalMin,
      salaryMax: finalMax,
      salaryCurrency: "INR",
      salaryFrequency: "annual",
      salaryFormatted: `₹${(finalMin / 100000).toFixed(1)} - ₹${(finalMax / 100000).toFixed(1)} LPA`,
    };
  }

  // 3. Look for USD range: e.g. "$120,000 - $160,000" or "$120k - $160k" or "$50,000/year"
  const usdKRangeRegex = /\$\s*(\d+(?:\.\d+)?)\s*k\s*(?:-|to)\s*\$?\s*(\d+(?:\.\d+)?)\s*k/i;
  const usdKRangeMatch = text.match(usdKRangeRegex);
  if (usdKRangeMatch) {
    const min = Math.round(parseFloat(usdKRangeMatch[1]) * 1000);
    const max = Math.round(parseFloat(usdKRangeMatch[2]) * 1000);
    return {
      salaryMin: min,
      salaryMax: max,
      salaryCurrency: "USD",
      salaryFrequency: "annual",
      salaryFormatted: `$${usdKRangeMatch[1]}k - $${usdKRangeMatch[2]}k / yr`,
    };
  }

  const usdFullRangeRegex = /\$\s*(\d{2,3}(?:,\d{3})+)\s*(?:-|to)\s*\$?\s*(\d{2,3}(?:,\d{3})+)/i;
  const usdFullRangeMatch = text.match(usdFullRangeRegex);
  if (usdFullRangeMatch) {
    const min = parseInt(usdFullRangeMatch[1].replace(/,/g, ""), 10);
    const max = parseInt(usdFullRangeMatch[2].replace(/,/g, ""), 10);
    return {
      salaryMin: min,
      salaryMax: max,
      salaryCurrency: "USD",
      salaryFrequency: "annual",
      salaryFormatted: `$${formatNum(min)} - $${formatNum(max)} / yr`,
    };
  }

  // 4. Look for EUR / GBP ranges (€ or £)
  const eurGbpRangeRegex = /([€£])\s*(\d+(?:\.\d+)?)\s*k?\s*(?:-|to)\s*[€£]?\s*(\d+(?:\.\d+)?)\s*k?/i;
  const eurGbpMatch = text.match(eurGbpRangeRegex);
  if (eurGbpMatch) {
    const sym = eurGbpMatch[1];
    const curr = sym === "€" ? "EUR" : "GBP";
    let min = parseFloat(eurGbpMatch[2]);
    let max = parseFloat(eurGbpMatch[3]);
    if (min < 1000) min *= 1000;
    if (max < 1000) max *= 1000;
    return {
      salaryMin: Math.round(min),
      salaryMax: Math.round(max),
      salaryCurrency: curr,
      salaryFrequency: "annual",
      salaryFormatted: `${sym}${formatNum(min)} - ${sym}${formatNum(max)} / yr`,
    };
  }

  return {
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryFrequency: "annual",
    salaryFormatted: "Not disclosed",
  };
}

function getCurrencySymbol(curr: string): string {
  switch (curr) {
    case "USD":
      return "$";
    case "INR":
      return "₹";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "CAD":
      return "CA$";
    case "AUD":
      return "AU$";
    default:
      return `${curr} `;
  }
}

function formatNum(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${Math.round(num / 1000)}k`;
  }
  return num.toLocaleString();
}

