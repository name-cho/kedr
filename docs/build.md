# Build

Everything below was verified on Windows 11 x64, 28 logical cores, 32 GB RAM.

## What changed upstream

Since 2025.x the repository is built with **Bazel** (JetBrains fork `9.1.0-jb`), not Gradle.
There is no `gradlew`, no `build.gradle.kts`, and IDE-only builds are unsupported.
The Windows build script is `installers.cmd`; it invokes `bazel run @community//build:i_build_target`.

Compiler JDK is supplied by the build: **JetBrains Runtime 25 without JCEF** (Bazel downloads it).
A system JDK is not needed, but `git` and a working `tar` are.

## Prerequisites

- Windows x64, ~80 GB free disk (source + Bazel cache + outputs)
- 32 GB RAM recommended; Bazel server alone takes ~10 GB
- Git with `core.longpaths=true`
- No Visual Studio required for the Java-only part; native targets pull their own toolchains

## Checkout

```powershell
git -c core.longpaths=true clone --depth 1 --single-branch `
  --branch pycharm/262.10968.92 `
  https://github.com/JetBrains/intellij-community.git C:\ide-fork\src
cd C:\ide-fork\src
git config core.longpaths true
git config core.autocrlf input

# Android modules are part of the JPS project model and the build fails without them
git clone --depth 1 --single-branch --branch 262.9437 git://git.jetbrains.org/idea/android.git android
```

## Bazel configuration

`%USERPROFILE%\.bazelrc`:

```
startup --output_user_root=C:/ide-fork/bazelroot
startup --host_jvm_args=-Djava.net.preferIPv4Stack=true
```

Why:

- the default output root is `C:/ProgramData/_bazel`, which may not be writable without elevation;
- on machines where the IPv6 loopback is broken (`ping ::1` fails), the Bazel server binds `[::1]` and the client can
  never connect, failing with `couldn't connect to server (408) after 120 seconds`. Forcing the IPv4 stack fixes it.

## Build

```powershell
cd C:\ide-fork\src
.\installers.cmd -Dintellij.build.target.os=current          # Kedr Studio (IDEA)
.\python\installers.cmd -Dintellij.build.target.os=current   # Kedr Python (PyCharm)
```

> **PowerShell breaks `-Dkey=value` arguments.** When PowerShell calls a `.cmd` file it splits
> `-Dintellij.build.target.os=current` into `-Dintellij` and `.build.target.os`, and the build dies with
> `Could not find or load main class .build.target.os=current`. Run the build through `cmd.exe`:
>
> ```powershell
> cmd /c "cd /d C:\ide-fork\src && installers.cmd -Dintellij.build.target.os=current"
> ```

Artifacts: `out/kedr-studio/artifacts`, `out/kedr-python/artifacts`.

The Windows installer step is NSIS-based and slow; to produce only the portable ZIP add
`-Dintellij.build.skip.build.steps=windows_exe_installer`.

Upstream skipped `WINDOWS_ZIP_STEP` in `python/build/src/PyCharmCommunityInstallersBuildTarget.kt`; Kedr removed it
from the skip list, so `python\installers.cmd` now produces `kedr-python-<build>.win.zip` next to the executable.
A cold Kedr Python build takes ~19 minutes (module sources archives and the two arch ZIPs dominate).

First build: ~5 900 Bazel actions, analysis alone took ~30 minutes and ~10 GB of cache.
Incremental builds after a source change are much faster.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `couldn't connect to server (408)` | Bazel bound to `[::1]`, IPv6 loopback broken | `startup --host_jvm_args=-Djava.net.preferIPv4Stack=true` |
| `FileNotFoundException ... android\...\*.iml` | missing Android checkout | clone `JetBrains/android` branch `262.9437` into `android/` |
| Build is extremely slow on Windows | Defender scans `bazel-out` | add exclusions for the source, output root and Bazel cache |
| `Could not find or load main class .build.target.os=current` | PowerShell split the `-D` argument | run through `cmd /c`, see above |

## Bundled external plugins

Third-party plugins are vendored under `src/third-party/plugins/<plugin>/` and added through
`getAdditionalPluginPaths` in `IdeaCommunityProperties.kt` and `PyCharmCommunityProperties.kt`.
The build copies the plugin directory into `plugins/` of every distribution.

Currently bundled: the MIT Russian Language Pack (`rus-language-pack`). Its `plugin.xml` must not
contain `<icon>`: the 2026.2 descriptor parser fails the whole build with
`Unknown element: icon` during `listBundledPlugins`. See `plugins.md` for the repacking recipe.

Plugin errors surface in `idea.log` as
`Plugin '<name>' has dependency on '<module>' which is not installed` — a bundled plugin that
references a closed-source module cannot load and must not be shipped.
