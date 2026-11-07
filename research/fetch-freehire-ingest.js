const https = require('https');
const fs = require('fs');

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

async function inspectIngestAndDocs() {
  console.log('=== Contents of internal/ingest ===');
  const ingest = await fetchJson('https://api.github.com/repos/strelov1/freehire/contents/internal/ingest');
  if (Array.isArray(ingest.data)) {
    ingest.data.forEach(item => console.log(`- ${item.type}: ${item.name} (${item.path})`));
  }

  console.log('\n=== Fetching docs/sources.md ===');
  const sourcesDoc = await fetchJson('https://api.github.com/repos/strelov1/freehire/contents/docs/sources.md');
  if (sourcesDoc.data?.content) {
    const text = Buffer.from(sourcesDoc.data.content, 'base64').toString('utf8');
    fs.writeFileSync('research/freehire-sources.md', text);
    console.log('Saved sources.md (length ' + text.length + ')');
    console.log(text.slice(0, 2000));
  }
}

inspectIngestAndDocs();

