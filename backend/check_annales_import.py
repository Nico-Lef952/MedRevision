# -*- coding: utf-8 -*-

import asyncio
from server import db

async def main():
    rows = await db.questions.aggregate([
        {"$match": {"is_annale": True}},
        {"$group": {
            "_id": "$annale_id",
            "title": {"$first": "$annale_title"},
            "year": {"$first": "$annale_year"},
            "top_level": {"$sum": 1},
            "dp_count": {"$sum": {"$cond": [{"$eq": ["$type", "dp"]}, 1, 0]}},
            "missing_explanations": {"$sum": {"$cond": [
                {"$or": [
                    {"$eq": [{"$ifNull": ["$explanation", ""]}, ""]},
                    {"$not": ["$explanation"]}
                ]},
                1,
                0
            ]}}
        }},
        {"$sort": {"year": -1, "title": 1}}
    ]).to_list(100)

    print("\\nBILAN ANNALES\\n")

    for r in rows:
        questions = await db.questions.find({
            "is_annale": True,
            "annale_id": r["_id"]
        }).to_list(500)

        sub_total = sum(len(q.get("sub_questions", []) or []) for q in questions)

        print(f"{r['year']} | {r['top_level']:3} questions top-level | {sub_total:3} sous-questions DP | {r['dp_count']} DP | corrections manquantes top-level: {r['missing_explanations']} | {r['title']}")

        for q in questions[:5]:
            print(f"  - [{q.get('type')}] {q.get('question', '')[:100]}")

        print()

asyncio.run(main())
