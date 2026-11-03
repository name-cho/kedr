# Roadmap

Target platform: **Windows x64**. macOS and Linux are out of scope until someone can build and test them.

## M0 — Bootstrap

- [x] Clone upstream at `pycharm/262.10968.92` (2026.2.3)
- [x] Rebase the product line onto IntelliJ Platform 2026.3 RC (`263.7307.112`)
- [x] Toolchain: Bazel (JetBrains fork 9.1.0-jb), JBR 25 without JCEF
- [x] Fix local Bazel startup (broken IPv6 loopback on the build machine)
- [x] Baseline build of the unmodified IDEA Community distribution (`out/idea-ce/artifacts`)
- [x] Branded build of PyCharm Community (`out/kedr-python/artifacts`, ~19 min cold)

## M1 — Rebrand to Kedr

- [x] Product descriptors: `IdeaApplicationInfo.xml`, `PyCharmCoreApplicationInfo.xml`
- [x] Drop the `RC` version suffix for the stable 1.2 release in both products
- [x] Product properties: `IdeaCommunityProperties.kt`, `PyCharmCommunityProperties.kt`
- [x] Settings/system dirs: `KedrStudio2026.3`, `KedrPython2026.3` (no shared state with real JetBrains IDEs)
- [x] Icons, splash, installer bitmaps, window title
- [x] About dialog: own copyright record plus a "Based on the IntelliJ Platform by JetBrains" line
  (verified at runtime in both products)
- [x] Portable Windows ZIP for both products; the 2026.2 builds launched from extracted folders
- [x] Verify the 2026.3 ZIPs and installers in Windows CI
- [x] Keep `bin/idea64.exe` / `bin/pycharm64.exe` and upstream product codes `IC`/`PC` so Marketplace plugin compatibility keeps working

## M2 — Remove subscription and upsell UI

See `upsell-audit.md` for what actually exists in the OSS build.

- [x] Inventory: subscription/trial UI lives in closed-source modules and is absent by construction
- [x] AI promotion window disabled (`llm.show.ai.promotion.window.on.start=false`)
- [x] Uninstall feedback link to jetbrains.com removed
- [x] Marketplace "Staff Picks" group removed (it promoted paid JetBrains AI products)
- [x] Help menu: bug report, technical support, feedback, YouTube, online docs and "What's New" removed
- [x] Update checks disabled by emptying `ExternalProductResourceUrls` (no update server yet)
- [x] Keep third-party paid plugins visible in Marketplace search; remove Kedr/JetBrains edition upsell instead
- [x] Disable commercial-edition suggestions and unbundle promo modules (`intellij.java.promo`, `intellij.pycharm.community.ide.impl.promotion`, `intellij.vcs.github.ultimatePromo`)
- [x] Replace JetBrains error reporting with local ZIP reports (IDE errors, startup failures, memory-use reports)
- [ ] Hide the now-empty privacy consent page for non-JetBrains vendors

## M3 — Professional Python development

- [x] Build Kedr Python as a dedicated Python IDE
- [x] Bundle `intellij.python.community.plugin` and its dependency set into Studio as well
- [ ] Verify at runtime: Python run configurations, virtualenv/uv/conda interpreters, Jupyter, tests, debugger
- [ ] Verify no duplicate plugin ids when the Python plugin is also installed separately

Upstream already ships, inside the community Python plugin: `ruff`, `uv`, `pyright`, `pyrefly`, `ty`, the LSP
core, the type engine, Jupyter (via the notebook modules), pytest/unittest and the debugger. Most of the
"strengthen PyCharm" wish list is therefore already present; the gaps are:

- [x] `mypy` integration is bundled through the PythonCore plugin modules
- [ ] Decide whether the Studio build enables the Python "minor IDE" modules too

## M4 — Go in Kedr Studio

- [x] Keep Go in the universal-editor scope, including installer file associations
- [x] Bundle the Go TextMate grammar for syntax highlighting without an external language server
- [x] Provide the Kedr Go plugin and New Project wizard
- [x] Show the platform Go icon in the wizard, for `.go` files and for `go.mod`, `go.sum`, `go.work`, `go.work.sum`
- [x] Connect `gopls` through the open LSP client when it is available on `PATH`
- [ ] Add Go toolchain discovery beyond `PATH` and run configurations for `go run`, `go test`, `go build`
- [ ] Verify highlighting and the optional LSP integration in Windows release smoke tests

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
- [x] SHA-256/SHA-512 sidecars, combined `SHA256SUMS`, artifact verification and Windows smoke checks in CI
- [x] Draft GitHub release workflow for ZIPs and installers
- [ ] Third-party license report and changelog polish
- [ ] Tag `v0.1.0`, review the draft release, and publish

## M7 — CI

- [x] GitHub Actions workflow (`kedr-windows.yml` + reusable `kedr-windows-build.yml`), Windows runner, Bazel cache, artifact upload
- [x] Pinned actions and Android module checkout; repository checks workflow (`kedr-checks.yml`)
- [ ] First green CI run on GitHub
- [ ] Reproducible build script for contributors

## Plugins

- Python DAP Debugger (id 28460) — **not integrable**: 76 classes reference `com.intellij.platform.dap`, a
  closed-source module absent from the open-source tree and from upstream master. Bundling it produces a load
  error in both products. Python debugging keeps using the classic pydevd debugger.
- Details and evidence: `plugins.md`.
