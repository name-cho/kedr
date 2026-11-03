import assert from 'node:assert/strict';
import test from 'node:test';
import { checkRelease, missingLinks } from './check-release-links.mjs';

const assets = [
  { name: 'kedr-studio.win.zip', browser_download_url: 'https://github.com/a/kedr-studio.win.zip' },
  { name: 'kedr-studio.exe', browser_download_url: 'https://github.com/a/kedr-studio.exe' },
];

test('missing links lists only absent assets', () => {
  const links = [{ url: 'https://github.com/a/kedr-studio.win.zip' }];
  assert.deepEqual(missingLinks(links, assets), ['kedr-studio.exe']);
  assert.deepEqual(missingLinks(assets.map((a) => ({ url: a.browser_download_url })), assets), []);
});

test('a missing GitGud release is a problem', () => {
  const problems = checkRelease({ project: 'name-cho/kedr', tag: 'v1.2.0', release: null, links: [], assets });
  assert.equal(problems.length, 2);
  assert.match(problems[0], /has no release v1\.2\.0/);
});

test('a complete mirror has no problems', () => {
  const links = assets.map((asset) => ({ url: asset.browser_download_url }));
  assert.deepEqual(checkRelease({ project: 'name-cho/kedr', tag: 'v1.2.0', release: {}, links, assets }), []);
});
