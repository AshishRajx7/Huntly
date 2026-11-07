const fs = require('fs');

const html = fs.readFileSync('research/jobpin-job.html', 'utf8');

const regex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
let m;
while ((m = regex.exec(html)) !== null) {
  const href = m[1];
  const text = m[2].replace(/<[^>]+>/g, '').trim();
  if (href.startsWith('http') && !href.includes('jobpin.com')) {
    console.log(`External link: [${text}] -> ${href}`);
  } else if (text.toLowerCase().includes('apply')) {
    console.log(`Internal apply link: [${text}] -> ${href}`);
  }
}

