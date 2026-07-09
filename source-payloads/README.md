# Complete JavaScript Source

The original `deckforge/app.js` source and the complete Jordan-Argentina deck model are preserved in ordered text parts because GitHub's web editor limits very large files. The public `deckforge/app.js` loader fetches and runs the JavaScript parts automatically when the app starts.

To recreate the original single source file, run from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\source-payloads\rebuild-app-js.ps1
```

The reconstructed file is validated against the character count and SHA-256 hash in `manifest.json`.

Rebuild the complete deck JSON with:

```powershell
powershell -ExecutionPolicy Bypass -File .\source-payloads\rebuild-deck-json.ps1
```

Its character count and SHA-256 hash are recorded in `deck-json-manifest.json`.
