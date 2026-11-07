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

async function inspectFetchJs() {
  const f = await fetchJson('https://api.github.com/repos/rishilahoti/ats-jobs/contents/lib/fetch.js');
  if (f.data?.content) {
    const text = Buffer.from(f.data.content, 'base64').toString('utf8');
    fs.writeFileSync('research/ats-jobs-fetch.js', text);
    console.log('Saved fetch.js (length ' + text.length + ')');
    console.log(text.slice(0, 2000));
  }
}

inspectFetchJs();
