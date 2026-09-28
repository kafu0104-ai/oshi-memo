import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve, extname, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
const built = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
if (built.status !== 0) process.exit(built.status ?? 1);
const root = resolve('dist');
const assets = {};
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.json':'application/json', '.woff2':'font/woff2' };
function collect(dir, prefix = '') {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const file = resolve(dir, item.name);
    if (item.isDirectory()) collect(file, `${prefix}/${item.name}`);
    else if (item.isFile()) assets[`${prefix}/${item.name}`] = { type: types[extname(file)] ?? 'application/octet-stream', body: readFileSync(file).toString('base64') };
  }
}
collect(root);
// Icons use stable URLs rather than imports in the development app.
collect(resolve('assets'), '/assets');
mkdirSync(resolve(root,'server'), { recursive:true });
writeFileSync(resolve(root,'server/index.js'), readFileSync('server/sites-worker.mjs','utf8') + `\nexport default createHandler(${JSON.stringify(assets)});\n`);
mkdirSync(resolve(root,'.openai'), { recursive:true });
copyFileSync('.openai/hosting.json', resolve(root,'.openai/hosting.json'));
console.log(`Built protected test site with ${Object.keys(assets).length} assets.`);
