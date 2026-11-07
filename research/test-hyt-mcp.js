const https = require('https');

async function testHytMcp() {
  const postData = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "huntly-client",
        version: "1.0.0"
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
    console.log('Status code:', res.statusCode);
    console.log('Headers:', res.headers);
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      console.log('Response body:', data);
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e);
  });

  req.write(postData);
  req.end();
}

testHytMcp();

