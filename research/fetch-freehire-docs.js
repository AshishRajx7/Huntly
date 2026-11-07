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

async function inspectDocsAndInternal() {
  console.log('=== Contents of docs/ ===');
  const docs = await fetchJson('https://api.github.com/repos/strelov1/freehire/contents/docs');
  if (Array.isArray(docs.data)) {
    docs.data.forEach(d => console.log(`- ${d.name} (${d.path})`));
  }

  console.log('\n=== Contents of internal/ ===');
  const internal = await fetchJson('https://api.github.com/repos/strelov1/freehire/contents/internal');
  if (Array.isArray(internal.data)) {
    internal.data.forEach(i => console.log(`- ${i.name} (${i.path})`));
  }

  console.log('\n=== Contents of harvest/ ===');
  const harvest = await fetchJson('https://api.github.com/repos/strelov1/freehire/contents/harvest');
  if (Array.isArray(harvest.data)) {
    harvest.data.forEach(h => console.log(`- ${h.name} (${h.path})`));
  }
}

inspectDocsAndInternal();

