import io
import json
import urllib.request
import zipfile


BASE = "http://127.0.0.1:8800"


def post_json(path, payload):
    raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        BASE + path,
        data=raw,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as res:
        return res.read()


deck = {
    "schemaVersion": "1.0",
    "format": "html",
    "metadata": {"title": "اختبار تصدير عربي", "slug": "arabic-rtl-export"},
    "canvas": {"width": 1920, "height": 1080},
    "theme": {
        "name": "Arabic Luxe RTL",
        "bg": "#0A2540",
        "paper": "#FFFFFF",
        "ink": "#0A2540",
        "muted": "#475569",
        "accent": "#C9A961",
        "accent2": "#143A6B",
        "white": "#FFFFFF",
        "rtlPremium": True,
        "fontArabic": "Tajawal",
        "fontLatin": "Playfair Display",
    },
    "brand": {"name": "شرائح", "objective": "إطلاق منتج بثقة"},
    "review": {
        "overall": 96,
        "status": "Board-ready",
        "arabicAudit": {"applies": True, "score": 96, "status": "Benchmark-grade Arabic RTL"},
    },
    "arabicAudit": {"applies": True, "score": 96, "status": "Benchmark-grade Arabic RTL"},
    "slides": [
        {
            "filename": "01-cover.html",
            "title": "منصة عربية أنيقة",
            "layout": "cover",
            "brief": "Arabic RTL export smoke test",
            "speakerNotes": "اختبار ملاحظات عربية.",
            "qaFocus": "Premium RTL Arabic typography",
            "elements": [
                {"type": "shape", "x": 0, "y": 0, "w": 1920, "h": 1080, "fill": "#FFFFFF", "stroke": "#FFFFFF"},
                {"type": "shape", "x": 1320, "y": 0, "w": 600, "h": 520, "fill": "#0A2540", "stroke": "#0A2540"},
                {"type": "text", "text": "منصة عربية أنيقة", "x": 120, "y": 270, "w": 1180, "h": 260, "size": 90, "fill": "#0A2540", "bold": True, "align": "right", "rtl": True, "font": "Tajawal", "lineHeight": 1.05},
                {"type": "text", "text": "SHARAYEH", "x": 124, "y": 550, "w": 850, "h": 78, "size": 58, "fill": "#0A2540", "bold": True, "align": "left", "rtl": False, "font": "Playfair Display", "lineHeight": 1},
            ],
        }
    ],
    "playlist": ["01-cover.html"],
}


pptx_bytes = post_json("/api/export/pptx", {"deck": deck})
project_bytes = post_json("/api/export/project", {"deck": deck})

pptx = zipfile.ZipFile(io.BytesIO(pptx_bytes))
slide_xml = pptx.read("ppt/slides/slide1.xml").decode("utf-8")
theme_xml = pptx.read("ppt/theme/theme1.xml").decode("utf-8")
manifest = json.loads(pptx.read("ppt/deckforge-manifest.json").decode("utf-8"))

project = zipfile.ZipFile(io.BytesIO(project_bytes))
html = project.read("arabic-rtl-export.slides/slides/01-cover.html").decode("utf-8")
project_manifest = json.loads(project.read("arabic-rtl-export.slides/manifest.json").decode("utf-8"))
project_arabic_audit = json.loads(project.read("arabic-rtl-export.slides/arabic-audit.json").decode("utf-8"))

print(json.dumps({
    "pptx_bytes": len(pptx_bytes),
    "project_bytes": len(project_bytes),
    "pptx_has_rtl_paragraph": 'rtl="1"' in slide_xml,
    "pptx_has_arabic_lang": 'lang="ar-SA"' in slide_xml,
    "pptx_has_tajawal": 'typeface="Tajawal"' in slide_xml and 'typeface="Tajawal"' in theme_xml,
    "pptx_manifest_theme": manifest.get("theme", {}).get("name"),
    "pptx_manifest_arabic_audit": manifest.get("arabicAudit", {}).get("score"),
    "project_html_rtl": 'dir="rtl"' in html,
    "project_html_tajawal": "Tajawal" in html,
    "project_manifest_arabic_audit": project_manifest.get("arabicAudit", {}).get("score"),
    "project_file_arabic_audit": project_arabic_audit.get("score"),
}, ensure_ascii=False, indent=2))
