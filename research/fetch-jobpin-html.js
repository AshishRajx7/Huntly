const https = require('https');
const fs = require('fs');

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
      console.log('Status code for', url, ':', res.statusCode);
      console.log('Headers:', res.headers);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function run() {
  const page = await fetchUrl('https://jobpin.com/');
  fs.writeFileSync('research/jobpin-home.html', page.data || '');
  console.log('Saved jobpin-home.html (length: ' + (page.data?.length || 0) + ')');

  // Check robots.txt
  const robots = await fetchUrl('https://jobpin.com/robots.txt');
  console.log('Robots.txt:\n', robots.data);

  // Check sitemap
  const sitemap = await fetchUrl('https://jobpin.com/sitemap.xml');
  console.log('Sitemap snippet:\n', sitemap.data?.slice(0, 1000));
}

run();

