const https = require('https');

https.get('https://freehire.me/api/v1/jobs?limit=2', {
  headers: {
    'User-Agent': 'HuntlyResearch/1.0',
    'Accept': 'application/json'
  }
}, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Parsed top keys:', Object.keys(parsed));
      console.log('Total count or meta:', parsed.meta || parsed.total);
      if (Array.isArray(parsed.data || parsed.jobs || parsed.items)) {
        const list = parsed.data || parsed.jobs || parsed.items;
        console.log('Sample item keys:', Object.keys(list[0]));
        console.log('Sample job:', JSON.stringify(list[0], null, 2));
      } else {
        console.log('Data snippet:', JSON.stringify(parsed).slice(0, 1000));
      }
    } catch (e) {
      console.log('Raw data snippet:', data.slice(0, 500));
    }
  });
}).on('error', console.error);

