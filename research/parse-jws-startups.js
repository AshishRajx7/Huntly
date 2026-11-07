const fs = require('fs');

const startups = fs.readFileSync('research/jws-rsc-startups.txt', 'utf8');

// Find startup names, slugs, links
const startupMatches = startups.match(/\/startups\/[a-z0-9-]+/g) || [];
console.log('Startup slug links found:', Array.from(new Set(startupMatches)).slice(0, 30));

// Find any embedded JSON data
const lines = startups.split('\n');
console.log('Lines count:', lines.length);
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('name') && line.includes('slug')) {
    console.log(`Line ${i} (length ${line.length}):`, line.slice(0, 200));
  }
}

