# Kedr

Free, fully open-source desktop IDEs for Windows, built from the IntelliJ Platform
source code:

- **Kedr Studio** is a universal editor for source code, configuration and text
  files, including Java, Kotlin, Python, Go and web languages.
- **Kedr Python** is focused on professional Python development: interpreters and
  environments, completion, navigation, refactoring, debugging, tests and type checking.

There is no subscription, no trial, no license dialog and no Kedr upsell in
either product: everything the upstream open-source build can do is available
without an account. Third-party Marketplace plugins keep their own licensing.

[README-upstream.md](README-upstream.md) keeps the original upstream build notes.

## Repositories

- GitHub: [name-cho/kedr](https://github.com/name-cho/kedr) holds the source for both products.
- GitHub: [name-cho/kedr-python](https://github.com/name-cho/kedr-python) holds Python product docs and releases.
- GitGud: [name-cho/kedr](https://gitgud.io/name-cho/kedr) and [name-cho/kedr-python](https://gitgud.io/name-cho/kedr-python) mirror the same projects.
- `main` is the only long-lived branch. Do not use `kedr-publish` or separate product branches.

## Products

| Product | Based on | Executable | Build number prefix |
| --- | --- | --- | --- |
| Kedr Studio | IntelliJ IDEA Community 2026.3 | `bin\idea64.exe` | `IC-` |
| Kedr Python | PyCharm Community 2026.3 | `bin\pycharm64.exe` | `PC-` |

Build numbers and product codes (`IC`, `PC`) are intentionally unchanged, so
Marketplace plugins that declare compatibility with these builds keep working.

## Packages

Both products ship the same two Windows packages:

| Package | File | Notes |
| --- | --- | --- |
| Portable ZIP | `kedr-studio-<build>.win.zip`, `kedr-python-<build>.win.zip` | No elevation, unpack and run `bin\idea64.exe` / `bin\pycharm64.exe` |
| NSIS installer | `kedr-studio-<build>.exe`, `kedr-python-<build>.exe` | Per-user install, uninstaller included |

Artifacts are produced in `out/kedr-studio/artifacts` and `out/kedr-python/artifacts`.

## What differs from upstream

- Rebranding: product names, icons, splash, installer artwork, About dialog,
  copyright holder (`Kedr Project`).
- Promotions and vendor hooks removed: Marketplace "Staff Picks" group,
  commercial-edition suggestions, bundled promo modules, uninstall feedback URL,
  JetBrains account and GDPR consent paths, vendor help and bug-report links,
  update checks from JetBrains servers.
- Error reports stay local: the IDE error dialog, startup failures and memory-use
  reports save a ZIP archive on your computer instead of uploading anything.
  See [docs/troubleshooting.md](docs/troubleshooting.md).
- **Kedr Studio bundles Python and Go support.** Go has TextMate syntax highlighting
  out of the box; completion, diagnostics, navigation and formatting are available
  through `gopls` when it is installed on `PATH`. Go carries the platform Go icon in
  the New Project wizard, for `.go` files and for `go.mod`, `go.sum` and `go.work`.
  Python support is bundled as well.
- **Russian language pack is bundled** in both products (`su.rus.language-pack`,
  MIT). The UI starts in English; the pack is offered on first start and can be
  switched at any time in Settings | Appearance & Behavior | System Settings | Language.
- The **portable Windows ZIP** is a first-class package: it needs no elevation,
  unlike the NSIS installer.

## Bundled third-party plugins

| Plugin | Id | License | Notes |
| --- | --- | --- | --- |
| Russian Language Pack | `su.rus.language-pack` | MIT | Sources: https://gitflic.ru/project/russky/rus-jetbrains |

The pack is vendored under `third-party/plugins/rus-language-pack/` and wired in
through `getAdditionalPluginPaths` in both product property classes. The copy
shipped here has the `<icon>` element removed from `plugin.xml`: the 2026.2
plugin schema rejects it and the build fails while listing bundled plugins.
Provenance and the vendored jar checksum are recorded in
[third-party/plugins/rus-language-pack/PROVENANCE.md](third-party/plugins/rus-language-pack/PROVENANCE.md).

Python DAP Debugger (`intellij.python.dap.plugin`) is **not** bundled: 76 of its
classes reference `com.intellij.platform.dap`, a closed-source JetBrains module
that does not exist in the open-source tree, so the plugin cannot load. Python
debugging uses the classic pydevd debugger that ships with the Python plugin.

## Building

Requirements: JDK 21, Bazel (the wrapper in the repo pins the version), Windows.
The full toolchain and the upstream build system are described in
[README-upstream.md](README-upstream.md); the build is driven by Bazel through
the `.cmd` entry points.

Kedr Studio:

```
installers.cmd -Dintellij.build.target.os=current
```

Kedr Python:

```
python\installers.cmd -Dintellij.build.target.os=current
```

Add `-Dintellij.build.skip.build.steps=windows_exe_installer` to build only the
portable ZIP. Artifacts land in `out\kedr-studio\artifacts` and
`out\kedr-python\artifacts`; unpack the ZIP and run `bin\idea64.exe` or
`bin\pycharm64.exe`.

Build machine notes:

- Run the build through `cmd.exe`: PowerShell splits `-Dkey=value` arguments.
- Bazel needs `-Djava.net.preferIPv4Stack=true` when IPv6 loopback is broken
  (already set in `.bazelrc`).
- `dist.win.x64` under `out\` is a transient tree; publish the ZIP or the
  installer, not the directory.
- Do not edit Bazel build scripts while a build is running.

## Continuous integration and releases

`.github/workflows/kedr-windows.yml` builds one or both products on
`windows-2022`. It runs on `v*` tags and on manual dispatch;
`.github/workflows/kedr-windows-build.yml` is the reusable per-product workflow.
Each build verifies the ZIP and NSIS installer, runs Windows smoke checks, and
stages release assets with SHA-256/SHA-512 sidecars. Tag builds create a **draft**
GitHub release containing both products and a combined `SHA256SUMS` file.
`.github/workflows/kedr-checks.yml` runs the repository checks on pushes and pull
requests.

See [docs/release.md](docs/release.md) for the release process,
[docs/repositories.md](docs/repositories.md) for the repository layout, and
[docs/troubleshooting.md](docs/troubleshooting.md) for common problems.

## License

Kedr source is distributed under the Apache License 2.0 вЂ” see [LICENSE.txt](LICENSE.txt)
and [NOTICE.txt](NOTICE.txt):

- [LICENSE.txt](LICENSE.txt) вЂ” Apache License 2.0, the license of this fork.
- [LICENSE-JETBRAINS-BUILD-TERMS.txt](LICENSE-JETBRAINS-BUILD-TERMS.txt) вЂ” the
  terms that ship with the upstream tree, kept unchanged for provenance.
- Third-party components keep their own licenses; they are collected under
  `license/`, and the generated report is `license/third-party-libraries.html`
  inside every distribution.

JetBrains, IntelliJ IDEA and PyCharm are trademarks of JetBrains s.r.o. Kedr is
an independent project and is not affiliated with, endorsed by or sponsored by
JetBrains.
