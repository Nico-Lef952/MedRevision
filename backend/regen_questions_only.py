import argparse
import asyncio
import time
from datetime import datetime, timezone

from server import db, generate_questions_with_ai


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--delay", type=int, default=90)
    args = parser.parse_args()

    user = await db.users.find_one({"email": "admin@medrevision.com"})
    if not user:
        raise RuntimeError("Utilisateur admin introuvable")

    user_id = str(user["_id"])
    courses = await db.courses.find({"user_id": user_id}).to_list(500)

    zero_courses = []

    for course in courses:
        course_id = str(course["_id"])
        q_count = await db.questions.count_documents({
            "course_id": course_id,
            "user_id": user_id
        })

        if q_count == 0:
            zero_courses.append(course)

    print(f"Cours sans questions trouvés : {len(zero_courses)}")
    print(f"Limite cette session : {args.limit}")
    print("Mode : questions seulement")
    print("")

    done = 0

    for course in zero_courses:
        if done >= args.limit:
            print("STOP : limite atteinte")
            return

        course_id = str(course["_id"])
        subject_id = course.get("subject_id")
        title = course.get("title", "Sans titre")
        content = course.get("content", "")

        subject = await db.subjects.find_one({"_id": __import__("bson").ObjectId(subject_id)})
        subject_name = subject.get("name", "Matière inconnue") if subject else "Matière inconnue"

        print(f"GENERATION QUESTIONS : {subject_name} → {title}")

        questions = await generate_questions_with_ai(
            content=content,
            subject_name=subject_name,
            analysis={}
        )

        if not questions:
            print("")
            print("⚠️ 0 question générée.")
            print("Probable quota Gemini atteint, surcharge Gemini, ou réponse invalide.")
            print("J'arrête pour éviter de gaspiller les requêtes.")
            return

        docs = []

        for q in questions:
            docs.append({
                "user_id": user_id,
                "course_id": course_id,
                "subject_id": subject_id,
                "type": q.get("type", "qi"),
                "question": q.get("question", ""),
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

        await db.questions.insert_many(docs)

        q_count = await db.questions.count_documents({
            "course_id": course_id,
            "user_id": user_id
        })

        print(f"  OK : {q_count} questions générées")

        done += 1

        print(f"Pause {args.delay}s...")
        time.sleep(args.delay)

    print("")
    print(f"Terminé. Cours traités : {done}")


if __name__ == "__main__":
    asyncio.run(main())
