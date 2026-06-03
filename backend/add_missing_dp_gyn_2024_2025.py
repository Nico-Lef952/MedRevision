# -*- coding: utf-8 -*-

import asyncio
import json
import os
import re
from pathlib import Path
from datetime import datetime, timezone
from google import genai
from server import db


DP_TEXT = r"""
DOSSIERS PROGRESSIFS

Mme A, 26 ans, vient vous voir pour un premier suivi de gynécologie. Elle n’a pas d’antécédents en dehors de migraines avec aura sans traitement. Elle est nulligeste et nullipare et a eu ses premières règles à 10 ans.
Elle ne fume pas et pratique 8h de gymnastique par semaine.
Elle vous consulte car désire une contraception.

1- Quels examens réalisez-vous au cours de votre consultation
A. Prise tension artérielle
B. Examen sénologique
C. Calcul de son IMC
D. Test HPV
E. Prescription d’un bilan thrombophilie

La patiente est inquiète car sa mère a eu un cancer du sein à 40 ans.
2- Citez quels facteurs de risques de cancer que présente cette patiente
A. Âge
B. Absence de tabagisme
C. Age d’apparition de ses ménarches
D. Activité physique intense
E. Antécédent de cancer du sein au premier degré

Vous décidez de réaliser un examen clinique des seins chez la patiente.
3- Quelles sont les affirmations exactes concernant cet examen?
A. Une asymétrie mammaire est rarement constaté
B. Une palpation normale permet d’éliminer un cancer du sein
C. L’examen clinique mammaire est associé à l’examen des creux axillaires et sus-claviculaires
D. Une rétraction cutanée doit faire évoquer un processus tumoral sous-jacent
E. Un écoulement mammaire doit être recherché

Vous palpez une tuméfaction dans le quadrant supéro-externe du sein droit qui est mobile par rapport au plan profond et sans adénopathie satellite. Le sein controlatéral est normal.
4- Vous réinterrogez la patiente, quels signes retrouvés chez elle seraient inquiétants?
A. Prise de poids récente
B. Présence de signes inflammatoires
C. Ecoulement lactescent
D. Altération de l’état général
E. Mastodynies prémenstruelles

5- Quels examens prescrivez-vous devant la découverte de cette masse?
A. Dosage CA 15.3
B. Echographie mammaire
C. Echographie axillaire
D. Biopsie mammaire
E. Mammographie avec 2 incidences

6- Au final, l’examen révèle qu’il s’agit d’une lésion bénigne, de type adénofibrome. Vous lui proposez donc une surveillance simple.
Elle est redirigée vers vous, 15 ans plus tard, avec une imagerie demandée par son médecin traitant. La mammographie révèle une opacité stellaire au niveau du cadran supéro-externe du sein gauche, classée ACR5. Elle dit aussi avoir palpé une nouvelle masse depuis, de 3cm environ. (QRU) :
A. L’imagerie est rassurante, il n’y a pas d’autre examen nécessaire
B. Vous faites une microbiopsie
C. Le diagnostic de cancer est posé par le marqueur tumoral CA 15.3
D. On peut d’emblée réaliser une tumorectomie droite
E. On propose une IRM mammaire complémentaire
"""


def load_env():
    p = Path(".env")
    if not p.exists():
        return

    for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def extract_json(text):
    text = (text or "").strip()

    if text.startswith("```"):
        text = re.sub(r"^```json", "", text, flags=re.I).strip()
        text = re.sub(r"^```", "", text).strip()
        text = re.sub(r"```$", "", text).strip()

    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1:
        raise ValueError("JSON introuvable")

    return json.loads(text[start:end + 1])


def normalize_options(options):
    clean = []

    for opt in options or []:
        if not isinstance(opt, dict):
            continue

        txt = opt.get("text") or opt.get("label") or ""
        if not txt:
            continue

        clean.append({
            "text": txt,
            "is_correct": bool(opt.get("is_correct", False))
        })

    return clean


async def main():
    load_env()

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("Clé Gemini introuvable dans .env")

    client = genai.Client(api_key=api_key)

    user = await db.users.find_one({"email": "admin@medrevision.com"})
    user_id = str(user["_id"])

    annale = await db.questions.find_one({
        "user_id": user_id,
        "is_annale": True,
        "annale_title": "Annales gynécologie 2024-2025"
    })

    if not annale:
        raise RuntimeError("Annale gynécologie 2024-2025 introuvable. Importe-la d'abord.")

    annale_id = annale["annale_id"]
    subject_id = annale["subject_id"]

    # Supprime l'ancien DP si tu relances le script
    await db.questions.delete_many({
        "user_id": user_id,
        "is_annale": True,
        "annale_id": annale_id,
        "source_key": "dp_contraception_sein_2024_2025"
    })

    prompt = f"""
Tu dois convertir ce dossier progressif d'annale de gynécologie en une seule question MedRevision de type DP.

Consignes :
- Retourne UNE question de type "dp".
- Elle doit contenir exactement 6 sous-questions.
- Chaque sous-question doit garder ses options A à E.
- Corrige avec les bonnes réponses.
- Donne une explication courte et pédagogique pour chaque sous-question.
- Ne crée pas de question hors sujet.
- Ne transforme pas en QROC.
- Réponds uniquement en JSON valide.

Dossier progressif :
{DP_TEXT}

Format attendu :
{{
  "question": {{
    "type": "dp",
    "question": "Dossier progressif — contraception et pathologie mammaire",
    "vignette": "vignette initiale complète",
    "options": [],
    "answer": "",
    "explanation": "Correction globale courte",
    "difficulty": 2,
    "rang": "A",
    "concepts": ["contraception", "cancer du sein", "examen sénologique"],
    "sub_questions": [
      {{
        "type": "qrm",
        "question": "énoncé de la sous-question 1",
        "options": [
          {{"text": "option A", "is_correct": true}},
          {{"text": "option B", "is_correct": false}}
        ],
        "answer": "réponse courte",
        "explanation": "correction"
      }}
    ]
  }}
}}
"""

    print("Correction/conversion Gemini du DP...")
    res = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    data = extract_json(res.text or "")

    q = data.get("question", {})

    sub_questions = []
    for sq in q.get("sub_questions", []):
        opts = normalize_options(sq.get("options", []))
        if len(opts) < 2 or not any(o["is_correct"] for o in opts):
            continue

        sub_questions.append({
            "type": sq.get("type", "qrm"),
            "question": sq.get("question", "").strip(),
            "options": opts,
            "answer": sq.get("answer", "").strip(),
            "explanation": sq.get("explanation", "").strip()
        })

    if len(sub_questions) != 6:
        raise RuntimeError(f"Gemini n'a pas généré 6 sous-questions valides. Obtenu : {len(sub_questions)}")

    doc = {
        "user_id": user_id,
        "subject_id": subject_id,
        "course_id": None,
        "is_annale": True,
        "annale_id": annale_id,
        "annale_year": "2024-2025",
        "annale_title": "Annales gynécologie 2024-2025",
        "source_key": "dp_contraception_sein_2024_2025",
        "type": "dp",
        "question": q.get("question") or "Dossier progressif — contraception et pathologie mammaire",
        "vignette": q.get("vignette") or DP_TEXT.split("1-")[0].strip(),
        "options": [],
        "answer": q.get("answer", ""),
        "explanation": q.get("explanation", ""),
        "difficulty": q.get("difficulty", 2),
        "rang": q.get("rang", "A"),
        "concepts": q.get("concepts", ["contraception", "cancer du sein", "examen sénologique"]),
        "sub_questions": sub_questions,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.questions.insert_one(doc)

    print("DP ajouté à l'annale :", doc["annale_title"])
    print("Sous-questions :", len(sub_questions))
    print("annale_id :", annale_id)


asyncio.run(main())
