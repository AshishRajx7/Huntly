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

async function inspectAdaptersAndStore() {
  console.log('=== Checking src/store contents ===');
  const storeContents = await fetchJson('https://api.github.com/repositories/1169113825/contents/src/store');
  if (Array.isArray(storeContents.data)) {
    storeContents.data.forEach(s => console.log(`- ${s.name} (${s.path})`));
  }

  console.log('\n=== Fetching schema / migrations in src/store ===');
  const storeFiles = await fetchJson('https://api.github.com/repositories/1169113825/contents/src/store/index.js');
  if (storeFiles.data?.content) {
    const text = Buffer.from(storeFiles.data.content, 'base64').toString('utf8');
    fs.writeFileSync('research/ashby-tracker-store.js', text);
    console.log('Saved store.js (length ' + text.length + ')');
    console.log(text.slice(0, 1500));
  }
}

inspectAdaptersAndStore();

