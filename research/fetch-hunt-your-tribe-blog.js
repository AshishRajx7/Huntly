const https = require('https');
const fs = require('fs');

https.get('https://blog.huntyourtribe.com/how-to-use-claude-ai-for-job-search-india/', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('research/hunt-your-tribe-mcp-blog.html', data);
    console.log('Saved blog HTML (length: ' + data.length + ')');
    
    // Look for JSON configuration blocks or mcpServers
    const matches = data.match(/"mcpServers"[\s\S]*?\}/gi) || [];
    console.log('mcpServers matches:', matches);

    // Look for URLs or commands
    const urls = data.match(/https?:\/\/[^\s"'<>\\]+mcp[^\s"'<>\\]*/gi) || [];
    console.log('MCP URLs found:', Array.from(new Set(urls)));
  });
}).on('error', console.error);

