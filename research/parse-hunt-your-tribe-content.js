const fs = require('fs');

const html = fs.readFileSync('research/hunt-your-tribe-home.html', 'utf8');

console.log('Title:', html.match(/<title>(.*?)<\/title>/)?.[1]);
console.log('Meta description:', html.match(/<meta name="description" content="(.*?)">/)?.[1]);

// Search for MCP references
console.log('\n=== MCP Mentions ===');
const mcpMatches = html.match(/.{0,100}mcp.{0,100}/gi) || [];
mcpMatches.slice(0, 15).forEach(m => console.log('-', m.replace(/\s+/g, ' ')));

// Search for 60-day or freshness
console.log('\n=== Freshness / 60 days Mentions ===');
const freshMatches = html.match(/.{0,100}(?:60|fresh|expire|expired|active|sync).{0,100}/gi) || [];
freshMatches.filter(m => m.includes('60') || m.includes('fresh') || m.includes('expire')).slice(0, 15).forEach(m => console.log('-', m.replace(/\s+/g, ' ')));

// Search for companies count / ATS
console.log('\n=== Companies / ATS Mentions ===');
const compMatches = html.match(/.{0,100}(?:companies|greenhouse|ashby|lever|workday).{0,100}/gi) || [];
compMatches.slice(0, 15).forEach(m => console.log('-', m.replace(/\s+/g, ' ')));

