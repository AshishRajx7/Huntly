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

async function inspectSearchAgents() {
  const sa = await fetchJson('https://api.github.com/repos/strelov1/freehire/contents/internal/search/AGENTS.md');
  if (sa.data?.content) {
    const text = Buffer.from(sa.data.content, 'base64').toString('utf8');
    console.log('=== search AGENTS.md ===');
    console.log(text.slice(0, 2000));
  }
}

inspectSearchAgents();

