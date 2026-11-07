const https = require('https');
const fs = require('fs');

https.get('https://jobpin.com/companies/anthropic/', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('research/jobpin-anthropic.html', data);
    console.log('Saved jobpin-anthropic.html (length: ' + data.length + ')');
    
    // Check JSON-LD
    const jsonLd = data.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || [];
    jsonLd.forEach((j, i) => console.log(`JSON-LD ${i + 1}:\n`, j.slice(0, 500)));
  });
}).on('error', console.error);

