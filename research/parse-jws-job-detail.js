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
  if (url.includes('jobs/sf-standard-job-posting-at-harvey') && (b.body?.text || b.body?.content)) {
    let content = b.body?.text || Buffer.from(b.body.content, 'base64').toString('utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('job') && line.includes('{') && line.length > 200) {
        console.log(`Line ${i}:`, line.slice(0, 300));
        try {
          const jsonStr = line.replace(/^[a-z0-9]+:/, '');
          const p = JSON.parse(jsonStr);
          console.log('Parsed job object keys:', Object.keys(p));
          console.log('Sample content:', JSON.stringify(p).slice(0, 500));
        } catch (e) {}
      }
    }
  }
}

