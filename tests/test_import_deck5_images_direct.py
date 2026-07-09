import importlib.util
import io
import json
from pathlib import Path
import zipfile


APP_PATH = Path(r"C:\Users\o-sho\Documents\Codex\2026-07-09\i-c\outputs\deckforge\app.py")
DECK5 = Path(r"C:\Users\o-sho\Desktop\yazan and osama\Deck 5")

spec = importlib.util.spec_from_file_location("deckforge_app", APP_PATH)
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)

buffer = io.BytesIO()
with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
    for path in DECK5.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".html", ".json", ".css", ".png", ".jpg", ".jpeg", ".webp"}:
            z.write(path, path.relative_to(DECK5).as_posix())

result = app.import_deck_file("qatar-ecommerce-html.zip", buffer.getvalue())
deck = result["deck"]
analysis = result["referenceAnalysis"]
image_objects = [
    element
    for slide in deck["slides"]
    for element in slide["elements"]
    if element.get("type") == "image"
]
image_names = [item.get("sourceName") for item in image_objects]

assert len(deck["slides"]) == 10, len(deck["slides"])
assert analysis["visualRecipe"]["rtlSlideRatio"] >= 0.8, analysis["visualRecipe"]
assert len(image_objects) >= 2, image_names
assert any("cover-hero" in str(name) for name in image_names), image_names
assert any("al-nadeeb" in str(name) for name in image_names), image_names
assert all(str(item.get("src", "")).startswith("data:image/") for item in image_objects), image_names
assert all(item.get("fit") == "cover" for item in image_objects), image_objects

pptx_bytes = app.build_pptx(deck)
project_bytes = app.build_project_zip(deck)

pptx = zipfile.ZipFile(io.BytesIO(pptx_bytes))
media_names = [name for name in pptx.namelist() if name.startswith("ppt/media/")]
slide_xmls = [
    pptx.read(name).decode("utf-8")
    for name in pptx.namelist()
    if name.startswith("ppt/slides/slide") and name.endswith(".xml")
]
rels = [
    pptx.read(name).decode("utf-8")
    for name in pptx.namelist()
    if name.startswith("ppt/slides/_rels/slide") and name.endswith(".xml.rels")
]

assert len(media_names) >= 2, media_names
assert any("<p:pic>" in xml for xml in slide_xmls), "No picture nodes in slide XML"
assert any("relationships/image" in xml for xml in rels), "No image relationships in slide rels"

project = zipfile.ZipFile(io.BytesIO(project_bytes))
html_payload = "\n".join(
    project.read(name).decode("utf-8")
    for name in project.namelist()
    if name.endswith(".html")
)
assert 'data-object-type="image"' in html_payload, "Project HTML lost image object"
assert "data:image/jpeg;base64" in html_payload, "Project HTML lost embedded image data"

print(json.dumps({
    "imported_title": deck["metadata"]["title"],
    "slide_count": len(deck["slides"]),
    "image_objects": len(image_objects),
    "image_names": image_names,
    "pptx_media_files": media_names,
    "pptx_bytes": len(pptx_bytes),
    "project_bytes": len(project_bytes),
    "rtl_ratio": analysis["visualRecipe"]["rtlSlideRatio"],
    "chrome_ratio": analysis["visualRecipe"]["chromeSlideRatio"],
}, ensure_ascii=False, indent=2))
