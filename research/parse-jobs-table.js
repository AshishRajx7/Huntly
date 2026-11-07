const fs = require('fs');
const text = fs.readFileSync('research/ashby-tracker-db.js', 'utf8');

const start = text.indexOf('CREATE TABLE IF NOT EXISTS jobs (');
console.log(text.slice(start, start + 1200));

