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

async function dumpDiscoveryCode() {
  const discovery = await fetchJson('https://api.github.com/repositories/1169113825/contents/src/discovery/index.js');
  if (discovery.data?.content) {
    const text = Buffer.from(discovery.data.content, 'base64').toString('utf8');
    fs.writeFileSync('research/ashby-tracker-discovery.js', text);
    console.log('Saved discovery code (length ' + text.length + ')');
    console.log(text.slice(1000, 3500));
  }
}

dumpDiscoveryCode();
