# Release process

Kedr releases are built on GitHub Actions for Windows x64. Each release contains both products:

| Product | Portable ZIP | NSIS installer |
| --- | --- | --- |
| Kedr Studio | `kedr-studio-<build>.win.zip` | `kedr-studio-<build>.exe` |
| Kedr Python | `kedr-python-<build>.win.zip` | `kedr-python-<build>.exe` |

Every artifact has `.sha256` and `.sha512` sidecars. The release also includes a combined `SHA256SUMS` file. Installers are unsigned; see [troubleshooting.md](troubleshooting.md) for SmartScreen behavior.

## Cutting a release

1. Merge both product changes into `main` through a pull request. Do not merge the old 2026.2 tree over the 2026.3 tree.
2. Make sure `main` is green and the version/build number in the product descriptors is correct.
3. Add Russian release notes at `docs/releases/<tag>.md`. Describe both products, the platform version, known limits and checksum verification.
4. Create and push a tag from `main`:

   ```
   git tag v1.2.0
   git push origin v1.2.0
   ```

5. `.github/workflows/kedr-windows.yml` builds both x64 products through the reusable `kedr-windows-build.yml` workflow.
6. Each product build:
   - checks out the pinned Android module commit;
   - builds the ZIP and NSIS installer;
   - runs `tools/kedr/verify-release.mjs` to validate checksums, product identity, launch files, required plugins, the Go grammar in Studio, and forbidden promo modules;
   - runs `tools/kedr/smoke-release.ps1` to extract the ZIP, list bundled plugins, format a sample file, install silently, list plugins from the installed copy, and uninstall;
   - stages only release assets.
7. The release job verifies all sidecars, writes `SHA256SUMS`, reads `docs/releases/<tag>.md`, and creates a **draft** GitHub release.
8. Review the draft and its Windows build logs, then publish it manually. Tags with a suffix such as `-rc.1` are marked as pre-releases.

Manual dispatch can build one product or both, but it does not create a release.

## Verifying a download

```
sha256sum -c kedr-studio-<build>.win.zip.sha256
sha256sum -c kedr-studio-<build>.exe.sha256
```

Or verify the combined file:

```
sha256sum -c SHA256SUMS
```

On Windows PowerShell:

```
Get-FileHash .\kedr-studio-<build>.win.zip -Algorithm SHA256
```

## Local verification

After a local build:

```
node tools/kedr/verify-release.mjs --product studio --artifacts-dir out/kedr-studio/artifacts --stage-dir out/kedr-studio/release
node tools/kedr/verify-release.mjs --product python --artifacts-dir out/kedr-python/artifacts --stage-dir out/kedr-python/release
```

The smoke script requires Windows PowerShell 7 and a Windows desktop session:

```
pwsh -File tools/kedr/smoke-release.ps1 -Product studio -ArtifactsDir out/kedr-studio/artifacts -WorkDir D:/kedr-smoke-studio
```

## CI inputs

GitHub Actions used by Kedr workflows are pinned by commit SHA. The Android module checkout is pinned by commit SHA. Bazel and Bazelisk versions are pinned by `.bazelversion` and `.bazeliskversion`. Do not replace these with floating tags or branches.
