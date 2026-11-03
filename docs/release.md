# Release process

Kedr releases are built on GitHub Actions for Windows x64. Each release contains both products:

| Product | Portable ZIP | NSIS installer |
| --- | --- | --- |
| Kedr Studio | `kedr-studio-<build>.win.zip` | `kedr-studio-<build>.exe` |
| Kedr Python | `kedr-python-<build>.win.zip` | `kedr-python-<build>.exe` |

Every artifact has `.sha256` and `.sha512` sidecars. The release also includes combined `SHA256SUMS` and `SHA512SUMS` files. Kedr Python adds a `-sources.zip` archive with the same sidecars; the Studio build does not produce one. Installers are unsigned; see [troubleshooting.md](troubleshooting.md) for SmartScreen behavior.

Only GitHub Actions builds release artifacts. A local build is a development check, not a release path.

## Cutting a release

1. Merge both product changes into `main` through a pull request. Do not merge the old 2026.2 tree over the 2026.3 tree. Follow the branch rules in [repositories.md](repositories.md).
2. Make sure `main` is green and the version/build number in the product descriptors is correct.
3. Add Russian release notes at `docs/releases/<tag>.md`. Describe both products, the platform version, known limits and checksum verification.
4. Create and push a tag from `main`:

   ```
   git tag v1.2.0
   git push origin v1.2.0
   ```

5. `.github/workflows/kedr-windows.yml` runs a `plan` job first. It runs the Kedr policy tests, checks the tag format, and requires `docs/releases/<tag>.md`. A tag without notes stops before any Windows minute is spent.
6. The workflow builds both x64 products through the reusable `kedr-windows-build.yml` workflow.
7. Each product build:
   - checks out the pinned Android module commit;
   - builds the ZIP, the NSIS installer, and the sources archive;
   - runs `tools/kedr/verify-release.mjs` to validate checksums, product identity, launch files, required plugins, the Go grammar in Studio, and forbidden promo modules;
   - writes `.sha256` and `.sha512` for the sources archive, which the platform build leaves without sidecars;
   - runs `tools/kedr/smoke-release.ps1` to extract the ZIP, list bundled plugins, format a sample file, install silently, list plugins from the installed copy, and uninstall;
   - stages only release assets and prints their sizes to the job summary.
8. The release job verifies all sidecars, writes `SHA256SUMS` and `SHA512SUMS`, reads `docs/releases/<tag>.md`, and creates a **draft** GitHub release.
9. Review the draft and its Windows build logs, then publish it manually. Tags with a suffix such as `-rc.1` are marked as pre-releases and are not marked as latest. A plain tag such as `v1.2.0` is published as a normal release and becomes the latest one.

A stable release must also drop the version marker in `IdeaApplicationInfo.xml` and `PyCharmCoreApplicationInfo.xml`: no `suffix` attribute and `eap="false"`. Otherwise About still calls the build a release candidate. The policy tests check this.

The `Mirror to GitGud` workflow then copies the tag and the release page to GitGud. GitGud release pages link to the GitHub assets.

## Testing the pipeline without a release

The Windows workflow also runs on pull requests that touch the build, the release tools, the product properties, or the release notes. Such a run builds and verifies both products but never creates a release. Use it to prove the pipeline before you push a tag.

Manual dispatch can build one product or both, but it does not create a release either.

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

A local build never produces a published release. Use these commands only to check a development build:

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

The Windows job writes a user `.bazelrc` that moves the output root, the disk cache, and the repository cache to `D:`. It caps jobs at 4 and Kotlin compile workers at 2, because the default `HOST_CPUS*2` exhausts memory on a standard runner. It also caps the disk cache at 5 GB so `actions/cache` stays inside its 10 GB limit.

## GitGud

GitGud runs GitLab, so it has releases and CI. The `.gitlab-ci.yml` in this repository is disabled until a project variable `KEDR_CI_ENABLED` is set to `true`. GitGud grants shared runner access on request, so the pipeline stays off by default.

The GitGud pipeline runs the policy tests and checks that each release page links to every GitHub asset. It does not build Windows products. Windows builds need a Windows runner, and GitHub already provides one.
