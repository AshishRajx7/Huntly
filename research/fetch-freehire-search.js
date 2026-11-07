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

async function inspectSearchPackage() {
  const s = await fetchJson('https://api.github.com/repos/strelov1/freehire/contents/internal/search');
  if (Array.isArray(s.data)) {
    s.data.forEach(item => console.log(`- ${item.name} (${item.path})`));
  }
}

inspectSearchPackage();

