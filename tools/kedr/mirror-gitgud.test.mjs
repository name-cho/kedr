import assert from 'node:assert/strict';
import test from 'node:test';
import {
  branchesToDelete,
  encodeProjectPath,
  missingAssetLinks,
  protectedBranchPayload,
  releaseDescription,
} from './mirror-gitgud.mjs';

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
