const https = require('https');

https.get('https://jobswithstartups.com/startups/sitemap.xml', { headers: { 'User-Agent': 'HuntlyResearch/1.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const locs = data.match(/<loc>(.*?)<\/loc>/g) || [];
    console.log('Total startup URLs in sitemap:', locs.length);
    console.log('Sample locs:');
    locs.slice(0, 10).forEach(l => console.log(' ', l.replace(/<\/?loc>/g, '')));
  });
}).on('error', console.error);

