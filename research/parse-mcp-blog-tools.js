const fs = require('fs');

const html = fs.readFileSync('research/hunt-your-tribe-mcp-blog.html', 'utf8');

const idx = html.indexOf('Enabling it in a conversation');
if (idx !== -1) {
  const slice = html.slice(idx, idx + 4000);
  console.log(slice.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n'));
}

