const https = require('https');
const fs = require('fs');

https.get('https://jobpin.com/job/anthropic/5438044008/', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('research/jobpin-job.html', data);
    console.log('Saved jobpin-job.html (length: ' + data.length + ')');
    
    // Check JSON-LD JobPosting
    const jsonLd = data.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || [];
    jsonLd.forEach((j, i) => console.log(`JSON-LD ${i + 1}:\n`, j.slice(0, 1000)));
  });
}).on('error', console.error);

