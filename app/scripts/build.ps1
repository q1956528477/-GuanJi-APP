# 观己 Web 资源构建脚本
# 直接调用 esbuild 原生程序，避免某些 Node 环境在非 ASCII 路径下加载脚本文件时的崩溃。
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$candidates = @(
  (Join-Path $root "node_modules\@esbuild\win32-x64\esbuild.exe"),
  (Join-Path $root "node_modules\@esbuild\win32-arm64\esbuild.exe")
)
$esbuild = $null
foreach ($c in $candidates) {
  if (Test-Path -LiteralPath $c) { $esbuild = $c; break }
}
if (-not $esbuild) {
  $found = Get-ChildItem -Path (Join-Path $root "node_modules\@esbuild") -Recurse -Filter "esbuild.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) { $esbuild = $found.FullName }
}
if (-not $esbuild) { throw "未找到 esbuild 原生程序，请先执行 npm ci" }

function Build-One($entry, $out, $globalName, $format) {
  $args = @($entry, "--bundle", "--outfile=$out", "--log-level=warning","--minify")
  if ($format) { $args += "--format=$format" }
  if ($globalName) { $args += "--global-name=$globalName" }
  & $esbuild @args
  if ($LASTEXITCODE -ne 0) { throw "esbuild 构建失败: $entry" }
}

Build-One (Join-Path $root "src\native.js") (Join-Path $root "www\native.bundle.js") $null $null
Build-One (Join-Path $root "src\notify.js") (Join-Path $root "www\notify.bundle.js") $null $null
Build-One (Join-Path $root "src\liuyao.js") (Join-Path $root "www\liuyao.bundle.js") "LiuYao" "iife"
Build-One (Join-Path $root "src\bazi.js") (Join-Path $root "www\bazi.bundle.js") "Bazi" "iife"
Write-Host "构建完成：native.bundle.js / notify.bundle.js / liuyao.bundle.js / bazi.bundle.js"
