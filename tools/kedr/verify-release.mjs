import { createHash } from 'node:crypto';
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, statSync, writeFileSync } from 'node:fs';

import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { inflateRawSync } from 'node:zlib';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;

export const PRODUCTS = {
  studio: {
    code: 'IC',
    name: 'Kedr Studio',
    dataDirectoryPrefix: 'KedrStudio',
    launcher: 'bin/idea64.exe',
    requiredPlugins: ['com.intellij.java', 'PythonCore', 'com.kedr.go', 'org.jetbrains.plugins.textmate', 'su.rus.language-pack'],
  },
  python: {
    code: 'PC',
    name: 'Kedr Python',
    dataDirectoryPrefix: 'KedrPython',
    launcher: 'bin/pycharm64.exe',
    requiredPlugins: ['PythonCore', 'com.jetbrains.pycharm.community.customization', 'com.kedr.go', 'su.rus.language-pack'],
  },
};

const FORBIDDEN_MODULES = [
  'intellij.pycharm.community.ide.impl.promotion',
  'intellij.java.promo',
  'intellij.vcs.github.ultimatePromo',
];

function fail(message) {
  throw new Error(message);
}

function readExact(fd, offset, length) {
  const buffer = Buffer.alloc(length);
  let done = 0;
  while (done < length) {
    const read = readSync(fd, buffer, done, length - done, offset + done);
    if (read === 0) fail(`unexpected end of file at ${offset + done}`);
    done += read;
  }
  return buffer;
}

function parseZip64Extra(extra, entry) {
  let offset = 0;
  while (offset + 4 <= extra.length) {
    const id = extra.readUInt16LE(offset);
    const size = extra.readUInt16LE(offset + 2);
    const start = offset + 4;
    if (start + size > extra.length) fail('invalid ZIP64 extra field');
    if (id === 0x0001) {
      let cursor = start;
      if (entry.uncompressedSize === 0xffffffff) {
        entry.uncompressedSize = Number(extra.readBigUInt64LE(cursor));
        cursor += 8;
      }
      if (entry.compressedSize === 0xffffffff) {
        entry.compressedSize = Number(extra.readBigUInt64LE(cursor));
        cursor += 8;
      }
      if (entry.localOffset === 0xffffffff) {
        entry.localOffset = Number(extra.readBigUInt64LE(cursor));
      }
    }
    offset = start + size;
  }
}

export class ZipArchive {
  constructor(readAt, size, close = () => {}, { allowDuplicates = false } = {}) {
    this.readAt = readAt;
    this.size = size;
    this.close = close;
    this.allowDuplicates = allowDuplicates;
    this.entries = this.readCentralDirectory();
  }

  static open(path, options) {
    const fd = openSync(path, 'r');
    const size = statSync(path).size;
    return new ZipArchive((offset, length) => readExact(fd, offset, length), size, () => closeSync(fd), options);
  }

  static fromBuffer(buffer, options) {
    return new ZipArchive((offset, length) => buffer.subarray(offset, offset + length), buffer.length, () => {}, options);
  }

  readCentralDirectory() {
    if (this.size < 22) fail('ZIP archive is too small');
    const tailSize = Math.min(this.size, 0xffff + 22);
    const tail = this.readAt(this.size - tailSize, tailSize);
    let eocd = -1;
    for (let offset = tail.length - 22; offset >= 0; offset--) {
      if (tail.readUInt32LE(offset) !== EOCD_SIGNATURE) continue;
      const commentLength = tail.readUInt16LE(offset + 20);
      if (offset + 22 + commentLength !== tail.length) continue;
      eocd = offset;
      break;
    }
    if (eocd < 0) fail('ZIP end of central directory not found');

    let count = tail.readUInt16LE(eocd + 10);
    let centralSize = tail.readUInt32LE(eocd + 12);
    let centralOffset = tail.readUInt32LE(eocd + 16);

    if (count === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
      const locatorOffset = this.size - tailSize + eocd - 20;
      if (locatorOffset < 0) fail('ZIP64 locator not found');
      const locator = this.readAt(locatorOffset, 20);
      if (locator.readUInt32LE(0) !== ZIP64_LOCATOR_SIGNATURE) fail('invalid ZIP64 locator');
      const zip64Offset = Number(locator.readBigUInt64LE(8));
      const zip64 = this.readAt(zip64Offset, 56);
      if (zip64.readUInt32LE(0) !== ZIP64_EOCD_SIGNATURE) fail('invalid ZIP64 end of central directory');
      count = Number(zip64.readBigUInt64LE(32));
      centralSize = Number(zip64.readBigUInt64LE(40));
      centralOffset = Number(zip64.readBigUInt64LE(48));
    }

    if (!Number.isSafeInteger(count) || !Number.isSafeInteger(centralSize) || !Number.isSafeInteger(centralOffset)) {
      fail('ZIP64 central directory values are too large');
    }
    if (centralOffset < 0 || centralSize < 0 || centralOffset + centralSize > this.size) {
      fail('ZIP central directory is out of bounds');
    }
    const central = this.readAt(centralOffset, centralSize);
    const entries = new Map();
    let offset = 0;
    let duplicateCount = 0;
    for (let index = 0; index < count; index++) {
      if (offset + 46 > central.length) fail('truncated ZIP central directory');
      if (central.readUInt32LE(offset) !== CENTRAL_SIGNATURE) fail('invalid central directory entry');
      const flags = central.readUInt16LE(offset + 8);
      const method = central.readUInt16LE(offset + 10);
      const entry = {
        method,
        compressedSize: central.readUInt32LE(offset + 20),
        uncompressedSize: central.readUInt32LE(offset + 24),
        localOffset: central.readUInt32LE(offset + 42),
      };
      const nameLength = central.readUInt16LE(offset + 28);
      const extraLength = central.readUInt16LE(offset + 30);
      const commentLength = central.readUInt16LE(offset + 32);
      const nameStart = offset + 46;
      const entryEnd = nameStart + nameLength + extraLength + commentLength;
      if (entryEnd > central.length) fail('truncated ZIP central directory entry');
      const name = central.subarray(nameStart, nameStart + nameLength).toString(flags & 0x800 ? 'utf8' : 'latin1');
      parseZip64Extra(central.subarray(nameStart + nameLength, nameStart + nameLength + extraLength), entry);
      if (entries.has(name)) {
        if (!this.allowDuplicates) fail(`duplicate ZIP entry: ${name}`);
        duplicateCount++;
      }
      entries.set(name, entry);
      offset = entryEnd;
    }
    if (offset !== central.length) fail('ZIP central directory size mismatch');
    this.duplicateCount = duplicateCount;
    return entries;
  }

  has(name) {
    return this.entries.has(name);
  }

  readEntry(name) {
    const entry = this.entries.get(name);
    if (!entry) fail(`ZIP entry not found: ${name}`);
    const local = this.readAt(entry.localOffset, 30);
    if (local.readUInt32LE(0) !== LOCAL_SIGNATURE) fail(`invalid local ZIP header: ${name}`);
    const nameLength = local.readUInt16LE(26);
    const extraLength = local.readUInt16LE(28);
    const data = this.readAt(entry.localOffset + 30 + nameLength + extraLength, entry.compressedSize);
    const content = entry.method === 0 ? data : entry.method === 8 ? inflateRawSync(data) : fail(`unsupported ZIP compression: ${entry.method}`);
    if (content.length !== entry.uncompressedSize) fail(`ZIP entry size mismatch: ${name}`);
    return content;
  }
}

export function assertSafeEntryName(name) {
  if (name.length === 0 || name.startsWith('/') || name.includes('\\') || /^[A-Za-z]:/.test(name) || name.split('/').includes('..')) {
    fail(`unsafe ZIP entry path: ${name}`);
  }
}

export function hashFile(path, algorithm) {
  const fd = openSync(path, 'r');
  const hash = createHash(algorithm);
  const buffer = Buffer.alloc(1024 * 1024);
  try {
    while (true) {
      const read = readSync(fd, buffer, 0, buffer.length, null);
      if (read === 0) break;
      hash.update(buffer.subarray(0, read));
    }
  }
  finally {
    closeSync(fd);
  }
  return hash.digest('hex');
}

export function parseChecksum(content, expectedName, algorithm) {
  const match = /^\s*([0-9a-fA-F]+)\s+\*?(.+?)\s*$/.exec(content);
  if (!match) fail(`invalid ${algorithm} checksum file for ${expectedName}`);
  const expectedLength = algorithm === 'sha256' ? 64 : algorithm === 'sha512' ? 128 : fail(`unsupported algorithm ${algorithm}`);
  if (match[1].length !== expectedLength) fail(`invalid ${algorithm} digest length for ${expectedName}`);
  if (basename(match[2]) !== expectedName) fail(`checksum file name mismatch: ${match[2]} != ${expectedName}`);
  return match[1].toLowerCase();
}

export function verifyChecksums(path) {
  const result = {};
  for (const algorithm of ['sha256', 'sha512']) {
    const sidecar = `${path}.${algorithm}`;
    if (!existsSync(sidecar)) fail(`missing checksum file: ${sidecar}`);
    const expected = parseChecksum(readFileSync(sidecar, 'utf8'), basename(path), algorithm);
    const actual = hashFile(path, algorithm);
    if (actual !== expected) fail(`${algorithm} mismatch for ${basename(path)}`);
    result[algorithm] = actual;
  }
  return result;
}

export function verifyChecksumsAfterWrite(path) {
  writeChecksumSidecars(path);
  return verifyChecksums(path);
}

export function findReleaseArtifacts(directory, product) {
  if (!PRODUCTS[product]) fail(`unknown product: ${product}`);
  const prefix = `kedr-${product}-`;
  const files = readdirSync(directory);
  const zips = files.filter((name) => name.startsWith(prefix) && name.endsWith('.win.zip') && !/aarch64|arm64/i.test(name));
  const exes = files.filter((name) => name.startsWith(prefix) && name.endsWith('.exe') && !/aarch64|arm64/i.test(name) && !name.startsWith('Uninstall-'));
  if (zips.length !== 1) fail(`expected one x64 ZIP for ${product}, found ${zips.length}`);
  if (exes.length !== 1) fail(`expected one x64 installer for ${product}, found ${exes.length}`);
  const zipName = zips[0];
  const exeName = exes[0];
  const zipStem = zipName.slice(0, -'.win.zip'.length);
  const exeStem = exeName.slice(0, -'.exe'.length);
  if (zipStem !== exeStem) fail(`ZIP and installer builds differ: ${zipStem} != ${exeStem}`);
  return {
    zip: join(directory, zipName),
    exe: join(directory, exeName),
    stem: zipStem,
    build: zipStem.slice(prefix.length),
  };
}

export function verifyPortableExecutable(path) {
  const fd = openSync(path, 'r');
  try {
    const header = readExact(fd, 0, Math.min(statSync(path).size, 65536));
    if (header.length < 64 || header.readUInt16LE(0) !== 0x5a4d) fail(`not a PE executable: ${path}`);
    const peOffset = header.readUInt32LE(0x3c);
    if (peOffset + 4 > header.length) fail(`PE header out of range: ${path}`);
    if (header.readUInt32LE(peOffset) !== 0x00004550) fail(`invalid PE signature: ${path}`);
  }
  finally {
    closeSync(fd);
  }
}

function findRootEntry(zip, name) {
  const candidates = [...zip.entries.keys()].filter((entry) => entry === name || entry.endsWith(`/${name}`));
  candidates.sort((a, b) => a.length - b.length);
  if (candidates.length === 0) fail(`${name} not found in ZIP`);
  return candidates[0];
}

function pluginIdsFromDescriptors(zip, prefix, productInfo) {
  const ids = new Set([...(productInfo.bundledPlugins ?? []), ...(productInfo.layout ?? []).map((item) => item.name)]);
  for (const item of productInfo.layout ?? []) {
    if (item.kind !== 'plugin') continue;
    for (const classPath of item.classPath ?? []) {
      const path = prefix + classPath;
      if (!zip.has(path) || !path.endsWith('.jar')) continue;
      const jar = ZipArchive.fromBuffer(zip.readEntry(path));
      try {
        if (!jar.has('META-INF/plugin.xml')) continue;
        const xml = jar.readEntry('META-INF/plugin.xml').toString('utf8');
        const id = /<id>([^<]+)<\/id>/.exec(xml)?.[1];
        if (id) ids.add(id);
      }
      finally {
        jar.close();
      }
    }
  }
  return ids;
}

export function verifyGoHighlighting(zip, prefix) {
  const bundleRoot = `${prefix}plugins/textmate-plugin/lib/bundles/go/`;
  for (const file of ['package.json', 'syntaxes/go.tmLanguage.json']) {
    if (!zip.has(bundleRoot + file)) fail(`Go TextMate bundle file is missing: ${file}`);
  }
  const bundle = JSON.parse(zip.readEntry(bundleRoot + 'package.json').toString('utf8'));
  const grammar = JSON.parse(zip.readEntry(bundleRoot + 'syntaxes/go.tmLanguage.json').toString('utf8'));
  if (!bundle.contributes?.languages?.some((language) => language.extensions?.includes('.go'))) {
    fail('Go TextMate bundle does not map .go files');
  }
  if (grammar.scopeName !== 'source.go') fail('unexpected Go TextMate grammar scope');
}

export function verifyProductInfo(zip, productInfoPath, productInfo, product) {
  const expected = PRODUCTS[product];
  if (!expected) fail(`unknown product: ${product}`);
  if (productInfo.name !== expected.name) fail(`unexpected product name: ${productInfo.name}`);
  if (productInfo.productCode !== expected.code) fail(`unexpected product code: ${productInfo.productCode}`);
  if (productInfo.productVendor !== 'Kedr') fail(`unexpected vendor: ${productInfo.productVendor}`);
  if (typeof productInfo.dataDirectoryName !== 'string' || !productInfo.dataDirectoryName.startsWith(expected.dataDirectoryPrefix)) {
    fail(`unexpected settings directory: ${productInfo.dataDirectoryName}`);
  }
  if (typeof productInfo.buildNumber !== 'string' || productInfo.buildNumber.length === 0) fail('missing build number');

  const prefix = productInfoPath.slice(0, productInfoPath.length - 'product-info.json'.length);
  const launch = (productInfo.launch ?? []).find((item) => item.os === 'Windows' && (!item.arch || item.arch === 'amd64'));
  if (!launch) fail('Windows amd64 launch configuration is missing');
  if (launch.launcherPath !== expected.launcher) fail(`unexpected launcher: ${launch.launcherPath}`);
  for (const path of [launch.launcherPath, launch.javaExecutablePath, launch.vmOptionsFilePath]) {
    if (typeof path !== 'string' || !zip.has(prefix + path)) fail(`launch file is missing from ZIP: ${path}`);
  }

  for (const item of productInfo.layout ?? []) {
    if (FORBIDDEN_MODULES.includes(item.name)) fail(`promotional module is still packaged: ${item.name}`);
  }

  const ids = pluginIdsFromDescriptors(zip, prefix, productInfo);
  for (const id of expected.requiredPlugins) {
    if (!ids.has(id)) fail(`required plugin is missing: ${id}`);
  }
  if (product === 'studio') verifyGoHighlighting(zip, prefix);
  return { prefix, buildNumber: productInfo.buildNumber };
}

function stageFile(source, stageDir, staged) {
  const target = join(stageDir, basename(source));
  copyFileSync(source, target);
  staged.push(target);
}

export function writeChecksumSidecars(path) {
  for (const algorithm of ['sha256', 'sha512']) {
    const sidecar = `${path}.${algorithm}`;
    const digest = hashFile(path, algorithm);
    if (existsSync(sidecar)) {
      const existing = parseChecksum(readFileSync(sidecar, 'utf8'), basename(path), algorithm);
      if (existing !== digest) fail(`${algorithm} mismatch for ${basename(path)}`);
    }
    else {
      writeFileSync(sidecar, `${digest} *${basename(path)}\n`);
    }
  }
}

export function findSourcesArchive(directory, stem) {
  const name = `${stem}-sources.zip`;
  return existsSync(join(directory, name)) ? join(directory, name) : null;
}

export function verifyRelease({ product, artifactsDir, stageDir }) {
  const artifacts = findReleaseArtifacts(artifactsDir, product);
  const checksums = {
    zip: verifyChecksums(artifacts.zip),
    exe: verifyChecksums(artifacts.exe),
  };
  verifyPortableExecutable(artifacts.exe);

  const sources = findSourcesArchive(artifactsDir, artifacts.stem);
  if (sources) {
    checksums.sources = verifyChecksumsAfterWrite(sources);
    const archive = ZipArchive.open(sources, { allowDuplicates: true });
    try {
      if (archive.entries.size === 0) fail('sources archive is empty');
      for (const name of archive.entries.keys()) assertSafeEntryName(name);
    }
    finally {
      archive.close();
    }
  }

  const zip = ZipArchive.open(artifacts.zip);
  let buildNumber;
  try {
    for (const name of zip.entries.keys()) assertSafeEntryName(name);
    const productInfoPath = findRootEntry(zip, 'product-info.json');
    const productInfo = JSON.parse(zip.readEntry(productInfoPath).toString('utf8'));
    const verified = verifyProductInfo(zip, productInfoPath, productInfo, product);
    buildNumber = verified.buildNumber;
    if (artifacts.build !== buildNumber) fail(`artifact build does not match product-info.json: ${artifacts.build} != ${buildNumber}`);
    const buildTxtPath = findRootEntry(zip, 'build.txt');
    const buildTxt = zip.readEntry(buildTxtPath).toString('utf8').trim();
    if (buildTxt !== buildNumber && buildTxt !== `${productInfo.productCode}-${buildNumber}`) {
      fail(`build.txt does not match product-info.json: ${buildTxt}`);
    }
  }
  finally {
    zip.close();
  }

  const staged = [];
  if (stageDir) {
    mkdirSync(stageDir, { recursive: true });
    for (const path of [artifacts.zip, artifacts.exe, sources].filter(Boolean)) {
      stageFile(path, stageDir, staged);
      for (const algorithm of ['sha256', 'sha512']) stageFile(`${path}.${algorithm}`, stageDir, staged);
      const productInfoSibling = `${path}.product-info.json`;
      if (existsSync(productInfoSibling)) stageFile(productInfoSibling, stageDir, staged);
    }
  }

  return {
    product,
    build: buildNumber,
    artifacts: {
      zip: basename(artifacts.zip),
      exe: basename(artifacts.exe),
      sources: sources ? basename(sources) : null,
    },
    checksums,
    staged: staged.map((path) => basename(path)),
  };
}

function main() {
  const { values } = parseArgs({
    options: {
      product: { type: 'string' },
      'artifacts-dir': { type: 'string' },
      'stage-dir': { type: 'string' },
    },
  });
  if (!values.product || !values['artifacts-dir']) {
    fail('usage: node verify-release.mjs --product studio|python --artifacts-dir <dir> [--stage-dir <dir>]');
  }
  const result = verifyRelease({
    product: values.product,
    artifactsDir: resolve(values['artifacts-dir']),
    stageDir: values['stage-dir'] ? resolve(values['stage-dir']) : undefined,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  }
  catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
