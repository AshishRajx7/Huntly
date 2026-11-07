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

async function inspectRegistry() {
  const reg = await fetchJson('https://api.github.com/repositories/1169113825/contents/src/sources/registry.json');
  if (reg.data?.content) {
    const text = Buffer.from(reg.data.content, 'base64').toString('utf8');
    const parsed = JSON.parse(text);
    console.log('Registry items count:', parsed.length);
    console.log('Sample entry:', parsed[0]);
    
    // Group by source
    const counts = {};
    parsed.forEach(p => {
      counts[p.source || 'ashby'] = (counts[p.source || 'ashby'] || 0) + 1;
    });
    console.log('Counts by source:', counts);
    console.log('First 10 companies:');
    parsed.slice(0, 10).forEach(p => console.log(`- ${p.company} (${p.slug}) [${p.source || 'ashby'}]`));
  }
}

inspectRegistry();

