import argparse
import asyncio
import time
from datetime import datetime, timezone
from bson import ObjectId

from server import db, generate_questions_with_ai


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", type=int, default=30, help="Nombre minimal de questions souhaité par cours")
    parser.add_argument("--limit", type=int, default=20, help="Nombre max de cours traités")
    parser.add_argument("--delay", type=int, default=30, help="Pause entre deux cours")
    args = parser.parse_args()

    user = await db.users.find_one({"email": "admin@medrevision.com"})
    if not user:
        raise RuntimeError("Utilisateur admin introuvable")

    user_id = str(user["_id"])
    courses = await db.courses.find({"user_id": user_id}).to_list(1000)

    candidates = []

    for course in courses:
        course_id = str(course["_id"])
        q_count = await db.questions.count_documents({
            "course_id": course_id,
            "user_id": user_id
        })

        # On enrichit seulement les cours qui ont déjà des questions,
        # mais pas encore assez.
        if 0 < q_count < args.target:
            candidates.append((course, q_count))

    candidates.sort(key=lambda x: x[1])

    print(f"Cours déjà couverts mais sous {args.target} questions : {len(candidates)}")
    print(f"Limite cette session : {args.limit}")
    print("Mode : ajout de questions, sans suppression")
    print("")

    done = 0

    for course, old_count in candidates:
        if done >= args.limit:
            print("STOP : limite atteinte")
            return

        course_id = str(course["_id"])
        subject_id = course.get("subject_id")
        title = course.get("title", "Sans titre")
        content = course.get("content", "")

        subject = await db.subjects.find_one({"_id": ObjectId(subject_id)})
        subject_name = subject.get("name", "Matière inconnue") if subject else "Matière inconnue"

        print(f"ENRICHISSEMENT : {subject_name} → {title}")
        print(f"  Questions actuelles : {old_count}")

        existing_questions = await db.questions.find({
            "course_id": course_id,
            "user_id": user_id
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
            print("")
            print("⚠️ 0 question générée.")
            print("Probable surcharge Gemini, quota atteint, ou réponse invalide.")
            print("J'arrête pour éviter de gaspiller les requêtes.")
            return

        docs = []

        for q in generated:
            q_text = (q.get("question", "") or "").strip()
            if not q_text:
                continue

            # Évite les doublons exacts
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
            "course_id": course_id,
            "user_id": user_id
        })

        print(f"  Ajoutées : {len(docs)}")
        print(f"  Total maintenant : {new_count}")
        print("")

        done += 1

        print(f"Pause {args.delay}s...")
        time.sleep(args.delay)

    print("")
    print(f"Terminé. Cours enrichis : {done}")


if __name__ == "__main__":
    asyncio.run(main())
