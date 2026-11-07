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

async function inspectRepos() {
  console.log('=== Checking rishilahoti/ats-jobs ===');
  const atsJobs = await fetchJson('https://api.github.com/repos/rishilahoti/ats-jobs');
  console.log('Status:', atsJobs.status);
  if (atsJobs.data) {
    console.log('Description:', atsJobs.data.description);
    console.log('Stars:', atsJobs.data.stargazers_count);
    console.log('Default branch:', atsJobs.data.default_branch);
  }

  console.log('\n=== Checking contents of rishilahoti/ats-jobs ===');
  const contents = await fetchJson('https://api.github.com/repos/rishilahoti/ats-jobs/contents');
  if (Array.isArray(contents.data)) {
    contents.data.forEach(item => console.log(`- ${item.type}: ${item.name} (${item.path})`));
  } else {
    console.log('Contents data:', contents);
  }

  console.log('\n=== Checking rishilahoti/ashbyhq-scraper ===');
  const ashbyScraper = await fetchJson('https://api.github.com/repos/rishilahoti/ashbyhq-scraper');
  console.log('Status:', ashbyScraper.status);
  if (ashbyScraper.data) {
    console.log('Description:', ashbyScraper.data.description);
  }

  console.log('\n=== Checking contents of rishilahoti/ashbyhq-scraper ===');
  const ashbyContents = await fetchJson('https://api.github.com/repos/rishilahoti/ashbyhq-scraper/contents');
  if (Array.isArray(ashbyContents.data)) {
    ashbyContents.data.forEach(item => console.log(`- ${item.type}: ${item.name} (${item.path})`));
  } else {
    console.log('Ashby contents:', ashbyContents);
  }
}

inspectRepos();

