const fs = require('fs');

const startups = fs.readFileSync('research/jws-rsc-startups.txt', 'utf8');
const lines = startups.split('\n');
const line44 = lines[44];
// Strip prefix like "a:"
const jsonStr = line44.replace(/^[a-z0-9]+:/, '');
try {
  const parsed = JSON.parse(jsonStr);
  console.log('Parsed successfully!');
  console.log('Top keys:', Object.keys(parsed));
  console.log('Total companies:', parsed.companies?.length);
  if (parsed.companies?.length > 0) {
    console.log('Sample company schema:');
    console.log(JSON.stringify(parsed.companies[0], null, 2));
    console.log('\nSample company list (first 10):');
    parsed.companies.slice(0, 10).forEach(c => console.log(`- ${c.name} (${c.website}) - ATS: ${c.ats_type || c.ats || 'N/A'}`));
  }
} catch (e) {
  console.error('Parse error:', e.message);
  console.log('Snippet:', jsonStr.slice(0, 300));
}

