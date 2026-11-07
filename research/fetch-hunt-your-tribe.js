const https = require('https');
const fs = require('fs');

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function run() {
  console.log('Fetching home page...');
  const home = await fetchUrl('https://huntyourtribe.com/');
  fs.writeFileSync('research/hunt-your-tribe-home.html', home.data || '');
  console.log('Saved home HTML (length:', home.data?.length, ')');

  console.log('\nFetching robots.txt...');
  const robots = await fetchUrl('https://huntyourtribe.com/robots.txt');
  console.log('Robots.txt:\n', robots.data);
}

run();

