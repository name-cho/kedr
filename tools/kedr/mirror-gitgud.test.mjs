import assert from 'node:assert/strict';
import test from 'node:test';
import {
  branchesToDelete,
  encodeProjectPath,
  missingAssetLinks,
  protectedBranchPayload,
  releaseDescription,
  runnerSummary,
} from './mirror-gitgud.mjs';

test('runner summary counts online and Windows runners', () => {
  const summary = runnerSummary([
    { status: 'online', tag_list: ['linux', 'docker'], description: 'shared-linux-1' },
    { status: 'offline', tag_list: ['windows', 'shell'], description: 'win-2022' },
    { online: true, tag_list: ['linux'], name: 'shared-linux-2' },
  ]);
  assert.deepEqual(summary, { total: 3, online: 2, windows: 1, tags: ['docker', 'linux', 'shell', 'windows'] });
});

test('runner summary handles a project without runners', () => {
  assert.deepEqual(runnerSummary([]), { total: 0, online: 0, windows: 0, tags: [] });
  assert.deepEqual(runnerSummary(null), { total: 0, online: 0, windows: 0, tags: [] });
});

test('runner summary detects Windows by description', () => {
  const summary = runnerSummary([{ status: 'online', tag_list: [], description: 'Windows Server 2022' }]);
  assert.equal(summary.windows, 1);
});

test('project paths are encoded for the GitLab API', () => {
  assert.equal(encodeProjectPath('name-cho/kedr'), 'name-cho%2Fkedr');
});

test('branch cleanup keeps main only', () => {
  const branches = [{ name: 'main' }, { name: 'kedr-publish' }, { name: 'feature' }];
  assert.deepEqual(branchesToDelete(branches), ['feature', 'kedr-publish']);
});

test('release description links to the original GitHub release', () => {
  const description = releaseDescription({ body: 'Notes', html_url: 'https://github.com/name-cho/kedr/releases/tag/v1.0.0' });
  assert.ok(description.startsWith('Notes'));
  assert.ok(description.includes('https://github.com/name-cho/kedr/releases/tag/v1.0.0'));
});

test('asset links are added only when the URL is missing', () => {
  const existing = [{ url: 'https://example.test/a' }];
  const assets = [
    { name: 'a', browser_download_url: 'https://example.test/a' },
    { name: 'b', browser_download_url: 'https://example.test/b' },
  ];
  assert.deepEqual(missingAssetLinks(existing, assets), [assets[1]]);
});

test('branch protection restores the recorded access levels', () => {
  const payload = protectedBranchPayload({
    name: 'main',
    push_access_levels: [{ access_level: 40 }],
    merge_access_levels: [{ access_level: 30 }],
    unprotect_access_levels: [{ access_level: 40 }],
    allow_force_push: false,
  });
  assert.deepEqual(payload, {
    name: 'main',
    push_access_level: 40,
    merge_access_level: 30,
    unprotect_access_level: 40,
    allow_force_push: false,
    code_owner_approval_required: false,
  });
});
