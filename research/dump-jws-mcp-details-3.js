const fs = require('fs');
const mcp = fs.readFileSync('research/jws-rsc-mcp-guide.txt', 'utf8');
const blocks = mcp.split('\"');

const interesting = [];
for (let i = 2180; i < 2600; i++) {
  const b = blocks[i];
  if (b && b.length > 5 && !b.startsWith('/_next') && !b.startsWith('$') && !b.startsWith('mcp-guide') && !b.startsWith('M') && !b.startsWith('m')) {
    interesting.push(`[${i}] ${b}`);
  }
}
console.log(interesting.slice(0, 100).join('\n'));

