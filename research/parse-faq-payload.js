const fs = require('fs');

const html = fs.readFileSync('research/hunt-your-tribe-home.html', 'utf8');

const query = 'What companies does HuntYourTribe index?';
let idx = 0;
while ((idx = html.indexOf(query, idx)) !== -1) {
  console.log('Match at', idx);
  console.log(html.slice(idx, idx + 800));
  idx += query.length;
}

