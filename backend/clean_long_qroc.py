# -*- coding: utf-8 -*-

# UTF-8 console fix for Windows
import sys
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

import argparse
import asyncio
import json
import re
from pathlib import Path
from server import db

def get_expected_answer(q):
    if q.get("answer"):
        return str(q.get("answer")).strip()

    opts = q.get("options") or []
    if opts and isinstance(opts, list):
        first = opts[0]
        if isinstance(first, dict):
            return str(first.get("text", "")).strip()

    return ""

def word_count(text):
    return len(re.findall(r"\b[\wÀ-ÿ'-]+\b", text or ""))

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only-subject", default="")
    parser.add_argument("--max-words", type=int, default=2)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    query = {"type": "qroc"}

    if args.only_subject:
        subject = await db.subjects.find_one({
            "name": {"$regex": args.only_subject, "$options": "i"}
        })
        if not subject:
            print("Matière introuvable :", args.only_subject)
            return
        query["subject_id"] = str(subject["_id"])

    qrocs = await db.questions.find(query).to_list(10000)

    long_qrocs = []

    for q in qrocs:
        ans = get_expected_answer(q)
        wc = word_count(ans)

        if wc > args.max_words:
            long_qrocs.append({
                "id": str(q["_id"]),
                "course_id": q.get("course_id"),
                "subject_id": q.get("subject_id"),
                "question": q.get("question", ""),
                "answer": ans,
                "word_count": wc
            })

    print("QROC totales :", len(qrocs))
    print(f"QROC avec réponse > {args.max_words} mots :", len(long_qrocs))
    print()

    for q in long_qrocs[:80]:
        print("-", q["id"], "|", q["word_count"], "mots")
        print("  Q :", q["question"][:160])
        print("  R :", q["answer"][:180])
        print()

    Path("long_qroc_backup.json").write_text(
        json.dumps(long_qrocs, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print("Backup créé : long_qroc_backup.json")

    if not args.apply:
        print()
        print("Mode test seulement. Pour supprimer vraiment :")
        print(f"python clean_long_qroc.py --only-subject \"{args.only_subject}\" --max-words {args.max_words} --apply")
        return

    ids = [q["id"] for q in long_qrocs]

    if not ids:
        print("Rien à supprimer.")
        return

    from bson import ObjectId
    res = await db.questions.delete_many({
        "_id": {"$in": [ObjectId(i) for i in ids]}
    })

    print("QROC longues supprimées :", res.deleted_count)

asyncio.run(main())
