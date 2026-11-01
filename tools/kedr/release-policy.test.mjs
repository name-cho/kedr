import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

const forbiddenModules = [
  'intellij.pycharm.community.ide.impl.promotion',
  'intellij.java.promo',
  'intellij.vcs.github.ultimatePromo',
];

test('product descriptors do not depend on promo modules', () => {
  for (const path of [
    'python/ide/resources/META-INF/plugin.xml',
    'java/plugin/resources/META-INF/plugin.xml',
    'plugins/github/github-core/resources/META-INF/plugin.xml',
  ]) {
    const content = read(path);
    for (const module of forbiddenModules) {
      assert.ok(!content.includes(module), `${path} still depends on ${module}`);
    }
  }
  const build = read('python/BUILD.bazel');
  const iml = read('python/intellij.pycharm.community.customization.iml');
  assert.ok(!build.includes('intellij.pycharm.community.ide.impl.promotion'));
  assert.ok(!iml.includes('intellij.pycharm.community.ide.impl.promotion'));
});

test('default error reporter saves locally', () => {
  const extensions = read('platform/platform-resources/src/META-INF/PlatformExtensions.xml');
  assert.match(extensions, /<errorHandler implementation="com\.intellij\.diagnostic\.KedrErrorReportSubmitter"\/>/);
  const startup = read('platform/platform-impl/src/com/intellij/platform/ide/bootstrap/StartupErrorReporter.java');
  assert.ok(!startup.includes('ITNProxy'));
  assert.ok(!startup.includes('LogUploader'));
  assert.ok(!startup.includes('uploads.jetbrains.com'));
  assert.ok(startup.includes('JFileChooser'));
  assert.ok(startup.includes('Compressor.Zip'));
  const bundle = read('platform/platform-impl/resources/messages/DiagnosticBundle.properties');
  for (const key of [
    'error.report.kedr.save.action',
    'error.report.kedr.notice',
    'error.report.kedr.save.title',
    'error.report.kedr.save.description',
    'error.report.kedr.save.failed',
    'error.report.kedr.saved.title',
    'error.report.kedr.saved.message',
  ]) {
    assert.ok(bundle.includes(`${key}=`), `missing bundle key: ${key}`);
  }
});

test('heap dump reports are local only', () => {
  const support = read('platform/platform-impl/src/com/intellij/diagnostic/HeapDumpAnalysisSupport.kt');
  assert.ok(!support.includes('ITNReporter'));
  assert.ok(!support.includes('jetbrains.com/company/privacy'));
  assert.ok(support.includes('KedrErrorReportSubmitter'));
  const runnable = read('platform/platform-impl/src/com/intellij/diagnostic/hprof/action/AnalysisRunnable.kt');
  assert.ok(!runnable.includes('ExceptionAutoReportUtil'));
  assert.ok(!runnable.includes('ITNProxyCoroutineScopeHolder'));
  assert.ok(runnable.includes('saveReport'));
});

test('commercial suggestion policy is opt-out for the fork', () => {
  const api = read('platform/platform-api/src/com/intellij/platform/ide/customization/ExternalProductResourceUrls.kt');
  assert.match(api, /val commercialEditionSuggestionsEnabled: Boolean\s+get\(\) = true/);
  for (const path of [
    'idea/customization/base/src/IntelliJIdeaExternalResourceUrls.kt',
    'python/ide-common/src/customization/PyCharmExternalResourceUrls.kt',
  ]) {
    assert.match(read(path), /override val commercialEditionSuggestionsEnabled: Boolean\s+get\(\) = false/);
  }
  const service = read('platform/platform-impl/src/com/intellij/openapi/updateSettings/impl/pluginsAdvertisement/PluginAdvertiserService.kt');
  assert.ok(service.includes('areCommercialEditionSuggestionsEnabled'));
  assert.ok(service.includes('isTryUltimateDisabledByUser'));
});

test('installer metadata belongs to Kedr', () => {
  const nsis = read('build/conf/nsis/idea.nsi');
  assert.match(nsis, /"CompanyName" "\$\{MANUFACTURER\}"/);
  assert.match(nsis, /"Publisher" "\$\{MANUFACTURER\}"/);
  assert.match(nsis, /"URLInfoAbout" "https:\/\/github\.com\/name-cho\/kedr"/);
  assert.match(nsis, /RequestExecutionLevel user/);
  const builder = read('platform/build-scripts/src/org/jetbrains/intellij/build/impl/WindowsDistributionBuilder.kt');
  assert.match(builder, /"LegalCopyright" to "Copyright \$\{LocalDate\.now\(\)\.year\} \$\{appInfo\.companyName\}"/);
  assert.ok(!builder.includes('"LegalCopyright" to "Copyright 2000-'));
});

test('release workflows are pinned and publish both packages', () => {
  const build = read('.github/workflows/kedr-windows-build.yml');
  const release = read('.github/workflows/kedr-windows.yml');
  const checks = read('.github/workflows/kedr-checks.yml');
  for (const content of [build, release, checks]) {
    for (const match of content.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)) {
      const uses = match[1];
      if (uses.startsWith('./')) continue;
      assert.match(uses, /@[0-9a-f]{40}$/, `unpinned action: ${uses}`);
    }
  }
  assert.ok(!build.includes('windows_exe_installer'));
  assert.ok(build.includes('d65bac16fd3a2df1c49f928df74c9e67c6282359'));
  assert.ok(build.includes('verify-release.mjs'));
  assert.ok(build.includes('smoke-release.ps1'));
  assert.ok(build.includes('out/kedr-${{ inputs.product }}/release/*'));
  assert.match(release, /permissions:\s+contents: read/);
  assert.match(release, /release:[\s\S]*?permissions:\s+contents: write/);
  assert.ok(release.includes('--draft'));
  assert.ok(release.includes('SHA256SUMS'));
  assert.ok(checks.includes('node --test tools/kedr/*.test.mjs'));
});

test('project contacts point to Kedr', () => {
  const security = read('SECURITY.md');
  const contributing = read('CONTRIBUTING.md');
  for (const content of [security, contributing]) {
    assert.ok(!content.includes('jetbrains.com'));
    assert.ok(!content.includes('youtrack.jetbrains.com'));
    assert.ok(!content.includes('security@jetbrains.com'));
  }
  assert.ok(security.includes('https://github.com/name-cho/kedr/security/advisories/new'));
  assert.ok(security.includes('https://github.com/name-cho'));
  assert.ok(contributing.includes('https://github.com/name-cho/kedr/issues'));
});

test('release and troubleshooting docs exist and are linked', () => {
  const readme = read('README.md');
  assert.ok(read('docs/release.md').includes('draft'));
  assert.ok(read('docs/troubleshooting.md').includes('SmartScreen'));
  assert.ok(readme.includes('docs/release.md'));
  assert.ok(readme.includes('docs/troubleshooting.md'));
  const provenance = read('third-party/plugins/rus-language-pack/PROVENANCE.md');
  assert.ok(provenance.includes('5355a15493d71adaa932bdd006612b313e23dfcaca0b19f3f172a285fd8c1ee7'));
  assert.ok(read('NOTICE.txt').includes('su.rus.language-pack'));
});
