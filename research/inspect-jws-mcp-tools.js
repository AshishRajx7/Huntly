const fs = require('fs');

const mcp = fs.readFileSync('research/jws-rsc-mcp-guide.txt', 'utf8');

// Find all occurrences of tool names or descriptions
const regex = /(search_[a-z_]+|get_[a-z_]+|[a-z_]+_tool|[a-z_]+_jobs|[a-z_]+_startups)/gi;
const matches = mcp.match(regex);
console.log('Matches for tools:', Array.from(new Set(matches)));

// Let's dump all text around tool definitions
const blocks = mcp.split('\"');
console.log('\nRelevant text blocks from MCP guide:');
for (let i = 0; i < blocks.length; i++) {
  const b = blocks[i];
  if (b.toLowerCase().includes('tool') || b.toLowerCase().includes('schema') || b.toLowerCase().includes('parameters') || b.includes('https://jobswithstartups.com/mcp')) {
    if (b.length > 20 && b.length < 500) {
      console.log(`[${i}]`, b);
    }
  }
}

