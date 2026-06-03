import argparse
import asyncio
import re
import uuid
import zipfile
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

from datetime import datetime, timezone
from pathlib import Path

from server import db, process_course_ai

ROOT = Path(__file__).resolve().parents[1]
IMPORTS_DIR = ROOT / "imports"
EXTRACT_DIR = ROOT / "imports_extracted"

def extract_zip_recursive(zip_path: Path, dest: Path, depth: int = 0):
    """Extrait un ZIP, puis extrait aussi les ZIP qu'il contient."""
    if depth > 5:
        return

    dest.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(dest)

    nested_zips = list(dest.rglob("*.zip"))

    for nested_zip in nested_zips:
        nested_dest = nested_zip.parent / nested_zip.stem
        if nested_dest.exists() and any(nested_dest.iterdir()):
            continue
        extract_zip_recursive(nested_zip, nested_dest, depth + 1)



SUBJECT_MAP = {
    "cardio": ("Appareil cardiovasculaire", "#EF4444", "heart"),
    "cardiovasculaire": ("Appareil cardiovasculaire", "#EF4444", "heart"),
    "pneumo": ("Appareil respiratoire", "#3B82F6", "lungs"),
    "respiratoire": ("Appareil respiratoire", "#3B82F6", "lungs"),
    "digestif": ("Appareil digestif", "#F97316", "stomach"),
    "dermato": ("Revêtement cutané", "#F59E0B", "sparkles"),
    "cutane": ("Revêtement cutané", "#F59E0B", "sparkles"),
    "cutané": ("Revêtement cutané", "#F59E0B", "sparkles"),
    "revetement": ("Revêtement cutané", "#F59E0B", "sparkles"),
    "revêtement": ("Revêtement cutané", "#F59E0B", "sparkles"),
    "grog": ("GROG", "#EC4899", "baby"),
    "gyneco": ("GROG", "#EC4899", "baby"),
    "gynéco": ("GROG", "#EC4899", "baby"),
}

def clean_name(text: str) -> str:
    text = re.sub(r"%20", " ", text)
    text = re.sub(r"[_\\-]+", " ", text)
    text = re.sub(r"\\s+", " ", text)
    return text.strip()

def subject_from_zip(zip_path: Path):
    try:
        rel = " ".join(zip_path.relative_to(IMPORTS_DIR).parts).lower()
    except Exception:
        rel = str(zip_path).lower()

    rel = clean_name(rel)

    for key, value in SUBJECT_MAP.items():
        if key in rel:
            return value

    return (clean_name(zip_path.parent.name).title(), "#6366F1", "book")

def title_from_markdown(md_path: Path, content: str) -> str:
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("# "):
            title = line.replace("#", "", 1).strip()
            if title:
                return clean_name(title)

    title = md_path.stem
    title = re.sub(r"\\s+[0-9a-f]{16,}$", "", title, flags=re.I)
    return clean_name(title) or "Cours sans titre"

async def get_admin_user():
    user = await db.users.find_one({"email": "admin@medrevision.com"})
    if not user:
        raise RuntimeError("Utilisateur admin@medrevision.com introuvable.")
    return {"id": str(user["_id"]), "email": user["email"]}

async def get_or_create_subject(user_id: str, name: str, color: str, icon: str):
    existing = await db.subjects.find_one({
        "user_id": user_id,
        "name": name,
        "archived": {"$ne": True}
    })

    if existing:
        return str(existing["_id"])

    doc = {
        "user_id": user_id,
        "name": name,
        "description": "",
        "color": color,
        "icon": icon,
        "archived": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    result = await db.subjects.insert_one(doc)
    return str(result.inserted_id)

async def course_exists(user_id: str, subject_id: str, title: str):
    return await db.courses.find_one({
        "user_id": user_id,
        "subject_id": subject_id,
        "title": title
    })

async def import_course(user_id, subject_id, subject_name, md_path, generate):
    content = md_path.read_text(encoding="utf-8", errors="ignore").strip()

    if len(content) < 100:
        print(f"SKIP trop court : {md_path.name}")
        return None

    title = title_from_markdown(md_path, content)

    existing_course = await course_exists(user_id, subject_id, title)
    if existing_course:
        existing_id = str(existing_course["_id"])
        q_count = await db.questions.count_documents({"course_id": existing_id, "user_id": user_id})

        if generate and q_count == 0:
            print(f"REGEN questions manquantes : {title}")
            await process_course_ai(existing_id, existing_course.get("content", content), subject_name, user_id)
            q_count_after = await db.questions.count_documents({"course_id": existing_id, "user_id": user_id})
            print(f"  OK : {q_count_after} questions générées")
            return existing_id

        print(f"SKIP déjà existant : {title} ({q_count} questions)")
        return None

    now = datetime.now(timezone.utc).isoformat()

    course_doc = {
        "user_id": user_id,
        "subject_id": subject_id,
        "title": title,
        "content": content,
        "original_file": {
            "filename": md_path.name,
            "file_id": str(uuid.uuid4()),
            "file_type": "markdown",
            "file_ext": ".md",
            "file_path": str(md_path)
        },
        "tags": [],
        "chapter": "",
        "analysis": {},
        "cross_references": [],
        "created_at": now,
        "updated_at": now
    }

    result = await db.courses.insert_one(course_doc)
    course_id = str(result.inserted_id)

    print(f"IMPORT : {subject_name} → {title}")

    if generate:
        print("  Gemini : génération...")
        await process_course_ai(course_id, content, subject_name, user_id)
        q_count = await db.questions.count_documents({
            "course_id": course_id,
            "user_id": user_id
        })
        print(f"  OK : {q_count} questions générées")

    return course_id

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=3)
    parser.add_argument("--generate", action="store_true")
    args = parser.parse_args()

    if not IMPORTS_DIR.exists():
        raise RuntimeError(f"Dossier imports introuvable : {IMPORTS_DIR}")

    zip_files = sorted(IMPORTS_DIR.rglob("*.zip"))

    if not zip_files:
        raise RuntimeError("Aucun fichier ZIP trouvé dans imports/")

    user = await get_admin_user()
    user_id = user["id"]

    print(f"Utilisateur : {user['email']}")
    print(f"ZIP trouvés : {len(zip_files)}")
    print(f"Limite : {args.limit}")
    print(f"Génération Gemini : {'oui' if args.generate else 'non'}")
    print("")

    imported = 0

    for zip_path in zip_files:
        subject_name, color, icon = subject_from_zip(zip_path)

        extract_to = EXTRACT_DIR / zip_path.parent.name / zip_path.stem
        extract_to.mkdir(parents=True, exist_ok=True)

        extract_zip_recursive(zip_path, extract_to)

        md_files = sorted(extract_to.rglob("*.md"))

        print(f"--- {zip_path.name} → {subject_name} : {len(md_files)} fichiers .md ---")

        if args.dry_run:
            for md in md_files[:20]:
                content = md.read_text(encoding="utf-8", errors="ignore")
                print(f"  - {title_from_markdown(md, content)}")
            continue

        subject_id = await get_or_create_subject(user_id, subject_name, color, icon)

        for md in md_files:
            if imported >= args.limit:
                print("")
                print(f"STOP : limite atteinte ({args.limit})")
                return

            course_id = await import_course(
                user_id=user_id,
                subject_id=subject_id,
                subject_name=subject_name,
                md_path=md,
                generate=args.generate
            )

            if course_id:
                imported += 1

    print("")
    print(f"Terminé. Cours importés : {imported}")

if __name__ == "__main__":
    asyncio.run(main())
