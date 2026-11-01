# Go TextMate grammar

Source: https://github.com/worlpaker/go-syntax
Commit: `c74e22eb9ef32958e3edd130ea750ce78d8b8241`
License: MIT, see `LICENSE.txt`.

The grammar maps `.go` files to `source.go`. Kedr registers the TextMate syntax
highlighter and editor highlighter for its Go file type, so highlighting does not
depend on `gopls` or a Go SDK. `GoLexerTest` checks tokenization and
`GoHighlightingWiringTest` checks the editor registrations.
