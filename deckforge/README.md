# DeckForge

DeckForge is a self-contained prototype of a Genspark-style AI slide platform.

It uses the same core idea observed in Genspark:

- A deck is a small project folder.
- `manifest.json` stores metadata, canvas size, and slide order.
- Each slide is generated as standalone HTML.
- The same object model exports to a real `.pptx`.

Run it:

```powershell
python app.py 8765
```

Then open:

```text
http://127.0.0.1:8765
```

Current capabilities:

- Prompt-to-deck generation
- Outline-first generation for reviewing slide structure before building the full deck
- Brand Brief controls for brand, audience, goal, tone, and accent color
- Arabic Luxe RTL and Arabic Investor Dark style systems inspired by the supplied professional decks: Tajawal/Cairo/Amiri Arabic typography, navy or obsidian/gold editorial chrome, large whitespace, section kickers, page indicators, stat cards, process cards, team/funding slides, split closing slides, and Arabic-first PPTX export
- Arabic Cinematic Story style inspired by the supplied Facebook success-story deck: full-bleed dark image rhythm, Amiri Arabic titles, Tajawal body copy, Playfair/Cormorant editorial English labels, gold chapter rails, timelines, hero metrics, acquisition cards, culture values, and quote-led closing slides
- Arabic Corporate Story references inspired by the supplied OpenSooq deck: white corporate canvas, red brand signal, deep teal structure, gold KPI accents, Amiri hero numbers, disciplined dividers, country/market pills, and dense Arabic business storytelling
- Arabic Academic Editorial references inspired by the supplied Qatar e-commerce deck: Qatar maroon/gold palette, real hero photography, academic section rhythm, dense KPI cards, infrastructure/import-process slides, and precise RTL Arabic business/academic copy
- Arabic premium benchmark audit in Review/QA that scores RTL direction, Arabic font usage, Arabic-first copy, editorial chrome, title hierarchy, palette match, and composed card density
- Arabic text QA gate that flags encoding corruption, missing RTL/right alignment, and non-Arabic fonts before export
- Evidence Brief parsing for metrics, labels, and sources
- Source Brief parsing for pasted notes, links, provenance records, and metric claims
- Document intake for uploaded or pasted text, markdown, CSV, JSON, and HTML notes
- Documents tab with extracted source records and document-backed evidence claims
- Reference Deck analyzer for PPTX, zipped slide projects, and HTML decks
- Reference tab with imported deck fingerprint, palette, typography, slide outline, layout recipe hints, synthesized theme tokens, reusable prompt, and text signals
- Reference visual recipe extraction for Genspark-style HTML/PPTX decks, including RTL ratio, font families, object density, card rhythm, dark panels, accent lines, editorial chrome, and large-title hierarchy
- Open Editable import for Genspark-style HTML, ZIP, and `.slides` decks that reconstructs native editable DeckForge text and shape objects from the uploaded slide HTML
- Real image preservation for imported HTML decks: referenced ZIP images become editable image objects, render in the editor/project HTML, and export as real PPTX media parts
- Use Style action that turns an analyzed reference deck into the active generation theme and reusable template source
- Use Outline action that turns an analyzed reference deck into an editable slide-by-slide outline while preserving inferred layout recipes and slide roles
- Built-in sample reference style for testing the reference-to-theme workflow without uploading a file
- Evidence-driven chart builder that turns supplied metrics into editable slide visuals
- Charts tab with generated chart specs, bars, labels, and source provenance
- References tab with numbered citations, excerpts, links, and mapped evidence claims
- Deck DNA tab with palette, typography, layout rhythm, style tokens, reusable generation prompt, and creative-director recommendations
- Briefing tab with executive summary, key messages, evidence cues, objections, and per-slide talk track
- Fact Check tab that verifies evidence claims against slide text and supplied source links
- Review tab with story, design, evidence, delivery, and export readiness scoring
- Polish Deck action for pre-export QA fixes and presenter-note strengthening
- Slide variants for trying alternate copy, hierarchy, or evidence emphasis before applying
- Outline tab for editing titles, briefs, speaker notes, and slide order before generation
- Storyboard tab for editing slide titles, speaker notes, and deck order without regenerating
- Object tab for clicking slide objects and manually editing text, geometry, colors, font size, alignment, duplication, deletion, and new text/shape objects
- Template library for saving and applying reusable brand/theme kits across decks
- Professional slide templates
- RTL/Arabic-aware layouts
- Arabic prompt archetype detection for investor, sales, and training decks
- Deck planning metadata with per-slide briefs, speaker notes, roles, and QA focus
- Agent tab with strategy cards and a Genspark-style build transcript
- Prompt keyword extraction, audience inference, and narrative strategy
- Archetype detection for investor pitch decks
- Pitch-specific sections: problem, solution, market, product, business model, traction, GTM, financials, and ask
- Sales proposal playbook with client context, buyer pain, solution, proof, scope, commercial case, and next steps
- Training deck playbook with outcomes, learner context, concepts, practice, assessment, and rollout sections
- Per-slide preview, code, files, and QA tabs
- Full-deck presentation viewer with slide navigation and speaker notes
- Local save points for snapshot, restore, delete, and prompt/settings recovery
- Local edit instructions for the selected slide
- Rendered QA checks for text overflow, edge safety, hierarchy, and contrast
- Automated QA repair
- PPTX export
- PDF export
- `.slides` project ZIP export
- Embedded DeckForge manifest inside exported PPTX for future round-tripping
- Native PPTX notes slide parts generated from speaker notes
- Strategy, agent log, plan, and QA metadata in exported manifests
- Brand and theme metadata preserved in PPTX and `.slides` project exports
- Template metadata preserved in PPTX and `.slides` project exports, including `template.json`
- Evidence metadata preserved in PPTX and `.slides` project exports, including `evidence.json`
- Source metadata preserved in PPTX and `.slides` project exports, including `sources.json` and `source-map.json`
- Document metadata preserved in PPTX and `.slides` project exports, including `documents.json`
- Reference analysis metadata preserved in PPTX and `.slides` project exports, including `reference-analysis.json`
- Chart metadata preserved in PPTX and `.slides` project exports, including `charts.json`
- Reference metadata preserved in PPTX and `.slides` project exports, including `references.json`
- Deck DNA metadata preserved in PPTX and `.slides` project exports, including `deck-dna.json`
- Briefing metadata preserved in PPTX and `.slides` project exports, including `briefing.json`
- Fact-check metadata preserved in PPTX and `.slides` project exports, including `fact-check.json`
- Review metadata preserved in PPTX and `.slides` project exports, including `review.json`
- Variant metadata preserved in PPTX and `.slides` project exports, including `variants.json`
- Outline metadata preserved in PPTX and `.slides` project exports, including `outline.json`
- Storyboard metadata preserved in PPTX and `.slides` project exports, including `storyboard.json`
