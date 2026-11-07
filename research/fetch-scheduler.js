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

async function inspectScheduler() {
  const sched = await fetchJson('https://api.github.com/repositories/1169113825/contents/src/scheduler/index.js');
  if (sched.data?.content) {
    const text = Buffer.from(sched.data.content, 'base64').toString('utf8');
    console.log('=== Scheduler ===');
    console.log(text.slice(0, 1500));
  }
}

inspectScheduler();

