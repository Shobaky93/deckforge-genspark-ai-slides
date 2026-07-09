import io
import json
from pathlib import Path
import urllib.request
import zipfile


BASE = "http://127.0.0.1:8800"
DECK3 = Path(r"C:\Users\o-sho\Desktop\yazan and osama\Deck 3")


def post_file(path, filename, data, content_type="application/zip"):
    boundary = "----deckforge-deck3-reference-test"
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


buffer = io.BytesIO()
with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
    for path in DECK3.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".html", ".json", ".css", ".png", ".jpg", ".jpeg", ".webp"}:
            z.write(path, path.relative_to(DECK3).as_posix())

analysis = post_file("/api/analyze/reference", "facebook-success-story-html.zip", buffer.getvalue())
recipe = analysis.get("visualRecipe", {})
slide_recipes = analysis.get("slideVisualRecipes", [])
tags = set(recipe.get("tags", []))
fonts = {item.get("font") for item in recipe.get("topFonts", [])}
media_count = analysis.get("assets", {}).get("mediaCount") or analysis.get("structure", {}).get("mediaFiles")

checks = {
    "kind": analysis.get("kind"),
    "slide_count": analysis.get("slideCount"),
    "outline_count": analysis.get("outlineCount"),
    "media_count": media_count,
    "visual_recipe_available": recipe.get("available"),
    "visual_recipe_summary": recipe.get("summary"),
    "rtl_ratio": recipe.get("rtlSlideRatio"),
    "chrome_ratio": recipe.get("chromeSlideRatio"),
    "avg_objects": recipe.get("avgObjectsPerSlide"),
    "tags": recipe.get("tags"),
    "top_fonts": recipe.get("topFonts"),
    "first_slide_tags": slide_recipes[0].get("tags") if slide_recipes else [],
}

assert checks["slide_count"] == 10, checks
assert checks["outline_count"] == 10, checks
assert media_count >= 5, checks
assert checks["visual_recipe_available"] is True, checks
assert checks["rtl_ratio"] >= 0.8, checks
assert {"rtl", "editorial-chrome"} <= tags, checks
assert {"Amiri", "Tajawal", "Playfair Display", "Cormorant Garamond"} & fonts, checks

print(json.dumps(checks, ensure_ascii=False, indent=2))
