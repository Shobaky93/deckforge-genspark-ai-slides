$ErrorActionPreference = "Stop"

$payloadDir = $PSScriptRoot
$repoRoot = Split-Path -Parent $payloadDir
$manifest = Get-Content -Raw (Join-Path $payloadDir "manifest.json") | ConvertFrom-Json
$parts = @(Get-ChildItem -LiteralPath $payloadDir -Filter "app.js.part*.txt" | Sort-Object Name)

if ($parts.Count -ne [int]$manifest.parts) {
    throw "Expected $($manifest.parts) app.js parts, found $($parts.Count)."
}

$source = ($parts | ForEach-Object { [IO.File]::ReadAllText($_.FullName) }) -join ""
if ($source.Length -ne [int]$manifest.characters) {
    throw "Character-count verification failed for app.js."
}

$utf8 = [Text.UTF8Encoding]::new($false)
$sha256 = [Security.Cryptography.SHA256]::Create()
try {
    $hashBytes = $sha256.ComputeHash($utf8.GetBytes($source))
} finally {
    $sha256.Dispose()
}
$actualHash = ($hashBytes | ForEach-Object { $_.ToString("x2") }) -join ""

if ($actualHash -ne $manifest.sha256) {
    throw "SHA-256 verification failed for app.js."
}

$outputPath = Join-Path $repoRoot "deckforge\app.js"
[IO.File]::WriteAllText($outputPath, $source, $utf8)
Write-Host "Verified deckforge/app.js ($($source.Length) characters)"
