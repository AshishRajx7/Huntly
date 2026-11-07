const fs = require('fs');

const html = fs.readFileSync('research/hunt-your-tribe-home.html', 'utf8');

const faqStart = html.indexOf('What companies does HuntYourTribe index?');
if (faqStart !== -1) {
  const slice = html.slice(faqStart, faqStart + 5000);
  // Extract questions and answers
  const clean = slice.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n');
  console.log(clean);
}

