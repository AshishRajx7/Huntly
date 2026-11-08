import { initDb, db } from "../src/lib/db";
import { jobs } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseExperience } from "../src/lib/normalization/experience-parser";

async function main() {
  console.log("==========================================");
  console.log("Huntly Experience Recovery & Backfill");
  console.log("==========================================");

  initDb();

  const allJobs = db
    .select({
      id: jobs.id,
      atsProvider: jobs.atsProvider,
      company: jobs.companyName,
      title: jobs.jobTitle,
      url: jobs.applicationUrl,
      minExp: jobs.minExperience,
      maxExp: jobs.maxExperience,
      classification: jobs.experienceClassification,
      stated: jobs.experienceStated,
      desc: jobs.cleanedDescription,
    })
    .from(jobs)
    .all();

  console.log(`Total jobs in database: ${allJobs.length}`);

  let recoveredCount = 0;
  const breakdown: Record<string, number> = {};
  const recoveredSamples: Array<{
    company: string;
    title: string;
    ats: string;
    oldExp: string;
    newExp: string;
    min: number | null;
    max: number | null;
  }> = [];

  for (const j of allJobs) {
    // Only recover if currently unspecified or no experience stated
    if (j.classification === "unspecified" || !j.stated || j.minExp == null) {
      const parsed = parseExperience(j.desc || "");

      if (parsed.experienceStated && parsed.minExperience != null) {
        db.update(jobs)
          .set({
            minExperience: parsed.minExperience,
            maxExperience: parsed.maxExperience,
            experienceClassification: parsed.classification,
            experienceStated: true,
          })
          .where(eq(jobs.id, j.id))
          .run();

        recoveredCount++;
        breakdown[parsed.classification] = (breakdown[parsed.classification] || 0) + 1;

        if (recoveredSamples.length < 10) {
          recoveredSamples.push({
            company: j.company,
            title: j.title,
            ats: j.atsProvider,
            oldExp: `${j.classification} (stated=${j.stated})`,
            newExp: parsed.classification,
            min: parsed.minExperience,
            max: parsed.maxExperience,
          });
        }
      }
    }
  }

  console.log(`\nRecovery Completed:`);
  console.log(`- Successfully recovered experience for ${recoveredCount} existing jobs!`);
  console.log("\nClassification breakdown of recovered jobs:");
  console.table(breakdown);

  console.log("\nSample recovered jobs:");
  for (const s of recoveredSamples) {
    const rangeStr = s.max != null ? `${s.min}-${s.max} yrs` : `${s.min}+ yrs`;
    console.log(`- [${s.ats}] ${s.company} | ${s.title}: was "${s.oldExp}" -> now "${s.newExp}" (${rangeStr})`);
  }

  console.log("\n==========================================");
  console.log("Experience Recovery Finished");
  console.log("==========================================");
}

main().catch((err) => {
  console.error("Recovery failed:", err);
  process.exit(1);
});

