# -*- coding: utf-8 -*-

import asyncio
import json
import os
import re
import time
import mimetypes
import html
from zipfile import ZipFile
from pathlib import Path
from datetime import datetime, timezone

import docx
from google import genai
from google.genai import types
from server import db

SUBJECT_NAME = "Revêtement cutané"
QCM_FILE = Path("annales/Revêtement cutané/Sujet 24-25 revêtement cutané.docx")
MODEL = "gemini-3.1-flash-lite"


def load_env():
    p = Path(".env")
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def read_docx(path):
    """
    Lecture robuste du .docx en lisant directement le XML Word.
    Utile quand python-docx ne récupère pas bien les tableaux/zones.
    """
    path = Path(path)
    chunks = []

    with ZipFile(path) as z:
        xml_files = [
            name for name in z.namelist()
            if name.startswith("word/") and name.endswith(".xml")
        ]

        for name in xml_files:
            raw = z.read(name).decode("utf-8", errors="ignore")

            # Transforme les fins de paragraphes et tabulations en retours lisibles
            raw = re.sub(r"</w:p>", "\n", raw)
            raw = re.sub(r"<w:br[^>]*/>", "\n", raw)
            raw = re.sub(r"<w:tab[^>]*/>", " ", raw)

            # Retire toutes les balises XML
            raw = re.sub(r"<[^>]+>", " ", raw)

            # Décode les entités HTML/XML
            raw = html.unescape(raw)

            chunks.append(raw)

    text = "\n".join(chunks)
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text)

    Path("debug_dermato_qcm_cleaned_text.txt").write_text(text, encoding="utf-8")

    return text.strip()


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


def clean_word_xml_noise(text):
    text = text.replace("\r", "\n")
    text = text.replace("\xa0", " ")
    text = re.sub(r"<w:tab\s*/>", " ", text)
    text = re.sub(r"<w:t[^>]*>", "", text)
    text = re.sub(r"</w:t>", "", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def split_questions(text):
    """
    Découpe robuste des 30 QCM :
    - Q1, Q2, Q15 :
    - Q16)
    - 27. / 29.
    Les propositions peuvent être sans lettres A/B/C/D/E.
    """
    text = text.replace("\r", "\n")
    text = text.replace("\xa0", " ")

    # Force un retour à la ligne avant chaque début probable de question
    text = re.sub(r"(?<!\n)\b(Q\s*\d{1,2}\s*[\)\.\-:]?)", r"\n\1", text, flags=re.I)

    # Cas sans Q : 27. Concernant..., 29. Concernant...
    text = re.sub(
        r"(?<!\n)\b(\d{1,2})\s*[\.\)\-:]\s+(?=(Concernant|Parmi|Devant|Dans|A propos|À|A quelles|Quelle|Indiquez|Vous|Une))",
        r"\n\1. ",
        text,
        flags=re.I
    )

    lines = [l.strip() for l in text.splitlines() if l.strip()]

    q_start = re.compile(
        r"^(?:Q\s*)?\d{1,2}\s*[\)\.\-:]?(?:\s+|$)",
        re.I
    )

    blocks = []
    current = []

    for line in lines:
        if q_start.match(line):
            if current:
                blocks.append("\n".join(current).strip())
            current = [line]
        else:
            if current:
                current.append(line)

    if current:
        blocks.append("\n".join(current).strip())

    clean = []
    seen_numbers = set()

    for b in blocks:
        first = b.splitlines()[0].strip()
        m = re.match(r"^(?:Q\s*)?(\d{1,2})", first, re.I)

        if not m:
            continue

        n = int(m.group(1))

        # On ne garde que Q1 à Q30
        if not (1 <= n <= 30):
            continue

        if n in seen_numbers:
            continue

        seen_numbers.add(n)

        # On garde toutes les questions numérotées Q1 à Q30, même si le bloc est court.
        # Certaines questions Word sont mal séparées mais restent exploitables.
        clean.append(b)

    Path("debug_dermato_qcm_blocks.txt").write_text(
        "\n\n---QUESTION---\n\n".join(clean),
        encoding="utf-8"
    )

    print("Numéros détectés :", sorted(seen_numbers))

    return clean


def normalize_options(options):
    clean = []
    for opt in options or []:
        if not isinstance(opt, dict):
            continue
        text = opt.get("text") or opt.get("label") or ""
        if not text:
            continue
        clean.append({
            "text": text.strip(),
            "is_correct": bool(opt.get("is_correct", opt.get("correct", False)))
        })
    return clean


def block_needs_image(block):
    b = (block or "").lower()

    # ATTENTION :
    # Ne pas skipper "photo-induit", "phototype", "lésions cutanées" en général.
    # On skip seulement si la question dépend clairement d'une image/schéma précis.
    markers = [
        "présentes dans l’image",
        "présentes dans l'image",
        "presentes dans l'image",
        "dans l’image",
        "dans l'image",
        "quelle(s) image",
        "image(s)",
        "visualisées sur cette photographie",
        "visualisees sur cette photographie",
        "sur cette photographie",
        "sur la photographie",
        "cette lésion correspond",
        "cette lesion correspond",
        "à quel élément correspond le numéro",
        "a quel element correspond le numero",
        "ce schéma",
        "ce schema",
        "coupe sagittale de l’appareil unguéal",
        "coupe sagittale de l'appareil ungueal",
        "cet aspect clinique quelques secondes",
        "quel est le nom de ce signe clinique"
    ]

    return any(m in b for m in markers)


def validate_q(q):
    qtype = q.get("type", "qrm")
    if qtype not in ["qi", "qcm", "qrm"]:
        qtype = "qrm"

    question = (q.get("question") or "").strip()
    options = normalize_options(q.get("options", []))

    if not question:
        return None
    if len(options) < 2:
        return None
    if not any(o["is_correct"] for o in options):
        return None

    return {
        "type": qtype,
        "question": question,
        "vignette": q.get("vignette", "") or "",
        "options": options,
        "answer": (q.get("answer") or "").strip(),
        "explanation": (q.get("explanation") or "Correction à vérifier.").strip(),
        "difficulty": q.get("difficulty", 2),
        "rang": q.get("rang", "A"),
        "concepts": q.get("concepts", []),
        "sub_questions": []
    }



def call_gemini_with_retry(client, prompt, label="", image_urls=None, max_retries=60):
    """
    Retry automatique si Gemini renvoie 503, 429 ou erreur réseau/DNS.
    """
    contents = [prompt]
    image_parts = make_image_parts(image_urls or [])
    contents.extend(image_parts)

    for attempt in range(1, max_retries + 1):
        try:
            return client.models.generate_content(model=MODEL, contents=contents)
        except Exception as e:
            msg = str(e)

            is_retryable = (
                "503" in msg
                or "UNAVAILABLE" in msg
                or "high demand" in msg
                or "429" in msg
                or "RESOURCE_EXHAUSTED" in msg
                or "quota" in msg.lower()
                or "retryDelay" in msg
                or "getaddrinfo failed" in msg
                or "ConnectError" in msg
                or "NameResolutionError" in msg
                or "timed out" in msg.lower()
                or "connection" in msg.lower()
            )

            if is_retryable:
                wait = 60

                m = re.search(r"'retryDelay': '(\d+)s'", msg)
                if m:
                    wait = int(m.group(1)) + 10
                elif "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                    wait = 120
                elif "getaddrinfo failed" in msg or "ConnectError" in msg:
                    wait = 90
                elif "503" in msg:
                    wait = min(60 * attempt, 600)

                print(f"Gemini/réseau indisponible sur {label} | tentative {attempt}/{max_retries}")
                print(f"Pause {wait} secondes puis reprise...")
                time.sleep(wait)
                continue

            raise

    raise RuntimeError(f"Gemini toujours indisponible après {max_retries} tentatives : {label}")


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



def get_question_number(block):
    first = (block or "").splitlines()[0].strip() if block else ""
    m = re.match(r"^(?:Q\s*)?(\d{1,2})", first, re.I)
    if m:
        return int(m.group(1))
    return None


def load_image_map():
    p = Path("annales/Revêtement cutané/image_map_sujet_24_25.json")
    if not p.exists():
        print("Aucune image_map trouvée :", p)
        return {}

    data = json.loads(p.read_text(encoding="utf-8"))
    print("Image map chargée :", data)
    return data


def image_url_to_path(url):
    if url.startswith("/uploads/"):
        return Path(url[1:])
    return Path(url)


def make_image_parts(image_urls):
    parts = []

    for url in image_urls or []:
        img_path = image_url_to_path(url)

        if not img_path.exists():
            print("Image introuvable :", img_path)
            continue

        mime_type, _ = mimetypes.guess_type(str(img_path))
        mime_type = mime_type or "image/png"

        parts.append(
            types.Part.from_bytes(
                data=img_path.read_bytes(),
                mime_type=mime_type
            )
        )

    return parts



async def main():
    load_env()

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)

    user = await db.users.find_one({"email": "admin@medrevision.com"})
    user_id = str(user["_id"])

    subject = await db.subjects.find_one({
        "user_id": user_id,
        "name": {"$regex": SUBJECT_NAME, "$options": "i"}
    })
    subject_id = str(subject["_id"])

    text = read_docx(QCM_FILE)
    blocks = split_questions(text)
    image_map = load_image_map()
    print('Questions avec images extraites :', sorted(image_map.keys(), key=lambda x: int(x)))

    print("Questions détectées dans le fichier :", len(blocks))

    # On ne skippe plus aucune question : l'objectif est d'importer TOUT le sujet.
    skipped = []
    print("Questions ignorées :", 0)
    print("Questions à importer :", len(blocks))

    if len(blocks) != 30:
        Path("debug_dermato_qcm_blocks.txt").write_text("\n\n---QUESTION---\n\n".join(blocks), encoding="utf-8")
        raise RuntimeError(f"Détection invalide : attendu 30 questions, obtenu {len(blocks)}. Voir debug_dermato_qcm_blocks.txt")

    course_context = await get_course_context(user_id, subject_id)

    annale_id = f"{subject_id}-2024-2025-sujet-revetement-cutane"

    await db.questions.delete_many({
        "user_id": user_id,
        "is_annale": True,
        "annale_id": annale_id
    })

    docs = []

    for idx, block in enumerate(blocks, 1):
        qnum = get_question_number(block)
        image_urls = image_map.get(str(qnum), []) if qnum is not None else []

        print(f"\nCorrection question {idx}/{len(blocks)} | Q{qnum} | images: {len(image_urls)}")

        prompt = f"""
Tu dois convertir UNE question d'annale de dermatologie en question MedRevision.

Règles :
- Conserve l'énoncé et les options.
- Corrige les bonnes réponses en t'appuyant sur les cours.
- Donne une explication claire.
- Réponds uniquement en JSON valide.
- Ne transforme pas en QROC.

COURS :
{course_context}

QUESTION D'ANNALE :
{block}

Format :
{{
  "question": {{
    "type": "qrm",
    "question": "énoncé",
    "vignette": "",
    "options": [
      {{"text": "A. option", "is_correct": true}},
      {{"text": "B. option", "is_correct": false}}
    ],
    "answer": "réponse courte",
    "explanation": "correction",
    "difficulty": 2,
    "rang": "A",
    "concepts": ["notion"]
  }}
}}
"""

        res = call_gemini_with_retry(client, prompt, label=f'question {idx}', image_urls=image_urls)
        data = extract_json(res.text or "")
        q = validate_q(data.get("question", {}))

        if not q:
            Path(f"debug_dermato_qcm_invalid_{idx}.json").write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )
            raise RuntimeError(f"Question {idx} invalide. Voir debug_dermato_qcm_invalid_{idx}.json")

        docs.append({
            "user_id": user_id,
            "subject_id": subject_id,
            "course_id": None,
            "is_annale": True,
            "annale_id": annale_id,
            "annale_year": "2024-2025",
            "annale_title": "Sujet 24-25 revêtement cutané",
            "source_file": str(QCM_FILE),
            "source_index": idx,
            "original_question_number": qnum,
            "image_urls": image_urls,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **q
        })

    if len(docs) != len(blocks):
        raise RuntimeError(f"Import refusé : attendu {len(blocks)}, obtenu {len(docs)}")

    await db.questions.insert_many(docs)
    print(f"\nIMPORT QCM DERMATO OK : {len(docs)} questions importées")


asyncio.run(main())
