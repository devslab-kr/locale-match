import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = path.join(root, 'docs', 'assets', 'brand');
const guide = 'https://devslab.kr/brand/open-source/';
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const asset = (relative) => path.join(brandDir, relative);

function expect(value, expected, message) {
  if (!value.includes(expected)) throw new Error(`${message}: expected ${JSON.stringify(expected)}`);
}

function reject(value, pattern, message) {
  if (pattern.test(value)) throw new Error(message);
}

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

const readmePaths = [
  'README.md',
  'README.ko.md',
  'packages/locale-match/README.md',
  'packages/locale-match/README.ko.md',
  'packages/locale-match-react/README.md',
  'packages/locale-match-react/README.ko.md',
  'packages/locale-match-vue/README.md',
  'packages/locale-match-vue/README.ko.md',
  'packages/locale-match-nuxt/README.md',
  'packages/locale-match-nuxt/README.ko.md',
];

const [site, checksums, ciWorkflow, publishWorkflow, ...readmes] = await Promise.all([
  read('site/index.html'),
  readFile(asset('checksums.txt'), 'utf8'),
  read('.github/workflows/ci.yml'),
  read('.github/workflows/publish.yml'),
  ...readmePaths.map(read),
]);

const expectedAssets = new Map(
  checksums.trim().split('\n').map((line) => {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match) throw new Error(`invalid O07 checksum entry: ${line}`);
    return [match[2], match[1]];
  }),
);

if (expectedAssets.size === 0) throw new Error('O07 checksums are empty');
for (const [relative, expectedHash] of expectedAssets) {
  const file = asset(relative);
  await access(file);
  if ((await sha256(file)) !== expectedHash) throw new Error(`checksum mismatch for docs/assets/brand/${relative}`);
}

const glyph = await readFile(asset('glyph-color.svg'), 'utf8');
expect(glyph, 'data-oss-project="O07"', 'O07 registry id');
expect(glyph, 'M5 8H10L15 16', 'O07 resolution-path upper branch');
expect(glyph, 'M5 24H10L15 16', 'O07 resolution-path lower branch');
expect(glyph, 'M15 16H27', 'O07 resolved output path');
reject(glyph, /flag|globe/i, 'O07 glyph must not use flag or globe imagery');

const lockup = await readFile(asset('lockup-endorsed.svg'), 'utf8');
expect(lockup, 'data-oss-lockup="O07"', 'O07 endorsed lockup registry id');

for (const [relative, contents] of readmePaths.map((file, index) => [file, readmes[index]])) {
  expect(contents, 'docs/assets/brand/readme-header.png', `${relative} O07 README header`);
  expect(contents, guide, `${relative} canonical OSS brand guide`);
  expect(contents, relative.endsWith('.ko.md') ? 'DevsLab 오픈소스' : 'Open source by DevsLab', `${relative} localized endorsement`);
}

for (const [relative, source] of [
  ['site/favicon.svg', 'favicon.svg'],
  ['site/favicon.ico', 'favicon.ico'],
  ['site/apple-touch-icon.png', 'apple-touch-icon.png'],
  ['site/og.png', 'og.png'],
]) {
  const file = path.join(root, relative);
  await access(file);
  if ((await sha256(file)) !== expectedAssets.get(source)) throw new Error(`${relative} must match vendored O07 ${source}`);
}

expect(site, '<link rel="canonical" href="https://devslab-kr.github.io/locale-match/"', 'site canonical URL');
expect(site, 'href="favicon.svg"', 'local SVG favicon metadata');
expect(site, 'href="favicon.ico"', 'local ICO favicon metadata');
expect(site, 'href="apple-touch-icon.png"', 'local Apple touch metadata');
expect(site, 'content="https://devslab-kr.github.io/locale-match/og.png"', 'absolute O07 social image');
expect(site, '<meta property="og:image:width" content="1200"', 'Open Graph image width');
expect(site, '<meta property="og:image:height" content="630"', 'Open Graph image height');
expect(site, '<meta property="og:image:alt"', 'Open Graph image alt text');
expect(site, '<meta name="twitter:image:alt"', 'Twitter image alt text');
expect(site, guide, 'canonical OSS brand guide');
expect(site, 'hero-atmosphere', 'project hero atmosphere');
expect(site, 'data-atmosphere="project"', 'project atmosphere variant');
expect(site, 'opacity: 0.10;', 'dark-mode atmosphere cap');
expect(site, 'aria-hidden="true"', 'decorative atmosphere is hidden');
expect(site, 'pointer-events: none', 'decorative atmosphere ignores input');
expect(site, '@media (forced-colors: active), print', 'forced-colors and print fallback');
expect(site, 'LocaleMatch.createLocaleResolver', 'locale playground runtime');
expect(site, 'function run()', 'locale playground render guard');
reject(site, /https:\/\/devslab\.kr\/favicon\.ico/, 'site must not retain the remote corporate favicon');
reject(site, /<(?:img|svg)[^>]+(?:flag|globe)/i, 'site must not introduce flag or globe imagery');

for (const [workflow, source] of [
  ['CI', ciWorkflow],
  ['publish', publishWorkflow],
]) {
  expect(source, '- run: pnpm verify', `${workflow} workflow must run the standard brand-aware verification gate`);
}

console.log(`check:brand: verified O07 resolution path, ${readmePaths.length} localized READMEs, metadata, and ${expectedAssets.size} checksummed assets`);
