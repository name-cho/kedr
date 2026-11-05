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

## Web support (bundled plugin `com.kedr.web`)

- Plugin id `com.kedr.web`, module `intellij.web`, sources in `plugins/web`. Bundled in both products.
- File types and platform icons for CSS, SCSS, Less, JavaScript, JSX, TypeScript and TSX. HTML keeps the
  platform file type of the XML plugin.
- Highlighting uses the TextMate bundles that already ship inside the TextMate plugin (`html`, `css`, `scss`,
  `less`, `javascript`, `typescript-basics`), so no new grammar and no new licence enters the build.
- The plugin adds a `Web` generator to the New Project wizard and the `Web Preview` tool window. The tool
  window serves the project over a local HTTP server on `127.0.0.1` and reloads the page on save.
- Completion and refactoring for CSS, JavaScript and TypeScript stay in the closed-source JetBrains Web
  plugins; they are not part of this tree. Details: [web.md](web.md).

## What is bundled upstream and already works

The community Python plugin already contains `ruff`, `uv`, `pyright`, `pyrefly`, `ty`, `zuban`,
the LSP core, the type engine, Jupyter modules, pytest/unittest and the pydevd debugger.

`mypy` is bundled as well: `PythonCore` declares `intellij.python.mypy.common` and
`intellij.python.mypy.frontend`, backed by `python/python-mypy`. Earlier revisions of this document
claimed upstream had dropped it in favour of ty/pyright/pyrefly; that was true for 2026.2 and is not
true for 2026.3. The integration registers a `pyTool`, so the IDE drives `mypy` but the `mypy` package
itself still has to be installed in the selected interpreter, exactly like `ruff` or `black`.
