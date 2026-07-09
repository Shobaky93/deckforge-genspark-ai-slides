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
    "metadata": {"title": "عرض مستثمرين عربي", "slug": "arabic-investor-dark-export"},
    "canvas": {"width": 1920, "height": 1080},
    "theme": {
        "name": "Arabic Investor Dark",
        "bg": "#0A0A0F",
        "paper": "#0A0A0F",
        "ink": "#F5F1E8",
        "muted": "#A8A29A",
        "accent": "#D4A574",
        "accent2": "#E8C89A",
        "white": "#F5F1E8",
        "rtlPremium": True,
        "investorDark": True,
        "fontArabic": "Cairo",
        "fontBody": "Tajawal",
        "fontLatin": "Amiri",
    },
    "brand": {"name": "Playabl.ai", "objective": "Raise investment"},
    "review": {
        "overall": 96,
        "status": "Board-ready",
        "arabicAudit": {"applies": True, "score": 100, "status": "Benchmark-grade Arabic RTL"},
    },
    "arabicAudit": {"applies": True, "score": 100, "status": "Benchmark-grade Arabic RTL"},
    "slides": [
        {
            "filename": "01-cover.html",
            "title": "عرض مستثمرين عربي",
            "layout": "cover",
            "brief": "Arabic Investor Dark export smoke test",
            "speakerNotes": "اختبار تصدير عربي داكن.",
            "qaFocus": "Arabic investor RTL typography",
            "elements": [
                {"type": "shape", "x": 0, "y": 0, "w": 1920, "h": 1080, "fill": "#0A0A0F", "stroke": "#0A0A0F"},
                {"type": "shape", "x": 120, "y": 120, "w": 1680, "h": 4, "fill": "#D4A574", "stroke": "#D4A574"},
                {"type": "text", "text": "عرض مستثمرين عربي", "x": 520, "y": 250, "w": 1200, "h": 130, "size": 72, "fill": "#F5F1E8", "bold": True, "align": "right", "rtl": True, "font": "Cairo", "lineHeight": 1.08},
                {"type": "text", "text": "قصة استثمارية داكنة قابلة للتعديل والتصدير", "x": 640, "y": 430, "w": 1080, "h": 72, "size": 28, "fill": "#A8A29A", "bold": False, "align": "right", "rtl": True, "font": "Tajawal", "lineHeight": 1.4},
                {"type": "text", "text": "PLAYABL.AI", "x": 1200, "y": 610, "w": 520, "h": 60, "size": 42, "fill": "#D4A574", "bold": True, "align": "right", "rtl": False, "font": "Amiri", "lineHeight": 1},
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
html = project.read("arabic-investor-dark-export.slides/slides/01-cover.html").decode("utf-8")
project_manifest = json.loads(project.read("arabic-investor-dark-export.slides/manifest.json").decode("utf-8"))
project_arabic_audit = json.loads(project.read("arabic-investor-dark-export.slides/arabic-audit.json").decode("utf-8"))

result = {
    "pptx_bytes": len(pptx_bytes),
    "project_bytes": len(project_bytes),
    "pptx_slide_typefaces": sorted(set(__import__("re").findall(r'typeface="([^"]+)"', slide_xml))),
    "pptx_theme_typefaces": sorted(set(__import__("re").findall(r'typeface="([^"]+)"', theme_xml))),
    "pptx_has_rtl_paragraph": 'rtl="1"' in slide_xml,
    "pptx_has_arabic_lang": 'lang="ar-SA"' in slide_xml,
    "pptx_has_cairo": 'typeface="Cairo"' in slide_xml,
    "pptx_has_tajawal": 'typeface="Tajawal"' in slide_xml,
    "pptx_has_amiri": 'typeface="Amiri"' in slide_xml,
    "pptx_manifest_theme": manifest.get("theme", {}).get("name"),
    "pptx_manifest_investor_dark": manifest.get("theme", {}).get("investorDark"),
    "pptx_manifest_arabic_audit": manifest.get("arabicAudit", {}).get("score"),
    "project_html_rtl": 'dir="rtl"' in html,
    "project_html_dark_bg": "#0A0A0F" in html,
    "project_html_gold": "#D4A574" in html,
    "project_manifest_theme": project_manifest.get("theme", {}).get("name"),
    "project_manifest_arabic_audit": project_manifest.get("arabicAudit", {}).get("score"),
    "project_file_arabic_audit": project_arabic_audit.get("score"),
}

print(json.dumps(result, ensure_ascii=False, indent=2))

assert result["pptx_has_rtl_paragraph"]
assert result["pptx_has_arabic_lang"]
assert result["pptx_has_cairo"]
assert result["pptx_has_tajawal"]
assert result["pptx_has_amiri"]
assert result["pptx_manifest_investor_dark"] is True
assert result["pptx_manifest_arabic_audit"] == 100
assert result["project_html_rtl"]
assert result["project_html_dark_bg"]
assert result["project_html_gold"]
assert result["project_file_arabic_audit"] == 100
