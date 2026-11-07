const https = require('https');

async function testMcp() {
  const postData = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {}
  });

  const options = {
    hostname: 'jobswithstartups.com',
    port: 443,
    path: '/mcp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
      console.log('Response body:', data.slice(0, 1000));
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e);
  });

  req.write(postData);
  req.end();
}

testMcp();

