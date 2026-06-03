# -*- coding: utf-8 -*-

import argparse
import asyncio
import random
import re
import time
from datetime import datetime, timezone

from bson import ObjectId

from server import db, generate_questions_with_ai


def count_words(text):
    text = text or ""
    return len(re.findall(r"\b[\w'-]+\b", text))


def compute_target(content, min_questions, max_questions, words_per_question):
    words = count_words(content)
    if words <= 250:
        target = min_questions
    else:
        target = round(words / words_per_question)

    return max(min_questions, min(max_questions, target))


def sleep_msg(seconds, reason):
    print("")
    print(f"Pause {round(seconds / 60, 1)} min - {reason}")
    print("")
    time.sleep(seconds)


async def get_user():
    user = await db.users.find_one({"email": "admin@medrevision.com"})
    if not user:
        raise RuntimeError("Utilisateur admin introuvable")
    return user


async def build_candidates(user_id, args):
    courses = await db.courses.find({"user_id": user_id}).to_list(5000)
    candidates = []

    for course in courses:
        course_id = str(course["_id"])
        content = course.get("content", "") or ""
        words = count_words(content)

        if words < args.min_words:
            continue

        current_count = await db.questions.count_documents({
            "user_id": user_id,
            "course_id": course_id
        })

        target = compute_target(
            content,
            args.min_questions,
            args.max_questions,
            args.words_per_question
        )

        gap = target - current_count

        if gap <= 0:
            continue

        subject = None
        subject_id = course.get("subject_id")

        if subject_id:
            try:
                subject = await db.subjects.find_one({"_id": ObjectId(subject_id)})
            except Exception:
                subject = None

        subject_name = subject.get("name", "Matiere inconnue") if subject else "Matiere inconnue"

        priority = gap * 10 + min(words / 100, 50)

        candidates.append({
            "course": course,
            "course_id": course_id,
            "subject_id": subject_id,
            "subject_name": subject_name,
            "title": course.get("title", "Sans titre"),
            "content": content,
            "words": words,
            "current_count": current_count,
            "target": target,
            "gap": gap,
            "priority": priority
        })

    candidates.sort(key=lambda x: x["priority"], reverse=True)
    return candidates


async def enrich_course(user_id, candidate):
    course_id = candidate["course_id"]
    subject_id = candidate["subject_id"]
    subject_name = candidate["subject_name"]
    content = candidate["content"]
    gap = candidate["gap"]

    print("=" * 90)
    print(f"{subject_name} -> {candidate['title']}")
    print(f"Mots : {candidate['words']}")
    print(f"Questions : {candidate['current_count']} / cible {candidate['target']}")
    print(f"Manque : {gap}")
    print("=" * 90)

    existing = await db.questions.find({
        "user_id": user_id,
        "course_id": course_id
    }).to_list(5000)

    existing_texts = {
        (q.get("question", "") or "").strip().lower()
        for q in existing
    }

    generated = await generate_questions_with_ai(
        content=content,
        subject_name=subject_name,
        analysis={}
    )

    if not generated:
        print("Aucune question generee.")
        return 0

    docs = []

    for q in generated:
        if len(docs) >= gap:
            break

        q_text = (q.get("question", "") or "").strip()

        if not q_text:
            continue

        if q_text.lower() in existing_texts:
            continue

        docs.append({
            "user_id": user_id,
            "course_id": course_id,
            "subject_id": subject_id,
            "type": q.get("type", "qi"),
            "question": q_text,
            "options": q.get("options", []),
            "answer": q.get("answer", ""),
            "explanation": q.get("explanation", ""),
            "difficulty": q.get("difficulty", 2),
            "concepts": q.get("concepts", []),
            "rang": q.get("rang", "A"),
            "vignette": q.get("vignette", ""),
            "sub_questions": q.get("sub_questions", []),
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    if docs:
        await db.questions.insert_many(docs)

    new_total = await db.questions.count_documents({
        "user_id": user_id,
        "course_id": course_id
    })

    print(f"Ajoutees : {len(docs)}")
    print(f"Total maintenant : {new_total}")

    return len(docs)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-questions", type=int, default=20)
    parser.add_argument("--max-questions", type=int, default=90)
    parser.add_argument("--words-per-question", type=int, default=80)
    parser.add_argument("--min-words", type=int, default=80)
    parser.add_argument("--delay", type=int, default=45)
    parser.add_argument("--quota-sleep", type=int, default=3600)
    parser.add_argument("--overload-sleep", type=int, default=900)
    parser.add_argument("--empty-sleep", type=int, default=300)

    args = parser.parse_args()

    user = await get_user()
    user_id = str(user["_id"])

    print("")
    print("MODE NUIT - Generation continue")
    print("Ctrl+C pour arreter.")
    print("")

    while True:
        try:
            candidates = await build_candidates(user_id, args)

            if not candidates:
                print("Tous les cours ont atteint leur cible.")
                sleep_msg(1800, "nouvelle verification dans 30 min")
                continue

            print("")
            print(f"Cours a enrichir : {len(candidates)}")
            print("Top priorite :")
            for c in candidates[:5]:
                print(f"- {c['subject_name']} -> {c['title']} ({c['current_count']}/{c['target']}, {c['words']} mots)")

            candidate = candidates[0]
            added = await enrich_course(user_id, candidate)

            if added == 0:
                sleep_msg(args.empty_sleep, "Gemini vide, quota ou surcharge possible")
            else:
                sleep_msg(args.delay, "pause normale")

        except KeyboardInterrupt:
            print("")
            print("Arret manuel.")
            return

        except Exception as err:
            msg = str(err).lower()
            print("")
            print("Erreur detectee :")
            print(err)

            if "429" in msg or "quota" in msg or "resource_exhausted" in msg:
                sleep_msg(args.quota_sleep, "quota atteint")
            elif "503" in msg or "unavailable" in msg or "overload" in msg or "high demand" in msg:
                sleep_msg(args.overload_sleep + random.randint(0, 300), "Gemini surcharge")
            else:
                sleep_msg(300, "erreur inconnue")


if __name__ == "__main__":
    asyncio.run(main())
