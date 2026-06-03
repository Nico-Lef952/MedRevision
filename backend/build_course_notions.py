# -*- coding: utf-8 -*-

import argparse
import asyncio
import json
import os
import re
import time
from pathlib import Path
from bson import ObjectId
from google import genai
from server import db


def load_env():
    p = Path(".env")
    if not p.exists():
        return

    for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


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


def count_words(text):
    return len(re.findall(r"\b[\wÀ-ÿ'-]+\b", text or ""))


def target_for_importance(importance):
    if importance == "high":
        return 6
    if importance == "medium":
        return 4
    return 2


def make_prompt(course, subject_name):
    content = course.get("content", "") or ""
    if len(content) > 80000:
        content = content[:80000] + "\n\n[CONTENU TRONQUE]"

    return f"""
Tu dois découper un cours médical en notions atomiques pour générer une banque de questions.

Objectif :
- couvrir TOUTES les notions utiles du cours
- éviter les doublons
- permettre ensuite de générer des questions notion par notion

Matière : {subject_name}
Cours : {course.get("title", "")}
Section : {course.get("chapter", "")}

Contenu du cours :
{content}

Consignes :
- Liste les notions atomiques importantes.
- Une notion = un point précis testable.
- Ne fais pas des notions trop larges.
- Ne fais pas des doublons.
- importance = high si notion majeure/examen, medium si utile, low si détail.
- keywords = mots qui permettent de retrouver la notion dans les questions.
- target_questions = nombre de questions souhaité pour cette notion.
  - high : 5 à 8
  - medium : 3 à 5
  - low : 1 à 2

Réponds uniquement en JSON valide :
{{
  "notions": [
    {{
      "title": "nom court de la notion",
      "importance": "high | medium | low",
      "keywords": ["mot clé 1", "mot clé 2"],
      "target_questions": 4
    }}
  ]
}}
"""


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only-subject", default="")
    parser.add_argument("--course-contains", default="")
    parser.add_argument("--model", default="gemini-3.1-flash-lite")
    parser.add_argument("--delay", type=int, default=30)
    parser.add_argument("--limit", type=int, default=999)
    args = parser.parse_args()

    load_env()

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)

    user = await db.users.find_one({"email": "admin@medrevision.com"})
    user_id = str(user["_id"])

    courses = await db.courses.find({"user_id": user_id}).to_list(5000)

    done = 0

    for course in courses:
        if done >= args.limit:
            break

        subject = await db.subjects.find_one({"_id": ObjectId(course.get("subject_id"))})
        subject_name = subject.get("name", "Matiere inconnue") if subject else "Matiere inconnue"

        if args.only_subject and args.only_subject.lower() not in subject_name.lower():
            continue

        if args.course_contains and args.course_contains.lower() not in course.get("title", "").lower():
            continue

        existing = await db.course_notions.count_documents({
            "user_id": user_id,
            "course_id": str(course["_id"])
        })

        if existing > 0:
            print("Deja fait :", subject_name, "->", course.get("title"))
            continue

        if count_words(course.get("content", "")) < 80:
            continue

        print("=" * 90)
        print("Extraction notions :", subject_name, "->", course.get("title"))
        print("=" * 90)

        try:
            prompt = make_prompt(course, subject_name)
            res = client.models.generate_content(model=args.model, contents=prompt)
            data = extract_json(res.text or "")

            docs = []

            for n in data.get("notions", []):
                title = (n.get("title") or "").strip()
                if not title:
                    continue

                importance = n.get("importance", "medium")
                if importance not in ["high", "medium", "low"]:
                    importance = "medium"

                target = n.get("target_questions") or target_for_importance(importance)

                docs.append({
                    "user_id": user_id,
                    "subject_id": str(course.get("subject_id")),
                    "course_id": str(course["_id"]),
                    "title": title,
                    "importance": importance,
                    "keywords": n.get("keywords", []),
                    "target_questions": int(target),
                })

            if docs:
                await db.course_notions.insert_many(docs)

            print("Notions ajoutees :", len(docs))
            done += 1
            time.sleep(args.delay)

        except Exception as e:
            print("Erreur :", e)
            time.sleep(120)

    print("Termine.")


asyncio.run(main())
