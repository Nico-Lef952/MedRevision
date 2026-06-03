# -*- coding: utf-8 -*-

import asyncio
import json
from pathlib import Path
from bson import ObjectId
from server import db

AUDIT_FILE = "audit_questions_results.json"

async def main():
    audits = json.loads(Path(AUDIT_FILE).read_text(encoding="utf-8"))

    ids_to_delete = set()

    for audit in audits:
        for dup in audit.get("duplicates", []):
            ids = dup.get("question_ids", [])
            if len(ids) <= 1:
                continue

            # On garde le premier, on supprime les suivants
            for qid in ids[1:]:
                ids_to_delete.add(qid)

    print("Doublons à supprimer :", len(ids_to_delete))

    for qid in list(ids_to_delete)[:50]:
        q = await db.questions.find_one({"_id": ObjectId(qid)})
        if q:
            print("-", qid, "|", q.get("type"), "|", q.get("question", "")[:100])

    confirm = input("\nTaper OUI pour supprimer : ")
    if confirm != "OUI":
        print("Annulé.")
        return

    res = await db.questions.delete_many({
        "_id": {"$in": [ObjectId(qid) for qid in ids_to_delete]}
    })

    print("Supprimées :", res.deleted_count)

asyncio.run(main())
