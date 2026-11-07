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

async function inspectLib() {
  console.log('=== Checking rishilahoti/ats-jobs/contents/lib ===');
  const lib = await fetchJson('https://api.github.com/repos/rishilahoti/ats-jobs/contents/lib');
  if (Array.isArray(lib.data)) {
    lib.data.forEach(item => console.log(`- ${item.name} (${item.path})`));
  } else {
    console.log(lib);
  }

  console.log('\n=== Checking rishilahoti/ats-jobs/contents/package.json ===');
  const pkg = await fetchJson('https://api.github.com/repos/rishilahoti/ats-jobs/contents/package.json');
  if (pkg.data?.content) {
    const pkgContent = Buffer.from(pkg.data.content, 'base64').toString('utf8');
    console.log(pkgContent);
  }

  console.log('\n=== Checking rishilahoti/ashby-job-scraper ===');
  const repo1169 = await fetchJson('https://api.github.com/repositories/1169113825');
  console.log('Repo 1169 full_name:', repo1169.data?.full_name);
  console.log('Description:', repo1169.data?.description);
  
  const repo1169Contents = await fetchJson('https://api.github.com/repositories/1169113825/contents');
  if (Array.isArray(repo1169Contents.data)) {
    repo1169Contents.data.forEach(item => console.log(`- ${item.name} (${item.path})`));
  }
}

inspectLib();

