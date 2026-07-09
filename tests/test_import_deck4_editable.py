import io
import json
from pathlib import Path
import urllib.request
import zipfile


BASE = "http://127.0.0.1:8800"
DECK4 = Path(r"C:\Users\o-sho\Desktop\yazan and osama\Deck 4")


def post_file(path, filename, data, content_type="application/zip"):
    boundary = "----deckforge-deck4-import-test"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8") + data + f"\r\n--{boundary}--\r\n".encode("utf-8")
    req = urllib.request.Request(
        BASE + path,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode("utf-8"))


def post_json(path, payload):
    raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        BASE + path,
        data=raw,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read()


buffer = io.BytesIO()
with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
    for path in DECK4.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".html", ".json", ".css", ".png", ".jpg", ".jpeg", ".webp"}:
            z.write(path, path.relative_to(DECK4).as_posix())

result = post_file("/api/import/deck", "opensooq-story-html.zip", buffer.getvalue())
deck = result["deck"]
analysis = result["referenceAnalysis"]
slides = deck["slides"]
first_text = " ".join(
    element.get("text", "")
    for element in slides[0]["elements"]
    if element.get("type") == "text"
)
first_shape = slides[0]["elements"][0]
text_count = sum(1 for slide in slides for element in slide["elements"] if element.get("type") == "text")
shape_count = sum(1 for slide in slides for element in slide["elements"] if element.get("type") in {"shape", "imageBlock"})

assert len(slides) == 10, len(slides)
assert deck["metadata"]["importMode"] == "editable-html", deck["metadata"]
assert analysis["visualRecipe"]["rtlSlideRatio"] >= 0.8, analysis["visualRecipe"]
assert analysis["outlineCount"] == 10, analysis["outlineCount"]
assert first_shape["fill"] == "#FFFFFF", first_shape
assert "السوق المفتوح" in first_text, first_text
assert "100M" in first_text, first_text
assert text_count >= 70, text_count
assert shape_count >= 35, shape_count
assert deck["theme"]["rtlPremium"] is True, deck["theme"]

pptx_bytes = post_json("/api/export/pptx", {"deck": deck})
project_bytes = post_json("/api/export/project", {"deck": deck})

pptx = zipfile.ZipFile(io.BytesIO(pptx_bytes))
slide_xml = pptx.read("ppt/slides/slide1.xml").decode("utf-8")
manifest = json.loads(pptx.read("ppt/deckforge-manifest.json").decode("utf-8"))
project = zipfile.ZipFile(io.BytesIO(project_bytes))
project_manifest = json.loads(project.read(f"{deck['metadata']['slug']}.slides/manifest.json").decode("utf-8"))

assert 'lang="ar-SA"' in slide_xml, slide_xml[:1000]
assert "Tajawal" in slide_xml or "Amiri" in slide_xml, slide_xml[:1000]
assert manifest["metadata"]["importMode"] == "editable-html", manifest["metadata"]
assert project_manifest["metadata"]["importMode"] == "editable-html", project_manifest["metadata"]

print(json.dumps({
    "imported_title": deck["metadata"]["title"],
    "slide_count": len(slides),
    "text_objects": text_count,
    "shape_objects": shape_count,
    "first_slide_fill": first_shape["fill"],
    "rtl_ratio": analysis["visualRecipe"]["rtlSlideRatio"],
    "chrome_ratio": analysis["visualRecipe"]["chromeSlideRatio"],
    "pptx_bytes": len(pptx_bytes),
    "project_bytes": len(project_bytes),
}, ensure_ascii=False, indent=2))
