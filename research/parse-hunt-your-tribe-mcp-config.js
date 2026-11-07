const fs = require('fs');

const html = fs.readFileSync('research/hunt-your-tribe-mcp-blog.html', 'utf8');

const idx = html.indexOf('https://api.huntyourtribe.com/mcp');
if (idx !== -1) {
  console.log(html.slice(idx - 200, idx + 1000));
}

