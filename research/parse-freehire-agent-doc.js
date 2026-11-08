const fs = require('fs');
const apiDoc = fs.readFileSync('research/freehire-api.md', 'utf8');

const start = apiDoc.indexOf('GET /agent/jobs/search');
if (start !== -1) {
  console.log(apiDoc.slice(start, start + 3000));
}

