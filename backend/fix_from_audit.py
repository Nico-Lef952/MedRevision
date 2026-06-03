# -*- coding: utf-8 -*-

import argparse
import asyncio
import json
import os
import re
import time
from pathlib import Path
from datetime import datetime, timezone
from bson import ObjectId
from google import genai

from server import db


def load_env():
    for line in Path(".env").read_text(encoding="utf-8", errors="ignore").splitlines():
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
        raise ValueError("JSON introuvable dans la réponse IA")

    return json.loads(text[start:end + 1])


def sleep_msg(seconds, reason):
    print("")
    print(f"Pause {round(seconds / 60, 1)} min - {reason}")
    print("")
    time.sleep(seconds)


def norm(text):
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def make_prompt(course, subject_name, audit, existing_questions, amount):
    missing = audit.get("missing_notions", [])
    bad = audit.get("bad_questions", [])
    duplicates = audit.get("duplicates", [])

    existing_small = [
        {
            "type": q.get("type"),
            "question": q.get("question"),
            "concepts": q.get("concepts", [])
        }
        for q in existing_questions[-300:]
    ]

    content = course.get("content", "") or ""
    if len(content) > 70000:
        content = content[:70000] + "\n\n[CONTENU TRONQUE]"

    return f"""
Tu es un générateur de questions médicales pour une banque d'entraînement.

Objectif :
Corriger les faiblesses détectées par un audit IA.

Cours :
Matière : {subject_name}
Titre : {course.get("title", "")}
Section : {course.get("chapter", "")}

Score audit :
- global : {audit.get("global_score")}/100
- couverture : {audit.get("coverage_score")}/100
- pertinence : {audit.get("relevance_score")}/100
- formulation : {audit.get("wording_score")}/100
- exactitude : {audit.get("factual_score")}/100

Résumé audit :
{audit.get("summary", "")}

Notions manquantes à couvrir en priorité :
{json.dumps(missing, ensure_ascii=False, indent=2)}

Questions problématiques à éviter de reproduire :
{json.dumps(bad, ensure_ascii=False, indent=2)}

Doublons détectés à éviter :
{json.dumps(duplicates, ensure_ascii=False, indent=2)}

Questions existantes récentes :
{json.dumps(existing_small, ensure_ascii=False, indent=2)}

Contenu du cours :
{content}

Consignes :
- Génère exactement {amount} nouvelles questions.
- Couvre les notions manquantes.
- Ne répète pas les questions existantes.
- Ne fais pas de doublons de formulation ou de notion.
- Fais des questions pertinentes, justes, utiles pour maîtriser le cours.
- Mélange les types : qrm, qroc, cas_clinique, dp.
- Pour cas_clinique : vignette + 4/5 options + au moins une option correcte.
- Pour dp : vignette + 3 à 5 sous-questions dans sub_questions.
- Réponds uniquement en JSON valide.

Format attendu :
{{
  "strategy": "explication courte en français",
  "questions": [
    {{
      "type": "qrm | qroc | cas_clinique | dp",
      "question": "texte",
      "vignette": "",
      "options": [
        {{"text": "option", "is_correct": true}},
        {{"text": "option", "is_correct": false}}
      ],
      "answer": "réponse attendue",
      "explanation": "correction claire",
      "difficulty": 2,
      "rang": "A",
      "concepts": ["notion"],
      "sub_questions": []
    }}
  ]
}}
"""


def validate(q):
    qtype = q.get("type", "qrm")

    if qtype not in ["qrm", "qroc", "cas_clinique", "dp"]:
        qtype = "qrm"

    question = q.get("question", "").strip()
    if not question:
        return None

    options = q.get("options", [])
    if not isinstance(options, list):
        options = []

    clean_options = []
    for opt in options:
        if isinstance(opt, dict):
            text = opt.get("text", "").strip()
            if text:
                clean_options.append({
                    "text": text,
                    "is_correct": bool(opt.get("is_correct", False))
                })

    if qtype in ["qrm", "cas_clinique"]:
        if len(clean_options) < 2:
            return None
        if not any(o["is_correct"] for o in clean_options):
            return None

    if qtype == "cas_clinique" and not q.get("vignette"):
        return None

    if qtype == "dp":
        subs = q.get("sub_questions", [])
        if not isinstance(subs, list) or len(subs) < 2:
            return None

    if qtype == "qroc":
        if not q.get("answer"):
            return None
        if not clean_options:
            clean_options = [{"text": q.get("answer", ""), "is_correct": True}]

    return {
        "type": qtype,
        "question": question,
        "vignette": q.get("vignette", ""),
        "options": clean_options,
        "answer": q.get("answer", ""),
        "explanation": q.get("explanation", ""),
        "difficulty": q.get("difficulty", 2),
        "rang": q.get("rang", "A"),
        "concepts": q.get("concepts", []),
        "sub_questions": q.get("sub_questions", [])
    }


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit", default="audit_questions_results.json")
    parser.add_argument("--model", default="gemini-3.1-flash-lite")
    parser.add_argument("--only-subject", default="")
    parser.add_argument("--limit-courses", type=int, default=999)
    parser.add_argument("--amount", type=int, default=8)
    parser.add_argument("--max-score", type=int, default=70)
    parser.add_argument("--delay", type=int, default=90)
    parser.add_argument("--quota-sleep", type=int, default=3600)
    args = parser.parse_args()

    load_env()

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)

    audits = json.loads(Path(args.audit).read_text(encoding="utf-8"))

    # Priorité : score bas + priorité high/medium
    audits = [
        a for a in audits
        if a.get("global_score", 100) <= args.max_score
        or a.get("priority") in ["high", "medium"]
    ]

    if args.only_subject:
        audits = [
            a for a in audits
            if args.only_subject.lower() in a.get("subject_name", "").lower()
        ]

    audits.sort(key=lambda a: (
        {"high": 0, "medium": 1, "low": 2}.get(a.get("priority"), 3),
        a.get("global_score", 100)
    ))

    print(f"Cours à reprendre : {len(audits)}")

    done = 0

    for audit in audits:
        if done >= args.limit_courses:
            break

        course_id = audit.get("course_id")
        course = await db.courses.find_one({"_id": ObjectId(course_id)})
        if not course:
            print("Cours introuvable :", course_id)
            continue

        subject = await db.subjects.find_one({"_id": ObjectId(course.get("subject_id"))})
        subject_name = subject.get("name", "Matière inconnue") if subject else "Matière inconnue"

        existing = await db.questions.find({"course_id": course_id}).to_list(5000)
        existing_texts = {norm(q.get("question", "")) for q in existing}

        while True:
            try:
                print("=" * 90)
                print(f"Correction : {subject_name} -> {course.get('title')}")
                print(f"Score audit : {audit.get('global_score')}/100")
                print(f"Notions manquantes : {len(audit.get('missing_notions', []))}")
                print("=" * 90)

                prompt = make_prompt(course, subject_name, audit, existing, args.amount)

                res = client.models.generate_content(
                    model=args.model,
                    contents=prompt
                )

                data = extract_json(res.text or "")
                raw_questions = data.get("questions", [])

                docs = []

                for raw in raw_questions:
                    q = validate(raw)
                    if not q:
                        continue

                    if norm(q["question"]) in existing_texts:
                        continue

                    existing_texts.add(norm(q["question"]))

                    docs.append({
                        "user_id": course.get("user_id"),
                        "course_id": course_id,
                        "subject_id": course.get("subject_id"),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        **q
                    })

                if docs:
                    await db.questions.insert_many(docs)

                print("Stratégie :", data.get("strategy", ""))
                print("Questions insérées :", len(docs))

                done += 1
                sleep_msg(args.delay, "pause normale")
                break

            except Exception as err:
                msg = str(err).lower()
                print("Erreur :", err)

                if "429" in msg or "quota" in msg or "resource_exhausted" in msg:
                    sleep_msg(args.quota_sleep, "quota atteint")
                elif "503" in msg or "unavailable" in msg:
                    sleep_msg(900, "Gemini surchargé")
                else:
                    sleep_msg(300, "erreur inconnue")

    print("Terminé.")


asyncio.run(main())
