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

async function inspectAdapters() {
  const adapters = ['ashby.js', 'greenhouse.js', 'lever.js', 'workday.js', 'smartrecruiters.js'];
  for (const a of adapters) {
    const res = await fetchJson(`https://api.github.com/repos/rishilahoti/ats-jobs/contents/lib/adapters/${a}`);
    if (res.data?.content) {
      const text = Buffer.from(res.data.content, 'base64').toString('utf8');
      console.log(`=== Adapter: ${a} (length ${text.length}) ===`);
      console.log(text.slice(0, 800));
      console.log('...\n');
    }
  }
}

inspectAdapters();

