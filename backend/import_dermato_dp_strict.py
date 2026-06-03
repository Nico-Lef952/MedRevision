# -*- coding: utf-8 -*-

import asyncio
import json
import os
import re
import time
import mimetypes
from pathlib import Path
from zipfile import ZipFile
from datetime import datetime, timezone
import html

from google import genai
from google.genai import types
from server import db

SUBJECT_NAME = "Revêtement cutané"
MODEL = "gemini-3.1-flash-lite"
DP_FILE = Path("annales/Revêtement cutané/dp 24 25.docx")
IMAGE_MAP = Path("annales/Revêtement cutané/image_map_dp_24_25.json")


def load_env():
    p = Path(".env")
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
        if line and "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def read_docx_xml(path):
    chunks = []
    with ZipFile(path) as z:
        for name in z.namelist():
            if name.startswith("word/") and name.endswith(".xml"):
                raw = z.read(name).decode("utf-8", errors="ignore")
                raw = re.sub(r"</w:p>", "\n", raw)
                raw = re.sub(r"<w:tab[^>]*/>", " ", raw)
                raw = re.sub(r"<w:br[^>]*/>", "\n", raw)
                raw = re.sub(r"<[^>]+>", " ", raw)
                raw = html.unescape(raw)
                chunks.append(raw)

    text = "\n".join(chunks)
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text).strip()

    Path("debug_dermato_dp_cleaned_text.txt").write_text(text, encoding="utf-8")
    return text


def load_image_urls():
    if not IMAGE_MAP.exists():
        return []
    data = json.loads(IMAGE_MAP.read_text(encoding="utf-8"))
    return data.get("images", [])


def image_url_to_path(url):
    if url.startswith("/uploads/"):
        return Path(url[1:])
    return Path(url)


def make_image_parts(image_urls):
    parts = []
    for url in image_urls:
        p = image_url_to_path(url)
        if not p.exists():
            print("Image introuvable :", p)
            continue

        mime_type, _ = mimetypes.guess_type(str(p))
        mime_type = mime_type or "image/png"

        parts.append(types.Part.from_bytes(
            data=p.read_bytes(),
            mime_type=mime_type
        ))

    return parts


def extract_json(text):
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```json", "", text, flags=re.I).strip()
        text = re.sub(r"^```", "", text).strip()
        text = re.sub(r"```$", "", text).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("JSON introuvable")

    return json.loads(text[start:end + 1])


def normalize_options(options):
    clean = []
    for opt in options or []:
        if not isinstance(opt, dict):
            continue
        txt = opt.get("text") or opt.get("label") or ""
        if not txt:
            continue
        clean.append({
            "text": txt.strip(),
            "is_correct": bool(opt.get("is_correct", opt.get("correct", False)))
        })
    return clean


def validate_dp(dp, expected_count):
    title = (dp.get("question") or "").strip() or "Dossier progressif"
    vignette = (dp.get("vignette") or "").strip()

    if not vignette:
        raise RuntimeError("DP sans vignette")

    sub_questions = []

    for sq in dp.get("sub_questions", []) or []:
        q = (sq.get("question") or "").strip()
        opts = normalize_options(sq.get("options", []))
        explanation = (sq.get("explanation") or "").strip()
        answer = (sq.get("answer") or "").strip()

        if not q:
            continue
        if len(opts) < 2:
            continue
        if not any(o["is_correct"] for o in opts):
            continue

        sub_questions.append({
            "type": sq.get("type", "qrm"),
            "question": q,
            "options": opts,
            "answer": answer,
            "explanation": explanation or "Correction à vérifier."
        })

    if len(sub_questions) != expected_count:
        raise RuntimeError(f"DP invalide : attendu {expected_count} sous-questions, obtenu {len(sub_questions)}")

    return {
        "type": "dp",
        "question": title,
        "vignette": vignette,
        "options": [],
        "answer": dp.get("answer", "") or "",
        "explanation": dp.get("explanation", "") or "",
        "difficulty": dp.get("difficulty", 2),
        "rang": dp.get("rang", "A"),
        "concepts": dp.get("concepts", []),
        "sub_questions": sub_questions
    }


async def get_course_context(user_id, subject_id):
    courses = await db.courses.find({
        "user_id": user_id,
        "subject_id": subject_id
    }).sort("title", 1).to_list(500)

    parts = []
    for c in courses:
        content = c.get("content", "") or ""
        if len(content) > 100:
            parts.append(f"\n\n# {c.get('title', '')}\n{content}")

    return "\n".join(parts)[:90000]


def call_gemini_with_retry(client, prompt, image_urls, label="", max_retries=60):
    contents = [prompt]
    contents.extend(make_image_parts(image_urls))

    for attempt in range(1, max_retries + 1):
        try:
            return client.models.generate_content(model=MODEL, contents=contents)
        except Exception as e:
            msg = str(e)
            retryable = (
                "429" in msg or "RESOURCE_EXHAUSTED" in msg or
                "503" in msg or "UNAVAILABLE" in msg or
                "getaddrinfo failed" in msg or "ConnectError" in msg
            )

            if retryable:
                wait = 60
                m = re.search(r"'retryDelay': '(\d+)s'", msg)
                if m:
                    wait = int(m.group(1)) + 10

                print(f"Gemini indisponible {label} | tentative {attempt}/{max_retries}")
                print(f"Pause {wait}s...")
                time.sleep(wait)
                continue

            raise

    raise RuntimeError("Gemini indisponible après retries")


async def main():
    load_env()

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("Clé Gemini introuvable")

    client = genai.Client(api_key=api_key)

    user = await db.users.find_one({"email": "admin@medrevision.com"})
    user_id = str(user["_id"])

    subject = await db.subjects.find_one({
        "user_id": user_id,
        "name": {"$regex": SUBJECT_NAME, "$options": "i"}
    })
    subject_id = str(subject["_id"])

    text = read_docx_xml(DP_FILE)
    image_urls = load_image_urls()
    course_context = await get_course_context(user_id, subject_id)

    print("Images DP envoyées à Gemini :", len(image_urls))

    annale_id = f"{subject_id}-2024-2025-dp-revetement-cutane"

    await db.questions.delete_many({
        "user_id": user_id,
        "is_annale": True,
        "annale_id": annale_id
    })

    prompt = f"""
Tu dois convertir ce fichier de dossiers progressifs de dermatologie en EXACTEMENT 2 DP MedRevision.

RÈGLES STRICTES :
- Il y a exactement 2 dossiers progressifs.
- Le premier DP doit contenir exactement 7 sous-questions.
- Le deuxième DP doit contenir exactement 5 sous-questions.
- Ne supprime aucune sous-question.
- Conserve les énoncés et options.
- Chaque DP doit avoir une vignette clinique complète.
- Si les images sont nécessaires, utilise les images jointes.
- Corrige avec les cours fournis en priorité.
- Chaque sous-question doit avoir une correction claire.
- Réponds uniquement en JSON valide.

COURS :
{course_context}

TEXTE DU FICHIER DP :
{text}

Format attendu :
{{
  "dps": [
    {{
      "type": "dp",
      "question": "titre du DP",
      "vignette": "vignette clinique complète",
      "explanation": "correction globale courte",
      "difficulty": 2,
      "rang": "A",
      "concepts": ["notion"],
      "sub_questions": [
        {{
          "type": "qrm",
          "question": "énoncé sous-question",
          "options": [
            {{"text": "option A", "is_correct": true}},
            {{"text": "option B", "is_correct": false}}
          ],
          "answer": "réponse courte",
          "explanation": "correction"
        }}
      ]
    }}
  ]
}}
"""

    print("Import DP strict 7 + 5...")
    res = call_gemini_with_retry(client, prompt, image_urls=image_urls, label="DP dermato")
    data = extract_json(res.text or "")

    Path("debug_dermato_dp_response.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    dps = data.get("dps", [])
    if len(dps) != 2:
        raise RuntimeError(f"Import refusé : attendu 2 DP, obtenu {len(dps)}")

    expected = [7, 5]
    docs = []

    for i, raw in enumerate(dps):
        dp = validate_dp(raw, expected[i])

        docs.append({
            "user_id": user_id,
            "subject_id": subject_id,
            "course_id": None,
            "is_annale": True,
            "annale_id": annale_id,
            "annale_year": "2024-2025",
            "annale_title": "DP 24-25 revêtement cutané",
            "source_file": str(DP_FILE),
            "source_key": f"dp_dermato_2024_2025_{i+1}",
            "image_urls": image_urls,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **dp
        })

    await db.questions.insert_many(docs)

    print("IMPORT DP OK")
    print("DP 1 :", len(docs[0]["sub_questions"]), "sous-questions")
    print("DP 2 :", len(docs[1]["sub_questions"]), "sous-questions")


asyncio.run(main())
