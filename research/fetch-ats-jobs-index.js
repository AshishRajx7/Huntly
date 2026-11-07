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

async function inspectIndex() {
  const idx = await fetchJson('https://api.github.com/repos/rishilahoti/ats-jobs/contents/index.js');
  if (idx.data?.content) {
    const text = Buffer.from(idx.data.content, 'base64').toString('utf8');
    console.log('=== ats-jobs index.js ===');
    console.log(text);
  }
}

inspectIndex();

