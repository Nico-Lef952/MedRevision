# -*- coding: utf-8 -*-

import asyncio
import re
from server import db

def norm(text):
    text = (text or "").lower()
    text = text.replace("œ", "oe")
    text = re.sub(r"[^\wÀ-ÿ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def question_text(q):
    parts = [
        q.get("question", ""),
        q.get("answer", ""),
        q.get("explanation", ""),
        q.get("vignette", ""),
        " ".join(q.get("concepts", []) or [])
    ]

    for opt in q.get("options", []) or []:
        if isinstance(opt, dict):
            parts.append(opt.get("text", ""))

    for sq in q.get("sub_questions", []) or []:
        if isinstance(sq, dict):
            parts.append(sq.get("question", ""))
            parts.append(sq.get("answer", ""))
            parts.append(sq.get("explanation", ""))
            for opt in sq.get("options", []) or []:
                if isinstance(opt, dict):
                    parts.append(opt.get("text", ""))

    return norm(" ".join(parts))

def notion_matches_question(notion, q_text):
    keywords = notion.get("keywords", []) or []
    title = notion.get("title", "")

    terms = [title] + keywords
    terms = [norm(t) for t in terms if t and len(norm(t)) >= 4]

    if not terms:
        return False

    # Match si au moins un gros mot-cle est retrouvé
    for term in terms:
        if term in q_text:
            return True

    # Match souple : plusieurs mots du titre retrouvés
    title_words = [w for w in norm(title).split() if len(w) >= 4]
    if title_words:
        found = sum(1 for w in title_words if w in q_text)
        return found >= max(1, len(title_words) // 2)

    return False

async def main():
    user = await db.users.find_one({"email": "admin@medrevision.com"})
    user_id = str(user["_id"])

    grog = await db.subjects.find_one({
        "user_id": user_id,
        "name": {"$regex": "GROG", "$options": "i"}
    })

    if not grog:
        print("GROG introuvable")
        return

    courses = await db.courses.find({
        "user_id": user_id,
        "subject_id": str(grog["_id"])
    }).to_list(500)

    total_notions = 0
    total_uncovered = 0
    total_under_target = 0

    print("\nCOUVERTURE DES NOTIONS - GROG\n")

    for course in sorted(courses, key=lambda c: c.get("title", "")):
        course_id = str(course["_id"])

        notions = await db.course_notions.find({
            "user_id": user_id,
            "course_id": course_id
        }).to_list(500)

        questions = await db.questions.find({
            "user_id": user_id,
            "course_id": course_id
        }).to_list(5000)

        if not notions:
            print(f"\n[NOTIONS NON GENEREES] {course.get('title')}")
            continue

        q_texts = [(str(q["_id"]), question_text(q)) for q in questions]

        uncovered = []
        under_target = []

        for notion in notions:
            count = 0
            for qid, qt in q_texts:
                if notion_matches_question(notion, qt):
                    count += 1

            target = int(notion.get("target_questions", 2) or 2)

            if count == 0:
                uncovered.append((notion, count, target))
            elif count < target:
                under_target.append((notion, count, target))

        total_notions += len(notions)
        total_uncovered += len(uncovered)
        total_under_target += len(under_target)

        status = "OK" if not uncovered else "A COMPLETER"

        print(f"\n{status} | {course.get('title')}")
        print(f"Questions : {len(questions)} | Notions : {len(notions)} | Non couvertes : {len(uncovered)} | Sous cible : {len(under_target)}")

        if uncovered:
            print("  Notions non couvertes :")
            for n, count, target in uncovered[:20]:
                print(f"  - {n.get('title')} | importance {n.get('importance')} | {count}/{target}")

        if under_target:
            print("  Notions sous-couvertes :")
            for n, count, target in under_target[:10]:
                print(f"  - {n.get('title')} | importance {n.get('importance')} | {count}/{target}")

    print("\n" + "=" * 80)
    print("BILAN GLOBAL GROG")
    print("Notions totales :", total_notions)
    print("Notions non couvertes :", total_uncovered)
    print("Notions sous-couvertes :", total_under_target)
    print("=" * 80)

asyncio.run(main())
