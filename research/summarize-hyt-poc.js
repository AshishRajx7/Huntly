const fs = require('fs');

const data = JSON.parse(fs.readFileSync('research/hyt-poc-data.json', 'utf8'));

console.log('=== HuntYourTribe PoC Summary ===');
console.log('Backend Engineer (India) total:', data.backend_india.total, 'latency:', data.backend_india.durationMs, 'ms');
console.log('Software Engineer (Bangalore) total:', data.swe_bangalore.total, 'latency:', data.swe_bangalore.durationMs, 'ms');
console.log('Remote Software Engineer total:', data.swe_remote.total, 'latency:', data.swe_remote.durationMs, 'ms');

console.log('\nPagination & Limits:');
console.log(data.pagination);

console.log('\nJob Details Test:');
console.log('ID:', data.detail_test.id);
console.log('Title:', data.detail_test.title);
console.log('Company:', data.detail_test.company);
console.log('URL:', data.detail_test.url);
console.log('Description Length:', data.detail_test.descriptionLength);
console.log('Keys:', data.detail_test.keys);

console.log('\nURL Verification Sample:');
data.url_verification.forEach(u => console.log(`- ${u.company?.name || u.company} | ${u.title.slice(0, 30)} -> HTTP ${u.http_status} (${u.url.slice(0, 60)}...)`));

console.log('\nFreshness Audit (60-day rule):');
data.freshness_audit.forEach(f => console.log(`- ${f.company} | ${f.title.slice(0, 25)} | ${f.posted_at} | Age: ${f.ageDays}d | <=60d: ${f.under60Days}`));

console.log('\nLatency Benchmarks:');
data.latency_benchmarks.forEach(l => console.log(`- ${l.durationMs}ms (Remaining: ${l.remaining}/${l.limit})`));

