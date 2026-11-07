const fs = require('fs');
let raw = fs.readFileSync('research/captures/jws-capture.json');
let text = (raw[0] === 0xff && raw[1] === 0xfe) ? raw.toString('utf16le') : raw.toString('utf8');
text = text.replace(/^\uFEFF/, '').trim();
const data = JSON.parse(text);
const events = data.normalized_result?.events?.items || [];
const bodies = events.filter(e => e.kind === 'network-content' && e.phase === 'response');

for (const b of bodies) {
  const tr = events.find(e => e.transaction_id === b.transaction_id && e.kind === 'response');
  const url = tr?.url?.url || '';
  if (url.includes('startups/add')) {
    let content = b.body?.text || (b.body?.content ? Buffer.from(b.body.content, 'base64').toString('utf8') : '');
    console.log('startups/add body length:', content.length);
    console.log(content.slice(0, 1000));
  }
}

