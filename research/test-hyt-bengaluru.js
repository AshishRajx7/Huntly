const https = require('https');

async function testSearchJobs() {
  const postData = JSON.stringify({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "search_jobs",
      arguments: {
        query: "Software Engineer",
        city: "Bengaluru",
        limit: 2
      }
    }
  });

  const options = {
    hostname: 'api.huntyourtribe.com',
    port: 443,
    path: '/mcp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'HuntlyResearch/1.0'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      console.log('Search Jobs Response:\n', data.slice(0, 2000));
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e);
  });

  req.write(postData);
  req.end();
}

testSearchJobs();

