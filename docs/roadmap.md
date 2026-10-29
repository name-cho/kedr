# Roadmap

Target platform: **Windows x64**. macOS and Linux are out of scope until someone can build and test them.

## M0 — Bootstrap

- [x] Clone upstream at `pycharm/262.10968.92` (2026.2.3)
- [x] Toolchain: Bazel (JetBrains fork 9.1.0-jb), JBR 25 without JCEF
- [x] Fix local Bazel startup (broken IPv6 loopback on the build machine)
- [x] Baseline build of the unmodified IDEA Community distribution (`out/idea-ce/artifacts`)
- [x] Branded build of PyCharm Community (`out/kedr-python/artifacts`, ~19 min cold)

## M1 — Rebrand to Kedr

- [x] Product descriptors: `IdeaApplicationInfo.xml`, `PyCharmCoreApplicationInfo.xml`
- [x] Product properties: `IdeaCommunityProperties.kt`, `PyCharmCommunityProperties.kt`
- [x] Settings/system dirs: `KedrStudio2026.2`, `KedrPython2026.2` (no shared state with real JetBrains IDEs)
- [x] Icons, splash, installer bitmaps, window title
- [x] About dialog: own copyright record plus a "Based on the IntelliJ Platform by JetBrains" line
  (verified at runtime in both products)
- [x] Portable Windows ZIP for both products: `kedr-studio-262.10968.SNAPSHOT.win.zip` (~933 MB) and
  `kedr-python-262.10968.SNAPSHOT.win.zip` (~587 MB); both launch from an extracted folder
- [ ] Rename `bin/idea64.exe` / `bin/pycharm64.exe` (needs matching `.vmoptions` names; verify the native launcher)
- [x] Keep upstream product codes `IC`/`PC` and build numbers so Marketplace plugin compatibility keeps working

## M2 — Remove subscription and upsell UI

See `upsell-audit.md` for what actually exists in the OSS build.

- [x] Inventory: subscription/trial UI lives in closed-source modules and is absent by construction
- [x] AI promotion window disabled (`llm.show.ai.promotion.window.on.start=false`)
- [x] Uninstall feedback link to jetbrains.com removed
- [x] Marketplace "Staff Picks" group removed (it promoted paid JetBrains AI products)
- [x] Help menu: bug report, technical support, feedback, YouTube, online docs and "What's New" removed
- [x] Update checks disabled by emptying `ExternalProductResourceUrls` (no update server yet)
- [ ] Decide whether paid plugins should be filtered out of Marketplace search
- [ ] Hide the now-empty privacy consent page for non-JetBrains vendors

## M3 — Python inside Kedr Studio

- [x] Bundle `intellij.python.community.plugin` and its dependency set into the Studio product layout
- [ ] Verify at runtime: Python run configurations, virtualenv/uv/conda interpreters, Jupyter, tests, debugger
- [ ] Verify no duplicate plugin ids when the Python plugin is also installed separately

Upstream already ships, inside the community Python plugin: `ruff`, `uv`, `pyright`, `pyrefly`, `ty`, the LSP
core, the type engine, Jupyter (via the notebook modules), pytest/unittest and the debugger. Most of the
"strengthen PyCharm" wish list is therefore already present; the gaps are:

- [ ] `mypy` integration (upstream dropped it in favour of ty/pyright/pyrefly)
- [ ] Decide whether the Studio build enables the Python "minor IDE" modules too

## M4 — Go support

- New in-tree plugin using the open LSP client API (open-sourced in 2026.2)
- `gopls` auto-detection (PATH, `GOROOT`, `go install`), diagnostics, completion, formatting, imports
- Syntax highlighting via TextMate grammar, `go.mod`/`go.sum` file types
- Run configurations for `go run`, `go test`, `go build`

## M5 — Russian localisation

- [x] Certificate of license: `su.rus.language-pack` (Marketplace id 27449) is MIT, sources on gitflic — redistribution allowed
- [x] Vendored to `third-party/plugins/rus-language-pack/lib/rus-lang-pack.jar`, wired via `getAdditionalPluginPaths` in both products
- [x] `<icon>` removed from its `plugin.xml`: the 2026.2 schema rejects the element and `listBundledPlugins` fails
- [x] Present in both portable ZIPs; IDE offers «Enable Russian and Restart» on first start
- [ ] Ship a Kedr-branded pack with our own wording (currently upstream pack credit stays with its authors)
- [ ] Decide whether Russian becomes the default UI language

## M6 — Packaging and release

- [x] Portable ZIP for both products (built, extracted and launched)
- [x] Windows installer (NSIS) for both products
- No signature initially; document SmartScreen behaviour
- [x] `LICENSE` (Apache 2.0), `NOTICE`, root `README`; upstream build notes kept as `README-upstream.md`
- [ ] Third-party license report, changelog, checksums
- [ ] Tag `v0.1.0` and attach ZIPs/installers to the release

## M7 — CI

- [x] GitHub Actions workflow (`kedr-windows.yml` + reusable `kedr-windows-build.yml`), Windows runner, Bazel cache, artifact upload
- [ ] First green CI run on GitHub
- [ ] Reproducible build script for contributors

## Plugins

- Python DAP Debugger (id 28460) — **not integrable**: 76 classes reference `com.intellij.platform.dap`, a
  closed-source module absent from the open-source tree and from upstream master. Bundling it produces a load
  error in both products. Python debugging keeps using the classic pydevd debugger.
- Details and evidence: `plugins.md`.
