const fs = require('fs');
const text = fs.readFileSync('research/freehire-api.md', 'utf8');

// Find headings for endpoints
const lines = text.split('\n');
const endpoints = lines.filter(l => l.startsWith('### `GET ') || l.startsWith('### `POST ') || l.startsWith('### `DELETE '));
console.log('Total endpoints in Freehire API:', endpoints.length);
console.log('Sample endpoints:');
endpoints.slice(0, 30).forEach(e => console.log(' ', e.replace('### ', '')));

