const fs = require('fs');

let raw = fs.readFileSync('research/captures/jws-capture.json');
let text = '';
if (raw[0] === 0xff && raw[1] === 0xfe) {
  text = raw.toString('utf16le');
} else {
  text = raw.toString('utf8');
}
text = text.replace(/^\uFEFF/, '').trim();

const data = JSON.parse(text);
const events = data.normalized_result?.events?.items || [];
console.log('Total events captured:', events.length);

const requests = [];
const responses = [];
const apiCalls = [];

for (const ev of events) {
  if (ev.kind === 'request') {
    requests.push({ method: ev.method, url: ev.url.url, resourceType: ev.resourceType });
  } else if (ev.kind === 'response') {
    responses.push({ status: ev.status, url: ev.url.url });
    if (ev.url.url.includes('/api/') || ev.url.url.includes('graphql') || ev.url.url.includes('supabase') || ev.url.url.includes('algolia') || ev.url.url.includes('json') || ev.url.url.includes('_next/data') || ev.url.url.includes('/trpc/')) {
      apiCalls.push({ status: ev.status, url: ev.url.url });
    }
  }
}

console.log('Total requests:', requests.length);
console.log('\n--- Unique Request URLs (Method + Path) ---');
const uniqueUrls = Array.from(new Set(requests.map(r => `${r.method} ${r.url.split('?')[0]}`)));
uniqueUrls.forEach(u => console.log(' ', u));

console.log('\n--- API / Data Endpoints Observed ---');
const uniqueApi = Array.from(new Set(apiCalls.map(r => `${r.status} ${r.url}`)));
uniqueApi.forEach(u => console.log(' ', u));

// Look for network-content phase response bodies that might have JSON
const bodies = events.filter(e => e.kind === 'network-content' && e.phase === 'response' && e.body);
console.log('\nTotal response bodies captured:', bodies.length);
for (const b of bodies) {
  const transaction = events.find(e => e.transaction_id === b.transaction_id && e.kind === 'response');
  const url = transaction?.url?.url || b.transaction_id;
  if (b.body?.text) {
    const text = b.body.text;
    console.log(`\nResponse from: ${url} (length: ${text.length})`);
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        const keys = Array.isArray(parsed) ? `Array[${parsed.length}]` : Object.keys(parsed).slice(0, 10).join(', ');
        console.log(`  JSON structure: ${keys}`);
      } catch (err) {}
    } else if (text.includes('__NEXT_DATA__')) {
      console.log('  Contains __NEXT_DATA__ SSR hydration payload!');
    }
  }
}
