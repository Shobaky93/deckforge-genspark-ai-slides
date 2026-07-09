import io
import json
import urllib.request
import zipfile


BASE = "http://127.0.0.1:8800"


def post_json(path, payload):
    raw = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        BASE + path,
        data=raw,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as res:
        return res.read()


def post_file(path, filename, data):
    boundary = "----deckforge-reference-test"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        "Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n\r\n"
    ).encode("utf-8") + data + f"\r\n--{boundary}--\r\n".encode("utf-8")
    req = urllib.request.Request(
        BASE + path,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.loads(res.read().decode("utf-8"))


deck = {
    "schemaVersion": "1.0",
    "format": "html",
    "metadata": {"title": "Reference Analyzer Export", "slug": "reference-analyzer-export"},
    "canvas": {"width": 1920, "height": 1080},
    "theme": {
        "name": "Executive Navy",
        "bg": "#0b1e3f",
        "paper": "#f7f3ea",
        "ink": "#0f172a",
        "muted": "#667085",
        "accent": "#9a6a16",
        "accent2": "#0f766e",
        "white": "#ffffff",
    },
    "brand": {"name": "ReferenceCo", "tone": "Board-ready"},
    "referenceAnalysis": {
        "fileName": "genspark-sample.pptx",
        "fingerprint": "PPTX / 1 slides / visual / 3 colors / 0 media",
        "suggestedAccent": "#9a6a16",
        "density": "visual",
    },
    "deckDNA": {
        "fingerprint": "Executive Navy / visual / cover / 1 slides / ReferenceCo",
        "palette": [{"color": "#9a6a16", "count": 1, "role": "accent candidate"}],
    },
    "slides": [
        {
            "filename": "01-cover.html",
            "title": "Cover",
            "layout": "cover",
            "brief": "Reference analyzer test",
            "speakerNotes": "Open with the imported reference style.",
            "qaFocus": "None",
            "elements": [
                {"type": "shape", "x": 0, "y": 0, "w": 1920, "h": 1080, "fill": "#f7f3ea", "stroke": "#f7f3ea"},
                {"type": "text", "text": "Reference deck style", "x": 120, "y": 120, "w": 1100, "h": 90, "size": 56, "fill": "#0f172a", "bold": True},
                {"type": "shape", "x": 120, "y": 240, "w": 360, "h": 16, "fill": "#9a6a16", "stroke": "#9a6a16"},
            ],
        }
    ],
}

pptx_bytes = post_json("/api/export/pptx", {"deck": deck})
analysis = post_file("/api/analyze/reference", "reference-analyzer-export.pptx", pptx_bytes)
project_bytes = post_json("/api/export/project", {"deck": {**deck, "referenceAnalysis": analysis}})

project = zipfile.ZipFile(io.BytesIO(project_bytes))
project_manifest = json.loads(project.read("reference-analyzer-export.slides/manifest.json"))
reference_file = json.loads(project.read("reference-analyzer-export.slides/reference-analysis.json"))
pptx = zipfile.ZipFile(io.BytesIO(pptx_bytes))
pptx_manifest = json.loads(pptx.read("ppt/deckforge-manifest.json"))

print(json.dumps({
    "analysis_kind": analysis.get("kind"),
    "analysis_fingerprint": analysis.get("fingerprint"),
    "analysis_palette_count": len(analysis.get("palette", [])),
    "analysis_outline_count": analysis.get("outlineCount"),
    "analysis_outline_title": (analysis.get("slideOutline") or [{}])[0].get("title"),
    "analysis_layout_hint": (analysis.get("slideOutline") or [{}])[0].get("suggestedLayout"),
    "analysis_visual_role": (analysis.get("slideOutline") or [{}])[0].get("visualRole"),
    "analysis_visual_recipe_available": analysis.get("visualRecipe", {}).get("available"),
    "analysis_visual_recipe_count": analysis.get("visualRecipeCount"),
    "project_has_reference_analysis_json": "reference-analyzer-export.slides/reference-analysis.json" in project.namelist(),
    "project_manifest_reference_kind": project_manifest.get("referenceAnalysis", {}).get("kind"),
    "project_manifest_outline_count": project_manifest.get("referenceAnalysis", {}).get("outlineCount"),
    "project_file_reference_kind": reference_file.get("kind"),
    "project_file_outline_count": reference_file.get("outlineCount"),
    "project_file_layout_hint": (reference_file.get("slideOutline") or [{}])[0].get("suggestedLayout"),
    "project_file_visual_recipe_count": reference_file.get("visualRecipeCount"),
    "pptx_manifest_reference_fingerprint": pptx_manifest.get("referenceAnalysis", {}).get("fingerprint"),
}, indent=2))
