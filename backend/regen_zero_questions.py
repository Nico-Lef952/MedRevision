import argparse
import asyncio
import time

from server import db, process_course_ai


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=8)
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
    print("")

    done = 0

    for course in zero_courses:
        if done >= args.limit:
            print("STOP : limite atteinte")
            return

        course_id = str(course["_id"])
        title = course.get("title", "Sans titre")
        content = course.get("content", "")
        subject_id = course.get("subject_id")

        subject = await db.subjects.find_one({"_id": __import__("bson").ObjectId(subject_id)})
        subject_name = subject.get("name", "Matière inconnue") if subject else "Matière inconnue"

        print(f"GENERATION : {subject_name} → {title}")

        await process_course_ai(course_id, content, subject_name, user_id)

        q_after = await db.questions.count_documents({
            "course_id": course_id,
            "user_id": user_id
        })

        print(f"  Questions après génération : {q_after}")

        if q_after == 0:
            print("")
            print("⚠️ Aucune question générée.")
            print("Probable quota Gemini atteint ou réponse IA invalide.")
            print("J'arrête pour éviter de gaspiller les requêtes.")
            return

        done += 1

        print(f"Pause {args.delay}s pour éviter les limites Gemini...")
        time.sleep(args.delay)

    print("")
    print(f"Terminé. Cours traités : {done}")


if __name__ == "__main__":
    asyncio.run(main())
