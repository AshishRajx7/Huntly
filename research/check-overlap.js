const fs = require('fs');

const fh = JSON.parse(fs.readFileSync('research/freehire-deep-results.json', 'utf8'));
const hyt = JSON.parse(fs.readFileSync('research/hyt-poc-data.json', 'utf8'));

// Extract all companies from Freehire sample
const fhCompanies = new Set();
const fhJobs = [];
Object.values(fh).forEach(v => {
  if (Array.isArray(v.sample)) {
    v.sample.forEach(j => {
      fhCompanies.add((j.company || '').toLowerCase().trim());
      fhJobs.push({ title: j.title, company: j.company, url: j.url });
    });
  }
});

// Extract all companies from HYT sample
const hytCompanies = new Set();
const hytJobs = [];
Object.values(hyt).forEach(v => {
  if (Array.isArray(v.sample)) {
    v.sample.forEach(j => {
      const cname = typeof j.company === 'object' ? j.company.name : j.company;
      hytCompanies.add((cname || '').toLowerCase().trim());
      hytJobs.push({ title: j.title, company: cname, url: j.url });
    });
  }
});

console.log('Freehire sampled companies:', fhCompanies.size);
console.log('HYT sampled companies:', hytCompanies.size);

const companyIntersection = Array.from(fhCompanies).filter(c => hytCompanies.has(c));
console.log('Company intersection in sample:', companyIntersection);

// Check if any URLs match
const fhUrls = new Set(fhJobs.map(j => j.url));
const urlIntersection = hytJobs.filter(j => fhUrls.has(j.url));
console.log('Direct URL intersection:', urlIntersection.length);

