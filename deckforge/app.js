const W = 1920;
const H = 1080;

const themes = {
  executive: {
    name: "Executive Navy",
    bg: "#0b1e3f",
    paper: "#f7f3ea",
    ink: "#0f172a",
    muted: "#667085",
    accent: "#9a6a16",
    accent2: "#0f766e",
    white: "#ffffff",
    danger: "#b42318"
  },
  editorial: {
    name: "Editorial White",
    bg: "#ffffff",
    paper: "#f6f7fb",
    ink: "#1d2939",
    muted: "#667085",
    accent: "#9f1d35",
    accent2: "#2e90fa",
    white: "#ffffff",
    danger: "#b42318"
  },
  venture: {
    name: "Venture Dark",
    bg: "#111827",
    paper: "#edf7f3",
    ink: "#07111f",
    muted: "#475467",
    accent: "#0f766e",
    accent2: "#b45309",
    white: "#ffffff",
    danger: "#f97066"
  },
  arabicLuxe: {
    name: "Arabic Luxe RTL",
    bg: "#0A2540",
    paper: "#FFFFFF",
    ink: "#0A2540",
    muted: "#475569",
    accent: "#C9A961",
    accent2: "#143A6B",
    white: "#FFFFFF",
    danger: "#b42318",
    rtlPremium: true,
    fontArabic: "Tajawal",
    fontLatin: "Playfair Display"
  },
  arabicInvestor: {
    name: "Arabic Investor Dark",
    bg: "#0A0A0F",
    paper: "#0A0A0F",
    ink: "#F5F1E8",
    muted: "#A8A29A",
    accent: "#D4A574",
    accent2: "#E8C89A",
    white: "#F5F1E8",
    danger: "#f97066",
    rtlPremium: true,
    investorDark: true,
    fontArabic: "Cairo",
    fontBody: "Tajawal",
    fontLatin: "Amiri"
  },
  arabicCinematic: {
    name: "Arabic Cinematic Story",
    bg: "#0A0A0A",
    paper: "#0A0A0A",
    ink: "#F5F1E8",
    muted: "#8A8578",
    accent: "#C9A961",
    accent2: "#E8C878",
    white: "#F5F1E8",
    danger: "#f97066",
    rtlPremium: true,
    cinematicStory: true,
    fontArabic: "Amiri",
    fontBody: "Tajawal",
    fontLatin: "Playfair Display",
    fontScript: "Cormorant Garamond"
  }
};

const layouts = [
  "cover",
  "agenda",
  "why",
  "benefits",
  "metrics",
  "pillars",
  "roadmap",
  "habits",
  "mistakes",
  "closing",
  "case",
  "operating-model",
  "investment",
  "appendix"
];

const investorLayouts = [
  "cover",
  "problem",
  "solution",
  "market",
  "product",
  "business-model",
  "traction",
  "gtm",
  "financials",
  "ask"
];

const arabicInvestorLayouts = [
  "cover",
  "vision",
  "problem",
  "solution",
  "how-it-works",
  "traction",
  "market",
  "team",
  "funding",
  "closing"
];

const arabicCinematicLayouts = [
  "cover",
  "origin",
  "timeline",
  "scale",
  "financial-power",
  "acquisitions",
  "transformation",
  "culture",
  "lessons",
  "closing"
];

const salesLayouts = [
  "cover",
  "client-context",
  "buyer-pain",
  "proposed-solution",
  "differentiators",
  "proof",
  "scope",
  "implementation",
  "commercial-case",
  "next-steps"
];

const trainingLayouts = [
  "cover",
  "learning-outcomes",
  "learner-context",
  "core-concepts",
  "practice-loop",
  "example-walkthrough",
  "checklist",
  "assessment",
  "rollout-plan",
  "closing"
];

let deck = null;
let selected = 0;
let selectedObject = null;
let presenterIndex = 0;
let activeTab = "preview";
let outlineDraft = [];
let outlineApprovedAt = "";
let referenceAnalysis = null;

const SAVEPOINT_KEY = "deckforge.savePoints.v1";
const TEMPLATE_KEY = "deckforge.templates.v1";

const $ = (id) => document.getElementById(id);

function hasArabic(text) {
  return /[\u0600-\u06ff]/.test(text);
}

function cloneDeck(value) {
  return JSON.parse(JSON.stringify(value));
}

function readWorkspaceSettings() {
  return {
    prompt: $("prompt")?.value || "",
    slideCount: $("slideCount")?.value || String(deck?.slides?.length || 10),
    language: $("language")?.value || "auto",
    theme: $("theme")?.value || "executive",
    density: $("density")?.value || "balanced",
    brandName: $("brandName")?.value || "",
    audience: $("audienceInput")?.value || "",
    deckGoal: $("deckGoal")?.value || "Executive decision",
    tone: $("tone")?.value || "Board-ready",
    brandAccent: $("brandAccent")?.value || "#9a6a16",
    templateId: $("templateSelect")?.value || "",
    evidenceInput: $("evidenceInput")?.value || "",
    sourceInput: $("sourceInput")?.value || "",
    documentInput: $("documentInput")?.value || "",
    referenceAnalysis: referenceAnalysis ? cloneDeck(referenceAnalysis) : null
  };
}

function applyWorkspaceSettings(settings = {}) {
  if (settings.prompt !== undefined) $("prompt").value = settings.prompt;
  if (settings.slideCount !== undefined) $("slideCount").value = settings.slideCount;
  if (settings.language !== undefined) $("language").value = settings.language;
  if (settings.theme !== undefined) $("theme").value = settings.theme;
  if (settings.density !== undefined) $("density").value = settings.density;
  if (settings.brandName !== undefined) $("brandName").value = settings.brandName;
  if (settings.audience !== undefined) $("audienceInput").value = settings.audience;
  if (settings.deckGoal !== undefined) $("deckGoal").value = settings.deckGoal;
  if (settings.tone !== undefined) $("tone").value = settings.tone;
  if (settings.brandAccent !== undefined) $("brandAccent").value = settings.brandAccent;
  if (settings.templateId !== undefined && $("templateSelect")) $("templateSelect").value = settings.templateId;
  if (settings.evidenceInput !== undefined) $("evidenceInput").value = settings.evidenceInput;
  if (settings.sourceInput !== undefined) $("sourceInput").value = settings.sourceInput;
  if (settings.documentInput !== undefined && $("documentInput")) $("documentInput").value = settings.documentInput;
  if (settings.referenceAnalysis !== undefined) referenceAnalysis = settings.referenceAnalysis ? cloneDeck(settings.referenceAnalysis) : null;
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
    reader.readAsText(file);
  });
}

async function importDocumentFiles(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const blocks = [];
  for (const file of files.slice(0, 8)) {
    const textValue = await readTextFile(file);
    const trimmed = textValue.replace(/\u0000/g, " ").trim();
    if (!trimmed) continue;
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    blocks.push(`--- Document: ${file.name} (${sizeKb} KB) ---\n${trimmed.slice(0, 12000)}`);
  }
  const input = $("documentInput");
  const existing = input.value.trim();
  input.value = [existing, blocks.join("\n\n")].filter(Boolean).join("\n\n");
  event.target.value = "";
}

function clearDocumentBrief() {
  if ($("documentInput")) $("documentInput").value = "";
  if ($("documentFiles")) $("documentFiles").value = "";
}

function setReferenceStatus(message, tone = "") {
  const status = $("referenceDeckStatus");
  if (!status) return;
  status.textContent = message || "";
  status.dataset.tone = tone;
}

async function analyzeReferenceDeck() {
  const input = $("referenceDeckFile");
  const file = input?.files?.[0];
  if (!file) {
    setReferenceStatus("Choose a PPTX, ZIP, or HTML deck first.", "warning");
    return;
  }
  setReferenceStatus("Analyzing reference deck...", "working");
  const payload = new FormData();
  payload.append("file", file);
  try {
    const response = await fetch("/api/analyze/reference", { method: "POST", body: payload });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || "Reference analysis failed.");
    }
    referenceAnalysis = await response.json();
    if (deck) {
      deck.referenceAnalysis = cloneDeck(referenceAnalysis);
      deck.metadata.referenceDeck = referenceAnalysis.fileName || "";
      deck.metadata.referenceFingerprint = referenceAnalysis.fingerprint || "";
    }
    activeTab = "reference";
    setReferenceStatus(referenceAnalysis.fingerprint || "Reference deck analyzed.", "ready");
    render();
  } catch (error) {
    setReferenceStatus(error.message || "Reference analysis failed.", "error");
  }
}

async function importReferenceDeck() {
  const input = $("referenceDeckFile");
  const file = input?.files?.[0];
  if (!file) {
    setReferenceStatus("Choose an HTML, ZIP, or .slides deck first.", "warning");
    return;
  }
  setReferenceStatus("Opening editable deck...", "working");
  const payload = new FormData();
  payload.append("file", file);
  try {
    const response = await fetch("/api/import/deck", { method: "POST", body: payload });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || "Editable import failed.");
    }
    const result = await response.json();
    if (!result.deck?.slides?.length) throw new Error("No editable slides were returned.");
    deck = result.deck;
    referenceAnalysis = result.referenceAnalysis || deck.referenceAnalysis || null;
    deck.referenceAnalysis = referenceAnalysis ? cloneDeck(referenceAnalysis) : deck.referenceAnalysis;
    deck.metadata = deck.metadata || {};
    deck.metadata.referenceDeck = referenceAnalysis?.fileName || deck.metadata.referenceDeck || file.name;
    deck.metadata.referenceFingerprint = referenceAnalysis?.fingerprint || deck.metadata.referenceFingerprint || "";
    deck.metadata.slug = deck.metadata.slug || slugify(deck.metadata.title || file.name);
    deck.deckDNA = buildDeckDNA(deck);
    deck.metadata.styleFingerprint = deck.deckDNA?.fingerprint || deck.metadata.styleFingerprint || "";
    deck.briefing = buildBriefing(deck);
    window.DeckForgeDeck = deck;
    outlineDraft = cloneDeck(deck.outline || []);
    selected = 0;
    selectedObject = null;
    syncStoryboardState();
    repairDeckQA(2);
    updateFactCheck();
    updateReview();
    refreshSavePointSelect();
    activeTab = "preview";
    setReferenceStatus(`Opened ${deck.slides.length} editable slide${deck.slides.length === 1 ? "" : "s"} from ${file.name}.`, "ready");
    render();
  } catch (error) {
    setReferenceStatus(error.message || "Editable import failed.", "error");
  }
}

function applyReferenceStyle() {
  if (!referenceAnalysis) {
    setReferenceStatus("Analyze a reference deck first.", "warning");
    return;
  }
  const base = deck?.theme || themes[$("theme")?.value] || themes.executive;
  const referenceTheme = synthesizeReferenceTheme(base, referenceAnalysis);
  if ($("brandAccent")) $("brandAccent").value = normalizeHex(referenceTheme.accent, $("brandAccent").value || "#9a6a16");
  if (referenceAnalysis.density && $("density")) $("density").value = referenceAnalysis.density;
  if ($("templateName") && !$("templateName").value.trim()) {
    $("templateName").value = `${referenceAnalysis.fileName || "Reference"} Style`;
  }
  if (deck) {
    deck.referenceAnalysis = cloneDeck(referenceAnalysis);
    deck.metadata.referenceDeck = referenceAnalysis.fileName || "";
    deck.metadata.referenceFingerprint = referenceAnalysis.fingerprint || "";
    deck.metadata.referenceThemeName = referenceTheme.name;
    applyThemeToDeck(
      applyBrandToTheme(referenceTheme, deck.brand || {}),
      "Apply reference style",
      `Synthesized and applied theme from ${referenceAnalysis.fileName || "reference deck"}.`
    );
  }
  setReferenceStatus("Reference style applied.", "ready");
  activeTab = "reference";
  render();
}

function referenceOutlineItems(analysis = referenceAnalysis) {
  const rawItems = Array.isArray(analysis?.slideOutline) ? analysis.slideOutline : [];
  const desired = Math.max(4, Math.min(14, rawItems.length || Number($("slideCount")?.value) || 10));
  const fallbackLayouts = selectLayouts($("prompt")?.value || "", desired);
  const knownLayouts = new Set([...layouts, ...investorLayouts, ...arabicInvestorLayouts, ...arabicCinematicLayouts, ...salesLayouts, ...trainingLayouts]);
  const items = [];
  for (let index = 0; index < desired; index += 1) {
    const item = rawItems[index] || {};
    const signals = (item.signals || []).map((signal) => String(signal || "").trim()).filter(Boolean).slice(0, 4);
    const title = String(item.title || `Reference Slide ${index + 1}`).trim();
    const hintedLayout = String(item.suggestedLayout || "").trim();
    const layout = knownLayouts.has(hintedLayout) ? hintedLayout : (fallbackLayouts[index] || layouts[Math.min(index, layouts.length - 1)] || "agenda");
    const brief = signals.length
      ? signals.join(" / ")
      : `Adapt the reference slide's role and pacing for ${title}.`;
    items.push({
      slide: index + 1,
      layout,
      role: item.visualRole || roleForLayout(layout),
      title,
      brief,
      speakerNotes: `Use the reference structure as inspiration for slide ${index + 1}. ${signals.length ? `Reference cues: ${signals.join("; ")}.` : "Keep the message concise and presentation-ready."}`,
      qaFocus: "Reference alignment, hierarchy, overflow, contrast, and clean export"
    });
  }
  return normalizeOutlineItems(items, [], fallbackLayouts);
}

function useReferenceOutline() {
  const analysis = deck?.referenceAnalysis || referenceAnalysis;
  if (!analysis) {
    setReferenceStatus("Analyze a reference deck first.", "warning");
    return;
  }
  const items = referenceOutlineItems(analysis);
  if (!items.length) {
    setReferenceStatus("No reusable outline cues were found in this reference deck.", "warning");
    return;
  }
  outlineDraft = items;
  outlineApprovedAt = "";
  if ($("slideCount")) $("slideCount").value = String(items.length);
  if (deck) {
    deck.referenceAnalysis = cloneDeck(analysis);
    deck.outline = cloneDeck(items);
    deck.metadata.referenceDeck = analysis.fileName || "";
    deck.metadata.referenceFingerprint = analysis.fingerprint || "";
    deck.metadata.referenceOutlineCount = items.length;
    deck.metadata.outlineStatus = "reference-drafted";
  }
  setReferenceStatus(`${items.length}-slide reference outline ready.`, "ready");
  activeTab = "outline";
  render();
}

function loadSampleReferenceStyle() {
  referenceAnalysis = {
    fileName: "sample-reference-deck.pptx",
    kind: "PPTX",
    slideCount: 10,
    fingerprint: "PPTX / 10 slides / visual / 5 colors / 3 media",
    summary: "Sample reference deck using crisp white paper, dark executive ink, blue accent cues, and low-copy visual pacing.",
    suggestedAccent: "#2e90fa",
    density: "visual",
    palette: [
      { color: "#101828", role: "ink", count: 64 },
      { color: "#ffffff", role: "paper", count: 58 },
      { color: "#2e90fa", role: "accent candidate", count: 32 },
      { color: "#12b76a", role: "accent candidate", count: 16 },
      { color: "#667085", role: "neutral", count: 22 }
    ],
    typography: { textRunCount: 76, titleSize: 60, bodySize: 24, sizeRange: "14-60px" },
    structure: { slideFiles: 10, notesFiles: 10, mediaFiles: 3, xmlFiles: 42, embeddedDeckForgeManifest: false },
    assets: { mediaCount: 3 },
    visualRecipe: {
      available: true,
      benchmark: "Professional",
      density: "structured",
      avgObjectsPerSlide: 12.4,
      avgCardsPerSlide: 1.8,
      rtlSlideRatio: 0,
      chromeSlideRatio: 0.8,
      maxTitleSize: 60,
      topFonts: [{ font: "Aptos", count: 10 }],
      tags: ["editorial-chrome", "card-grid", "large-title", "accent-lines"],
      summary: "Professional reference with structured visual density, 12.4 objects/slide, card-grid rhythm, and editorial chrome coverage.",
      recommendations: [
        "Reuse page numbers, section labels, and footer/header chrome.",
        "Use repeated cards or stat blocks rather than plain bullet lists.",
        "Use thin accent rules as navigation and hierarchy cues."
      ]
    },
    visualRecipeCount: 10,
    slideOutline: [
      { slide: 1, title: "Executive Summary", suggestedLayout: "cover", visualRole: "opening", signals: ["Frame the decision", "Name the business pressure"] },
      { slide: 2, title: "Market Signal", suggestedLayout: "market", visualRole: "body", signals: ["Show why now", "Quantify urgency"] },
      { slide: 3, title: "Buyer Pain", suggestedLayout: "problem", visualRole: "body", signals: ["Clarify friction", "Expose workflow cost"] },
      { slide: 4, title: "Proposed System", suggestedLayout: "solution", visualRole: "body", signals: ["Introduce the solution", "Show operating logic"] },
      { slide: 5, title: "Product Experience", suggestedLayout: "product", visualRole: "body", signals: ["Show the interface concept", "Highlight automation"] },
      { slide: 6, title: "Proof Points", suggestedLayout: "proof", visualRole: "body", signals: ["Use metrics", "Cite evidence"] },
      { slide: 7, title: "Rollout Plan", suggestedLayout: "roadmap", visualRole: "body", signals: ["Phase implementation", "Assign owners"] },
      { slide: 8, title: "Commercial Case", suggestedLayout: "commercial-case", visualRole: "body", signals: ["Connect ROI", "Explain investment logic"] },
      { slide: 9, title: "Risk Controls", suggestedLayout: "differentiators", visualRole: "body", signals: ["Address objections", "Show governance"] },
      { slide: 10, title: "Next Decision", suggestedLayout: "next-steps", visualRole: "close", signals: ["Clarify ask", "Close with commitment"] }
    ],
    textSamples: ["Executive summary", "Market signal", "Operating model", "Proof points", "Next decision"],
    reusablePrompt: "Create a concise executive deck with bright paper, dark ink, blue accent blocks, visual density, large titles around 60px, and a clear context -> proof -> plan -> decision storyline.",
    takeaways: [
      "Detected a visual presentation rhythm with strong title hierarchy and sparse body text.",
      "Use blue as the primary action/accent color and keep white as the dominant slide surface.",
      "Reserve media or chart space on proof and roadmap slides."
    ]
  };
  if (deck) {
    deck.referenceAnalysis = cloneDeck(referenceAnalysis);
    deck.metadata.referenceDeck = referenceAnalysis.fileName;
    deck.metadata.referenceFingerprint = referenceAnalysis.fingerprint;
  }
  setReferenceStatus(referenceAnalysis.fingerprint, "ready");
  activeTab = "reference";
  render();
}

function loadTemplates() {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATE_KEY) || "[]");
  } catch {
    return [];
  }
}

function storeTemplates(items) {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(items.slice(0, 30)));
}

function selectedTemplate() {
  const id = $("templateSelect")?.value || "";
  return loadTemplates().find((item) => item.id === id) || null;
}

function templateLabel(template) {
  const brand = template.brand?.name || "Unbranded";
  return `${template.name} - ${brand}`;
}

function refreshTemplateSelect() {
  const select = $("templateSelect");
  if (!select) return;
  const value = select.value;
  const templates = loadTemplates();
  select.innerHTML = templates.length
    ? `<option value="">No template</option>${templates.map((template) => `<option value="${template.id}">${escapeHtml(templateLabel(template))}</option>`).join("")}`
    : '<option value="">No templates</option>';
  if (templates.some((template) => template.id === value)) select.value = value;
  renderTemplates();
}

function makeTemplateFromCurrent() {
  const prompt = $("prompt")?.value || "";
  const brand = readBrandBrief(prompt);
  const themeKey = $("theme")?.value || "executive";
  const baseTheme = deck?.theme || applyBrandToTheme(themes[themeKey] || themes.executive, brand);
  const name = $("templateName")?.value.trim()
    || deck?.metadata?.templateName
    || brand.name
    || deck?.metadata?.title
    || baseTheme.name
    || "DeckForge Template";
  return {
    id: `tpl-${Date.now()}`,
    name,
    savedAt: new Date().toISOString(),
    themeKey,
    density: $("density")?.value || "balanced",
    language: $("language")?.value || "auto",
    theme: cloneDeck(baseTheme),
    brand: cloneDeck(brand),
    referenceAnalysis: deck?.referenceAnalysis ? cloneDeck(deck.referenceAnalysis) : (referenceAnalysis ? cloneDeck(referenceAnalysis) : null),
    deckDNA: deck ? cloneDeck(deck.deckDNA || buildDeckDNA(deck)) : null,
    layoutSignature: deck?.slides?.map((slide) => slide.layout) || [],
    slideCount: deck?.slides?.length || Number($("slideCount")?.value) || 10
  };
}

function saveTemplate() {
  const template = makeTemplateFromCurrent();
  const templates = loadTemplates().filter((item) => item.name.toLowerCase() !== template.name.toLowerCase());
  templates.unshift(template);
  storeTemplates(templates);
  refreshTemplateSelect();
  $("templateSelect").value = template.id;
  $("templateName").value = template.name;
  renderTemplates();
}

function applyTemplateSettings(template) {
  if (!template) return;
  applyWorkspaceSettings({
    theme: template.themeKey || "executive",
    density: template.density || "balanced",
    language: template.language || "auto",
    brandName: template.brand?.name || "",
    audience: template.brand?.audience || "",
    deckGoal: template.brand?.objective || "Executive decision",
    tone: template.brand?.tone || "Board-ready",
    brandAccent: template.brand?.accent || "#9a6a16"
  });
  $("templateName").value = template.name || "";
}

function sameColor(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function mappedTemplateColor(color, previousTheme, nextTheme) {
  if (!color || !previousTheme || !nextTheme) return color;
  const pairs = ["bg", "paper", "ink", "muted", "accent", "accent2", "white", "danger"];
  const key = pairs.find((item) => sameColor(color, previousTheme[item]));
  return key ? nextTheme[key] : color;
}

function recolorDeckToTheme(previousTheme, nextTheme) {
  if (!deck) return;
  deck.slides.forEach((slide) => {
    slide.elements.forEach((element) => {
      element.fill = mappedTemplateColor(element.fill, previousTheme, nextTheme);
      element.stroke = mappedTemplateColor(element.stroke, previousTheme, nextTheme);
    });
  });
}

function applyThemeToDeck(nextTheme, title, detail) {
  if (!deck || !nextTheme) return;
  const previousTheme = cloneDeck(deck.theme || themes.executive);
  deck.theme = cloneDeck(nextTheme);
  recolorDeckToTheme(previousTheme, deck.theme);
  deck.deckDNA = buildDeckDNA(deck);
  deck.metadata.styleFingerprint = deck.deckDNA?.fingerprint || "";
  deck.agentLog = [
    ...(deck.agentLog || []),
    {
      index: (deck.agentLog || []).length + 1,
      title,
      detail
    }
  ];
  repairDeckQA(2);
  updateReview();
}

function applyTemplateToDeck(template) {
  if (!deck || !template) return;
  const previousTheme = cloneDeck(deck.theme || themes.executive);
  const nextTheme = cloneDeck(template.theme || themes[template.themeKey] || themes.executive);
  deck.theme = nextTheme;
  deck.brand = cloneDeck(template.brand || {});
  deck.metadata.templateId = template.id;
  deck.metadata.templateName = template.name;
  deck.metadata.brandName = deck.brand.name || "";
  deck.metadata.audience = deck.brand.audience || deck.metadata.audience;
  deck.metadata.objective = deck.brand.objective || deck.metadata.objective;
  deck.metadata.tone = deck.brand.tone || deck.metadata.tone;
  deck.metadata.templateAppliedAt = new Date().toISOString();
  if (template.referenceAnalysis) deck.referenceAnalysis = cloneDeck(template.referenceAnalysis);
  recolorDeckToTheme(previousTheme, nextTheme);
  deck.deckDNA = buildDeckDNA(deck);
  deck.metadata.styleFingerprint = deck.deckDNA?.fingerprint || "";
  deck.agentLog = [
    ...(deck.agentLog || []),
    {
      index: (deck.agentLog || []).length + 1,
      title: "Apply template",
      detail: `Applied reusable template: ${template.name}.`
    }
  ];
  repairDeckQA(2);
  updateReview();
  render();
}

function applySelectedTemplate() {
  const template = selectedTemplate();
  if (!template) return;
  applyTemplateSettings(template);
  applyTemplateToDeck(template);
  renderTemplates();
}

function deleteSelectedTemplate() {
  const id = $("templateSelect")?.value || "";
  if (!id) return;
  storeTemplates(loadTemplates().filter((template) => template.id !== id));
  $("templateName").value = "";
  refreshTemplateSelect();
}

function loadSavePoints() {
  try {
    return JSON.parse(localStorage.getItem(SAVEPOINT_KEY) || "[]");
  } catch {
    return [];
  }
}

function storeSavePoints(points) {
  localStorage.setItem(SAVEPOINT_KEY, JSON.stringify(points.slice(0, 20)));
}

function refreshSavePointSelect() {
  const select = $("savePointSelect");
  if (!select) return;
  const points = loadSavePoints();
  if (!points.length) {
    select.innerHTML = '<option value="">No save points</option>';
    return;
  }
  select.innerHTML = points.map((point) => {
    const label = `${point.title} - ${new Date(point.savedAt).toLocaleString()}`;
    return `<option value="${point.id}">${escapeHtml(label)}</option>`;
  }).join("");
}

function savePoint() {
  if (!deck) return;
  const points = loadSavePoints();
  const point = {
    id: `sp-${Date.now()}`,
    title: deck.metadata?.title || "Untitled deck",
    savedAt: new Date().toISOString(),
    slideCount: deck.slides?.length || 0,
    workspace: readWorkspaceSettings(),
    deck: cloneDeck(deck)
  };
  points.unshift(point);
  storeSavePoints(points);
  refreshSavePointSelect();
  $("savePointSelect").value = point.id;
}

function restoreSavePoint() {
  const id = $("savePointSelect").value;
  const point = loadSavePoints().find((candidate) => candidate.id === id);
  if (!point) return;
  deck = cloneDeck(point.deck);
  referenceAnalysis = deck.referenceAnalysis ? cloneDeck(deck.referenceAnalysis) : point.workspace?.referenceAnalysis || null;
  applyWorkspaceSettings({
    brandName: "",
    audience: "",
    deckGoal: "Executive decision",
    tone: "Board-ready",
    brandAccent: "#9a6a16",
    evidenceInput: "",
    ...(point.workspace || {
    prompt: deck.metadata?.description || "",
    slideCount: String(point.slideCount || deck.slides?.length || 10)
    })
  });
  selected = 0;
  selectedObject = null;
  activeTab = "preview";
  runQA(false);
  render();
}

function deleteSavePoint() {
  const id = $("savePointSelect").value;
  if (!id) return;
  storeSavePoints(loadSavePoints().filter((point) => point.id !== id));
  refreshSavePointSelect();
}

function slugify(text) {
  return (text || "deckforge")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "deckforge";
}

function titleFromPrompt(prompt, rtl) {
  const clean = prompt.replace(/\s+/g, " ").trim();
  if (!clean) return rtl ? "\u0639\u0631\u0636 \u0627\u062d\u062a\u0631\u0627\u0641\u064a" : "Professional Presentation";
  let candidate = clean
    .replace(/^(create|make|build|generate)\s+(a\s+)?(professional\s+)?(\d+[- ]slide\s+)?(presentation|deck|slides)?\s*/i, "")
    .replace(/^(investor|sales|client|training|executive)?\s*(presentation|deck)\s+(for|about|on)\s+(an?\s+)?/i, "")
    .replace(/^(about|on)\s+/i, "");
  const about = clean.match(/\babout\s+(.+)$/i);
  if (about) candidate = about[1];
  candidate = candidate
    .replace(/\s+(and|with)\s+(practical|actionable|detailed|clear)\b.*$/i, "")
    .replace(/\s+methods?\s+to\b.*$/i, "")
    .replace(/\s+that\b.*$/i, "")
    .replace(/[.؟?]+$/g, "")
    .trim();
  const maxWords = rtl ? 7 : 6;
  const words = candidate.split(" ").filter(Boolean).slice(0, maxWords).join(" ");
  if (!words) return rtl ? "\u0639\u0631\u0636 \u0627\u062d\u062a\u0631\u0627\u0641\u064a" : "Professional Presentation";
  if (rtl) return words;
  return words.replace(/\w\S*/g, (word, offset) => {
    const lower = word.toLowerCase();
    if (["ai", "api", "saas", "roi", "b2b", "b2c", "crm", "kpi", "gtm", "hr", "erp"].includes(lower)) return lower.toUpperCase();
    if (offset > 0 && ["a", "an", "of", "and", "to", "in", "for", "the"].includes(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}

function extractKeywords(prompt) {
  const stop = new Set([
    "create", "make", "build", "generate", "professional", "presentation", "slides", "slide",
    "about", "with", "and", "for", "the", "that", "this", "into", "from", "using", "methods",
    "benefits", "practical", "master", "learn", "learning", "investor", "sales", "client",
    "training", "executive", "deck", "pitch"
  ]);
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stop.has(word))
    .slice(0, 6);
}

function inferAudience(prompt) {
  const p = prompt.toLowerCase();
  if (/investor|funding|pitch|vc|startup/.test(p)) return "investors and decision makers";
  if (/student|school|university|lesson|teacher/.test(p)) return "students and educators";
  if (/sales|client|customer|proposal/.test(p)) return "clients and commercial stakeholders";
  if (/team|employee|training|workshop/.test(p)) return "internal teams";
  return "executive audience";
}

function normalizeHex(value, fallback = "") {
  const hex = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : fallback;
}

function readBrandBrief(prompt) {
  const defaultGoal = "Executive decision";
  const defaultTone = "Board-ready";
  const defaultAccent = "#9a6a16";
  const name = $("brandName")?.value.trim() || "";
  const audienceInput = $("audienceInput")?.value.trim() || "";
  const objective = $("deckGoal")?.value || defaultGoal;
  const tone = $("tone")?.value || defaultTone;
  const accent = normalizeHex($("brandAccent")?.value, defaultAccent);
  const configured = Boolean(
    name ||
    audienceInput ||
    objective !== defaultGoal ||
    tone !== defaultTone ||
    accent.toLowerCase() !== defaultAccent
  );
  return {
    name,
    audience: audienceInput || (configured ? inferAudience(prompt) : ""),
    objective,
    tone,
    accent,
    configured
  };
}

function applyBrandToTheme(baseTheme, brand) {
  const theme = { ...baseTheme };
  const defaultAccent = "#9a6a16";
  const hasCustomAccent = brand.accent && brand.accent.toLowerCase() !== defaultAccent;
  if (brand.configured && hasCustomAccent && contrast(brand.accent, "#ffffff") >= 2.8) {
    theme.accent = brand.accent;
  }
  return theme;
}

function hexRgb(hex) {
  const value = normalizeHex(hex, "#000000").replace("#", "");
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) || 0);
}

function hexLuminance(hex) {
  const [r, g, b] = hexRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function paletteColors(analysis = {}) {
  const imported = analysis.importedDeckDNA?.palette || [];
  const direct = analysis.palette || [];
  return [...direct, ...imported]
    .map((item) => ({
      color: normalizeHex(item.color || item.hex || "", ""),
      role: String(item.role || "").toLowerCase(),
      count: Number(item.count || 0)
    }))
    .filter((item) => item.color)
    .sort((a, b) => b.count - a.count);
}

function pickPaletteColor(items, predicate, fallback = "") {
  return items.find(predicate)?.color || fallback;
}

function synthesizeReferenceTheme(baseTheme, analysis = {}) {
  const source = cloneDeck(baseTheme || themes.executive);
  const tokens = analysis.importedDeckDNA?.styleTokens || {};
  const recipe = analysis.visualRecipe || {};
  const recipeTags = new Set((recipe.tags || []).map((tag) => String(tag || "").toLowerCase()));
  const recipeFontNames = (recipe.topFonts || []).map((item) => item.font).filter(Boolean);
  const colors = paletteColors(analysis);
  const lightColors = colors.filter((item) => hexLuminance(item.color) > 0.72);
  const darkColors = colors.filter((item) => hexLuminance(item.color) < 0.22);
  const midColors = colors.filter((item) => hexLuminance(item.color) >= 0.22 && hexLuminance(item.color) <= 0.72);
  const prefersInvestorDark = recipe.rtlSlideRatio >= 0.5
    && (recipeTags.has("dark-panels") || recipeTags.has("editorial-chrome"))
    && darkColors.length;
  const paper = normalizeHex(tokens.paper, "")
    || pickPaletteColor(colors, (item) => item.role.includes("paper"), "")
    || lightColors[0]?.color
    || source.paper;
  const bg = normalizeHex(tokens.background || tokens.bg, "")
    || pickPaletteColor(colors, (item) => item.role.includes("bg"), "")
    || darkColors[0]?.color
    || source.bg;
  const ink = normalizeHex(tokens.ink, "")
    || pickPaletteColor(colors, (item) => item.role.includes("ink"), "")
    || darkColors.find((item) => contrast(item.color, paper) >= 4.5)?.color
    || source.ink;
  const accent = normalizeHex(analysis.suggestedAccent, "")
    || normalizeHex(tokens.accent, "")
    || pickPaletteColor(colors, (item) => item.role.includes("accent"), "")
    || midColors[0]?.color
    || source.accent;
  const accent2 = normalizeHex(tokens.secondaryAccent || tokens.accent2, "")
    || midColors.find((item) => !sameColor(item.color, accent))?.color
    || colors.find((item) => ![paper, bg, ink, accent].some((color) => sameColor(color, item.color)))?.color
    || source.accent2;
  const muted = normalizeHex(tokens.muted, "")
    || colors.find((item) => item.role.includes("neutral"))?.color
    || midColors.find((item) => contrast(item.color, paper) >= 3)?.color
    || source.muted;
  return {
    ...source,
    name: `Reference ${analysis.kind || "Deck"} Style`,
    bg,
    paper,
    ink,
    muted,
    accent,
    accent2,
    white: source.white || "#ffffff",
    danger: source.danger || "#b42318",
    rtlPremium: recipe.rtlSlideRatio >= 0.5 || source.rtlPremium || false,
    investorDark: prefersInvestorDark || source.investorDark || false,
    fontArabic: recipeFontNames[0] || source.fontArabic || "Tajawal",
    fontBody: recipeFontNames.find((font) => /tajawal/i.test(font)) || source.fontBody || (prefersInvestorDark ? "Tajawal" : ""),
    fontLatin: recipeFontNames.find((font) => /amiri|playfair|aptos/i.test(font)) || source.fontLatin || "Aptos",
    referenceDeck: analysis.fileName || "",
    referenceFingerprint: analysis.fingerprint || "",
    source: "reference-analysis"
  };
}

function parseEvidenceInput(raw) {
  return String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split(/\s*\|\s*|\s+-\s*/).map((part) => part.trim()).filter(Boolean);
      let metric = parts[0] || "";
      let label = parts[1] || "";
      let source = parts.slice(2).join(" - ") || "User brief";
      if (parts.length < 2) {
        const found = line.match(/[\$€£]?\d[\d,.]*(?:\s?(?:%|x|k|m|b|mo|yr|days|sites|\+))?/i);
        metric = found ? found[0].trim() : `Point ${index + 1}`;
        label = found ? line.replace(found[0], "").replace(/^[:\s-]+|[:\s-]+$/g, "") : line;
      }
      return {
        id: `ev-${index + 1}`,
        metric,
        label: label || "Evidence point",
        source,
        raw: line
      };
    })
    .slice(0, 8);
}

function metricMatch(text) {
  return String(text || "").match(/[$]?\d[\d,.]*(?:\s?(?:%|x|k|m|b|mo|yr|days|weeks|hours|hrs|users|customers|sites|\+)(?:\/(?:day|week|month|year|mo|yr))?)?/i);
}

function cleanSourceLabel(value, fallback) {
  const label = String(value || "").replace(/\s+/g, " ").replace(/^[-:|\s]+|[-:|\s]+$/g, "").trim();
  return label ? label.slice(0, 72) : fallback;
}

function sourceHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function parseSourceInput(raw) {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sources = [];
  const evidence = [];
  lines.forEach((line, index) => {
    const url = (line.match(/https?:\/\/[^\s)]+/i) || [""])[0];
    const parts = line.split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean);
    const bracket = line.match(/^\[([^\]]+)\]\s*(.+)$/);
    let label = parts.length > 1 ? parts[0] : "";
    let excerpt = parts.length > 1 ? parts.slice(1).join(" | ") : line;
    if (bracket) {
      label = bracket[1];
      excerpt = bracket[2];
    }
    label = cleanSourceLabel(label || sourceHostname(url), `Source ${index + 1}`);
    excerpt = excerpt.replace(url, "").replace(/\s+/g, " ").trim() || line.replace(url, "").trim();
    const source = {
      id: `src-${index + 1}`,
      label,
      type: url ? "link" : "note",
      url,
      excerpt: excerpt.slice(0, 420),
      claimIds: []
    };
    const sentences = excerpt.split(/(?:\.|;)\s+/).map((item) => item.trim()).filter(Boolean);
    sentences.forEach((sentence, sentenceIndex) => {
      const found = metricMatch(sentence);
      if (!found) return;
      const metric = found[0].trim();
      const labelText = cleanSourceLabel(sentence.replace(found[0], "").replace(/\s*[|]+\s*/g, " "), "Source-backed claim").slice(0, 42);
      const claim = {
        id: `src-ev-${index + 1}-${sentenceIndex + 1}`,
        metric,
        label: labelText,
        source: label,
        sourceId: source.id,
        raw: sentence
      };
      source.claimIds.push(claim.id);
      evidence.push(claim);
    });
    sources.push(source);
  });
  return {
    sources,
    evidence: evidence.slice(0, 8),
    summary: {
      sourceCount: sources.length,
      claimCount: evidence.length,
      linkedSourceCount: sources.filter((source) => source.url).length
    }
  };
}

function parseDocumentBlocks(raw) {
  const lines = String(raw || "").split(/\r?\n/);
  const blocks = [];
  let current = null;
  lines.forEach((line) => {
    const marker = line.match(/^---\s*Document:\s*(.+?)\s*---$/i);
    if (marker) {
      if (current && current.lines.join("\n").trim()) blocks.push(current);
      current = { name: cleanSourceLabel(marker[1], `Document ${blocks.length + 1}`), lines: [] };
      return;
    }
    if (!current) current = { name: "Document brief", lines: [] };
    current.lines.push(line);
  });
  if (current && current.lines.join("\n").trim()) blocks.push(current);
  return blocks.map((block, index) => {
    const textValue = block.lines.join("\n").replace(/\s+\n/g, "\n").trim();
    return {
      id: `doc-${index + 1}`,
      name: cleanSourceLabel(block.name, `Document ${index + 1}`),
      type: "document",
      characterCount: textValue.length,
      wordCount: textValue.split(/\s+/).filter(Boolean).length,
      excerpt: textValue.replace(/\s+/g, " ").slice(0, 700),
      text: textValue
    };
  });
}

function parseDocumentInput(raw) {
  const documents = parseDocumentBlocks(raw).slice(0, 8);
  const sources = [];
  const evidence = [];
  documents.forEach((documentItem, index) => {
    const source = {
      id: documentItem.id,
      label: documentItem.name,
      type: "document",
      url: "",
      excerpt: documentItem.excerpt,
      claimIds: []
    };
    const sentences = documentItem.text
      .split(/(?:[.;]|\n)+\s*/)
      .map((item) => item.trim())
      .filter((item) => item.length > 8);
    sentences.forEach((sentence, sentenceIndex) => {
      if (source.claimIds.length >= 4 || evidence.length >= 12) return;
      const found = metricMatch(sentence);
      if (!found) return;
      const metric = found[0].trim();
      const labelText = cleanSourceLabel(sentence.replace(found[0], "").replace(/\s*[|,]+\s*/g, " "), "Document-backed claim").slice(0, 48);
      const claim = {
        id: `doc-ev-${index + 1}-${sentenceIndex + 1}`,
        metric,
        label: labelText,
        source: documentItem.name,
        sourceId: source.id,
        raw: sentence
      };
      source.claimIds.push(claim.id);
      evidence.push(claim);
    });
    sources.push(source);
  });
  return {
    documents: documents.map(({ text, ...item }) => item),
    sources,
    evidence,
    summary: {
      documentCount: documents.length,
      claimCount: evidence.length,
      wordCount: documents.reduce((sum, item) => sum + item.wordCount, 0)
    }
  };
}

function buildSourceMap(sources, evidence) {
  const sourceEvidence = new Map((evidence || [])
    .filter((item) => item.sourceId)
    .map((item) => [item.id, item]));
  return {
    sourceCount: sources.length,
    sourceClaimCount: sourceEvidence.size,
    linkedSourceCount: sources.filter((source) => source.url).length,
    coverage: sources.map((source) => ({
      id: source.id,
      label: source.label,
      type: source.type,
      url: source.url,
      evidenceIds: source.claimIds.filter((id) => sourceEvidence.has(id))
    }))
  };
}

function buildReferences(sources, documents, evidence) {
  const documentById = new Map((documents || []).map((item) => [item.id, item]));
  const references = (sources || []).map((source) => {
    const documentItem = documentById.get(source.id);
    return {
      id: `ref-${source.id}`,
      sourceId: source.id,
      label: source.label,
      type: source.type,
      url: source.url || "",
      excerpt: source.excerpt || documentItem?.excerpt || "",
      wordCount: documentItem?.wordCount || 0,
      evidenceIds: [],
      claimCount: 0
    };
  });
  const bySourceId = new Map(references.map((item) => [item.sourceId, item]));
  (evidence || []).forEach((item, index) => {
    let reference = item.sourceId ? bySourceId.get(item.sourceId) : null;
    if (!reference && item.source && item.source !== "User brief") {
      const sourceId = `brief-${slugify(item.source) || index + 1}`;
      reference = bySourceId.get(sourceId);
      if (!reference) {
        reference = {
          id: `ref-${sourceId}`,
          sourceId,
          label: item.source,
          type: "brief",
          url: "",
          excerpt: item.raw || item.label || "",
          wordCount: 0,
          evidenceIds: [],
          claimCount: 0
        };
        bySourceId.set(sourceId, reference);
        references.push(reference);
      }
    }
    if (!reference) return;
    reference.evidenceIds.push(item.id || `ev-${index + 1}`);
    reference.claimCount += 1;
  });
  return references.map((item, index) => ({
    ...item,
    index: index + 1,
    citation: `[${index + 1}]`
  }));
}

function referenceSummary(ctx) {
  const cited = (ctx.references || [])
    .filter((item) => item.claimCount || item.type === "link" || item.type === "document")
    .slice(0, 3);
  if (!cited.length) return sourceSummary(ctx.evidence);
  return cited.map((item) => `${item.citation} ${item.label}`).join("; ");
}

function evidenceForLayout(ctx, layout) {
  const evidence = ctx.evidence || [];
  if (!evidence.length) return null;
  const map = {
    problem: 0,
    market: 1,
    traction: 2,
    financials: 0,
    metrics: 0,
    ask: 2,
    "buyer-pain": 0,
    proof: 1,
    "commercial-case": 0,
    "learner-context": 0,
    "practice-loop": 1,
    assessment: 2
  };
  return evidence[Math.min(map[layout] ?? 0, evidence.length - 1)];
}

function sourceSummary(evidence) {
  const sources = [...new Set((evidence || []).map((item) => item.source).filter(Boolean))];
  return sources.slice(0, 2).join("; ");
}

function parseMetricNumber(metric) {
  const value = String(metric || "").trim();
  if (/^\d+\s*[-–]\s*\d+\s*[-–]\s*\d+$/i.test(value)) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function metricUnit(metric) {
  const value = String(metric || "").toLowerCase();
  if (value.includes("%")) return "%";
  if (/hrs?|hours?/.test(value) && /week|wk/.test(value)) return "hrs/week";
  if (/days?/.test(value)) return "days";
  if (/users?/.test(value)) return "users";
  if (/customers?/.test(value)) return "customers";
  if (/sites?/.test(value)) return "sites";
  if (/\$/.test(value)) return "$";
  return "";
}

function buildCharts(evidence) {
  const metrics = (evidence || [])
    .map((item, index) => ({
      id: item.id || `chart-metric-${index + 1}`,
      metric: item.metric || "",
      value: parseMetricNumber(item.metric),
      unit: metricUnit(item.metric),
      label: cleanSourceLabel(item.label, `Metric ${index + 1}`),
      source: item.source || "User brief",
      sourceId: item.sourceId || ""
    }))
    .filter((item) => item.value !== null)
    .slice(0, 5);
  if (!metrics.length) return [];
  const maxValue = Math.max(...metrics.map((item) => Math.abs(item.value)), 1);
  return [{
    id: "chart-1",
    type: "evidence-bars",
    title: "Evidence Signal Chart",
    subtitle: "Auto-built from supplied metrics and document claims",
    maxValue,
    items: metrics.map((item) => ({
      ...item,
      ratio: Math.max(0.08, Math.min(1, Math.abs(item.value) / maxValue))
    }))
  }];
}

function metricSize(value, base) {
  const length = String(value || "").length;
  if (length > 14) return Math.max(34, base - 30);
  if (length > 10) return Math.max(40, base - 24);
  if (length > 7) return Math.max(46, base - 16);
  return base;
}

function inferArchetype(prompt) {
  const p = prompt.toLowerCase();
  if (/success story|case study|founder story|company history|timeline|origin story|biography|journey|قصة نجاح|دراسة حالة|رحلة|تاريخ|سيرة|من .+ إلى|البدايات|محطات/.test(p)) return "success-story";
  if (/investor|funding|pitch|vc|startup|seed|series\s+[abc]|مستثمر|استثمار|تمويل|شركة ناشئة|ستارت.?اب|جولة|رأس المال/.test(p)) return "investor-pitch";
  if (/training|workshop|lesson|course|teach|teacher|تدريب|ورشة|درس|دورة|تعليم|متدرب/.test(p)) return "training";
  if (/sales|client|proposal|customer|مبيعات|عميل|عملاء|عرض سعر|عرض تجاري|اقتراح|مقترح/.test(p)) return "sales";
  return "executive-brief";
}

function selectLayouts(prompt, count, opts = {}) {
  const archetype = inferArchetype(prompt);
  if (archetype === "success-story") {
    const picked = (opts.rtl || hasArabic(prompt) ? arabicCinematicLayouts : layouts).slice(0, Math.max(1, count));
    if (count >= 6 && !picked.includes("closing")) picked[picked.length - 1] = "closing";
    return picked.slice(0, count);
  }
  if (archetype === "investor-pitch") {
    const sequence = opts.rtl || hasArabic(prompt) ? arabicInvestorLayouts : investorLayouts;
    const picked = sequence.slice(0, Math.max(1, count));
    if (count >= 6 && sequence === arabicInvestorLayouts && !picked.includes("closing")) picked[picked.length - 1] = "closing";
    if (count >= 6 && sequence !== arabicInvestorLayouts && !picked.includes("ask")) picked[picked.length - 1] = "ask";
    return picked.slice(0, count);
  }
  if (archetype === "sales") {
    const picked = salesLayouts.slice(0, Math.max(1, count));
    if (count >= 6 && !picked.includes("next-steps")) picked[picked.length - 1] = "next-steps";
    return picked.slice(0, count);
  }
  if (archetype === "training") {
    const picked = trainingLayouts.slice(0, Math.max(1, count));
    if (count >= 6 && !picked.includes("closing")) picked[picked.length - 1] = "closing";
    return picked.slice(0, count);
  }
  const picked = layouts.slice(0, count - 1);
  if (!picked.includes("closing")) picked.push("closing");
  return picked.slice(0, count);
}

function buildStrategy(prompt, title, rtl, count, themeName, keywords, archetype, brand, evidence, sources = [], documents = [], charts = [], references = []) {
  const focus = keywords.length ? keywords.join(", ") : title;
  const narratives = {
    "investor-pitch": "problem -> solution -> market -> traction -> model -> ask",
    sales: "client context -> pain -> solution -> proof -> scope -> commercial case -> next steps",
    training: "outcomes -> context -> concepts -> practice -> assessment -> rollout"
  };
  return {
    brand: brand.name || "Unbranded",
    audience: brand.audience || inferAudience(prompt),
    objective: brand.objective,
    tone: brand.tone,
    evidenceCount: evidence.length,
    sourceCount: sources.length,
    documentCount: documents.length,
    chartCount: charts.length,
    referenceCount: references.length,
    evidenceSummary: evidence.length ? evidence.map((item) => `${item.metric} ${item.label}`).join("; ") : "No supplied evidence",
    sourceSummary: sources.length ? sources.map((source) => source.label).slice(0, 4).join("; ") : "No supplied sources",
    documentSummary: documents.length ? documents.map((item) => item.name).slice(0, 4).join("; ") : "No uploaded documents",
    archetype,
    narrative: narratives[archetype] || (rtl ? "context -> value -> method -> action" : "context -> value -> proof -> operating plan -> action"),
    visualDirection: `${themeName}; ${brand.configured ? `${brand.tone} brand treatment; ` : ""}fixed 16:9 canvas; strong hierarchy; restrained color; editable evidence charts and vector-like visual blocks`,
    contentFocus: focus,
    exportContract: `${count} HTML slides plus manifest, deck DNA, briefing, QA, source, document, reference, chart, and PPTX export metadata`
  };
}

function buildAgentLog(strategy, count) {
  return [
    ["Interpret request", `Audience: ${strategy.audience}. Focus: ${strategy.contentFocus}.`],
    ["Apply brief", `Brand: ${strategy.brand}. Objective: ${strategy.objective}. Tone: ${strategy.tone}.`],
    ["Ground evidence", `${strategy.evidenceCount} evidence point${strategy.evidenceCount === 1 ? "" : "s"} across ${strategy.sourceCount || 0} source${strategy.sourceCount === 1 ? "" : "s"}, ${strategy.documentCount || 0} document${strategy.documentCount === 1 ? "" : "s"}, and ${strategy.referenceCount || 0} reference${strategy.referenceCount === 1 ? "" : "s"}. ${strategy.chartCount || 0} editable chart${strategy.chartCount === 1 ? "" : "s"} planned. ${strategy.evidenceSummary}.`],
    ["Plan deck", `Created a ${count}-slide narrative: ${strategy.narrative}.`],
    ["Design system", strategy.visualDirection],
    ["Build slides", "Generated manifest, slide HTML, object metadata, and editable text/shape layers."],
    ["Run QA", "Checked rendered text overflow, edge safety, hierarchy, and contrast."],
    ["Prepare exports", strategy.exportContract]
  ].map(([title, detail], index) => ({ index: index + 1, title, detail }));
}

function slidePlainText(slide) {
  return (slide?.elements || [])
    .filter((element) => element.type === "text")
    .map((element) => element.text || "")
    .join(" ");
}

function evidenceCitation(evidenceItem, references = []) {
  if (!evidenceItem) return "";
  const reference = references.find((item) => (item.evidenceIds || []).includes(evidenceItem.id));
  return reference?.citation || "";
}

function buildBriefing(deckInput = deck) {
  if (!deckInput) return null;
  const metadata = deckInput.metadata || {};
  const strategy = deckInput.strategy || {};
  const slides = deckInput.slides || [];
  const evidence = deckInput.evidence || [];
  const references = deckInput.references || [];
  const title = metadata.title || "Untitled deck";
  const audience = metadata.audience || strategy.audience || "the audience";
  const objective = metadata.objective || strategy.objective || "decision alignment";
  const brandName = metadata.brandName || deckInput.brand?.name || strategy.brand || "";
  const keyMessages = slides
    .filter((slide) => !["cover", "closing"].includes(slide.layout))
    .slice(0, 5)
    .map((slide, index) => ({
      id: `message-${index + 1}`,
      title: slide.title || labelFromLayout(slide.layout),
      message: slide.brief || `Use this section to advance the ${strategy.narrative || "core narrative"}.`
    }));
  const evidenceCallouts = evidence.slice(0, 6).map((item, index) => ({
    id: item.id || `evidence-${index + 1}`,
    metric: item.metric,
    label: item.label,
    source: item.source || "User brief",
    citation: evidenceCitation(item, references),
    talkTrack: `${item.metric} ${item.label}${evidenceCitation(item, references) ? ` ${evidenceCitation(item, references)}` : ""}`
  }));
  const objectionsByArchetype = {
    sales: [
      ["Implementation risk", "Anchor the answer in phases, owners, decision gates, and the smallest low-risk pilot."],
      ["Adoption", "Tie adoption to manager workflow, time saved, and visible day-one operating cues."],
      ["ROI confidence", "Use the evidence callouts and references to connect investment to measurable commercial impact."]
    ],
    "investor-pitch": [
      ["Market confidence", "Explain the wedge, early proof, and why this category can support scale."],
      ["Execution risk", "Point to focused milestones, hiring priorities, and the next validation gates."],
      ["Defensibility", "Connect product workflow, data depth, and repeatable go-to-market motion."]
    ],
    training: [
      ["Behavior change", "Show the practice loop, reinforcement cadence, and assessment method."],
      ["Learner readiness", "Name the starting point and the support built into the rollout."],
      ["Measurement", "Use assessment and follow-up metrics to prove transfer into work."]
    ]
  };
  const objectionHandling = (objectionsByArchetype[deckInput.archetype] || [
    ["Strategic priority", "Connect the proposal to the audience's current decision pressure and objective."],
    ["Execution confidence", "Use the roadmap, owners, and QA-ready evidence to reduce perceived risk."],
    ["Proof", "Point to the strongest cited evidence and explain why it matters now."]
  ]).map(([objection, response], index) => ({ id: `objection-${index + 1}`, objection, response }));
  const perSlide = slides.map((slide, index) => {
    const corpus = normalizeClaimText(slidePlainText(slide));
    const matchedEvidence = evidence.filter((item) => {
      const metric = normalizeClaimText(item.metric);
      return metric && corpus.includes(metric);
    }).slice(0, 3);
    return {
      slide: index + 1,
      title: slide.title || labelFromLayout(slide.layout),
      role: slide.layout === "cover" ? "opening" : ["closing", "next-steps", "ask"].includes(slide.layout) ? "close" : "body",
      cue: slide.speakerNotes || slide.brief || "Name the headline, explain the implication, and move to the next decision.",
      evidence: matchedEvidence.map((item) => ({
        metric: item.metric,
        label: item.label,
        citation: evidenceCitation(item, references)
      }))
    };
  });
  return {
    title,
    generatedAt: new Date().toISOString(),
    summary: `${title} is a ${slides.length}-slide ${deckInput.archetype || "executive"} presentation for ${audience}, built to support ${objective}.`,
    opening: `Open by naming the audience's current pressure, then position ${brandName || "the recommendation"} as the practical path to the desired outcome.`,
    close: `Close with the decision path, next owner, timing, and the smallest credible commitment toward ${objective}.`,
    keyMessages,
    evidenceCallouts,
    objectionHandling,
    perSlide
  };
}

function rounded(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function colorRoleFor(theme, color) {
  const normalized = normalizeHex(color, "").toLowerCase();
  const match = Object.entries(theme || {}).find(([, value]) => normalizeHex(value, "").toLowerCase() === normalized);
  return match ? match[0] : "custom";
}

function collectDeckColors(deckInput) {
  const theme = deckInput.theme || {};
  const colors = new Map();
  const add = (raw, source, slideNumber = 0) => {
    const color = normalizeHex(raw, "").toLowerCase();
    if (!color) return;
    const current = colors.get(color) || {
      color,
      role: colorRoleFor(theme, color),
      count: 0,
      sources: new Set(),
      slides: new Set()
    };
    current.count += 1;
    current.sources.add(source);
    if (slideNumber) current.slides.add(slideNumber);
    colors.set(color, current);
  };
  ["bg", "paper", "ink", "muted", "accent", "accent2", "white", "danger"].forEach((role) => add(theme[role], `theme.${role}`));
  (deckInput.slides || []).forEach((slide, slideIndex) => {
    (slide.elements || []).forEach((element) => {
      add(element.fill, `${element.type}.fill`, slideIndex + 1);
      add(element.stroke, `${element.type}.stroke`, slideIndex + 1);
    });
  });
  return Array.from(colors.values())
    .map((item) => ({
      color: item.color,
      role: item.role,
      count: item.count,
      sources: Array.from(item.sources).slice(0, 4),
      slideCount: item.slides.size
    }))
    .sort((a, b) => b.count - a.count || a.color.localeCompare(b.color));
}

function countBy(items) {
  return items.reduce((acc, item) => {
    const key = item || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function deckTextStats(slides) {
  const textElements = slides.flatMap((slide) => (slide.elements || []).filter((element) => element.type === "text"));
  const sizes = textElements.map((element) => Number(element.size) || 0).filter(Boolean);
  const bodySizes = sizes.filter((size) => size < 44);
  const titleSizes = sizes.filter((size) => size >= 44);
  const textChars = textElements.reduce((sum, element) => sum + String(element.text || "").length, 0);
  return {
    textElementCount: textElements.length,
    totalCharacters: textChars,
    avgCharactersPerSlide: slides.length ? Math.round(textChars / slides.length) : 0,
    titleSize: titleSizes.length ? Math.round(Math.max(...titleSizes)) : (sizes.length ? Math.round(Math.max(...sizes)) : 0),
    bodySize: bodySizes.length ? Math.round(bodySizes.reduce((sum, size) => sum + size, 0) / bodySizes.length) : (sizes.length ? Math.round(sizes[0]) : 0),
    sizeRange: sizes.length ? `${Math.min(...sizes)}-${Math.max(...sizes)}px` : "n/a"
  };
}

function buildDeckDNA(deckInput = deck) {
  if (!deckInput) return null;
  const slides = deckInput.slides || [];
  const metadata = deckInput.metadata || {};
  const theme = deckInput.theme || {};
  const brand = deckInput.brand || {};
  const strategy = deckInput.strategy || {};
  const palette = collectDeckColors(deckInput).slice(0, 8);
  const textStats = deckTextStats(slides);
  const layoutCounts = countBy(slides.map((slide) => slide.layout));
  const roleCounts = countBy(slides.map((slide) => roleForLayout(slide.layout)));
  const objectCounts = slides.map((slide) => (slide.elements || []).length);
  const shapeCount = slides.reduce((sum, slide) => sum + (slide.elements || []).filter((element) => ["shape", "imageBlock"].includes(element.type)).length, 0);
  const textCount = textStats.textElementCount;
  const chartCount = (deckInput.charts || []).length;
  const evidenceCount = (deckInput.evidence || []).length;
  const referenceCount = (deckInput.references || []).length;
  const avgObjectCount = objectCounts.length ? rounded(objectCounts.reduce((sum, value) => sum + value, 0) / objectCounts.length) : 0;
  const primaryLayout = Object.entries(layoutCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "mixed";
  const densityLabel = textStats.avgCharactersPerSlide > 760 ? "dense" : textStats.avgCharactersPerSlide > 430 ? "balanced" : "visual";
  const visualRatio = textCount + shapeCount ? rounded(shapeCount / (textCount + shapeCount), 2) : 0;
  const accentContrast = normalizeHex(theme.accent, "") && normalizeHex(theme.paper, "") ? rounded(contrast(theme.accent, theme.paper), 2) : 0;
  const recommendations = [];
  if (evidenceCount < 2) recommendations.push("Add two to three cited evidence points before client or board delivery.");
  if (!chartCount && evidenceCount) recommendations.push("Convert at least one metric into an editable chart for stronger executive scan value.");
  if (textStats.avgCharactersPerSlide > 760) recommendations.push("Reduce body copy or split dense slides before exporting to PPTX.");
  if (accentContrast && accentContrast < 3) recommendations.push("Increase accent contrast against the slide paper color for safer presentation-room readability.");
  if (Object.keys(layoutCounts).length < Math.min(5, slides.length)) recommendations.push("Vary layout rhythm with at least one proof, roadmap, or comparison slide.");
  if (!recommendations.length) recommendations.push("Style system is export-ready; save it as a reusable template for the next deck.");
  const styleTokens = {
    canvas: `${deckInput.canvas?.width || W}x${deckInput.canvas?.height || H}`,
    themeName: theme.name || "Custom",
    background: theme.bg || "",
    paper: theme.paper || "",
    ink: theme.ink || "",
    muted: theme.muted || "",
    accent: theme.accent || "",
    secondaryAccent: theme.accent2 || "",
    titleSize: textStats.titleSize,
    bodySize: textStats.bodySize,
    headerBandHeight: 108,
    footerBandHeight: 80,
    cornerRadius: 8,
    density: densityLabel
  };
  const fingerprint = [
    styleTokens.themeName,
    densityLabel,
    primaryLayout,
    `${slides.length} slides`,
    brand.name || strategy.brand || "unbranded"
  ].join(" / ");
  return {
    title: metadata.title || "Untitled deck",
    generatedAt: new Date().toISOString(),
    fingerprint,
    summary: `${metadata.title || "This deck"} uses a ${styleTokens.themeName} system with ${densityLabel} information density, ${palette.length} tracked color tokens, and a ${strategy.narrative || "structured"} narrative.`,
    palette,
    typography: textStats,
    layoutRhythm: {
      primaryLayout,
      layoutCounts,
      roleCounts,
      avgObjectCount,
      visualRatio,
      density: densityLabel
    },
    proofSystem: {
      evidenceCount,
      referenceCount,
      chartCount,
      factCheckStatus: deckInput.factCheck?.status || "not run"
    },
    styleTokens,
    reusablePrompt: `Create a ${slides.length || 10}-slide professional deck using a ${styleTokens.themeName} visual system, ${densityLabel} slide density, ${brand.tone || metadata.tone || "board-ready"} tone, strong title hierarchy around ${styleTokens.titleSize || 56}px, concise body copy around ${styleTokens.bodySize || 24}px, ${styleTokens.accent || "brand"} accent cues, and a ${strategy.narrative || "context -> proof -> plan -> action"} narrative rhythm.`,
    recommendations
  };
}

function topicBank(prompt, rtl) {
  const p = prompt.toLowerCase();
  const keywords = extractKeywords(prompt);
  const topic = keywords.length ? keywords.slice(0, 2).join(" ") : "the initiative";
  const topicTitle = titleFromPrompt(prompt, rtl);
  const englishLearning = /english|language|learning|learn|master/.test(p);
  if (rtl) {
    return {
      agenda: ["\u0644\u0645\u0627\u0630\u0627 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0636\u0648\u0639\u061f", "\u0627\u0644\u0641\u0648\u0627\u0626\u062f \u0627\u0644\u0639\u0645\u0644\u064a\u0629", "\u0623\u0631\u0642\u0627\u0645 \u0648\u0645\u0624\u0634\u0631\u0627\u062a", "\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062a\u0637\u0628\u064a\u0642", "\u062e\u0637\u0629 \u0627\u0644\u0637\u0631\u064a\u0642"],
      benefits: ["\u0641\u0631\u0635 \u0623\u0648\u0633\u0639 \u0641\u064a \u0627\u0644\u0639\u0645\u0644", "\u0648\u0635\u0648\u0644 \u0623\u0633\u0631\u0639 \u0644\u0644\u0645\u0639\u0631\u0641\u0629", "\u062a\u0648\u0627\u0635\u0644 \u0623\u0641\u0636\u0644 \u0645\u0639 \u0627\u0644\u0639\u0627\u0644\u0645"],
      pillars: ["\u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0639", "\u0627\u0644\u062a\u062d\u062f\u062b", "\u0627\u0644\u0642\u0631\u0627\u0621\u0629", "\u0627\u0644\u0643\u062a\u0627\u0628\u0629"],
      closing: "\u0627\u0628\u062f\u0623 \u0628\u062e\u0637\u0648\u0629 \u0648\u0627\u062d\u062f\u0629 \u0648\u0627\u062c\u0639\u0644 \u0627\u0644\u062a\u0639\u0644\u0645 \u0639\u0627\u062f\u0629 \u064a\u0648\u0645\u064a\u0629"
    };
  }
  if (englishLearning) {
    return {
      agenda: ["Why English matters now", "Career and study benefits", "How fluency compounds", "Daily learning system", "90-day roadmap"],
      benefits: ["Access better career options", "Learn from global sources", "Communicate with confidence"],
      pillars: ["Listening", "Speaking", "Reading", "Writing"],
      closing: "Start small, repeat daily, and turn English into a practical advantage"
    };
  }
  return {
    agenda: ["Why now", "Audience needs", "Value proposition", "Execution plan", "Next decisions"],
    benefits: ["Clear ROI story", "Faster execution", "Better measurement"],
    pillars: ["Insight", "Design", "Delivery", "Scale"],
    closing: `Move ${topicTitle.toLowerCase()} from idea to repeatable operating system`
  };
}

function el(type, x, y, w, h, props = {}) {
  return { type, x, y, w, h, ...props };
}

function background(t) {
  return [
    el("shape", 0, 0, W, H, { fill: t.paper, stroke: t.paper }),
    el("shape", 0, 0, W, 108, { fill: t.bg, stroke: t.bg }),
    el("shape", 126, 148, 76, 8, { fill: t.accent, stroke: t.accent }),
    el("shape", 0, 1000, W, 80, { fill: "#ffffff", stroke: "#ffffff" })
  ];
}

function imageBlock(x, y, w, h, t, label) {
  const bg = darkSurface(t);
  return [
    el("imageBlock", x, y, w, h, { fill: bg, stroke: bg, radius: 0 }),
    el("shape", x + w * 0.08, y + h * 0.12, w * 0.72, h * 0.14, { fill: t.accent, stroke: t.accent, radius: 40 }),
    el("shape", x + w * 0.16, y + h * 0.34, w * 0.66, h * 0.12, { fill: t.accent2, stroke: t.accent2, radius: 40 }),
    el("shape", x + w * 0.1, y + h * 0.58, w * 0.78, h * 0.16, { fill: "#ffffff", stroke: "#ffffff", radius: 42 }),
    el("text", x + 70, y + h - 142, w - 140, 72, { text: label, size: 24, fill: t.white, bold: true, align: "center" })
  ];
}

function text(t, x, y, w, h, value, size, fill, opts = {}) {
  return el("text", x, y, w, h, {
    text: value,
    size,
    fill,
    bold: !!opts.bold,
    align: opts.align || "left",
    rtl: !!opts.rtl,
    lineHeight: opts.lineHeight || 1.1,
    font: opts.font || (opts.rtl ? (t.fontArabic || "Tajawal") : (t.fontLatin || "Aptos")),
    chartId: opts.chartId || ""
  });
}

function chartElements(t, chart, x, y, w, h, opts = {}) {
  if (!chart?.items?.length) return [];
  const compact = !!opts.compact;
  const items = chart.items.slice(0, compact ? 3 : 4);
  const rowGap = compact ? 72 : 78;
  const rowStart = y + (compact ? 84 : 98);
  const barX = x + (compact ? 252 : 300);
  const barMax = w - (compact ? 390 : 460);
  const elements = [
    el("shape", x, y, w, h, { fill: "#ffffff", stroke: "#d9e0ea", radius: 26, chartId: chart.id }),
    text(t, x + 34, y + 28, w - 68, 34, chart.title || "Evidence chart", compact ? 24 : 28, t.ink, { bold: true, align: "left", chartId: chart.id }),
    text(t, x + 34, y + 62, w - 68, 28, chart.subtitle || "Generated from evidence", compact ? 15 : 17, t.muted, { align: "left", chartId: chart.id })
  ];
  items.forEach((item, index) => {
    const rowY = rowStart + index * rowGap;
    const width = Math.max(54, Math.round(barMax * item.ratio));
    const barFill = index === 1 ? t.accent2 : t.accent;
    elements.push(text(t, x + 34, rowY - 2, compact ? 190 : 230, 26, item.metric, compact ? 22 : 24, t.ink, { bold: true, align: "left", chartId: chart.id }));
    elements.push(text(t, x + 34, rowY + 27, compact ? 190 : 230, 28, item.label, compact ? 14 : 16, t.muted, { align: "left", lineHeight: 1.12, chartId: chart.id }));
    elements.push(el("shape", barX, rowY + 4, barMax, compact ? 24 : 28, { fill: "#edf1f7", stroke: "#edf1f7", radius: 14, chartId: chart.id }));
    elements.push(el("shape", barX, rowY + 4, width, compact ? 24 : 28, { fill: barFill, stroke: barFill, radius: 14, chartId: chart.id }));
    elements.push(text(t, barX + Math.min(width + 14, barMax - 110), rowY - 2, 112, 30, item.metric, compact ? 16 : 18, t.ink, { bold: true, align: "left", chartId: chart.id }));
  });
  return elements;
}

function darkSurface(t) {
  return contrast(t.white, t.bg) >= 2.8 ? t.bg : t.ink;
}

function brandFooter(ctx, layout) {
  const brand = ctx.brand || {};
  if (!brand.configured) return [];
  const label = brand.name || ctx.title || "DeckForge";
  const detail = [brand.audience, brand.objective].filter(Boolean).join(" / ");
  const darkFooter = layout === "closing";
  const mainColor = darkFooter ? ctx.theme.white : ctx.theme.ink;
  const detailColor = darkFooter ? "#dbe4f0" : ctx.theme.muted;
  return [
    text(ctx.theme, 126, 1018, 620, 32, label, 18, mainColor, { bold: true, align: "left", rtl: ctx.rtl }),
    text(ctx.theme, 1020, 1018, 780, 32, detail, 16, detailColor, { align: "right", rtl: ctx.rtl })
  ];
}

function evidenceFooter(ctx, layout) {
  if (!ctx.evidence?.length || layout === "cover") return [];
  const summary = referenceSummary(ctx);
  if (!summary) return [];
  const darkFooter = layout === "closing";
  return [
    text(ctx.theme, 126, 976, 1500, 28, `References: ${summary}`, 15, darkFooter ? "#dbe4f0" : ctx.theme.muted, { align: "left", rtl: ctx.rtl })
  ];
}

function investorSpec(layout, ctx) {
  const topic = ctx.title;
  const evidence = evidenceForLayout(ctx, layout);
  const evidenceCards = (ctx.evidence || []).slice(0, 3).map((item) => item.label);
  const specs = {
    problem: {
      title: "Operational Waste Is Expensive",
      lead: `${topic} targets recurring waste, staffing volatility, and margin leakage.`,
      cards: ["Food waste", "Labor gaps", "Margin pressure"],
      metric: "3-8%"
    },
    solution: {
      title: "AI Control Layer for Operations",
      lead: "Forecast demand, guide staffing, and surface waste-reduction actions before losses compound.",
      cards: ["Forecast", "Schedule", "Optimize"],
      metric: "24/7"
    },
    market: {
      title: "Large, Underserved Market",
      lead: "Restaurants operate on thin margins and need practical automation that improves daily decisions.",
      cards: ["Restaurants", "Multi-site groups", "Enterprise foodservice"],
      metric: "$900B+"
    },
    product: {
      title: "Product Workflow",
      lead: "The platform converts sales, inventory, and labor signals into recommended manager actions.",
      cards: ["Connect data", "Predict demand", "Recommend action"],
      metric: "3-step"
    },
    "business-model": {
      title: "Revenue Model",
      lead: "SaaS subscription pricing expands with locations, modules, and operational data volume.",
      cards: ["Base SaaS", "Premium AI", "Enterprise rollout"],
      metric: "NRR"
    },
    traction: {
      title: "Validation Milestones",
      lead: "The investor story should prove usage, measurable savings, and repeatable expansion.",
      cards: ["Pilot savings", "Weekly usage", "Expansion intent"],
      metric: "Pilot"
    },
    gtm: {
      title: "Go-to-Market Motion",
      lead: "Start with high-pain operators, prove savings quickly, then expand across groups.",
      cards: ["Pilot", "Prove ROI", "Expand sites"],
      metric: "Land"
    },
    financials: {
      title: "Margin Expansion Model",
      lead: "Value comes from waste reduction, tighter labor planning, and better purchasing decisions.",
      cards: ["Waste down", "Labor tuned", "Margins up"],
      metric: "ROI"
    },
    ask: {
      title: "Investment Ask",
      lead: "Use funds to accelerate product, customer proof, and repeatable go-to-market execution.",
      cards: ["Product", "Pilots", "GTM"],
      metric: "18 mo"
    }
  };
  const spec = specs[layout] || specs.solution;
  if (evidence) {
    spec.metric = evidence.metric;
    const label = evidence.label.length > 46 ? `${evidence.label.slice(0, 43)}...` : evidence.label;
    spec.lead = `${spec.lead} Evidence: ${label}.`;
  }
  if (evidenceCards.length >= 3 && ["problem", "market", "traction", "financials"].includes(layout)) {
    spec.cards = evidenceCards;
  }
  return spec;
}

function playbookSpec(layout, ctx) {
  const topic = ctx.title;
  const evidence = evidenceForLayout(ctx, layout);
  const sourceMetric = evidence?.metric || "";
  const specs = {
    "client-context": {
      title: "Client Context",
      lead: `${topic} is framed around the buyer's current priorities, constraints, and decision pressure.`,
      cards: ["Current state", "Decision pressure", "Success criteria"],
      metric: sourceMetric || "Fit"
    },
    "buyer-pain": {
      title: "Buyer Pain",
      lead: "The proposal names operational friction in plain language and connects it to measurable business impact.",
      cards: ["Cost of delay", "Workflow drag", "Missed upside"],
      metric: sourceMetric || "Pain"
    },
    "proposed-solution": {
      title: "Recommended Solution",
      lead: "A focused recommendation ties the offering to the buyer's outcome, not just a feature list.",
      cards: ["Outcome", "Approach", "Proof"],
      metric: "3-part"
    },
    differentiators: {
      title: "Why This Approach Wins",
      lead: "The deck separates the offer from alternatives with clear advantages the client can defend internally.",
      cards: ["Sharper insight", "Lower risk", "Faster path"],
      metric: "Edge"
    },
    proof: {
      title: "Proof Points",
      lead: "Evidence gives the buyer confidence that the promised value is credible and repeatable.",
      cards: (ctx.evidence || []).slice(0, 3).map((item) => item.label),
      metric: sourceMetric || "Proof"
    },
    scope: {
      title: "Scope of Work",
      lead: "A professional proposal clarifies what is included, what is optional, and how success is measured.",
      cards: ["Included", "Optional", "Measured"],
      metric: "SOW"
    },
    implementation: {
      title: "Implementation Plan",
      lead: "The plan reduces perceived risk by showing phases, owners, and decision gates.",
      cards: ["Mobilize", "Execute", "Optimize"],
      metric: "30-60-90"
    },
    "commercial-case": {
      title: "Commercial Case",
      lead: "The investment story connects spend to impact, payback, and strategic value.",
      cards: ["Cost", "Return", "Decision"],
      metric: sourceMetric || "ROI"
    },
    "next-steps": {
      title: "Decision Path",
      lead: "Close with an easy path to yes: owners, timing, and the smallest next commitment.",
      cards: ["Confirm scope", "Align terms", "Launch"],
      metric: "Next"
    },
    "learning-outcomes": {
      title: "Learning Outcomes",
      lead: "Training starts by making the target capabilities explicit and measurable.",
      cards: ["Know", "Practice", "Apply"],
      metric: "3 goals"
    },
    "learner-context": {
      title: "Learner Context",
      lead: "The deck meets learners where they are and names the gap between current and desired behavior.",
      cards: ["Starting point", "Common blocker", "Desired behavior"],
      metric: sourceMetric || "Gap"
    },
    "core-concepts": {
      title: "Core Concepts",
      lead: "Concepts are grouped into a small mental model learners can remember under pressure.",
      cards: ["Principle", "Pattern", "Example"],
      metric: "3 ideas"
    },
    "practice-loop": {
      title: "Practice Loop",
      lead: "Practice turns the content from explanation into skill by adding repetition and feedback.",
      cards: ["Try", "Feedback", "Repeat"],
      metric: sourceMetric || "Loop"
    },
    "example-walkthrough": {
      title: "Worked Example",
      lead: "A concrete scenario shows exactly how the learner should apply the method.",
      cards: ["Scenario", "Decision", "Result"],
      metric: "Demo"
    },
    checklist: {
      title: "Execution Checklist",
      lead: "A concise checklist helps learners transfer the training into daily work.",
      cards: ["Before", "During", "After"],
      metric: "Ready"
    },
    assessment: {
      title: "Assessment",
      lead: "The deck defines what good looks like so progress can be observed and coached.",
      cards: ["Criteria", "Practice task", "Feedback"],
      metric: "Score"
    },
    "rollout-plan": {
      title: "Rollout Plan",
      lead: "Training becomes operational when the rollout names cadence, ownership, and reinforcement.",
      cards: ["Launch", "Coach", "Reinforce"],
      metric: "30 days"
    }
  };
  const spec = specs[layout] || specs["client-context"];
  if (evidence && !spec.lead.includes("Evidence")) {
    const label = evidence.label.length > 46 ? `${evidence.label.slice(0, 43)}...` : evidence.label;
    spec.lead = `${spec.lead} Evidence: ${label}.`;
  }
  if (!spec.cards.length) spec.cards = ["Proof", "Signal", "Decision"];
  return spec;
}

function isPlaybookLayout(layout) {
  return salesLayouts.includes(layout) || trainingLayouts.includes(layout);
}

function planForLayout(layout, index, ctx) {
  const library = {
    cover: ["Set a premium first impression", "Frame the topic and promised outcome"],
    agenda: ["Turn the prompt into a clear roadmap", "Show the audience what will be covered"],
    why: ["Build urgency and context", "Connect the topic to a measurable outcome"],
    benefits: ["Present the core benefits", "Reduce the value story into three strong points"],
    metrics: ["Add decision-grade numbers", "Make the value feel tangible"],
    pillars: ["Break the method into pillars", "Show what repeats in practice"],
    roadmap: ["Turn intent into steps", "Clarify sequence and priorities"],
    habits: ["Make execution practical", "Translate strategy into daily behavior"],
    mistakes: ["Name avoidable failure modes", "Help the audience avoid wasted effort"],
    closing: ["Close with a clear action", "Leave the audience with a next step"],
    origin: ["Open the origin story", "Place the audience inside the first scene and explain why it mattered"],
    timeline: ["Show decisive milestones", "Turn dates into a cinematic sequence of choices and inflection points"],
    scale: ["Make scale visceral", "Use one hero number and supporting context to make growth memorable"],
    "financial-power": ["Translate success into economics", "Connect revenue, profit, and market value to the narrative"],
    acquisitions: ["Explain strategic moves", "Show how acquisitions changed the shape of the platform or category"],
    transformation: ["Frame the strategic pivot", "Contrast the old identity with the future-facing ambition"],
    culture: ["Reveal the operating code", "Show the values and behaviors that made the story repeatable"],
    lessons: ["Extract transferable lessons", "Turn the case study into practical principles for the audience"],
    problem: ["Name the expensive pain", "Make the investor feel the urgency"],
    solution: ["Show the product answer", "Explain the wedge in plain language"],
    market: ["Size the opportunity", "Show why the category can support venture scale"],
    vision: ["Frame the venture-scale vision", "Show why the opportunity can become a category, not just a feature"],
    product: ["Demonstrate workflow", "Make the product feel operationally real"],
    "how-it-works": ["Explain the experience loop", "Make the product mechanics feel simple, repeatable, and defensible"],
    "business-model": ["Explain monetization", "Show how value turns into revenue"],
    traction: ["Show validation path", "Name proof points investors expect"],
    gtm: ["Describe acquisition motion", "Connect buyer, channel, and expansion"],
    financials: ["Show margin logic", "Summarize unit economics and upside"],
    team: ["Build founder credibility", "Connect the team's strengths to product, market, and execution risk"],
    funding: ["Make the round concrete", "Tie the requested capital to product, growth, and proof milestones"],
    ask: ["Close with use of funds", "Make the next investor decision clear"],
    "client-context": ["Frame the buyer's world", "Show that the proposal understands the client's priorities"],
    "buyer-pain": ["Name the costly friction", "Connect pain to urgency and business impact"],
    "proposed-solution": ["Present the recommendation", "Tie the offer to outcomes rather than features"],
    differentiators: ["Explain why this path wins", "Give the buyer language to defend the choice"],
    proof: ["Show credible proof", "Use supplied evidence to reduce perceived risk"],
    scope: ["Clarify the scope", "Make deliverables, options, and success measures explicit"],
    implementation: ["Reduce delivery risk", "Show phases, owners, and decision gates"],
    "commercial-case": ["Make the economics clear", "Connect investment to return and strategic value"],
    "next-steps": ["Close the buying path", "Make the next commitment easy and concrete"],
    "learning-outcomes": ["Define target capabilities", "Make the learning promise measurable"],
    "learner-context": ["Meet learners where they are", "Name the gap between current and desired behavior"],
    "core-concepts": ["Teach the mental model", "Keep the concepts memorable and usable"],
    "practice-loop": ["Turn content into skill", "Explain repetition, feedback, and transfer"],
    "example-walkthrough": ["Demonstrate the method", "Show a realistic scenario and decision path"],
    checklist: ["Create transfer aid", "Give learners a simple action checklist"],
    assessment: ["Define mastery", "Show how progress will be observed and coached"],
    "rollout-plan": ["Operationalize training", "Name cadence, owners, and reinforcement"]
  };
  const [brief, speakerNotes] = library[layout] || ["Deepen the story", "Add an execution-ready detail"];
  const tailoredNotes = ctx.brand?.configured
    ? `${speakerNotes} Tailor the language for ${ctx.strategy.audience} with a ${ctx.brand.tone.toLowerCase()} tone.`
    : speakerNotes;
  const sourceNotes = ctx.evidence?.length ? `${tailoredNotes} Reference supplied evidence where it supports the claim.` : tailoredNotes;
  return {
    slide: index + 1,
    layout,
    role: roleForLayout(layout),
    brief,
    speakerNotes: sourceNotes,
    audience: ctx.strategy.audience,
    qaFocus: ctx.rtl ? "Premium RTL Arabic typography, hierarchy, contrast, and no clipped text" : "Hierarchy, overflow, contrast, and alignment"
  };
}

function isArabicInvestor(ctx) {
  return !!(ctx?.rtl && ctx.theme?.investorDark);
}

function isArabicCinematic(ctx) {
  return !!(ctx?.rtl && ctx.theme?.cinematicStory);
}

function isArabicLuxe(ctx) {
  return !!(ctx?.rtl && ctx.theme?.rtlPremium && !ctx.theme?.investorDark);
}

function arabicFont(ctx) {
  return ctx.theme.fontArabic || "Tajawal";
}

function latinFont(ctx) {
  return ctx.theme.fontLatin || "Playfair Display";
}

function arabicText(ctx, x, y, w, h, value, size, fill, opts = {}) {
  return text(ctx.theme, x, y, w, h, value, size, fill, {
    rtl: true,
    align: opts.align || "right",
    bold: opts.bold,
    lineHeight: opts.lineHeight || 1.18,
    font: opts.font || arabicFont(ctx)
  });
}

function latinText(ctx, x, y, w, h, value, size, fill, opts = {}) {
  return text(ctx.theme, x, y, w, h, value, size, fill, {
    align: opts.align || "left",
    bold: opts.bold,
    lineHeight: opts.lineHeight || 1.05,
    font: opts.font || latinFont(ctx)
  });
}

function arabicInvestorBodyText(ctx, x, y, w, h, value, size, fill, opts = {}) {
  return arabicText(ctx, x, y, w, h, value, size, fill, {
    ...opts,
    font: opts.font || ctx.theme.fontBody || arabicFont(ctx),
    lineHeight: opts.lineHeight || 1.45
  });
}

function arabicInvestorSectionLabel(layout, index) {
  const labels = {
    cover: "البداية",
    vision: "الرؤية",
    problem: "المشكلة",
    solution: "الحل",
    "how-it-works": "طريقة العمل",
    product: "التجربة",
    market: "السوق",
    traction: "التحقق",
    "business-model": "النموذج",
    gtm: "النمو",
    financials: "الأرقام",
    funding: "التمويل",
    ask: "التمويل",
    team: "الفريق",
    closing: "الخاتمة"
  };
  return `${String(index + 1).padStart(2, "0")} · ${labels[layout] || "القصة"}`;
}

function arabicInvestorTitle(ctx, layout, index) {
  const planned = ctx.plan?.[index]?.title;
  if (planned && !/Set a premium|Name the expensive|Show the product|Size the opportunity|Deepen the story/i.test(planned)) return planned;
  const titles = {
    cover: ctx.title,
    vision: "الرؤية التي تغيّر طريقة اللعب",
    problem: "الفجوة التي تفتح السوق",
    solution: "الحل الذي يحوّل الفكرة إلى تجربة",
    "how-it-works": "كيف تعمل التجربة؟",
    product: "كيف تعمل التجربة؟",
    traction: "إشارات تحقق مبكرة",
    market: "سوق ضخم ينتظر تجربة جديدة",
    "business-model": "نموذج قيمة قابل للتوسع",
    gtm: "مسار نمو واضح",
    financials: "اقتصاديات تدعم القرار",
    team: "فريق يعرف المنتج والسوق",
    funding: "الجولة الحالية واستخدام التمويل",
    ask: "الجولة الحالية واستخدام التمويل",
    closing: "من فكرة إلى تجربة قابلة للنمو"
  };
  return titles[layout] || labelFromLayout(layout);
}

function arabicInvestorLead(ctx, layout) {
  const brand = arabicBrandName(ctx);
  const map = {
    cover: ctx.subtitle || "عرض مستثمرين عربي مبني بهوية تنفيذية داكنة وقابل للتصدير.",
    vision: `${brand} يحوّل الفكرة من وعد نظري إلى تجربة يلمسها المستخدم بسرعة، مع قصة استثمارية سهلة الدفاع عنها.`,
    problem: "السوق لا يعاني من نقص الأفكار؛ يعاني من فجوة بين الفكرة، التجربة الأولى، والدليل الذي يقنع رأس المال.",
    solution: "نختصر المسار من النص إلى منتج أو عرض قابل للتجربة، ونحافظ على وضوح الرسالة وجودة التنفيذ العربي.",
    "how-it-works": "تسلسل بسيط: صياغة الفكرة، بناء التجربة، إطلاق النسخة الأولى، ثم قياس ما يستحق التوسع.",
    product: "المنتج يجب أن يبدو عمليًا من أول نظرة: مدخل واضح، مخرجات قابلة للتعديل، وتجربة يمكن مشاركتها فورًا.",
    traction: "التحقق لا يحتاج أرقامًا كثيرة؛ يحتاج إشارات مبكرة منظمة تشرح لماذا الآن ولماذا هذا الفريق.",
    market: "الفرصة تكبر عندما يجتمع جمهور واسع مع احتياج متكرر وتجربة لا تزال بطيئة أو صعبة التنفيذ.",
    "business-model": "القيمة تتوسع عندما يتحول الاستخدام المتكرر إلى اشتراك، توسع فرق، أو قنوات شراكة واضحة.",
    gtm: "نبدأ من شريحة تملك ألمًا متكررًا، ثم نبني قناة دخول قابلة للقياس قبل التوسع.",
    financials: "الأرقام هنا ليست زينة؛ هي ربط بين التمويل، سرعة التعلم، والمرحلة التالية من النمو.",
    team: "الفريق المقنع هو الذي يجمع حس المنتج، فهم المستخدم، والقدرة على تحويل الرؤية إلى تنفيذ.",
    funding: "الجولة تموّل التعلم الأسرع: المنتج، النمو، والعمليات التي تثبت قابلية التوسع.",
    ask: "الجولة تموّل التعلم الأسرع: المنتج، النمو، والعمليات التي تثبت قابلية التوسع.",
    closing: "الخطوة التالية واضحة: تجربة أقوى، تحقق أسرع، وقصة جاهزة للنقاش مع المستثمرين."
  };
  return map[layout] || `هذا القسم يترجم ${ctx.title} إلى رسالة استثمارية عربية واضحة ومصممة بإيقاع فاخر.`;
}

function arabicInvestorMetrics(ctx) {
  const supplied = (ctx.evidence || []).slice(0, 4).map((item) => ({
    metric: item.metric,
    label: item.label || item.raw || "إشارة تحقق داعمة"
  })).filter((item) => item.metric);
  if (supplied.length) return supplied;
  return [
    { metric: "10x", label: "تسريع بناء النسخة القابلة للتجربة من الفكرة الأولى" },
    { metric: "30 يوم", label: "إطار تحقق سريع قبل مضاعفة الاستثمار في النمو" },
    { metric: "3 محاور", label: "منتج، سوق، وتمويل ضمن قصة واحدة قابلة للعرض" },
    { metric: "24/7", label: "تجربة توليد وتعديل تعمل كلما احتاجها الفريق" }
  ];
}

function arabicInvestorProcess(ctx) {
  const gameSignal = /game|play|لعب|ألعاب|لعبة|playabl/i.test(ctx.prompt || "");
  if (gameSignal) {
    return [
      ["الفكرة", "يدخل المستخدم وصفًا قصيرًا لما يريد أن يلعبه أو يشرحه."],
      ["المشهد", "نحوّل الوصف إلى بنية تفاعل وقواعد وتجربة بصرية أولية."],
      ["التجربة", "تظهر نسخة قابلة للعب والمشاركة بسرعة بدل انتظار دورة إنتاج طويلة."],
      ["التحقق", "نقيس التفاعل ونقرر أي الأفكار تستحق البناء والتوسع."]
    ];
  }
  return [
    ["المدخل", "نلتقط الفكرة والجمهور والهدف في brief قصير وواضح."],
    ["البناء", "نولد البنية، النصوص، البطاقات، والمؤشرات ضمن قالب قابل للتعديل."],
    ["المراجعة", "نفحص الاتجاه، اللغة، التسلسل، والجاهزية قبل التصدير."],
    ["التصدير", "نخرج PPTX وPDF ومشروع HTML يحافظ على الطبقات القابلة للتعديل."]
  ];
}

function arabicInvestorChrome(ctx, index, layout) {
  const t = ctx.theme;
  const section = arabicInvestorSectionLabel(layout, index);
  const brand = arabicBrandName(ctx);
  return [
    el("shape", 0, 0, W, H, { fill: t.bg, stroke: t.bg }),
    el("shape", 120, 68, 1680, 1, { fill: "#2A2A38", stroke: "#2A2A38" }),
    el("shape", 1538, 68, 262, 3, { fill: t.accent, stroke: t.accent }),
    arabicText(ctx, 1240, 28, 560, 30, brand, 20, t.ink, { bold: true, lineHeight: 1 }),
    latinText(ctx, 120, 30, 150, 26, `${String(index + 1).padStart(2, "0")} / ${String(ctx.count).padStart(2, "0")}`, 17, t.muted, { bold: true }),
    arabicInvestorBodyText(ctx, 1240, 86, 560, 28, section, 15, t.accent, { bold: true, lineHeight: 1 }),
    el("shape", 120, 1010, 1680, 1, { fill: "#2A2A38", stroke: "#2A2A38" }),
    arabicInvestorBodyText(ctx, 1120, 1026, 680, 26, "عرض عربي استثماري · قابل للتعديل والتصدير", 17, t.muted, { lineHeight: 1 }),
    latinText(ctx, 120, 1028, 380, 24, "DECKFORGE / INVESTOR DARK", 14, t.muted, { bold: true })
  ];
}

function arabicInvestorMetricText(ctx, x, y, w, h, value, size, fill, opts = {}) {
  return countArabicChars(value)
    ? arabicText(ctx, x, y, w, h, value, size, fill, opts)
    : latinText(ctx, x, y, w, h, value, size, fill, { ...opts, font: opts.font || latinFont(ctx) });
}

function arabicInvestorCard(ctx, x, y, w, h, eyebrow, title, detail, opts = {}) {
  const t = ctx.theme;
  const fill = opts.fill || "#12121A";
  const stroke = opts.stroke || "#2A2A38";
  const accent = opts.accent || t.accent;
  return [
    el("shape", x, y, w, h, { fill, stroke, radius: 8 }),
    el("shape", x + w - 4, y, 4, h, { fill: accent, stroke: accent }),
    arabicInvestorBodyText(ctx, x + 30, y + 28, w - 60, 26, eyebrow, 15, accent, { bold: true, lineHeight: 1 }),
    arabicText(ctx, x + 30, y + 70, w - 60, 68, title, opts.titleSize || 30, t.ink, { bold: true, lineHeight: 1.16 }),
    arabicInvestorBodyText(ctx, x + 30, y + 154, w - 60, h - 184, detail, opts.bodySize || 18, opts.muted || t.muted)
  ];
}

function arabicInvestorMiniStat(ctx, x, y, w, metric, label, opts = {}) {
  const t = ctx.theme;
  return [
    el("shape", x, y, w, 142, { fill: opts.fill || "#12121A", stroke: opts.stroke || "#2A2A38", radius: 8 }),
    arabicInvestorMetricText(ctx, x + 24, y + 24, w - 48, 48, metric, metricSize(metric, opts.metricSize || 42), opts.accent || t.accent, { bold: true, align: "right" }),
    arabicInvestorBodyText(ctx, x + 24, y + 82, w - 48, 42, label, opts.labelSize || 16, opts.muted || t.muted, { lineHeight: 1.32 })
  ];
}

function makeArabicInvestorSlide(layout, index, ctx) {
  const t = ctx.theme;
  const title = arabicInvestorTitle(ctx, layout, index);
  const file = `${String(index + 1).padStart(2, "0")}-${layout}.html`;
  const lead = arabicInvestorLead(ctx, layout);
  const metrics = arabicInvestorMetrics(ctx);
  let elements = arabicInvestorChrome(ctx, index, layout);

  if (layout === "cover") {
    const heroSize = title.length > 46 ? 60 : title.length > 26 ? 74 : 96;
    elements = [
      ...arabicInvestorChrome(ctx, index, layout),
      el("shape", 118, 150, 650, 730, { fill: "#12121A", stroke: "#2A2A38", radius: 8 }),
      el("shape", 170, 212, 420, 420, { fill: "#1A1A24", stroke: "#2A2A38", radius: 8 }),
      el("shape", 230, 285, 300, 34, { fill: t.accent, stroke: t.accent, radius: 8 }),
      el("shape", 230, 368, 410, 34, { fill: "#2A2A38", stroke: "#2A2A38", radius: 8 }),
      el("shape", 230, 452, 260, 34, { fill: t.accent2, stroke: t.accent2, radius: 8 }),
      el("shape", 172, 710, 540, 1, { fill: "#2A2A38", stroke: "#2A2A38" }),
      arabicInvestorBodyText(ctx, 172, 744, 540, 58, "هوية داكنة، إيقاع تحريري، وطبقات قابلة للتعديل في PPTX.", 22, t.muted),
      arabicInvestorBodyText(ctx, 990, 170, 790, 32, "عرض المستثمرين", 20, t.accent, { bold: true, lineHeight: 1 }),
      arabicText(ctx, 760, 242, 1020, 230, title, heroSize, t.ink, { bold: true, lineHeight: 1.04 }),
      arabicInvestorBodyText(ctx, 900, 510, 880, 96, lead, 27, t.muted),
      el("shape", 1518, 660, 262, 4, { fill: t.accent, stroke: t.accent }),
      latinText(ctx, 1080, 684, 700, 52, (ctx.brand?.name || "STARTUP").toUpperCase(), 42, t.ink, { bold: true, align: "right", font: latinFont(ctx) }),
      ...arabicInvestorMiniStat(ctx, 780, 804, 300, metrics[0]?.metric || "10x", metrics[0]?.label || "تسريع التحقق"),
      ...arabicInvestorMiniStat(ctx, 1120, 804, 300, metrics[1]?.metric || "30 يوم", metrics[1]?.label || "زمن تحقق واضح"),
      ...arabicInvestorMiniStat(ctx, 1460, 804, 300, metrics[2]?.metric || "3 محاور", metrics[2]?.label || "قصة استثمارية")
    ];
  } else if (layout === "vision") {
    elements.push(
      latinText(ctx, 125, 150, 400, 130, "01", 118, t.accent, { bold: true }),
      arabicText(ctx, 620, 166, 1160, 130, title, 66, t.ink, { bold: true, lineHeight: 1.08 }),
      arabicInvestorBodyText(ctx, 680, 332, 1100, 90, lead, 25, t.muted),
      el("shape", 340, 474, 1220, 240, { fill: "#12121A", stroke: "#2A2A38", radius: 8 }),
      arabicText(ctx, 420, 528, 1060, 92, "نحو منصة تجعل بناء التجارب أسرع من شرحها.", 42, t.ink, { bold: true, lineHeight: 1.18 }),
      arabicInvestorBodyText(ctx, 420, 650, 1060, 44, "الرؤية الاستثمارية تصبح أقوى عندما يرى المستثمر المنتج كحركة سوق لا كميزة منفصلة.", 20, t.muted),
      ...arabicInvestorCard(ctx, 124, 788, 500, 140, "WHY NOW", "الطلب يتسارع", "فرق أكثر تريد مخرجات فورية قابلة للمشاركة."),
      ...arabicInvestorCard(ctx, 710, 788, 500, 140, "WEDGE", "تجربة أولى", "ندخل من لحظة الحاجة ثم نتوسع إلى سير عمل كامل."),
      ...arabicInvestorCard(ctx, 1296, 788, 500, 140, "OUTCOME", "قرار أوضح", "القصة تربط الاستخدام المتكرر بالتمويل القادم.")
    );
  } else if (layout === "problem") {
    const cards = [
      ["الاحتكاك", "الفكرة لا تتحول بسرعة", "الفرق تقضي وقتًا طويلًا بين صياغة الفكرة وبناء شيء يمكن عرضه أو اختباره."],
      ["الجودة", "المخرجات العربية متذبذبة", "اللغة والاتجاه والتسلسل البصري غالبًا تحتاج تصحيحًا يدويًا قبل العرض."],
      ["الدليل", "صعوبة إقناع السوق", "بدون تجربة أولى واضحة، يبقى القرار مبنيًا على الوعد لا على سلوك المستخدم."]
    ];
    elements.push(
      arabicText(ctx, 620, 156, 1160, 120, title, 66, t.ink, { bold: true, lineHeight: 1.08 }),
      arabicInvestorBodyText(ctx, 760, 312, 1020, 82, lead, 24, t.muted)
    );
    cards.forEach((card, i) => {
      elements.push(...arabicInvestorCard(ctx, 140 + i * 585, 486, 500, 310, card[0], card[1], card[2], { titleSize: 34 }));
    });
    elements.push(
      el("shape", 140, 850, 1640, 1, { fill: "#2A2A38", stroke: "#2A2A38" }),
      arabicInvestorBodyText(ctx, 900, 880, 880, 46, "المشكلة الاستثمارية: كل يوم تأخير يقلل سرعة التعلم ويزيد تكلفة الوصول إلى دليل حقيقي.", 22, t.accent, { bold: true })
    );
  } else if (layout === "solution") {
    const cards = [
      ["المدخل", "Brief بسيط", "فكرة، جمهور، هدف، ونبرة في نقطة بداية واحدة."],
      ["المعالجة", "بنية ذكية", "تحويل الفكرة إلى قصة، مشاهد، بطاقات، ومؤشرات."],
      ["المخرج", "تجربة قابلة للتعديل", "HTML وPPTX وPDF مع طبقات نص وشكل واضحة."]
    ];
    elements.push(
      arabicText(ctx, 560, 150, 1220, 124, title, 64, t.ink, { bold: true, lineHeight: 1.08 }),
      arabicInvestorBodyText(ctx, 760, 310, 1020, 88, lead, 24, t.muted),
      el("shape", 134, 450, 760, 390, { fill: "#15151E", stroke: "#2A2A38", radius: 8 }),
      arabicText(ctx, 190, 520, 640, 90, "من نص خام إلى تجربة جاهزة للنقاش.", 42, t.ink, { bold: true, lineHeight: 1.18 }),
      arabicInvestorBodyText(ctx, 190, 650, 640, 74, "هذا هو الفرق بين مولد محتوى عام ومنصة إنتاج عروض وتجارب تتعامل مع اللغة العربية كمسار تصميم كامل.", 22, t.muted)
    );
    cards.forEach((card, i) => {
      elements.push(...arabicInvestorCard(ctx, 980, 448 + i * 132, 620, 104, card[0], card[1], card[2], { titleSize: 25, bodySize: 15 }));
    });
  } else if (["how-it-works", "product", "gtm", "business-model"].includes(layout)) {
    const steps = arabicInvestorProcess(ctx);
    elements.push(
      arabicText(ctx, 560, 146, 1220, 116, title, 64, t.ink, { bold: true, lineHeight: 1.08 }),
      arabicInvestorBodyText(ctx, 730, 294, 1050, 82, lead, 24, t.muted),
      el("shape", 250, 592, 1420, 2, { fill: t.accent, stroke: t.accent })
    );
    steps.forEach((step, i) => {
      const x = 155 + i * 430;
      elements.push(
        el("shape", x + 140, 548, 86, 86, { fill: i === 1 ? t.accent : "#12121A", stroke: i === 1 ? t.accent : "#2A2A38", radius: 8 }),
        latinText(ctx, x + 160, 572, 46, 34, String(i + 1).padStart(2, "0"), 26, i === 1 ? t.bg : t.accent, { bold: true, align: "center" }),
        ...arabicInvestorCard(ctx, x, 684, 360, 190, "STEP", step[0], step[1], { titleSize: 30, bodySize: 17 })
      );
    });
  } else if (["traction", "market", "financials"].includes(layout)) {
    elements.push(
      arabicText(ctx, 560, 142, 1220, 120, title, 64, t.ink, { bold: true, lineHeight: 1.08 }),
      arabicInvestorBodyText(ctx, 760, 300, 1020, 82, lead, 24, t.muted)
    );
    metrics.slice(0, 4).forEach((item, i) => {
      const x = i % 2 === 0 ? 150 : 965;
      const y = i < 2 ? 460 : 690;
      elements.push(...arabicInvestorMiniStat(ctx, x, y, 660, item.metric, item.label, { metricSize: 60, labelSize: 20 }));
    });
    elements.push(
      el("shape", 1560, 452, 42, 372, { fill: "#1A1A24", stroke: "#2A2A38", radius: 8 }),
      el("shape", 1620, 540, 42, 284, { fill: t.accent, stroke: t.accent, radius: 8 }),
      el("shape", 1680, 606, 42, 218, { fill: t.accent2, stroke: t.accent2, radius: 8 }),
      latinText(ctx, 1514, 850, 250, 28, "NOW / NEXT / SCALE", 16, t.muted, { bold: true, align: "center" })
    );
  } else if (layout === "team") {
    const teamCards = [
      ["المنتج", "رؤية تجربة", "صياغة تدفق يجعل القيمة مفهومة من أول استخدام."],
      ["الهندسة", "تنفيذ قابل للتوسع", "تحويل النماذج إلى منظومة موثوقة وقابلة للتكرار."],
      ["النمو", "تعلم من السوق", "قنوات دخول وتجارب تحقق تقيس الطلب الحقيقي."]
    ];
    elements.push(
      arabicText(ctx, 580, 148, 1200, 120, title, 64, t.ink, { bold: true, lineHeight: 1.08 }),
      arabicInvestorBodyText(ctx, 780, 306, 1000, 80, lead, 24, t.muted)
    );
    teamCards.forEach((card, i) => {
      const x = 140 + i * 585;
      elements.push(
        el("shape", x + 150, 430, 200, 200, { fill: "#1A1A24", stroke: "#2A2A38", radius: 8 }),
        el("shape", x + 205, 485, 90, 90, { fill: i === 1 ? t.accent : "#2A2A38", stroke: i === 1 ? t.accent : "#2A2A38", radius: 8 }),
        ...arabicInvestorCard(ctx, x, 678, 500, 190, card[0], card[1], card[2], { titleSize: 30 })
      );
    });
  } else if (["funding", "ask"].includes(layout)) {
    const askMetric = metrics[0]?.metric || "Seed";
    elements.push(
      arabicText(ctx, 560, 142, 1220, 120, title, 64, t.ink, { bold: true, lineHeight: 1.08 }),
      arabicInvestorBodyText(ctx, 760, 300, 1020, 82, lead, 24, t.muted),
      el("shape", 170, 430, 660, 390, { fill: t.accent, stroke: t.accent, radius: 8 }),
      arabicInvestorMetricText(ctx, 230, 500, 540, 88, askMetric, metricSize(askMetric, 78), t.bg, { bold: true, align: "right" }),
      arabicText(ctx, 230, 612, 540, 70, "الجولة المطلوبة", 38, t.bg, { bold: true, lineHeight: 1.12 }),
      arabicInvestorBodyText(ctx, 230, 710, 540, 54, "تُستخدم لتسريع المنتج، بناء قنوات النمو، وإثبات المرحلة التالية.", 22, "#21160D"),
      ...arabicInvestorCard(ctx, 930, 430, 700, 122, "01", "تطوير المنتج", "تحسين التجربة، جودة المخرجات، وسرعة التخصيص.", { titleSize: 30, bodySize: 17 }),
      ...arabicInvestorCard(ctx, 930, 588, 700, 122, "02", "النمو والتحقق", "تجارب دخول للسوق، قياس استخدام، وشراكات أولية.", { titleSize: 30, bodySize: 17 }),
      ...arabicInvestorCard(ctx, 930, 746, 700, 122, "03", "العمليات والموثوقية", "بنية تشغيل تسمح بالتوسع دون فقدان الجودة.", { titleSize: 30, bodySize: 17 })
    );
  } else if (layout === "closing") {
    elements = [
      ...arabicInvestorChrome(ctx, index, layout),
      el("shape", 132, 148, 1656, 760, { fill: "#12121A", stroke: "#2A2A38", radius: 8 }),
      el("shape", 1430, 148, 358, 760, { fill: t.accent, stroke: t.accent, radius: 8 }),
      arabicInvestorBodyText(ctx, 1180, 224, 520, 34, "الخطوة التالية", 21, t.bg, { bold: true, lineHeight: 1 }),
      arabicText(ctx, 460, 292, 820, 170, title, 70, t.ink, { bold: true, lineHeight: 1.08 }),
      arabicInvestorBodyText(ctx, 470, 508, 800, 96, lead, 28, t.muted),
      ...arabicInvestorMiniStat(ctx, 470, 692, 270, metrics[0]?.metric || "10x", "سرعة تحقق"),
      ...arabicInvestorMiniStat(ctx, 790, 692, 270, metrics[1]?.metric || "30 يوم", "إطار تجربة"),
      ...arabicInvestorMiniStat(ctx, 1110, 692, 270, metrics[2]?.metric || "3 محاور", "قصة قابلة للدفاع"),
      latinText(ctx, 1500, 486, 220, 44, "THANK YOU", 30, t.bg, { bold: true, align: "center" }),
      arabicText(ctx, 1490, 548, 240, 78, "لنحوّل الفكرة إلى تجربة.", 31, t.bg, { bold: true, align: "center", lineHeight: 1.18 })
    ];
  } else {
    elements.push(
      arabicText(ctx, 560, 154, 1220, 120, title, 64, t.ink, { bold: true, lineHeight: 1.08 }),
      arabicInvestorBodyText(ctx, 760, 310, 1020, 82, lead, 24, t.muted)
    );
    metrics.slice(0, 3).forEach((item, i) => {
      elements.push(...arabicInvestorCard(ctx, 150 + i * 585, 500, 500, 260, String(i + 1).padStart(2, "0"), item.metric, item.label, { titleSize: 40 }));
    });
  }

  return {
    id: `slide-${index + 1}`,
    filename: file,
    layout,
    title,
    brief: ctx.plan[index]?.brief || "",
    speakerNotes: ctx.plan[index]?.speakerNotes || "",
    qaFocus: ctx.plan[index]?.qaFocus || "Arabic investor RTL typography, dark editorial chrome, hierarchy, and export safety",
    elements
  };
}

function cinematicBodyText(ctx, x, y, w, h, value, size, fill, opts = {}) {
  return arabicText(ctx, x, y, w, h, value, size, fill, {
    ...opts,
    font: opts.font || ctx.theme.fontBody || "Tajawal",
    lineHeight: opts.lineHeight || 1.5
  });
}

function cinematicScriptText(ctx, x, y, w, h, value, size, fill, opts = {}) {
  return latinText(ctx, x, y, w, h, value, size, fill, {
    ...opts,
    font: opts.font || ctx.theme.fontScript || "Cormorant Garamond",
    lineHeight: opts.lineHeight || 1.15
  });
}

function cinematicSectionLabel(layout, index) {
  const labels = {
    cover: "دراسة حالة",
    origin: "البداية",
    timeline: "المحطات",
    scale: "التوسع",
    "financial-power": "القوة المالية",
    acquisitions: "الاستحواذات",
    transformation: "التحول",
    culture: "الثقافة",
    lessons: "الدروس",
    closing: "الخاتمة"
  };
  const english = {
    cover: "CASE STUDY",
    origin: "ORIGIN",
    timeline: "TIMELINE",
    scale: "SCALE",
    "financial-power": "FINANCE",
    acquisitions: "ACQUISITIONS",
    transformation: "TRANSFORMATION",
    culture: "CULTURE",
    lessons: "LESSONS",
    closing: "FINALE"
  };
  return `${String(index + 1).padStart(2, "0")} · ${labels[layout] || "القصة"} · ${english[layout] || "STORY"}`;
}

function cinematicTitle(ctx, layout, index) {
  const planned = ctx.plan?.[index]?.title;
  if (planned && !/Open the origin|Show decisive|Make scale|Translate success|Deepen the story/i.test(planned)) return planned;
  const titles = {
    cover: ctx.title,
    origin: "البداية التي غيّرت اتجاه الشبكة",
    timeline: "محطات صنعت التاريخ الرقمي",
    scale: "إمبراطورية من المستخدمين",
    "financial-power": "أرقام تعيد تعريف النجاح",
    acquisitions: "صفقات غيّرت قواعد اللعبة",
    transformation: "من منصة اجتماعية إلى رؤية ميتافيرس",
    culture: "ثقافة تحرك إمبراطورية",
    lessons: "دروس قابلة للتكرار",
    closing: "كل إمبراطورية بدأت بمشهد صغير"
  };
  return titles[layout] || labelFromLayout(layout);
}

function cinematicLead(ctx, layout) {
  const subject = ctx.title;
  const map = {
    cover: "رحلة عربية مصممة كفيلم قصير: مشهد افتتاحي، محطات فارقة، أرقام كبرى، ثم درس يبقى.",
    origin: "كل قصة نجاح تبدأ بلحظة ضيقة: غرفة، فكرة، وقرار صغير يفتح بابًا أكبر من أصحابه.",
    timeline: "التاريخ لا يتحرك بخط مستقيم؛ يتحرك عبر قرارات حاسمة تصنع منعطفات لا تعود كما كانت.",
    scale: "الأرقام هنا ليست زينة؛ هي طريقة لإدراك حجم الفكرة عندما تصبح جزءًا من حياة البشر اليومية.",
    "financial-power": "حين تتحول الشبكة إلى اقتصاد كامل، تصبح الإيرادات والهوامش لغة أخرى للقوة.",
    acquisitions: "الاستحواذات لا تشتري منتجات فقط؛ أحيانًا تشتري مستقبلًا قبل أن ينتبه إليه السوق.",
    transformation: "التحول الحقيقي يحدث عندما تعيد الشركة تعريف نفسها قبل أن يجبرها السوق على ذلك.",
    culture: "وراء كل منصة ضخمة نظام سلوك: سرعة، جرأة، تكرار، وقدرة على التعلم تحت الضغط.",
    lessons: "القيمة الكبرى في دراسة الحالة ليست الإعجاب بالقصة؛ بل استخراج قواعد يمكن تطبيقها.",
    closing: "في النهاية، تبقى القصة تذكيرًا بأن الأفكار الصغيرة تكبر عندما تجد إيقاعها ونظامها."
  };
  return map[layout] || `هذا الفصل يحول ${subject} إلى مشهد عربي بصري، أنيق، ومصمم للعرض بثقة.`;
}

function cinematicMetrics(ctx) {
  const supplied = (ctx.evidence || []).slice(0, 4).map((item) => ({
    metric: item.metric,
    label: item.label || item.raw || "إشارة داعمة"
  })).filter((item) => item.metric);
  if (supplied.length) return supplied;
  return [
    { metric: "3B+", label: "مستخدم شهريًا عبر المنصة أو المنظومة" },
    { metric: "22", label: "عامًا من التحول والتوسع المستمر" },
    { metric: "$1T+", label: "قيمة سوقية صنعتها شبكة عالمية" },
    { metric: "10", label: "محطات سردية في رحلة واحدة" }
  ];
}

function cinematicImagePanel(ctx, x, y, w, h, variant = "wide") {
  const t = ctx.theme;
  const elements = [
    el("imageBlock", x, y, w, h, { fill: variant === "warm" ? "#1A120B" : "#071018", stroke: "#211B14" }),
    el("shape", x, y, w, h, { fill: variant === "wide" ? "#0B0B0B" : "#111111", stroke: "#111111" }),
    el("shape", x + Math.round(w * 0.08), y + Math.round(h * 0.68), Math.round(w * 0.62), 3, { fill: t.accent, stroke: t.accent }),
    el("shape", x + Math.round(w * 0.16), y + Math.round(h * 0.2), Math.round(w * 0.42), Math.round(h * 0.08), { fill: "#2A2115", stroke: "#2A2115" }),
    el("shape", x + Math.round(w * 0.22), y + Math.round(h * 0.34), Math.round(w * 0.52), Math.round(h * 0.08), { fill: "#3A2A14", stroke: "#3A2A14" }),
    el("shape", x + Math.round(w * 0.28), y + Math.round(h * 0.48), Math.round(w * 0.34), Math.round(h * 0.08), { fill: t.accent, stroke: t.accent })
  ];
  return elements;
}

function cinematicChrome(ctx, index, layout) {
  const t = ctx.theme;
  return [
    el("shape", 0, 0, W, H, { fill: t.bg, stroke: t.bg }),
    el("shape", 120, 80, 1680, 1, { fill: "#2A2418", stroke: "#2A2418" }),
    el("shape", 1720, 80, 80, 2, { fill: t.accent, stroke: t.accent }),
    cinematicBodyText(ctx, 1050, 38, 750, 30, cinematicSectionLabel(layout, index), 18, t.accent, { bold: true, lineHeight: 1 }),
    latinText(ctx, 120, 40, 160, 28, `${String(index + 1).padStart(2, "0")} / ${String(ctx.count).padStart(2, "0")}`, 18, t.accent, { bold: true }),
    el("shape", 120, 980, 1680, 1, { fill: "#2A2418", stroke: "#2A2418" }),
    cinematicBodyText(ctx, 120, 1002, 520, 28, "قصة نجاح عربية · عرض سينمائي قابل للتصدير", 18, t.muted, { lineHeight: 1 }),
    cinematicBodyText(ctx, 1080, 1000, 720, 30, "سرد بصري عربي · قابل للتعديل والتصدير", 18, t.muted, { lineHeight: 1 })
  ];
}

function cinematicMetric(ctx, x, y, w, metric, label, opts = {}) {
  const t = ctx.theme;
  return [
    latinText(ctx, x, y, w, 74, metric, metricSize(metric, opts.size || 64), opts.accent || t.accent2, { bold: true, align: opts.align || "right" }),
    cinematicBodyText(ctx, x, y + 88, w, 52, label, opts.labelSize || 20, opts.muted || t.ink, { align: opts.align || "right", lineHeight: 1.35 })
  ];
}

function makeArabicCinematicSlide(layout, index, ctx) {
  const t = ctx.theme;
  const title = cinematicTitle(ctx, layout, index);
  const file = `${String(index + 1).padStart(2, "0")}-${layout}.html`;
  const lead = cinematicLead(ctx, layout);
  const metrics = cinematicMetrics(ctx);
  let elements = cinematicChrome(ctx, index, layout);

  if (layout === "cover") {
    elements = [
      ...cinematicImagePanel(ctx, 0, 0, W, H, "wide"),
      el("shape", 0, 0, 1180, H, { fill: "#0A0A0A", stroke: "#0A0A0A" }),
      el("shape", 0, 0, W, 120, { fill: "#0A0A0A", stroke: "#0A0A0A" }),
      el("shape", 120, 120, 80, 1, { fill: t.accent, stroke: t.accent }),
      cinematicScriptText(ctx, 220, 98, 360, 34, "A Case Study", 24, t.accent),
      cinematicBodyText(ctx, 220, 230, 760, 34, "دراسة حالة · ريادة الأعمال الرقمية", 22, t.accent, { bold: true, lineHeight: 1 }),
      arabicText(ctx, 120, 336, 880, 250, title, title.length > 38 ? 72 : 108, t.ink, { bold: true, lineHeight: 1.15 }),
      cinematicScriptText(ctx, 120, 626, 860, 62, "From a small room to a digital empire", 42, t.accent2),
      cinematicBodyText(ctx, 120, 720, 820, 86, lead, 27, "#C7BFAF"),
      el("shape", 120, 968, 1680, 1, { fill: "#3A2A14", stroke: "#3A2A14" }),
      cinematicBodyText(ctx, 120, 1000, 520, 26, "عرض تعليمي · ١٠ سلايدات", 17, t.muted, { lineHeight: 1 }),
      cinematicScriptText(ctx, 1510, 998, 290, 28, "MMXXVI · Vol. I", 22, t.accent)
    ];
  } else if (layout === "origin") {
    elements.push(
      ...cinematicImagePanel(ctx, 0, 0, 760, H, "warm"),
      el("shape", 760, 0, 1160, H, { fill: t.bg, stroke: t.bg }),
      arabicText(ctx, 890, 170, 850, 150, title, 74, t.ink, { bold: true, lineHeight: 1.1 }),
      cinematicBodyText(ctx, 930, 356, 810, 84, lead, 24, t.muted),
      el("shape", 930, 520, 620, 1, { fill: t.accent, stroke: t.accent }),
      arabicText(ctx, 930, 568, 690, 116, "الفكرة الأولى لا تحتاج جمهورًا ضخمًا؛ تحتاج مشكلة واضحة وشجاعة كافية للبدء.", 38, t.ink, { bold: true, lineHeight: 1.35 }),
      cinematicMetric(ctx, 930, 780, 250, "2004", "بداية القصة", { size: 58 }),
      cinematicMetric(ctx, 1230, 780, 260, "1", "غرفة جامعية", { size: 58 }),
      cinematicMetric(ctx, 1530, 780, 230, "0", "خطة مضمونة", { size: 58 })
    );
  } else if (layout === "timeline") {
    const years = ["2004", "2008", "2012", "2017", "2021"];
    const labels = ["التأسيس", "١٠٠ مليون", "الاكتتاب", "٢ مليار", "Meta"];
    elements.push(
      latinText(ctx, 120, 130, 260, 140, "02", 130, "#18130C", { bold: true }),
      arabicText(ctx, 690, 158, 1110, 118, title, 70, t.ink, { bold: true, lineHeight: 1.08 }),
      cinematicScriptText(ctx, 1040, 306, 760, 42, "Two decades that redefined connection", 30, t.muted, { align: "right" }),
      el("shape", 180, 640, 1560, 2, { fill: t.accent, stroke: t.accent })
    );
    years.forEach((year, i) => {
      const x = 220 + i * 340;
      elements.push(
        el("shape", x, 626, 28, 28, { fill: i === years.length - 1 ? t.accent2 : t.accent, stroke: t.accent, radius: 14 }),
        latinText(ctx, x - 66, i % 2 ? 706 : 480, 160, 70, year, 58, t.accent, { bold: true, align: "center" }),
        cinematicBodyText(ctx, x - 90, i % 2 ? 780 : 552, 210, 56, labels[i], 22, t.ink, { align: "center", bold: true })
      );
    });
  } else if (layout === "scale") {
    elements = [
      ...cinematicImagePanel(ctx, 0, 0, W, H, "wide"),
      el("shape", 0, 0, W, H, { fill: "#050505", stroke: "#050505" }),
      ...cinematicChrome(ctx, index, layout),
      arabicText(ctx, 600, 142, 1200, 110, title, 74, t.ink, { bold: true, lineHeight: 1.08 }),
      cinematicScriptText(ctx, 780, 284, 840, 42, "One story becomes planetary when usage becomes ritual", 28, t.muted, { align: "center" }),
      latinText(ctx, 410, 352, 1100, 260, metrics[0]?.metric || "3B+", 220, t.accent2, { bold: true, align: "center" }),
      cinematicBodyText(ctx, 500, 608, 920, 60, metrics[0]?.label || "مستخدم شهريًا", 34, t.ink, { align: "center", bold: true }),
      ...cinematicMetric(ctx, 330, 792, 300, metrics[1]?.metric || "22", metrics[1]?.label || "عامًا", { align: "center" }),
      ...cinematicMetric(ctx, 810, 792, 300, metrics[2]?.metric || "$1T+", metrics[2]?.label || "قيمة", { align: "center" }),
      ...cinematicMetric(ctx, 1290, 792, 300, metrics[3]?.metric || "10", metrics[3]?.label || "محطات", { align: "center" })
    ];
  } else if (layout === "financial-power") {
    elements.push(
      ...cinematicImagePanel(ctx, 1200, 0, 720, H, "warm"),
      arabicText(ctx, 120, 160, 880, 130, title, 70, t.ink, { bold: true, lineHeight: 1.1 }),
      cinematicScriptText(ctx, 120, 322, 680, 40, "The financial anatomy of a digital superpower", 28, t.muted),
      el("shape", 120, 406, 80, 2, { fill: t.accent, stroke: t.accent }),
      ...cinematicMetric(ctx, 120, 456, 680, metrics[2]?.metric || "$164.5B", "إيرادات سنوية كبرى", { size: 118 }),
      ...cinematicMetric(ctx, 120, 700, 310, metrics[0]?.metric || "$62B", "صافي ربح", { size: 66 }),
      ...cinematicMetric(ctx, 510, 700, 330, metrics[1]?.metric || "$1T+", "قيمة سوقية", { size: 66 }),
      cinematicBodyText(ctx, 120, 910, 850, 52, "عندما يصبح المنتج عادة يومية، تتحول العلاقة مع المستخدم إلى قوة مالية يصعب تكرارها.", 24, t.accent2)
    );
  } else if (layout === "acquisitions") {
    const cards = [
      ["2012", "Instagram", "$1B", "شراء شبكة الصور قبل أن تتحول إلى لغة جيل كامل."],
      ["2014", "WhatsApp", "$19B", "امتلاك طبقة المراسلة التي تربط الأسواق والعائلات."],
      ["2014", "Oculus", "$2B", "رهان مبكر على مستقبل الوجود الرقمي والتجارب الغامرة."]
    ];
    elements.push(
      arabicText(ctx, 570, 142, 1230, 118, title, 70, t.ink, { bold: true, lineHeight: 1.08 }),
      cinematicScriptText(ctx, 900, 292, 900, 42, "Strategic moves that widened the empire", 28, t.muted, { align: "right" })
    );
    cards.forEach((card, i) => {
      const x = 120 + i * 570;
      elements.push(
        el("shape", x, 410, 520, 500, { fill: i === 1 ? "#17130D" : "#101010", stroke: i === 1 ? t.accent : "#2A2418", radius: 4 }),
        latinText(ctx, x + 42, 456, 420, 32, card[0], 24, i === 1 ? t.accent2 : t.accent, { bold: true }),
        el("shape", x + 42, 502, 52, 1, { fill: t.accent, stroke: t.accent }),
        latinText(ctx, x + 42, 544, 420, 72, card[1], 54, t.ink, { bold: true }),
        latinText(ctx, x + 42, 642, 420, 86, card[2], 78, t.accent2, { bold: true }),
        cinematicBodyText(ctx, x + 42, 760, 420, 82, card[3], 21, "#C7BFAF")
      );
    });
  } else if (layout === "transformation") {
    elements.push(
      arabicText(ctx, 560, 142, 1240, 116, title, 68, t.ink, { bold: true, lineHeight: 1.1 }),
      cinematicBodyText(ctx, 860, 292, 940, 70, lead, 23, t.muted),
      ...cinematicImagePanel(ctx, 120, 430, 760, 410, "wide"),
      ...cinematicImagePanel(ctx, 1040, 430, 760, 410, "warm"),
      latinText(ctx, 190, 470, 310, 44, "FACEBOOK", 34, t.accent, { bold: true }),
      arabicText(ctx, 190, 690, 540, 78, "منصة اجتماعية", 42, t.ink, { bold: true }),
      latinText(ctx, 1110, 470, 240, 44, "META", 34, t.accent2, { bold: true }),
      arabicText(ctx, 1110, 690, 540, 78, "رؤية للعالم الغامر", 42, t.ink, { bold: true }),
      el("shape", 920, 616, 80, 2, { fill: t.accent, stroke: t.accent }),
      latinText(ctx, 912, 560, 100, 44, "TO", 28, t.muted, { align: "center", bold: true })
    );
  } else if (layout === "culture") {
    const values = [
      ["— I —", "التحرّك السريع", "Move Fast", "تجريب سريع، تعلم أسرع، وقرارات لا تنتظر الكمال."],
      ["— II —", "الجرأة", "Be Bold", "رهانات كبيرة قبل أن تصبح بديهية في السوق."],
      ["— III —", "الأثر", "Impact", "تركيز على ما يغير السلوك لا ما يملأ الشرائح."],
      ["— IV —", "الانفتاح", "Be Open", "ثقافة مشاركة تجعل التعلم مؤسسيًا لا فرديًا."]
    ];
    elements.push(
      latinText(ctx, 120, 86, 180, 160, "\"", 160, "#18130C", { bold: true }),
      arabicText(ctx, 560, 142, 1240, 116, title, 68, t.ink, { bold: true, lineHeight: 1.1 }),
      cinematicScriptText(ctx, 870, 292, 930, 42, "The operating code behind repeated invention", 28, t.muted, { align: "right" })
    );
    values.forEach((item, i) => {
      const x = i % 2 === 0 ? 160 : 1010;
      const y = i < 2 ? 420 : 690;
      elements.push(
        cinematicScriptText(ctx, x, y, 130, 28, item[0], 24, t.accent),
        arabicText(ctx, x, y + 42, 640, 58, item[1], 42, t.ink, { bold: true }),
        latinText(ctx, x, y + 106, 260, 32, item[2], 24, t.accent, { bold: true }),
        cinematicBodyText(ctx, x, y + 150, 620, 58, item[3], 20, "#C7BFAF")
      );
    });
  } else if (layout === "lessons") {
    const lessons = [
      ["01", "ابدأ من احتياج ضيق", "أقوى القصص لا تبدأ بعالم كامل؛ تبدأ بمستخدم واضح."],
      ["02", "حوّل النمو إلى نظام", "النمو العابر لا يكفي؛ يجب أن يصبح التكرار جزءًا من المنتج."],
      ["03", "اشترِ المستقبل مبكرًا", "الاستحواذ الذكي يختصر الزمن عندما تكون الرؤية دقيقة."],
      ["04", "أعد تعريف نفسك", "الشركات التي تبقى تتغير قبل أن تفقد حقها في التغيير."]
    ];
    elements.push(
      arabicText(ctx, 560, 140, 1240, 116, title, 70, t.ink, { bold: true, lineHeight: 1.08 }),
      cinematicBodyText(ctx, 820, 292, 980, 64, lead, 23, t.muted)
    );
    lessons.forEach((item, i) => {
      const y = 420 + i * 128;
      elements.push(
        latinText(ctx, 1340, y, 110, 54, item[0], 46, t.accent, { bold: true, align: "center" }),
        el("shape", 1260, y + 66, 500, 1, { fill: "#2A2418", stroke: "#2A2418" }),
        arabicText(ctx, 560, y, 680, 52, item[1], 38, t.ink, { bold: true }),
        cinematicBodyText(ctx, 350, y + 58, 890, 46, item[2], 20, "#C7BFAF")
      );
    });
  } else if (layout === "closing") {
    elements = [
      ...cinematicImagePanel(ctx, 0, 0, W, H, "wide"),
      el("shape", 0, 0, W, H, { fill: "#050505", stroke: "#050505" }),
      el("shape", 860, 190, 200, 1, { fill: t.accent, stroke: t.accent }),
      cinematicScriptText(ctx, 810, 218, 300, 36, "FINALE", 28, t.accent, { align: "center" }),
      el("shape", 860, 272, 200, 1, { fill: t.accent, stroke: t.accent }),
      latinText(ctx, 700, 318, 520, 130, "\"", 132, "#21180D", { bold: true, align: "center" }),
      arabicText(ctx, 420, 450, 1080, 160, title, 64, t.ink, { bold: true, align: "center", lineHeight: 1.32 }),
      cinematicScriptText(ctx, 500, 650, 920, 54, "The lesson is not the size of the empire, but the discipline of the first move.", 30, t.accent2, { align: "center" }),
      ...cinematicMetric(ctx, 540, 790, 220, metrics[1]?.metric || "22", "عامًا", { align: "center", size: 46 }),
      ...cinematicMetric(ctx, 850, 790, 260, metrics[0]?.metric || "3B+", "مستخدم", { align: "center", size: 46 }),
      ...cinematicMetric(ctx, 1200, 790, 260, metrics[2]?.metric || "$1T+", "قيمة", { align: "center", size: 46 }),
      cinematicBodyText(ctx, 120, 1000, 360, 28, "شكراً لكم", 18, t.muted, { lineHeight: 1 }),
      cinematicScriptText(ctx, 1490, 998, 310, 28, `${String(index + 1).padStart(2, "0")} / ${String(ctx.count).padStart(2, "0")} · Fin.`, 20, t.accent, { align: "right" })
    ];
  } else {
    elements.push(
      arabicText(ctx, 560, 150, 1240, 116, title, 70, t.ink, { bold: true, lineHeight: 1.08 }),
      cinematicBodyText(ctx, 820, 300, 980, 76, lead, 24, t.muted),
      ...cinematicImagePanel(ctx, 120, 438, 700, 420, "wide"),
      ...cinematicMetric(ctx, 990, 520, 560, metrics[0]?.metric || "3B+", metrics[0]?.label || "إشارة كبرى")
    );
  }

  return {
    id: `slide-${index + 1}`,
    filename: file,
    layout,
    title,
    brief: ctx.plan[index]?.brief || "",
    speakerNotes: ctx.plan[index]?.speakerNotes || "",
    qaFocus: ctx.plan[index]?.qaFocus || "Arabic cinematic RTL storytelling, image rhythm, gold editorial hierarchy, and export safety",
    elements
  };
}

function arabicSectionLabel(layout, index) {
  const labels = {
    cover: "البداية",
    agenda: "المسار",
    why: "السياق",
    problem: "المشكلة",
    "client-context": "سياق الجمهور",
    "buyer-pain": "الألم",
    solution: "الحل",
    "proposed-solution": "التوصية",
    product: "التجربة",
    market: "السوق",
    benefits: "القيمة",
    pillars: "المحاور",
    differentiators: "التميّز",
    proof: "الإثبات",
    scope: "النطاق",
    metrics: "المؤشرات",
    traction: "التحقق",
    "business-model": "نموذج القيمة",
    gtm: "النمو",
    roadmap: "الخطة",
    implementation: "التنفيذ",
    "rollout-plan": "الإطلاق",
    financials: "الأرقام",
    "commercial-case": "الجدوى",
    "learning-outcomes": "المخرجات",
    "learner-context": "المتعلمون",
    "core-concepts": "المفاهيم",
    "practice-loop": "التطبيق",
    "example-walkthrough": "المثال",
    checklist: "القائمة",
    assessment: "التقييم",
    ask: "الطلب",
    "next-steps": "القرار",
    closing: "الخاتمة"
  };
  const chapters = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"];
  return `الفصل ${chapters[Math.max(0, Math.min(index, chapters.length - 1))]} · ${labels[layout] || "العرض"}`;
}

function arabicBrandName(ctx) {
  return ctx.brand?.name || ctx.title || "DeckForge";
}

function arabicObjective(ctx) {
  const objective = ctx.brand?.objective || "";
  const map = {
    "Executive decision": "قرار تنفيذي واضح",
    "Raise investment": "رفع جولة استثمارية",
    "Win a client": "إقناع عميل جديد",
    "Train a team": "تدريب فريق بكفاءة",
    "Launch a product": "إطلاق منتج بثقة"
  };
  return map[objective] || objective || "عرض احترافي قابل للتعديل";
}

function arabicChrome(ctx, index, layout, opts = {}) {
  const t = ctx.theme;
  const dark = !!opts.dark;
  const bg = dark ? t.bg : t.paper;
  const ink = dark ? t.white : t.ink;
  const muted = dark ? "#CBD5E1" : "#94A3B8";
  const elements = [
    el("shape", 0, 0, W, H, { fill: bg, stroke: bg }),
    el("shape", 0, 0, W, 80, { fill: bg, stroke: dark ? t.bg : "#E5E7EB" })
  ];
  if (!dark) {
    elements.push(el("shape", 0, 79, W, 1, { fill: "#E5E7EB", stroke: "#E5E7EB" }));
  }
  elements.push(arabicText(ctx, 120, 42, 430, 34, `${arabicBrandName(ctx)}.`, 26, ink, { bold: true }));
  elements.push(latinText(ctx, 1700, 42, 130, 28, `${String(index + 1).padStart(2, "0")} / ${String(ctx.count).padStart(2, "0")}`, 18, muted, { bold: true, align: "left" }));
  if (!opts.noKicker) {
    elements.push(el("shape", 120, 154, 48, 2, { fill: t.accent, stroke: t.accent }));
    elements.push(arabicText(ctx, 190, 138, 760, 42, arabicSectionLabel(layout, index), 20, dark ? t.accent : t.ink, { lineHeight: 1.1 }));
  }
  return elements;
}

function arabicFooterBand(ctx, label, detail, dark = false) {
  const t = ctx.theme;
  const bg = dark ? t.bg : "#F8FAFC";
  const main = dark ? t.white : t.ink;
  const muted = dark ? "#CBD5E1" : t.muted;
  return [
    el("shape", 0, 970, W, 110, { fill: bg, stroke: bg }),
    el("shape", 120, 970, 4, 110, { fill: t.accent, stroke: t.accent }),
    arabicText(ctx, 160, 994, 520, 24, label, 15, t.accent, { lineHeight: 1.05 }),
    arabicText(ctx, 160, 1026, 680, 34, detail, 22, main, { bold: true, lineHeight: 1.1 }),
    arabicText(ctx, 1030, 1006, 790, 50, "تصميم عربي تنفيذي · قابل للتعديل والتصدير", 20, muted, { lineHeight: 1.35 })
  ];
}

function arabicSlideTitle(ctx, layout, index) {
  const planned = ctx.plan?.[index]?.title;
  if (planned) return planned;
  const titles = {
    cover: ctx.title,
    agenda: "خريطة العرض",
    why: "لماذا هذا مهم الآن؟",
    problem: "المشكلة التي تستحق الحل",
    solution: "من الفكرة إلى التنفيذ بثقة",
    market: "فرصة واضحة لجمهور واسع",
    product: "تجربة منتج مصممة للعمل",
    "client-context": "سياق الجمهور والقرار",
    "buyer-pain": "الألم الذي نحلّه",
    "proposed-solution": "الحل المقترح",
    benefits: "قيمة عملية قابلة للقياس",
    metrics: "مؤشرات تجعل القرار أوضح",
    pillars: "نظام متماسك لا مجرد شرائح",
    "business-model": "نموذج القيمة والعائد",
    traction: "إشارات تحقق مبكرة",
    gtm: "مسار الوصول إلى السوق",
    financials: "الأرقام التي تدعم القرار",
    roadmap: "خطة طريق واضحة وقابلة للتنفيذ",
    proof: "إثبات يقلل المخاطر",
    scope: "نطاق العمل بوضوح",
    implementation: "خطة تنفيذ تقلل المخاطر",
    differentiators: "ما الذي يجعل هذا النهج أقوى؟",
    "commercial-case": "الجدوى التجارية باختصار",
    "learning-outcomes": "نتائج التعلم المتوقعة",
    "learner-context": "سياق المتعلمين",
    "core-concepts": "المفاهيم الأساسية",
    "practice-loop": "حلقة التدريب والتطبيق",
    "example-walkthrough": "مثال تطبيقي واضح",
    checklist: "قائمة تنفيذ سريعة",
    assessment: "قياس الإتقان",
    "rollout-plan": "خطة الإطلاق والتبني",
    "next-steps": "القرار التالي",
    ask: "الطلب واضح",
    closing: "رحلتك تبدأ بخطوة واحدة"
  };
  return titles[layout] || labelFromLayout(layout);
}

function arabicLead(ctx, layout) {
  const topic = ctx.title;
  const map = {
    cover: ctx.subtitle,
    problem: "الجمهور لا يحتاج مزيدًا من النصوص؛ يحتاج بنية تقود الانتباه من المشكلة إلى القرار.",
    "buyer-pain": "سمِّ الاحتكاك بوضوح، ثم اربطه بتكلفة أو فرصة يستطيع الجمهور رؤيتها فورًا.",
    "client-context": "ابدأ من واقع الجمهور: ما الذي يحاول إنجازه، وما الذي يمنعه، وما القرار المطلوب منه؟",
    why: "القيمة تظهر عندما يتحول الموضوع إلى قصة واضحة، مرقمة، وقابلة للعرض أمام أصحاب القرار.",
    solution: "نحوّل المدخلات الخام إلى هيكل عرض، تسلسل بصري، ونبرة عربية سليمة تصلح للعرض مباشرة.",
    "proposed-solution": "قدّم التوصية كمسار عمل لا كقائمة مزايا، واجعل النتيجة النهائية سهلة التخيل.",
    product: "التجربة تربط بين الفكرة، الجمهور، ونوع العرض ثم تنتج شرائح قابلة للتعديل والتصدير.",
    market: "الجمهور العربي واسع، متنوع، ويحتاج أدوات ذكاء اصطناعي تفهم اتجاه النص وثقافة العرض.",
    benefits: "كل شريحة يجب أن تخدم رسالة واحدة بوضوح، مع مساحة بيضاء كافية وإشارة بصرية دقيقة.",
    pillars: "النظام الأفضل يجمع بين القصة، التصميم، الأدلة، والتصدير في مسار واحد.",
    differentiators: "التميّز يظهر في التفاصيل: لغة سليمة، إيقاع بصري، وملفات قابلة للتعديل لا صور جامدة.",
    proof: "الإثبات الجيد يختصر الاعتراضات ويجعل القرار أسهل على الجمهور.",
    scope: "النطاق الواضح يحمي جودة التنفيذ ويمنع تشتت الرسالة بين تفاصيل غير ضرورية.",
    implementation: "خطة التنفيذ الجيدة تشرح المراحل، المسؤوليات، والاعتماد المطلوب من كل طرف.",
    roadmap: "التميز لا يأتي من القالب فقط؛ يأتي من خطوات إنتاج قابلة للتكرار والتحسين.",
    metrics: "الأرقام تمنح العرض ثقلًا، خصوصًا عندما تظهر داخل بطاقات واضحة لا تزاحم العنوان.",
    traction: "إشارات التحقق تمنح القصة مصداقية وتظهر أن الفرضية قابلة للنمو.",
    financials: "القرار يصبح أسهل عندما تظهر العلاقة بين الاستثمار، العائد، والمخاطر بوضوح.",
    "commercial-case": "اربط الاستثمار بالعائد، والجهد بالنتيجة، والقرار بخطوة عملية قريبة.",
    closing: ctx.bank.closing
  };
  return map[layout] || `هذا القسم يحول ${topic} إلى رسالة عملية، أنيقة، ومفهومة بسرعة.`;
}

function arabicMetrics(ctx) {
  const supplied = (ctx.evidence || []).slice(0, 3).map((item) => ({
    metric: item.metric,
    label: item.label || item.raw || "دليل داعم"
  })).filter((item) => item.metric);
  if (supplied.length) return supplied;
  return [
    { metric: "5h", label: "وقت يمكن اختصاره عند تحويل الفكرة إلى شرائح جاهزة" },
    { metric: "400M+", label: "ناطق بالعربية يحتاجون تجربة عرض تفهم لغتهم" },
    { metric: "73%", label: "فرصة لتحسين جودة المخرجات العربية واتجاه النص" }
  ];
}

function arabicProcessSteps(ctx) {
  const slidePrompt = /شرائح|عرض|عروض|ppt|powerpoint|presentation/i.test(ctx.prompt);
  if (slidePrompt) {
    return [
      ["اكتب الفكرة", "أدخل موضوع العرض بجملة أو فقرة قصيرة، بالعربية أو الإنجليزية."],
      ["اختر الفئة", "حدد الجمهور والنبرة حتى يأخذ التصميم سياقه الصحيح."],
      ["توليد ذكي", "نبني الهيكل، النصوص، الرسوم، والتسلسل البصري تلقائيًا."],
      ["حمّل وقدّم", "صدّر PPTX أو PDF قابلًا للتعديل، وابدأ العرض بثقة."]
    ];
  }
  return (ctx.bank.pillars || []).slice(0, 4).map((item, index) => [
    item,
    ["حدد الهدف بوضوح قبل بناء الرسالة.", "حوّل الفكرة إلى قرار أو سلوك قابل للتنفيذ.", "استخدم الأدلة لإزالة الغموض.", "اختم بخطوة عملية سهلة."][index]
  ]);
}

function arabicSegmentCards(ctx) {
  const base = [...(ctx.bank.benefits || []), ...(ctx.bank.pillars || []), ...(ctx.bank.agenda || [])]
    .filter(Boolean)
    .slice(0, 4);
  while (base.length < 4) base.push(["الجمهور", "القيمة", "الدليل", "القرار"][base.length]);
  return base.map((title, index) => ({
    title,
    eyebrow: [`01 / AUDIENCE`, `02 / VALUE`, `03 / PROOF`, `04 / DECISION`][index],
    detail: [
      "حدد من سيستفيد من العرض وما الذي يحتاجه ليقتنع.",
      "اربط الميزة بنتيجة عملية أو تجارية واضحة.",
      "ادعم الرسالة بإشارة رقمية أو مثال قابل للتصديق.",
      "اجعل الخطوة التالية بسيطة ومحددة زمنيًا."
    ][index]
  }));
}

function makeArabicLuxeSlide(layout, index, ctx) {
  const t = ctx.theme;
  const title = arabicSlideTitle(ctx, layout, index);
  const file = `${String(index + 1).padStart(2, "0")}-${layout}.html`;
  let elements = [];

  if (layout === "cover") {
    const heroSize = title.length <= 8 ? 166 : title.length <= 22 ? 112 : 80;
    elements = [
      el("shape", 0, 0, W, H, { fill: t.paper, stroke: t.paper }),
      el("shape", 1320, 0, 600, 520, { fill: t.bg, stroke: t.bg }),
      el("shape", 1290, 0, 4, 520, { fill: t.accent, stroke: t.accent }),
      el("shape", 1780, 60, 56, 56, { fill: t.bg, stroke: t.accent }),
      el("shape", 120, 132, 48, 2, { fill: t.accent, stroke: t.accent }),
      arabicText(ctx, 190, 114, 620, 42, "منصة عربية · رؤية عالمية", 22, t.ink, { lineHeight: 1.05 }),
      arabicText(ctx, 120, 270, 1180, 260, title, heroSize, t.ink, { bold: true, lineHeight: 1.02 }),
      latinText(ctx, 124, 550, 850, 78, (ctx.brand?.name || "DECKFORGE").toUpperCase(), 58, t.ink, { bold: true, align: "left", lineHeight: 1 }),
      el("shape", 120, 680, 120, 3, { fill: t.ink, stroke: t.ink }),
      arabicText(ctx, 120, 720, 1380, 132, ctx.subtitle, 42, "#334155", { lineHeight: 1.45 }),
      latinText(ctx, 1820, 75, 60, 34, String(index + 1).padStart(2, "0"), 26, t.white, { bold: true, align: "center" }),
      latinText(ctx, 120, 940, 460, 26, "BUILT WITH DECKFORGE", 16, "#94A3B8", { bold: true, align: "left" }),
      arabicText(ctx, 120, 978, 760, 34, [ctx.brand?.audience, arabicObjective(ctx)].filter(Boolean).join(" · ") || "عرض احترافي قابل للتعديل", 22, t.ink, { bold: true }),
      latinText(ctx, 1560, 940, 280, 26, `EST. ${new Date().getFullYear()}`, 16, "#94A3B8", { bold: true, align: "right" }),
      arabicText(ctx, 1500, 978, 340, 34, "عمّان · الأردن", 22, t.ink, { bold: true })
    ];
  } else if (["problem", "why", "buyer-pain", "client-context"].includes(layout)) {
    const metrics = arabicMetrics(ctx);
    elements = arabicChrome(ctx, index, layout);
    elements.push(arabicText(ctx, 120, 218, 1180, 300, title, title.length > 44 ? 58 : 76, t.ink, { bold: true, lineHeight: 1.22 }));
    elements.push(arabicText(ctx, 120, 610, 920, 116, arabicLead(ctx, layout), 26, t.muted, { lineHeight: 1.65 }));
    metrics.slice(0, 3).forEach((item, i) => {
      const y = 200 + i * 240;
      const dark = i === 0;
      elements.push(el("shape", 1360, y, 440, 210, { fill: dark ? t.bg : "#F8FAFC", stroke: dark ? t.bg : "#E2E8F0" }));
      elements.push(el("shape", 1360, y, 6, 210, { fill: dark ? t.accent : t.bg, stroke: dark ? t.accent : t.bg }));
      elements.push(latinText(ctx, 1400, y + 30, 380, 92, item.metric, metricSize(item.metric, 92), dark ? t.white : t.ink, { bold: true }));
      elements.push(arabicText(ctx, 1400, y + 130, 380, 58, item.label, 21, dark ? "#CBD5E1" : t.muted, { lineHeight: 1.36 }));
    });
    elements.push(...arabicFooterBand(ctx, "رؤيتنا · OUR VISION", "نصنع الشريحة التي تستحق رسالتك.", true));
  } else if (["solution", "product", "agenda", "proposed-solution"].includes(layout)) {
    const steps = arabicProcessSteps(ctx);
    elements = arabicChrome(ctx, index, layout);
    elements.push(arabicText(ctx, 120, 196, 1660, 130, title, title.length > 48 ? 54 : 70, t.ink, { bold: true, lineHeight: 1.15 }));
    elements.push(arabicText(ctx, 120, 360, 1380, 82, arabicLead(ctx, layout), 24, t.muted, { lineHeight: 1.58 }));
    steps.slice(0, 4).forEach(([stepTitle, detail], i) => {
      const x = 120 + i * 420;
      const dark = i === 3;
      elements.push(el("shape", x, 520, 400, 400, { fill: dark ? t.bg : "#F8FAFC", stroke: dark ? t.bg : "#E2E8F0" }));
      elements.push(el("shape", x, 520, 400, 6, { fill: t.accent, stroke: t.accent }));
      elements.push(latinText(ctx, x + 30, 558, 340, 78, String(i + 1).padStart(2, "0"), 70, dark ? t.accent : t.ink, { bold: true }));
      elements.push(arabicText(ctx, x + 30, 662, 340, 58, stepTitle, 32, dark ? t.white : t.ink, { bold: true, lineHeight: 1.2 }));
      elements.push(arabicText(ctx, x + 30, 750, 340, 116, detail, 19, dark ? "#CBD5E1" : t.muted, { lineHeight: 1.6 }));
    });
    elements.push(...arabicFooterBand(ctx, "دعم كامل", "للغة العربية واتجاه النص وعلامات الترقيم", false));
  } else if (["market", "benefits", "pillars", "differentiators", "proof", "scope"].includes(layout)) {
    const cards = arabicSegmentCards(ctx);
    elements = arabicChrome(ctx, index, layout);
    elements.push(arabicText(ctx, 120, 196, 1660, 120, title, title.length > 48 ? 54 : 70, t.ink, { bold: true, lineHeight: 1.15 }));
    elements.push(arabicText(ctx, 120, 340, 1260, 76, arabicLead(ctx, layout), 24, t.muted, { lineHeight: 1.55 }));
    cards.forEach((card, i) => {
      const x = i % 2 === 0 ? 120 : 980;
      const y = i < 2 ? 460 : 710;
      const dark = i === 0;
      elements.push(el("shape", x, y, i % 2 === 0 ? 840 : 820, 230, { fill: dark ? t.bg : "#F8FAFC", stroke: dark ? t.bg : "#E2E8F0" }));
      elements.push(el("shape", x, y, 6, 230, { fill: dark ? t.accent : t.bg, stroke: dark ? t.accent : t.bg }));
      elements.push(latinText(ctx, x + 34, y + 34, 360, 30, card.eyebrow, 22, dark ? t.accent : t.bg, { bold: true }));
      elements.push(arabicText(ctx, x + 34, y + 82, 720, 52, card.title, 40, dark ? t.white : t.ink, { bold: true, lineHeight: 1.15 }));
      elements.push(arabicText(ctx, x + 34, y + 150, 720, 58, card.detail, 18, dark ? "#CBD5E1" : t.muted, { lineHeight: 1.5 }));
    });
    elements.push(...arabicFooterBand(ctx, "حجم الفرصة · TAM", "كل جمهور يحتاج نسخة واضحة من الرسالة نفسها.", true));
  } else if (["roadmap", "implementation", "gtm", "rollout-plan"].includes(layout)) {
    const steps = ["البداية", "النموذج", "الإطلاق", "التحسين", "التوسع"];
    elements = arabicChrome(ctx, index, layout);
    elements.push(arabicText(ctx, 120, 196, 1660, 120, title, title.length > 48 ? 54 : 70, t.ink, { bold: true, lineHeight: 1.15 }));
    elements.push(arabicText(ctx, 120, 340, 1260, 78, arabicLead(ctx, layout), 24, t.muted, { lineHeight: 1.55 }));
    elements.push(el("shape", 210, 610, 1500, 6, { fill: t.accent, stroke: t.accent }));
    steps.forEach((step, i) => {
      const x = 190 + i * 360;
      const dark = i === 2;
      elements.push(el("shape", x, 548, 118, 118, { fill: dark ? t.bg : t.paper, stroke: t.accent, radius: 59 }));
      elements.push(latinText(ctx, x + 22, 580, 74, 46, String(i + 1).padStart(2, "0"), 32, dark ? t.white : t.accent, { bold: true, align: "center" }));
      elements.push(arabicText(ctx, x - 60, 700, 238, 48, step, 28, t.ink, { bold: true, align: "center" }));
      elements.push(arabicText(ctx, x - 86, 756, 290, 58, ["تحديد الهدف", "تصميم التجربة", "إطلاق النسخة", "قياس الأداء", "توسيع الأثر"][i], 18, t.muted, { align: "center", lineHeight: 1.45 }));
    });
    elements.push(...arabicFooterBand(ctx, "خطة تشغيلية", "مسار واضح من الفكرة إلى الاعتماد.", false));
  } else if (["metrics", "financials", "traction", "commercial-case", "assessment"].includes(layout)) {
    const metrics = arabicMetrics(ctx);
    elements = arabicChrome(ctx, index, layout);
    elements.push(arabicText(ctx, 120, 196, 1220, 130, title, title.length > 48 ? 54 : 70, t.ink, { bold: true, lineHeight: 1.15 }));
    elements.push(arabicText(ctx, 120, 360, 980, 86, arabicLead(ctx, layout), 24, t.muted, { lineHeight: 1.55 }));
    elements.push(el("shape", 1240, 180, 500, 260, { fill: t.bg, stroke: t.bg }));
    elements.push(latinText(ctx, 1300, 236, 380, 86, metrics[0]?.metric || "3x", metricSize(metrics[0]?.metric || "3x", 72), t.white, { bold: true, align: "center" }));
    elements.push(arabicText(ctx, 1290, 336, 400, 52, metrics[0]?.label || "إشارة قرار واضحة", 21, "#CBD5E1", { align: "center", lineHeight: 1.35 }));
    metrics.slice(0, 3).forEach((item, i) => {
      const x = 120 + i * 560;
      elements.push(el("shape", x, 540, 500, 260, { fill: i === 1 ? t.bg : "#F8FAFC", stroke: i === 1 ? t.bg : "#E2E8F0" }));
      elements.push(el("shape", x, 540, 14, 260, { fill: t.accent, stroke: t.accent }));
      elements.push(latinText(ctx, x + 44, 592, 390, 70, item.metric, metricSize(item.metric, 48), i === 1 ? t.white : t.ink, { bold: true }));
      elements.push(arabicText(ctx, x + 44, 676, 390, 70, item.label, 22, i === 1 ? "#CBD5E1" : t.muted, { lineHeight: 1.35 }));
    });
    elements.push(...arabicFooterBand(ctx, "مؤشرات قابلة للنقاش", "الأرقام مهمة عندما تخدم القرار لا عندما تزاحم القصة.", false));
  } else if (["closing", "ask", "next-steps"].includes(layout)) {
    elements = [
      el("shape", 0, 0, W, H, { fill: t.bg, stroke: t.bg }),
      el("shape", 0, 0, 760, H, { fill: t.white, stroke: t.white }),
      el("shape", 760, 0, 4, H, { fill: t.accent, stroke: t.accent }),
      el("shape", 120, 154, 48, 2, { fill: t.accent, stroke: t.accent }),
      arabicText(ctx, 190, 138, 480, 42, "FOUNDERS · المؤسسون", 18, t.ink, { lineHeight: 1.1 }),
      arabicText(ctx, 80, 230, 600, 130, "الفريق الذي يبني التجربة", 58, t.ink, { bold: true, lineHeight: 1.15 }),
      el("shape", 80, 430, 620, 2, { fill: "#E2E8F0", stroke: "#E2E8F0" }),
      arabicText(ctx, 80, 480, 600, 48, ctx.brand?.name || "DeckForge", 44, t.ink, { bold: true }),
      arabicText(ctx, 80, 548, 600, 78, arabicObjective(ctx) || "منصة عربية لصناعة عروض تقديمية احترافية", 22, t.muted, { lineHeight: 1.5 }),
      arabicText(ctx, 830, 138, 600, 42, "شكرًا لكم · THANK YOU", 18, t.accent, { lineHeight: 1.1 }),
      arabicText(ctx, 830, 250, 900, 150, title, title.length > 40 ? 58 : 76, t.white, { bold: true, lineHeight: 1.15 }),
      arabicText(ctx, 830, 450, 820, 90, arabicLead(ctx, "closing"), 30, "#CBD5E1", { lineHeight: 1.35 }),
      el("shape", 830, 760, 490, 130, { fill: t.bg, stroke: "rgba(201,169,97,0.4)" }),
      arabicText(ctx, 870, 792, 410, 26, "للتواصل · CONTACT", 14, t.accent, { lineHeight: 1.05 }),
      latinText(ctx, 870, 832, 410, 34, "hello@deckforge.ai", 22, t.white, { bold: true }),
      el("shape", 1340, 760, 490, 130, { fill: t.accent, stroke: t.accent }),
      arabicText(ctx, 1380, 792, 410, 26, "القرار التالي", 14, t.bg, { lineHeight: 1.05 }),
      arabicText(ctx, 1380, 832, 410, 36, arabicObjective(ctx) || "ابدأ النسخة التجريبية", 22, t.bg, { bold: true })
    ];
  } else {
    elements = arabicChrome(ctx, index, layout);
    elements.push(arabicText(ctx, 120, 196, 1660, 120, title, title.length > 48 ? 54 : 70, t.ink, { bold: true, lineHeight: 1.15 }));
    elements.push(arabicText(ctx, 120, 340, 1260, 78, arabicLead(ctx, layout), 24, t.muted, { lineHeight: 1.55 }));
    ctx.bank.agenda.slice(0, 3).forEach((item, i) => {
      const y = 490 + i * 130;
      elements.push(el("shape", 210, y, 1350, 106, { fill: "#F8FAFC", stroke: "#E2E8F0" }));
      elements.push(latinText(ctx, 250, y + 28, 90, 42, String(i + 1).padStart(2, "0"), 30, t.accent, { bold: true, align: "center" }));
      elements.push(arabicText(ctx, 390, y + 24, 1060, 52, item, 30, t.ink, { bold: true }));
    });
    elements.push(...arabicFooterBand(ctx, "إيقاع بصري", "عنوان واضح، مساحة بيضاء، وتفاصيل قابلة للتعديل.", false));
  }

  return {
    id: `slide-${index + 1}`,
    filename: file,
    layout,
    title,
    brief: ctx.plan[index]?.brief || "",
    speakerNotes: ctx.plan[index]?.speakerNotes || "",
    qaFocus: ctx.plan[index]?.qaFocus || "Premium RTL Arabic typography, hierarchy, contrast, and clean export",
    elements
  };
}

function makeSlide(layout, index, ctx) {
  const t = ctx.theme;
  const rtl = ctx.rtl;
  const bank = ctx.bank;
  const titleAlign = rtl ? "right" : "left";
  const titleX = rtl ? 720 : 126;
  const file = `${String(index + 1).padStart(2, "0")}-${layout}.html`;
  let elements = background(t);
  let title = "";

  if (isArabicCinematic(ctx)) {
    return makeArabicCinematicSlide(layout, index, ctx);
  }

  if (isArabicInvestor(ctx)) {
    return makeArabicInvestorSlide(layout, index, ctx);
  }

  if (isArabicLuxe(ctx)) {
    return makeArabicLuxeSlide(layout, index, ctx);
  }

  if (layout === "cover") {
    title = ctx.title;
    const heroSize = title.length > 42 ? 54 : title.length > 30 ? 62 : 70;
    const coverSurface = darkSurface(t);
    const coverTheme = { ...t, bg: coverSurface };
    const coverLine = ctx.brand.configured
      ? [ctx.brand.name, ctx.brand.audience, ctx.brand.objective].filter(Boolean).join(" / ")
      : (rtl ? "\u0631\u0624\u064a\u0629 \u0634\u0627\u0645\u0644\u0629 / \u062e\u0637\u0648\u0627\u062a \u0639\u0645\u0644\u064a\u0629 / 10 \u0633\u0644\u0627\u064a\u062f\u0627\u062a" : `Strategic story / Practical steps / ${ctx.count} slides`);
    elements = [
      el("shape", 0, 0, W, H, { fill: coverSurface, stroke: coverSurface }),
      ...imageBlock(0, 0, 720, H, coverTheme, rtl ? "\u0635\u0648\u0631\u0629 \u0645\u0648\u0636\u0648\u0639\u064a\u0629" : "Thematic visual"),
      el("shape", 720, 0, 1200, H, { fill: coverSurface, stroke: coverSurface }),
      el("shape", 900, 300, 18, 96, { fill: t.accent, stroke: t.accent }),
      el("shape", 1040, 690, 210, 6, { fill: t.accent, stroke: t.accent }),
      text(t, rtl ? 760 : 880, 350, 880, 230, title, heroSize, t.white, { bold: true, align: rtl ? "right" : "left", rtl, lineHeight: 1.04 }),
      text(t, rtl ? 760 : 880, 612, 760, 92, ctx.subtitle, 30, "#dbe4f0", { align: rtl ? "right" : "left", rtl, lineHeight: 1.22 }),
      text(t, rtl ? 760 : 880, 842, 760, 42, rtl ? "\u0631\u0624\u064a\u0629 \u0634\u0627\u0645\u0644\u0629 \u2022 \u062e\u0637\u0648\u0627\u062a \u0639\u0645\u0644\u064a\u0629 \u2022 10 \u0633\u0644\u0627\u064a\u062f\u0627\u062a" : "Strategic story • Practical steps • 10 slides", 22, "#c9d4e4", { align: rtl ? "right" : "left", rtl })
    ];
    elements[elements.length - 1].text = coverLine;
  } else if (layout === "agenda") {
    title = rtl ? "\u0645\u0627\u0630\u0627 \u0633\u062a\u062c\u062f \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0639\u0631\u0636\u061f" : "What you will find in this deck";
    const sideSurface = darkSurface(t);
    elements.push(el("shape", 1460, 108, 460, 892, { fill: sideSurface, stroke: sideSurface }));
    elements.push(text(t, titleX, 250, 820, 140, title, 56, t.ink, { bold: true, align: titleAlign, rtl, lineHeight: 1.06 }));
    bank.agenda.slice(0, 5).forEach((item, i) => {
      const rowY = 500 + i * 86;
      elements.push(text(t, rtl ? 980 : 220, rowY, 420, 46, item, 28, t.ink, { bold: true, align: titleAlign, rtl }));
      elements.push(text(t, rtl ? 880 : 126, rowY, 70, 46, String(i + 1).padStart(2, "0"), 26, t.accent, { bold: true, align: "center" }));
    });
    elements.push(text(t, 1540, 430, 260, 160, String(ctx.count), 118, t.accent, { bold: true, align: "center" }));
    elements.push(text(t, 1510, 600, 320, 70, rtl ? "\u0645\u062d\u0627\u0648\u0631 \u0631\u0626\u064a\u0633\u064a\u0629" : "core sections", 28, t.white, { bold: true, align: "center", rtl }));
  } else if (layout === "why") {
    title = rtl ? "\u0644\u0645\u0627\u0630\u0627 \u0647\u0630\u0627 \u0645\u0647\u0645 \u0627\u0644\u0622\u0646\u061f" : "Why this matters now";
    elements.push(...imageBlock(0, 108, 760, 892, t, rtl ? "\u0633\u064a\u0627\u0642 \u0648\u0627\u0633\u0639" : "Context"));
    elements.push(text(t, 900, 260, 760, 132, title, 58, t.ink, { bold: true, align: titleAlign, rtl }));
    elements.push(text(t, 900, 438, 720, 116, ctx.why, 30, t.muted, { align: titleAlign, rtl, lineHeight: 1.28 }));
    [0, 1, 2].forEach((i) => {
      elements.push(el("shape", 900, 620 + i * 104, 620, 72, { fill: "#ffffff", stroke: "#e4e7ec", radius: 26 }));
      elements.push(text(t, 930, 640 + i * 104, 560, 38, bank.benefits[i] || bank.agenda[i], 24, t.ink, { bold: true, align: titleAlign, rtl }));
    });
  } else if (layout === "benefits") {
    title = rtl ? "\u0627\u0644\u0641\u0648\u0627\u0626\u062f \u0627\u0644\u0623\u0643\u062b\u0631 \u062a\u0623\u062b\u064a\u0631\u0627" : "The highest-impact benefits";
    elements.push(text(t, titleX, 204, 980, 108, title, 54, t.ink, { bold: true, align: titleAlign, rtl }));
    bank.benefits.forEach((item, i) => {
      const x = 126 + i * 560;
      elements.push(el("shape", x, 430, 490, 320, { fill: "#ffffff", stroke: "#e4e7ec", radius: 34 }));
      elements.push(el("shape", x, 430, 16, 320, { fill: i === 1 ? t.accent2 : t.accent, stroke: i === 1 ? t.accent2 : t.accent }));
      elements.push(text(t, x + 46, 480, 390, 76, `0${i + 1}`, 36, t.accent, { bold: true, align: rtl ? "right" : "left" }));
      elements.push(text(t, x + 46, 570, 380, 90, item, 30, t.ink, { bold: true, align: titleAlign, rtl, lineHeight: 1.18 }));
    });
  } else if (layout === "metrics") {
    title = rtl ? "\u0645\u0624\u0634\u0631\u0627\u062a \u062a\u062c\u0639\u0644 \u0627\u0644\u0642\u064a\u0645\u0629 \u0648\u0627\u0636\u062d\u0629" : "Signals that make the value clear";
    elements.push(text(t, titleX, 200, 1020, 120, title, 52, t.ink, { bold: true, align: titleAlign, rtl }));
    const chart = ctx.charts?.[0];
    if (chart) {
      elements.push(...chartElements(t, chart, 180, 410, 1560, 400));
    } else {
      const metricSurface = darkSurface(t);
      const metrics = rtl ? [["75%", "\u0645\u0646 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0639\u0627\u0644\u0645\u064a"], ["60%", "\u0641\u0631\u0635 \u0623\u0648\u0633\u0639"], ["90", "\u064a\u0648\u0645\u0627 \u0644\u0628\u0646\u0627\u0621 \u0639\u0627\u062f\u0629"]] : [["75%", "of global knowledge sources"], ["60%", "broader opportunity surface"], ["90", "days to build a habit"]];
      metrics.forEach((m, i) => {
        const x = 180 + i * 555;
        elements.push(el("shape", x, 440, 450, 260, { fill: i === 1 ? metricSurface : "#ffffff", stroke: "#e4e7ec", radius: 30 }));
        elements.push(text(t, x + 50, 490, 350, 96, m[0], metricSize(m[0], 76), i === 1 ? t.white : t.accent, { bold: true, align: "center" }));
        elements.push(text(t, x + 54, 604, 342, 70, m[1], 24, i === 1 ? "#dbe4f0" : t.muted, { align: "center", rtl }));
      });
    }
  } else if (layout === "pillars") {
    title = rtl ? "\u0646\u0638\u0627\u0645 \u064a\u062d\u0648\u0644 \u0627\u0644\u0641\u0643\u0631\u0629 \u0625\u0644\u0649 \u062a\u0642\u062f\u0645" : "A system that turns effort into progress";
    elements.push(text(t, titleX, 184, 980, 118, title, 50, t.ink, { bold: true, align: titleAlign, rtl }));
    bank.pillars.forEach((item, i) => {
      const x = 150 + i * 430;
      elements.push(el("shape", x, 430, 360, 300, { fill: "#ffffff", stroke: "#d8dee8", radius: 28 }));
      elements.push(text(t, x + 34, 478, 290, 42, `0${i + 1}`, 28, t.accent, { bold: true, align: "center" }));
      elements.push(text(t, x + 36, 552, 288, 70, item, 30, t.ink, { bold: true, align: "center", rtl }));
      elements.push(text(t, x + 44, 650, 270, 58, rtl ? "\u062e\u0637\u0648\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062a\u0643\u0631\u0627\u0631 \u0648\u0627\u0644\u0642\u064a\u0627\u0633" : "Repeatable practice with visible feedback", 19, t.muted, { align: "center", rtl }));
    });
  } else if (layout === "roadmap") {
    title = rtl ? "\u062e\u0637\u0629 \u0637\u0631\u064a\u0642 \u0628\u0633\u064a\u0637\u0629" : "A simple roadmap";
    elements.push(text(t, titleX, 190, 900, 100, title, 54, t.ink, { bold: true, align: titleAlign, rtl }));
    elements.push(el("shape", 230, 610, 1460, 8, { fill: t.accent, stroke: t.accent }));
    const stepSurface = darkSurface(t);
    const steps = rtl ? ["\u0627\u0644\u0628\u062f\u0627\u064a\u0629", "\u0627\u0644\u062a\u0643\u0631\u0627\u0631", "\u0627\u0644\u0642\u064a\u0627\u0633", "\u0627\u0644\u062a\u062d\u0633\u064a\u0646", "\u0627\u0644\u0625\u062a\u0642\u0627\u0646"] : ["Start", "Repeat", "Measure", "Improve", "Master"];
    steps.forEach((step, i) => {
      const x = 210 + i * 350;
      elements.push(el("shape", x, 568, 94, 94, { fill: i === 2 ? stepSurface : "#ffffff", stroke: t.accent, radius: 47 }));
      elements.push(text(t, x + 18, 590, 58, 42, `${i + 1}`, 30, i === 2 ? t.white : t.accent, { bold: true, align: "center" }));
      elements.push(text(t, x - 70, 690, 230, 44, step, 26, t.ink, { bold: true, align: "center", rtl }));
    });
  } else if (isPlaybookLayout(layout) && layout !== "cover" && layout !== "closing") {
    const spec = playbookSpec(layout, ctx);
    const isTraining = trainingLayouts.includes(layout);
    const signalSurface = darkSurface(t);
    title = spec.title;
    elements.push(text(t, 126, 176, 940, 100, title, 52, t.ink, { bold: true, align: "left", lineHeight: 1.06 }));
    elements.push(text(t, 126, 304, 900, 92, spec.lead, 26, t.muted, { align: "left", lineHeight: 1.24 }));
    elements.push(el("shape", 1200, 170, 500, 260, { fill: signalSurface, stroke: signalSurface, radius: 26 }));
    elements.push(text(t, 1260, 230, 380, 84, spec.metric, metricSize(spec.metric, 64), t.white, { bold: true, align: "center" }));
    elements.push(text(t, 1260, 330, 380, 40, isTraining ? "learning signal" : "decision signal", 22, "#dbe4f0", { align: "center" }));
    const chart = ctx.charts?.[0];
    const chartReadyLayout = ["proof", "commercial-case", "assessment"].includes(layout);
    if (chart && chartReadyLayout) {
      elements.push(...chartElements(t, chart, 126, 500, 1040, 330, { compact: true }));
      spec.cards.slice(0, 2).forEach((item, i) => {
        const y = 520 + i * 150;
        elements.push(el("shape", 1210, y, 490, 118, { fill: "#ffffff", stroke: "#e4e7ec", radius: 24 }));
        elements.push(text(t, 1250, y + 26, 86, 34, `0${i + 1}`, 24, t.accent, { bold: true, align: "left" }));
        elements.push(text(t, 1340, y + 24, 300, 58, item, 24, t.ink, { bold: true, align: "left", lineHeight: 1.12 }));
      });
    } else {
      spec.cards.slice(0, 3).forEach((item, i) => {
        const x = 126 + i * 560;
        elements.push(el("shape", x, 520, 490, 240, { fill: "#ffffff", stroke: "#e4e7ec", radius: 26 }));
        elements.push(text(t, x + 44, 568, 86, 44, `0${i + 1}`, 28, t.accent, { bold: true, align: "left" }));
        elements.push(text(t, x + 44, 636, 380, 72, item, 30, t.ink, { bold: true, align: "left", lineHeight: 1.12 }));
      });
      const lane = isTraining ? ["Learn", "Practice", "Apply"] : ["Diagnose", "Propose", "Close"];
      lane.forEach((step, i) => {
        const x = 360 + i * 420;
        elements.push(el("shape", x, 830, 300, 62, { fill: i === 1 ? t.accent : "#ffffff", stroke: t.accent, radius: 31 }));
        elements.push(text(t, x + 24, 846, 252, 30, step, 22, i === 1 ? t.white : t.accent, { bold: true, align: "center" }));
      });
    }
  } else if (investorLayouts.includes(layout) && layout !== "cover") {
    const spec = investorSpec(layout, ctx);
    const signalSurface = darkSurface(t);
    title = spec.title;
    elements.push(text(t, 126, 188, 980, 100, title, 52, t.ink, { bold: true, align: "left", lineHeight: 1.06 }));
    elements.push(text(t, 126, 318, 850, 86, spec.lead, 27, t.muted, { align: "left", lineHeight: 1.24 }));
    elements.push(el("shape", 1260, 184, 420, 250, { fill: signalSurface, stroke: signalSurface, radius: 28 }));
    elements.push(text(t, 1310, 238, 320, 94, spec.metric, metricSize(spec.metric, 68), t.white, { bold: true, align: "center" }));
    elements.push(text(t, 1310, 340, 320, 42, layout === "ask" ? "runway plan" : "investor signal", 23, "#dbe4f0", { align: "center" }));
    spec.cards.forEach((item, i) => {
      const x = 126 + i * 560;
      elements.push(el("shape", x, 540, 490, 260, { fill: "#ffffff", stroke: "#e4e7ec", radius: 26 }));
      elements.push(el("shape", x, 540, 14, 260, { fill: i === 1 ? t.accent2 : t.accent, stroke: i === 1 ? t.accent2 : t.accent }));
      elements.push(text(t, x + 44, 592, 390, 46, `0${i + 1}`, 28, t.accent, { bold: true, align: "left" }));
      elements.push(text(t, x + 44, 662, 380, 66, item, 31, t.ink, { bold: true, align: "left", lineHeight: 1.12 }));
    });
    if (["market", "financials", "traction"].includes(layout)) {
      [0.45, 0.66, 0.82].forEach((height, i) => {
        const x = 1300 + i * 95;
        elements.push(el("shape", x, 500 - height * 110, 54, height * 110, { fill: i === 2 ? t.accent2 : t.accent, stroke: i === 2 ? t.accent2 : t.accent, radius: 8 }));
        elements.push(text(t, x - 16, 516, 86, 28, ["Now", "Next", "Scale"][i], 16, t.muted, { align: "center" }));
      });
    }
  } else if (layout === "closing") {
    title = rtl ? "\u0631\u062d\u0644\u062a\u0643 \u062a\u0628\u062f\u0623 \u0628\u062e\u0637\u0648\u0629 \u0648\u0627\u062d\u062f\u0629" : "Your next step starts here";
    const closeSurface = darkSurface(t);
    elements = [
      el("shape", 0, 0, W, H, { fill: closeSurface, stroke: closeSurface }),
      el("shape", 150, 120, 150, 150, { fill: t.accent2, stroke: t.accent2, radius: 75 }),
      el("shape", 1560, 760, 210, 210, { fill: t.accent, stroke: t.accent, radius: 105 }),
      text(t, 430, 340, 1060, 180, title, 72, t.white, { bold: true, align: "center", rtl, lineHeight: 1.05 }),
      text(t, 520, 590, 880, 92, bank.closing, 30, "#dbe4f0", { align: "center", rtl, lineHeight: 1.26 }),
      el("shape", 540, 790, 260, 86, { fill: "#ffffff", stroke: "#ffffff", radius: 18 }),
      text(t, 564, 812, 212, 36, rtl ? "\u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u0623\u0648\u0644\u0649" : "First action", 22, t.ink, { bold: true, align: "center", rtl }),
      el("shape", 830, 790, 260, 86, { fill: t.accent, stroke: t.accent, radius: 18 }),
      text(t, 854, 812, 212, 36, rtl ? "\u062e\u0637\u0629 30 \u064a\u0648\u0645\u0627" : "30-day plan", 22, t.bg, { bold: true, align: "center", rtl }),
      el("shape", 1120, 790, 260, 86, { fill: t.accent2, stroke: t.accent2, radius: 18 }),
      text(t, 1144, 812, 212, 36, rtl ? "\u0642\u064a\u0627\u0633 \u0627\u0644\u062a\u0642\u062f\u0645" : "Measure progress", 22, t.bg, { bold: true, align: "center", rtl })
    ];
  } else {
    const defaultTitles = {
      habits: rtl ? "\u0639\u0627\u062f\u0627\u062a \u064a\u0648\u0645\u064a\u0629 \u0635\u063a\u064a\u0631\u0629" : "Small daily habits",
      mistakes: rtl ? "\u0623\u062e\u0637\u0627\u0621 \u062a\u0624\u062e\u0631 \u0627\u0644\u062a\u0642\u062f\u0645" : "Mistakes that slow progress",
      case: rtl ? "\u0646\u0645\u0648\u0630\u062c \u062a\u0637\u0628\u064a\u0642\u064a" : "Applied example",
      "operating-model": rtl ? "\u0646\u0645\u0648\u0630\u062c \u0627\u0644\u062a\u0634\u063a\u064a\u0644" : "Operating model",
      investment: rtl ? "\u0623\u064a\u0646 \u0646\u0633\u062a\u062b\u0645\u0631 \u0627\u0644\u062c\u0647\u062f\u061f" : "Where to invest effort",
      appendix: rtl ? "\u0645\u0644\u062d\u0642 \u062a\u0646\u0641\u064a\u0630\u064a" : "Execution appendix"
    };
    title = defaultTitles[layout] || (rtl ? "\u0633\u0644\u0627\u064a\u062f \u062a\u0646\u0641\u064a\u0630\u064a" : "Execution slide");
    elements.push(text(t, titleX, 190, 980, 100, title, 52, t.ink, { bold: true, align: titleAlign, rtl }));
    const items = layout === "mistakes"
      ? (rtl ? ["\u0627\u0644\u062a\u0639\u0644\u0645 \u0628\u0644\u0627 \u0647\u062f\u0641", "\u062a\u062c\u0627\u0647\u0644 \u0627\u0644\u0645\u0645\u0627\u0631\u0633\u0629", "\u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631 \u0644\u0644\u0643\u0645\u0627\u0644"] : ["Learning without a goal", "Skipping active practice", "Waiting for perfection"])
      : bank.agenda.slice(0, 3);
    items.forEach((item, i) => {
      const y = 400 + i * 150;
      elements.push(el("shape", 210, y, 1350, 106, { fill: "#ffffff", stroke: "#e4e7ec", radius: 24 }));
      elements.push(text(t, 250, y + 26, 90, 42, `0${i + 1}`, 30, t.accent, { bold: true, align: "center" }));
      elements.push(text(t, 390, y + 24, 1060, 48, item, 30, t.ink, { bold: true, align: titleAlign, rtl }));
    });
  }

  if (layout !== "cover") {
    elements.push(...evidenceFooter(ctx, layout), ...brandFooter(ctx, layout));
  }

  return {
    id: `slide-${index + 1}`,
    filename: file,
    layout,
    title,
    brief: ctx.plan[index]?.brief || "",
    speakerNotes: ctx.plan[index]?.speakerNotes || "",
    qaFocus: ctx.plan[index]?.qaFocus || "",
    elements
  };
}

function labelFromLayout(layout) {
  return String(layout || "slide")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function roleForLayout(layout) {
  if (layout === "cover") return "opening";
  if (["closing", "next-steps", "ask"].includes(layout)) return "close";
  return "body";
}

function normalizeOutlineItems(items, fallbackPlan = [], fallbackLayouts = []) {
  return (items || []).map((item, index) => {
    const fallback = fallbackPlan[index] || {};
    const layout = item.layout || fallback.layout || fallbackLayouts[index] || layouts[Math.min(index, layouts.length - 1)] || "agenda";
    return {
      slide: index + 1,
      layout,
      role: item.role || fallback.role || roleForLayout(layout),
      title: String(item.title || fallback.title || fallback.brief || labelFromLayout(layout)).trim(),
      brief: String(item.brief || fallback.brief || "").trim(),
      speakerNotes: String(item.speakerNotes || fallback.speakerNotes || "").trim(),
      qaFocus: String(item.qaFocus || fallback.qaFocus || "Hierarchy, overflow, contrast, and alignment").trim()
    };
  });
}

function buildOutlineFromPlan(plan, slides) {
  return normalizeOutlineItems((plan || []).map((item, index) => ({
    ...item,
    title: slides[index]?.title || item.title || item.brief || labelFromLayout(item.layout)
  })), plan, (plan || []).map((item) => item.layout));
}

function applyOutlineToSlides(slides, outlineItems) {
  normalizeOutlineItems(outlineItems).forEach((item, index) => {
    const slide = slides[index];
    if (!slide) return;
    const title = titleElement(slide);
    slide.layout = item.layout || slide.layout;
    slide.title = item.title || slide.title;
    slide.brief = item.brief || slide.brief;
    slide.speakerNotes = item.speakerNotes || slide.speakerNotes;
    slide.qaFocus = item.qaFocus || slide.qaFocus;
    if (title && item.title) title.text = item.title;
  });
}

function createGenerationContext(outlineItems = null) {
  const prompt = $("prompt").value.trim();
  const lang = $("language").value;
  const rtl = lang === "ar" || (lang === "auto" && hasArabic(prompt));
  const providedOutline = Array.isArray(outlineItems) && outlineItems.length ? outlineItems : null;
  const requestedCount = Math.max(4, Math.min(14, Number($("slideCount").value) || 10));
  const count = providedOutline ? Math.max(4, Math.min(14, providedOutline.length)) : requestedCount;
  const template = selectedTemplate();
  const activeReference = referenceAnalysis ? cloneDeck(referenceAnalysis) : null;
  const themeKey = $("theme").value;
  const promptArchetype = inferArchetype(prompt);
  const referenceRecipe = activeReference?.visualRecipe || {};
  const referenceTags = new Set((referenceRecipe.tags || []).map((tag) => String(tag || "").toLowerCase()));
  const referenceFonts = (referenceRecipe.topFonts || []).map((item) => String(item.font || "").toLowerCase()).join(" ");
  const referenceMediaCount = Number(activeReference?.assets?.mediaCount || activeReference?.structure?.mediaFiles || 0);
  const referenceSuggestsCinematic = rtl && !template
    && referenceRecipe.rtlSlideRatio >= 0.5
    && referenceMediaCount >= 3
    && (referenceFonts.includes("playfair") || referenceFonts.includes("cormorant") || referenceFonts.includes("amiri") || referenceTags.has("large-title"));
  const referenceSuggestsInvestorDark = rtl && !template
    && !referenceSuggestsCinematic
    && referenceRecipe.rtlSlideRatio >= 0.5
    && (referenceTags.has("dark-panels") || referenceTags.has("editorial-chrome"));
  const autoArabicTheme = rtl && !template && themeKey === "executive";
  const resolvedThemeKey = autoArabicTheme
    ? (promptArchetype === "success-story" || referenceSuggestsCinematic
      ? "arabicCinematic"
      : (promptArchetype === "investor-pitch" || referenceSuggestsInvestorDark ? "arabicInvestor" : "arabicLuxe"))
    : (referenceSuggestsCinematic && !["arabicLuxe", "arabicInvestor"].includes(themeKey)
      ? "arabicCinematic"
      : (referenceSuggestsInvestorDark && themeKey !== "arabicLuxe" ? "arabicInvestor" : themeKey));
  const baseTheme = template?.theme ? cloneDeck(template.theme) : themes[resolvedThemeKey] || themes.executive;
  const referenceBaseTheme = activeReference && !template ? synthesizeReferenceTheme(baseTheme, activeReference) : baseTheme;
  const formBrand = readBrandBrief(prompt);
  const templateBrand = template?.brand || {};
  const defaultAccent = "#9a6a16";
  const brand = template ? {
    name: formBrand.name || templateBrand.name || "",
    audience: formBrand.audience || templateBrand.audience || "",
    objective: ($("deckGoal")?.value || "") === "Executive decision" ? (templateBrand.objective || formBrand.objective) : formBrand.objective,
    tone: ($("tone")?.value || "") === "Board-ready" ? (templateBrand.tone || formBrand.tone) : formBrand.tone,
    accent: ($("brandAccent")?.value || "").toLowerCase() === defaultAccent ? (templateBrand.accent || formBrand.accent) : formBrand.accent,
    configured: true
  } : formBrand;
  const sourcePackage = parseSourceInput($("sourceInput")?.value || "");
  const documentPackage = parseDocumentInput($("documentInput")?.value || "");
  const evidence = [
    ...parseEvidenceInput($("evidenceInput")?.value || ""),
    ...sourcePackage.evidence,
    ...documentPackage.evidence
  ].slice(0, 16);
  const sources = [
    ...sourcePackage.sources,
    ...documentPackage.sources
  ];
  const sourceMap = buildSourceMap(sources, evidence);
  const charts = buildCharts(evidence);
  const references = buildReferences(sources, documentPackage.documents, evidence);
  const theme = applyBrandToTheme(referenceBaseTheme, brand);
  let title = titleFromPrompt(prompt, rtl);
  const keywords = extractKeywords(prompt);
  const bank = topicBank(prompt, rtl);
  const archetype = promptArchetype;
  const strategy = buildStrategy(prompt, title, rtl, count, theme.name, keywords, archetype, brand, evidence, sources, documentPackage.documents, charts, references);
  if (activeReference) {
    strategy.referenceDeck = activeReference.fileName || "";
    strategy.referenceFingerprint = activeReference.fingerprint || "";
    strategy.visualDirection = `${strategy.visualDirection}; reference deck DNA: ${activeReference.fingerprint || activeReference.summary || "analyzed reference"}`;
  }
  const fallbackLayouts = selectLayouts(prompt, count, { rtl, theme });
  const slideLayouts = providedOutline
    ? providedOutline.slice(0, count).map((item, index) => item.layout || fallbackLayouts[index] || "agenda")
    : fallbackLayouts;
  const ctx = {
    prompt,
    rtl,
    count,
    theme,
    brand,
    evidence,
    sources,
    documents: documentPackage.documents,
    charts,
    references,
    sourceMap,
    title,
    keywords,
    archetype,
    strategy,
    bank,
    subtitle: rtl ? "\u062f\u0644\u064a\u0644 \u0639\u0645\u0644\u064a \u0645\u0646\u0638\u0645 \u0648\u0642\u0627\u0628\u0644 \u0644\u0644\u062a\u0637\u0628\u064a\u0642" : "A polished, practical guide built for decision-ready presentation",
    why: rtl ? "\u0627\u0644\u0642\u064a\u0645\u0629 \u062a\u0632\u062f\u0627\u062f \u0639\u0646\u062f\u0645\u0627 \u0646\u062d\u0648\u0644 \u0627\u0644\u0645\u0648\u0636\u0648\u0639 \u0625\u0644\u0649 \u062e\u0637\u0629 \u0648\u0627\u0636\u062d\u0629 \u062a\u0631\u0628\u0637 \u0628\u064a\u0646 \u0627\u0644\u062f\u0627\u0641\u0639\u060c \u0627\u0644\u0637\u0631\u064a\u0642\u0629\u060c \u0648\u0627\u0644\u0646\u062a\u064a\u062c\u0629." : "The value becomes visible when the idea is translated into a clear plan that connects motivation, method, and measurable outcomes."
  };
  const basePlan = slideLayouts.slice(0, count).map((layout, i) => planForLayout(layout, i, ctx));
  const normalizedOutline = providedOutline ? normalizeOutlineItems(providedOutline.slice(0, count), basePlan, slideLayouts) : [];
  if (normalizedOutline[0]?.title) {
    title = normalizedOutline[0].title;
    ctx.title = title;
  }
  ctx.plan = normalizedOutline.length
    ? normalizedOutline.map((item, index) => ({
      ...basePlan[index],
      slide: index + 1,
      layout: item.layout,
      role: item.role || roleForLayout(item.layout),
      brief: item.brief || basePlan[index]?.brief || "",
      speakerNotes: item.speakerNotes || basePlan[index]?.speakerNotes || "",
      qaFocus: item.qaFocus || basePlan[index]?.qaFocus || ""
    }))
    : basePlan;
  return { prompt, rtl, count, theme, brand, evidence, sources, documents: documentPackage.documents, charts, references, sourceMap, referenceAnalysis: activeReference, title, keywords, archetype, strategy, ctx, slideLayouts, normalizedOutline, template };
}

function draftOutline() {
  const { ctx, slideLayouts, count } = createGenerationContext();
  const slides = slideLayouts.slice(0, count).map((layout, i) => makeSlide(layout, i, ctx));
  outlineDraft = buildOutlineFromPlan(ctx.plan, slides);
  outlineApprovedAt = "";
  activeTab = "outline";
  render();
}

function buildDeckFromOutline() {
  if (!outlineDraft.length) draftOutline();
  if (!outlineDraft.length) return;
  outlineApprovedAt = new Date().toISOString();
  generateDeck(outlineDraft);
  activeTab = "preview";
  render();
}

function generateDeck(outlineItems = null) {
  const { prompt, rtl, count, theme, brand, evidence, sources, documents, charts, references, sourceMap, referenceAnalysis: activeReference, title, keywords, archetype, strategy, ctx, slideLayouts, normalizedOutline, template } = createGenerationContext(outlineItems);
  const slides = slideLayouts.slice(0, count).map((layout, i) => makeSlide(layout, i, ctx));
  if (normalizedOutline.length) applyOutlineToSlides(slides, normalizedOutline);
  const outline = normalizedOutline.length ? normalizeOutlineItems(normalizedOutline, ctx.plan, slideLayouts) : buildOutlineFromPlan(ctx.plan, slides);
  deck = {
    schemaVersion: "1.0",
    format: "html",
    metadata: {
      title: outline[0]?.title || title,
      description: prompt,
      author: "DeckForge",
      archetype,
      brandName: brand.name,
      audience: strategy.audience,
      objective: brand.objective,
      tone: brand.tone,
      evidenceCount: evidence.length,
      sourceCount: sources.length,
      documentCount: documents.length,
      chartCount: charts.length,
      referenceCount: references.length,
      sourceClaimCount: sourceMap.sourceClaimCount,
      referenceDeck: activeReference?.fileName || "",
      referenceFingerprint: activeReference?.fingerprint || "",
      referenceThemeName: activeReference ? theme.name : "",
      slug: slugify(outline[0]?.title || title),
      createdAt: new Date().toISOString(),
      templateId: template?.id || "",
      templateName: template?.name || "",
      outlineStatus: normalizedOutline.length ? "approved" : "auto-drafted",
      outlineApprovedAt: normalizedOutline.length ? (outlineApprovedAt || new Date().toISOString()) : ""
    },
    canvas: { width: W, height: H },
    theme,
    brand,
    evidence,
    sources,
    documents,
    charts,
    references,
    referenceAnalysis: activeReference,
    sourceMap,
    template: template ? cloneDeck(template) : null,
    keywords,
    archetype,
    strategy,
    agentLog: buildAgentLog(strategy, slides.length),
    plan: ctx.plan,
    outline,
    playlist: slides.map((slide) => slide.filename),
    variants: [],
    slides
  };
  deck.deckDNA = buildDeckDNA(deck);
  deck.metadata.styleFingerprint = deck.deckDNA?.fingerprint || "";
  deck.briefing = buildBriefing(deck);
  deck.metadata.briefingSlideCount = deck.briefing?.perSlide?.length || 0;
  window.DeckForgeDeck = deck;
  outlineDraft = cloneDeck(outline);
  selected = 0;
  selectedObject = null;
  syncStoryboardState();
  repairDeckQA(3);
  updateFactCheck();
  updateReview();
  refreshSavePointSelect();
  render();
}

function cssFontName(name) {
  const clean = String(name || "").replace(/["']/g, "").trim();
  if (!clean) return "";
  return /\s/.test(clean) ? `"${clean}"` : clean;
}

function fontStackForElement(element) {
  const primary = cssFontName(element.font || (element.rtl ? "Tajawal" : "Aptos"));
  return element.rtl
    ? `${primary}, Dubai, "Noto Kufi Arabic", "Segoe UI", Arial, sans-serif`
    : `${primary}, "Segoe UI", Arial, sans-serif`;
}

function renderElement(element, index = 0, allowSelection = true) {
  const node = document.createElement("div");
  node.className = `slide-object ${element.type === "text" ? "text-object" : ""}`;
  if (allowSelection && selectedObject && selectedObject.slideIndex === selected && selectedObject.elementIndex === index) {
    node.classList.add("selected-object");
  }
  node.dataset.object = "true";
  node.dataset.objectType = element.type;
  node.dataset.elementIndex = String(index);
  if (element.chartId) node.dataset.chartId = element.chartId;
  Object.assign(node.style, {
    left: `${element.x}px`,
    top: `${element.y}px`,
    width: `${element.w}px`,
    height: `${element.h}px`
  });
  if (element.type === "text") {
    node.textContent = element.text || "";
    Object.assign(node.style, {
      color: element.fill,
      fontSize: `${element.size}px`,
      fontWeight: element.bold ? "800" : "500",
      lineHeight: element.lineHeight || 1.1,
      textAlign: element.align || (element.rtl ? "right" : "left"),
      direction: element.rtl ? "rtl" : "ltr",
      fontFamily: fontStackForElement(element),
      letterSpacing: "0"
    });
  } else if (element.type === "image") {
    Object.assign(node.style, {
      background: element.fill || "#111111",
      border: `1px solid ${element.stroke || "transparent"}`,
      borderRadius: `${element.radius || 0}px`,
      overflow: "hidden"
    });
    const image = document.createElement("img");
    image.src = element.src || "";
    image.alt = element.alt || "";
    Object.assign(image.style, {
      width: "100%",
      height: "100%",
      objectFit: element.fit || "cover",
      display: "block",
      pointerEvents: "none"
    });
    node.appendChild(image);
  } else {
    Object.assign(node.style, {
      background: element.fill,
      border: `1px solid ${element.stroke || element.fill}`,
      borderRadius: `${element.radius || 0}px`
    });
  }
  return node;
}

function renderSlideInto(container, slide, allowSelection = true) {
  container.innerHTML = "";
  slide.elements.forEach((element, index) => container.appendChild(renderElement(element, index, allowSelection)));
}

function scaleCanvas() {
  const shell = $("previewShell");
  const canvas = $("slideCanvas");
  const scale = shell.clientWidth / W;
  canvas.style.transform = `scale(${scale})`;
}

function scalePresenter() {
  const stage = $("presenterStage");
  const canvas = $("presenterCanvas");
  if (!stage || !canvas) return;
  const scale = Math.min(stage.clientWidth / W, stage.clientHeight / H);
  canvas.style.transform = `scale(${scale})`;
}

function renderPresenter() {
  if (!deck) return;
  presenterIndex = Math.max(0, Math.min(presenterIndex, deck.slides.length - 1));
  const slide = deck.slides[presenterIndex];
  $("presenterTitle").textContent = deck.metadata.title;
  $("presenterSlideTitle").textContent = `${presenterIndex + 1}. ${slide.title || slide.layout}`;
  $("presenterNotes").textContent = slide.speakerNotes || slide.brief || "";
  $("presenterCount").textContent = `${presenterIndex + 1} / ${deck.slides.length}`;
  renderSlideInto($("presenterCanvas"), slide, false);
  scalePresenter();
}

function openPresenter() {
  if (!deck) return;
  presenterIndex = selected;
  $("presenterOverlay").classList.add("active");
  $("presenterOverlay").setAttribute("aria-hidden", "false");
  renderPresenter();
}

function closePresenter() {
  $("presenterOverlay").classList.remove("active");
  $("presenterOverlay").setAttribute("aria-hidden", "true");
}

function movePresenter(delta) {
  if (!$("presenterOverlay").classList.contains("active")) return;
  presenterIndex = Math.max(0, Math.min(deck.slides.length - 1, presenterIndex + delta));
  renderPresenter();
}

function titleElement(slide) {
  return slide.elements.find((element) => element.type === "text" && element.text === slide.title)
    || slide.elements.find((element) => element.type === "text" && element.bold && element.size >= 44);
}

function buildStoryboard() {
  return deck.slides.map((slide, index) => ({
    slide: index + 1,
    id: slide.id,
    filename: slide.filename,
    layout: slide.layout,
    title: slide.title || slide.layout,
    brief: slide.brief || "",
    speakerNotes: slide.speakerNotes || "",
    qaFocus: slide.qaFocus || ""
  }));
}

function syncStoryboardState() {
  deck.playlist = deck.slides.map((slide) => slide.filename);
  deck.storyboard = buildStoryboard();
  deck.plan = deck.storyboard.map((item) => ({
    slide: item.slide,
    layout: item.layout,
    role: item.layout === "cover" ? "opening" : item.layout === "closing" || item.layout === "next-steps" || item.layout === "ask" ? "close" : "body",
    brief: item.brief,
    speakerNotes: item.speakerNotes,
    audience: deck.strategy?.audience || "",
    qaFocus: item.qaFocus
  }));
  deck.metadata.storyboardUpdatedAt = new Date().toISOString();
}

function setSlideTitle(index, value, shouldRender = true) {
  const slide = deck.slides[index];
  const clean = value.trim() || slide.title || `Slide ${index + 1}`;
  const title = titleElement(slide);
  slide.title = clean;
  if (title) title.text = clean;
  if (index === 0) {
    deck.metadata.title = clean;
  }
  syncStoryboardState();
  if (!shouldRender) return;
  runQA(false);
  updateReview();
  render();
}

function setSlideNotes(index, value, shouldRender = true) {
  const slide = deck.slides[index];
  slide.speakerNotes = value.trim();
  syncStoryboardState();
  if (!shouldRender) return;
  updateReview();
  render();
}

function moveSlide(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= deck.slides.length) return;
  const [slide] = deck.slides.splice(index, 1);
  deck.slides.splice(target, 0, slide);
  (deck.variants || []).forEach((variant) => {
    if (variant.slideIndex === index) variant.slideIndex = target;
    else if (delta > 0 && variant.slideIndex > index && variant.slideIndex <= target) variant.slideIndex -= 1;
    else if (delta < 0 && variant.slideIndex < index && variant.slideIndex >= target) variant.slideIndex += 1;
  });
  selected = target;
  selectedObject = null;
  syncStoryboardState();
  runQA(false);
  updateReview();
  render();
}

function setOutlineField(index, field, value) {
  outlineDraft = normalizeOutlineItems(outlineDraft.length ? outlineDraft : deck.outline || []);
  if (!outlineDraft[index]) return;
  outlineDraft[index][field] = value.trim();
}

function moveOutlineItem(index, delta) {
  outlineDraft = normalizeOutlineItems(outlineDraft.length ? outlineDraft : deck.outline || []);
  const target = index + delta;
  if (target < 0 || target >= outlineDraft.length) return;
  const [item] = outlineDraft.splice(index, 1);
  outlineDraft.splice(target, 0, item);
  outlineDraft = normalizeOutlineItems(outlineDraft);
  renderOutline();
}

function currentElement() {
  if (!deck || !selectedObject || selectedObject.slideIndex !== selected) return null;
  return deck.slides[selected]?.elements?.[selectedObject.elementIndex] || null;
}

function selectObject(index, showInspector = true) {
  const slide = deck?.slides?.[selected];
  if (!slide || !slide.elements[index]) return;
  selectedObject = { slideIndex: selected, elementIndex: index };
  if (showInspector) activeTab = "object";
  render();
}

function updateObjectField(field, value, shouldRender = true) {
  const element = currentElement();
  if (!element) return;
  if (["x", "y", "w", "h", "size", "radius"].includes(field)) {
    const maxByField = { x: W, y: H, w: W, h: H, size: 140, radius: 160 };
    const minByField = { x: 0, y: 0, w: 24, h: 24, size: 10, radius: 0 };
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    element[field] = Math.max(minByField[field], Math.min(maxByField[field], Math.round(numeric)));
  } else if (field === "bold") {
    element.bold = Boolean(value);
  } else if (field === "align") {
    element.align = value;
  } else if (field === "text") {
    element.text = value;
    const slide = deck.slides[selected];
    if (element === titleElement(slide)) {
      slide.title = value.trim() || slide.title;
      if (selected === 0) {
        deck.metadata.title = slide.title;
        deck.metadata.slug = slugify(slide.title);
      }
    }
  } else {
    element[field] = value;
  }
  syncStoryboardState();
  if (!shouldRender) return;
  repairDeckQA(2);
  updateReview();
  render();
}

function addObject(kind) {
  const slide = deck.slides[selected];
  const element = kind === "shape"
    ? el("shape", 1180, 700, 420, 150, { fill: deck.theme.accent, stroke: deck.theme.accent, radius: 18 })
    : text(deck.theme, 220, 780, 740, 72, "New editable text", 34, deck.theme.ink, { bold: true, align: "left", lineHeight: 1.08 });
  slide.elements.push(element);
  selectedObject = { slideIndex: selected, elementIndex: slide.elements.length - 1 };
  activeTab = "object";
  repairDeckQA(2);
  updateReview();
  render();
}

function duplicateObject() {
  const element = currentElement();
  if (!element) return;
  const copy = cloneDeck(element);
  copy.x = Math.min(W - copy.w - 60, copy.x + 54);
  copy.y = Math.min(H - copy.h - 60, copy.y + 54);
  deck.slides[selected].elements.push(copy);
  selectedObject = { slideIndex: selected, elementIndex: deck.slides[selected].elements.length - 1 };
  repairDeckQA(2);
  updateReview();
  render();
}

function deleteObject() {
  if (!selectedObject || selectedObject.slideIndex !== selected) return;
  const slide = deck.slides[selected];
  if (slide.elements.length <= 1) return;
  slide.elements.splice(selectedObject.elementIndex, 1);
  selectedObject = null;
  repairDeckQA(2);
  updateReview();
  render();
}

function commitObjectInspector() {
  if (!currentElement()) return;
  document.querySelectorAll("#objectOutput [data-object-field]").forEach((control) => {
    const field = control.dataset.objectField;
    const value = field === "bold" ? control.value === "true" : control.value;
    updateObjectField(field, value, false);
  });
  repairDeckQA(2);
  updateReview();
  render();
}

function renderStrip() {
  const strip = $("slideStrip");
  strip.innerHTML = "";
  deck.slides.forEach((slide, i) => {
    const btn = document.createElement("button");
    btn.className = `thumb ${i === selected ? "active" : ""}`;
    btn.onclick = () => {
      selected = i;
      selectedObject = null;
      render();
    };
    const preview = document.createElement("div");
    preview.className = "thumb-preview";
    const mini = document.createElement("div");
    mini.className = "mini";
    mini.style.width = `${W}px`;
    mini.style.height = `${H}px`;
    mini.style.transform = "scale(0.092)";
    renderSlideInto(mini, slide, false);
    preview.appendChild(mini);
    const label = document.createElement("div");
    label.className = "thumb-title";
    label.textContent = `${i + 1}. ${slide.title || slide.layout}`;
    btn.append(preview, label);
    strip.appendChild(btn);
  });
}

function manifest() {
  const factCheck = deck.factCheck || analyzeFactCheck();
  const arabicAudit = deck.review?.arabicAudit || analyzeArabicLuxeQuality(deck);
  return {
    schemaVersion: deck.schemaVersion,
    format: deck.format,
    metadata: deck.metadata,
    canvas: deck.canvas,
    theme: deck.theme,
    brand: deck.brand,
    template: deck.template || null,
    evidence: deck.evidence,
    sources: deck.sources || [],
    documents: deck.documents || [],
    charts: deck.charts || [],
    references: deck.references || [],
    referenceAnalysis: deck.referenceAnalysis || referenceAnalysis || null,
    deckDNA: deck.deckDNA || buildDeckDNA(deck),
    briefing: deck.briefing || buildBriefing(deck),
    sourceMap: deck.sourceMap || buildSourceMap(deck.sources || [], deck.evidence || []),
    factCheck,
    review: deck.review,
    arabicAudit,
    variants: deck.variants || [],
    outline: deck.outline || outlineDraft || [],
    storyboard: deck.storyboard || buildStoryboard(),
    keywords: deck.keywords,
    strategy: deck.strategy,
    plan: deck.plan,
    qa: deck.qa,
    playlist: deck.playlist
  };
}

function slideToHtml(slide) {
  const hasRtl = slide.elements.some((element) => element.type === "text" && element.rtl);
  const objects = slide.elements.map((element) => {
    const common = `position:absolute; left:${element.x}px; top:${element.y}px; width:${element.w}px; height:${element.h}px;`;
    if (element.type === "text") {
      const family = fontStackForElement(element);
      return `<div data-object="true" data-object-type="text" style="${common} color:${element.fill}; font-family:${family}; font-size:${element.size}px; font-weight:${element.bold ? 800 : 500}; line-height:${element.lineHeight || 1.1}; text-align:${element.align}; direction:${element.rtl ? "rtl" : "ltr"}; letter-spacing:0; white-space:pre-wrap; overflow:hidden;">${escapeHtml(element.text || "")}</div>`;
    }
    if (element.type === "image") {
      return `<div data-object="true" data-object-type="image" style="${common} background:${element.fill || "#111111"}; border:1px solid ${element.stroke || "transparent"}; border-radius:${element.radius || 0}px; overflow:hidden;"><img src="${escapeHtml(element.src || "")}" alt="${escapeHtml(element.alt || "")}" style="width:100%;height:100%;object-fit:${escapeHtml(element.fit || "cover")};display:block;"></div>`;
    }
    return `<div data-object="true" data-object-type="${element.type}" style="${common} background:${element.fill}; border:1px solid ${element.stroke || element.fill}; border-radius:${element.radius || 0}px;"></div>`;
  }).join("\n    ");
  return `<!doctype html>
<html lang="${hasRtl ? "ar" : "en"}" dir="${hasRtl ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(slide.title)}</title>
  ${hasRtl ? '<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Playfair+Display:wght@400;700;900&family=Tajawal:wght@300;400;500;700;900&display=swap" rel="stylesheet">' : ""}
  <style>body{margin:0}.slide-container{position:relative;width:1920px;height:1080px;overflow:hidden;font-family:${hasRtl ? "Tajawal,Dubai,'Noto Kufi Arabic','Segoe UI',Arial,sans-serif" : "Aptos,'Segoe UI',Arial,sans-serif"}}</style>
</head>
<body>
  <div class="slide-container" data-screen-label="${escapeHtml(slide.title)}">
    ${objects}
  </div>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[ch]));
}

function renderCode() {
  const slide = deck.slides[selected];
  $("codeOutput").textContent = slideToHtml(slide);
}

function renderFiles() {
  const rows = [
    ["/", "folder"],
    [`/${deck.metadata.slug}.slides`, "folder"],
    [`/${deck.metadata.slug}.slides/assets`, "folder"],
    [`/${deck.metadata.slug}.slides/slides`, "folder"],
    [`/${deck.metadata.slug}.slides/manifest.json`, "json"],
    [`/${deck.metadata.slug}.slides/brand.json`, "json"],
    [`/${deck.metadata.slug}.slides/template.json`, "json"],
    [`/${deck.metadata.slug}.slides/evidence.json`, "json"],
    [`/${deck.metadata.slug}.slides/sources.json`, "json"],
    [`/${deck.metadata.slug}.slides/documents.json`, "json"],
    [`/${deck.metadata.slug}.slides/charts.json`, "json"],
    [`/${deck.metadata.slug}.slides/references.json`, "json"],
    [`/${deck.metadata.slug}.slides/reference-analysis.json`, "json"],
    [`/${deck.metadata.slug}.slides/deck-dna.json`, "json"],
    [`/${deck.metadata.slug}.slides/briefing.json`, "json"],
    [`/${deck.metadata.slug}.slides/source-map.json`, "json"],
    [`/${deck.metadata.slug}.slides/fact-check.json`, "json"],
    [`/${deck.metadata.slug}.slides/review.json`, "json"],
    [`/${deck.metadata.slug}.slides/arabic-audit.json`, "json"],
    [`/${deck.metadata.slug}.slides/variants.json`, "json"],
    [`/${deck.metadata.slug}.slides/outline.json`, "json"],
    [`/${deck.metadata.slug}.slides/storyboard.json`, "json"],
    ...deck.slides.map((slide) => [`/${deck.metadata.slug}.slides/slides/${slide.filename}`, "html"])
  ];
  $("fileTree").innerHTML = rows.map(([name, kind]) => `<div class="file-row"><strong>${kind}</strong><span>${name}</span></div>`).join("");
}

function renderAgent() {
  const strategy = deck.strategy || {};
  const cards = [
    ["Brand", strategy.brand || deck.brand?.name || "Unbranded"],
    ["Audience", strategy.audience || ""],
    ["Objective", strategy.objective || ""],
    ["Tone", strategy.tone || ""],
    ["Evidence", `${strategy.evidenceCount || 0} point${strategy.evidenceCount === 1 ? "" : "s"}`],
    ["Sources", `${strategy.sourceCount || 0} source${strategy.sourceCount === 1 ? "" : "s"}`],
    ["Documents", `${strategy.documentCount || 0} document${strategy.documentCount === 1 ? "" : "s"}`],
    ["Charts", `${strategy.chartCount || deck.charts?.length || 0} chart${(strategy.chartCount || deck.charts?.length || 0) === 1 ? "" : "s"}`],
    ["References", `${strategy.referenceCount || deck.references?.length || 0} reference${(strategy.referenceCount || deck.references?.length || 0) === 1 ? "" : "s"}`],
    ["Reference deck", strategy.referenceFingerprint || deck.referenceAnalysis?.fingerprint || "None"],
    ["Deck DNA", deck.deckDNA?.fingerprint || "Style system ready"],
    ["Briefing", `${deck.briefing?.perSlide?.length || 0} slide cues`],
    ["Narrative", strategy.narrative || ""],
    ["Visual direction", strategy.visualDirection || ""],
    ["Export contract", strategy.exportContract || ""]
  ].map(([label, value]) => `<div class="strategy-card"><strong>${label}</strong>${escapeHtml(value)}</div>`).join("");
  const steps = (deck.agentLog || []).map((step) => `
    <article class="agent-step">
      <div class="agent-index">${step.index}</div>
      <div>
        <h3>${escapeHtml(step.title)}</h3>
        <p>${escapeHtml(step.detail)}</p>
      </div>
    </article>
  `).join("");
  $("agentOutput").innerHTML = `<section class="strategy-grid">${cards}</section>${steps}`;
}

function renderReferenceAnalysis() {
  const analysis = deck?.referenceAnalysis || referenceAnalysis;
  const output = $("referenceOutput");
  if (!output) return;
  if (!analysis) {
    output.innerHTML = `
      <article class="reference-empty">
        <h3>No reference deck analyzed</h3>
        <p>Upload a PPTX, ZIP, or HTML deck to inspect its style structure.</p>
      </article>
    `;
    return;
  }
  const synthesizedTheme = synthesizeReferenceTheme(deck?.theme || themes[$("theme")?.value] || themes.executive, analysis);
  const palette = (analysis.palette || []).map((item) => `
    <article class="dna-swatch-card">
      <span class="dna-swatch" style="background:${escapeHtml(item.color)}"></span>
      <div>
        <strong>${escapeHtml(item.color)}</strong>
        <p>${escapeHtml(item.role || "color")} / ${item.count || 0} uses</p>
      </div>
    </article>
  `).join("");
  const structure = Object.entries(analysis.structure || {}).map(([label, value]) => `
    <article class="reference-stat">
      <span>${escapeHtml(label.replace(/([A-Z])/g, " $1"))}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join("");
  const takeaways = (analysis.takeaways || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const samples = (analysis.textSamples || []).slice(0, 6).map((item) => `<span>${escapeHtml(item)}</span>`).join("");
  const recipe = analysis.visualRecipe || {};
  const recipeStats = recipe.available ? `
    <div class="dna-stat-grid">
      <div><strong>${escapeHtml(recipe.benchmark || "Reference")}</strong><span>Benchmark</span></div>
      <div><strong>${escapeHtml(recipe.density || "n/a")}</strong><span>Visual density</span></div>
      <div><strong>${recipe.avgObjectsPerSlide || 0}</strong><span>Objects/slide</span></div>
      <div><strong>${Math.round((recipe.rtlSlideRatio || 0) * 100)}%</strong><span>RTL slides</span></div>
      <div><strong>${Math.round((recipe.chromeSlideRatio || 0) * 100)}%</strong><span>Chrome rhythm</span></div>
      <div><strong>${recipe.maxTitleSize || 0}px</strong><span>Largest title</span></div>
    </div>
    <div class="plan-meta">
      ${(recipe.tags || []).map((tag) => `<span class="plan-chip">${escapeHtml(tag)}</span>`).join("")}
      ${(recipe.topFonts || []).slice(0, 3).map((item) => `<span class="plan-chip">${escapeHtml(item.font)}</span>`).join("")}
    </div>
    <ul class="dna-notes">${(recipe.recommendations || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  ` : "<p>No visual recipe extracted.</p>";
  const outline = (analysis.slideOutline || []).slice(0, 14).map((item) => `
    <article class="reference-outline-card">
      <div class="reference-outline-index">${item.slide || ""}</div>
      <div>
        <h3>${escapeHtml(item.title || `Slide ${item.slide || ""}`)}</h3>
        <div class="plan-meta">
          <span class="plan-chip">${escapeHtml(labelFromLayout(item.suggestedLayout || "slide"))}</span>
          <span class="plan-chip">${escapeHtml(item.visualRole || "body")}</span>
        </div>
        <p>${escapeHtml((item.signals || []).slice(0, 3).join(" / ") || "No text cues extracted.")}</p>
      </div>
    </article>
  `).join("");
  const themeSwatches = ["bg", "paper", "ink", "muted", "accent", "accent2"].map((key) => `
    <article class="reference-stat">
      <span>${escapeHtml(key)}</span>
      <strong><i class="reference-color-dot" style="background:${escapeHtml(synthesizedTheme[key] || "#ffffff")}"></i>${escapeHtml(synthesizedTheme[key] || "")}</strong>
    </article>
  `).join("");
  output.innerHTML = `
    <section class="reference-hero">
      <div>
        <span>Reference Fingerprint</span>
        <strong>${escapeHtml(analysis.fingerprint || "")}</strong>
        <p>${escapeHtml(analysis.summary || "")}</p>
      </div>
      <div class="reference-actions">
        <button data-reference-action="import">Open Editable</button>
        <button data-reference-action="apply">Use Style</button>
        <button data-reference-action="outline">Use Outline</button>
      </div>
    </section>
    <section class="dna-section">
      <h2>Reusable Prompt</h2>
      <p class="dna-prompt">${escapeHtml(analysis.reusablePrompt || "")}</p>
    </section>
    <section class="dna-section">
      <h2>Synthesized Theme</h2>
      <div class="reference-stat-grid">${themeSwatches}</div>
    </section>
    <section class="dna-section">
      <h2>Visual Recipe</h2>
      <p class="dna-prompt">${escapeHtml(recipe.summary || "No visual recipe extracted.")}</p>
      ${recipeStats}
    </section>
    <section class="dna-two-col">
      <article class="dna-section">
        <h2>Palette</h2>
        <div class="dna-palette">${palette || '<p>No colors found.</p>'}</div>
      </article>
      <article class="dna-section">
        <h2>Typography</h2>
        <div class="dna-stat-grid">
          <div><strong>${analysis.typography?.titleSize || 0}px</strong><span>Title max</span></div>
          <div><strong>${analysis.typography?.bodySize || 0}px</strong><span>Body signal</span></div>
          <div><strong>${escapeHtml(analysis.typography?.sizeRange || "n/a")}</strong><span>Range</span></div>
          <div><strong>${analysis.typography?.textRunCount || 0}</strong><span>Text runs</span></div>
        </div>
      </article>
    </section>
    <section class="dna-section">
      <h2>Structure</h2>
      <div class="reference-stat-grid">${structure}</div>
    </section>
    <section class="dna-section">
      <h2>Slide Outline</h2>
      <div class="reference-outline-grid">${outline || '<p>No slide outline extracted.</p>'}</div>
    </section>
    <section class="dna-section">
      <h2>Analyzer Notes</h2>
      <ul class="dna-notes">${takeaways}</ul>
    </section>
    <section class="dna-section">
      <h2>Text Signals</h2>
      <div class="reference-samples">${samples || '<span>No text extracted.</span>'}</div>
    </section>
  `;
}

function renderDeckDNA() {
  const dna = buildDeckDNA(deck);
  deck.deckDNA = dna;
  if (!dna) return;
  const palette = dna.palette.map((item) => `
    <article class="dna-swatch-card">
      <span class="dna-swatch" style="background:${escapeHtml(item.color)}"></span>
      <div>
        <strong>${escapeHtml(item.color)}</strong>
        <p>${escapeHtml(item.role)} / ${item.count} uses / ${item.slideCount} slides</p>
      </div>
    </article>
  `).join("");
  const rhythm = Object.entries(dna.layoutRhythm.layoutCounts || {}).map(([layout, count]) => `
    <span class="dna-chip">${escapeHtml(labelFromLayout(layout))}: ${count}</span>
  `).join("");
  const tokens = Object.entries(dna.styleTokens || {}).map(([label, value]) => `
    <article class="dna-token">
      <span>${escapeHtml(label.replace(/([A-Z])/g, " $1"))}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join("");
  const recommendations = dna.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  $("deckDnaOutput").innerHTML = `
    <section class="dna-hero">
      <div>
        <span>Style Fingerprint</span>
        <strong>${escapeHtml(dna.fingerprint)}</strong>
        <p>${escapeHtml(dna.summary)}</p>
      </div>
      <div class="dna-proof">
        <article><strong>${dna.proofSystem.evidenceCount}</strong><span>Evidence</span></article>
        <article><strong>${dna.proofSystem.referenceCount}</strong><span>References</span></article>
        <article><strong>${dna.proofSystem.chartCount}</strong><span>Charts</span></article>
      </div>
    </section>
    <section class="dna-section">
      <h2>Reusable Prompt</h2>
      <p class="dna-prompt">${escapeHtml(dna.reusablePrompt)}</p>
    </section>
    <section class="dna-section">
      <h2>Palette</h2>
      <div class="dna-palette">${palette}</div>
    </section>
    <section class="dna-two-col">
      <article class="dna-section">
        <h2>Typography</h2>
        <div class="dna-stat-grid">
          <div><strong>${dna.typography.titleSize}px</strong><span>Title max</span></div>
          <div><strong>${dna.typography.bodySize}px</strong><span>Body avg</span></div>
          <div><strong>${dna.typography.sizeRange}</strong><span>Range</span></div>
          <div><strong>${dna.typography.avgCharactersPerSlide}</strong><span>Chars/slide</span></div>
        </div>
      </article>
      <article class="dna-section">
        <h2>Layout Rhythm</h2>
        <div class="dna-chip-row">${rhythm}</div>
        <div class="dna-stat-grid compact">
          <div><strong>${dna.layoutRhythm.avgObjectCount}</strong><span>Objects/slide</span></div>
          <div><strong>${dna.layoutRhythm.visualRatio}</strong><span>Visual ratio</span></div>
          <div><strong>${escapeHtml(dna.layoutRhythm.density)}</strong><span>Density</span></div>
          <div><strong>${escapeHtml(dna.layoutRhythm.primaryLayout)}</strong><span>Primary layout</span></div>
        </div>
      </article>
    </section>
    <section class="dna-section">
      <h2>Style Tokens</h2>
      <div class="dna-token-grid">${tokens}</div>
    </section>
    <section class="dna-section">
      <h2>Creative Director Notes</h2>
      <ul class="dna-notes">${recommendations}</ul>
    </section>
  `;
}

function renderBriefing() {
  const briefing = buildBriefing(deck);
  deck.briefing = briefing;
  if (!briefing) return;
  const keyMessages = briefing.keyMessages.map((item) => `
    <article class="briefing-card">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.message)}</p>
    </article>
  `).join("");
  const evidence = briefing.evidenceCallouts.length
    ? briefing.evidenceCallouts.map((item) => `
      <article class="briefing-card compact">
        <strong>${escapeHtml(item.metric)}</strong>
        <p>${escapeHtml(item.label)} ${escapeHtml(item.citation || "")}</p>
        <span>${escapeHtml(item.source)}</span>
      </article>
    `).join("")
    : '<article class="briefing-card compact"><strong>0</strong><p>No evidence callouts yet.</p></article>';
  const objections = briefing.objectionHandling.map((item) => `
    <article class="briefing-card">
      <h3>${escapeHtml(item.objection)}</h3>
      <p>${escapeHtml(item.response)}</p>
    </article>
  `).join("");
  const perSlide = briefing.perSlide.map((item) => `
    <article class="briefing-slide">
      <div class="briefing-index">${item.slide}</div>
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.cue)}</p>
        <div class="source-claims">
          ${item.evidence.length
            ? item.evidence.map((claim) => `<span class="source-claim">${escapeHtml(claim.metric)} ${escapeHtml(claim.citation || "")}</span>`).join("")
            : '<span class="source-claim muted">No numeric evidence cue</span>'}
        </div>
      </div>
    </article>
  `).join("");
  $("briefingOutput").innerHTML = `
    <section class="briefing-summary">
      <strong>${escapeHtml(briefing.title)}</strong>
      <p>${escapeHtml(briefing.summary)}</p>
      <div class="briefing-two">
        <article><span>Open</span>${escapeHtml(briefing.opening)}</article>
        <article><span>Close</span>${escapeHtml(briefing.close)}</article>
      </div>
    </section>
    <section class="briefing-section">
      <h2>Key Messages</h2>
      <div class="briefing-grid">${keyMessages}</div>
    </section>
    <section class="briefing-section">
      <h2>Evidence Cues</h2>
      <div class="briefing-grid">${evidence}</div>
    </section>
    <section class="briefing-section">
      <h2>Objection Handling</h2>
      <div class="briefing-grid">${objections}</div>
    </section>
    <section class="briefing-section">
      <h2>Slide Talk Track</h2>
      <div class="briefing-list">${perSlide}</div>
    </section>
  `;
}

function renderOutline() {
  const items = normalizeOutlineItems(outlineDraft.length ? outlineDraft : deck.outline || []);
  if (!items.length) {
    $("outlineOutput").innerHTML = `
      <article class="outline-toolbar">
        <div>
          <strong>No outline drafted yet</strong>
          <span>Use Draft Outline to create a slide-by-slide structure before building the deck.</span>
        </div>
        <button data-outline-action="draft">Draft Outline</button>
      </article>
    `;
    return;
  }
  const cards = items.map((item, i) => `
    <article class="outline-card">
      <div class="outline-index">${i + 1}</div>
      <div class="outline-fields">
        <label>
          Slide Title
          <input data-outline-action="title" data-outline-index="${i}" value="${escapeHtml(item.title)}">
        </label>
        <label>
          Brief
          <textarea data-outline-action="brief" data-outline-index="${i}">${escapeHtml(item.brief)}</textarea>
        </label>
        <label>
          Speaker Notes
          <textarea data-outline-action="notes" data-outline-index="${i}">${escapeHtml(item.speakerNotes)}</textarea>
        </label>
        <div class="plan-meta">
          <span class="plan-chip">${escapeHtml(item.layout)}</span>
          <span class="plan-chip">${escapeHtml(item.role)}</span>
          <span class="plan-chip">${escapeHtml(item.qaFocus || "QA")}</span>
        </div>
      </div>
      <div class="outline-actions">
        <button data-outline-action="up" data-outline-index="${i}" ${i === 0 ? "disabled" : ""}>Up</button>
        <button data-outline-action="down" data-outline-index="${i}" ${i === items.length - 1 ? "disabled" : ""}>Down</button>
      </div>
    </article>
  `).join("");
  $("outlineOutput").innerHTML = `
    <article class="outline-toolbar">
      <div>
        <strong>${items.length}-slide outline</strong>
        <span>${deck.metadata?.outlineStatus === "approved" ? "Approved outline is attached to this deck." : "Review the structure, then build slides from it."}</span>
      </div>
      <div class="button-row">
        <button data-outline-action="draft">Redraft</button>
        <button data-outline-action="build" class="primary">Build Slides</button>
      </div>
    </article>
    ${cards}
  `;
}

function renderPlan() {
  const rows = deck.slides.map((slide, i) => `
    <article class="plan-card">
      <h3>${i + 1}. ${escapeHtml(slide.title || slide.layout)}</h3>
      <p><strong>Brief:</strong> ${escapeHtml(slide.brief || "")}</p>
      <p><strong>Speaker note:</strong> ${escapeHtml(slide.speakerNotes || "")}</p>
      <div class="plan-meta">
        <span class="plan-chip">${escapeHtml(slide.layout)}</span>
        <span class="plan-chip">${escapeHtml(slide.qaFocus || "QA")}</span>
        <span class="plan-chip">${slide.elements.length} objects</span>
      </div>
    </article>
  `).join("");
  $("planOutput").innerHTML = rows;
}

function renderObjectInspector() {
  const slide = deck.slides[selected];
  const element = currentElement();
  if (!element) {
    $("objectOutput").innerHTML = `
      <article class="object-card">
        <h3>No object selected</h3>
        <p>Click any slide object in Preview, or add a new object to the selected slide.</p>
        <div class="object-actions">
          <button data-object-action="addText">Add Text</button>
          <button data-object-action="addShape">Add Shape</button>
        </div>
      </article>
    `;
    return;
  }
  const isText = element.type === "text";
  $("objectOutput").innerHTML = `
    <article class="object-card">
      <h3>${escapeHtml(isText ? "Text Object" : `${labelFromLayout(element.type)} Object`)}</h3>
      <p>Slide ${selected + 1}: ${escapeHtml(slide.title || slide.layout)}</p>
      <div class="object-grid">
        <label>X <input data-object-field="x" type="number" value="${Math.round(element.x)}"></label>
        <label>Y <input data-object-field="y" type="number" value="${Math.round(element.y)}"></label>
        <label>Width <input data-object-field="w" type="number" value="${Math.round(element.w)}"></label>
        <label>Height <input data-object-field="h" type="number" value="${Math.round(element.h)}"></label>
      </div>
      ${isText ? `
        <label>Text
          <textarea data-object-field="text">${escapeHtml(element.text || "")}</textarea>
        </label>
        <div class="object-grid two">
          <label>Font Size <input data-object-field="size" type="number" min="10" max="140" value="${Math.round(element.size || 28)}"></label>
          <label>Text Color <input data-object-field="fill" type="color" value="${escapeHtml(normalizeHex(element.fill, "#111827"))}"></label>
          <label>Align
            <select data-object-field="align">
              ${["left", "center", "right"].map((value) => `<option value="${value}" ${element.align === value ? "selected" : ""}>${labelFromLayout(value)}</option>`).join("")}
            </select>
          </label>
          <label>Bold
            <select data-object-field="bold">
              <option value="true" ${element.bold ? "selected" : ""}>On</option>
              <option value="false" ${!element.bold ? "selected" : ""}>Off</option>
            </select>
          </label>
        </div>
      ` : `
        <div class="object-grid two">
          <label>Fill <input data-object-field="fill" type="color" value="${escapeHtml(normalizeHex(element.fill, deck.theme.accent))}"></label>
          <label>Stroke <input data-object-field="stroke" type="color" value="${escapeHtml(normalizeHex(element.stroke || element.fill, deck.theme.accent))}"></label>
          <label>Radius <input data-object-field="radius" type="number" min="0" max="160" value="${Math.round(element.radius || 0)}"></label>
          <label>Type <input value="${escapeHtml(element.type)}" disabled></label>
        </div>
      `}
      <div class="object-actions">
        <button data-object-action="apply" class="primary">Apply</button>
        <button data-object-action="duplicate">Duplicate</button>
        <button data-object-action="delete">Delete</button>
        <button data-object-action="addText">Add Text</button>
        <button data-object-action="addShape">Add Shape</button>
      </div>
    </article>
  `;
}

function renderTemplates() {
  const output = $("templateOutput");
  if (!output) return;
  const templates = loadTemplates();
  if (!templates.length) {
    output.innerHTML = `
      <article class="template-card">
        <h3>No templates saved</h3>
        <p>Save the current brand and theme to reuse it on future decks.</p>
      </article>
    `;
    return;
  }
  output.innerHTML = templates.map((template) => {
    const swatches = ["bg", "paper", "ink", "accent", "accent2"].map((key) => (
      `<span class="template-swatch" style="background:${escapeHtml(template.theme?.[key] || "#ffffff")}"></span>`
    )).join("");
    return `
      <article class="template-card ${$("templateSelect")?.value === template.id ? "active" : ""}">
        <div class="template-head">
          <div>
            <h3>${escapeHtml(template.name)}</h3>
            <p>${escapeHtml(template.brand?.name || "Unbranded")} / ${escapeHtml(template.brand?.tone || "Board-ready")}</p>
          </div>
          <div class="template-swatches">${swatches}</div>
        </div>
        <div class="plan-meta">
          <span class="plan-chip">${escapeHtml(template.theme?.name || template.themeKey || "Theme")}</span>
          <span class="plan-chip">${escapeHtml(template.density || "balanced")}</span>
          <span class="plan-chip">${template.slideCount || template.layoutSignature?.length || 0} slides</span>
          ${template.deckDNA?.fingerprint ? `<span class="plan-chip">${escapeHtml(template.deckDNA.fingerprint)}</span>` : ""}
        </div>
        <div class="template-actions">
          <button data-template-action="select" data-template-id="${template.id}">Select</button>
          <button data-template-action="apply" data-template-id="${template.id}">Apply</button>
          <button data-template-action="delete" data-template-id="${template.id}">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderStoryboard() {
  const items = deck.storyboard || buildStoryboard();
  $("storyboardOutput").innerHTML = items.map((item, i) => `
    <article class="story-card">
      <div class="story-index">${i + 1}</div>
      <div class="story-fields">
        <label>
          Slide Title
          <input data-story-action="title" data-story-index="${i}" value="${escapeHtml(item.title)}">
        </label>
        <label>
          Speaker Notes
          <textarea data-story-action="notes" data-story-index="${i}">${escapeHtml(item.speakerNotes)}</textarea>
        </label>
        <div class="plan-meta">
          <span class="plan-chip">${escapeHtml(item.layout)}</span>
          <span class="plan-chip">${escapeHtml(item.qaFocus || "QA")}</span>
          <span class="plan-chip">${escapeHtml(item.filename)}</span>
        </div>
      </div>
      <div class="story-actions">
        <button data-story-action="up" data-story-index="${i}" ${i === 0 ? "disabled" : ""}>Up</button>
        <button data-story-action="down" data-story-index="${i}" ${i === items.length - 1 ? "disabled" : ""}>Down</button>
      </div>
    </article>
  `).join("");
}

function renderEvidence() {
  const items = deck.evidence || [];
  if (!items.length) {
    $("evidenceOutput").innerHTML = '<article class="evidence-card"><strong>0</strong>No supplied evidence points<span>Deck content is generated from the request and brief.</span></article>';
    return;
  }
  $("evidenceOutput").innerHTML = items.map((item, i) => `
    <article class="evidence-card">
      <strong>${escapeHtml(item.metric)}</strong>
      ${escapeHtml(item.label)}
      <span>${i + 1}. ${escapeHtml(item.source || "User brief")}</span>
    </article>
  `).join("");
}

function renderSources() {
  const sources = deck.sources || [];
  if (!sources.length) {
    $("sourcesOutput").innerHTML = '<article class="source-card"><strong>0 sources</strong><p>No source brief supplied.</p></article>';
    return;
  }
  const evidenceBySource = new Map();
  (deck.evidence || []).forEach((item) => {
    if (!item.sourceId) return;
    if (!evidenceBySource.has(item.sourceId)) evidenceBySource.set(item.sourceId, []);
    evidenceBySource.get(item.sourceId).push(item);
  });
  $("sourcesOutput").innerHTML = sources.map((source, i) => {
    const claims = evidenceBySource.get(source.id) || [];
    const claimList = claims.length
      ? claims.map((claim) => `<span class="source-claim">${escapeHtml(claim.metric)} ${escapeHtml(claim.label)}</span>`).join("")
      : '<span class="source-claim muted">Qualitative source</span>';
    return `
      <article class="source-card">
        <div class="source-head">
          <strong>${i + 1}. ${escapeHtml(source.label)}</strong>
          <span>${escapeHtml(source.type)}</span>
        </div>
        <p>${escapeHtml(source.excerpt || "")}</p>
        ${source.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(sourceHostname(source.url) || source.url)}</a>` : ""}
        <div class="source-claims">${claimList}</div>
      </article>
    `;
  }).join("");
}

function renderDocuments() {
  const documents = deck.documents || [];
  if (!documents.length) {
    $("documentsOutput").innerHTML = '<article class="document-card"><strong>0 documents</strong><p>No document brief supplied.</p></article>';
    return;
  }
  const evidenceBySource = new Map();
  (deck.evidence || []).forEach((item) => {
    if (!item.sourceId) return;
    if (!evidenceBySource.has(item.sourceId)) evidenceBySource.set(item.sourceId, []);
    evidenceBySource.get(item.sourceId).push(item);
  });
  $("documentsOutput").innerHTML = documents.map((item, i) => {
    const claims = evidenceBySource.get(item.id) || [];
    return `
      <article class="document-card">
        <div class="document-head">
          <strong>${i + 1}. ${escapeHtml(item.name)}</strong>
          <span>${item.wordCount || 0} words</span>
        </div>
        <p>${escapeHtml(item.excerpt || "")}</p>
        <div class="source-claims">
          ${claims.length
            ? claims.map((claim) => `<span class="source-claim">${escapeHtml(claim.metric)} ${escapeHtml(claim.label)}</span>`).join("")
            : '<span class="source-claim muted">No numeric claims extracted</span>'}
        </div>
      </article>
    `;
  }).join("");
}

function renderReferences() {
  const references = deck.references || [];
  if (!references.length) {
    $("referencesOutput").innerHTML = '<article class="reference-card"><strong>0 references</strong><p>Add source links, document notes, or evidence provenance to build numbered citations.</p></article>';
    return;
  }
  const evidenceById = new Map((deck.evidence || []).map((item) => [item.id, item]));
  $("referencesOutput").innerHTML = references.map((item) => {
    const claims = (item.evidenceIds || [])
      .map((id) => evidenceById.get(id))
      .filter(Boolean);
    return `
      <article class="reference-card">
        <div class="reference-head">
          <div class="reference-index">${escapeHtml(item.citation)}</div>
          <div>
            <strong>${escapeHtml(item.label)}</strong>
            <p>${escapeHtml(item.excerpt || "No excerpt supplied.")}</p>
          </div>
          <span>${escapeHtml(item.type)}</span>
        </div>
        ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(sourceHostname(item.url) || item.url)}</a>` : ""}
        <div class="source-claims">
          ${claims.length
            ? claims.map((claim) => `<span class="source-claim">${escapeHtml(claim.metric)} ${escapeHtml(claim.label)}</span>`).join("")
            : '<span class="source-claim muted">No mapped numeric claim</span>'}
        </div>
      </article>
    `;
  }).join("");
}

function renderCharts() {
  const charts = deck.charts || [];
  if (!charts.length) {
    $("chartsOutput").innerHTML = '<article class="chart-card"><strong>0 charts</strong><p>Add numeric evidence, source notes, or document claims to generate editable data visuals.</p></article>';
    return;
  }
  $("chartsOutput").innerHTML = charts.map((chart, i) => `
    <article class="chart-card">
      <div class="chart-head">
        <div>
          <strong>${i + 1}. ${escapeHtml(chart.title)}</strong>
          <p>${escapeHtml(chart.subtitle || "")}</p>
        </div>
        <span>${escapeHtml(chart.type)}</span>
      </div>
      <div class="chart-bars">
        ${(chart.items || []).map((item) => `
          <div class="chart-row">
            <div>
              <b>${escapeHtml(item.metric)}</b>
              <span>${escapeHtml(item.label)}</span>
            </div>
            <div class="chart-bar-track">
              <span style="width:${Math.round((item.ratio || 0) * 100)}%"></span>
            </div>
            <em>${escapeHtml(item.source || "")}</em>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function normalizeClaimText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9%$./]+/g, " ").replace(/\s+/g, " ").trim();
}

function slideTextCorpus() {
  return (deck.slides || [])
    .flatMap((slide) => slide.elements || [])
    .filter((element) => element.type === "text")
    .map((element) => element.text || "")
    .join(" ");
}

function analyzeFactCheck() {
  if (!deck) return null;
  const sources = deck.sources || [];
  const evidence = deck.evidence || [];
  const corpus = normalizeClaimText(slideTextCorpus());
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const checks = evidence.map((item, index) => {
    const source = item.sourceId ? sourceById.get(item.sourceId) : sources.find((candidate) => candidate.label === item.source);
    const metricInSlides = item.metric ? corpus.includes(normalizeClaimText(item.metric)) : false;
    const labelWords = normalizeClaimText(item.label).split(" ").filter((word) => word.length > 3);
    const labelHits = labelWords.filter((word) => corpus.includes(word)).length;
    const labelInSlides = labelWords.length ? labelHits / labelWords.length >= 0.45 : true;
    const hasSource = Boolean(source || item.source);
    const documentBacked = source?.type === "document";
    const linked = Boolean(source?.url) || documentBacked;
    const supported = hasSource && (item.metric ? metricInSlides : labelInSlides);
    let status = "pass";
    if (!hasSource) status = "issue";
    else if (!supported) status = "warning";
    else if (!linked && item.sourceId) status = "warning";
    return {
      id: item.id || `ev-${index + 1}`,
      status,
      metric: item.metric,
      label: item.label,
      source: source?.label || item.source || "Missing source",
      sourceType: source?.type || (item.source ? "brief" : "missing"),
      url: source?.url || "",
      metricInSlides,
      labelInSlides,
      linked,
      sourceCue: documentBacked ? "Document source" : linked ? "Linked source" : "Source note",
      detail: !hasSource
        ? "No source is attached to this claim."
        : !supported
          ? item.metric && !metricInSlides
            ? "Claim is sourced, but the numeric metric is not clearly used in slide text."
            : "Claim is sourced but does not clearly appear in slide text."
          : linked
            ? documentBacked
              ? "Claim appears in the deck and is backed by an uploaded document."
              : "Claim appears in the deck and has a linked source."
            : "Claim appears in the deck with source notes but no URL."
    };
  });
  const unsupportedNumbers = [];
  const evidenceMetrics = new Set(evidence.map((item) => normalizeClaimText(item.metric)).filter(Boolean));
  const numberMatches = slideTextCorpus().match(/[$]?\d[\d,.]*(?:\s?(?:%|x|k|m|b|days|weeks|hours|hrs|users|customers|sites|\+)(?:\/(?:day|week|month|year|mo|yr))?)?/gi) || [];
  [...new Set(numberMatches.map((item) => item.trim()).filter(Boolean))].forEach((value) => {
    const normalized = normalizeClaimText(value);
    const bareSmallNumber = /^0?\d+$/.test(normalized) && Number(normalized) <= 10;
    const commonTimelineNumber = /^(30|60|90)$/.test(normalized);
    const monthMarker = /^0[1-9]\s?m$/.test(normalized);
    if (normalized && !evidenceMetrics.has(normalized) && !bareSmallNumber && !commonTimelineNumber && !monthMarker) {
      unsupportedNumbers.push(value);
    }
  });
  const issueCount = checks.filter((item) => item.status === "issue").length;
  const warningCount = checks.filter((item) => item.status === "warning").length + Math.min(unsupportedNumbers.length, 3);
  const passCount = checks.filter((item) => item.status === "pass").length;
  const linkedCount = checks.filter((item) => item.linked).length;
  const noEvidencePenalty = evidence.length ? 0 : 34;
  const score = clampScore(100 - issueCount * 22 - warningCount * 9 - noEvidencePenalty + Math.min(6, linkedCount * 2));
  return {
    score,
    status: !evidence.length ? "No evidence" : issueCount ? "Needs sources" : warningCount ? "Review claims" : "Verified",
    generatedAt: new Date().toISOString(),
    summary: {
      evidenceCount: evidence.length,
      sourceCount: sources.length,
      linkedSourceCount: sources.filter((source) => source.url).length,
      documentSourceCount: sources.filter((source) => source.type === "document").length,
      passCount,
      warningCount,
      issueCount,
      unsupportedNumberCount: unsupportedNumbers.length
    },
    checks,
    unsupportedNumbers
  };
}

function updateFactCheck() {
  deck.factCheck = analyzeFactCheck();
  return deck.factCheck;
}

function renderFactCheck() {
  const report = updateFactCheck();
  if (!report) return;
  const sourceSupport = [
    report.summary.linkedSourceCount ? `${report.summary.linkedSourceCount} linked` : "",
    report.summary.documentSourceCount ? `${report.summary.documentSourceCount} document-backed` : ""
  ].filter(Boolean).join(", ") || "0 linked";
  const rows = report.checks.length
    ? report.checks.map((item) => `
      <article class="fact-card ${item.status}">
        <div class="fact-status">${escapeHtml(item.status.toUpperCase())}</div>
        <div>
          <h3>${escapeHtml(item.metric || "Claim")} ${escapeHtml(item.label || "")}</h3>
          <p>${escapeHtml(item.detail)}</p>
          <div class="plan-meta">
            <span class="plan-chip">${escapeHtml(item.source)}</span>
            <span class="plan-chip">${item.metricInSlides ? "Metric in slides" : "Metric not found"}</span>
            <span class="plan-chip">${escapeHtml(item.sourceCue || (item.linked ? "Linked source" : "Source note"))}</span>
          </div>
        </div>
      </article>
    `).join("")
    : '<article class="fact-card warning"><div class="fact-status">WARN</div><div><h3>No evidence to check</h3><p>Add evidence rows or source notes to enable claim checking.</p></div></article>';
  const unsupported = report.unsupportedNumbers.length
    ? `<article class="fact-card warning"><div class="fact-status">WARN</div><div><h3>Numbers Without Evidence</h3><p>${escapeHtml(report.unsupportedNumbers.slice(0, 10).join(", "))}</p></div></article>`
    : "";
  $("factCheckOutput").innerHTML = `
    <article class="fact-summary">
      <strong>${report.score}</strong>
      <span>${escapeHtml(report.status)}</span>
      <p>${report.summary.evidenceCount} evidence point${report.summary.evidenceCount === 1 ? "" : "s"}, ${report.summary.sourceCount} source${report.summary.sourceCount === 1 ? "" : "s"}, ${sourceSupport}.</p>
    </article>
    ${unsupported}
    ${rows}
  `;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countArabicChars(value) {
  return (String(value || "").match(/[\u0600-\u06ff]/g) || []).length;
}

function countLatinChars(value) {
  return (String(value || "").match(/[A-Za-z]/g) || []).length;
}

function analyzeArabicLuxeQuality(deckInput = deck) {
  const theme = deckInput?.theme || {};
  const slides = deckInput?.slides || [];
  const textElements = slides.flatMap((slide) => (slide.elements || []).filter((element) => element.type === "text"));
  const shapeElements = slides.flatMap((slide) => (slide.elements || []).filter((element) => ["shape", "imageBlock"].includes(element.type)));
  const rtlText = textElements.filter((element) => element.rtl);
  const rtlOrArabic = textElements.filter((element) => element.rtl || countArabicChars(element.text));
  const applies = !!theme.rtlPremium || rtlOrArabic.length >= Math.max(3, Math.ceil(textElements.length * 0.35));
  if (!applies) {
    return { applies: false, score: 0, detail: "Arabic premium benchmark is not active.", signals: [], recommendations: [] };
  }

  const allText = textElements.map((element) => element.text || "").join(" ");
  const isCinematic = !!theme.cinematicStory;
  const commonLatinIgnore = /\b(DECKFORGE|SHARAYEH|AI|PPTX|PDF|TAM|OUR|VISION|CONTACT|EST|BUILT|WITH)\b/gi;
  const cinematicLatinIgnore = /\b(CASE|STUDY|ORIGIN|TIMELINE|SCALE|FINANCE|ACQUISITIONS|TRANSFORMATION|CULTURE|LESSONS|FINALE|FACEBOOK|META|INSTAGRAM|WHATSAPP|OCULUS|MOVE|FAST|BOLD|IMPACT|OPEN|VOL|FIN|MMXXVI|IPO|MAU)\b/gi;
  const scoredTextElements = isCinematic
    ? textElements.filter((element) => {
      const value = String(element.text || "").trim();
      const arabicCount = countArabicChars(value);
      const latinCount = countLatinChars(value);
      const pageIndicator = /^\d{1,2}\s*\/\s*\d{1,2}/.test(value);
      const shortEditorialLatin = arabicCount === 0 && latinCount > 0 && value.length <= 72;
      return !pageIndicator && !shortEditorialLatin;
    })
    : textElements;
  const latinScoreText = isCinematic
    ? textElements.map((element) => {
      const value = String(element.text || "").trim();
      if (countArabicChars(value) === 0 && countLatinChars(value) > 0 && value.length <= 72) return "";
      return value;
    }).join(" ")
    : allText;
  const arabicChars = countArabicChars(allText);
  const latinChars = countLatinChars(latinScoreText.replace(commonLatinIgnore, "").replace(isCinematic ? cinematicLatinIgnore : /$a/, ""));
  const arabicFirstRatio = arabicChars / Math.max(1, arabicChars + latinChars);
  const rtlScoredText = scoredTextElements.filter((element) => element.rtl || countArabicChars(element.text));
  const rtlRatio = rtlScoredText.length / Math.max(1, scoredTextElements.length);
  const arabicDeckFontRatio = rtlText.filter((element) => /tajawal|cairo|amiri/i.test(String(element.font || ""))).length / Math.max(1, rtlText.length);
  const titleCoverage = slides.filter((slide) => (slide.elements || []).some((element) => (
    element.type === "text" && element.rtl && element.bold && Number(element.size) >= 52 && countArabicChars(element.text) >= 4
  ))).length / Math.max(1, slides.length);
  const chromeCoverage = slides.filter((slide) => {
    const texts = (slide.elements || []).filter((element) => element.type === "text").map((element) => element.text || "").join(" ");
    return /الفصل|البداية|السياق|المشكلة|الحل|السوق|الخطة|الخاتمة/.test(texts) || /\d{2}\s*\/\s*\d{2}/.test(texts);
  }).length / Math.max(1, slides.length);
  const darkSurfaceCount = shapeElements.filter((element) => {
    const fill = normalizeHex(element.fill, "").toLowerCase();
    return fill === normalizeHex(theme.bg, "").toLowerCase()
      || ["#0a2540", "#143a6b", "#0a0a0f", "#0a0a0a", "#050505", "#12121a", "#1a1a24"].includes(fill);
  }).length;
  const accentLineCount = shapeElements.filter((element) => {
    const fill = normalizeHex(element.fill, "").toLowerCase();
    return fill === normalizeHex(theme.accent, "").toLowerCase() && (Number(element.w) <= 18 || Number(element.h) <= 8);
  }).length;
  const avgObjects = slides.length ? slides.reduce((sum, slide) => sum + (slide.elements || []).length, 0) / slides.length : 0;
  const premiumCardScore = Math.min(1, avgObjects / 12) * 0.55 + Math.min(1, shapeElements.length / Math.max(1, textElements.length)) * 0.45;
  const bgHex = normalizeHex(theme.bg, "").toLowerCase();
  const accentHex = normalizeHex(theme.accent, "").toLowerCase();
  const luxePalette = bgHex === "#0a2540" && accentHex === "#c9a961";
  const investorPalette = bgHex === "#0a0a0f" && accentHex === "#d4a574";
  const cinematicPalette = bgHex === "#0a0a0a" && accentHex === "#c9a961";
  const paletteScore = luxePalette || investorPalette || cinematicPalette ? 1 : (theme.investorDark ? 0.75 : 0.45);
  const coverDarkSignal = slides.some((slide) => slide.layout === "cover" && (slide.elements || []).some((element) => {
    const fill = normalizeHex(element.fill, "").toLowerCase();
    return ["shape", "imageBlock"].includes(element.type) && ["#0a2540", "#0a0a0f", "#0a0a0a", "#050505", "#12121a"].includes(fill);
  }));
  const score = clampScore(
    (theme.rtlPremium ? 12 : 0)
    + Math.min(1, rtlRatio / 0.65) * 14
    + Math.min(1, arabicDeckFontRatio / 0.8) * 14
    + Math.min(1, arabicFirstRatio / 0.72) * 12
    + paletteScore * 12
    + Math.min(1, chromeCoverage / 0.8) * 12
    + Math.min(1, titleCoverage / 0.9) * 10
    + premiumCardScore * 10
    + (darkSurfaceCount >= slides.length && accentLineCount >= Math.max(2, slides.length - 1) ? 4 : 0)
    + (coverDarkSignal ? 2 : 0)
  );
  const signals = [
    `${Math.round(rtlRatio * 100)}% ${isCinematic ? "scored RTL text objects" : "RTL text objects"}`,
    `${Math.round(arabicDeckFontRatio * 100)}% Arabic deck fonts on RTL text`,
    `${Math.round(arabicFirstRatio * 100)}% Arabic-first copy`,
    `${Math.round(chromeCoverage * 100)}% editorial chrome coverage`,
    `${Math.round(titleCoverage * 100)}% Arabic title hierarchy coverage`,
    `${Math.round(avgObjects)} objects/slide`
  ];
  const recommendations = [];
  if (rtlRatio < 0.65) recommendations.push("Set more text objects to RTL and right alignment.");
  if (arabicDeckFontRatio < 0.8) recommendations.push("Use Cairo, Tajawal, or Amiri consistently for Arabic copy throughout the deck.");
  if (arabicFirstRatio < 0.72) recommendations.push("Reduce untranslated English body copy while keeping purposeful bilingual labels.");
  if (chromeCoverage < 0.8) recommendations.push("Add section kickers, page indicators, or footer bands to match the Arabic benchmark rhythm.");
  if (titleCoverage < 0.9) recommendations.push("Give every slide a large Arabic title with clear hierarchy.");
  if (premiumCardScore < 0.72) recommendations.push("Increase composed card/chrome structure instead of sparse generic layouts.");
  return {
    applies: true,
    score,
    status: score >= 92 ? "Benchmark-grade Arabic RTL" : score >= 82 ? "Arabic RTL ready" : score >= 70 ? "Arabic RTL needs polish" : "Below Arabic benchmark",
    detail: `${score}/100 Arabic premium benchmark: ${signals.join("; ")}.`,
    signals,
    recommendations
  };
}

function analyzeDeck() {
  if (!deck) return null;
  const qaIssues = (deck.qa || []).filter((item) => item.level !== "pass");
  const layouts = deck.slides.map((slide) => slide.layout);
  const investorExpected = deck.theme?.investorDark
    ? ["vision", "problem", "solution", "how-it-works", "traction", "market", "team", "funding"]
    : ["problem", "solution", "market", "product", "business-model", "traction", "gtm", "financials", "ask"];
  const expectedByArchetype = {
    "investor-pitch": investorExpected,
    "success-story": ["origin", "timeline", "scale", "financial-power", "acquisitions", "transformation", "culture", "lessons"],
    sales: ["client-context", "buyer-pain", "proposed-solution", "differentiators", "proof", "scope", "implementation", "commercial-case", "next-steps"],
    training: ["learning-outcomes", "learner-context", "core-concepts", "practice-loop", "example-walkthrough", "checklist", "assessment", "rollout-plan"]
  };
  const expectedLayouts = expectedByArchetype[deck.archetype] || [];
  const expectedCount = expectedLayouts.length
    ? expectedLayouts.filter((layout) => layouts.includes(layout)).length
    : Math.min(5, layouts.length);
  const notesCount = deck.slides.filter((slide) => (slide.speakerNotes || "").length > 12).length;
  const evidenceCount = deck.evidence?.length || 0;
  const sourceCount = deck.sources?.length || 0;
  const chartCount = deck.charts?.length || 0;
  const factCheck = deck.factCheck || analyzeFactCheck();
  const factScore = factCheck?.score || 0;
  const brandReady = deck.brand?.configured ? 1 : 0;
  const qaPenalty = Math.min(30, qaIssues.length * 8);
  const storyScore = clampScore(58 + expectedCount * 4 + (deck.plan?.length === deck.slides.length ? 12 : 0));
  const designScore = clampScore(96 - qaPenalty - Math.max(0, deck.slides.length - 12) * 2);
  const evidenceBase = evidenceCount ? 64 + Math.min(24, evidenceCount * 8) + Math.min(8, sourceCount * 2) : sourceCount ? 56 + Math.min(16, sourceCount * 4) : 42;
  const evidenceScore = clampScore(evidenceCount || sourceCount ? Math.round(evidenceBase * 0.72 + factScore * 0.28) : evidenceBase);
  const deliveryScore = clampScore(54 + Math.round((notesCount / Math.max(1, deck.slides.length)) * 34) + brandReady * 8);
  const exportScore = clampScore(68 + (deck.metadata?.slug ? 8 : 0) + (deck.brand ? 8 : 0) + (deck.evidence ? 8 : 0) + (chartCount ? 4 : 0) + (!qaIssues.length ? 8 : 0));
  const arabicAudit = analyzeArabicLuxeQuality(deck);
  const items = [
    ["Story", storyScore, expectedLayouts.length ? `${expectedCount}/${expectedLayouts.length} ${deck.archetype.replace("-", " ")} sections present.` : "Narrative has opening, proof, operating plan, and close."],
    ["Design", designScore, qaIssues.length ? `${qaIssues.length} QA warning or issue${qaIssues.length === 1 ? "" : "s"} remain.` : "No overflow, contrast, hierarchy, or edge issues detected."],
    ["Evidence", evidenceScore, evidenceCount ? `${evidenceCount} evidence point${evidenceCount === 1 ? "" : "s"}, ${sourceCount} source${sourceCount === 1 ? "" : "s"}, and ${chartCount} editable chart${chartCount === 1 ? "" : "s"} are mapped into the deck. Fact-check ${factScore}: ${factCheck?.status || "Not run"}.` : "Add evidence rows or source notes to ground metrics and claims."],
    ["Delivery", deliveryScore, `${notesCount}/${deck.slides.length} slides include speaker notes.`],
    ["Export", exportScore, "PPTX, PDF, project manifest, deck DNA, briefing, brand, evidence, charts, and notes are export-ready."]
  ].map(([label, score, detail]) => ({ label, score, detail }));
  if (arabicAudit.applies) {
    items.push({ label: "Arabic RTL", score: arabicAudit.score, detail: arabicAudit.detail });
  }
  const overall = clampScore(items.reduce((sum, item) => sum + item.score, 0) / items.length);
  const recommendations = items
    .filter((item) => item.score < 85)
    .map((item) => `${item.label}: ${item.detail}`);
  if (arabicAudit.applies) recommendations.push(...arabicAudit.recommendations.map((item) => `Arabic RTL: ${item}`));
  return {
    overall,
    status: overall >= 90 ? "Board-ready" : overall >= 80 ? "Client-ready" : overall >= 70 ? "Needs polish" : "Draft",
    generatedAt: new Date().toISOString(),
    items,
    arabicAudit,
    recommendations
  };
}

function updateReview() {
  updateFactCheck();
  deck.review = analyzeDeck();
  if (deck.review?.arabicAudit?.applies) {
    deck.metadata.arabicBenchmarkScore = deck.review.arabicAudit.score;
    deck.metadata.arabicBenchmarkStatus = deck.review.arabicAudit.status;
  }
  return deck.review;
}

function renderReview() {
  const review = deck.review || updateReview();
  const cards = review.items.map((item) => `
    <article class="review-card">
      <div class="review-score">${item.score}</div>
      <div>
        <h3>${escapeHtml(item.label)}</h3>
        <p>${escapeHtml(item.detail)}</p>
      </div>
    </article>
  `).join("");
  const recommendations = review.recommendations.length
    ? `<p>${escapeHtml(review.recommendations.join(" "))}</p>`
    : "<p>No major pre-export gaps detected.</p>";
  $("reviewOutput").innerHTML = `
    <section class="review-summary">
      <strong>${review.overall}</strong>
      ${escapeHtml(review.status)}
      ${recommendations}
    </section>
    ${cards}
  `;
}

function variantSummary(request) {
  const text = request || "Board-ready alternate with tighter copy and stronger decision framing";
  if (/data|metric|evidence|proof/i.test(text)) return "Data-forward variant with a stronger evidence signal.";
  if (/visual|diagram|simple|less text/i.test(text)) return "More visual variant with tighter supporting copy.";
  if (/executive|board|premium|investor|client/i.test(text)) return "Executive polish variant with cleaner hierarchy.";
  return text;
}

function buildSlideVariant(source, request) {
  const variant = cloneDeck(source);
  const lower = String(request || "").toLowerCase();
  variant.variantOf = source.id;
  variant.variantCreatedAt = new Date().toISOString();
  variant.speakerNotes = `${variant.speakerNotes || variant.brief || ""} Variant note: compare this version for sharper narrative fit before applying.`.trim();
  variant.elements.forEach((element) => {
    if (element.type === "shape" && element.fill === "#ffffff" && /executive|board|premium|client|investor|proof|data|metric/.test(lower)) {
      element.fill = "#f8fafc";
    }
    if (element.type !== "text") return;
    if (!element.bold) {
      element.size = Math.max(16, element.size - 1);
    }
    if (/visual|simple|less text|concise|short/.test(lower) && !element.bold && (element.text || "").length > 90) {
      element.text = `${element.text.split(/\s+/).slice(0, 14).join(" ")}...`;
    }
  });
  const title = variant.elements.find((element) => element.type === "text" && element.bold && element.size >= 48);
  if (title && /short|concise|simple/.test(lower)) {
    title.text = title.text.split(/\s+/).slice(0, 5).join(" ");
  }
  if (/data|metric|evidence|proof/.test(lower) || (!lower && deck.evidence?.length)) {
    const evidence = deck.evidence?.[0];
    const metric = evidence?.metric || "Key";
    const label = evidence?.label || "decision signal";
    variant.elements.push(el("shape", 1280, 174, 370, 120, { fill: deck.theme.accent, stroke: deck.theme.accent, radius: 18 }));
    variant.elements.push(text(deck.theme, 1310, 200, 310, 48, metric, metricSize(metric, 38), deck.theme.white, { bold: true, align: "center" }));
    variant.elements.push(text(deck.theme, 1310, 250, 310, 28, label, 18, deck.theme.white, { align: "center" }));
  } else {
    variant.elements.push(el("shape", 126, 928, 320, 8, { fill: deck.theme.accent, stroke: deck.theme.accent, radius: 4 }));
  }
  return variant;
}

function createSlideVariant() {
  if (!deck) return;
  const source = deck.slides[selected];
  const request = $("editRequest").value.trim();
  const variantSlide = buildSlideVariant(source, request);
  const item = {
    id: `variant-${Date.now()}`,
    slideIndex: selected,
    slideTitle: source.title || source.layout,
    createdAt: new Date().toISOString(),
    instruction: request || "Board-ready alternate",
    summary: variantSummary(request),
    slide: variantSlide
  };
  deck.variants = [item, ...(deck.variants || [])].slice(0, 24);
  deck.metadata.variantCount = deck.variants.length;
  deck.agentLog = [
    ...(deck.agentLog || []),
    {
      index: (deck.agentLog || []).length + 1,
      title: "Create variant",
      detail: `Created an alternate version of slide ${selected + 1}: ${item.summary}`
    }
  ];
  $("editRequest").value = "";
  activeTab = "variants";
  updateReview();
  render();
}

function applyVariant(id) {
  const variant = (deck.variants || []).find((item) => item.id === id);
  if (!variant) return;
  deck.slides[variant.slideIndex] = cloneDeck(variant.slide);
  selected = variant.slideIndex;
  deck.metadata.variantAppliedAt = new Date().toISOString();
  runQA(false);
  updateReview();
  activeTab = "preview";
  render();
}

function deleteVariant(id) {
  deck.variants = (deck.variants || []).filter((item) => item.id !== id);
  deck.metadata.variantCount = deck.variants.length;
  activeTab = "variants";
  render();
}

function renderVariants() {
  const variants = (deck.variants || []).filter((item) => item.slideIndex === selected);
  if (!variants.length) {
    $("variantsOutput").innerHTML = '<article class="variant-card"><div class="variant-preview"></div><div><h3>No variants for this slide</h3><p>Create a slide variant from the edit panel to compare alternate copy, hierarchy, or evidence emphasis.</p></div></article>';
    return;
  }
  $("variantsOutput").innerHTML = variants.map((item) => `
    <article class="variant-card">
      <div class="variant-preview" data-variant-id="${item.id}"></div>
      <div>
        <h3>${escapeHtml(item.slideTitle)} variant</h3>
        <p>${escapeHtml(item.summary)}<br>${escapeHtml(new Date(item.createdAt).toLocaleString())}</p>
        <div class="variant-actions">
          <button data-variant-action="apply" data-variant-id="${item.id}">Apply Variant</button>
          <button data-variant-action="delete" data-variant-id="${item.id}">Delete</button>
        </div>
      </div>
    </article>
  `).join("");
  $("variantsOutput").querySelectorAll(".variant-preview").forEach((preview) => {
    const item = variants.find((variant) => variant.id === preview.dataset.variantId);
    if (!item) return;
    const mini = document.createElement("div");
    mini.className = "mini";
    mini.style.width = `${W}px`;
    mini.style.height = `${H}px`;
    mini.style.transform = "scale(0.1146)";
    renderSlideInto(mini, item.slide, false);
    preview.appendChild(mini);
  });
}

function contrast(hexA, hexB) {
  const toRgb = (hex) => {
    const v = (hex || "#000000").replace("#", "");
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) || 0);
  };
  const lum = (rgb) => {
    const f = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  };
  const l1 = lum(toRgb(hexA));
  const l2 = lum(toRgb(hexB));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function hasArabicMojibake(value) {
  const textValue = String(value || "");
  if (!textValue) return false;
  const latin1Noise = /[§©®±µ¶¸¹º»¼½¾¿]/.test(textValue) && countArabicChars(textValue) >= 2;
  const utfNoise = /(?:[ØÙÃÂ][\u0080-\u00FF]){2,}/.test(textValue);
  const cp1256Noise = /(?:ط[§©®±µ¶·¸¹º»¼½¾¿]|ظ[€پ‚ƒ„…†‡ˆ‰ٹ‹Œچڈژ‘’“”•–—ک›œ‌‍‏])/u.test(textValue);
  return latin1Noise || utfNoise || cp1256Noise;
}

function isArabicDeckFont(font) {
  return /tajawal|cairo|amiri|dubai|noto kufi arabic|noto sans arabic|ibm plex sans arabic|segoe ui/i.test(String(font || ""));
}

function analyzeArabicTextGate(deckInput = deck) {
  const slides = deckInput?.slides || [];
  const theme = deckInput?.theme || {};
  const textElements = slides.flatMap((slide, slideIndex) => (
    (slide.elements || [])
      .map((element, elementIndex) => ({ ...element, slideIndex, elementIndex }))
      .filter((element) => element.type === "text")
  ));
  const arabicText = textElements.filter((element) => countArabicChars(element.text) >= 2);
  const suspectEncodingText = textElements.filter((element) => hasArabicMojibake(element.text));
  const applies = !!theme.rtlPremium || arabicText.length >= 3 || suspectEncodingText.length > 0;
  if (!applies) {
    return { applies: false, issues: [], warnings: [], score: 100, signals: [] };
  }

  const corrupted = suspectEncodingText;
  const missingRtl = arabicText.filter((element) => !element.rtl || !["right", "center"].includes(String(element.align || "").toLowerCase()));
  const weakFonts = arabicText.filter((element) => !isArabicDeckFont(element.font));
  const total = Math.max(1, arabicText.length);
  const score = clampScore(
    100
    - corrupted.length * 24
    - Math.round((missingRtl.length / total) * 28)
    - Math.round((weakFonts.length / total) * 18)
  );
  const issues = corrupted.map((element) => ({
    level: "issue",
    slide: element.slideIndex + 1,
    message: `Arabic text appears encoding-corrupted: "${String(element.text || "").slice(0, 54)}"`,
    fix: null
  }));
  const warnings = [];
  missingRtl.slice(0, 8).forEach((element) => {
    warnings.push({
      level: "warning",
      slide: element.slideIndex + 1,
      message: `Arabic text should be RTL and right-aligned: "${String(element.text || "").slice(0, 54)}"`,
      fix: () => {
        const original = slides[element.slideIndex]?.elements?.[element.elementIndex];
        if (original) {
          original.rtl = true;
          original.align = "right";
        }
      }
    });
  });
  weakFonts.slice(0, 8).forEach((element) => {
    warnings.push({
      level: "warning",
      slide: element.slideIndex + 1,
      message: `Arabic text uses a non-Arabic deck font: "${String(element.text || "").slice(0, 54)}"`,
      fix: () => {
        const original = slides[element.slideIndex]?.elements?.[element.elementIndex];
        if (original) original.font = theme.fontArabic || "Tajawal";
      }
    });
  });
  return {
    applies: true,
    score,
    issues,
    warnings,
    signals: [
      `${arabicText.length} Arabic text objects`,
      `${corrupted.length} encoding risk${corrupted.length === 1 ? "" : "s"}`,
      `${missingRtl.length} RTL/alignment warning${missingRtl.length === 1 ? "" : "s"}`,
      `${weakFonts.length} Arabic font warning${weakFonts.length === 1 ? "" : "s"}`
    ]
  };
}

function runQA(shouldRender = true) {
  if (!deck) return [];
  const results = [];
  deck.slides.forEach((slide, slideIndex) => {
    slide.elements.forEach((element) => {
      if (element.type !== "text") return;
      const capacity = Math.max(24, Math.floor((element.w * element.h) / (element.size * element.size * 0.62)));
      const textLength = (element.text || "").replace(/\s+/g, " ").length;
      if (textLength > capacity) {
        results.push({
          level: "issue",
          slide: slideIndex + 1,
          message: `Text may overflow: "${(element.text || "").slice(0, 54)}"`,
          fix: () => { element.size = Math.max(18, Math.round(element.size * 0.88)); element.h += 24; }
        });
      }
      if (element.x < 40 || element.y < 40 || element.x + element.w > W - 30 || element.y + element.h > H - 30) {
        results.push({
          level: "warning",
          slide: slideIndex + 1,
          message: `Object is close to slide edge: "${(element.text || "").slice(0, 54)}"`,
          fix: () => {
            element.x = Math.max(70, Math.min(element.x, W - element.w - 70));
            element.y = Math.max(70, Math.min(element.y, H - element.h - 70));
          }
        });
      }
    });
    slide.elements.forEach((element) => {
      if (element.type !== "image") return;
      const src = String(element.src || "");
      if (!src.startsWith("data:image/") && !/^https?:\/\//i.test(src)) {
        results.push({
          level: "issue",
          slide: slideIndex + 1,
          message: `Image object is missing an embedded or reachable source in ${slide.filename}.`,
          fix: null
        });
      }
      if (Number(element.w) < 40 || Number(element.h) < 40) {
        results.push({
          level: "issue",
          slide: slideIndex + 1,
          message: `Image object is too small to render reliably in ${slide.filename}.`,
          fix: null
        });
      }
      if (!["cover", "contain", "fill", "scale-down", "none"].includes(String(element.fit || "cover"))) {
        results.push({
          level: "warning",
          slide: slideIndex + 1,
          message: `Image object has an unsupported fit mode in ${slide.filename}.`,
          fix: () => { element.fit = "cover"; }
        });
      }
    });
    const title = slide.elements.find((element) => element.type === "text" && element.bold && element.size >= 48);
    if (!title) {
      results.push({ level: "warning", slide: slideIndex + 1, message: "Slide has no clear title hierarchy.", fix: null });
    }
  });
  const arabicAudit = analyzeArabicLuxeQuality(deck);
  if (arabicAudit.applies && arabicAudit.score < 82) {
    results.push({
      level: arabicAudit.score < 70 ? "issue" : "warning",
      slide: "All",
      message: `Arabic premium benchmark below target: ${arabicAudit.detail}`,
      fix: null
    });
  }
  const arabicTextGate = analyzeArabicTextGate(deck);
  if (arabicTextGate.applies) {
    results.push(...arabicTextGate.issues, ...arabicTextGate.warnings);
    deck.metadata = {
      ...(deck.metadata || {}),
      arabicTextGateScore: arabicTextGate.score,
      arabicTextGateSignals: arabicTextGate.signals
    };
  }
  results.push(...measureRenderedQA());
  deck.qa = results.map(({ level, slide, message }) => ({ level, slide, message }));
  if (!results.length) {
    deck.qa = [{ level: "pass", slide: "All", message: "No text overflow, edge, contrast, or hierarchy issues detected." }];
  }
  if (shouldRender) render();
  return results;
}

function bgAt(slide, x, y) {
  let fill = "#ffffff";
  slide.elements.forEach((element) => {
    if (!["shape", "imageBlock", "image"].includes(element.type)) return;
    if (x >= element.x && x <= element.x + element.w && y >= element.y && y <= element.y + element.h) {
      fill = element.fill || fill;
    }
  });
  return fill;
}

function measureRenderedQA() {
  if (!document.body || !deck) return [];
  const results = [];
  const rig = document.createElement("div");
  Object.assign(rig.style, {
    position: "absolute",
    left: "-10000px",
    top: "0",
    width: `${W}px`,
    height: `${H}px`,
    visibility: "hidden",
    pointerEvents: "none",
    overflow: "hidden"
  });
  document.body.appendChild(rig);
  deck.slides.forEach((slide, slideIndex) => {
    renderSlideInto(rig, slide, false);
    rig.querySelectorAll(".text-object").forEach((node) => {
      const elementIndex = Number(node.dataset.elementIndex);
      const element = slide.elements[elementIndex];
      const overflowX = node.scrollWidth > node.clientWidth + 1;
      const overflowY = node.scrollHeight > node.clientHeight + 1;
      if (overflowX || overflowY) {
        results.push({
          level: "issue",
          slide: slideIndex + 1,
          message: `Rendered text overflow in ${slide.filename}: "${(element.text || "").slice(0, 54)}"`,
          fix: () => {
            element.size = Math.max(16, Math.round(element.size * 0.88));
            element.h = Math.min(H - element.y - 60, element.h + 34);
          }
        });
      }
      const bg = bgAt(slide, element.x + element.w / 2, element.y + element.h / 2);
      if (contrast(element.fill, bg) < 2.8) {
        results.push({
          level: "warning",
          slide: slideIndex + 1,
          message: `Low contrast text in ${slide.filename}: "${(element.text || "").slice(0, 54)}"`,
          fix: () => {
            element.fill = contrast("#ffffff", bg) > contrast("#111827", bg) ? "#ffffff" : "#111827";
          }
        });
      }
    });
  });
  rig.remove();
  return results;
}

function renderQA() {
  const items = deck.qa || [];
  $("qaOutput").innerHTML = items.map((item) => `<div class="qa-card ${item.level}"><strong>${item.level.toUpperCase()} - Slide ${item.slide}</strong><br>${escapeHtml(item.message)}</div>`).join("");
}

function repairDeckQA(passes = 3) {
  let results = [];
  for (let i = 0; i < passes; i += 1) {
    results = runQA(false);
    const fixable = results.filter((item) => item.fix);
    if (!fixable.length) break;
    fixable.forEach((item) => item.fix());
  }
  return runQA(false);
}

function applyEdit() {
  const request = $("editRequest").value.trim().toLowerCase();
  if (!request || !deck) return;
  const slide = deck.slides[selected];
  const title = slide.elements.find((element) => element.type === "text" && element.bold && element.size >= 48);
  if (/short|concise|reduce|brief/.test(request) && title) {
    title.text = title.text.split(/\s+/).slice(0, 6).join(" ");
    title.size = Math.max(44, title.size - 8);
  }
  if (/executive|premium|board/.test(request)) {
    slide.elements.forEach((element) => {
      if (element.type === "shape" && element.fill === "#ffffff") element.fill = "#f8fafc";
      if (element.type === "text" && !element.bold) element.size = Math.max(18, element.size - 2);
    });
  }
  if (/metric|number|data/.test(request)) {
    slide.elements.push(text(deck.theme, 1280, 188, 330, 86, "3x", 70, deck.theme.accent, { bold: true, align: "center" }));
    slide.elements.push(text(deck.theme, 1230, 280, 430, 52, "clearer decision signal", 24, deck.theme.muted, { align: "center" }));
  }
  if (/arabic|rtl/.test(request)) {
    slide.elements.filter((element) => element.type === "text").forEach((element) => {
      element.rtl = true;
      element.align = "right";
      element.font = "Arial";
    });
  }
  $("editRequest").value = "";
  runQA(false);
  updateReview();
  render();
}

function autoFix() {
  repairDeckQA(3);
  updateReview();
  render();
}

function polishDeck() {
  if (!deck) return;
  autoFix();
  deck.slides.forEach((slide, index) => {
    if (!(slide.speakerNotes || "").includes("Delivery cue:")) {
      slide.speakerNotes = `${slide.speakerNotes || slide.brief || ""} Delivery cue: open with the slide headline, name the evidence, and close with the decision implication.`.trim();
    }
    slide.reviewStatus = "polished";
    slide.reviewOrder = index + 1;
  });
  deck.metadata.polishedAt = new Date().toISOString();
  deck.agentLog = [
    ...(deck.agentLog || []),
    {
      index: (deck.agentLog || []).length + 1,
      title: "Polish deck",
      detail: "Applied QA fixes, strengthened presenter notes, and refreshed the pre-export review."
    }
  ];
  runQA(false);
  updateReview();
  activeTab = "review";
  render();
}

async function download(endpoint, filename) {
  if (!deck) return;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deck })
  });
  if (!response.ok) {
    alert(await response.text());
    return;
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function render() {
  if (!deck) return;
  window.DeckForgeDeck = deck;
  $("deckTitle").textContent = deck.metadata.title;
  renderStrip();
  renderSlideInto($("slideCanvas"), deck.slides[selected]);
  scaleCanvas();
  renderObjectInspector();
  renderTemplates();
  renderCode();
  renderFiles();
  renderAgent();
  renderReferenceAnalysis();
  renderDeckDNA();
  renderBriefing();
  renderOutline();
  renderStoryboard();
  renderPlan();
  renderEvidence();
  renderSources();
  renderDocuments();
  renderReferences();
  renderCharts();
  renderFactCheck();
  renderReview();
  renderVariants();
  renderQA();
  document.querySelectorAll(".pane").forEach((pane) => pane.classList.remove("active"));
  $(`${activeTab}Pane`).classList.add("active");
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === activeTab));
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeTab = tab.dataset.tab;
    render();
  });
});

$("outlineBtn").addEventListener("click", draftOutline);
$("generateBtn").addEventListener("click", () => generateDeck());
$("qaBtn").addEventListener("click", () => { activeTab = "qa"; runQA(true); });
$("editBtn").addEventListener("click", applyEdit);
$("fixBtn").addEventListener("click", autoFix);
$("variantBtn").addEventListener("click", createSlideVariant);
$("polishBtn").addEventListener("click", polishDeck);
$("savePointBtn").addEventListener("click", savePoint);
$("restorePointBtn").addEventListener("click", restoreSavePoint);
$("deletePointBtn").addEventListener("click", deleteSavePoint);
$("saveTemplateBtn").addEventListener("click", saveTemplate);
$("applyTemplateBtn").addEventListener("click", applySelectedTemplate);
$("deleteTemplateBtn").addEventListener("click", deleteSelectedTemplate);
$("templateSelect").addEventListener("change", () => renderTemplates());
$("documentFiles").addEventListener("change", importDocumentFiles);
$("clearDocumentsBtn").addEventListener("click", clearDocumentBrief);
$("analyzeReferenceBtn").addEventListener("click", analyzeReferenceDeck);
$("applyReferenceBtn").addEventListener("click", applyReferenceStyle);
$("importReferenceBtn").addEventListener("click", importReferenceDeck);
$("useReferenceOutlineBtn").addEventListener("click", useReferenceOutline);
$("sampleReferenceBtn").addEventListener("click", loadSampleReferenceStyle);
$("referenceDeckFile").addEventListener("change", analyzeReferenceDeck);
$("presentBtn").addEventListener("click", openPresenter);
$("presenterClose").addEventListener("click", closePresenter);
$("presenterPrev").addEventListener("click", () => movePresenter(-1));
$("presenterNext").addEventListener("click", () => movePresenter(1));
$("pdfBtn").addEventListener("click", () => download("/api/export/pdf", `${deck.metadata.slug}.pdf`));
$("pptxBtn").addEventListener("click", () => download("/api/export/pptx", `${deck.metadata.slug}.pptx`));
$("projectBtn").addEventListener("click", () => download("/api/export/project", `${deck.metadata.slug}.slides.zip`));
$("slideCanvas").addEventListener("click", (event) => {
  const object = event.target.closest("[data-element-index]");
  if (!object || !$("slideCanvas").contains(object)) return;
  selectObject(Number(object.dataset.elementIndex), true);
});
$("objectOutput").addEventListener("input", (event) => {
  const control = event.target.closest("[data-object-field]");
  if (!control) return;
  updateObjectField(control.dataset.objectField, control.value, false);
});
$("objectOutput").addEventListener("change", (event) => {
  const control = event.target.closest("[data-object-field]");
  if (!control) return;
  const value = control.dataset.objectField === "bold" ? control.value === "true" : control.value;
  updateObjectField(control.dataset.objectField, value);
});
$("objectOutput").addEventListener("focusout", (event) => {
  const control = event.target.closest("[data-object-field]");
  if (!control) return;
  const value = control.dataset.objectField === "bold" ? control.value === "true" : control.value;
  updateObjectField(control.dataset.objectField, value);
});
$("objectOutput").addEventListener("click", (event) => {
  const button = event.target.closest("[data-object-action]");
  if (!button) return;
  if (button.dataset.objectAction === "apply") commitObjectInspector();
  if (button.dataset.objectAction === "addText") addObject("text");
  if (button.dataset.objectAction === "addShape") addObject("shape");
  if (button.dataset.objectAction === "duplicate") duplicateObject();
  if (button.dataset.objectAction === "delete") deleteObject();
});
$("templateOutput").addEventListener("click", (event) => {
  const button = event.target.closest("[data-template-action]");
  if (!button) return;
  const id = button.dataset.templateId;
  if ($("templateSelect")) $("templateSelect").value = id;
  if (button.dataset.templateAction === "select") renderTemplates();
  if (button.dataset.templateAction === "apply") applySelectedTemplate();
  if (button.dataset.templateAction === "delete") deleteSelectedTemplate();
});
$("referenceOutput").addEventListener("click", (event) => {
  const button = event.target.closest("[data-reference-action]");
  if (!button) return;
  if (button.dataset.referenceAction === "import") importReferenceDeck();
  if (button.dataset.referenceAction === "apply") applyReferenceStyle();
  if (button.dataset.referenceAction === "outline") useReferenceOutline();
});
$("outlineOutput").addEventListener("input", (event) => {
  const control = event.target.closest("[data-outline-action]");
  if (!control) return;
  const index = Number(control.dataset.outlineIndex);
  if (control.dataset.outlineAction === "title") setOutlineField(index, "title", control.value);
  if (control.dataset.outlineAction === "brief") setOutlineField(index, "brief", control.value);
  if (control.dataset.outlineAction === "notes") setOutlineField(index, "speakerNotes", control.value);
});
$("outlineOutput").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-outline-action]");
  if (!button) return;
  const action = button.dataset.outlineAction;
  const index = Number(button.dataset.outlineIndex);
  if (action === "draft") draftOutline();
  if (action === "build") buildDeckFromOutline();
  if (action === "up") moveOutlineItem(index, -1);
  if (action === "down") moveOutlineItem(index, 1);
});
$("storyboardOutput").addEventListener("change", (event) => {
  const control = event.target.closest("[data-story-action]");
  if (!control) return;
  const index = Number(control.dataset.storyIndex);
  if (control.dataset.storyAction === "title") setSlideTitle(index, control.value);
  if (control.dataset.storyAction === "notes") setSlideNotes(index, control.value);
});
$("storyboardOutput").addEventListener("input", (event) => {
  const control = event.target.closest("[data-story-action]");
  if (!control) return;
  const index = Number(control.dataset.storyIndex);
  if (control.dataset.storyAction === "title") setSlideTitle(index, control.value, false);
  if (control.dataset.storyAction === "notes") setSlideNotes(index, control.value, false);
});
$("storyboardOutput").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-story-action]");
  if (!button) return;
  const index = Number(button.dataset.storyIndex);
  if (button.dataset.storyAction === "up") moveSlide(index, -1);
  if (button.dataset.storyAction === "down") moveSlide(index, 1);
});
$("variantsOutput").addEventListener("click", (event) => {
  const button = event.target.closest("[data-variant-action]");
  if (!button) return;
  const id = button.dataset.variantId;
  if (button.dataset.variantAction === "apply") applyVariant(id);
  if (button.dataset.variantAction === "delete") deleteVariant(id);
});
window.addEventListener("resize", () => {
  scaleCanvas();
  scalePresenter();
});
document.addEventListener("keydown", (event) => {
  if (!$("presenterOverlay").classList.contains("active")) return;
  if (event.key === "Escape") closePresenter();
  if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") movePresenter(1);
  if (event.key === "ArrowLeft" || event.key === "PageUp") movePresenter(-1);
});

window.DeckForgeInternals = {
  buildDeckDNA,
  synthesizeReferenceTheme,
  analyzeArabicLuxeQuality,
  referenceOutlineItems,
  useReferenceOutline,
  paletteColors,
  applyReferenceStyle
};

generateDeck();
refreshSavePointSelect();
refreshTemplateSelect();
