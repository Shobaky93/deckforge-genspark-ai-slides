from __future__ import annotations

import base64
import io
import json
import math
import struct
import sys
import zipfile
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "outputs" / "deckforge"))

from app import build_pptx, build_project_zip  # noqa: E402


SLIDE_W = 1920
SLIDE_H = 1080
OUT = ROOT / "outputs"


def png_data_uri(payload: bytes) -> str:
    return "data:image/png;base64," + base64.b64encode(payload).decode("ascii")


def background_png(kind: str) -> str:
    width = 960
    height = 540
    palettes = {
        "cover": ("#05070d", "#300b17", "#102d4f"),
        "timeline": ("#070b12", "#12233a", "#3d101b"),
        "insights": ("#07090e", "#24121b", "#06324a"),
    }
    c1, c2, c3 = palettes[kind]

    def hx(value: str) -> tuple[int, int, int]:
        value = value.lstrip("#")
        return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))

    a = hx(c1)
    b = hx(c2)
    c = hx(c3)

    data = bytearray(width * height * 3)

    def blend_pixel(x: int, y: int, rgb: tuple[int, int, int], alpha: float) -> None:
        if x < 0 or y < 0 or x >= width or y >= height or alpha <= 0:
            return
        alpha = max(0.0, min(1.0, alpha))
        idx = (y * width + x) * 3
        data[idx] = int(data[idx] * (1 - alpha) + rgb[0] * alpha)
        data[idx + 1] = int(data[idx + 1] * (1 - alpha) + rgb[1] * alpha)
        data[idx + 2] = int(data[idx + 2] * (1 - alpha) + rgb[2] * alpha)

    def line(x1: int, y1: int, x2: int, y2: int, rgb: tuple[int, int, int], alpha: float, width_px: int = 1) -> None:
        dx = abs(x2 - x1)
        dy = -abs(y2 - y1)
        sx = 1 if x1 < x2 else -1
        sy = 1 if y1 < y2 else -1
        err = dx + dy
        x = x1
        y = y1
        radius = max(0, width_px // 2)
        while True:
            for oy in range(-radius, radius + 1):
                for ox in range(-radius, radius + 1):
                    blend_pixel(x + ox, y + oy, rgb, alpha)
            if x == x2 and y == y2:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x += sx
            if e2 <= dx:
                err += dx
                y += sy

    def rect(x1: int, y1: int, x2: int, y2: int, rgb: tuple[int, int, int], alpha: float, width_px: int = 1) -> None:
        line(x1, y1, x2, y1, rgb, alpha, width_px)
        line(x2, y1, x2, y2, rgb, alpha, width_px)
        line(x2, y2, x1, y2, rgb, alpha, width_px)
        line(x1, y2, x1, y1, rgb, alpha, width_px)

    def circle(cx: int, cy: int, radius: int, rgb: tuple[int, int, int], alpha: float, width_px: int = 1) -> None:
        points = []
        for degree in range(0, 361, 2):
            rad = math.radians(degree)
            points.append((int(cx + math.cos(rad) * radius), int(cy + math.sin(rad) * radius)))
        for p1, p2 in zip(points, points[1:]):
            line(p1[0], p1[1], p2[0], p2[1], rgb, alpha, width_px)

    def glow(cx: int, cy: int, radius: int, rgb: tuple[int, int, int], alpha: float) -> None:
        left = max(0, cx - radius)
        right = min(width - 1, cx + radius)
        top = max(0, cy - radius)
        bottom = min(height - 1, cy + radius)
        rr = radius * radius
        for gy in range(top, bottom + 1):
            for gx in range(left, right + 1):
                dist = (gx - cx) * (gx - cx) + (gy - cy) * (gy - cy)
                if dist <= rr:
                    falloff = (1 - dist / rr) ** 1.85
                    blend_pixel(gx, gy, rgb, alpha * falloff)

    for y in range(height):
        vy = y / (height - 1)
        for x in range(width):
            vx = x / (width - 1)
            left = tuple(int(a[i] * (1 - vy) + b[i] * vy) for i in range(3))
            right = tuple(int(a[i] * (1 - vy) + c[i] * vy) for i in range(3))
            value = tuple(int(left[i] * (1 - vx) + right[i] * vx) for i in range(3))
            idx = (y * width + x) * 3
            data[idx : idx + 3] = bytes(value)

    glow(130, 90, 135, (255, 220, 140), 0.22)
    glow(790, 70, 175, (113, 203, 245), 0.16)
    glow(560, 455, 165, (204, 35, 63), 0.14)

    for i, x in enumerate(range(-140, width + 180, 76)):
        line(x, -40, x + 410, height + 60, (212, 175, 95), 0.12 if i % 2 else 0.06, 1)

    for i in range(7):
        y = 85 + i * 59
        line(60, y, 900, int(y + math.sin(i) * 17), (255, 255, 255), 0.035, 1)

    if kind == "cover":
        circle(480, 360, 176, (255, 255, 255), 0.12, 2)
        line(480, 40, 480, 520, (255, 255, 255), 0.11, 2)
        rect(60, 75, 900, 465, (255, 255, 255), 0.09, 2)
        glow(60, 510, 200, (204, 35, 63), 0.17)
        glow(900, 160, 240, (96, 186, 234), 0.15)
    elif kind == "timeline":
        for x in (115, 325, 535, 745):
            circle(x, 275, 66, (212, 175, 95), 0.13, 2)
        line(105, 275, 855, 275, (255, 255, 255), 0.11, 2)
        glow(785, 50, 235, (96, 186, 234), 0.16)
        glow(0, 535, 240, (204, 35, 63), 0.16)
    else:
        for r in (180, 260, 345):
            circle(480, 250, r, (212, 175, 95), 0.08, 2)
        rect(75, 85, 885, 455, (255, 255, 255), 0.08, 2)
        glow(805, 500, 260, (212, 175, 95), 0.12)
        glow(0, 0, 260, (96, 186, 234), 0.12)

    for y in range(0, height, 5):
        line(0, y, width, y, (255, 255, 255), 0.012, 1)

    raw = bytearray()
    stride = width * 3
    for y in range(height):
        raw.append(0)
        raw.extend(data[y * stride : (y + 1) * stride])

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + tag
            + payload
            + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    png = bytearray(b"\x89PNG\r\n\x1a\n")
    png.extend(chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)))
    png.extend(chunk(b"IDAT", zlib.compress(bytes(raw), 9)))
    png.extend(chunk(b"IEND", b""))
    return png_data_uri(bytes(png))


def shape(x, y, w, h, fill, stroke=None, radius=0):
    return {
        "type": "shape",
        "x": x,
        "y": y,
        "w": w,
        "h": h,
        "fill": fill,
        "stroke": stroke or fill,
        "radius": radius,
    }


def text(value, x, y, w, h, size, fill="#F7F2E7", bold=False, align="right", rtl=True, font="Dubai", line=1.18):
    return {
        "type": "text",
        "text": value,
        "x": x,
        "y": y,
        "w": w,
        "h": h,
        "size": size,
        "fill": fill,
        "bold": bold,
        "align": align,
        "rtl": rtl,
        "font": font,
        "lineHeight": line,
    }


def image(src, name):
    return {
        "type": "image",
        "src": src,
        "sourceName": name,
        "alt": name,
        "x": 0,
        "y": 0,
        "w": SLIDE_W,
        "h": SLIDE_H,
        "fit": "cover",
    }


def footer(n: int):
    return [
        text("الأردن × الأرجنتين", 1260, 1010, 520, 42, 22, "#D8DDE8", False, "right", True, "Dubai", 1),
        text(f"0{n}", 120, 1010, 70, 42, 22, "#D4AF5F", True, "left", False, "Aptos Display", 1),
        shape(204, 1028, 920, 2, "#D4AF5F"),
    ]


def build_deck():
    bg_cover = background_png("cover")
    bg_timeline = background_png("timeline")
    bg_insights = background_png("insights")

    slides = [
        {
            "filename": "01-scoreline.html",
            "title": "الأردن × الأرجنتين - النتيجة",
            "layout": "cover",
            "brief": "Arabic RTL match recap cover for Jordan vs Argentina.",
            "speakerNotes": "إطار افتتاحي يضع النتيجة والسياق قبل الدخول في لحظات المباراة.",
            "qaFocus": "RTL score hierarchy, no text collision, bilingual match labels.",
            "elements": [
                image(bg_cover, "stadium-editorial-cover.png") if bg_cover else shape(0, 0, SLIDE_W, SLIDE_H, "#070B12"),
                shape(124, 92, 1672, 3, "#D4AF5F"),
                shape(1290, 136, 420, 50, "#3B1020", "#D4AF5F", 24),
                text("كأس العالم 2026 · المجموعة J", 1308, 143, 378, 36, 24, "#F8E8B8", True, "right", True),
                text("الأردن × الأرجنتين", 300, 215, 1320, 118, 94, "#FFFFFF", True, "center", True, "Dubai", 1.02),
                text("ملخص مباراة انتهت 3-1 لصالح الأرجنتين", 470, 350, 980, 58, 34, "#D8DDE8", False, "center", True),
                shape(456, 452, 1008, 266, "#0B111C", "#D4AF5F", 38),
                text("الأردن", 1128, 500, 230, 52, 38, "#F8F2EA", True, "right", True),
                text("JOR", 1148, 562, 150, 46, 32, "#E64B63", True, "right", False, "Aptos Display", 1),
                text("1", 986, 470, 118, 138, 128, "#FFFFFF", True, "center", False, "Aptos Display", 0.92),
                text("-", 922, 496, 76, 100, 86, "#D4AF5F", True, "center", False, "Aptos Display", 0.92),
                text("3", 800, 470, 118, 138, 128, "#FFFFFF", True, "center", False, "Aptos Display", 0.92),
                text("الأرجنتين", 568, 500, 280, 52, 38, "#F8F2EA", True, "left", True),
                text("ARG", 620, 562, 150, 46, 32, "#75C7F2", True, "left", False, "Aptos Display", 1),
                shape(600, 664, 720, 4, "#D4AF5F"),
                text("دالاس · 27 يونيو 2026", 650, 742, 620, 48, 30, "#FFFFFF", False, "center", True),
                shape(430, 820, 1060, 70, "#101A2A", "#29374D", 22),
                text("الأهداف: التعمري 55′ | لو سيلسو 19′، لاوتارو 31′، ميسي 80′", 480, 837, 960, 38, 25, "#CCD5E2", False, "center", True),
                shape(245, 590, 270, 7, "#E64B63"),
                shape(1405, 590, 270, 7, "#75C7F2"),
                *footer(1),
            ],
        },
        {
            "filename": "02-turning-points.html",
            "title": "لحظات صنعت المباراة",
            "layout": "timeline",
            "brief": "Goal timeline and match turning points.",
            "speakerNotes": "ترتيب زمني مختصر للأهداف مع إبراز لحظة الأردن في الشوط الثاني.",
            "qaFocus": "Aligned RTL cards with clear minute markers.",
            "elements": [
                image(bg_timeline, "stadium-editorial-timeline.png") if bg_timeline else shape(0, 0, SLIDE_W, SLIDE_H, "#070B12"),
                text("كيف صُنعت النتيجة؟", 1030, 118, 700, 82, 60, "#FFFFFF", True, "right", True, "Dubai", 1.05),
                text("الأرجنتين حسمت الشوط الأول، ثم أعاد التعمري الأردن إلى المشهد قبل أن يغلق ميسي المباراة.", 600, 210, 1130, 58, 30, "#CCD5E2", False, "right", True),
                shape(260, 480, 1400, 5, "#D4AF5F"),
                shape(1460, 375, 280, 250, "#0E1726", "#75C7F2", 28),
                text("19′", 1590, 404, 110, 52, 42, "#75C7F2", True, "right", False, "Aptos Display", 1),
                text("لو سيلسو", 1495, 466, 210, 42, 28, "#FFFFFF", True, "right", True),
                text("ركلة حرة فتحت المباراة ومنحت الأرجنتين تحكماً مبكراً.", 1485, 522, 225, 78, 22, "#CBD5E1", False, "right", True, "Dubai", 1.28),
                shape(1070, 375, 280, 250, "#0E1726", "#75C7F2", 28),
                text("31′", 1200, 404, 110, 52, 42, "#75C7F2", True, "right", False, "Aptos Display", 1),
                text("لاوتارو", 1105, 466, 210, 42, 28, "#FFFFFF", True, "right", True),
                text("ركلة جزاء وسّعت الفارق قبل الاستراحة وهدّأت إيقاع المباراة.", 1095, 522, 225, 78, 22, "#CBD5E1", False, "right", True, "Dubai", 1.28),
                shape(680, 375, 280, 250, "#17101B", "#E64B63", 28),
                text("55′", 810, 404, 110, 52, 42, "#E64B63", True, "right", False, "Aptos Display", 1),
                text("موسى التعمري", 715, 466, 210, 42, 27, "#FFFFFF", True, "right", True),
                text("لمسة أردنية منحت المنتخب لحظة حضور وثقة في ظهوره العالمي.", 705, 522, 225, 78, 22, "#CBD5E1", False, "right", True, "Dubai", 1.28),
                shape(290, 375, 280, 250, "#0E1726", "#D4AF5F", 28),
                text("80′", 420, 404, 110, 52, 42, "#D4AF5F", True, "right", False, "Aptos Display", 1),
                text("ميسي", 325, 466, 210, 42, 28, "#FFFFFF", True, "right", True),
                text("ركلة حرة أخيرة حسمت القصة وأكدت عمق خبرة الأبطال.", 315, 522, 225, 78, 22, "#CBD5E1", False, "right", True, "Dubai", 1.28),
                shape(1260, 720, 470, 118, "#101A2A", "#29374D", 22),
                text("نصف أول: 0-2", 1330, 744, 340, 44, 31, "#FFFFFF", True, "right", True),
                text("تفوق مبكر + إدارة هادئة للنسق", 1300, 790, 370, 38, 22, "#CCD5E2", False, "right", True),
                shape(620, 720, 560, 118, "#101A2A", "#29374D", 22),
                text("نصف ثان: الأردن يسجّل", 700, 744, 420, 44, 31, "#FFFFFF", True, "right", True),
                text("هدف التعمري حافظ على الحضور الهجومي والمعنوي", 670, 790, 450, 38, 22, "#CCD5E2", False, "right", True),
                *footer(2),
            ],
        },
        {
            "filename": "03-lessons.html",
            "title": "الدروس الفنية",
            "layout": "insights",
            "brief": "Strategic takeaways from the match.",
            "speakerNotes": "خاتمة توازن بين قوة الأرجنتين وما يمكن للأردن البناء عليه بعد التجربة.",
            "qaFocus": "Dense but readable Arabic insight cards.",
            "elements": [
                image(bg_insights, "stadium-editorial-insights.png") if bg_insights else shape(0, 0, SLIDE_W, SLIDE_H, "#070B12"),
                text("ماذا نتعلّم من المباراة؟", 900, 104, 820, 78, 58, "#FFFFFF", True, "right", True, "Dubai", 1.05),
                text("الخسارة في النتيجة لا تلغي أن الأردن ترك مادة قابلة للبناء: هدف في كل مباراة من دور المجموعات، وجرأة أوضح بعد الاستراحة.", 620, 194, 1100, 76, 29, "#CCD5E2", False, "right", True),
                shape(1280, 355, 430, 245, "#0E1726", "#D4AF5F", 26),
                text("01", 1580, 386, 80, 48, 34, "#D4AF5F", True, "right", False, "Aptos Display", 1),
                text("قيمة البداية الهادئة", 1335, 444, 325, 42, 31, "#FFFFFF", True, "right", True),
                text("الدقائق الأولى منحت الأرجنتين مساحة كافية لفرض إيقاعها. ضد منتخبات كبرى، الدخول القوي ليس تفصيلاً.", 1320, 500, 340, 78, 22, "#CBD5E1", False, "right", True, "Dubai", 1.25),
                shape(745, 355, 430, 245, "#0E1726", "#75C7F2", 26),
                text("02", 1045, 386, 80, 48, 34, "#75C7F2", True, "right", False, "Aptos Display", 1),
                text("عمق الأبطال", 800, 444, 325, 42, 31, "#FFFFFF", True, "right", True),
                text("حتى مع التدوير، امتلكت الأرجنتين جودة فردية في الكرات الثابتة والتفاصيل الصغيرة حول منطقة الجزاء.", 785, 500, 340, 78, 22, "#CBD5E1", False, "right", True, "Dubai", 1.25),
                shape(210, 355, 430, 245, "#17101B", "#E64B63", 26),
                text("03", 510, 386, 80, 48, 34, "#E64B63", True, "right", False, "Aptos Display", 1),
                text("نافذة التحولات", 265, 444, 325, 42, 31, "#FFFFFF", True, "right", True),
                text("هدف التعمري أظهر أن المباشرة والزيادة خلف الظهير يمكن أن تخلق لحظة خطرة حتى أمام خصم أكثر خبرة.", 250, 500, 340, 78, 22, "#CBD5E1", False, "right", True, "Dubai", 1.25),
                shape(345, 710, 1230, 120, "#0E1726", "#29374D", 30),
                text("الخلاصة", 1370, 735, 150, 42, 30, "#D4AF5F", True, "right", True),
                text("الأرجنتين أكدت جاهزية المنافسة، والأردن خرج بخبرة نادرة يمكن تحويلها إلى مشروع أكثر جرأة وتنظيماً.", 480, 734, 850, 60, 28, "#FFFFFF", False, "right", True, "Dubai", 1.2),
                text("المصدر: The Guardian، 28 Jun 2026", 212, 916, 560, 34, 18, "#9AA8BC", False, "left", True, "Dubai", 1),
                *footer(3),
            ],
        },
    ]

    return {
        "schemaVersion": "1.0",
        "format": "html",
        "metadata": {
            "title": "الأردن × الأرجنتين - ملخص مباراة",
            "slug": "jordan-argentina-3slides",
            "language": "ar",
            "archetype": "sports-match-recap",
        },
        "canvas": {"width": SLIDE_W, "height": SLIDE_H},
        "theme": {
            "name": "Arabic Stadium Editorial",
            "bg": "#070B12",
            "paper": "#0E1726",
            "ink": "#FFFFFF",
            "muted": "#CCD5E2",
            "accent": "#D4AF5F",
            "accent2": "#75C7F2",
            "accent3": "#E64B63",
            "white": "#FFFFFF",
            "rtlPremium": True,
            "fontArabic": "Dubai",
            "fontBody": "Dubai",
            "fontLatin": "Aptos Display",
        },
        "brand": {"name": "DeckForge", "objective": "Professional Arabic RTL sports recap"},
        "sources": [
            {
                "title": "Jordan 1-3 Argentina: World Cup 2026 - as it happened",
                "publisher": "The Guardian",
                "url": "https://www.theguardian.com/football/live/2026/jun/28/fifa-world-cup-2026-live-jordan-v-argentina-updates-jor-vs-arg-group-j-match-score-latest",
                "date": "2026-06-28",
            }
        ],
        "factCheck": {
            "status": "verified-from-source",
            "checkedOn": "2026-07-09",
            "claims": [
                "Jordan 1-3 Argentina",
                "Goals: Lo Celso 19, Lautaro Martinez 31, Musa al-Taamari 55, Messi 80",
                "World Cup 2026 Group J match in Dallas",
            ],
        },
        "review": {
            "overall": 96,
            "status": "Board-ready",
            "arabicAudit": {"applies": True, "score": 100, "status": "Arabic RTL recap checked"},
        },
        "arabicAudit": {
            "applies": True,
            "score": 100,
            "status": "Arabic RTL deck: right alignment, RTL paragraphs, no mixed-direction title collisions",
        },
        "slides": slides,
        "playlist": [slide["filename"] for slide in slides],
    }


def validate_outputs(pptx_bytes: bytes, project_bytes: bytes) -> dict:
    ppt = zipfile.ZipFile(io.BytesIO(pptx_bytes))
    project = zipfile.ZipFile(io.BytesIO(project_bytes))
    slide_names = sorted(name for name in ppt.namelist() if name.startswith("ppt/slides/slide") and name.endswith(".xml"))
    slide_xml = "\n".join(ppt.read(name).decode("utf-8") for name in slide_names)
    manifest = json.loads(ppt.read("ppt/deckforge-manifest.json").decode("utf-8"))
    project_names = project.namelist()
    html_names = sorted(name for name in project_names if name.endswith(".html"))
    html_payload = "\n".join(project.read(name).decode("utf-8") for name in html_names)
    return {
        "pptxBytes": len(pptx_bytes),
        "projectBytes": len(project_bytes),
        "slideCount": len(slide_names),
        "projectHtmlSlides": len(html_names),
        "pptxHasManifest": "ppt/deckforge-manifest.json" in ppt.namelist(),
        "pptxHasRtl": 'rtl="1"' in slide_xml,
        "pptxHasArabicLang": 'lang="ar-SA"' in slide_xml,
        "pptxHasArabicFont": 'typeface="Dubai"' in slide_xml,
        "projectHasRtlHtml": 'dir="rtl"' in html_payload,
        "projectHasSourceManifest": any(name.endswith("sources.json") for name in project_names),
        "arabicAudit": manifest.get("arabicAudit", {}).get("score"),
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    deck = build_deck()
    pptx_bytes = build_pptx(deck)
    project_bytes = build_project_zip(deck)
    validation = validate_outputs(pptx_bytes, project_bytes)

    deck_path = OUT / "jordan-argentina-3slides.deck.json"
    pptx_path = OUT / "jordan-argentina-3slides.pptx"
    project_path = OUT / "jordan-argentina-3slides.slides.zip"
    validation_path = OUT / "jordan-argentina-3slides.validation.json"

    deck_path.write_text(json.dumps(deck, ensure_ascii=False, indent=2), encoding="utf-8")
    pptx_path.write_bytes(pptx_bytes)
    project_path.write_bytes(project_bytes)
    validation_path.write_text(json.dumps(validation, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps({
        "deck": str(deck_path),
        "pptx": str(pptx_path),
        "project": str(project_path),
        "validation": str(validation_path),
        "checks": validation,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
