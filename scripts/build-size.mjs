import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

async function files(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(join(path, entry.name)) : join(path, entry.name)))).flat();
}
const paths = await files('dist');
const data = await Promise.all(paths.map(async path => ({ path: path.replaceAll('\\', '/'), bytes: (await readFile(path)).length })));
const bundles = await Promise.all(paths.filter(path => /\.(js|css)$/.test(path)).map(async path => {
  const bytes = await readFile(path); return { type: path.endsWith('.js') ? 'js' : 'css', bytes: bytes.length, gzip: gzipSync(bytes).length };
}));
console.log(JSON.stringify({ totalBytes: data.reduce((sum, file) => sum + file.bytes, 0), fileCount: paths.length, bundles }, null, 2));
