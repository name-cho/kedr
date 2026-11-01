# Troubleshooting

## The IDE does not start

Run the launcher from `cmd.exe` so startup errors stay visible:

```
bin\idea64.exe
bin\pycharm64.exe
```

If startup fails before the IDE window appears, Kedr offers to save a local diagnostic ZIP. It is written only to the location you choose; nothing is uploaded. The archive contains the startup log and any attachments you allowed. Review it before sharing.

Logs for a normal installation are under the product log directory, usually:

```
%LOCALAPPDATA%\KedrStudio2026.2\log
%LOCALAPPDATA%\KedrPython2026.2\log
```

Portable ZIPs keep state next to the extracted distribution unless you override `idea.config.path`, `idea.system.path`, `idea.plugins.path`, or `idea.log.path`.

## Windows SmartScreen warns about the installer

Kedr installers are not code-signed yet. SmartScreen may show "Windows protected your PC". Verify the download against the published SHA-256/SHA-512 checksums, then choose **More info → Run only if you trust the source**. Do not bypass the warning for a file from an unofficial mirror.

## Installer asks for elevation or fails

Kedr uses a per-user NSIS installer by default. Install into an empty directory where your user account has write access. A silent install can be run as:

```
kedr-studio-<build>.exe /S /CONFIG=silent.config /LOG=install.log /D=C:\Kedr\Studio
```

`/D` must be the last argument and must not be quoted. A minimal `silent.config` is:

```
mode=user
launcher64=0
updatePATH=0
updateContextMenu=0
```

Uninstall through `bin\Uninstall.exe` in the installation directory, or through Windows Settings → Apps.

## A Marketplace plugin does not load

Kedr intentionally keeps the upstream product codes `IC` and `PC` and the launcher names `idea64.exe` / `pycharm64.exe`. Plugins that check those values should keep working. Plugins that require closed-source JetBrains modules, a paid license, or a different product code may still fail. Check the plugin's compatibility range and `idea.log` for the exact load error.

## Russian language pack

Both products bundle `su.rus.language-pack`. The UI starts in English; enable Russian in Settings → Appearance & Behavior → System Settings → Language. Provenance and the vendored jar checksum are recorded in `third-party/plugins/rus-language-pack/PROVENANCE.md`.

## Error reports and memory reports

Kedr does not send crash reports to JetBrains. The IDE error dialog and the memory-use report save a local ZIP archive instead. Automatic error reporting is disabled. You can inspect the archive and decide whether to attach it to a GitHub issue.

## Build problems

- Use `cmd.exe`, not PowerShell, for `installers.cmd -D...` arguments.
- Make sure JDK 21 is on `PATH` and `JAVA_HOME` points to it.
- The Bazel wrapper downloads a pinned JetBrains Bazel build. If that download fails, check network access to GitHub and JetBrains cache redirectors before retrying.
- Do not edit Bazel build files while a build is running.
- `out\dist.win.x64` is a transient staging tree. Publish the ZIP or installer from `out\kedr-*\artifacts`, not the directory.

If you still cannot build, open an issue with the command line, the last 100 lines of the build log, and your Windows/JDK versions.
