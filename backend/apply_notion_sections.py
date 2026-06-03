import asyncio
import unicodedata
from datetime import datetime, timezone
from server import db


def norm(text):
    text = text or ""
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return text.lower()


def section_for(subject_name, title):
    s = norm(subject_name)
    t = norm(title)

    # ================= DIGESTIF =================
    if "digestif" in s:
        if "physiologie digestive" in t:
            return "Physiologie"
        if (
            "semiologie" in t
            or "examen abdominal" in t
            or "foie" in t
            or "vesicule" in t
            or "pancreas" in t
            or "radiologique" in t
        ):
            return "Sémiologie"
        if "diarrhee" in t or "constipation" in t:
            return "Autres"
        return "Autres"

    # ================= CARDIO =================
    if "cardio" in s or "cardiovasculaire" in s:
        if (
            "physiologie" in t
            or "circulation" in t
            or "imagerie cardiovasculaire" in t
            or "pharmacologie" in t
            or "embryologie" in t
        ):
            return "Bases fondamentales"
        if (
            "douleur thoracique" in t
            or "semiologie cardiaque" in t
            or "examen cardio" in t
            or "frcv" in t
            or "facteurs de risque" in t
            or "ecg" in t
            or "electrocardiogramme" in t
            or "souffle" in t
            or "auscultation" in t
            or "valvulopathie" in t
        ):
            return "Sémiologie"
        if "insuffisance cardiaque" in t or "vasculaire des membres inferieurs" in t:
            return "Pathologie"
        return "Autres"

    # ================= GROG =================
    if "grog" in s:
        if "rappel" in t or "cycle ovulatoire" in t:
            return "Rappels"
        if (
            "reproduction" in t
            or "appareil genital" in t
            or "folliculogenese" in t
            or "spermatogenese" in t
            or "epididyme" in t
            or "glandes annexes" in t
            or "acte sexuel" in t
            or "couple infertile" in t
        ):
            return "Reproduction"
        if (
            "gyneco" in t
            or "cycle menstruel" in t
            or "sein" in t
            or "vulve" in t
            or "vagin" in t
            or "douleurs gynecologiques" in t
            or "grossesse normale" in t
            or "examens cliniques" in t
        ):
            return "Gynécologie"
        if (
            "genetique" in t
            or "genome" in t
            or "maladie genetique" in t
            or "apparentes" in t
            or "ethique" in t
            or "juridique" in t
        ):
            return "Génétique"
        return "Autres"

    # ================= RESPIRATOIRE =================
    if "respiratoire" in s or "pneumo" in s:
        if "physiologie respiratoire" in t:
            return "Physiologie"

        if (
            "grands syndromes pulmonaires" in t
            or "plevre" in t
            or "pleural" in t
            or "pleuresie" in t
            or "pneumothorax" in t
            or "pathologies de la plevre" in t
        ):
            return "Syndromes respiratoires · Plèvre"

        if "mediastin" in t or "mediastinaux" in t:
            return "Syndromes respiratoires · Médiastin"

        if (
            "spirometrie" in t
            or "plethysmographie" in t
            or "debit expiratoire" in t
            or "gazometrie" in t
            or "epreuve d'effort" in t
            or "test de marche" in t
        ):
            return "Exploration paraclinique · EFR"

        if (
            "endoscopie" in t
            or "fibroscopie" in t
            or "bronchoscopie" in t
            or "video-mediastinoscopie" in t
        ):
            return "Exploration paraclinique · Endoscopie"

        if "prick" in t or "allergique" in t:
            return "Exploration paraclinique · Prick-tests"

        return "Autres"

    # ================= REVÊTEMENT CUTANÉ / DERMA =================
    if "revetement" in s or "revêtement" in subject_name.lower() or "cutane" in s or "dermato" in s:
        if (
            "semiologie" in t
            or "lesions elementaires" in t
            or "lesion elementaire" in t
            or "ungueale" in t
            or "ungueal" in t
            or "ongle" in t
        ):
            return "Sémiologie"

        if (
            "physiologie" in t
            or "barriere epidermique" in t
            or "effets des uv" in t
            or "pigmentation" in t
            or "flore cutanee" in t
            or "glandes sebacees" in t
            or "brulures" in t
            or "cicatrisation" in t
            or "progression tumorale" in t
            or "immunite cutanee" in t
            or "prurit" in t
            or "alopecies" in t
            or "biopsie cutanee" in t
        ):
            return "Physiologie"

        if "histologie" in t:
            return "Histologie"

        return "Autres"

    return "Autres"


async def main():
    subjects = await db.subjects.find({}).sort("name", 1).to_list(100)

    for subject in subjects:
        subject_id = str(subject["_id"])
        subject_name = subject.get("name", "")

        courses = await db.courses.find({"subject_id": subject_id}).sort("title", 1).to_list(500)
        if not courses:
            continue

        print("\n" + "=" * 80)
        print(subject_name)
        print("=" * 80)

        for course in courses:
            title = course.get("title", "")
            old = course.get("chapter", "")
            new = section_for(subject_name, title)

            print(f"{new:<45} ← {title} | ancien: {old!r}")

            await db.courses.update_one(
                {"_id": course["_id"]},
                {
                    "$set": {
                        "chapter": new,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )

    print("\n✅ Sections Notion appliquées.")


asyncio.run(main())
