const fs = require('fs');

const html = fs.readFileSync('research/jobpin-home.html', 'utf8');

// Title, meta description
const title = html.match(/<title>(.*?)<\/title>/)?.[1];
const desc = html.match(/<meta name="description" content="(.*?)">/)?.[1];
console.log('Title:', title);
console.log('Description:', desc);

// Find script tags
const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
console.log('\nTotal script tags:', scripts.length);
for (const s of scripts) {
  if (s.includes('type="application/ld+json"')) {
    console.log('JSON-LD found:');
    console.log(s.slice(0, 1000));
  } else if (s.includes('window.') || s.includes('const ') || s.includes('let ')) {
    console.log('Inline script snippet:', s.slice(0, 300).replace(/\s+/g, ' '));
  }
}

// Find links to jobs or companies
const links = html.match(/href="([^"]+)"/g) || [];
const uniqueLinks = Array.from(new Set(links.map(l => l.replace('href="', '').replace('"', ''))));
console.log('\nTotal unique links:', uniqueLinks.length);
console.log('Sample links:');
uniqueLinks.filter(l => l.startsWith('/') && !l.endsWith('.css') && !l.endsWith('.svg')).slice(0, 30).forEach(l => console.log(' ', l));

