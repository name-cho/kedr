import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GITGUD_API = 'https://gitgud.io/api/v4';
const GITHUB_API = 'https://api.github.com';
const PROJECTS = [
  { github: 'name-cho/kedr', gitgud: 'name-cho/kedr' },
  { github: 'name-cho/kedr-python', gitgud: 'name-cho/kedr-python' },
];

export function encodeProjectPath(path) {
  return encodeURIComponent(path);
}

export function branchesToDelete(branches, keep = 'main') {
  return branches.map((branch) => branch.name).filter((name) => name !== keep).sort();
}

export function releaseDescription(release) {
  const body = release.body ?? '';
  return `${body}\n\n---\nMirror of ${release.html_url}. Download links point to the original GitHub release assets.`;
}

export function missingAssetLinks(existingLinks, assets) {
  const known = new Set(existingLinks.map((link) => link.url));
  return assets.filter((asset) => !known.has(asset.browser_download_url));
}

export function protectedBranchPayload(protection) {
  const level = (levels, fallback) => levels?.[0]?.access_level ?? fallback;
  return {
    name: protection.name,
    push_access_level: level(protection.push_access_levels, 40),
    merge_access_level: level(protection.merge_access_levels, 40),
    unprotect_access_level: level(protection.unprotect_access_levels, 40),
    allow_force_push: Boolean(protection.allow_force_push),
    code_owner_approval_required: Boolean(protection.code_owner_approval_required),
  };
}

function redact(text, token) {
  if (!token) return text;
  return text.split(token).join('***');
}

function runGit(args, options = {}) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...options,
    env: { ...process.env, ...options.env },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = redact(`${result.stdout ?? ''}\n${result.stderr ?? ''}`, options.env?.GIT_ASKPASS_PASSWORD);
    throw new Error(`git ${args[0]} failed: ${details.trim()}`);
  }
  return result.stdout;
}

function createAskpass(directory) {
  const path = join(directory, 'askpass.sh');
  writeFileSync(path, '#!/bin/sh\ncase "$1" in\n  *sername*) printf \'%s\\n\' "$GIT_ASKPASS_USERNAME" ;;\n  *assword*) printf \'%s\\n\' "$GIT_ASKPASS_PASSWORD" ;;\n  *) exit 1 ;;\nesac\n', { mode: 0o700 });
  return path;
}

function gitAuthEnv(directory, username, token) {
  return {
    GIT_ASKPASS: createAskpass(directory),
    GIT_ASKPASS_USERNAME: username,
    GIT_ASKPASS_PASSWORD: token,
    GIT_TERMINAL_PROMPT: '0',
  };
}

async function apiFetch(url, { token, method = 'GET', body, allow404 = false, header = 'PRIVATE-TOKEN' } = {}) {
  const headers = { Accept: 'application/json', 'User-Agent': 'kedr-mirror' };
  if (token) headers[header] = header === 'Authorization' ? `Bearer ${token}` : token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  if (response.status === 404 && allow404) return null;
  if (!response.ok) {
    throw new Error(`${method} ${url} failed: ${response.status} ${redact(text, token)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function gitgud(path, options = {}) {
  return apiFetch(`${GITGUD_API}${path}`, { ...options, token: options.token, header: 'PRIVATE-TOKEN' });
}

async function gitgudList(path, token, { allow404 = false } = {}) {
  const items = [];
  for (let page = 1; ; page++) {
    const separator = path.includes('?') ? '&' : '?';
    const batch = await gitgud(`${path}${separator}per_page=100&page=${page}`, { token, allow404 });
    if (batch === null && allow404 && page === 1) return [];
    if (!Array.isArray(batch)) throw new Error(`expected a list from ${path}`);
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

async function github(path, token) {
  try {
    return await apiFetch(`${GITHUB_API}${path}`, { token, header: 'Authorization' });
  } catch (error) {
    if (token && /failed: (401|403|404)/.test(error.message)) {
      return apiFetch(`${GITHUB_API}${path}`, { header: 'Authorization' });
    }
    throw error;
  }
}

async function githubList(path, token) {
  const items = [];
  for (let page = 1; ; page++) {
    const separator = path.includes('?') ? '&' : '?';
    const batch = await github(`${path}${separator}per_page=100&page=${page}`, token);
    if (!Array.isArray(batch)) throw new Error(`expected a list from ${path}`);
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

async function gitgudUsername(token) {
  try {
    const user = await gitgud('/user', { token });
    if (user?.username) return user.username;
  } catch {
  }
  return 'git';
}

function parseRefs(output) {
  const refs = {};
  for (const line of output.split('\n')) {
    const match = /^([0-9a-f]{40,64})\s+(.+)$/.exec(line.trim());
    if (match) refs[match[2]] = match[1];
  }
  return refs;
}

function runCommand(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${(result.stderr ?? '').trim()}`);
  return result.stdout;
}

async function createDeployKey(projectId, token, directory, name, sshHost) {
  const keyPath = join(directory, `id_ed25519_${name}`);
  const knownHostsPath = join(directory, `known_hosts_${name}`);
  runCommand('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', keyPath, '-C', `kedr-mirror-${name}`]);
  const publicKey = readFileSync(`${keyPath}.pub`, 'utf8').trim();
  const key = await gitgud(`/projects/${projectId}/deploy_keys`, {
    token,
    method: 'POST',
    body: { title: `kedr-mirror-${name}-${Date.now()}`, key: publicKey, can_push: true },
  });
  try {
    const knownHosts = runCommand('ssh-keyscan', ['-T', '10', sshHost]);
    if (!knownHosts.trim()) throw new Error('ssh-keyscan returned no host keys');
    writeFileSync(knownHostsPath, knownHosts);
  } catch (error) {
    await gitgud(`/projects/${projectId}/deploy_keys/${key.id}`, { token, method: 'DELETE' });
    rmSync(keyPath, { force: true });
    rmSync(`${keyPath}.pub`, { force: true });
    throw error;
  }
  return {
    env: {
      GIT_TERMINAL_PROMPT: '0',
      GIT_SSH_COMMAND: `ssh -i ${keyPath} -o IdentitiesOnly=yes -o UserKnownHostsFile=${knownHostsPath} -o StrictHostKeyChecking=yes`,
    },
    async cleanup() {
      try {
        await gitgud(`/projects/${projectId}/deploy_keys/${key.id}`, { token, method: 'DELETE' });
      } finally {
        rmSync(keyPath, { force: true });
        rmSync(`${keyPath}.pub`, { force: true });
        rmSync(knownHostsPath, { force: true });
      }
    },
  };
}

async function unprotectedBranch(projectId, branch, token) {
  return gitgud(`/projects/${projectId}/protected_branches/${encodeURIComponent(branch)}`, { token, allow404: true });
}

async function deleteBranchProtection(projectId, branch, token) {
  const protection = await unprotectedBranch(projectId, branch, token);
  if (!protection) return null;
  await gitgud(`/projects/${projectId}/protected_branches/${encodeURIComponent(branch)}`, { token, method: 'DELETE' });
  return protection;
}

async function restoreBranchProtection(projectId, protection, token) {
  if (!protection) return;
  await gitgud(`/projects/${projectId}/protected_branches`, { token, method: 'POST', body: protectedBranchPayload(protection) });
}

async function protectedTag(projectId, tag, token) {
  const tags = await gitgudList(`/projects/${projectId}/protected_tags`, token, { allow404: true });
  return tags.find((item) => item.name === tag) ?? null;
}

async function syncReleases(project, projectId, token, githubToken) {
  const releases = await githubList(`/repos/${project.github}/releases`, githubToken);
  const mirrored = [];
  for (const release of releases.filter((item) => !item.draft)) {
    const tag = encodeURIComponent(release.tag_name);
    const existing = await gitgud(`/projects/${projectId}/releases/${tag}`, { token, allow404: true });
    const payload = {
      tag_name: release.tag_name,
      name: release.name || release.tag_name,
      description: releaseDescription(release),
      released_at: release.published_at || release.created_at,
    };
    if (existing) {
      await gitgud(`/projects/${projectId}/releases/${tag}`, { token, method: 'PUT', body: payload });
    } else {
      await gitgud(`/projects/${projectId}/releases`, { token, method: 'POST', body: payload });
    }
    const links = await gitgudList(`/projects/${projectId}/releases/${tag}/assets/links`, token);
    for (const asset of missingAssetLinks(links, release.assets ?? [])) {
      await gitgud(`/projects/${projectId}/releases/${tag}/assets/links`, {
        token,
        method: 'POST',
        body: { name: asset.name, url: asset.browser_download_url, link_type: 'package' },
      });
    }
    mirrored.push({ tag: release.tag_name, name: payload.name, assets: (release.assets ?? []).length });
  }
  return mirrored;
}

async function syncProject(project, workDir, authDir, token, githubToken, username) {
  const safeName = project.gitgud.replaceAll('/', '-');
  const sourceDir = join(workDir, `source-${safeName}.git`);
  const backupDir = join(workDir, `backup-${safeName}.git`);
  const bundlePath = join(workDir, `gitgud-backup-${safeName}.bundle`);
  const reportPath = join(workDir, `gitgud-report-${safeName}.json`);
  const gitgudUrl = `https://gitgud.io/${project.gitgud}.git`;
  const githubUrl = `https://github.com/${project.github}.git`;
  const authEnv = gitAuthEnv(authDir, username, token);

  console.log(`[${project.gitgud}] read project`);
  const gitgudProject = await gitgud(`/projects/${encodeProjectPath(project.gitgud)}`, { token });
  const projectId = gitgudProject.id;
  if (gitgudProject.default_branch !== 'main') {
    await gitgud(`/projects/${projectId}`, { token, method: 'PUT', body: { default_branch: 'main' } });
  }

  console.log(`[${project.gitgud}] clone GitHub`);
  runGit(['clone', '--mirror', githubUrl, sourceDir]);
  console.log(`[${project.gitgud}] clone GitGud backup`);
  runGit(['clone', '--mirror', gitgudUrl, backupDir], { env: authEnv });
  const backupRefs = parseRefs(runGit(['-C', backupDir, 'show-ref']));
  writeFileSync(join(workDir, `gitgud-refs-${safeName}.json`), JSON.stringify(backupRefs, null, 2));
  console.log(`[${project.gitgud}] create backup bundle`);
  runGit(['-C', backupDir, 'bundle', 'create', bundlePath, '--all']);
  runGit(['-C', backupDir, 'bundle', 'verify', bundlePath]);

  const sourceRefs = parseRefs(runGit(['-C', sourceDir, 'show-ref']));
  const beforeBranches = await gitgudList(`/projects/${projectId}/repository/branches`, token);
  const beforeTags = await gitgudList(`/projects/${projectId}/repository/tags`, token);
  const deleteNames = branchesToDelete(beforeBranches);
  const sshUrl = gitgudProject.ssh_url_to_repo || `git@ssh.gitgud.io:${project.gitgud}.git`;
  const sshHost = sshUrl.replace(/^git@/, '').split(':')[0];
  console.log(`[${project.gitgud}] create temporary deploy key`);
  const deployKey = await createDeployKey(projectId, token, authDir, safeName, sshHost);
  const tagProtections = [];
  const deletedBranches = [];
  let mainProtection = null;

  try {
    console.log(`[${project.gitgud}] unprotect main`);
    mainProtection = await deleteBranchProtection(projectId, 'main', token);
    for (const tag of Object.keys(sourceRefs).filter((ref) => ref.startsWith('refs/tags/'))) {
      const name = tag.slice('refs/tags/'.length);
      const protection = await protectedTag(projectId, name, token);
      if (protection) {
        await gitgud(`/projects/${projectId}/protected_tags/${encodeURIComponent(name)}`, { token, method: 'DELETE' });
        tagProtections.push(protection);
      }
    }
    console.log(`[${project.gitgud}] push main`);
    runGit(['-C', sourceDir, 'push', sshUrl, 'refs/heads/main:refs/heads/main', '--force'], { env: deployKey.env });
    console.log(`[${project.gitgud}] push tags`);
    runGit(['-C', sourceDir, 'push', sshUrl, 'refs/tags/*:refs/tags/*', '--force'], { env: deployKey.env });
    for (const name of deleteNames) {
      console.log(`[${project.gitgud}] delete branch ${name}`);
      await deleteBranchProtection(projectId, name, token);
      await gitgud(`/projects/${projectId}/repository/branches/${encodeURIComponent(name)}`, { token, method: 'DELETE' });
      deletedBranches.push(name);
    }
  } finally {
    try {
      await restoreBranchProtection(projectId, mainProtection, token);
      for (const protection of tagProtections) {
        await gitgud(`/projects/${projectId}/protected_tags`, {
          token,
          method: 'POST',
          body: { name: protection.name, create_access_level: protection.create_access_levels?.[0]?.access_level ?? 40 },
        });
      }
    } finally {
      await deployKey.cleanup();
    }
  }

  console.log(`[${project.gitgud}] sync releases`);
  const releases = await syncReleases(project, projectId, token, githubToken);
  console.log(`[${project.gitgud}] verify refs and releases`);
  const afterBranches = await gitgudList(`/projects/${projectId}/repository/branches`, token);
  const afterTags = await gitgudList(`/projects/${projectId}/repository/tags`, token);
  const remoteRefs = parseRefs(runGit(['ls-remote', gitgudUrl], { env: authEnv }));
  if (afterBranches.map((branch) => branch.name).sort().join(',') !== 'main') {
    throw new Error(`${project.gitgud} must contain only main after sync`);
  }
  if (remoteRefs['refs/heads/main'] !== sourceRefs['refs/heads/main']) {
    throw new Error(`${project.gitgud} main does not match GitHub`);
  }
  for (const [ref, sha] of Object.entries(sourceRefs)) {
    if (ref.startsWith('refs/tags/') && remoteRefs[ref] !== sha) {
      throw new Error(`${project.gitgud} tag ${ref} does not match GitHub`);
    }
  }
  const afterReleaseTags = new Set((await gitgudList(`/projects/${projectId}/releases`, token)).map((release) => release.tag_name));
  for (const release of releases) {
    if (!afterReleaseTags.has(release.tag)) throw new Error(`${project.gitgud} is missing release ${release.tag}`);
  }

  const report = {
    project: project.gitgud,
    github: project.github,
    main: { before: backupRefs['refs/heads/main'] ?? null, after: sourceRefs['refs/heads/main'] },
    deletedBranches,
    tags: { before: beforeTags.map((tag) => tag.name), after: afterTags.map((tag) => tag.name) },
    releases,
    backupBundle: bundlePath,
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Synced ${project.gitgud}: main ${report.main.after}, deleted branches ${deletedBranches.length}, releases ${releases.length}`);
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const workIndex = args.indexOf('--work-dir');
  const workDir = resolve(workIndex >= 0 ? args[workIndex + 1] : 'gitgud-mirror-work');
  const token = process.env.GITGUD_TOKEN;
  const githubToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITGUD_TOKEN is required');
  mkdirSync(workDir, { recursive: true });
  const tempDir = mkdtempSync(join(tmpdir(), 'kedr-gitgud-'));
  try {
    const username = await gitgudUsername(token);
    const reports = [];
    for (const project of PROJECTS) {
      reports.push(await syncProject(project, workDir, tempDir, token, githubToken, username));
    }
    writeFileSync(join(workDir, 'gitgud-report.json'), JSON.stringify(reports, null, 2));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
