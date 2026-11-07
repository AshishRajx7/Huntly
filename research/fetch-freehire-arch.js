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

async function inspectArchAndCatalog() {
  console.log('=== Fetching docs/architecture.md ===');
  const arch = await fetchJson('https://api.github.com/repos/strelov1/freehire/contents/docs/architecture.md');
  if (arch.data?.content) {
    const text = Buffer.from(arch.data.content, 'base64').toString('utf8');
    fs.writeFileSync('research/freehire-architecture.md', text);
    console.log('Saved architecture.md (length ' + text.length + ')');
    console.log(text.slice(0, 2000));
  }

  console.log('\n=== Contents of internal/ingest/boardcatalog ===');
  const bc = await fetchJson('https://api.github.com/repos/strelov1/freehire/contents/internal/ingest/boardcatalog');
  if (Array.isArray(bc.data)) {
    bc.data.forEach(item => console.log(`- ${item.name} (${item.path})`));
  }
}

inspectArchAndCatalog();

