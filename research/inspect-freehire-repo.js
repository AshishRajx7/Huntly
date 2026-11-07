const https = require('https');

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

async function inspectFreehireRepo() {
  console.log('=== Checking strelov1/freehire repository ===');
  const repo = await fetchJson('https://api.github.com/repos/strelov1/freehire');
  console.log('Status:', repo.status);
  if (repo.data) {
    console.log('Description:', repo.data.description);
    console.log('Stars:', repo.data.stargazers_count);
    console.log('Language:', repo.data.language);
    console.log('Default branch:', repo.data.default_branch);
  }

  console.log('\n=== Root files in strelov1/freehire ===');
  const contents = await fetchJson('https://api.github.com/repos/strelov1/freehire/contents');
  if (Array.isArray(contents.data)) {
    contents.data.forEach(item => console.log(`- ${item.type}: ${item.name} (${item.path})`));
  }
}

inspectFreehireRepo();

