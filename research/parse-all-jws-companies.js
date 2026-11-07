const fs = require('fs');

const startups = fs.readFileSync('research/jws-rsc-startups.txt', 'utf8');
const lines = startups.split('\n');
const line44 = lines[44];
const jsonStr = line44.replace(/^[a-z0-9]+:/, '');
const parsed = JSON.parse(jsonStr);

console.log('Total matching companies:', parsed.matchingCount);
console.log('Has more:', parsed.hasMore);
console.log('ATS types breakdown:');
const atsCounts = {};
parsed.companies.forEach(c => {
  atsCounts[c.ats_type] = (atsCounts[c.ats_type] || 0) + 1;
});
console.log(atsCounts);

console.log('\nAll 30 companies:');
parsed.companies.forEach(c => {
  console.log(`- ${c.name.padEnd(25)} | ATS: ${(c.ats_type || 'none').padEnd(12)} | ATS URL: ${c.ats_url || 'none'}`);
});

