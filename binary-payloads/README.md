# Binary Deck Payloads

GitHub stores the two generated deck binaries in Base64 parts in this folder. Rebuild both files from the repository root with:

```powershell
powershell -ExecutionPolicy Bypass -File .\binary-payloads\rebuild-binaries.ps1
```

The script writes these files to `examples/jordan-argentina/`:

- `jordan-argentina-3slides.pptx`
- `jordan-argentina-3slides.slides.zip`

Each result is checked against the byte size and SHA-256 hash in `manifest.json`. The script stops if a part is missing or a checksum does not match.
