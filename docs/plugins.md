# Bundled and considered plugins

## Russian Language Pack (Marketplace id 27449)

- Plugin id `su.rus.language-pack`, version 1.0.3, vendor «Открытое сообщество русских разработчиков».
- License: MIT (`urls.licenseUrl = https://opensource.org/licenses/MIT` from the Marketplace API),
  pricing FREE, sources `https://gitflic.ru/project/russky/rus-jetbrains`. Redistribution is allowed;
  the author's credit and the MIT notice must stay with the jar.
- Vendored at `src/third-party/plugins/rus-language-pack/lib/rus-lang-pack.jar`.
- Wired for both products through `getAdditionalPluginPaths` in `IdeaCommunityProperties.kt` and
  `PyCharmCommunityProperties.kt`; the build copies the directory into `plugins/rus-language-pack`.
- The upstream jar contains a `<icon>pluginIcon.svg</icon>` element and stray `.idea/` project files.
  The 2026.2 plugin descriptor parser rejects unknown root elements and the build dies in
  `listBundledPlugins` with `java.lang.Throwable: Unknown element: icon`. The vendored copy is
  repacked without that element and without `.idea/`.
- Verified: both portable ZIPs contain `plugins/rus-language-pack/lib/rus-lang-pack.jar`; the IDE loads
  it and offers «Enable Russian and Restart». The UI still starts in English because switching the
  language is a user action recorded in the IDE settings.

Repacking recipe:

```python
import zipfile
src = r'C:\ide-fork\vendor\plugins\rus-lang-pack-1.0.3.jar'
dst = r'C:\ide-fork\src\third-party\plugins\rus-language-pack\lib\rus-lang-pack.jar'
zin, zout = zipfile.ZipFile(src), zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
for item in zin.infolist():
    if item.filename.startswith('.idea/'):
        continue
    data = zin.read(item.filename)
    if item.filename == 'META-INF/plugin.xml':
        data = ''.join(l for l in data.decode('utf-8').splitlines(True) if '<icon>' not in l).encode('utf-8')
    zout.writestr(item, data)
zout.close(); zin.close()
```

## Python DAP Debugger (Marketplace id 28460)

- Plugin id `intellij.python.dap.plugin`, version 262.10968.63, vendor JetBrains, proprietary.
- Cannot be bundled:
  - `plugin.xml` declares `<module name="intellij.platform.dap" />`;
  - 76 of its 210 classes reference `com.intellij.platform.dap`;
  - the module does not exist in this tree (`platform/dap` is absent) and does not exist in
    `JetBrains/intellij-community` master either — it is a closed-source part of the commercial products.
- Installing it from the IDE plugins directory produces
  `Plugin 'Python DAP Debugger' has dependency on 'intellij.platform.dap' which is not installed`
  and the plugin is excluded from loading.
- Consequence: Python debugging in Kedr Python and Kedr Studio uses the classic pydevd debugger that
  ships inside the community Python plugin (`plugins/python-ce/helpers/pydev`). No DAP features.

## What is bundled upstream and already works

The community Python plugin already contains `ruff`, `uv`, `pyright`, `pyrefly`, `ty`, the LSP core,
the type engine, Jupyter modules, pytest/unittest and the pydevd debugger. `mypy` is not part of it —
upstream dropped it in favour of ty/pyright/pyrefly.
