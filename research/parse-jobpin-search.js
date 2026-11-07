const fs = require('fs');

const html = fs.readFileSync('research/jobpin-home.html', 'utf8');

// Find home-search-index
const idxMatch = html.match(/id="home-search-index"[^>]*>([\s\S]*?)<\/(?:script|div|template)/i);
if (idxMatch) {
  console.log('Found home-search-index! Length:', idxMatch[1].length);
  console.log('Snippet:', idxMatch[1].slice(0, 500));
}

// Inspect the search script
const start = html.indexOf('data-home-search-input');
if (start !== -1) {
  console.log('\nSearch script:');
  console.log(html.slice(start - 100, start + 1200));
}

