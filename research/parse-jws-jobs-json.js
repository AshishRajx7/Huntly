const fs = require('fs');

const jobs = fs.readFileSync('research/jws-rsc-jobs.txt', 'utf8');
const lines = jobs.split('\n');
console.log('Total lines in jobs RSC:', lines.length);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('jobs') && (line.includes('title') || line.includes('company'))) {
    console.log(`Line ${i} (length ${line.length}):`, line.slice(0, 250));
    try {
      const jsonStr = line.replace(/^[a-z0-9]+:/, '');
      const parsed = JSON.parse(jsonStr);
      console.log('Parsed successfully! Keys:', Object.keys(parsed));
      if (parsed.jobs?.length > 0) {
        console.log('Sample job keys:', Object.keys(parsed.jobs[0]));
        console.log('Sample job:', JSON.stringify(parsed.jobs[0], null, 2));
      }
    } catch (e) {}
  }
}

