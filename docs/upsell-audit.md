# Upsell audit

What the upstream Community Edition actually shows, and what Kedr changes.

The audit was done on `IC-262.10968.63` (the installed upstream OSS build) with a clean
config directory, and cross-checked against the `262.10968.92` sources.

## Why there is little to remove

The commercial code lives in `intellij.platform.commercial.*` modules which are **not part of
the open-source build**. `PyCharmCommunityProperties` even declares
`allowMissingDependencies("intellij.platform.commercial.dependencies")`. With no
`LicensingFacade` implementation, every subscription path is dead code:

* `subscription.dialog.*` strings (trial expired, "Activate a Pro subscription", "Promise to
  pay later") are only reachable from the commercial licence module.
* The licence/registration dialog and the "Trial" badge are not registered.
* The update checker no longer offers paid editions (a 2026 change: self-update was moved to
  the Toolbox App, `ApplicationInfoEx.getUpdateUrls` is gone).

So there is no subscription UI to delete. What remains are **promotions**.

## Promotion surfaces found

| # | Where | What | Verdict |
|---|-------|------|---------|
| 1 | Plugins page, "Staff Picks" group | Marketplace query `is_featured_search=true`; the first entry was "Junie, the AI coding agent by JetBrains" | **Removed.** `MarketplacePluginsTab` no longer builds the group. |
| 2 | Plugins page, paid plugin install dialog | "Start the 30-day trial or purchase a license" (`label.install.paid.*`, `plugins.configurable.buy.the.license`) | Kept for now, see below |
| 3 | AI promotion window on start | Gated by `llm.show.ai.promotion.window.on.start` | Already off upstream, and Kedr sets it explicitly in both products |
| 4 | Welcome screen onboarding card | "Take a quick onboarding tour / Start Tour in Java" | Kept - it is a tutorial, not a sales pitch |
| 5 | Uninstall feedback page | Opened `jetbrains.com/.../uninstall` in a browser after removal | Disabled (`uninstallFeedbackUrl { null }`) |
| 6 | About dialog | "Copyright (c) 2000-2026 JetBrains s.r.o." | Replaced by the fork's own company record, plus a "Based on the IntelliJ Platform by JetBrains" line |
| 7 | Help menu: Submit a Bug Report / Contact Support / Submit Feedback | Opened JetBrains YouTrack and the JetBrains feedback form, uploading the IDE build report | **Removed** from `PlatformActions.xml` |
| 8 | Help menu: What's New / IntelliJ IDEA on YouTube / Online Documentation / Help | JetBrains blog, YouTube channel, `jetbrains.com/help` | **Removed.** Kedr has no docs site yet, so these actions are gone rather than pointing at a foreign product |
| 9 | Help menu and welcome screen: Check for Updates | Queried `jetbrains.com/updates/updates.xml` for product code `IC` and could offer an actual JetBrains build | **Removed.** Kedr has no update server; see `roadmap.md` |

### Vendor resource URLs

All of the JetBrains-hosted resources above come from a single service,
`ExternalProductResourceUrls`. Kedr replaces both implementations
(`IntelliJIdeaExternalResourceUrls`, `PyCharmExternalResourceUrls`) with an empty
implementation, so the platform itself hides update checks, bug-report and feedback actions,
YouTube links and web help. Nothing in the UI can reach a JetBrains URL any more.

## Paid plugins

The plugin marketplace is a store: results are shown with an **Install** button whether the
plugin is free or paid, and the payment flow only appears inside the plugin after
installation. Filtering by price is possible (the search API returns a pricing model) but
would also hide useful paid plugins, so it is left as a product decision rather than a
default. Tracked in `roadmap.md`.

## Vendor switch side effect

Changing the `<company>` record changes `idea.vendor.name` from `JetBrains` to `Kedr`
(`BuildContextImpl` passes `applicationInfo.shortCompanyName`). Two upstream code paths
assume the JetBrains vendor:

1. `AppUIUtil.loadConsentsForEditing` mutated an immutable `List.of()` when the product has
   no bundled consents and crashed `ConsentConfigurable`. Fixed by copying to a mutable list.
2. The privacy consent page is then empty. It is harmless but pointless; hiding it for
   non-JetBrains vendors is a polish item.

JetBrains-specific features that key off `idea.vendor.name == "JetBrains"` (GDPR consent
uploads, account integration) are now disabled by construction, which is what we want.

## Ultimate "feature" promo locks in the Settings tree

Upstream shows greyed-out, padlocked entries for Ultimate-only features plus "try Ultimate"
promo pages. They come from the java-promo module (IDEA) and the
intellij.pycharm.community.ide.impl.promotion module (PyCharm), which register
applicationConfigurables (ids promo.database, promo.kubernetes, promo.javascript,
promo.typescript, promo.swagger, promo.profiler) and a batch of AllIcons.Ultimate.Lock
actions.

Kedr changes:

The product descriptors no longer include the Java, Python or GitHub promo modules.
Release verification checks the packaged layout and rejects these modules. Commercial-edition
suggestions also have a separate product policy, which Kedr disables.

### Free alternatives for the padlocked features

| Locked (Ultimate) feature | Free alternative |
| --- | --- |
| Java Profiler | JFR: record via run config VM options (-XX:StartFlightRecording=...) and open the .jfr; or the free Async Profiler agent |
| Kubernetes | kubectl/official CLI + YAML editing (no vendor lock); "Kubernetes by Red Hat" is free but is a separate Marketplace plugin, not bundled |
| Database | DBeaver (standalone); within the IDE a JDBC connection can be driven from a run config or the bundled JDBC console; "Database Navigator" is a free Marketplace plugin, not bundled |
| JavaScript / TypeScript | Use the LSP route: the open LSP client is in intellij.platform.lsp; 	ypescript-language-server + gopls-style wiring gives completion/diagnostics without the Ultimate JS engine |
| OpenAPI Specifications | Edit openapi.yaml/openapi.json as plain text/YAML with JSON Schema; request preview via the HTTP client |

## Error reporting

Kedr registers `KedrErrorReportSubmitter` as the platform error handler. The IDE error
dialog, startup failure dialog, and memory-use report save ZIP archives locally. The
heap-dump path no longer asks for automatic-report consent and no longer uploads anything.
`ITNReporter`, `ITNProxy`, `LogUploader`, and the Marketplace error submitter are not used by
these Kedr flows.
