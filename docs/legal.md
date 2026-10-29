# Legal notes

Not legal advice. Reviewed against the upstream tree at `pycharm/262.10968.92` (2026-10).

## Source code

Every source file carries a header:

> Copyright 2000-2026 JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license.

The root `LICENSE.txt` is **not** the Apache text. It is the "JetBrains Open-Source Build Terms" (v1.3, 2026-06-15),
which describes the terms JetBrains applies to *their* published Open-Source Build binaries. It does not replace the
Apache-2.0 grant attached to the source files.

Consequences for a fork:

1. We may modify and redistribute the code, including removing promotional UI.
2. We must keep copyright notices and the `NOTICE.txt` attribution, and state that we changed the files.
3. We ship our own `LICENSE` (Apache-2.0) plus `NOTICE` that lists upstream attribution.
4. We must not imply that the build is made or endorsed by JetBrains.

## Trademarks and artwork

"JetBrains", "IntelliJ IDEA", "PyCharm", their logos, product icons, splash screens and installer artwork are
trademarks/copyrighted assets and are not licensed by Apache-2.0. A redistributable fork therefore needs:

- a different product name, company name, launcher name, application id and settings directory;
- replaced product icons, splash screens and installer images;
- no JetBrains logos in About, Welcome screen or installer.

This is why the fork is rebranded rather than shipped as "IntelliJ IDEA CE, but patched".

## Third-party components

The build bundles third-party libraries and plugins with their own licenses. Before a public release:

- generate the dependency/license report from the built distribution;
- keep only components whose licenses allow redistribution;
- ship their license texts (the build already collects `licenses/`).

Plugins taken from JetBrains Marketplace are **not** covered by the repository license. They are not bundled unless
their license explicitly allows it.

## Bundled Marketplace plugins

Two plugins were considered for bundling. The rule applied: a Marketplace plugin is bundled only when its
license allows redistribution and the technical dependency set exists in the open-source tree.

| Plugin | License | Decision |
| --- | --- | --- |
| Russian Language Pack (`su.rus.language-pack`) | MIT, FREE, sources on gitflic | bundled in both products; author credit and MIT notice kept |
| Python DAP Debugger (`intellij.python.dap.plugin`) | proprietary (JetBrains) | not bundled; also technically impossible — requires closed `intellij.platform.dap` |

Bundling the MIT pack keeps its own `plugin.xml` attribution: id, name, vendor and the link to the
original repository stay untouched, only the invalid `<icon>` element is dropped so the 2026.2 schema
accepts the descriptor.

## Closed-source parts

Ultimate/Pro features live in proprietary modules (`intellij.platform.commercial`, Ultimate plugins, PyCharm Pro
plugins) that are absent from the open-source repository. They cannot be enabled by a fork; any "Pro-like" feature in
Kedr must be an independent implementation or an integration with an external open-source tool.
