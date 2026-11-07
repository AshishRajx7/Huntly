const https = require('https');

async function testGetJobDetails() {
  const postData = JSON.stringify({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "get_job_details",
      arguments: {
        id: "56ae69f2-9bf6-4255-bd3c-31682b2abc44"
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
      console.log('Get Job Details Response:\n', data.slice(0, 2000));
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e);
  });

  req.write(postData);
  req.end();
}

testGetJobDetails();

