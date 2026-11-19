import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist');
const template = readFileSync(join(root, 'scripts/service-worker.js'), 'utf8');
const revision = createHash('sha256').update(template);

// The HTML declares the browser scripts. All artwork, including lazy-loaded levels, lives under assets.
const html = readFileSync(join(root, 'index.html'), 'utf8');
const files = ['index.html', 'style.css', 'manifest.webmanifest',
  ...Array.from(html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g), match => match[1]),
];
function collectAssets(directory) {
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    const path = directory + '/' + entry.name;
    if (entry.isDirectory()) collectAssets(path);
    else if (entry.isFile()) files.push(path);
  }
}
collectAssets('assets');
const paths = [...new Set(files)].sort();
rmSync(output, { recursive: true, force: true });
for (const path of paths) {
  const bytes = readFileSync(join(root, path));
  revision.update(path).update('\0').update(createHash('sha256').update(bytes).digest());
  mkdirSync(dirname(join(output, path)), { recursive: true });
  writeFileSync(join(output, path), bytes);
}
const urls = paths.map(path => path === 'index.html' ? './' : './' + path);
const manifest = 'const release = ' + JSON.stringify(revision.digest('hex')) + ';\n' +
  'const files = ' + JSON.stringify(urls) + ';\n';
writeFileSync(join(output, 'sw.js'), manifest + template);
console.log(`Built ${paths.length} offline assets and sw.js in dist/`);
