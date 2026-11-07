const { execSync } = require('child_process');
const fs = require('fs');

const scenarioPath = process.argv[2];
const outputPath = process.argv[3];

console.log(`Running REA capture for ${scenarioPath} -> ${outputPath}...`);
try {
  const result = execSync(`npx rea-agents capture-browser-scenario --format json "${scenarioPath}"`, {
    maxBuffer: 50 * 1024 * 1024,
    encoding: 'utf8'
  });
  fs.writeFileSync(outputPath, result, 'utf8');
  console.log(`Successfully captured ${result.length} characters to ${outputPath}`);
} catch (err) {
  console.error('Error running capture:', err.message);
  if (err.stdout) console.log('Stdout:', err.stdout.slice(0, 500));
  if (err.stderr) console.log('Stderr:', err.stderr.slice(0, 500));
}
