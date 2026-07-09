# DeckForge AI Slides

DeckForge is a local prototype for generating professional presentation decks with strong Arabic RTL support. It was built after analyzing multiple Genspark-style deck examples and focuses on elegant slide composition, editable HTML slide projects, and PowerPoint export.

## What Is Included

- `deckforge/` - the local web app and export engine.
- `examples/jordan-argentina/` - a 3-slide Arabic RTL match recap deck for Jordan vs Argentina.
- `scripts/create_jordan_argentina_deck.py` - the generator used to create the example deck.
- `tests/` - focused validation scripts used while developing Arabic export, reference analysis, and image-preserving imports.

## Arabic RTL Focus

The prototype supports:

- Arabic right-to-left slide HTML with `dir="rtl"`.
- Arabic text export into PPTX with RTL paragraph flags.
- Arabic language tags in generated PowerPoint text runs.
- Arabic-first typography and alignment rules.
- Editable project ZIP exports for reopening generated decks later.

## Example Deck

The included example is:

- `examples/jordan-argentina/jordan-argentina-3slides.pptx`
- `examples/jordan-argentina/jordan-argentina-3slides.slides.zip`
- `examples/jordan-argentina/jordan-argentina-3slides.deck.json`
- `examples/jordan-argentina/jordan-argentina-3slides.validation.json`

The validation report confirms:

- 3 slides
- embedded visual backgrounds
- RTL PowerPoint paragraph metadata
- Arabic language tags
- RTL editable HTML slides

## Run Locally

From the repository root:

```powershell
python deckforge/app.py
```

Then open:

```text
http://127.0.0.1:8800
```

## Generate The Example Deck

```powershell
python scripts/create_jordan_argentina_deck.py
```

The script writes the generated PPTX, editable slide bundle, JSON deck model, and validation report to the local `outputs/` folder.

## Status

Prototype stage. The current focus is matching or exceeding the quality of premium AI-generated slide decks while making Arabic/RTL output feel native, aligned, and production-ready.
