import { db, initDb } from "../src/lib/db";
import { jobs } from "../src/lib/db/schema";
import { eq, or, like, and } from "drizzle-orm";

initDb();

console.log("=== Checking Instahyre jobs ===");
const instahyreJobs = db
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
  .where(like(jobs.applicationUrl, "%instahyre%"))
  .limit(5)
  .all();

console.log("Instahyre jobs found:", instahyreJobs.length);
for (const j of instahyreJobs) {
  console.log(`\nTitle: ${j.title} | Company: ${j.company}`);
  console.log(`URL: ${j.url}`);
  console.log(`Exp: min=${j.minExp}, max=${j.maxExp}, class=${j.classification}, stated=${j.stated}`);
  console.log(`Desc snippet (first 400 chars):\n${j.desc?.slice(0, 400)}`);
}

console.log("\n=== Checking Freehire jobs with unspecified experience ===");
const unspecifiedFreehire = db
  .select({
    id: jobs.id,
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
  .where(and(eq(jobs.atsProvider, "freehire"), eq(jobs.experienceClassification, "unspecified")))
  .limit(5)
  .all();

console.log("Unspecified Freehire jobs sample count:", unspecifiedFreehire.length);
for (const j of unspecifiedFreehire) {
  console.log(`\nTitle: ${j.title} | Company: ${j.company}`);
  console.log(`URL: ${j.url}`);
  console.log(`Exp: min=${j.minExp}, max=${j.maxExp}, class=${j.classification}, stated=${j.stated}`);
  console.log(`Desc snippet (first 400 chars):\n${j.desc?.slice(0, 400)}`);
}

console.log("\n=== Checking overall experience statistics across ATS providers ===");
const allJobs = db.select({ ats: jobs.atsProvider, exp: jobs.experienceClassification }).from(jobs).all();
const stats: Record<string, { total: number; unspecified: number; specified: number }> = {};
for (const j of allJobs) {
  if (!stats[j.ats]) stats[j.ats] = { total: 0, unspecified: 0, specified: 0 };
  stats[j.ats].total++;
  if (j.exp === "unspecified") {
    stats[j.ats].unspecified++;
  } else {
    stats[j.ats].specified++;
  }
}
console.table(stats);

