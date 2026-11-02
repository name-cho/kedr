# Contributing to Kedr

Thanks for helping improve Kedr Studio and Kedr Python.

## Before you start

- Search the existing issues and pull requests: https://github.com/name-cho/kedr/issues
- For a large change, open an issue first so we can agree on the approach.
- Keep changes focused. Rebranding, packaging, and IDE behavior should not be mixed into one pull request unless they are genuinely related.
- Security issues go through [SECURITY.md](SECURITY.md), not public issues.

## Building

Kedr targets Windows x64. You need JDK 21 and the Bazel wrapper pinned by the repository. Build through `cmd.exe`:

```
installers.cmd -Dintellij.build.target.os=current
python\installers.cmd -Dintellij.build.target.os=current
```

See [README.md](README.md) and [docs/release.md](docs/release.md) for artifacts, verification, and smoke checks. If the IDE fails to start or a build behaves oddly, check [docs/troubleshooting.md](docs/troubleshooting.md).

## Tests and checks

Run the repository checks before sending a pull request:

```
node --test tools/kedr/*.test.mjs
```

For platform code, use the upstream test runner described in `.agents/skills/testing/SKILL.md`:

```
tests.cmd --module <iml> --test <fully.qualified.TestClass>
```

Add or update tests when behavior changes. New test code should be Kotlin and use JUnit 5 where the surrounding module already does.

## Code style

- Follow the existing style of the file you are editing.
- Kotlin and Java use two-space indentation and the upstream IntelliJ formatting conventions.
- Do not reformat unrelated code.
- Do not add explanatory comments or KDoc unless they are required by an API contract; prefer clear names and small functions.
- Keep upstream copyright headers intact. New Kedr files use the Kedr Project header.

## Branches

`main` is the only long-lived branch. It contains both Kedr Studio and Kedr Python.
Send changes through short-lived pull request branches. Delete the branch after the merge.
Do not recreate `kedr-publish` or a separate product branch.
Branch cleanup must keep tags and published releases.
See [docs/repositories.md](docs/repositories.md) for the mirror rules.

## Pull requests

Describe what changed, why, and how you tested it. Link the relevant issue. If a change affects packaging or release behavior, include the output of `tools/kedr/verify-release.mjs` or explain why it could not be run locally.
