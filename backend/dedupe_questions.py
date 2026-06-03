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
from difflib import SequenceMatcher
from pathlib import Path
from bson import ObjectId
from server import db


def normalize(text):
    text = (text or "").lower()
    text = text.replace("œ", "oe")
    text = re.sub(r"[^\wÀ-ÿ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def question_signature(q):
    parts = [
        q.get("question", ""),
        q.get("answer", ""),
        q.get("explanation", ""),
        " ".join(q.get("concepts", []) or [])
    ]

    if q.get("type") == "dp":
        for sq in q.get("sub_questions", []) or []:
            if isinstance(sq, dict):
                parts.append(sq.get("question", ""))
                parts.append(sq.get("answer", ""))

    return normalize(" ".join(parts))


def question_core(q):
    return normalize(q.get("question", ""))


def quality_score(q):
    score = 0

    if q.get("question"):
        score += min(len(q.get("question", "")), 200) / 20

    if q.get("explanation"):
        score += min(len(q.get("explanation", "")), 500) / 30

    if q.get("answer"):
        score += 5

    opts = q.get("options", []) or []
    if isinstance(opts, list) and len(opts) >= 2:
        score += 5
        if any(isinstance(o, dict) and o.get("is_correct") for o in opts):
            score += 5

    if q.get("vignette"):
        score += 5

    if q.get("type") == "dp":
        subs = q.get("sub_questions", []) or []
        score += len(subs) * 3

    return score


def similarity(a, b):
    return SequenceMatcher(None, a, b).ratio()


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only-subject", default="")
    parser.add_argument("--threshold", type=float, default=0.88)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    user = await db.users.find_one({"email": "admin@medrevision.com"})
    user_id = str(user["_id"])

    subject_filter = {}
    if args.only_subject:
        subject = await db.subjects.find_one({
            "user_id": user_id,
            "name": {"$regex": args.only_subject, "$options": "i"}
        })
        if not subject:
            print("Matière introuvable :", args.only_subject)
            return
        subject_filter["subject_id"] = str(subject["_id"])

    courses = await db.courses.find({
        "user_id": user_id,
        **subject_filter
    }).to_list(5000)

    all_deletions = []
    report = []

    for course in courses:
        course_id = str(course["_id"])
        questions = await db.questions.find({
            "user_id": user_id,
            "course_id": course_id
        }).to_list(5000)

        if len(questions) < 2:
            continue

        to_delete = set()
        duplicate_groups = []

        # 1. Doublons stricts sur signature
        by_sig = {}
        for q in questions:
            sig = question_signature(q)
            if not sig:
                continue
            by_sig.setdefault(sig, []).append(q)

        for sig, group in by_sig.items():
            if len(group) <= 1:
                continue

            keep = max(group, key=quality_score)
            deletions = [q for q in group if q["_id"] != keep["_id"]]

            for q in deletions:
                to_delete.add(str(q["_id"]))

            duplicate_groups.append({
                "type": "strict",
                "keep": str(keep["_id"]),
                "delete": [str(q["_id"]) for q in deletions],
                "question": keep.get("question", "")
            })

        # 2. Quasi-doublons sur énoncé seul
        remaining = [q for q in questions if str(q["_id"]) not in to_delete]
        cores = [(q, question_core(q)) for q in remaining]

        for i in range(len(cores)):
            q1, c1 = cores[i]
            if str(q1["_id"]) in to_delete or len(c1) < 20:
                continue

            group = [q1]

            for j in range(i + 1, len(cores)):
                q2, c2 = cores[j]
                if str(q2["_id"]) in to_delete or len(c2) < 20:
                    continue

                if q1.get("type") != q2.get("type"):
                    continue

                ratio = similarity(c1, c2)

                if ratio >= args.threshold:
                    group.append(q2)

            if len(group) > 1:
                keep = max(group, key=quality_score)
                deletions = [q for q in group if q["_id"] != keep["_id"]]

                for q in deletions:
                    to_delete.add(str(q["_id"]))

                duplicate_groups.append({
                    "type": "similar",
                    "keep": str(keep["_id"]),
                    "delete": [str(q["_id"]) for q in deletions],
                    "question": keep.get("question", "")
                })

        if duplicate_groups:
            report.append({
                "course_id": course_id,
                "course_title": course.get("title", ""),
                "question_count_before": len(questions),
                "delete_count": len(to_delete),
                "groups": duplicate_groups
            })

            for qid in to_delete:
                all_deletions.append(qid)

    Path("dedupe_candidates.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    lines = []
    lines.append("# Rapport de doublons")
    lines.append("")
    lines.append(f"Doublons candidats à supprimer : {len(all_deletions)}")
    lines.append("")

    for r in report:
        lines.append(f"## {r['course_title']}")
        lines.append("")
        lines.append(f"- Questions avant : {r['question_count_before']}")
        lines.append(f"- Questions à supprimer : {r['delete_count']}")
        lines.append("")
        for g in r["groups"][:20]:
            lines.append(f"- Type : {g['type']}")
            lines.append(f"  - Gardée : `{g['keep']}`")
            lines.append(f"  - Supprimées : {', '.join(g['delete'])}")
            lines.append(f"  - Question : {g['question'][:200]}")
        lines.append("")

    Path("dedupe_report.md").write_text("\n".join(lines), encoding="utf-8")

    print("Rapport créé : dedupe_report.md")
    print("JSON créé : dedupe_candidates.json")
    print("Questions candidates à supprimer :", len(all_deletions))

    if not args.apply:
        print()
        print("Mode test uniquement.")
        print("Ouvre dedupe_report.md avant suppression.")
        print()
        print("Pour appliquer :")
        cmd = "python dedupe_questions.py"
        if args.only_subject:
            cmd += f' --only-subject "{args.only_subject}"'
        cmd += f" --threshold {args.threshold} --apply"
        print(cmd)
        return

    if not all_deletions:
        print("Rien à supprimer.")
        return

    res = await db.questions.delete_many({
        "_id": {"$in": [ObjectId(qid) for qid in all_deletions]}
    })

    print("Supprimées :", res.deleted_count)


asyncio.run(main())
