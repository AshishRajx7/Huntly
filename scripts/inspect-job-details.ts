import { db, initDb } from "../src/lib/db";
import { jobs } from "../src/lib/db/schema";
import { like } from "drizzle-orm";

initDb();

const instahyreJobs = db
  .select()
  .from(jobs)
  .where(like(jobs.applicationUrl, "%instahyre%"))
  .all();

console.log(`Found ${instahyreJobs.length} Instahyre jobs:`);
for (const j of instahyreJobs) {
  console.log("--------------------------------------------------");
  console.log(`ID: ${j.id}`);
  console.log(`atsJobId: ${j.atsJobId}`);
  console.log(`Title: ${j.jobTitle}`);
  console.log(`Company: ${j.companyName}`);
  console.log(`URL: ${j.applicationUrl}`);
  console.log(`minExp: ${j.minExperience}, maxExp: ${j.maxExperience}, class: ${j.experienceClassification}, stated: ${j.experienceStated}`);
  console.log("\nFull Cleaned Description:");
  console.log(j.cleanedDescription);
  console.log("\nOriginal Description:");
  console.log(j.originalDescription);
}

