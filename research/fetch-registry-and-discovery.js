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

async function checkRegistryAndDiscovery() {
  console.log('=== Checking src/sources/registry.json metadata ===');
  const regMeta = await fetchJson('https://api.github.com/repositories/1169113825/contents/src/sources/registry.json');
  console.log('Size of registry.json:', regMeta.data?.size, 'bytes');

  console.log('\n=== Checking src/discovery/index.js ===');
  const discovery = await fetchJson('https://api.github.com/repositories/1169113825/contents/src/discovery/index.js');
  if (discovery.data?.content) {
    const text = Buffer.from(discovery.data.content, 'base64').toString('utf8');
    console.log(text.slice(0, 2000));
  }

  console.log('\n=== Checking src/sources/index.js ===');
  const srcIndex = await fetchJson('https://api.github.com/repositories/1169113825/contents/src/sources/index.js');
  if (srcIndex.data?.content) {
    const text = Buffer.from(srcIndex.data.content, 'base64').toString('utf8');
    console.log(text.slice(0, 2000));
  }
}

checkRegistryAndDiscovery();

