# Russian Language Pack provenance

- Plugin id: `su.rus.language-pack`
- Version: `1.0.3`
- Upstream: https://gitflic.ru/project/russky/rus-jetbrains
- Marketplace id: 27449
- License: MIT
- Vendor: Открытое сообщество русских разработчиков
- Vendored file: `lib/rus-lang-pack.jar`
- SHA-256: `5355a15493d71adaa932bdd006612b313e23dfcaca0b19f3f172a285fd8c1ee7`

## Local modification

The `<icon>` element was removed from `META-INF/plugin.xml` inside the jar because the 2026.2 plugin schema rejects it and `listBundledPlugins` fails during packaging. No translation strings were changed.

## Updating

1. Download the new jar from the upstream project.
2. Verify its license and plugin id.
3. Apply the same `<icon>` removal if the schema still requires it.
4. Replace `lib/rus-lang-pack.jar`.
5. Update the version and SHA-256 in this file.
6. Build both products and run the release smoke checks.
