const fs = require('fs');
let raw = fs.readFileSync('research/captures/jws-capture.json');
let text = (raw[0] === 0xff && raw[1] === 0xfe) ? raw.toString('utf16le') : raw.toString('utf8');
text = text.replace(/^\uFEFF/, '').trim();
const data = JSON.parse(text);
const events = data.normalized_result?.events?.items || [];

const ev = events.find(e => e.kind === 'request' && e.url.url.includes('startups/add'));
console.log('Request transaction id:', ev?.transaction_id);

const resp = events.find(e => e.transaction_id === ev?.transaction_id && e.kind === 'response');
console.log('Response status:', resp?.status);

const body = events.find(e => e.transaction_id === ev?.transaction_id && e.kind === 'network-content');
console.log('Has body:', !!body, 'body keys:', Object.keys(body?.body || {}));
if (body?.body?.content) {
  const content = Buffer.from(body.body.content, 'base64').toString('utf8');
  console.log('Content snippet:', content.slice(0, 500));
}

