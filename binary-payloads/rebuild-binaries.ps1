$ErrorActionPreference = "Stop"

$payloadDir = $PSScriptRoot
$repoRoot = Split-Path -Parent $payloadDir
$manifest = Get-Content -Raw (Join-Path $payloadDir "manifest.json") | ConvertFrom-Json
$outputDir = Join-Path $repoRoot "examples\jordan-argentina"

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

foreach ($file in $manifest.files) {
    $partPattern = "$($file.name).b64.part*"
    $parts = @(Get-ChildItem -LiteralPath $payloadDir -Filter $partPattern | Sort-Object Name)

    if ($parts.Count -ne [int]$file.parts) {
        throw "Expected $($file.parts) parts for $($file.name), found $($parts.Count)."
    }

    $base64 = ($parts | ForEach-Object { [IO.File]::ReadAllText($_.FullName) }) -join ""
    $bytes = [Convert]::FromBase64String($base64)
    $outputPath = Join-Path $outputDir $file.name
    [IO.File]::WriteAllBytes($outputPath, $bytes)

    $actualSize = (Get-Item -LiteralPath $outputPath).Length
    $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $outputPath).Hash.ToLowerInvariant()

    if ($actualSize -ne [int64]$file.bytes -or $actualHash -ne $file.sha256) {
        throw "Verification failed for $($file.name)."
    }

    Write-Host "Verified $($file.name) ($actualSize bytes)"
}
