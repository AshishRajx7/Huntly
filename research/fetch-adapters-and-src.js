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

async function inspectAdaptersAndSrc() {
  console.log('=== Adapters in rishilahoti/ats-jobs/lib/adapters ===');
  const adapters = await fetchJson('https://api.github.com/repos/rishilahoti/ats-jobs/contents/lib/adapters');
  if (Array.isArray(adapters.data)) {
    adapters.data.forEach(a => console.log(`- ${a.name}`));
  }

  console.log('\n=== Contents of rishilahoti/ashby-job-scraper/src ===');
  const src = await fetchJson('https://api.github.com/repositories/1169113825/contents/src');
  if (Array.isArray(src.data)) {
    src.data.forEach(s => console.log(`- ${s.type}: ${s.name} (${s.path})`));
  }
}

inspectAdaptersAndSrc();

