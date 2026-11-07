const fs = require('fs');
const text = fs.readFileSync('research/ats-jobs-fetch.js', 'utf8');

const start = text.indexOf('workday');
console.log(text.slice(start, start + 1500));

