const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'HuntlyResearch/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function run() {
  const robots = await fetchUrl('https://jobswithstartups.com/robots.txt');
  console.log('=== ROBOTS.TXT === (status: ' + robots.status + ')');
  console.log(robots.data);

  const sitemap = await fetchUrl('https://jobswithstartups.com/sitemap.xml');
  console.log('=== SITEMAP.XML === (status: ' + sitemap.status + ')');
  console.log(sitemap.data?.slice(0, 1000));
}

run();

