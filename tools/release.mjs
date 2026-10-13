// Bumps the cache-busting VERSION in index.html and refreshes its module list
// from src/. Run before every commit that changes the game.
// Usage: node tools/release.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const file = new URL('../index.html', import.meta.url);
const srcDir = new URL('../src/', import.meta.url);
let html = readFileSync(file, 'utf8');
const modules = readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();
const version = Number(html.match(/var VERSION = '(\d+)'/)[1]) + 1;
html = html
  .replace(/var VERSION = '\d+'/, `var VERSION = '${version}'`)
  .replace(/var MODULES = \[[^\]]*\]/, `var MODULES = ${JSON.stringify(modules).replace(/"/g, "'").replace(/,/g, ', ')}`);
writeFileSync(file, html);
console.log(`index.html -> version ${version}, ${modules.length} modules`);
