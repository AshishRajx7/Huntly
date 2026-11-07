const fs = require('fs');

console.log('=== MCP GUIDE ===');
const mcp = fs.readFileSync('research/jws-rsc-mcp-guide.txt', 'utf8');
// Find readable sentences or instructions
const textParts = mcp.match(/"([^"\\]|\\.)*"/g) || [];
const readableMcp = textParts
  .map(s => {
    try { return JSON.parse(s); } catch (e) { return s; }
  })
  .filter(s => typeof s === 'string' && s.length > 25 && !s.startsWith('/_next') && !s.startsWith('http') && !s.includes('class'));
console.log('MCP guide readable texts:');
readableMcp.slice(0, 30).forEach(t => console.log('-', t));

console.log('\n=== JOBS RSC ===');
const jobs = fs.readFileSync('research/jws-rsc-jobs.txt', 'utf8');
const jobParts = jobs.match(/"([^"\\]|\\.)*"/g) || [];
const readableJobs = jobParts
  .map(s => {
    try { return JSON.parse(s); } catch (e) { return s; }
  })
  .filter(s => typeof s === 'string' && s.length > 15 && !s.startsWith('/_next') && !s.startsWith('http') && !s.includes('class'));
console.log('Jobs RSC sample strings:');
readableJobs.slice(0, 30).forEach(t => console.log('-', t));

console.log('\n=== STARTUPS RSC ===');
const startups = fs.readFileSync('research/jws-rsc-startups.txt', 'utf8');
const startupParts = startups.match(/"([^"\\]|\\.)*"/g) || [];
const readableStartups = startupParts
  .map(s => {
    try { return JSON.parse(s); } catch (e) { return s; }
  })
  .filter(s => typeof s === 'string' && s.length > 15 && !s.startsWith('/_next') && !s.startsWith('http') && !s.includes('class'));
console.log('Startups RSC sample strings:');
readableStartups.slice(0, 30).forEach(t => console.log('-', t));

