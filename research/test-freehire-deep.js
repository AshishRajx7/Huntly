const https = require('https');
const fs = require('fs');

function fetchJson(url) {
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
            limit: res.headers['x-ratelimit-limit'],
            remaining: res.headers['x-ratelimit-remaining'],
            reset: res.headers['x-ratelimit-reset']
          },
          data: json
        });
      });
    }).on('error', err => resolve({ error: err.message, durationMs: Date.now() - start }));
  });
}

function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = https.request({
        method: 'HEAD',
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 5000
      }, (res) => {
        resolve({ url, status: res.statusCode, location: res.headers.location });
      });
      req.on('timeout', () => { req.destroy(); resolve({ url, status: 'TIMEOUT' }); });
      req.on('error', (e) => resolve({ url, error: e.message }));
      req.end();
    } catch (e) {
      resolve({ url, error: e.message });
    }
  });
}

async function run() {
  const report = {};

  // 1. Backend Engineer
  console.log('1. Query: Backend Engineer');
  const be = await fetchJson('https://freehire.me/api/v1/agent/jobs/search?q=Backend+Engineer&limit=10&description_format=markdown');
  report.backend_engineer = {
    total: be.data?.meta?.total,
    durationMs: be.durationMs,
    sample: be.data?.data?.slice(0, 3)
  };

  // 2. Software Engineer
  console.log('2. Query: Software Engineer');
  const swe = await fetchJson('https://freehire.me/api/v1/agent/jobs/search?q=Software+Engineer&limit=10&description_format=markdown');
  report.software_engineer = {
    total: swe.data?.meta?.total,
    durationMs: swe.durationMs,
    sample: swe.data?.data?.slice(0, 3)
  };

  // 3. Node.js
  console.log('3. Query: Node.js (q and skills)');
  const nodeQ = await fetchJson('https://freehire.me/api/v1/agent/jobs/search?q=Node.js&limit=10');
  const nodeSkill = await fetchJson('https://freehire.me/api/v1/agent/jobs/search?skills=nodejs&limit=10');
  report.nodejs = {
    q_total: nodeQ.data?.meta?.total,
    skills_total: nodeSkill.data?.meta?.total,
    durationMs: nodeSkill.durationMs
  };

  // 4. Bangalore / Bengaluru
  console.log('4. Query: Bangalore (cities=Bengaluru & countries=IN)');
  const blr = await fetchJson('https://freehire.me/api/v1/agent/jobs/search?cities=Bengaluru&limit=10&description_format=markdown');
  report.bangalore = {
    total: blr.data?.meta?.total,
    durationMs: blr.durationMs,
    sample: blr.data?.data?.slice(0, 5)
  };

  // 5. Remote Jobs
  console.log('5. Query: Remote Backend Jobs');
  const remote = await fetchJson('https://freehire.me/api/v1/agent/jobs/search?q=Backend+Engineer&work_mode=remote&limit=10&description_format=markdown');
  report.remote = {
    total: remote.data?.meta?.total,
    durationMs: remote.durationMs,
    sample: remote.data?.data?.slice(0, 3)
  };

  // 6. Pagination test
  console.log('6. Pagination test (offset 0, 10, 20)');
  const p1 = await fetchJson('https://freehire.me/api/v1/agent/jobs/search?q=Backend+Engineer&limit=10&offset=0');
  const p2 = await fetchJson('https://freehire.me/api/v1/agent/jobs/search?q=Backend+Engineer&limit=10&offset=10');
  const p3 = await fetchJson('https://freehire.me/api/v1/agent/jobs/search?q=Backend+Engineer&limit=10&offset=20');
  const allSlugs = [
    ...(p1.data?.data || []).map(j => j.public_slug),
    ...(p2.data?.data || []).map(j => j.public_slug),
    ...(p3.data?.data || []).map(j => j.public_slug)
  ];
  const uniqueSlugs = Array.from(new Set(allSlugs));
  report.pagination = {
    requested: 30,
    received: allSlugs.length,
    uniqueCount: uniqueSlugs.length,
    hasDuplicates: allSlugs.length !== uniqueSlugs.length,
    offsetsWorking: p1.data?.data?.[0]?.public_slug !== p2.data?.data?.[0]?.public_slug
  };

  // 7. Check Employer Application URLs (Sample of 10 jobs)
  console.log('7. Verifying employer application URLs...');
  const sampleJobs = [
    ...(blr.data?.data || []).slice(0, 5),
    ...(remote.data?.data || []).slice(0, 5)
  ];
  report.url_checks = [];
  for (const job of sampleJobs) {
    if (job.url) {
      const res = await checkUrl(job.url);
      report.url_checks.push({
        title: job.title,
        company: job.company,
        source: job.source,
        url: job.url,
        http_status: res.status,
        redirect: res.location || null
      });
    }
  }

  // 8. Inspect Freshness and Reality Metrics
  console.log('8. Analyzing posting dates and freshness...');
  const dates = (blr.data?.data || []).map(j => ({
    title: jobTitle = j.title,
    posted_at: j.posted_at,
    age_days: j.reality?.age_days,
    class: j.reality?.class,
    fake_freshness: j.reality?.fake_freshness,
    experience_years_min: j.enrichment?.experience_years_min
  }));
  report.freshness_samples = dates;

  // 9. Latency Benchmark across 5 rapid requests
  console.log('9. Benchmarking latency and rate limit decay...');
  const latency = [];
  for (let i = 0; i < 5; i++) {
    const res = await fetchJson('https://freehire.me/api/v1/agent/jobs/search?q=TypeScript&limit=5');
    latency.push({
      durationMs: res.durationMs,
      limit: res.headers.limit,
      remaining: res.headers.remaining,
      reset: res.headers.reset
    });
  }
  report.latency_benchmarks = latency;

  fs.writeFileSync('research/freehire-deep-results.json', JSON.stringify(report, null, 2));
  console.log('\nAll tests complete! Results written to research/freehire-deep-results.json');
}

run();

