import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const manifest = JSON.parse(
  readFileSync(new URL('../dist/.vite/manifest.json', import.meta.url), 'utf8')
);
const visited = new Set();
const files = new Set();

function visit(key) {
  if (visited.has(key)) return;
  visited.add(key);
  const chunk = manifest[key];
  if (!chunk) throw new Error(`Missing build manifest entry: ${key}`);
  if (chunk.file.endsWith('.js')) files.add(chunk.file);
  for (const dependency of chunk.imports ?? []) visit(dependency);
}

for (const [key, chunk] of Object.entries(manifest)) {
  if (chunk.isEntry) visit(key);
}
if (!files.size) throw new Error('No initial JavaScript found in the build manifest.');

const bytes = [...files].reduce((sum, file) => {
  const content = readFileSync(new URL(`../dist/${file}`, import.meta.url));
  return sum + gzipSync(content).byteLength;
}, 0);
const budget = 45_000;
console.log(
  `Initial JavaScript: ${(bytes / 1000).toFixed(2)} kB gzip, budget ${budget / 1000} kB.`
);
if (bytes > budget) {
  throw new Error(
    'Initial JavaScript exceeds the startup budget. Check static imports before increasing it.'
  );
}
