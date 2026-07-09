(async function loadDeckForgeSource() {
  const files = [
    "../source-payloads/app.js.part01.txt",
    "../source-payloads/app.js.part02.txt",
    "../source-payloads/app.js.part03.txt"
  ];

  const sourceParts = await Promise.all(files.map(async (file) => {
    const response = await fetch(file);
    if (!response.ok) throw new Error(`Could not load ${file}: ${response.status}`);
    return response.text();
  }));

  const source = `${sourceParts.join("")}\n//# sourceURL=deckforge-app.bundle.js`;
  new Function(source)();
})().catch((error) => {
  console.error("DeckForge failed to load", error);
  document.body.dataset.deckforgeLoadError = "true";
});
