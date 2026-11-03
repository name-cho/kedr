import { parseArgs } from 'node:util';

const GITGUD_API = 'https://gitgud.io/api/v4';
const GITHUB_API = 'https://api.github.com';
const PROJECTS = [
  { github: 'name-cho/kedr', gitgud: 'name-cho/kedr' },
  { github: 'name-cho/kedr-python', gitgud: 'name-cho/kedr-python' },
];

export function missingLinks(links, assets) {
  const known = new Set(links.map((link) => link.url));
  return assets.filter((asset) => !known.has(asset.browser_download_url)).map((asset) => asset.name);
}

export function checkRelease({ project, tag, release, links, assets }) {
  const problems = [];
  if (!release) problems.push(`${project}: GitGud has no release ${tag}`);
  const missing = missingLinks(links, assets);
  if (missing.length > 0) problems.push(`${project}: missing asset links ${missing.join(', ')}`);
  return problems;
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'kedr-release-check', ...headers } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response.json();
}

async function getAllPages(url, headers) {
  const items = [];
  for (let page = 1; ; page++) {
    const separator = url.includes('?') ? '&' : '?';
    const batch = await getJson(`${url}${separator}per_page=100&page=${page}`, headers);
    if (!Array.isArray(batch)) throw new Error(`expected a list from ${url}`);
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

async function main() {
  const { values } = parseArgs({ options: { tag: { type: 'string' } } });
  const tag = values.tag;
  if (!tag) throw new Error('usage: node check-release-links.mjs --tag <tag>');
  const gitgudToken = process.env.GITGUD_TOKEN;
  const gitgudHeaders = gitgudToken ? { 'PRIVATE-TOKEN': gitgudToken } : {};
  const problems = [];

  for (const project of PROJECTS) {
    const release = await getJson(`${GITHUB_API}/repos/${project.github}/releases/tags/${encodeURIComponent(tag)}`);
    if (!release) {
      console.log(`${project.github}: no GitHub release ${tag}, skipped`);
      continue;
    }
    if (release.draft) {
      console.log(`${project.github}: ${tag} is still a draft, skipped`);
      continue;
    }
    const projectId = encodeURIComponent(project.gitgud);
    const mirror = await getJson(`${GITGUD_API}/projects/${projectId}/releases/${encodeURIComponent(tag)}`, gitgudHeaders);
    const links = mirror
      ? await getAllPages(`${GITGUD_API}/projects/${projectId}/releases/${encodeURIComponent(tag)}/assets/links`, gitgudHeaders)
      : [];
    problems.push(...checkRelease({
      project: project.gitgud,
      tag,
      release: mirror,
      links,
      assets: release.assets ?? [],
    }));
    console.log(`${project.gitgud}: ${tag} has ${(release.assets ?? []).length} GitHub assets and ${links.length} mirror links`);
  }

  if (problems.length > 0) throw new Error(problems.join('\n'));
  console.log(`release links are complete for ${tag}`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
