export type RemoteEligibility =
  | "worldwide"
  | "india"
  | "apac"
  | "us_only"
  | "eu_only"
  | "restricted"
  | "hybrid"
  | "onsite"
  | "unknown";

export interface ParsedRemote {
  isRemote: boolean;
  remoteEligibility: RemoteEligibility;
}

export function parseRemote(
  title: string,
  location?: string,
  atsIsRemote?: boolean,
  description?: string
): ParsedRemote {
  const loc = (location || "").toLowerCase();
  const tit = title.toLowerCase();
  const desc = (description || "").substring(0, 2000).toLowerCase(); // Check first 2k chars for location clauses

  // 1. Check for Hybrid
  if (loc.includes("hybrid") || tit.includes("hybrid") || desc.includes("hybrid work") || desc.includes("days in office")) {
    return {
      isRemote: false,
      remoteEligibility: "hybrid",
    };
  }

  // 2. Check if remote is indicated in location, title, atsIsRemote flag, or workplace
  const remoteKeywords = ["remote", "work from home", "wfh", "anywhere", "distributed", "telecommute"];
  const hasRemoteKeyword = remoteKeywords.some(
    (kw) => loc.includes(kw) || tit.includes(kw)
  ) || atsIsRemote === true;

  if (!hasRemoteKeyword) {
    if (loc.length > 0) {
      return {
        isRemote: false,
        remoteEligibility: "onsite",
      };
    }
    return {
      isRemote: false,
      remoteEligibility: "unknown",
    };
  }

  // At this point, the role IS remote. Now determine geographic eligibility.
  const combined = `${loc} ${tit}`;

  // 3. Explicit Worldwide / Global / Anywhere
  if (
    combined.includes("worldwide") ||
    combined.includes("anywhere") ||
    combined.includes("global") ||
    combined.includes("work from anywhere") ||
    desc.includes("work from anywhere in the world") ||
    desc.includes("anywhere in the world") ||
    desc.includes("globally distributed") && !combined.includes("us only")
  ) {
    // Double check it doesn't also say "US only" or similar
    if (!combined.includes("us only") && !combined.includes("us, canada") && !combined.includes("usa only")) {
      return {
        isRemote: true,
        remoteEligibility: "worldwide",
      };
    }
  }

  // 4. India Remote
  if (
    combined.includes("india") ||
    combined.includes("bangalore") ||
    combined.includes("bengaluru") ||
    combined.includes("delhi") ||
    combined.includes("gurgaon") ||
    combined.includes("gurugram") ||
    combined.includes("hyderabad") ||
    combined.includes("mumbai") ||
    combined.includes("pune") ||
    combined.includes("noida") ||
    loc.includes("remote - in") ||
    loc.includes("remote, in")
  ) {
    return {
      isRemote: true,
      remoteEligibility: "india",
    };
  }

  // 5. US Only Remote (CRITICAL: never allow US-only to be marked worldwide)
  const usIndicators = [
    "us only",
    "usa only",
    "united states",
    "u.s.",
    "remote - us",
    "remote, us",
    "remote (us)",
    "remote (usa)",
    "remote - usa",
    "remote, usa",
    "north america",
    "san francisco",
    "new york",
    "austin",
    "seattle",
    "california",
    "chicago",
  ];

  if (usIndicators.some((kw) => combined.includes(kw))) {
    return {
      isRemote: true,
      remoteEligibility: "us_only",
    };
  }

  // Also check if location is just a US state abbreviation (e.g., "Remote, CA", "Remote, NY")
  if (/remote[,\s-]+(?:al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b/i.test(combined)) {
    return {
      isRemote: true,
      remoteEligibility: "us_only",
    };
  }

  // 6. Europe / UK
  if (
    combined.includes("europe") ||
    combined.includes("emea") ||
    combined.includes("united kingdom") ||
    combined.includes("uk") ||
    combined.includes("germany") ||
    combined.includes("london") ||
    combined.includes("berlin") ||
    combined.includes("france") ||
    combined.includes("paris") ||
    combined.includes("netherlands") ||
    combined.includes("amsterdam")
  ) {
    return {
      isRemote: true,
      remoteEligibility: "eu_only",
    };
  }

  // 7. APAC / Asia
  if (
    combined.includes("apac") ||
    combined.includes("asia") ||
    combined.includes("singapore") ||
    combined.includes("japan") ||
    combined.includes("australia") ||
    combined.includes("sydney")
  ) {
    return {
      isRemote: true,
      remoteEligibility: "apac",
    };
  }

  // 8. Other country restricted (Canada, Brazil, LATAM, etc.)
  if (
    combined.includes("canada") ||
    combined.includes("brazil") ||
    combined.includes("latam") ||
    combined.includes("latin america") ||
    combined.includes("mexico") ||
    combined.includes("poland") ||
    combined.includes("spain")
  ) {
    return {
      isRemote: true,
      remoteEligibility: "restricted",
    };
  }

  // 9. If simply labeled "Remote" with no geographic constraint discernible
  // Because we must never falsely promise worldwide when it might be US-only, check description for US work authorization clauses
  if (
    desc.includes("authorized to work in the united states") ||
    desc.includes("authorized to work in the us") ||
    desc.includes("us work authorization") ||
    desc.includes("u.s. citizen")
  ) {
    return {
      isRemote: true,
      remoteEligibility: "us_only",
    };
  }

  // If completely generic "Remote" without country qualifier
  return {
    isRemote: true,
    remoteEligibility: "restricted", // safe default rather than wrongly guessing worldwide
  };
}

