const fs = require('fs');
const mcp = fs.readFileSync('research/jws-rsc-mcp-guide.txt', 'utf8');
const blocks = mcp.split('\"');

const interesting = [];
for (let i = 1500; i < 5200; i++) {
  const b = blocks[i];
  if (b && b.length > 3 && !b.startsWith('/_next') && !b.startsWith('$') && !b.startsWith('mcp-guide')) {
    interesting.push(`[${i}] ${b}`);
  }
}
console.log(interesting.slice(0, 100).join('\n'));

