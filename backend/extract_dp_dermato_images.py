# -*- coding: utf-8 -*-

import re
import json
import html
from pathlib import Path
from zipfile import ZipFile

DOCX = Path("annales/Revêtement cutané/dp 24 25.docx")
OUT_DIR = Path("uploads/annales/revetement_cutane_dp_2024_2025")
MAP_FILE = Path("annales/Revêtement cutané/image_map_dp_24_25.json")

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
        else:
            rels[rid] = "word/" + target

    return rels

with ZipFile(DOCX) as z:
    rels = get_relationships(z)
    xml = z.read("word/document.xml").decode("utf-8", errors="ignore")

    image_urls = []
    for idx, rid in enumerate(re.findall(r'r:embed="(rId[0-9]+)"', xml), 1):
        media_path = rels.get(rid)
        if not media_path or media_path not in z.namelist():
            continue

        suffix = Path(media_path).suffix or ".png"
        out_name = f"dp_img{idx}{suffix}"
        out_path = OUT_DIR / out_name
        out_path.write_bytes(z.read(media_path))

        image_urls.append(f"/uploads/annales/revetement_cutane_dp_2024_2025/{out_name}")

MAP_FILE.write_text(json.dumps({"images": image_urls}, ensure_ascii=False, indent=2), encoding="utf-8")

print("Images extraites :", len(image_urls))
print("Fichier map :", MAP_FILE)
for img in image_urls:
    print("-", img)
