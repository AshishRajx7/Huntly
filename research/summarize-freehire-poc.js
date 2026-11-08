const fs = require('fs');

const data = JSON.parse(fs.readFileSync('research/freehire-deep-results.json', 'utf8'));

console.log('=== Freehire PoC Summary ===');
console.log('Backend Engineer total:', data.backend_engineer.total, 'latency:', data.backend_engineer.durationMs, 'ms');
console.log('Software Engineer total:', data.software_engineer.total, 'latency:', data.software_engineer.durationMs, 'ms');
console.log('Node.js (q) total:', data.nodejs.q_total);
console.log('Node.js (skills) total:', data.nodejs.skills_total, 'latency:', data.nodejs.durationMs, 'ms');
console.log('Bangalore total:', data.bangalore.total, 'latency:', data.bangalore.durationMs, 'ms');
console.log('Remote Backend total:', data.remote.total, 'latency:', data.remote.durationMs, 'ms');

console.log('\nPagination test:');
console.log(data.pagination);

console.log('\nURL Verification Sample:');
data.url_checks.forEach(u => console.log(`- [${u.source}] ${u.company} | ${u.title.slice(0, 30)} -> HTTP ${u.http_status} (${u.url.slice(0, 60)}...)`));

console.log('\nFreshness Sample:');
data.freshness_samples.forEach(f => console.log(`- ${f.posted_at} | Age: ${f.age_days}d | Class: ${f.class} | FakeFresh: ${f.fake_freshness} | MinExp: ${f.experience_years_min || 'N/A'}`));

console.log('\nLatency benchmarks:');
data.latency_benchmarks.forEach(l => console.log(`- ${l.durationMs}ms (Remaining: ${l.remaining}/${l.limit})`));

