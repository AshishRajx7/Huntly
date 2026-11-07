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

async function inspectDetails() {
  console.log('=== CLAUDE.md ===');
  const claudeMd = await fetchJson('https://api.github.com/repositories/1169113825/contents/CLAUDE.md');
  if (claudeMd.data?.content) {
    const text = Buffer.from(claudeMd.data.content, 'base64').toString('utf8');
    console.log(text.slice(0, 2500));
  }

  console.log('\n=== Contents of src/sources ===');
  const sources = await fetchJson('https://api.github.com/repositories/1169113825/contents/src/sources');
  if (Array.isArray(sources.data)) {
    sources.data.forEach(s => console.log(`- ${s.name} (${s.path})`));
  }

  console.log('\n=== Contents of src/discovery ===');
  const discovery = await fetchJson('https://api.github.com/repositories/1169113825/contents/src/discovery');
  if (Array.isArray(discovery.data)) {
    discovery.data.forEach(s => console.log(`- ${s.name} (${s.path})`));
  }
}

inspectDetails();

