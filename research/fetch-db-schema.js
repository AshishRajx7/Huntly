const fs = require('fs');
const https = require('https');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'HuntlyResearch/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data.slice(0, 500) });
        }
      });
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function inspectDbJs() {
  const dbJs = await fetchJson('https://api.github.com/repositories/1169113825/contents/src/store/db.js');
  if (dbJs.data?.content) {
    const text = Buffer.from(dbJs.data.content, 'base64').toString('utf8');
    fs.writeFileSync('research/ashby-tracker-db.js', text);
    console.log('Saved db.js (length ' + text.length + ')');
    // Find CREATE TABLE statements
    const tables = text.match(/CREATE TABLE IF NOT EXISTS [a-zA-Z0-9_\(\)\s\,\.\'\"]+;/gi) || [];
    console.log('Tables found:');
    tables.forEach(t => console.log('\n', t.slice(0, 600)));
  }
}

inspectDbJs();

