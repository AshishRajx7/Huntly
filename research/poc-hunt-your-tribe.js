const https = require('https');
const fs = require('fs');

function callHytMcp(toolName, args) {
  const postData = JSON.stringify({
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 100000),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  });

  const start = Date.now();
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.huntyourtribe.com',
      port: 443,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'HuntlyPoC/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const durationMs = Date.now() - start;
        let parsedPayload = null;
        try {
          // SSE format: event: message\ndata: {...}
          const dataLine = data.split('\n').find(l => l.startsWith('data: '));
          if (dataLine) {
            const rawJson = JSON.parse(dataLine.replace('data: ', ''));
            const textContent = rawJson.result?.content?.[0]?.text;
            if (textContent) {
              parsedPayload = JSON.parse(textContent);
            }
          }
        } catch (e) {}

        resolve({
          status: res.statusCode,
          durationMs,
          headers: {
            limit: res.headers['x-ratelimit-limit'],
            remaining: res.headers['x-ratelimit-remaining'],
            reset: res.headers['x-ratelimit-reset']
          },
          body: parsedPayload,
          rawLen: data.length
        });
      });
    });

    req.on('error', err => resolve({ error: err.message, durationMs: Date.now() - start }));
    req.write(postData);
    req.end();
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
  console.log('=== HuntYourTribe MCP PoC Testing ===\n');
  const report = {};

  // 1. Backend Engineer in India
  console.log('1. Searching for Backend Engineer jobs in India...');
  const beIndia = await callHytMcp('search_jobs', {
    query: 'Backend Engineer',
    country: 'India',
    limit: 10
  });
  console.log(`   Status: ${beIndia.status}, Duration: ${beIndia.durationMs}ms, Found: ${beIndia.body?.jobs?.length}, Total: ${beIndia.body?.meta?.total_count}`);
  report.backend_india = {
    total: beIndia.body?.meta?.total_count,
    durationMs: beIndia.durationMs,
    count: beIndia.body?.jobs?.length,
    sample: beIndia.body?.jobs?.slice(0, 3)
  };

  // 2. Software Engineer in Bangalore
  console.log('2. Searching for Software Engineer jobs in Bangalore / Bengaluru...');
  const sweBlr = await callHytMcp('search_jobs', {
    query: 'Software Engineer',
    city: 'Bengaluru',
    limit: 10
  });
  console.log(`   Status: ${sweBlr.status}, Duration: ${sweBlr.durationMs}ms, Found: ${sweBlr.body?.jobs?.length}, Total: ${sweBlr.body?.meta?.total_count}`);
  report.swe_bangalore = {
    total: sweBlr.body?.meta?.total_count,
    durationMs: sweBlr.durationMs,
    count: sweBlr.body?.jobs?.length,
    sample: sweBlr.body?.jobs?.slice(0, 3)
  };

  // 3. Remote Software Engineering jobs
  console.log('3. Searching for Remote Software Engineering jobs...');
  const sweRemote = await callHytMcp('search_jobs', {
    query: 'Software Engineer',
    work_mode: 'remote',
    limit: 10
  });
  console.log(`   Status: ${sweRemote.status}, Duration: ${sweRemote.durationMs}ms, Found: ${sweRemote.body?.jobs?.length}, Total: ${sweRemote.body?.meta?.total_count}`);
  report.swe_remote = {
    total: sweRemote.body?.meta?.total_count,
    durationMs: sweRemote.durationMs,
    count: sweRemote.body?.jobs?.length,
    sample: sweRemote.body?.jobs?.slice(0, 3)
  };

  // 4. Pagination & Result Limits
  console.log('4. Testing pagination and result limits...');
  const page1 = await callHytMcp('search_jobs', { query: 'Engineer', page: 1, limit: 10 });
  const page2 = await callHytMcp('search_jobs', { query: 'Engineer', page: 2, limit: 10 });
  const limitOver = await callHytMcp('search_jobs', { query: 'Engineer', limit: 50 }); // Max is documented as 25

  const p1Ids = (page1.body?.jobs || []).map(j => j.id);
  const p2Ids = (page2.body?.jobs || []).map(j => j.id);
  const overlap = p1Ids.filter(id => p2Ids.includes(id));

  report.pagination = {
    p1_count: p1Ids.length,
    p2_count: p2Ids.length,
    overlap_count: overlap.length,
    max_limit_enforced: limitOver.body?.jobs?.length || limitOver.body?.meta?.limit,
    meta_p1: page1.body?.meta,
    meta_p2: page2.body?.meta
  };
  console.log(`   Page 1 jobs: ${p1Ids.length}, Page 2 jobs: ${p2Ids.length}, Overlap: ${overlap.length}, Limit 50 resulted in: ${limitOver.body?.jobs?.length} items`);

  // 5. Retrieve Individual Job Details
  console.log('5. Testing get_job_details on sample job IDs...');
  const sampleJobId = sweBlr.body?.jobs?.[0]?.id || beIndia.body?.jobs?.[0]?.id;
  report.detail_test = null;
  if (sampleJobId) {
    const detail = await callHytMcp('get_job_details', { id: sampleJobId });
    report.detail_test = {
      id: sampleJobId,
      status: detail.status,
      durationMs: detail.durationMs,
      keys: Object.keys(detail.body || {}),
      title: detail.body?.title,
      company: detail.body?.company,
      url: detail.body?.url,
      descriptionLength: detail.body?.description?.length || 0,
      descriptionSnippet: detail.body?.description?.slice(0, 300)
    };
    console.log(`   Retrieved job ${sampleJobId}: "${detail.body?.title}" at ${detail.body?.company} (Desc len: ${detail.body?.description?.length})`);
  }

  // 6. Verify Original Employer Application URLs (Sample of 10)
  console.log('6. Verifying employer application URLs across sample jobs...');
  const sampledJobs = [
    ...(sweBlr.body?.jobs || []).slice(0, 5),
    ...(sweRemote.body?.jobs || []).slice(0, 5)
  ];
  report.url_verification = [];
  for (const job of sampledJobs) {
    if (job.url) {
      const res = await checkUrl(job.url);
      report.url_verification.push({
        title: job.title,
        company: job.company,
        url: job.url,
        http_status: res.status,
        redirect: res.location || null
      });
    }
  }

  // 7. Check Posting Dates and Freshness (60-day rule audit)
  console.log('7. Checking posting dates and freshness...');
  const allSampleJobs = [...(beIndia.body?.jobs || []), ...(sweBlr.body?.jobs || [])];
  const now = Date.now();
  const dateAudit = allSampleJobs.map(j => {
    const postedTime = new Date(j.posted_at).getTime();
    const ageDays = Math.round((now - postedTime) / (1000 * 60 * 60 * 24));
    return {
      title: j.title,
      company: j.company,
      posted_at: j.posted_at,
      ageDays,
      under60Days: ageDays <= 60
    };
  });
  report.freshness_audit = dateAudit;

  // 8. Latency and Rate Limit Measurement across 5 requests
  console.log('8. Benchmarking latency and rate limits...');
  const latencies = [];
  for (let i = 0; i < 5; i++) {
    const res = await callHytMcp('search_jobs', { query: 'TypeScript', limit: 5 });
    latencies.push({
      durationMs: res.durationMs,
      limit: res.headers.limit,
      remaining: res.headers.remaining,
      reset: res.headers.reset
    });
  }
  report.latency_benchmarks = latencies;

  fs.writeFileSync('research/hyt-poc-data.json', JSON.stringify(report, null, 2));
  console.log('\nAll tests complete! Results written to research/hyt-poc-data.json');
}

run();

