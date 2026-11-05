[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('studio', 'python')]
  [string]$Product,

  [Parameter(Mandatory = $true)]
  [string]$ArtifactsDir,

  [Parameter(Mandatory = $true)]
  [string]$WorkDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$requiredPlugins = @{
  studio = @('com.intellij.java', 'PythonCore', 'com.kedr.go', 'com.kedr.web', 'org.jetbrains.plugins.textmate', 'su.rus.language-pack')
  python = @('PythonCore', 'com.jetbrains.pycharm.community.customization', 'com.kedr.go', 'com.kedr.web', 'su.rus.language-pack')
}
$forbiddenModules = @(
  'intellij.pycharm.community.ide.impl.promotion',
  'intellij.java.promo',
  'intellij.vcs.github.ultimatePromo'
)

function Invoke-CheckedProcess {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$LogPath,
    [string]$WorkingDirectory,
    [int]$TimeoutSeconds = 600
  )

  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $FilePath
  foreach ($argument in $Arguments) {
    $startInfo.ArgumentList.Add($argument)
  }
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.CreateNoWindow = $true
  if ($WorkingDirectory) {
    $startInfo.WorkingDirectory = $WorkingDirectory
  }

  $process = [System.Diagnostics.Process]::Start($startInfo)
  $stdout = $process.StandardOutput.ReadToEndAsync()
  $stderr = $process.StandardError.ReadToEndAsync()
  if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
    $process.Kill($true)
    throw "$FilePath timed out after $TimeoutSeconds seconds"
  }
  [System.IO.File]::WriteAllText($LogPath, $stdout.Result + [Environment]::NewLine + $stderr.Result)
  if ($process.ExitCode -ne 0) {
    Get-Content $LogPath -Tail 100
    throw "$FilePath failed with exit code $($process.ExitCode)"
  }
}

function Get-ProductInfo {
  param([string]$Root)

  $path = Join-Path $Root 'product-info.json'
  if (-not (Test-Path -LiteralPath $path)) {
    throw "product-info.json is missing in $Root"
  }
  $info = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  $launch = $info.launch | Where-Object { $_.os -eq 'Windows' -and (-not $_.arch -or $_.arch -eq 'amd64') } | Select-Object -First 1
  if (-not $launch) {
    throw "no Windows amd64 launcher in $path"
  }
  $launcher = Join-Path $Root $launch.launcherPath
  if (-not (Test-Path -LiteralPath $launcher)) {
    throw "launcher is missing: $launcher"
  }
  return @{ Info = $info; Launcher = $launcher }
}

function New-IsolatedProperties {
  param([string]$Root, [string]$EnvBase)

  $state = Join-Path $Root 'state'
  New-Item -ItemType Directory -Force -Path $state | Out-Null
  $props = Join-Path $state 'idea.properties'
  $normalized = $state -replace '\\', '/'
  @(
    "idea.config.path=$normalized/config"
    "idea.system.path=$normalized/system"
    "idea.plugins.path=$normalized/plugins"
    "idea.log.path=$normalized/log"
  ) | Set-Content -LiteralPath $props -Encoding ascii
  [Environment]::SetEnvironmentVariable("${EnvBase}_PROPERTIES", $props, 'Process')
  return $state
}

function Test-BundledPlugins {
  param([string]$JsonPath)

  $result = Get-Content -LiteralPath $JsonPath -Raw | ConvertFrom-Json
  foreach ($plugin in $requiredPlugins[$Product]) {
    if ($result.plugins -notcontains $plugin) {
      throw "required plugin is missing: $plugin"
    }
  }
  $layoutNames = @($result.layout | ForEach-Object { $_.name })
  foreach ($module in $forbiddenModules) {
    if ($layoutNames -contains $module) {
      throw "forbidden promo module is present: $module"
    }
  }
}

function Test-WebBundles {
  param([string]$Root)

  if ($Product -ne 'studio') {
    return
  }
  foreach ($bundle in @('html', 'css', 'javascript', 'typescript-basics')) {
    $manifest = Join-Path $Root "plugins\textmate-plugin\lib\bundles\$bundle\package.json"
    if (-not (Test-Path -LiteralPath $manifest)) {
      throw "web TextMate bundle is missing: $bundle"
    }
  }
}

$logDir = (Get-Location).Path
$artifacts = (Resolve-Path -LiteralPath $ArtifactsDir).Path
$zip = Get-ChildItem -LiteralPath $artifacts -Filter "kedr-$Product-*.win.zip" |
  Where-Object { $_.Name -notmatch 'aarch64|arm64' } |
  Select-Object -First 1
$installer = Get-ChildItem -LiteralPath $artifacts -Filter "kedr-$Product-*.exe" |
  Where-Object { $_.Name -notmatch 'aarch64|arm64' } |
  Select-Object -First 1
if (-not $zip -or -not $installer) {
  throw "x64 ZIP and NSIS installer are required in $artifacts"
}

if (Test-Path -LiteralPath $WorkDir) {
  Remove-Item -LiteralPath $WorkDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
$work = (Resolve-Path -LiteralPath $WorkDir).Path
$portable = Join-Path $work 'portable'
New-Item -ItemType Directory -Force -Path $portable | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($zip.FullName, $portable)

$productInfo = Get-ProductInfo -Root $portable
$envBase = $productInfo.Info.envVarBaseName
$portableState = New-IsolatedProperties -Root (Join-Path $work 'portable-state') -EnvBase $envBase
$portablePlugins = Join-Path $portableState 'bundled-plugins.json'
Invoke-CheckedProcess -FilePath $productInfo.Launcher -Arguments @('listBundledPlugins', $portablePlugins) `
  -LogPath (Join-Path $logDir "smoke-$Product-portable.log") -WorkingDirectory $portable
Test-BundledPlugins -JsonPath $portablePlugins
Test-WebBundles -Root $portable

$sample = Join-Path $work 'sample.py'
Set-Content -LiteralPath $sample -Value 'x=1' -Encoding ascii
Invoke-CheckedProcess -FilePath $productInfo.Launcher -Arguments @('format', '-allowDefaults', $sample) `
  -LogPath (Join-Path $logDir "smoke-$Product-format.log") -WorkingDirectory $portable

$installDir = Join-Path $work 'installed'
$config = Join-Path $work 'silent.config'
@(
  'mode=user'
  'launcher64=0'
  'updatePATH=0'
  'updateContextMenu=0'
) | Set-Content -LiteralPath $config -Encoding ascii
$installLog = Join-Path $work 'nsis-install.log'
Invoke-CheckedProcess -FilePath $installer.FullName `
  -Arguments @('/S', "/CONFIG=$config", "/LOG=$installLog", "/D=$installDir") `
  -LogPath (Join-Path $logDir "smoke-$Product-installer.log") -TimeoutSeconds 900
if (Test-Path -LiteralPath $installLog) {
  Copy-Item -LiteralPath $installLog -Destination (Join-Path $logDir "smoke-$Product-nsis.log") -Force
}

$installed = Get-ProductInfo -Root $installDir
$installedState = New-IsolatedProperties -Root (Join-Path $work 'installed-state') -EnvBase $envBase
$installedPlugins = Join-Path $installedState 'bundled-plugins.json'
Invoke-CheckedProcess -FilePath $installed.Launcher -Arguments @('listBundledPlugins', $installedPlugins) `
  -LogPath (Join-Path $logDir "smoke-$Product-installed.log") -WorkingDirectory $installDir
Test-BundledPlugins -JsonPath $installedPlugins
Test-WebBundles -Root $installDir

$uninstaller = Join-Path $installDir 'bin\Uninstall.exe'
if (-not (Test-Path -LiteralPath $uninstaller)) {
  throw "uninstaller is missing: $uninstaller"
}
$uninstallAnchor = (Join-Path $installDir 'bin') -replace '/', '\'
Invoke-CheckedProcess -FilePath $uninstaller `
  -Arguments @('/S', '/NO_UNINSTALL_FEEDBACK=true', "_?=$uninstallAnchor") `
  -LogPath (Join-Path $logDir "smoke-$Product-uninstall.log") -TimeoutSeconds 600
if (Test-Path -LiteralPath $installed.Launcher) {
  throw "uninstaller left the product launcher behind: $($installed.Launcher)"
}

Remove-Item -LiteralPath $work -Recurse -Force
Write-Output "smoke passed: $Product"
