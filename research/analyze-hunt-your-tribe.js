const fs = require('fs');

const raw = fs.readFileSync('research/captures/hunt-your-tribe-capture.json', 'utf8');
const data = JSON.parse(raw);
const events = data.normalized_result?.events?.items || [];
console.log('Total events:', events.length);

const requests = [];
const responses = [];

for (const ev of events) {
  if (ev.kind === 'request') {
    requests.push({ method: ev.method, url: ev.url.url, resourceType: ev.resourceType });
  } else if (ev.kind === 'response') {
    responses.push({ status: ev.status, url: ev.url.url });
  }
}

console.log('Total requests:', requests.length);
console.log('\n--- Unique Request URLs ---');
const uniqueUrls = Array.from(new Set(requests.map(r => `${r.method} ${r.url.split('?')[0]}`)));
uniqueUrls.forEach(u => console.log(' ', u));

console.log('\n--- Searching for APIs, JSON data, and GraphQL ---');
const bodies = events.filter(e => e.kind === 'network-content' && e.phase === 'response');
for (const b of bodies) {
  const tr = events.find(e => e.transaction_id === b.transaction_id && e.kind === 'response');
  const url = tr?.url?.url || '';
  let content = b.body?.text || (b.body?.content ? Buffer.from(b.body.content, 'base64').toString('utf8') : '');
  
  if (url.includes('/api/') || url.includes('.json') || url.includes('supabase') || url.includes('graphql') || url.includes('trpc') || url.includes('_next/data') || (url.includes('huntyourtribe.com') && !url.includes('.js') && !url.includes('.css') && !url.includes('.woff') && !url.includes('.png') && !url.includes('.svg'))) {
    console.log(`\nURL: ${url} (length: ${content.length})`);
    console.log('Snippet:', content.slice(0, 400).replace(/\s+/g, ' '));
  }
}

