const https = require('https');

https.get('https://freehire.me/api/v1/agent/jobs/search?q=backend+engineer&limit=2', {
  headers: {
    'User-Agent': 'HuntlyResearch/1.0',
    'Accept': 'application/json'
  }
}, (res) => {
  console.log('Status code:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Top keys:', Object.keys(parsed));
      console.log('Meta:', parsed.meta);
      if (parsed.data) {
        console.log('Sample agent job:', JSON.stringify(parsed.data[0], null, 2));
      }
    } catch (e) {
      console.log('Raw:', data.slice(0, 500));
    }
  });
}).on('error', console.error);

