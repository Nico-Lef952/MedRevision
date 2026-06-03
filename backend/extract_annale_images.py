# -*- coding: utf-8 -*-

import re
import json
import html
import shutil
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

DOCX = Path("annales/Revêtement cutané/Sujet 24-25 revêtement cutané.docx")
OUT_DIR = Path("uploads/annales/revetement_cutane_2024_2025")
MAP_FILE = Path("annales/Revêtement cutané/image_map_sujet_24_25.json")

OUT_DIR.mkdir(parents=True, exist_ok=True)

def get_relationships(z):
    rels_path = "word/_rels/document.xml.rels"
    if rels_path not in z.namelist():
        return {}

    xml = z.read(rels_path).decode("utf-8", errors="ignore")
    rels = {}

    for m in re.finditer(r'Id="([^"]+)".*?Target="([^"]+)"', xml):
        rid, target = m.group(1), html.unescape(m.group(2))
        if target.startswith("media/"):
            rels[rid] = "word/" + target
        elif target.startswith("../"):
            rels[rid] = target.replace("../", "word/")
        else:
            rels[rid] = "word/" + target

    return rels

def detect_question_number(text, current_q):
    # Q16, Q16), Q16 :
    matches = re.findall(r"\bQ\s*(\d{1,2})\s*[\)\.\-:]?", text, flags=re.I)
    if matches:
        return int(matches[-1])

    # 27. Concernant...
    matches = re.findall(r"(?:^|\n|\s)(\d{1,2})\s*[\.\)\-:]\s+(?:Concernant|Parmi|A propos|Devant|Dans|Quelle|Quelles|Indiquez)", text, flags=re.I)
    if matches:
        return int(matches[-1])

    return current_q

with ZipFile(DOCX) as z:
    rels = get_relationships(z)

    xml = z.read("word/document.xml").decode("utf-8", errors="ignore")

    # On parcourt le document dans l'ordre : textes + images
    token_re = re.compile(
        r"<w:t[^>]*>(.*?)</w:t>|r:embed=\"(rId[0-9]+)\"",
        flags=re.S
    )

    current_q = None
    image_map = {}

    for m in token_re.finditer(xml):
        text_part = m.group(1)
        rid = m.group(2)

        if text_part is not None:
            text = html.unescape(re.sub(r"<[^>]+>", "", text_part))
            current_q = detect_question_number(text, current_q)

        elif rid is not None:
            if not current_q:
                continue

            media_path = rels.get(rid)
            if not media_path or media_path not in z.namelist():
                continue

            suffix = Path(media_path).suffix or ".png"
            index = len(image_map.get(str(current_q), [])) + 1
            out_name = f"q{current_q:02d}_img{index}{suffix}"
            out_path = OUT_DIR / out_name

            out_path.write_bytes(z.read(media_path))

            image_url = f"/uploads/annales/revetement_cutane_2024_2025/{out_name}"
            image_map.setdefault(str(current_q), []).append(image_url)

MAP_FILE.write_text(json.dumps(image_map, ensure_ascii=False, indent=2), encoding="utf-8")

print("Images extraites :", sum(len(v) for v in image_map.values()))
print("Questions avec images :", sorted(image_map.keys(), key=lambda x: int(x)))
print("Map créée :", MAP_FILE)
print("Dossier images :", OUT_DIR)
