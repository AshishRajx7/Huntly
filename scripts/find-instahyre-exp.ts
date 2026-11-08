import { db, initDb } from "../src/lib/db";
import { jobs } from "../src/lib/db/schema";
import { like } from "drizzle-orm";

initDb();

const instahyreJobs = db
  .select()
  .from(jobs)
  .where(like(jobs.applicationUrl, "%instahyre%"))
  .all();

console.log(`Checking ${instahyreJobs.length} Instahyre jobs for experience mentions in text vs DB classification:`);
for (const j of instahyreJobs) {
  const text = (j.cleanedDescription || "").toLowerCase();
  // regex for any digit + year or exp
  const matches = text.match(/(\d+[\s–\-\+to]+\d*\s*(?:years?|yrs?)(?:\s*of)?\s*(?:experience|exp)?)/gi) || [];
  const hasExpWord = text.includes("experience") || text.includes("years");
  
  if (matches.length > 0 || j.experienceClassification === "unspecified") {
    console.log(`\n[${j.id}] ${j.companyName} - ${j.jobTitle}`);
    console.log(`  Stored in DB: min=${j.minExperience}, max=${j.maxExperience}, class=${j.experienceClassification}, stated=${j.experienceStated}`);
    console.log(`  Found regex matches in text:`, matches);
    if (matches.length === 0 && hasExpWord) {
      // Find sentences containing experience or years
      const sentences = text.split(/\n|\./).filter(s => s.includes("year") || s.includes("exp"));
      console.log(`  Sentences with year/exp:`, sentences.slice(0, 3));
    }
  }
}

