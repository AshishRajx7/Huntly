const fs = require('fs');

const raw = fs.readFileSync('research/captures/ashby-tracker-capture.json', 'utf8');
const data = JSON.parse(raw);
const events = data.normalized_result?.events?.items || [];
console.log('Total events:', events.length);

const requests = [];
const responses = [];

for (const ev of events) {
  if (ev.kind === 'request') {
    requests.push({ method: ev.method, url: ev.url.url });
  } else if (ev.kind === 'response') {
    responses.push({ status: ev.status, url: ev.url.url });
  }
}

console.log('Total requests:', requests.length);
console.log('Unique request URLs:');
const uniqueUrls = Array.from(new Set(requests.map(r => `${r.method} ${r.url.split('?')[0]}`)));
uniqueUrls.forEach(u => console.log(' ', u));

console.log('\n--- Searching for GitHub links and Data Sources in Response Bodies ---');
const bodies = events.filter(e => e.kind === 'network-content' && e.phase === 'response');
for (const b of bodies) {
  const tr = events.find(e => e.transaction_id === b.transaction_id && e.kind === 'response');
  const url = tr?.url?.url || '';
  let content = b.body?.text || (b.body?.content ? Buffer.from(b.body.content, 'base64').toString('utf8') : '');
  
  // Look for github.com links
  const ghMatches = content.match(/https?:\/\/github\.com\/[a-zA-Z0-9_\-\.\/]+/g) || [];
  if (ghMatches.length > 0) {
    console.log(`GitHub links in ${url}:`, Array.from(new Set(ghMatches)));
  }

  // Look for APIs or data sources
  if (url.includes('jobs.whatrunsindia.com') && !url.includes('.js') && !url.includes('.css') && !url.includes('.woff')) {
    console.log(`\nHTML from ${url} (length ${content.length}):`);
    console.log('Title/H1 snippet:', content.slice(0, 1000).replace(/\s+/g, ' '));
  }
}

