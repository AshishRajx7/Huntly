const fs = require('fs');
const text = fs.readFileSync('research/ashby-tracker-db.js', 'utf8');

// Find all occurrences of CREATE TABLE
const matches = [];
let idx = 0;
while ((idx = text.indexOf('CREATE TABLE', idx)) !== -1) {
  matches.push(text.slice(idx, idx + 400));
  idx += 12;
}
console.log('CREATE TABLE count:', matches.length);
matches.forEach((m, i) => console.log(`\n--- TABLE ${i + 1} ---\n`, m));

