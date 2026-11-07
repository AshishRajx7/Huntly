const fs = require('fs');

const html = fs.readFileSync('research/jobpin-job.html', 'utf8');
const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
if (match) {
  try {
    const parsed = JSON.parse(match[1]);
    console.log('Parsed JobPosting keys:', Object.keys(parsed));
    console.log(JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log('Raw JSON-LD snippet:', match[1].slice(0, 1000));
  }
}

// Find apply button / link
const applyMatch = html.match(/href="([^"]+)"[^>]*>[\s\S]*?(?:Apply|Original Posting|View on)[\s\S]*?<\/a>/i);
console.log('\nApply link match:', applyMatch?.[1]);

