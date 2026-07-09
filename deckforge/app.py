from __future__ import annotations

import base64
import json
import mimetypes
import posixpath
import re
import sys
import zipfile
from collections import Counter
from datetime import datetime, timezone
from html import escape, unescape as html_unescape
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parent
SLIDE_W = 1920
SLIDE_H = 1080
EMU_W = 12192000
EMU_H = 6858000


def px_to_emu_x(value: float) -> int:
    return round(float(value) / SLIDE_W * EMU_W)


def px_to_emu_y(value: float) -> int:
    return round(float(value) / SLIDE_H * EMU_H)


def color(value: str | None, fallback: str = "111827") -> str:
    if not value:
        return fallback
    value = value.strip().lstrip("#")
    if re.fullmatch(r"[0-9a-fA-F]{6}", value):
        return value.upper()
    return fallback


def xml_text(value: object) -> str:
    return escape(str(value or ""), quote=False)


def json_response(handler: SimpleHTTPRequestHandler, payload: dict, status: int = 200) -> None:
    raw = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(raw)))
    handler.end_headers()
    handler.wfile.write(raw)


def decode_entry(payload: bytes) -> str:
    return payload.decode("utf-8", errors="ignore")


def collect_hex_colors(text: str) -> Counter:
    matches = []
    for pattern in (r"#([0-9a-fA-F]{6})", r'srgbClr\s+val="([0-9a-fA-F]{6})"', r'color:\s*#?([0-9a-fA-F]{6})'):
        matches.extend(match.upper() for match in re.findall(pattern, text))
    return Counter(matches)


def color_role(hex_value: str) -> str:
    value = hex_value.upper().lstrip("#")
    if value in {"FFFFFF", "F8FAFC", "F7F3EA", "F6F7FB", "EDF7F3"}:
        return "paper"
    if value in {"000000", "0F172A", "111827", "07111F", "1D2939"}:
        return "ink"
    if value in {"667085", "475467", "98A2B3", "D0D5DD", "E4E7EC"}:
        return "neutral"
    return "accent candidate"


def palette_from_counter(counter: Counter, limit: int = 10) -> list[dict]:
    return [
        {"color": f"#{color}", "count": count, "role": color_role(color)}
        for color, count in counter.most_common(limit)
    ]


def collect_font_sizes(text: str) -> list[int]:
    sizes = []
    for value in re.findall(r'\bsz="(\d+)"', text):
        raw = int(value)
        if raw >= 100:
            sizes.append(max(7, min(96, round(raw / 100))))
    for value in re.findall(r"font-size\s*:\s*(\d+(?:\.\d+)?)px", text, re.I):
        sizes.append(max(7, min(120, round(float(value)))))
    return sizes


def summarize_font_sizes(sizes: list[int]) -> dict:
    if not sizes:
        return {"textRunCount": 0, "titleSize": 0, "bodySize": 0, "sizeRange": "n/a"}
    ordered = sorted(sizes)
    body_pool = [size for size in ordered if size < max(ordered)]
    body = body_pool[len(body_pool) // 2] if body_pool else ordered[len(ordered) // 2]
    return {
        "textRunCount": len(sizes),
        "titleSize": max(ordered),
        "bodySize": body,
        "sizeRange": f"{min(ordered)}-{max(ordered)}px",
    }


def extract_ppt_text(xml: str) -> list[str]:
    return [
        html_unescape(item).strip()
        for item in re.findall(r"<a:t>(.*?)</a:t>", xml, re.S)
        if html_unescape(item).strip()
    ]


def extract_html_text(raw: str) -> list[str]:
    text = re.sub(r"<script\b.*?</script>", " ", raw, flags=re.I | re.S)
    text = re.sub(r"<style\b.*?</style>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return [part.strip() for part in re.split(r"\s{2,}", html_unescape(text)) if part.strip()]


def text_preview(value: str, limit: int = 120) -> str:
    clean = re.sub(r"\s+", " ", str(value or "")).strip()
    return clean[:limit].rstrip()


def slugify(value: str, fallback: str = "imported-deck") -> str:
    base = re.sub(r"[^a-zA-Z0-9\u0600-\u06ff]+", "-", str(value or "").strip()).strip("-").lower()
    return base or fallback


def is_manifest_name(name: str) -> bool:
    base = Path(str(name).replace("\\", "/")).name.lower()
    return base.startswith("manifest") and base.endswith(".json")


def infer_reference_layout(index: int, texts: list[str], slide_count: int = 0) -> str:
    corpus = " ".join(texts or []).lower()
    if index == 1:
        return "cover"
    if index == slide_count and re.search(r"\b(next|decision|ask|close|closing|recommendation|commitment)\b", corpus):
        return "ask" if re.search(r"\b(ask|fund|investment|raise|runway)\b", corpus) else "next-steps"
    patterns = [
        ("problem", r"\b(problem|pain|challenge|friction|risk|gap)\b"),
        ("solution", r"\b(solution|proposed|system|platform|approach|recommendation)\b"),
        ("market", r"\b(market|opportunity|segment|tam|sam|demand)\b"),
        ("product", r"\b(product|experience|workflow|interface|feature)\b"),
        ("business-model", r"\b(model|pricing|revenue|monetization)\b"),
        ("traction", r"\b(traction|growth|adoption|customers|cohort|retention)\b"),
        ("gtm", r"\b(go[- ]?to[- ]?market|gtm|sales motion|pipeline|channels)\b"),
        ("financials", r"\b(financial|forecast|margin|burn|runway|arr|mrr|roi)\b"),
        ("proof", r"\b(proof|evidence|case|results|benchmark|pilot|metric)\b"),
        ("roadmap", r"\b(roadmap|timeline|rollout|implementation|phase|plan)\b"),
        ("commercial-case", r"\b(commercial|business case|payback|investment logic)\b"),
        ("differentiators", r"\b(differentiator|why us|advantage|defensible|moat)\b"),
        ("metrics", r"\b(metric|kpi|scorecard|performance|%|\$)\b"),
    ]
    for layout, pattern in patterns:
        if re.search(pattern, corpus):
            return layout
    if index == slide_count:
        return "closing"
    return "agenda" if index == 2 else "why"


def slide_outline_entry(index: int, texts: list[str], source: str = "", slide_count: int = 0) -> dict:
    cleaned = [text_preview(item, 180) for item in texts if text_preview(item, 180)]
    title = text_preview(cleaned[0] if cleaned else f"Slide {index}", 90) or f"Slide {index}"
    signals = [item for item in cleaned[1:6] if item and item != title]
    suggested_layout = infer_reference_layout(index, cleaned, slide_count)
    return {
        "slide": index,
        "title": title,
        "suggestedLayout": suggested_layout,
        "visualRole": "opening" if suggested_layout == "cover" else "close" if suggested_layout in {"closing", "next-steps", "ask"} else "body",
        "signals": signals,
        "source": source,
        "textCharacterCount": sum(len(item) for item in cleaned),
    }


def style_map(style: str) -> dict:
    pairs = {}
    for item in str(style or "").split(";"):
        if ":" not in item:
            continue
        key, value = item.split(":", 1)
        pairs[key.strip().lower()] = value.strip()
    return pairs


def attr_value(attrs: str, name: str) -> str:
    match = re.search(rf'{re.escape(name)}\s*=\s*(["\'])(.*?)\1', str(attrs or ""), re.I | re.S)
    return html_unescape(match.group(2)) if match else ""


def px_value(value: object, fallback: float = 0) -> float:
    match = re.search(r"-?\d+(?:\.\d+)?", str(value or ""))
    return float(match.group(0)) if match else fallback


def normalize_hex_token(value: str) -> str:
    match = re.search(r"#?([0-9a-fA-F]{6})", str(value or ""))
    return f"#{match.group(1).upper()}" if match else ""


def css_vars(raw: str) -> dict:
    return {
        name.strip(): normalize_hex_token(value)
        for name, value in re.findall(r"--([A-Za-z0-9_-]+)\s*:\s*([^;]+);", raw)
        if normalize_hex_token(value)
    }


def resolve_color_value(value: str, variables: dict | None = None) -> str:
    raw = str(value or "")
    var_match = re.search(r"var\(\s*--([A-Za-z0-9_-]+)\s*\)", raw)
    if var_match and variables:
        resolved = variables.get(var_match.group(1), "")
        if resolved:
            return resolved
    return normalize_hex_token(raw)


def hex_luminance(value: str) -> float:
    token = normalize_hex_token(value).lstrip("#")
    if len(token) != 6:
        return 1
    rgb = [int(token[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    def channel(raw: float) -> float:
        return raw / 12.92 if raw <= 0.03928 else ((raw + 0.055) / 1.055) ** 2.4
    r, g, b = [channel(item) for item in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def font_families(raw: str) -> list[str]:
    found = []
    for value in re.findall(r"font-family\s*:\s*([^;\"']+|['\"][^'\"]+['\"])", raw, re.I):
        name = value.strip().strip("'\"").split(",")[0].strip().strip("'\"")
        if name and name not in found:
            found.append(name)
    return found[:8]


def first_font_family(raw: str, fallback: str = "") -> str:
    families = font_families(f"font-family:{raw};" if raw and "font-family" not in raw.lower() else raw)
    return families[0] if families else fallback


def mime_for_name(name: str) -> str:
    guessed, _ = mimetypes.guess_type(name)
    return guessed or "application/octet-stream"


def image_data_uri(name: str, payload: bytes) -> str:
    return f"data:{mime_for_name(name)};base64,{base64.b64encode(payload).decode('ascii')}"


def image_extension(mime_type: str, fallback: str = "png") -> str:
    mapping = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/svg+xml": "svg",
    }
    return mapping.get(str(mime_type or "").lower(), fallback)


def data_uri_payload(src: str) -> tuple[str, bytes]:
    match = re.match(r"data:([^;,]+);base64,(.*)$", str(src or ""), re.S)
    if not match:
        return "", b""
    try:
        return match.group(1), base64.b64decode(match.group(2), validate=False)
    except Exception:
        return "", b""


def resolve_asset_ref(src: str, slide_name: str, assets: dict[str, bytes] | None) -> tuple[str, str, str]:
    raw = html_unescape(str(src or "")).strip()
    if not raw:
        return "", "", ""
    if raw.startswith("data:image/"):
        mime_type, payload = data_uri_payload(raw)
        return raw, "embedded-image", mime_type if payload else ""
    if not assets:
        return "", raw, ""
    clean = raw.split("?", 1)[0].split("#", 1)[0].replace("\\", "/")
    clean = re.sub(r"^\.\./assets/", "", clean)
    candidates = [
        clean,
        clean.lstrip("/"),
        posixpath.normpath(posixpath.join(posixpath.dirname(slide_name.replace("\\", "/")), clean)),
        posixpath.basename(clean),
        f"assets/{posixpath.basename(clean)}",
    ]
    asset_keys = {key.replace("\\", "/"): key for key in assets}
    basename_map = {posixpath.basename(key.replace("\\", "/")): key for key in assets}
    for candidate in candidates:
        key = asset_keys.get(candidate) or basename_map.get(posixpath.basename(candidate))
        if key and key in assets:
            return image_data_uri(key, assets[key]), key, mime_for_name(key)
    return "", raw, ""


def data_object_blocks(raw: str) -> list[tuple[str, str, str]]:
    blocks = []
    pattern = re.compile(r'<(?P<tag>[a-z0-9]+)\b(?P<attrs>[^>]*data-object=["\']true["\'][^>]*)>', re.I | re.S)
    pos = 0
    while True:
        match = pattern.search(raw, pos)
        if not match:
            break
        tag = match.group("tag").lower()
        attrs = match.group("attrs")
        body_start = match.end()
        if tag in {"img", "br", "hr", "input", "meta", "link"} or match.group(0).rstrip().endswith("/>"):
            blocks.append((tag, attrs, ""))
            pos = body_start
            continue
        token_re = re.compile(rf"</?{re.escape(tag)}\b[^>]*>", re.I | re.S)
        depth = 1
        end = body_start
        for token in token_re.finditer(raw, body_start):
            value = token.group(0)
            if value.startswith("</"):
                depth -= 1
            elif not value.rstrip().endswith("/>"):
                depth += 1
            if depth == 0:
                end = token.start()
                blocks.append((tag, attrs, raw[body_start:end]))
                pos = token.end()
                break
        else:
            blocks.append((tag, attrs, raw[body_start:]))
            break
    return blocks


def html_visual_recipe(index: int, raw: str, source: str, variables: dict | None = None, style_context: str = "") -> dict:
    objects = []
    for _, attrs, _ in data_object_blocks(raw):
        kind = (attr_value(attrs, "data-object-type") or "shape").lower()
        styles = style_map(attr_value(attrs, "style"))
        width = px_value(styles.get("width"))
        height = px_value(styles.get("height"))
        top = px_value(styles.get("top"))
        left = px_value(styles.get("left"))
        fill = resolve_color_value(styles.get("background") or styles.get("background-color") or "", variables)
        text_color = resolve_color_value(styles.get("color") or "", variables)
        objects.append({
            "kind": kind,
            "x": left,
            "y": top,
            "w": width,
            "h": height,
            "fill": fill,
            "textColor": text_color,
            "fontSize": px_value(styles.get("font-size")),
            "hasBorder": "border" in styles,
            "direction": styles.get("direction", ""),
            "textAlign": styles.get("text-align", ""),
        })
    text_like = [item for item in objects if item["kind"] in {"text", "textbox"}]
    shape_like = [item for item in objects if item["kind"] in {"shape", "imageblock", "image"}]
    colors = collect_hex_colors(raw + "\n" + style_context)
    dark_panels = [
        item for item in shape_like
        if item["fill"] and hex_luminance(item["fill"]) < 0.24 and item["w"] * item["h"] > SLIDE_W * SLIDE_H * 0.025
    ]
    accent_lines = [
        item for item in shape_like
        if item["fill"] and 0.25 <= hex_luminance(item["fill"]) <= 0.7 and min(item["w"] or 9999, item["h"] or 9999) <= 10 and max(item["w"], item["h"]) >= 40
    ]
    cards = [
        item for item in shape_like
        if item["w"] >= 240 and item["h"] >= 100 and item["hasBorder"] and item["w"] * item["h"] <= SLIDE_W * SLIDE_H * 0.25
    ]
    header_bar = any(item["y"] <= 5 and item["w"] >= 1500 and 50 <= item["h"] <= 140 for item in shape_like)
    footer_band = any(item["y"] >= 900 and item["w"] >= 1500 and 60 <= item["h"] <= 180 for item in shape_like)
    rtl = bool(re.search(r'dir=["\']rtl["\']|direction\s*:\s*rtl|[\u0600-\u06ff]', raw, re.I))
    page_number = bool(re.search(r"\b\d{2}\s*/\s*\d{2}\b|\b0[1-9]\b", raw))
    section_kicker = bool(re.search(r"الفصل|المشكلة|الحل|السوق|الخطة|FOUNDERS|THANK YOU|OUR VISION", raw, re.I))
    sizes = collect_font_sizes(raw + "\n" + style_context)
    object_count = len(objects)
    recipe_tags = []
    if rtl:
        recipe_tags.append("rtl")
    if dark_panels:
        recipe_tags.append("dark-panels")
    if accent_lines:
        recipe_tags.append("accent-lines")
    if cards:
        recipe_tags.append("card-grid")
    if header_bar or footer_band or page_number or section_kicker:
        recipe_tags.append("editorial-chrome")
    if max(sizes or [0]) >= 70:
        recipe_tags.append("large-title")
    return {
        "slide": index,
        "source": source,
        "objectCount": object_count,
        "textObjectCount": len(text_like),
        "shapeObjectCount": len(shape_like),
        "avgObjectArea": round(sum(item["w"] * item["h"] for item in objects) / max(1, object_count)),
        "rtl": rtl,
        "fontFamilies": font_families(raw + "\n" + style_context),
        "maxFontSize": max(sizes or [0]),
        "darkPanelCount": len(dark_panels),
        "accentLineCount": len(accent_lines),
        "cardCount": len(cards),
        "hasHeaderBar": header_bar,
        "hasFooterBand": footer_band,
        "hasPageNumber": page_number,
        "hasSectionKicker": section_kicker,
        "paletteCount": len(colors),
        "tags": recipe_tags,
    }


def manifest_slide_visual_recipe(index: int, slide: dict, source: str) -> dict:
    elements = slide.get("elements") if isinstance(slide.get("elements"), list) else []
    text_like = [item for item in elements if item.get("type") == "text"]
    shape_like = [item for item in elements if item.get("type") in {"shape", "imageBlock"}]
    dark_panels = [
        item for item in shape_like
        if normalize_hex_token(item.get("fill")) and hex_luminance(str(item.get("fill"))) < 0.24
        and float(item.get("w", 0) or 0) * float(item.get("h", 0) or 0) > SLIDE_W * SLIDE_H * 0.025
    ]
    accent_lines = [
        item for item in shape_like
        if min(float(item.get("w", 9999) or 9999), float(item.get("h", 9999) or 9999)) <= 18
        and max(float(item.get("w", 0) or 0), float(item.get("h", 0) or 0)) >= 40
    ]
    cards = [
        item for item in shape_like
        if float(item.get("w", 0) or 0) >= 240 and float(item.get("h", 0) or 0) >= 100
        and float(item.get("w", 0) or 0) * float(item.get("h", 0) or 0) <= SLIDE_W * SLIDE_H * 0.25
    ]
    all_text = " ".join(str(item.get("text", "")) for item in text_like)
    rtl = any(item.get("rtl") for item in text_like) or bool(re.search(r"[\u0600-\u06ff]", all_text))
    fonts = []
    for item in text_like:
        font = str(item.get("font", "")).strip()
        if font and font not in fonts:
            fonts.append(font)
    sizes = [int(float(item.get("size", 0) or 0)) for item in text_like]
    tags = []
    if rtl:
        tags.append("rtl")
    if dark_panels:
        tags.append("dark-panels")
    if accent_lines:
        tags.append("accent-lines")
    if len(cards) >= 2:
        tags.append("card-grid")
    if any(re.search(r"الفصل|\d{2}\s*/\s*\d{2}|OUR VISION|THANK", str(item.get("text", "")), re.I) for item in text_like):
        tags.append("editorial-chrome")
    if max(sizes or [0]) >= 70:
        tags.append("large-title")
    return {
        "slide": index,
        "source": source,
        "objectCount": len(elements),
        "textObjectCount": len(text_like),
        "shapeObjectCount": len(shape_like),
        "avgObjectArea": round(sum(float(item.get("w", 0) or 0) * float(item.get("h", 0) or 0) for item in elements) / max(1, len(elements))),
        "rtl": rtl,
        "fontFamilies": fonts[:8],
        "maxFontSize": max(sizes or [0]),
        "darkPanelCount": len(dark_panels),
        "accentLineCount": len(accent_lines),
        "cardCount": len(cards),
        "hasHeaderBar": any(float(item.get("y", 999) or 999) <= 5 and float(item.get("w", 0) or 0) >= 1500 for item in shape_like),
        "hasFooterBand": any(float(item.get("y", 0) or 0) >= 900 and float(item.get("w", 0) or 0) >= 1500 for item in shape_like),
        "hasPageNumber": bool(re.search(r"\b\d{2}\s*/\s*\d{2}\b|\b0[1-9]\b", all_text)),
        "hasSectionKicker": bool(re.search(r"الفصل|المشكلة|الحل|السوق|الخطة|FOUNDERS|THANK YOU|OUR VISION", all_text, re.I)),
        "paletteCount": len({normalize_hex_token(item.get("fill")) for item in elements if normalize_hex_token(item.get("fill"))}),
        "tags": tags,
    }


def pptx_visual_recipe(index: int, xml: str, source: str) -> dict:
    texts = extract_ppt_text(xml)
    sizes = collect_font_sizes(xml)
    colors = collect_hex_colors(xml)
    shape_count = len(re.findall(r"<p:sp\b", xml))
    text_count = len(re.findall(r"<p:txBody\b", xml))
    rtl = 'rtl="1"' in xml or bool(re.search(r"[\u0600-\u06ff]", " ".join(texts)))
    dark_colors = sum(count for hex_value, count in colors.items() if hex_luminance(f"#{hex_value}") < 0.24)
    mid_colors = sum(count for hex_value, count in colors.items() if 0.25 <= hex_luminance(f"#{hex_value}") <= 0.7)
    all_text = " ".join(texts)
    tags = []
    if rtl:
        tags.append("rtl")
    if dark_colors:
        tags.append("dark-panels")
    if mid_colors:
        tags.append("accent-lines")
    if bool(re.search(r"الفصل|\d{2}\s*/\s*\d{2}|OUR VISION|THANK", all_text, re.I)):
        tags.append("editorial-chrome")
    if max(sizes or [0]) >= 56:
        tags.append("large-title")
    return {
        "slide": index,
        "source": source,
        "objectCount": shape_count,
        "textObjectCount": text_count,
        "shapeObjectCount": max(0, shape_count - text_count),
        "avgObjectArea": 0,
        "rtl": rtl,
        "fontFamilies": re.findall(r'typeface="([^"]+)"', xml)[:8],
        "maxFontSize": max(sizes or [0]),
        "darkPanelCount": dark_colors,
        "accentLineCount": mid_colors,
        "cardCount": 0,
        "hasHeaderBar": False,
        "hasFooterBand": False,
        "hasPageNumber": bool(re.search(r"\b\d{2}\s*/\s*\d{2}\b|\b0[1-9]\b", all_text)),
        "hasSectionKicker": bool(re.search(r"الفصل|المشكلة|الحل|السوق|الخطة|FOUNDERS|THANK YOU|OUR VISION", all_text, re.I)),
        "paletteCount": len(colors),
        "tags": tags,
    }


def summarize_visual_recipes(recipes: list[dict]) -> dict:
    if not recipes:
        return {
            "available": False,
            "summary": "No visual recipe could be extracted.",
            "tags": [],
            "recommendations": [],
        }
    slide_count = len(recipes)
    tag_counter = Counter(tag for recipe in recipes for tag in recipe.get("tags", []))
    font_counter = Counter(font for recipe in recipes for font in recipe.get("fontFamilies", []))
    rtl_count = sum(1 for recipe in recipes if recipe.get("rtl"))
    chrome_count = sum(1 for recipe in recipes if recipe.get("hasHeaderBar") or recipe.get("hasFooterBand") or recipe.get("hasPageNumber") or recipe.get("hasSectionKicker"))
    card_count = sum(recipe.get("cardCount", 0) for recipe in recipes)
    avg_objects = round(sum(recipe.get("objectCount", 0) for recipe in recipes) / max(1, slide_count), 1)
    avg_cards = round(card_count / max(1, slide_count), 1)
    max_title = max(recipe.get("maxFontSize", 0) for recipe in recipes)
    rtl_ratio = rtl_count / max(1, slide_count)
    chrome_ratio = chrome_count / max(1, slide_count)
    density = "composed" if avg_objects >= 18 else "structured" if avg_objects >= 10 else "minimal"
    benchmark = "Arabic Luxe" if rtl_ratio >= 0.6 and chrome_ratio >= 0.5 and ("dark-panels" in tag_counter or "accent-lines" in tag_counter) else "Professional"
    recommendations = []
    if rtl_ratio >= 0.6:
        recommendations.append("Preserve RTL text flow and Arabic font choices.")
    if chrome_ratio >= 0.5:
        recommendations.append("Reuse section kickers, page numbers, and footer/header chrome.")
    if avg_cards >= 1:
        recommendations.append("Use repeated cards or stat blocks rather than plain bullet lists.")
    if "dark-panels" in tag_counter:
        recommendations.append("Balance white canvas with dark navy panels for premium contrast.")
    if "accent-lines" in tag_counter:
        recommendations.append("Use thin accent rules as navigation and hierarchy cues.")
    return {
        "available": True,
        "benchmark": benchmark,
        "density": density,
        "avgObjectsPerSlide": avg_objects,
        "avgCardsPerSlide": avg_cards,
        "rtlSlideRatio": round(rtl_ratio, 2),
        "chromeSlideRatio": round(chrome_ratio, 2),
        "maxTitleSize": max_title,
        "topFonts": [{"font": font, "count": count} for font, count in font_counter.most_common(5)],
        "tags": [tag for tag, _ in tag_counter.most_common(8)],
        "summary": f"{benchmark} reference with {density} visual density, {avg_objects} objects/slide, {round(rtl_ratio * 100)}% RTL slides, and {round(chrome_ratio * 100)}% editorial chrome coverage.",
        "recommendations": recommendations,
    }


def suggested_accent(palette: list[dict]) -> str:
    for item in palette:
        role = item.get("role")
        color_value = item.get("color", "")
        if role == "accent candidate" and color_value.upper() not in {"#FFFFFF", "#000000"}:
            return color_value
    return palette[0]["color"] if palette else "#9a6a16"


def density_from_text(text_count: int, slide_count: int) -> str:
    per_slide = text_count / max(1, slide_count)
    if per_slide > 850:
        return "dense"
    if per_slide > 420:
        return "balanced"
    return "visual"


def analyze_pptx_zip(z: zipfile.ZipFile, filename: str) -> dict:
    names = z.namelist()
    slide_names = sorted(
        [name for name in names if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)],
        key=lambda value: int(re.search(r"(\d+)", value).group(1)),
    )
    notes_names = [name for name in names if re.fullmatch(r"ppt/notesSlides/notesSlide\d+\.xml", name)]
    media_names = [name for name in names if name.startswith("ppt/media/")]
    slide_payloads = [(name, decode_entry(z.read(name))) for name in slide_names[:80]]
    xml_payload = "\n".join(payload for _, payload in slide_payloads)
    slide_outline = [
        slide_outline_entry(index, extract_ppt_text(payload), name, len(slide_payloads))
        for index, (name, payload) in enumerate(slide_payloads, start=1)
    ]
    texts = [text for _, payload in slide_payloads for text in extract_ppt_text(payload)]
    colors = collect_hex_colors(xml_payload)
    sizes = collect_font_sizes(xml_payload)
    embedded_manifest = {}
    if "ppt/deckforge-manifest.json" in names:
        try:
            embedded_manifest = json.loads(decode_entry(z.read("ppt/deckforge-manifest.json")))
        except Exception:
            embedded_manifest = {}
    manifest_slides = embedded_manifest.get("slides") if isinstance(embedded_manifest.get("slides"), list) else []
    visual_recipes = [
        manifest_slide_visual_recipe(index, slide, slide.get("filename", f"slide-{index}.html"))
        for index, slide in enumerate(manifest_slides[:80], start=1)
    ] if manifest_slides else [
        pptx_visual_recipe(index, payload, name)
        for index, (name, payload) in enumerate(slide_payloads, start=1)
    ]
    palette = palette_from_counter(colors)
    density = density_from_text(sum(len(item) for item in texts), len(slide_names))
    return build_reference_payload(
        filename=filename,
        kind="PPTX",
        slide_count=len(slide_names),
        palette=palette,
        typography=summarize_font_sizes(sizes),
        density=density,
        texts=texts,
        structure={
            "slideFiles": len(slide_names),
            "notesFiles": len(notes_names),
            "mediaFiles": len(media_names),
            "xmlFiles": len([name for name in names if name.endswith(".xml")]),
            "embeddedDeckForgeManifest": bool(embedded_manifest),
        },
        imported_deck_dna=embedded_manifest.get("deckDNA") or {},
        slide_outline=slide_outline,
        visual_recipes=visual_recipes,
        media_count=len(media_names),
    )


def analyze_html_zip(z: zipfile.ZipFile, filename: str) -> dict:
    names = z.namelist()
    html_names = [name for name in names if name.lower().endswith((".html", ".htm"))]
    css_names = [name for name in names if name.lower().endswith(".css")]
    json_names = [name for name in names if name.lower().endswith(".json")]
    media_names = [name for name in names if re.search(r"\.(png|jpe?g|webp|gif|svg)$", name, re.I)]
    manifest = {}
    imported_dna = {}
    for name in json_names:
        if is_manifest_name(name):
            try:
                manifest = json.loads(decode_entry(z.read(name)))
                imported_dna = manifest.get("deckDNA") or {}
                break
            except Exception:
                continue
    html_payloads = [(name, decode_entry(z.read(name))) for name in html_names[:80]]
    css_payload = "\n".join(decode_entry(z.read(name)) for name in css_names[:40])
    variables = css_vars(css_payload)
    payload = "\n".join(raw for _, raw in html_payloads)
    texts = [text for _, raw in html_payloads for text in extract_html_text(raw)]
    colors = collect_hex_colors(payload + "\n" + css_payload)
    sizes = collect_font_sizes(payload + "\n" + css_payload)
    manifest_slides = manifest.get("slides") if isinstance(manifest.get("slides"), list) else []
    if manifest_slides:
        slide_outline = [
            slide_outline_entry(
                index,
                [
                    str(slide.get("title", "")),
                    str(slide.get("brief", "")),
                    str(slide.get("speakerNotes", "")),
                    str(slide.get("qaFocus", "")),
                ],
                slide.get("filename", ""),
                len(manifest_slides),
            )
            for index, slide in enumerate(manifest_slides[:80], start=1)
        ]
        visual_recipes = [
            manifest_slide_visual_recipe(index, slide, slide.get("filename", f"slide-{index}.html"))
            for index, slide in enumerate(manifest_slides[:80], start=1)
        ]
    else:
        slide_outline = [
            slide_outline_entry(index, extract_html_text(raw), name, len(html_payloads))
            for index, (name, raw) in enumerate(html_payloads, start=1)
        ]
        visual_recipes = [
            html_visual_recipe(index, raw, name, variables, css_payload)
            for index, (name, raw) in enumerate(html_payloads, start=1)
        ]
    slide_count = len(slide_outline) or len(html_names) or len(manifest.get("playlist", [])) or len(manifest.get("slides", []))
    palette = palette_from_counter(colors)
    density = density_from_text(sum(len(item) for item in texts), slide_count)
    return build_reference_payload(
        filename=filename,
        kind="HTML/Project ZIP",
        slide_count=slide_count,
        palette=palette,
        typography=summarize_font_sizes(sizes),
        density=density,
        texts=texts,
        structure={
            "htmlFiles": len(html_names),
            "cssFiles": len(css_names),
            "jsonFiles": len(json_names),
            "mediaFiles": len(media_names),
            "manifestPresent": bool(manifest),
            "embeddedDeckDNA": bool(imported_dna),
        },
        imported_deck_dna=imported_dna,
        slide_outline=slide_outline,
        visual_recipes=visual_recipes,
        media_count=len(media_names),
    )


def build_reference_payload(
    filename: str,
    kind: str,
    slide_count: int,
    palette: list[dict],
    typography: dict,
    density: str,
    texts: list[str],
    structure: dict,
    imported_deck_dna: dict,
    media_count: int = 0,
    slide_outline: list[dict] | None = None,
    visual_recipes: list[dict] | None = None,
) -> dict:
    accent = suggested_accent(palette)
    text_count = sum(len(item) for item in texts)
    fingerprint = f"{kind} / {slide_count or 1} slides / {density} / {len(palette)} colors / {media_count} media"
    samples = texts[:8]
    takeaways = [
        f"Detected {slide_count or 1} slide-like file{'s' if (slide_count or 1) != 1 else ''} with {len(palette)} dominant color token{'s' if len(palette) != 1 else ''}.",
        f"Typography ranges {typography.get('sizeRange', 'n/a')} with a {density} information density signal.",
    ]
    if media_count:
        takeaways.append(f"Found {media_count} embedded media asset{'s' if media_count != 1 else ''}; reserve visual placeholders when recreating the deck.")
    if slide_outline:
        takeaways.append(f"Extracted {len(slide_outline)} slide outline cue{'s' if len(slide_outline) != 1 else ''} for structure reuse.")
    visual_recipe = summarize_visual_recipes(visual_recipes or [])
    if visual_recipe.get("available"):
        takeaways.append(f"Visual recipe: {visual_recipe.get('summary')}")
        takeaways.extend(visual_recipe.get("recommendations", [])[:3])
    if imported_deck_dna:
        takeaways.append("Embedded Deck DNA was found and can be reused directly.")
    return {
        "fileName": filename,
        "kind": kind,
        "slideCount": slide_count,
        "fingerprint": fingerprint,
        "summary": f"{filename} reads as a {density} {kind} reference deck with {slide_count or 1} slides and {len(palette)} visible style colors.",
        "suggestedAccent": accent,
        "density": density,
        "palette": palette,
        "typography": typography,
        "structure": structure,
        "assets": {"mediaCount": media_count},
        "slideOutline": slide_outline or [],
        "outlineCount": len(slide_outline or []),
        "visualRecipe": visual_recipe,
        "slideVisualRecipes": visual_recipes or [],
        "visualRecipeCount": len(visual_recipes or []),
        "textSamples": samples,
        "textCharacterCount": text_count,
        "importedDeckDNA": imported_deck_dna,
        "reusablePrompt": f"Create a professional deck that matches this reference: {fingerprint}; use {accent} as a primary accent, {density} density, title hierarchy near {typography.get('titleSize') or 56}px, body text near {typography.get('bodySize') or 24}px, and a polished slide-by-slide narrative.",
        "takeaways": takeaways,
    }


def analyze_reference_deck(filename: str, data: bytes) -> dict:
    if not data:
        raise ValueError("No reference deck file received.")
    lower = filename.lower()
    if zipfile.is_zipfile(BytesIO(data)):
        with zipfile.ZipFile(BytesIO(data)) as z:
            names = z.namelist()
            if any(name.startswith("ppt/slides/slide") for name in names):
                return analyze_pptx_zip(z, filename)
            return analyze_html_zip(z, filename)
    raw = decode_entry(data)
    texts = extract_html_text(raw)
    colors = collect_hex_colors(raw)
    sizes = collect_font_sizes(raw)
    palette = palette_from_counter(colors)
    kind = "HTML" if lower.endswith((".html", ".htm")) or "<html" in raw.lower() else "Text"
    return build_reference_payload(
        filename=filename,
        kind=kind,
        slide_count=1,
        palette=palette,
        typography=summarize_font_sizes(sizes),
        density=density_from_text(sum(len(item) for item in texts), 1),
        texts=texts,
        structure={"rawBytes": len(data)},
        imported_deck_dna={},
        slide_outline=[slide_outline_entry(1, texts, filename, 1)],
        visual_recipes=[html_visual_recipe(1, raw, filename, css_vars(raw), raw)] if kind == "HTML" else [],
        media_count=0,
    )


def ordered_html_payloads(z: zipfile.ZipFile, manifest: dict) -> list[tuple[str, str]]:
    names = z.namelist()
    html_names = [name for name in names if name.lower().endswith((".html", ".htm")) and not name.lower().endswith("index.html")]
    by_exact = {name.replace("\\", "/"): name for name in html_names}
    by_base = {Path(name).name: name for name in html_names}
    ordered = []
    for item in manifest.get("playlist", []) if isinstance(manifest.get("playlist"), list) else []:
        key = str(item).replace("\\", "/")
        name = by_exact.get(key) or by_base.get(Path(key).name)
        if name and name not in ordered:
            ordered.append(name)
    for name in html_names:
        if name not in ordered:
            ordered.append(name)
    return [(name, decode_entry(z.read(name))) for name in ordered[:80]]


def html_fragment_text(value: str) -> str:
    return "\n".join(extract_html_text(value))


def css_number(styles: dict, key: str, fallback: float = 0) -> float:
    return px_value(styles.get(key), fallback)


def style_font_name(styles: dict, fallback: str = "") -> str:
    return first_font_family(styles.get("font-family", ""), fallback)


def style_line_height(styles: dict, fallback: float = 1.18) -> float:
    raw = str(styles.get("line-height", "")).strip()
    if not raw:
        return fallback
    if raw.endswith("px"):
        return max(0.9, min(2.4, px_value(raw) / max(1, css_number(styles, "font-size", 24))))
    match = re.search(r"\d+(?:\.\d+)?", raw)
    return max(0.9, min(2.4, float(match.group(0)))) if match else fallback


def style_bold(styles: dict) -> bool:
    raw = str(styles.get("font-weight", "")).lower()
    if raw in {"bold", "bolder"}:
        return True
    match = re.search(r"\d+", raw)
    return bool(match and int(match.group(0)) >= 700)


def element_fill(styles: dict, variables: dict, fallback: str = "#FFFFFF") -> str:
    return resolve_color_value(styles.get("background") or styles.get("background-color") or "", variables) or fallback


def element_stroke(styles: dict, variables: dict, fallback: str = "") -> str:
    border = styles.get("border") or styles.get("border-color") or ""
    return resolve_color_value(border, variables) or fallback


def element_radius(styles: dict) -> int:
    return int(max(0, min(80, px_value(styles.get("border-radius")))))


def child_text_blocks(inner: str) -> list[tuple[dict, str]]:
    blocks = []
    for match in re.finditer(r'<(?P<tag>div|span|p|strong|em)\b(?P<attrs>[^>]*)>(?P<body>.*?)</(?P=tag)>', inner, re.I | re.S):
        text = html_fragment_text(match.group("body"))
        if not text:
            continue
        blocks.append((style_map(attr_value(match.group("attrs"), "style")), text))
    return blocks


def imported_text_element(
    outer_styles: dict,
    inner_styles: dict,
    text: str,
    x: float,
    y: float,
    w: float,
    h: float,
    rtl: bool,
    variables: dict,
) -> dict:
    merged = {**outer_styles, **{k: v for k, v in inner_styles.items() if v}}
    size = int(max(9, min(180, css_number(merged, "font-size", 24 if rtl else 22))))
    font = style_font_name(merged, "Tajawal" if rtl else "Aptos")
    fill = resolve_color_value(merged.get("color") or "", variables) or ("#243043" if rtl else "#111827")
    align = merged.get("text-align") or ("right" if rtl else "left")
    if align not in {"right", "left", "center"}:
        align = "right" if rtl else "left"
    return {
        "type": "text",
        "text": text_preview(text, 1600),
        "x": round(x),
        "y": round(y),
        "w": max(24, round(w)),
        "h": max(20, round(h)),
        "size": size,
        "fill": fill,
        "bold": style_bold(merged),
        "align": align,
        "rtl": rtl or count_arabic_chars(text) > 0,
        "font": font,
        "lineHeight": style_line_height(merged),
    }


def count_arabic_chars(value: str) -> int:
    return len(re.findall(r"[\u0600-\u06ff]", str(value or "")))


def import_html_objects(raw: str, variables: dict, fallback_bg: str, assets: dict[str, bytes] | None = None, slide_name: str = "") -> list[dict]:
    elements: list[dict] = []
    rtl_page = bool(re.search(r'dir=["\']rtl["\']|direction\s*:\s*rtl|[\u0600-\u06ff]', raw, re.I))
    background = fallback_bg or "#FFFFFF"
    elements.append({"type": "shape", "x": 0, "y": 0, "w": SLIDE_W, "h": SLIDE_H, "fill": background, "stroke": background})
    for _, attrs, body in data_object_blocks(raw):
        kind = (attr_value(attrs, "data-object-type") or "shape").lower()
        styles = style_map(attr_value(attrs, "style"))
        x = css_number(styles, "left")
        y = css_number(styles, "top")
        w = css_number(styles, "width")
        h = css_number(styles, "height")
        if w <= 0 or h <= 0:
            continue
        if kind in {"image", "imageblock"}:
            image_match = re.search(r"<img\b([^>]*)>", body, re.I | re.S)
            image_attrs = image_match.group(1) if image_match else ""
            src = attr_value(image_attrs, "src")
            image_styles = style_map(attr_value(image_attrs, "style"))
            resolved_src, source_name, mime_type = resolve_asset_ref(src, slide_name, assets)
            if resolved_src:
                elements.append({
                    "type": "image",
                    "x": round(x),
                    "y": round(y),
                    "w": round(w),
                    "h": round(h),
                    "src": resolved_src,
                    "sourceName": source_name,
                    "mimeType": mime_type or mime_for_name(source_name),
                    "fit": image_styles.get("object-fit") or styles.get("object-fit") or "cover",
                    "alt": attr_value(image_attrs, "alt"),
                    "fill": element_fill(styles, variables, "#111111"),
                    "stroke": element_stroke(styles, variables, "transparent") or "transparent",
                    "radius": element_radius(styles),
                })
                continue
            kind = "imageblock"
        if kind == "shape":
            fill = element_fill(styles, variables, "#F3F4F6")
            stroke = element_stroke(styles, variables, fill)
            elements.append({
                "type": "shape",
                "x": round(x),
                "y": round(y),
                "w": round(w),
                "h": round(h),
                "fill": fill,
                "stroke": stroke,
                "radius": element_radius(styles),
            })
            continue
        if kind == "imageblock":
            fill = element_fill(styles, variables, "#F3F4F6")
            elements.append({
                "type": "imageBlock",
                "x": round(x),
                "y": round(y),
                "w": round(w),
                "h": round(h),
                "fill": fill,
                "stroke": element_stroke(styles, variables, fill),
                "radius": element_radius(styles),
            })
            continue
        if kind not in {"text", "textbox"}:
            continue
        text = html_fragment_text(body)
        if not text:
            continue
        rtl = rtl_page or count_arabic_chars(text) > 0 or styles.get("direction") == "rtl"
        blocks = child_text_blocks(body)
        if len(blocks) <= 1:
            inner_styles = blocks[0][0] if blocks else {}
            inner_text = blocks[0][1] if blocks else text
            elements.append(imported_text_element(styles, inner_styles, inner_text, x, y, w, h, rtl, variables))
            continue
        cursor = 0.0
        for inner_styles, inner_text in blocks:
            margin_top = css_number(inner_styles, "margin-top")
            cursor += max(0, margin_top)
            size = css_number({**styles, **inner_styles}, "font-size", 24)
            line_height = style_line_height({**styles, **inner_styles})
            lines = max(1, inner_text.count("\n") + 1)
            block_h = min(max(24, size * line_height * lines + 10), max(24, h - cursor))
            elements.append(imported_text_element(styles, inner_styles, inner_text, x, y + cursor, w, block_h, rtl, variables))
            cursor += block_h
            if cursor >= h:
                break
    return elements


def imported_theme_from_analysis(analysis: dict) -> dict:
    palette = analysis.get("palette") or []
    colors = [item.get("color", "") for item in palette if normalize_hex_token(item.get("color", ""))]
    dark = [color for color in colors if hex_luminance(color) < 0.22]
    light = [color for color in colors if hex_luminance(color) > 0.82]
    accent = analysis.get("suggestedAccent") or (colors[0] if colors else "#0B4F6C")
    accent2 = next((color for color in colors if color != accent and 0.18 < hex_luminance(color) < 0.75), "#C08A2E")
    bg = dark[0] if dark and (analysis.get("visualRecipe", {}).get("benchmark") == "Arabic Luxe") else (light[0] if light else "#FFFFFF")
    paper = bg
    ink = dark[0] if light else "#F5F1E8"
    return {
        "name": f"Imported {analysis.get('kind', 'Deck')} Style",
        "bg": bg,
        "paper": paper,
        "ink": ink,
        "muted": "#5B6472" if light else "#A8A29A",
        "accent": accent,
        "accent2": accent2,
        "white": "#FFFFFF",
        "rtlPremium": analysis.get("visualRecipe", {}).get("rtlSlideRatio", 0) >= 0.5,
        "fontArabic": "Tajawal",
        "fontBody": "Tajawal",
        "fontLatin": "Amiri",
    }


def slide_background(raw: str, css_payload: str, variables: dict, theme: dict) -> str:
    for source in (raw, css_payload):
        match = re.search(r"slide-container[^{]*\{[^}]*background\s*:\s*([^;]+)", source, re.I | re.S)
        if match:
            color_value = resolve_color_value(match.group(1), variables)
            if color_value:
                return color_value
    for source in (raw, css_payload):
        match = re.search(r"body[^{]*\{[^}]*background\s*:\s*([^;]+)", source, re.I | re.S)
        if match:
            color_value = resolve_color_value(match.group(1), variables)
            if color_value:
                return color_value
    return theme.get("paper") or theme.get("bg") or "#FFFFFF"


def import_html_deck(filename: str, html_payloads: list[tuple[str, str]], css_payload: str, manifest: dict, analysis: dict, assets: dict[str, bytes] | None = None) -> dict:
    variables = css_vars(css_payload)
    theme = imported_theme_from_analysis(analysis)
    title = manifest.get("metadata", {}).get("title") or (analysis.get("slideOutline") or [{}])[0].get("title") or Path(filename).stem
    slide_count = len(html_payloads)
    slides = []
    for index, (name, raw) in enumerate(html_payloads, start=1):
        texts = extract_html_text(raw)
        outline = slide_outline_entry(index, texts, name, slide_count)
        bg = slide_background(raw, css_payload, variables, theme)
        elements = import_html_objects(raw, variables, bg, assets, name)
        title_text = outline.get("title") or text_preview(texts[0] if texts else f"Slide {index}", 90)
        slides.append({
            "id": f"slide-{index}",
            "filename": Path(name).name,
            "layout": outline.get("suggestedLayout") or ("cover" if index == 1 else "closing" if index == slide_count else "why"),
            "title": title_text,
            "brief": "Imported editable slide from reference HTML.",
            "speakerNotes": "Imported from a Genspark-style HTML deck; review copy, evidence, and visual alignment before final delivery.",
            "qaFocus": "Imported object fidelity, Arabic RTL flow, overflow, contrast, and export safety",
            "elements": elements,
        })
    outline = [
        {
            "slide": i,
            "layout": slide.get("layout"),
            "role": "opening" if i == 1 else "close" if i == slide_count else "body",
            "title": slide.get("title"),
            "brief": slide.get("brief"),
            "speakerNotes": slide.get("speakerNotes"),
            "qaFocus": slide.get("qaFocus"),
        }
        for i, slide in enumerate(slides, start=1)
    ]
    return {
        "schemaVersion": "1.0",
        "format": "html",
        "metadata": {
            "title": title,
            "description": manifest.get("metadata", {}).get("description") or f"Editable import from {filename}",
            "author": "DeckForge Import",
            "slug": slugify(title),
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "importedFrom": filename,
            "referenceDeck": filename,
            "referenceFingerprint": analysis.get("fingerprint", ""),
            "importMode": "editable-html",
        },
        "canvas": {"width": SLIDE_W, "height": SLIDE_H},
        "theme": theme,
        "brand": {"name": manifest.get("metadata", {}).get("title", title), "configured": True},
        "evidence": [],
        "sources": [],
        "documents": [],
        "charts": [],
        "references": [],
        "referenceAnalysis": analysis,
        "sourceMap": {},
        "template": None,
        "keywords": [],
        "archetype": "success-story" if analysis.get("visualRecipe", {}).get("rtlSlideRatio", 0) >= 0.5 else "general",
        "strategy": {
            "audience": "Imported reference deck audience",
            "objective": "Editable Genspark-style deck import",
            "tone": "Reference-faithful",
            "referenceFingerprint": analysis.get("fingerprint", ""),
        },
        "agentLog": [],
        "plan": outline,
        "outline": outline,
        "playlist": [slide.get("filename") for slide in slides],
        "variants": [],
        "slides": slides,
    }


def import_deck_file(filename: str, data: bytes) -> dict:
    if not data:
        raise ValueError("No deck file received.")
    lower = filename.lower()
    if zipfile.is_zipfile(BytesIO(data)):
        with zipfile.ZipFile(BytesIO(data)) as z:
            names = z.namelist()
            if any(name.startswith("ppt/slides/slide") for name in names):
                manifest_name = next((name for name in names if name.endswith("deckforge-manifest.json")), "")
                if manifest_name:
                    manifest = json.loads(decode_entry(z.read(manifest_name)))
                    if isinstance(manifest.get("slides"), list) and manifest.get("slides") and manifest["slides"][0].get("elements"):
                        return {"deck": manifest, "referenceAnalysis": analyze_pptx_zip(z, filename)}
                raise ValueError("Editable PPTX import is available for DeckForge-native manifests only. Upload the HTML/ZIP export for Genspark-style editable import.")
            json_names = [name for name in names if name.lower().endswith(".json")]
            manifest = {}
            for name in json_names:
                if is_manifest_name(name):
                    try:
                        manifest = json.loads(decode_entry(z.read(name)))
                        break
                    except Exception:
                        manifest = {}
            css_payload = "\n".join(decode_entry(z.read(name)) for name in names if name.lower().endswith(".css"))
            assets = {
                name: z.read(name)
                for name in names
                if re.search(r"\.(png|jpe?g|webp|gif|svg)$", name, re.I)
            }
            html_payloads = ordered_html_payloads(z, manifest)
            if not html_payloads:
                raise ValueError("No HTML slides found in the uploaded deck.")
            analysis = analyze_html_zip(z, filename)
            return {"deck": import_html_deck(filename, html_payloads, css_payload, manifest, analysis, assets), "referenceAnalysis": analysis}
    raw = decode_entry(data)
    if lower.endswith((".html", ".htm")) or "<html" in raw.lower():
        analysis = analyze_reference_deck(filename, data)
        manifest = {"metadata": {"title": text_preview((analysis.get("slideOutline") or [{}])[0].get("title") or Path(filename).stem, 90)}}
        return {"deck": import_html_deck(filename, [(filename, raw)], raw, manifest, analysis), "referenceAnalysis": analysis}
    raise ValueError("Editable import supports HTML files and ZIP/.slides folders that contain HTML slides.")


def text_runs(text: str, size: int, fill: str, bold: bool, font: str) -> str:
    size = max(700, min(int(size) * 100, 9600))
    bold_attr = ' b="1"' if bold else ""
    safe_font = escape(font or "Aptos", quote=True)
    fill = color(fill, "111827")
    lang = "ar-SA" if re.search(r"[\u0600-\u06ff]", str(text or "")) else "en-US"
    parts = []
    for line in str(text or "").splitlines() or [""]:
        parts.append(
            f"""
            <a:p>
              <a:r>
                <a:rPr lang="{lang}" sz="{size}"{bold_attr}>
                  <a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>
                  <a:latin typeface="{safe_font}"/>
                  <a:cs typeface="{safe_font}"/>
                </a:rPr>
                <a:t>{xml_text(line)}</a:t>
              </a:r>
              <a:endParaRPr lang="{lang}" sz="{size}"/>
            </a:p>
            """
        )
    return "\n".join(parts)


def text_box(element: dict, shape_id: int) -> str:
    rtl = bool(element.get("rtl"))
    align = element.get("align") or ("right" if rtl else "left")
    align_map = {"left": "l", "center": "ctr", "right": "r"}
    x = px_to_emu_x(element.get("x", 0))
    y = px_to_emu_y(element.get("y", 0))
    w = max(px_to_emu_x(element.get("w", 100)), 1000)
    h = max(px_to_emu_y(element.get("h", 40)), 1000)
    font = element.get("font") or ("Tajawal" if rtl else "Aptos")
    rtl_attr = ' rtl="1"' if rtl else ""
    paragraph_props = f'<a:pPr algn="{align_map.get(align, "l")}"{rtl_attr}/>'
    runs = text_runs(
        str(element.get("text", "")),
        int(element.get("size", 32)),
        element.get("fill") or element.get("color"),
        bool(element.get("bold")),
        font,
    )
    runs = runs.replace("<a:p>", f"<a:p>{paragraph_props}")
    return f"""
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="{shape_id}" name="Text {shape_id}"/>
        <p:cNvSpPr txBox="1"/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:noFill/>
        <a:ln><a:noFill/></a:ln>
      </p:spPr>
      <p:txBody>
        <a:bodyPr wrap="square" anchor="{element.get("valign", "top")}" lIns="91440" rIns="91440" tIns="45720" bIns="45720"/>
        <a:lstStyle/>
        {runs}
      </p:txBody>
    </p:sp>
    """


def rect_shape(element: dict, shape_id: int) -> str:
    x = px_to_emu_x(element.get("x", 0))
    y = px_to_emu_y(element.get("y", 0))
    w = max(px_to_emu_x(element.get("w", 100)), 1000)
    h = max(px_to_emu_y(element.get("h", 100)), 1000)
    fill = color(element.get("fill"), "FFFFFF")
    line = color(element.get("stroke"), fill)
    prst = "roundRect" if int(element.get("radius", 0) or 0) > 18 else "rect"
    return f"""
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="{shape_id}" name="Shape {shape_id}"/>
        <p:cNvSpPr/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm>
        <a:prstGeom prst="{prst}"><a:avLst/></a:prstGeom>
        <a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>
        <a:ln w="12700"><a:solidFill><a:srgbClr val="{line}"/></a:solidFill></a:ln>
      </p:spPr>
    </p:sp>
    """


def picture_shape(element: dict, shape_id: int, rel_id: str) -> str:
    x = px_to_emu_x(element.get("x", 0))
    y = px_to_emu_y(element.get("y", 0))
    w = max(px_to_emu_x(element.get("w", 100)), 1000)
    h = max(px_to_emu_y(element.get("h", 100)), 1000)
    name = xml_text(element.get("alt") or element.get("sourceName") or f"Image {shape_id}")
    return f"""
    <p:pic>
      <p:nvPicPr>
        <p:cNvPr id="{shape_id}" name="{name}" descr="{name}"/>
        <p:cNvPicPr><a:picLocks noChangeAspect="0"/></p:cNvPicPr>
        <p:nvPr/>
      </p:nvPicPr>
      <p:blipFill>
        <a:blip r:embed="{rel_id}"/>
        <a:stretch><a:fillRect/></a:stretch>
      </p:blipFill>
      <p:spPr>
        <a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:ln><a:noFill/></a:ln>
      </p:spPr>
    </p:pic>
    """


def slide_xml(slide: dict, image_rel_ids: dict[int, str] | None = None) -> str:
    shapes = []
    image_rel_ids = image_rel_ids or {}
    for element_index, element in enumerate(slide.get("elements", [])):
        shape_id = element_index + 2
        kind = element.get("type")
        if kind == "text":
            shapes.append(text_box(element, shape_id))
        elif kind == "image" and element_index in image_rel_ids:
            shapes.append(picture_shape(element, shape_id, image_rel_ids[element_index]))
        elif kind in {"shape", "imageBlock"}:
            shapes.append(rect_shape(element, shape_id))
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      {"".join(shapes)}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>
"""


def slide_rels(index: int, images: list[dict] | None = None) -> str:
    image_rels = "\n".join(
        f'  <Relationship Id="{item["rid"]}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{item["mediaName"]}"/>'
        for item in (images or [])
    )
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide%s.xml"/>
%s
</Relationships>
""" % (index, image_rels)


def content_types(slide_count: int) -> str:
    slides = "\n".join(
        f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        for i in range(1, slide_count + 1)
    )
    notes = "\n".join(
        f'<Override PartName="/ppt/notesSlides/notesSlide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>'
        for i in range(1, slide_count + 1)
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="json" ContentType="application/json"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="gif" ContentType="image/gif"/>
  <Default Extension="webp" ContentType="image/webp"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/notesMasters/notesMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  {slides}
  {notes}
</Types>
"""


def root_rels() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""


def presentation_xml(slide_count: int) -> str:
    sld_ids = "\n".join(
        f'<p:sldId id="{255 + i}" r:id="rId{i + 1}"/>'
        for i in range(1, slide_count + 1)
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>{sld_ids}</p:sldIdLst>
  <p:sldSz cx="{EMU_W}" cy="{EMU_H}" type="wide"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>
"""


def presentation_rels(slide_count: int) -> str:
    rels = [
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>',
        '<Relationship Id="rIdNotesMaster" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="notesMasters/notesMaster1.xml"/>',
    ]
    for i in range(1, slide_count + 1):
        rels.append(
            f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>'
        )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  {"".join(rels)}
</Relationships>
"""


def notes_master_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notesMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
               xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
               xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
</p:notesMaster>
"""


def notes_master_rels() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>
"""


def notes_slide_xml(slide: dict, index: int) -> str:
    note = slide.get("speakerNotes") or slide.get("brief") or ""
    title = slide.get("title") or f"Slide {index}"
    body = f"{title}\n\n{note}"
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
         xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
         xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Speaker Notes"/><p:cNvSpPr txBox="1"/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="685800" y="914400"/><a:ext cx="5486400" cy="6858000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square"/>
          <a:lstStyle/>
          {text_runs(body, 18, "111827", False, "Aptos")}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:notes>
"""


def notes_slide_rels(index: int) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide{index}.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="../notesMasters/notesMaster1.xml"/>
</Relationships>
"""


def slide_master_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>
"""


def slide_master_rels() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>
"""


def slide_layout_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>
"""


def slide_layout_rels() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>
"""


def theme_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="DeckForge">
  <a:themeElements>
    <a:clrScheme name="DeckForge">
      <a:dk1><a:srgbClr val="111827"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="243447"/></a:dk2><a:lt2><a:srgbClr val="F7F3EA"/></a:lt2>
      <a:accent1><a:srgbClr val="0F766E"/></a:accent1><a:accent2><a:srgbClr val="D6A84F"/></a:accent2>
      <a:accent3><a:srgbClr val="7C3AED"/></a:accent3><a:accent4><a:srgbClr val="DC2626"/></a:accent4>
      <a:accent5><a:srgbClr val="0284C7"/></a:accent5><a:accent6><a:srgbClr val="65A30D"/></a:accent6>
      <a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="DeckForge"><a:majorFont><a:latin typeface="Aptos Display"/><a:cs typeface="Tajawal"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:cs typeface="Tajawal"/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="DeckForge"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
  </a:themeElements>
</a:theme>
"""


def core_xml(title: str) -> str:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:dcterms="http://purl.org/dc/terms/"
                   xmlns:dcmitype="http://purl.org/dc/dcmitype/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>{xml_text(title)}</dc:title>
  <dc:creator>DeckForge</dc:creator>
  <cp:lastModifiedBy>DeckForge</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>
"""


def app_xml(slide_count: int) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
            xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>DeckForge</Application>
  <PresentationFormat>On-screen Show (16:9)</PresentationFormat>
  <Slides>{slide_count}</Slides>
</Properties>
"""


PDF_W = 960
PDF_H = 540


def pdf_rgb(value: str | None, fallback: str = "FFFFFF") -> tuple[float, float, float]:
    value = color(value, fallback)
    return (
        int(value[0:2], 16) / 255,
        int(value[2:4], 16) / 255,
        int(value[4:6], 16) / 255,
    )


def pdf_escape(value: object) -> str:
    text = str(value or "").encode("latin-1", "replace").decode("latin-1")
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def pdf_wrap(text: str, max_chars: int) -> list[str]:
    max_chars = max(8, max_chars)
    lines: list[str] = []
    for raw_line in str(text or "").splitlines() or [""]:
        current = ""
        for word in raw_line.split():
            candidate = f"{current} {word}".strip()
            if len(candidate) > max_chars and current:
                lines.append(current)
                current = word
            else:
                current = candidate
        if current:
            lines.append(current)
    return lines or [""]


def build_pdf(deck: dict) -> bytes:
    slides = deck.get("slides") or []
    if not slides:
        raise ValueError("Deck has no slides.")

    sx = PDF_W / SLIDE_W
    sy = PDF_H / SLIDE_H
    page_streams: list[bytes] = []
    for slide in slides:
        commands: list[str] = ["q", f"1 1 1 rg 0 0 {PDF_W} {PDF_H} re f", "Q"]
        for element in slide.get("elements", []):
            kind = element.get("type")
            x = float(element.get("x", 0)) * sx
            y = PDF_H - (float(element.get("y", 0)) + float(element.get("h", 0))) * sy
            w = float(element.get("w", 0)) * sx
            h = float(element.get("h", 0)) * sy
            if kind in {"shape", "imageBlock"}:
                r, g, b = pdf_rgb(element.get("fill"), "FFFFFF")
                commands.append(f"q {r:.4f} {g:.4f} {b:.4f} rg {x:.2f} {y:.2f} {w:.2f} {h:.2f} re f Q")
            elif kind == "text":
                r, g, b = pdf_rgb(element.get("fill") or element.get("color"), "111827")
                font_size = max(7, min(48, float(element.get("size", 28)) * sy))
                line_height = font_size * float(element.get("lineHeight", 1.15))
                max_chars = int(max(8, w / max(font_size * 0.45, 1)))
                lines = pdf_wrap(str(element.get("text", "")), max_chars)
                align = element.get("align") or ("right" if element.get("rtl") else "left")
                text_top = PDF_H - float(element.get("y", 0)) * sy - font_size
                for line_index, line in enumerate(lines[: max(1, int(h / max(line_height, 1)))]):
                    estimated_width = len(line) * font_size * 0.46
                    tx = x
                    if align == "center":
                        tx = x + max(0, (w - estimated_width) / 2)
                    elif align == "right":
                        tx = x + max(0, w - estimated_width)
                    ty = text_top - line_index * line_height
                    commands.append(
                        f"BT /F1 {font_size:.2f} Tf {r:.4f} {g:.4f} {b:.4f} rg {tx:.2f} {ty:.2f} Td ({pdf_escape(line)}) Tj ET"
                    )
        page_streams.append("\n".join(commands).encode("latin-1", "replace"))

    objects: dict[int, bytes] = {
        1: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        3: b"<< /Type /Catalog /Pages 2 0 R >>",
    }
    page_ids: list[int] = []
    next_id = 4
    for stream in page_streams:
        content_id = next_id
        page_id = next_id + 1
        next_id += 2
        objects[content_id] = b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream"
        objects[page_id] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PDF_W} {PDF_H}] "
            f"/Resources << /Font << /F1 1 0 R >> >> /Contents {content_id} 0 R >>"
        ).encode()
        page_ids.append(page_id)

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[2] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode()

    max_id = max(objects)
    output = BytesIO()
    output.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0] * (max_id + 1)
    for object_id in range(1, max_id + 1):
        offsets[object_id] = output.tell()
        output.write(f"{object_id} 0 obj\n".encode())
        output.write(objects[object_id])
        output.write(b"\nendobj\n")
    xref_at = output.tell()
    output.write(f"xref\n0 {max_id + 1}\n".encode())
    output.write(b"0000000000 65535 f \n")
    for object_id in range(1, max_id + 1):
        output.write(f"{offsets[object_id]:010d} 00000 n \n".encode())
    output.write(f"trailer\n<< /Size {max_id + 1} /Root 3 0 R >>\nstartxref\n{xref_at}\n%%EOF\n".encode())
    return output.getvalue()


def pptx_image_records(slides: list[dict]) -> list[list[dict]]:
    records_by_slide: list[list[dict]] = []
    media_index = 1
    for slide in slides:
        slide_records = []
        for element_index, element in enumerate(slide.get("elements", [])):
            if element.get("type") != "image":
                continue
            mime_type, payload = data_uri_payload(str(element.get("src", "")))
            if not payload or not mime_type.startswith("image/"):
                continue
            source_name = str(element.get("sourceName") or "")
            fallback_ext = Path(source_name).suffix.lstrip(".").lower() or "png"
            ext = image_extension(mime_type, fallback_ext)
            slide_records.append({
                "elementIndex": element_index,
                "rid": f"rIdImg{len(slide_records) + 1}",
                "mediaName": f"image{media_index}.{ext}",
                "mimeType": mime_type,
                "payload": payload,
            })
            media_index += 1
        records_by_slide.append(slide_records)
    return records_by_slide


def build_pptx(deck: dict) -> bytes:
    slides = deck.get("slides") or []
    if not slides:
        raise ValueError("Deck has no slides.")
    title = deck.get("metadata", {}).get("title") or "DeckForge Presentation"
    image_records = pptx_image_records(slides)
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types(len(slides)))
        z.writestr("_rels/.rels", root_rels())
        z.writestr("docProps/core.xml", core_xml(title))
        z.writestr("docProps/app.xml", app_xml(len(slides)))
        z.writestr("ppt/presentation.xml", presentation_xml(len(slides)))
        z.writestr("ppt/_rels/presentation.xml.rels", presentation_rels(len(slides)))
        z.writestr("ppt/slideMasters/slideMaster1.xml", slide_master_xml())
        z.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", slide_master_rels())
        z.writestr("ppt/notesMasters/notesMaster1.xml", notes_master_xml())
        z.writestr("ppt/notesMasters/_rels/notesMaster1.xml.rels", notes_master_rels())
        z.writestr("ppt/slideLayouts/slideLayout1.xml", slide_layout_xml())
        z.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", slide_layout_rels())
        z.writestr("ppt/theme/theme1.xml", theme_xml())
        z.writestr("ppt/deckforge-manifest.json", json.dumps(
            {
                "schemaVersion": deck.get("schemaVersion", "1.0"),
                "format": deck.get("format", "html"),
                "metadata": deck.get("metadata", {}),
                "canvas": deck.get("canvas", {"width": SLIDE_W, "height": SLIDE_H}),
                "theme": deck.get("theme", {}),
                "brand": deck.get("brand", {}),
                "template": deck.get("template"),
                "evidence": deck.get("evidence", []),
                "sources": deck.get("sources", []),
                "documents": deck.get("documents", []),
                "charts": deck.get("charts", []),
                "references": deck.get("references", []),
                "referenceAnalysis": deck.get("referenceAnalysis", {}),
                "deckDNA": deck.get("deckDNA", {}),
                "briefing": deck.get("briefing", {}),
                "sourceMap": deck.get("sourceMap", {}),
                "factCheck": deck.get("factCheck", {}),
                "review": deck.get("review", {}),
                "arabicAudit": deck.get("arabicAudit", {}),
                "variants": deck.get("variants", []),
                "outline": deck.get("outline", []),
                "storyboard": deck.get("storyboard", []),
                "keywords": deck.get("keywords", []),
                "archetype": deck.get("archetype", deck.get("metadata", {}).get("archetype", "")),
                "strategy": deck.get("strategy", {}),
                "agentLog": deck.get("agentLog", []),
                "plan": deck.get("plan", []),
                "playlist": [
                    slide.get("filename", f"slide-{i}.html")
                    for i, slide in enumerate(slides, start=1)
                ],
                "slides": [
                    {
                        "filename": slide.get("filename", f"slide-{i}.html"),
                        "title": slide.get("title", ""),
                        "brief": slide.get("brief", ""),
                        "speakerNotes": slide.get("speakerNotes", ""),
                        "qaFocus": slide.get("qaFocus", ""),
                    }
                    for i, slide in enumerate(slides, start=1)
                ],
            },
            ensure_ascii=False,
            indent=2,
        ))
        for i, slide in enumerate(slides, start=1):
            slide_images = image_records[i - 1]
            z.writestr(
                f"ppt/slides/slide{i}.xml",
                slide_xml(slide, {item["elementIndex"]: item["rid"] for item in slide_images}),
            )
            z.writestr(f"ppt/slides/_rels/slide{i}.xml.rels", slide_rels(i, slide_images))
            z.writestr(f"ppt/notesSlides/notesSlide{i}.xml", notes_slide_xml(slide, i))
            z.writestr(f"ppt/notesSlides/_rels/notesSlide{i}.xml.rels", notes_slide_rels(i))
            for item in slide_images:
                z.writestr(f"ppt/media/{item['mediaName']}", item["payload"])
    return buffer.getvalue()


def css_font_name(value: str) -> str:
    clean = str(value or "").replace('"', "").replace("'", "").strip()
    if not clean:
        return ""
    if re.search(r"\s", clean):
        return f'"{escape(clean, quote=True)}"'
    return escape(clean, quote=True)


def html_font_stack(element: dict) -> str:
    rtl = bool(element.get("rtl"))
    primary = css_font_name(element.get("font") or ("Tajawal" if rtl else "Aptos"))
    if rtl:
        return f'{primary}, Dubai, "Noto Kufi Arabic", "Segoe UI", Arial, sans-serif'
    return f'{primary}, "Segoe UI", Arial, sans-serif'


def slide_html(slide: dict, deck: dict) -> str:
    has_rtl = any(element.get("rtl") for element in slide.get("elements", []) if element.get("type") == "text")
    parts = []
    for element in slide.get("elements", []):
        kind = element.get("type")
        style = (
            f"position:absolute;left:{float(element.get('x',0))}px;top:{float(element.get('y',0))}px;"
            f"width:{float(element.get('w',100))}px;height:{float(element.get('h',100))}px;"
        )
        if kind in {"shape", "imageBlock"}:
            style += (
                f"background:{escape(element.get('fill', '#ffffff'), quote=True)};"
                f"border-radius:{int(element.get('radius',0) or 0)}px;"
                f"border:1px solid {escape(element.get('stroke', element.get('fill', '#ffffff')), quote=True)};"
            )
            parts.append(f'<div data-object="true" data-object-type="{kind}" style="{style}"></div>')
        elif kind == "image":
            img_style = (
                style
                + f"background:{escape(element.get('fill', '#111111'), quote=True)};"
                + f"border-radius:{int(element.get('radius',0) or 0)}px;"
                + f"border:1px solid {escape(element.get('stroke', 'transparent'), quote=True)};"
                + "overflow:hidden;"
            )
            src = escape(str(element.get("src", "")), quote=True)
            alt = escape(str(element.get("alt", "")), quote=True)
            fit = escape(str(element.get("fit", "cover")), quote=True)
            parts.append(
                f'<div data-object="true" data-object-type="image" style="{img_style}"><img src="{src}" alt="{alt}" style="width:100%;height:100%;object-fit:{fit};display:block;"></div>'
            )
        elif kind == "text":
            rtl = "rtl" if element.get("rtl") else "ltr"
            align = element.get("align") or ("right" if element.get("rtl") else "left")
            weight = "800" if element.get("bold") else "500"
            text_style = (
                style
                + f"color:{escape(element.get('fill', '#111827'), quote=True)};"
                + f"font-family:{html_font_stack(element)};"
                + f"font-size:{int(element.get('size',32))}px;font-weight:{weight};"
                + f"line-height:{float(element.get('lineHeight',1.12))};"
                + f"text-align:{align};direction:{rtl};letter-spacing:0;"
                + "white-space:pre-wrap;overflow:hidden;"
            )
            parts.append(
                f'<div data-object="true" data-object-type="text" style="{text_style}">{escape(str(element.get("text","")))}</div>'
            )
    title = deck.get("metadata", {}).get("title") or "DeckForge"
    return f"""<!doctype html>
<html lang="{'ar' if has_rtl else 'en'}" dir="{'rtl' if has_rtl else 'ltr'}">
<head>
  <meta charset="utf-8">
  <title>{escape(title)} - {escape(slide.get("filename", "slide.html"))}</title>
  {'<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Playfair+Display:wght@400;700;900&family=Tajawal:wght@300;400;500;700;900&display=swap" rel="stylesheet">' if has_rtl else ''}
  <style>
    html,body {{ margin:0; padding:0; background:#0f172a; }}
    .slide-container {{ position:relative; width:1920px; height:1080px; overflow:hidden; background:#fff; font-family:{'Tajawal, Dubai, "Noto Kufi Arabic", "Segoe UI", Arial, sans-serif' if has_rtl else 'Aptos, "Segoe UI", Arial, sans-serif'}; }}
  </style>
</head>
<body>
  <div class="slide-container" data-screen-label="{escape(slide.get("title",""))}">
    {''.join(parts)}
  </div>
</body>
</html>
"""


def build_project_zip(deck: dict) -> bytes:
    title = deck.get("metadata", {}).get("slug") or "deckforge"
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
        manifest = {
            "schemaVersion": deck.get("schemaVersion", "1.0"),
            "format": "html",
            "metadata": deck.get("metadata", {}),
            "canvas": deck.get("canvas", {"width": SLIDE_W, "height": SLIDE_H}),
            "theme": deck.get("theme", {}),
            "brand": deck.get("brand", {}),
            "template": deck.get("template"),
            "evidence": deck.get("evidence", []),
            "sources": deck.get("sources", []),
            "documents": deck.get("documents", []),
            "charts": deck.get("charts", []),
            "references": deck.get("references", []),
            "referenceAnalysis": deck.get("referenceAnalysis", {}),
            "deckDNA": deck.get("deckDNA", {}),
            "briefing": deck.get("briefing", {}),
            "sourceMap": deck.get("sourceMap", {}),
            "factCheck": deck.get("factCheck", {}),
            "review": deck.get("review", {}),
            "arabicAudit": deck.get("arabicAudit", {}),
            "variants": deck.get("variants", []),
            "outline": deck.get("outline", []),
            "storyboard": deck.get("storyboard", []),
            "keywords": deck.get("keywords", []),
            "archetype": deck.get("archetype", deck.get("metadata", {}).get("archetype", "")),
            "strategy": deck.get("strategy", {}),
            "agentLog": deck.get("agentLog", []),
            "plan": deck.get("plan", []),
            "qa": deck.get("qa", []),
            "playlist": [slide.get("filename", f"slide-{i}.html") for i, slide in enumerate(deck.get("slides", []), start=1)],
        }
        z.writestr(f"{title}.slides/manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/brand.json", json.dumps(deck.get("brand", {}), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/template.json", json.dumps(deck.get("template"), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/evidence.json", json.dumps(deck.get("evidence", []), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/sources.json", json.dumps(deck.get("sources", []), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/documents.json", json.dumps(deck.get("documents", []), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/charts.json", json.dumps(deck.get("charts", []), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/references.json", json.dumps(deck.get("references", []), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/reference-analysis.json", json.dumps(deck.get("referenceAnalysis", {}), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/deck-dna.json", json.dumps(deck.get("deckDNA", {}), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/briefing.json", json.dumps(deck.get("briefing", {}), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/source-map.json", json.dumps(deck.get("sourceMap", {}), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/fact-check.json", json.dumps(deck.get("factCheck", {}), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/review.json", json.dumps(deck.get("review", {}), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/arabic-audit.json", json.dumps(deck.get("arabicAudit", {}), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/variants.json", json.dumps(deck.get("variants", []), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/outline.json", json.dumps(deck.get("outline", []), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/storyboard.json", json.dumps(deck.get("storyboard", []), ensure_ascii=False, indent=2))
        z.writestr(f"{title}.slides/assets/README.txt", "Drop generated images, fonts, and reusable media here.\n")
        for slide in deck.get("slides", []):
            z.writestr(f"{title}.slides/slides/{slide.get('filename', 'slide.html')}", slide_html(slide, deck))
    return buffer.getvalue()


class DeckForgeHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        path = unquote(path.split("?", 1)[0].split("#", 1)[0])
        if path == "/":
            path = "/index.html"
        if path in {"/engine", "/deckforge-runtime", "/deckforge-runtime.js"}:
            path = "/app.js"
        return str((ROOT / path.lstrip("/")).resolve())

    def log_message(self, fmt: str, *args: object) -> None:
        with (ROOT / "server.log").open("a", encoding="utf-8") as log:
            log.write("%s - %s\n" % (self.address_string(), fmt % args))

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def read_upload_file(self) -> tuple[str, bytes]:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        content_type = self.headers.get("Content-Type", "")
        match = re.search(r'boundary="?([^";]+)"?', content_type)
        if not match:
            filename = self.headers.get("X-Filename", "reference-deck")
            return filename, raw
        boundary = ("--" + match.group(1)).encode("utf-8")
        for part in raw.split(boundary):
            if b"Content-Disposition" not in part:
                continue
            head, sep, body = part.partition(b"\r\n\r\n")
            if not sep:
                continue
            disposition = head.decode("utf-8", errors="ignore")
            if 'name="file"' not in disposition:
                continue
            filename_match = re.search(r'filename="([^"]*)"', disposition)
            filename = filename_match.group(1) if filename_match else "reference-deck"
            body = body.rstrip(b"\r\n")
            if body.endswith(b"--"):
                body = body[:-2].rstrip(b"\r\n")
            return filename or "reference-deck", body
        raise ValueError("No file field found in upload.")

    def send_bytes(self, payload: bytes, content_type: str, filename: str) -> None:
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def send_error_json(self, message: str, status: int = 400) -> None:
        payload = json.dumps({"error": message}).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self) -> None:
        try:
            if self.path == "/api/analyze/reference":
                filename, data = self.read_upload_file()
                json_response(self, analyze_reference_deck(filename, data))
                return
            if self.path == "/api/import/deck":
                filename, data = self.read_upload_file()
                json_response(self, import_deck_file(filename, data))
                return
            body = self.read_json()
            deck = body.get("deck", body)
            slug = re.sub(r"[^a-z0-9]+", "-", (deck.get("metadata", {}).get("slug") or "deckforge").lower()).strip("-") or "deckforge"
            if self.path == "/api/export/pptx":
                self.send_bytes(
                    build_pptx(deck),
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    f"{slug}.pptx",
                )
            elif self.path == "/api/export/pdf":
                self.send_bytes(build_pdf(deck), "application/pdf", f"{slug}.pdf")
            elif self.path == "/api/export/project":
                self.send_bytes(build_project_zip(deck), "application/zip", f"{slug}.slides.zip")
            else:
                self.send_error_json("Unknown endpoint.", 404)
        except Exception as exc:
            self.send_error_json(str(exc), 500)


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    sys.stdout = (ROOT / "server.stdout.log").open("a", encoding="utf-8")
    sys.stderr = (ROOT / "server.stderr.log").open("a", encoding="utf-8")
    try:
        server = ThreadingHTTPServer(("127.0.0.1", port), DeckForgeHandler)
        (ROOT / "server.log").write_text(
            f"DeckForge running at http://127.0.0.1:{port}\n",
            encoding="utf-8",
        )
        server.serve_forever()
    except Exception as exc:
        (ROOT / "server.log").write_text(f"DeckForge failed: {exc}\n", encoding="utf-8")
        raise


if __name__ == "__main__":
    main()
