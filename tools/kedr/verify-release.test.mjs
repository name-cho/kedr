import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { deflateRawSync } from 'node:zlib';
import { ZipArchive, assertSafeEntryName, findReleaseArtifacts, hashFile, parseChecksum, verifyRelease } from './verify-release.mjs';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(entries) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const [name, value] of Object.entries(entries)) {
    const nameBuffer = Buffer.from(name, 'utf8');
    const content = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
    const compressed = deflateRawSync(content);
    const crc = crc32(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    parts.push(local, nameBuffer, compressed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(content.length, 24);
    entry.writeUInt16LE(nameBuffer.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBuffer);
    offset += local.length + nameBuffer.length + compressed.length;
  }
  const centralBuffer = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(entries).length, 8);
  eocd.writeUInt16LE(Object.keys(entries).length, 10);
  eocd.writeUInt32LE(centralBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralBuffer, eocd]);
}

function fakeExe() {
  const buffer = Buffer.alloc(512);
  buffer.writeUInt16LE(0x5a4d, 0);
  buffer.writeUInt32LE(0x80, 0x3c);
  buffer.writeUInt32LE(0x00004550, 0x80);
  return buffer;
}

function productInfo(product, overrides = {}) {
  const studio = product === 'studio';
  return {
    name: studio ? 'Kedr Studio' : 'Kedr Python',
    version: '2026.2',
    buildNumber: '262.TEST',
    productCode: studio ? 'IC' : 'PC',
    dataDirectoryName: studio ? 'KedrStudio2026.2' : 'KedrPython2026.2',
    productVendor: 'Kedr',
    launch: [
      {
        os: 'Windows',
        arch: 'amd64',
        launcherPath: studio ? 'bin/idea64.exe' : 'bin/pycharm64.exe',
        javaExecutablePath: 'jbr/bin/java.exe',
        vmOptionsFilePath: studio ? 'bin/idea64.exe.vmoptions' : 'bin/pycharm64.exe.vmoptions',
      },
    ],
    bundledPlugins: studio
      ? ['com.intellij.java', 'PythonCore', 'com.kedr.go', 'com.kedr.web', 'org.jetbrains.plugins.textmate', 'su.rus.language-pack']
      : ['PythonCore', 'com.jetbrains.pycharm.community.customization', 'com.kedr.go', 'com.kedr.web', 'su.rus.language-pack'],
    layout: [],
    ...overrides,
  };
}

function writeChecksum(path, algorithm) {
  const digest = createHash(algorithm).update(readFileSync(path)).digest('hex');
  writeFileSync(`${path}.${algorithm}`, `${digest} *${path.split(/[\\/]/).pop()}\n`);
}

function withTemp(run) {
  const directory = mkdtempSync(join(tmpdir(), 'kedr-release-'));
  try {
    run(directory);
  }
  finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const WEB_FIXTURE_BUNDLES = [
  { name: 'html', extension: '.html', scope: 'text.html.basic' },
  { name: 'css', extension: '.css', scope: 'source.css' },
  { name: 'javascript', extension: '.js', scope: 'source.js' },
  { name: 'typescript-basics', extension: '.ts', scope: 'source.ts' },
];

function webBundleEntries() {
  const entries = {};
  for (const bundle of WEB_FIXTURE_BUNDLES) {
    const root = `plugins/textmate-plugin/lib/bundles/${bundle.name}`;
    entries[`${root}/package.json`] = JSON.stringify({
      contributes: {
        languages: [{ id: bundle.name, extensions: [bundle.extension] }],
        grammars: [{ scopeName: bundle.scope, path: `./syntaxes/${bundle.name}.tmLanguage.json` }],
      },
    });
    entries[`${root}/syntaxes/${bundle.name}.tmLanguage.json`] = JSON.stringify({ scopeName: bundle.scope });
  }
  return entries;
}

function writeArtifacts(directory, product, { info = productInfo(product), missingExe = false, sources = false } = {}) {
  const stem = `kedr-${product}-262.TEST`;
  const launcher = product === 'studio' ? 'bin/idea64.exe' : 'bin/pycharm64.exe';
  const vmOptions = product === 'studio' ? 'bin/idea64.exe.vmoptions' : 'bin/pycharm64.exe.vmoptions';
  const zip = makeZip({
    'product-info.json': JSON.stringify(info),
    'build.txt': `${info.productCode}-${info.buildNumber}`,
    'plugins/textmate-plugin/lib/bundles/go/package.json': '{"contributes":{"languages":[{"id":"go","extensions":[".go"]}]}}',
    'plugins/textmate-plugin/lib/bundles/go/syntaxes/go.tmLanguage.json': '{"scopeName":"source.go"}',
    ...webBundleEntries(),
    [launcher]: fakeExe(),
    'jbr/bin/java.exe': fakeExe(),
    [vmOptions]: '-Xmx2048m\n',
  });
  writeFileSync(join(directory, `${stem}.win.zip`), zip);
  writeChecksum(join(directory, `${stem}.win.zip`), 'sha256');
  writeChecksum(join(directory, `${stem}.win.zip`), 'sha512');
  if (!missingExe) {
    writeFileSync(join(directory, `${stem}.exe`), fakeExe());
    writeChecksum(join(directory, `${stem}.exe`), 'sha256');
    writeChecksum(join(directory, `${stem}.exe`), 'sha512');
  }
  if (sources) {
    writeFileSync(join(directory, `${stem}-sources.zip`), makeZip({ 'src/Main.kt': 'fun main() {}\n' }));
  }
  return stem;
}

test('ZipArchive reads deflated entries', () => {
  const zip = ZipArchive.fromBuffer(makeZip({ 'a.txt': 'hello', 'dir/b.txt': 'world' }));
  assert.equal(zip.readEntry('a.txt').toString(), 'hello');
  assert.equal(zip.readEntry('dir/b.txt').toString(), 'world');
  zip.close();
});

test('unsafe ZIP paths are rejected', () => {
  assert.throws(() => assertSafeEntryName('../secret'), /unsafe ZIP entry path/);
  assert.throws(() => assertSafeEntryName('/absolute'), /unsafe ZIP entry path/);
  assert.throws(() => assertSafeEntryName('C:/Windows/system32'), /unsafe ZIP entry path/);
  assert.throws(() => assertSafeEntryName('dir\\file'), /unsafe ZIP entry path/);
  assertSafeEntryName('plugins/python/lib/python.jar');
});

test('checksum parser validates digest and file name', () => {
  const digest = 'a'.repeat(64);
  assert.equal(parseChecksum(`${digest} *kedr-studio-262.TEST.win.zip`, 'kedr-studio-262.TEST.win.zip', 'sha256'), digest);
  assert.throws(() => parseChecksum(`${digest} *other.zip`, 'kedr-studio-262.TEST.win.zip', 'sha256'), /name mismatch/);
});

test('artifact discovery requires matching ZIP and installer', () => {
  withTemp((directory) => {
    writeArtifacts(directory, 'studio');
    const artifacts = findReleaseArtifacts(directory, 'studio');
    assert.equal(artifacts.build, '262.TEST');
    assert.ok(artifacts.zip.endsWith('.win.zip'));
    assert.ok(artifacts.exe.endsWith('.exe'));
  });
});

test('release verification stages both packages and checksums', () => {
  withTemp((directory) => {
    writeArtifacts(directory, 'studio');
    const stage = join(directory, 'stage');
    const result = verifyRelease({ product: 'studio', artifactsDir: directory, stageDir: stage });
    assert.equal(result.build, '262.TEST');
    assert.equal(result.checksums.zip.sha256, hashFile(join(directory, 'kedr-studio-262.TEST.win.zip'), 'sha256'));
    assert.ok(result.staged.includes('kedr-studio-262.TEST.win.zip'));
    assert.ok(result.staged.includes('kedr-studio-262.TEST.exe'));
    assert.ok(result.staged.includes('kedr-studio-262.TEST.win.zip.sha256'));
    assert.ok(result.staged.includes('kedr-studio-262.TEST.exe.sha512'));
  });
});

test('release verification works for Kedr Python', () => {
  withTemp((directory) => {
    writeArtifacts(directory, 'python');
    const result = verifyRelease({ product: 'python', artifactsDir: directory });
    assert.equal(result.artifacts.exe, 'kedr-python-262.TEST.exe');
    assert.equal(result.artifacts.sources, null);
  });
});

test('Python requires the Go plugin', () => {
  withTemp((directory) => {
    writeArtifacts(directory, 'python', {
      info: productInfo('python', {
        bundledPlugins: ['PythonCore', 'com.jetbrains.pycharm.community.customization', 'su.rus.language-pack'],
      }),
    });
    assert.throws(() => verifyRelease({ product: 'python', artifactsDir: directory }), /required plugin is missing: com.kedr.go/);
  });
});

test('sources archive gets checksums and is staged', () => {
  withTemp((directory) => {
    const stem = writeArtifacts(directory, 'python', { sources: true });
    const stage = join(directory, 'stage');
    const result = verifyRelease({ product: 'python', artifactsDir: directory, stageDir: stage });
    assert.equal(result.artifacts.sources, `${stem}-sources.zip`);
    assert.equal(result.checksums.sources.sha256, hashFile(join(directory, `${stem}-sources.zip`), 'sha256'));
    for (const name of [`${stem}-sources.zip`, `${stem}-sources.zip.sha256`, `${stem}-sources.zip.sha512`]) {
      assert.ok(result.staged.includes(name), `missing staged file: ${name}`);
    }
  });
});

test('a wrong sources checksum is rejected', () => {
  withTemp((directory) => {
    const stem = writeArtifacts(directory, 'python', { sources: true });
    writeFileSync(join(directory, `${stem}-sources.zip.sha256`), `${'0'.repeat(64)} *${stem}-sources.zip\n`);
    assert.throws(() => verifyRelease({ product: 'python', artifactsDir: directory }), /sha256 mismatch/);
  });
});

function repeatFirstEntry(zip) {
  const eocdOffset = zip.length - 22;
  const centralOffset = zip.readUInt32LE(eocdOffset + 16);
  const centralSize = zip.readUInt32LE(eocdOffset + 12);
  const recordLength = 46 + zip.readUInt16LE(centralOffset + 28)
    + zip.readUInt16LE(centralOffset + 30) + zip.readUInt16LE(centralOffset + 32);
  const eocd = Buffer.from(zip.subarray(eocdOffset));
  eocd.writeUInt16LE(2, 8);
  eocd.writeUInt16LE(2, 10);
  eocd.writeUInt32LE(centralSize + recordLength, 12);
  return Buffer.concat([
    zip.subarray(0, eocdOffset),
    zip.subarray(centralOffset, centralOffset + recordLength),
    eocd,
  ]);
}

test('a sources archive may repeat a path across modules', () => {
  withTemp((directory) => {
    const stem = writeArtifacts(directory, 'python');
    const sourceZip = repeatFirstEntry(makeZip({ 'a/package-info.java': 'package a;\n' }));
    writeFileSync(join(directory, `${stem}-sources.zip`), sourceZip);
    const result = verifyRelease({ product: 'python', artifactsDir: directory });
    assert.equal(result.artifacts.sources, `${stem}-sources.zip`);
  });
});

test('duplicate entries stay fatal unless the caller allows them', () => {
  const doubled = repeatFirstEntry(makeZip({ 'a.txt': 'hello' }));
  assert.throws(() => ZipArchive.fromBuffer(doubled), /duplicate ZIP entry/);
  const archive = ZipArchive.fromBuffer(doubled, { allowDuplicates: true });
  assert.equal(archive.duplicateCount, 1);
  assert.equal(archive.readEntry('a.txt').toString(), 'hello');
});

test('missing installer fails verification', () => {
  withTemp((directory) => {
    writeArtifacts(directory, 'studio', { missingExe: true });
    assert.throws(() => verifyRelease({ product: 'studio', artifactsDir: directory }), /expected one x64 installer/);
  });
});

test('checksum mismatch fails verification', () => {
  withTemp((directory) => {
    const stem = writeArtifacts(directory, 'studio');
    writeFileSync(join(directory, `${stem}.exe.sha256`), `${'b'.repeat(64)} *${stem}.exe\n`);
    assert.throws(() => verifyRelease({ product: 'studio', artifactsDir: directory }), /sha256 mismatch/);
  });
});

test('packaged promotional module fails verification', () => {
  withTemp((directory) => {
    writeArtifacts(directory, 'studio', {
      info: productInfo('studio', { layout: [{ name: 'intellij.java.promo', kind: 'moduleV2' }] }),
    });
    assert.throws(() => verifyRelease({ product: 'studio', artifactsDir: directory }), /promotional module/);
  });
});

test('missing required plugin fails verification', () => {
  withTemp((directory) => {
    writeArtifacts(directory, 'studio', {
      info: productInfo('studio', { bundledPlugins: ['com.intellij.java', 'su.rus.language-pack'] }),
    });
    assert.throws(() => verifyRelease({ product: 'studio', artifactsDir: directory }), /required plugin is missing: PythonCore/);
  });
});

test('Studio requires the Go plugin and TextMate grammar', () => {
  withTemp((directory) => {
    writeArtifacts(directory, 'studio', {
      info: productInfo('studio', { bundledPlugins: ['com.intellij.java', 'PythonCore', 'org.jetbrains.plugins.textmate', 'su.rus.language-pack'] }),
    });
    assert.throws(() => verifyRelease({ product: 'studio', artifactsDir: directory }), /required plugin is missing: com.kedr.go/);
  });
});

test('artifact build must match product-info.json', () => {
  withTemp((directory) => {
    writeArtifacts(directory, 'studio', { info: productInfo('studio', { buildNumber: '262.OTHER' }) });
    assert.throws(() => verifyRelease({ product: 'studio', artifactsDir: directory }), /artifact build does not match/);
  });
});

test('ZIP with a fake EOCD inside the comment is rejected', () => {
  const zip = makeZip({ 'a.txt': 'hello' });
  const fake = Buffer.alloc(22);
  fake.writeUInt32LE(0x06054b50, 0);
  const withComment = Buffer.concat([zip, fake]);
  withComment.writeUInt16LE(fake.length, withComment.length - 2);
  assert.throws(() => ZipArchive.fromBuffer(withComment), /central directory/);
});
