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
| 2 | Plugins page, paid plugin install dialog | "Start the 30-day trial or purchase a license" (`label.install.paid.*`, `plugins.configurable.buy.the.license`) | **Kept.** This is a third-party plugin's licensing flow, not a Kedr or JetBrains edition upsell |
| 3 | AI promotion window on start | Gated by `llm.show.ai.promotion.window.on.start` | Already off upstream, and Kedr sets it explicitly in both products |
| 4 | Welcome screen onboarding card | "Take a quick onboarding tour / Start Tour in Java" | Kept - it is a tutorial, not a sales pitch |
| 5 | Uninstall feedback page | Opened `jetbrains.com/.../uninstall` in a browser after removal | Disabled (`uninstallFeedbackUrl { null }`) |
| 6 | About dialog | "Copyright (c) 2000-2026 JetBrains s.r.o." | Replaced by the fork's own company record, plus a "Based on the IntelliJ Platform by JetBrains" line |
| 7 | Help menu: Submit a Bug Report / Contact Support / Submit Feedback | Opened JetBrains YouTrack and the JetBrains feedback form, uploading the IDE build report | **Removed** from `PlatformActions.xml`. Local report saving is described in `troubleshooting.md` |
| 8 | Help menu: What's New / IntelliJ IDEA on YouTube / Online Documentation / Help | JetBrains blog, YouTube channel, `jetbrains.com/help` | **Removed.** The repository now has `README.md`, `docs/release.md`, and `docs/troubleshooting.md` instead of vendor links |
| 9 | Help menu and welcome screen: Check for Updates | Queried `jetbrains.com/updates/updates.xml` for product code `IC` and could offer an actual JetBrains build | **Removed.** Kedr has no update server; see `roadmap.md` |
| 10 | Editor notifications: "Try IntelliJ IDEA Ultimate" / "Try PyCharm Professional" | `PluginAdvertiserService` mapped `IC → IU` and `PC → PY`, bundled promo modules added more suggestions | **Disabled.** `ExternalProductResourceUrls.commercialEditionSuggestionsEnabled` is false for Kedr; promo modules are unbundled |
| 11 | IDE error dialog / startup failure / memory-use report | Uploaded reports to JetBrains via `ITNReporter`, `ITNProxy`, `LogUploader` | **Replaced.** `KedrErrorReportSubmitter` and `StartupErrorReporter` save local ZIP archives; heap-dump auto-report removed |

### Vendor resource URLs

All of the JetBrains-hosted resources above come from a single service,
`ExternalProductResourceUrls`. Kedr replaces both implementations
(`IntelliJIdeaExternalResourceUrls`, `PyCharmExternalResourceUrls`) with an empty
implementation, so the platform itself hides update checks, bug-report and feedback actions,
YouTube links and web help. Kedr also sets `commercialEditionSuggestionsEnabled = false`,
which removes the `IC → IU` and `PC → PY` upgrade suggestions without touching third-party
plugin discovery.

The bundled promo modules `intellij.java.promo`,
`intellij.pycharm.community.ide.impl.promotion`, and
`intellij.vcs.github.ultimatePromo` are no longer dependencies of the product descriptors.
Release verification fails if any of them appears in the packaged layout.

## Paid plugins

The plugin marketplace is a store: results are shown with an **Install** button whether the
plugin is free or paid, and the payment flow only appears inside the plugin after
installation. Kedr keeps third-party paid plugins visible; filtering by price would hide
useful plugins and is not a JetBrains upsell. What Kedr removes is the suggestion to replace
the free IDE with a commercial JetBrains edition.

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

## Error reporting

Kedr registers `KedrErrorReportSubmitter` as the platform error handler. The IDE error
dialog, startup failure dialog, and memory-use report save ZIP archives locally. The
heap-dump path no longer asks for automatic-report consent and no longer uploads anything.
`ITNReporter`, `ITNProxy`, `LogUploader`, and the Marketplace error submitter are not used by
these Kedr flows.
