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

async function inspectPipeline() {
  const pipe = await fetchJson('https://api.github.com/repositories/1169113825/contents/src/scheduler/pipeline.js');
  if (pipe.data?.content) {
    const text = Buffer.from(pipe.data.content, 'base64').toString('utf8');
    console.log('=== Pipeline ===');
    console.log(text.slice(0, 2000));
  }
}

inspectPipeline();

