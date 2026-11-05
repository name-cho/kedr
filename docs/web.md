# Web support (bundled plugin `com.kedr.web`)

Both products bundle the plugin `com.kedr.web` (module `intellij.web`, sources in `plugins/web`).

## File types

| File type | Extensions | Icon |
| --- | --- | --- |
| HTML | handled by the platform XML plugin: `htm`, `html`, `shtml` | `AllIcons.FileTypes.Html` |
| CSS | `css` | `AllIcons.FileTypes.Css` |
| SCSS | `scss` | `AllIcons.FileTypes.Css` |
| Less | `less` | `AllIcons.FileTypes.Css` |
| JavaScript | `js`, `mjs`, `cjs` | `AllIcons.FileTypes.JavaScript` |
| JSX | `jsx` | `AllIcons.FileTypes.JavaScript` |
| TypeScript | `ts`, `mts`, `cts` | `AllIcons.FileTypes.TypeScript` |
| TSX | `tsx` | `AllIcons.FileTypes.TypeScript` |

Every icon is a platform icon from `platform/icons/src/expui/fileTypes`, so the New UI theme and the dark
theme work without extra assets. The file types share the language `Web`; the syntax highlighter factory and
the editor highlighter are the TextMate ones, and the grammar is selected by the file name.

## Highlighting

Syntax highlighting uses the TextMate bundles that are already inside the TextMate plugin, so the plugin adds
no new grammar and no new license:

| Bundle | Extensions | Grammar scope |
| --- | --- | --- |
| `html` | `.html`, `.htm`, `.shtml`, `.ejs`, `.asp`, `.aspx` and more | `text.html.basic` |
| `css` | `.css` | `source.css` |
| `scss` | `.scss` | `source.css.scss` |
| `less` | `.less` | `source.css.less` |
| `javascript` | `.js`, `.mjs`, `.cjs`, `.jsx` | `source.js`, `source.js.jsx` |
| `typescript-basics` | `.ts`, `.mts`, `.cts`, `.tsx` | `source.ts`, `source.tsx` |

The bundle `typescript-basics` carries the full TypeScript and TSX grammars, not only the keywords.

`.html` keeps the real HTML file type of the XML plugin. That gives tag and attribute completion, formatting,
the structure view, inspections and the htmltools quick fixes, which a TextMate grammar cannot provide.

## New Project wizard

The generator `Web` writes `index.html`, `styles/main.css`, `scripts/main.js`, `README.md` and `.gitignore`,
then creates a module without a build system. The page already loads the stylesheet and the script.

## Web Preview

The tool window `Web Preview` renders the page next to the editor.

- The IDE starts an HTTP server on `127.0.0.1` with an ephemeral port and serves the project directory.
  Relative asset paths, ES modules and `fetch` therefore work as they do on a real server.
- Path resolution rejects every request that escapes the project directory.
- The page reloads 200 ms after a file in the project changes, which covers the save action of the IDE and
  edits made by another tool.
- If JCEF is not available, the tool window shows a message and the **Open in Browser** button still works.
  The same button is the way to use a full browser at any time.
- `Tools | Open in Web Preview` and the editor context menu open the current HTML file in the tool window.

The server listens on the loopback interface only. It stops when the project closes.

## Limitations

- Completion, refactoring, inspections and debugging for CSS, JavaScript and TypeScript are part of the
  closed-source JetBrains Web plugins (`JavaScript`, `CSS`, `HtmlTools` in the paid products). They cannot be
  built from this tree. Users who own a licence can still install those plugins from the Marketplace.
- The preview server does not bundle, transpile or hot-reload anything. A project that needs a build step
  should run its own development server and use **Open in Browser**.
- The preview has no code-to-page inspector and no live edit.
