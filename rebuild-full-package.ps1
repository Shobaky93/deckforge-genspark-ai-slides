$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "source-payloads\rebuild-app-js.ps1")
& (Join-Path $PSScriptRoot "source-payloads\rebuild-deck-json.ps1")
& (Join-Path $PSScriptRoot "binary-payloads\rebuild-binaries.ps1")

Write-Host "DeckForge full package reconstructed and verified."
