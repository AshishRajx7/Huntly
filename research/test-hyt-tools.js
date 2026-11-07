const https = require('https');

async function listTools() {
  const postData = JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
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
      console.log('Response body:\n', data);
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e);
  });

  req.write(postData);
  req.end();
}

listTools();

