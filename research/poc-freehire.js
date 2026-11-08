const https = require('https');
const fs = require('fs');

function fetchFreehire(path) {
  const url = `https://freehire.me/api/v1${path}`;
  const start = Date.now();
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'HuntlyPoC/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const durationMs = Date.now() - start;
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          status: res.statusCode,
          durationMs,
          headers: {
            'x-ratelimit-limit': res.headers['x-ratelimit-limit'],
            'x-ratelimit-remaining': res.headers['x-ratelimit-remaining'],
            'x-ratelimit-reset': res.headers['x-ratelimit-reset'],
            'cf-ray': res.headers['cf-ray']
          },
          body: json,
          rawLen: data.length
        });
      });
    }).on('error', (err) => {
      resolve({ error: err.message, durationMs: Date.now() - start });
    });
  });
}

async function runTests() {
  console.log('=== Freehire Agent API PoC Testing ===\n');
  const results = {};

  // Test 1: Backend Engineer
  console.log('1. Searching for Backend Engineer jobs...');
  results.backend = await fetchFreehire('/agent/jobs/search?q=Backend+Engineer&limit=10');
  console.log(`   Status: ${results.backend.status}, Duration: ${results.backend.durationMs}ms, Total: ${results.backend.body?.meta?.total}`);

  // Test 2: Software Engineer
  console.log('2. Searching for Software Engineer jobs...');
  results.swe = await fetchFreehire('/agent/jobs/search?q=Software+Engineer&limit=10');
  console.log(`   Status: ${results.swe.status}, Duration: ${results.swe.durationMs}ms, Total: ${results.swe.body?.meta?.total}`);

  // Test 3: Node.js
  console.log('3. Searching for Node.js jobs...');
  results.nodejs = await fetchFreehire('/agent/jobs/search?q=Node.js&limit=10');
  console.log(`   Status: ${results.nodejs.status}, Duration: ${results.nodejs.durationMs}ms, Total: ${results.nodejs.body?.meta?.total}`);

  // Test 4: Bangalore / Bengaluru
  console.log('4. Searching for jobs in Bangalore/Bengaluru...');
  results.bangalore_q = await fetchFreehire('/agent/jobs/search?q=Bengaluru&limit=10');
  console.log(`   q=Bengaluru -> Status: ${results.bangalore_q.status}, Duration: ${results.bangalore_q.durationMs}ms, Total: ${results.bangalore_q.body?.meta?.total}`);
  
  results.bangalore_city = await fetchFreehire('/agent/jobs/search?city=Bengaluru&limit=10');
  console.log(`   city=Bengaluru -> Status: ${results.bangalore_city.status}, Total: ${results.bangalore_city.body?.meta?.total}`);

  // Test 5: Remote jobs
  console.log('5. Searching for remote jobs...');
  results.remote = await fetchFreehire('/agent/jobs/search?q=Software+Engineer&work_mode=remote&limit=10');
  console.log(`   Remote SWE -> Status: ${results.remote.status}, Duration: ${results.remote.durationMs}ms, Total: ${results.remote.body?.meta?.total}`);

  // Test 6: Pagination test
  console.log('6. Testing pagination (Page 1 vs Page 2)...');
  results.page1 = await fetchFreehire('/agent/jobs/search?q=Backend+Engineer&limit=5&offset=0');
  results.page2 = await fetchFreehire('/agent/jobs/search?q=Backend+Engineer&limit=5&offset=5');
  const p1Ids = (results.page1.body?.data || []).map(j => j.public_slug);
  const p2Ids = (results.page2.body?.data || []).map(j => j.public_slug);
  const overlap = p1Ids.filter(id => p2Ids.includes(id));
  console.log(`   Page 1 slugs: ${p1Ids.length}, Page 2 slugs: ${p2Ids.length}, Overlap count: ${overlap.length}`);

  // Save raw test output
  fs.writeFileSync('research/freehire-poc-data.json', JSON.stringify(results, null, 2));
  console.log('\nSaved full results to research/freehire-poc-data.json');
}

runTests();

