$ErrorActionPreference = "Stop"

$payloadDir = $PSScriptRoot
$repoRoot = Split-Path -Parent $payloadDir
$manifest = Get-Content -Raw (Join-Path $payloadDir "deck-json-manifest.json") | ConvertFrom-Json
$parts = @(Get-ChildItem -LiteralPath $payloadDir -Filter "jordan-argentina-3slides.deck.json.part*.txt" | Sort-Object Name)

if ($parts.Count -ne [int]$manifest.parts) {
    throw "Expected $($manifest.parts) deck JSON parts, found $($parts.Count)."
}

$source = ($parts | ForEach-Object { [IO.File]::ReadAllText($_.FullName) }) -join ""
if ($source.Length -ne [int]$manifest.characters) {
    throw "Character-count verification failed for the deck JSON."
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
    throw "SHA-256 verification failed for the deck JSON."
}

$outputDir = Join-Path $repoRoot "examples\jordan-argentina"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
$outputPath = Join-Path $outputDir $manifest.name
[IO.File]::WriteAllText($outputPath, $source, $utf8)
Write-Host "Verified examples/jordan-argentina/$($manifest.name) ($($source.Length) characters)"
