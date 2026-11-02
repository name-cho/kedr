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
  const extensions = read('platform/platform-impl/resources/intellij.platform.ide.impl.xml');
  assert.match(extensions, /<errorHandler implementation="com\.intellij\.diagnostic\.KedrErrorReportSubmitter"\/>/);
  assert.ok(!extensions.includes('ReporterIdForEAAutoReporters'));
  assert.ok(!extensions.includes('ReporterIdLoggerActivity'));
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
  const mirror = read('.github/workflows/mirror-gitgud.yml');
  for (const content of [build, release, checks, mirror]) {
    for (const match of content.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)) {
      const uses = match[1];
      if (uses.startsWith('./')) continue;
      assert.match(uses, /@[0-9a-f]{40}$/, `unpinned action: ${uses}`);
    }
  }
  assert.ok(!build.includes('windows_exe_installer'));
  assert.ok(build.includes('935e4531a777fdbd2084c43fa575f27dbb22f728'));
  assert.ok(build.includes('verify-release.mjs'));
  assert.ok(build.includes('smoke-release.ps1'));
  assert.ok(build.includes('out/kedr-${{ inputs.product }}/release/*'));
  assert.match(release, /permissions:\s+contents: read/);
  assert.match(release, /release:[\s\S]*?permissions:\s+contents: write/);
  assert.ok(release.includes('--draft'));
  assert.ok(release.includes('SHA256SUMS'));
  assert.ok(checks.includes('node --test tools/kedr/*.test.mjs'));
  assert.ok(mirror.includes('secrets.GITGUD_TOKEN'));
  assert.ok(mirror.includes('node tools/kedr/mirror-gitgud.mjs'));
  assert.ok(mirror.includes('gitgud-mirror-work/*.bundle'));
});

test('Studio bundles Go highlighting independently of gopls', () => {
  const descriptor = read('plugins/go/resources/META-INF/plugin.xml');
  assert.ok(descriptor.includes('<id>com.kedr.go</id>'));
  assert.ok(descriptor.includes('fileType name="Go" extensions="go" language="Go"'));
  assert.match(descriptor, /syntaxHighlighterFactory language="Go"[\s\S]*?TextMateSyntaxHighlighterFactory/);
  assert.match(descriptor, /editorHighlighterProvider filetype="Go"[\s\S]*?TextMateEditorHighlighterProvider/);
  assert.ok(descriptor.includes('<module name="intellij.textmate"/>'));
  const bundle = JSON.parse(read('plugins/textmate/lib/bundles/go/package.json'));
  assert.equal(bundle.contributes.grammars[0].scopeName, 'source.go');
  assert.ok(bundle.contributes.languages[0].extensions.includes('.go'));
  assert.equal(JSON.parse(read('plugins/textmate/lib/bundles/go/syntaxes/go.tmLanguage.json')).scopeName, 'source.go');
  for (const path of ['build/src/org/jetbrains/intellij/build/IdeaCommunityProperties.kt', 'python/build/src/org/jetbrains/intellij/build/pycharm/PyCharmCommunityProperties.kt']) {
    assert.ok(read(path).includes('"intellij.go"'));
  }
  assert.match(read('python/build/plugin-list.txt'), /^intellij\.textmate\.plugin$/m);
  assert.match(read('platform/build-scripts/src/org/jetbrains/intellij/build/BaseIdeaProperties.kt'), /"intellij\.textmate\.plugin"/);
  assert.match(read('build/src/org/jetbrains/intellij/build/IdeaCommunityProperties.kt'), /fileAssociations = listOf\([^\n]*"go"[^\n]*"mod"/);
  assert.match(read('community-resources/resources/idea/IdeaApplicationInfo.xml'), /motto="[^"]*Go/);
  assert.ok(read('tools/kedr/verify-release.mjs').includes('verifyGoHighlighting(zip, prefix)'));
  assert.ok(read('tools/kedr/smoke-release.ps1').includes("'com.kedr.go'"));
  assert.ok(read('plugins/textmate/tests/tests/org/jetbrains/plugins/textmate/language/syntax/lexer/GoHighlightingWiringTest.kt').includes('TextMateEditorHighlighterProvider'));
  assert.ok(read('.github/workflows/kedr-windows-build.yml').includes('//plugins/textmate/tests:tests_test'));
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
