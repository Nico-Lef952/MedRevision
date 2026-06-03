import argparse
import asyncio
from datetime import datetime, timezone
from server import db


def guess_chapter(subject_name: str, title: str) -> str:
    s = subject_name.lower()
    t = title.lower()

    # ---------------- DIGESTIF ----------------
    if "digestif" in s:
        if t.strip() == "appareil digestif":
            return "Sommaire / introduction"
        if "physiologie" in t:
            return "Physiologie"
        if "sémiologie" in t or "semiologie" in t or "examen abdominal" in t:
            return "Sémiologie"
        if "radiologique" in t or "imagerie" in t or "exploration" in t:
            return "Imagerie / explorations"
        if "diarrhée" in t or "diarrhee" in t or "constipation" in t:
            return "Pathologies digestives"
        return "Autres"

    # ---------------- RESPIRATOIRE / PNEUMO ----------------
    if "respiratoire" in s or "pneumo" in s:
        if t.strip() in ["appareil respiratoire", "pneumo"]:
            return "Sommaire / introduction"
        if "physiologie" in t:
            return "Physiologie"
        if "sémiologie" in t or "semiologie" in t or "signes fonctionnels" in t or "hoover" in t:
            return "Sémiologie"
        if "imagerie" in t or "radiographie" in t or "scanner" in t or "thoracique" in t:
            return "Imagerie"
        if "exploration" in t or "spirométrie" in t or "spirometrie" in t or "pléthysmographie" in t or "plethysmographie" in t or "gazométrie" in t or "gazometrie" in t or "test de marche" in t or "effort cardio" in t:
            return "Explorations fonctionnelles"
        if "endoscopie" in t or "fibroscopie" in t or "médiastinoscopie" in t or "mediastinoscopie" in t:
            return "Endoscopie / gestes"
        if "syndrome" in t or "pleur" in t or "pneumothorax" in t or "médiastin" in t or "mediastin" in t:
            return "Syndromes respiratoires"
        if "micro anatomie" in t or "anatomie" in t:
            return "Anatomie / histologie"
        return "Autres"

    # ---------------- CARDIO ----------------
    if "cardio" in s or "cardiovasculaire" in s:
        if t.strip() == "appareil cardiovasculaire":
            return "Sommaire / introduction"
        if "physiologie" in t or "embryologie" in t:
            return "Physiologie / embryologie"
        if "ecg" in t or "électrocardiogramme" in t or "electrocardiogramme" in t:
            return "ECG"
        if "sémiologie" in t or "semiologie" in t or "souffle" in t or "douleur thoracique" in t or "auscultation" in t or "vasculaire" in t:
            return "Sémiologie"
        if "imagerie" in t or "exploration" in t:
            return "Imagerie / explorations"
        if "pharmacologie" in t or "médicament" in t or "medicament":
            return "Pharmacologie"
        if "insuffisance cardiaque" in t or "frcv" in t or "facteurs de risque" in t:
            return "Pathologies / facteurs de risque"
        return "Autres"

    # ---------------- DERMatO / REVÊTEMENT CUTANÉ ----------------
    if "revêtement" in s or "revetement" in s or "cutané" in s or "cutane" in s or "dermato" in s:
        if "sémiologie" in t or "semiologie" in t:
            return "Sémiologie"
        if "unguéal" in t or "ungueal" in t or "ongle" in t:
            return "Sémiologie unguéale"
        if "cicatrisation" in t:
            return "Cicatrisation"
        if "lésion" in t or "lesion" in t or "dermatose" in t:
            return "Lésions / pathologies cutanées"
        return "Autres"

    # ---------------- GROG ----------------
    if "grog" in s or "gynéco" in s or "gyneco" in s or "obst" in s:
        if "gynéco" in t or "gyneco" in t or "utérus" in t or "uterus" in t or "ovaire" in t or "sein" in t:
            return "Gynécologie"
        if "obstétrique" in t or "obstetrique" in t or "grossesse" in t or "accouchement" in t or "placenta" in t:
            return "Obstétrique"
        if "reproduction" in t or "fertilité" in t or "fertilite" in t or "gamétogenèse" in t or "gametogenese":
            return "Reproduction"
        if "embryologie" in t or "développement" in t or "developpement":
            return "Embryologie"
        if "sémiologie" in t or "semiologie" in t or "examen" in t:
            return "Sémiologie / examens"
        return "Autres"

    return "Autres"


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Applique les changements")
    args = parser.parse_args()

    subjects = await db.subjects.find({}).sort("name", 1).to_list(100)

    for subject in subjects:
        subject_id = str(subject["_id"])
        subject_name = subject.get("name", "Matière inconnue")

        courses = await db.courses.find({"subject_id": subject_id}).sort("title", 1).to_list(500)

        if not courses:
            continue

        print("\n" + "=" * 90)
        print(subject_name)
        print("=" * 90)

        for course in courses:
            title = course.get("title", "")
            old = course.get("chapter", "")
            new = guess_chapter(subject_name, title)

            print(f"{new:<32} ← {title}    | ancien: {old!r}")

            if args.apply:
                await db.courses.update_one(
                    {"_id": course["_id"]},
                    {
                        "$set": {
                            "chapter": new,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )

    if args.apply:
        print("\n✅ Chapitres appliqués.")
    else:
        print("\nPrévisualisation seulement. Pour appliquer :")
        print("python organize_chapters.py --apply")


asyncio.run(main())
