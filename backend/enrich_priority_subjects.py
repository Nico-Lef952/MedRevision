import argparse
import asyncio
import time
from datetime import datetime, timezone
from bson import ObjectId

from server import db, generate_questions_with_ai


PRIORITY_SUBJECTS = [
    "GROG",
]


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", type=int, default=30)
    parser.add_argument("--limit", type=int, default=10, help="Nombre max d'appels Gemini")
    parser.add_argument("--delay", type=int, default=90)
    args = parser.parse_args()

    user = await db.users.find_one({"email": "admin@medrevision.com"})
    if not user:
        raise RuntimeError("Utilisateur admin introuvable")

    user_id = str(user["_id"])
    calls = 0

    print(f"Objectif : compléter jusqu'à {args.target} questions")
    print(f"Ordre : {', '.join(PRIORITY_SUBJECTS)}")
    print(f"Limite appels Gemini : {args.limit}")
    print("")

    for subject_name in PRIORITY_SUBJECTS:
        subject = await db.subjects.find_one({"name": subject_name, "user_id": user_id})
        if not subject:
            print(f"⚠️ Matière introuvable : {subject_name}")
            continue

        subject_id = str(subject["_id"])
        courses = await db.courses.find({
            "user_id": user_id,
            "subject_id": subject_id
        }).sort("title", 1).to_list(500)

        print("=" * 80)
        print(f"MATIÈRE : {subject_name}")
        print("=" * 80)

        for course in courses:
            if calls >= args.limit:
                print("STOP : limite d'appels atteinte")
                return

            course_id = str(course["_id"])
            title = course.get("title", "Sans titre")
            content = course.get("content", "")

            q_count = await db.questions.count_documents({
                "user_id": user_id,
                "course_id": course_id
            })

            if q_count >= args.target:
                print(f"SKIP : {title} déjà à {q_count} questions")
                continue

            print(f"\nENRICHISSEMENT : {subject_name} → {title}")
            print(f"  Questions actuelles : {q_count}")

            existing_questions = await db.questions.find({
                "user_id": user_id,
                "course_id": course_id
            }).to_list(500)

            existing_texts = {
                (q.get("question", "") or "").strip().lower()
                for q in existing_questions
            }

            generated = await generate_questions_with_ai(
                content=content,
                subject_name=subject_name,
                analysis={}
            )

            if not generated:
                print("⚠️ 0 question générée.")
                print("Probable quota atteint, surcharge Gemini, ou réponse invalide.")
                print("J'arrête pour éviter de gaspiller.")
                return

            docs = []

            for q in generated:
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

            new_count = await db.questions.count_documents({
                "user_id": user_id,
                "course_id": course_id
            })

            calls += 1

            print(f"  Ajoutées : {len(docs)}")
            print(f"  Total maintenant : {new_count}")
            print(f"  Appels utilisés : {calls}/{args.limit}")

            if new_count < args.target:
                print("  Encore sous l'objectif, il pourra être complété au prochain passage.")

            print(f"Pause {args.delay}s...")
            time.sleep(args.delay)

    print("")
    print("Terminé : Digestif puis GROG traités selon la limite.")


if __name__ == "__main__":
    asyncio.run(main())
