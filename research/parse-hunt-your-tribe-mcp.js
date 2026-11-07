const fs = require('fs');

const html = fs.readFileSync('research/hunt-your-tribe-home.html', 'utf8');

// Search for mcp url or mcp config
const matches = html.match(/.{0,80}(?:mcp|server|transport|sse).{0,80}/gi) || [];
console.log('Total matches:', matches.length);
matches.filter(m => m.includes('http') || m.includes('json') || m.includes('huntyourtribe.com')).forEach(m => console.log('Snippet:', m.trim().replace(/\s+/g, ' ')));

// Check the FAQ section for companies, 60 days, and how data is indexed
const faqStart = html.indexOf('What companies does HuntYourTribe index?');
if (faqStart !== -1) {
  console.log('\n=== FAQ Section ===');
  console.log(html.slice(faqStart, faqStart + 2500).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
}

