const https = require('https');
const fs = require('fs');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'HuntlyResearch/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data.slice(0, 500) });
        }
      });
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function inspectAgentsAndApi() {
  console.log('=== Fetching internal/ingest/boardcatalog/AGENTS.md ===');
  const bcAgents = await fetchJson('https://api.github.com/repos/strelov1/freehire/contents/internal/ingest/boardcatalog/AGENTS.md');
  if (bcAgents.data?.content) {
    const text = Buffer.from(bcAgents.data.content, 'base64').toString('utf8');
    fs.writeFileSync('research/freehire-boardcatalog-agents.md', text);
    console.log('Saved boardcatalog AGENTS.md (length ' + text.length + ')');
    console.log(text.slice(0, 2500));
  }

  console.log('\n=== Fetching docs/API.md ===');
  const apiDoc = await fetchJson('https://api.github.com/repos/strelov1/freehire/contents/docs/API.md');
  if (apiDoc.data?.content) {
    const text = Buffer.from(apiDoc.data.content, 'base64').toString('utf8');
    fs.writeFileSync('research/freehire-api.md', text);
    console.log('Saved API.md (length ' + text.length + ')');
    console.log(text.slice(0, 2000));
  }
}

inspectAgentsAndApi();

