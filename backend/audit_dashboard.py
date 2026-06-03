# -*- coding: utf-8 -*-

import json
from pathlib import Path
from collections import Counter

AUDIT_FILE = "audit_questions_results.json"
OUT_FILE = "audit_dashboard.md"


def action_for(r):
    bad = r.get("bad_questions", [])
    missing = r.get("missing_notions", [])
    duplicates = r.get("duplicates", [])

    problem_types = Counter(q.get("problem_type", "unknown") for q in bad)

    false_count = problem_types.get("false", 0)
    ambiguous_count = problem_types.get("ambiguous", 0)
    duplicate_count = problem_types.get("duplicate", 0) + len(duplicates)

    missing_high = sum(1 for m in missing if m.get("importance") == "high")
    missing_medium = sum(1 for m in missing if m.get("importance") == "medium")

    coverage = r.get("coverage_score", 0) or 0
    relevance = r.get("relevance_score", 0) or 0
    factual = r.get("factual_score", 0) or 0
    wording = r.get("wording_score", 0) or 0

    actions = []

    if false_count > 0 or factual < 70:
        actions.append("PRIORITE: verifier exactitude / questions fausses")

    if relevance < 70:
        actions.append("verifier pertinence / hors sujet")

    if coverage < 70 or missing_high > 0:
        actions.append("generer sur notions manquantes importantes")

    if duplicate_count >= 3:
        actions.append("supprimer doublons")

    if ambiguous_count > 0 or wording < 70:
        actions.append("reformuler questions ambigues")

    if not actions:
        actions.append("globalement OK")

    return " ; ".join(actions)


def severity(r):
    bad = r.get("bad_questions", [])
    problem_types = Counter(q.get("problem_type", "unknown") for q in bad)

    if problem_types.get("false", 0) > 0 or (r.get("factual_score", 100) or 100) < 70:
        return 0

    if (r.get("coverage_score", 100) or 100) < 70:
        return 1

    if any(m.get("importance") == "high" for m in r.get("missing_notions", [])):
        return 1

    if len(r.get("duplicates", [])) >= 3:
        return 2

    return 3


def main():
    data = json.loads(Path(AUDIT_FILE).read_text(encoding="utf-8"))

    lines = []
    lines.append("# Tableau de bord audit questions")
    lines.append("")
    lines.append("Lecture rapide :")
    lines.append("- PRIORITE = a traiter en premier")
    lines.append("- Exactitude basse = verifier les questions fausses")
    lines.append("- Couverture basse = notions du cours mal couvertes")
    lines.append("- Doublons eleves = nettoyer avant de regenerer")
    lines.append("")
    lines.append("| Cours | Q | Couverture | Pertinence | Formulation | Exactitude | Fausses | Ambigues | Doublons | Notions manquantes | Action |")
    lines.append("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|")

    for r in sorted(data, key=severity):
        bad = r.get("bad_questions", [])
        problem_types = Counter(q.get("problem_type", "unknown") for q in bad)

        false_count = problem_types.get("false", 0)
        ambiguous_count = problem_types.get("ambiguous", 0)
        duplicate_count = problem_types.get("duplicate", 0) + len(r.get("duplicates", []))

        missing_count = len([
            m for m in r.get("missing_notions", [])
            if m.get("importance") in ["high", "medium"]
        ])

        title = f"{r.get('subject_name')} - {r.get('course_title')}"
        title = title.replace("|", "-")

        lines.append(
            f"| {title} "
            f"| {r.get('question_count', 0)} "
            f"| {r.get('coverage_score', '?')} "
            f"| {r.get('relevance_score', '?')} "
            f"| {r.get('wording_score', '?')} "
            f"| {r.get('factual_score', '?')} "
            f"| {false_count} "
            f"| {ambiguous_count} "
            f"| {duplicate_count} "
            f"| {missing_count} "
            f"| {action_for(r)} |"
        )

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("# Details prioritaires")
    lines.append("")

    for r in sorted(data, key=severity):
        if severity(r) > 2:
            continue

        lines.append(f"## {r.get('subject_name')} - {r.get('course_title')}")
        lines.append("")
        lines.append(f"- Questions : {r.get('question_count')} / cible audit {r.get('target_questions')}")
        lines.append(f"- Couverture : {r.get('coverage_score')}/100")
        lines.append(f"- Pertinence : {r.get('relevance_score')}/100")
        lines.append(f"- Exactitude : {r.get('factual_score')}/100")
        lines.append(f"- Action : {action_for(r)}")
        lines.append("")

        false_or_ambiguous = [
            q for q in r.get("bad_questions", [])
            if q.get("problem_type") in ["false", "ambiguous"]
        ]

        if false_or_ambiguous:
            lines.append("### Questions fausses / ambigues")
            for q in false_or_ambiguous:
                lines.append(f"- `{q.get('question_id')}` - {q.get('problem_type')} - {q.get('problem')}")
            lines.append("")

        missing = [
            m for m in r.get("missing_notions", [])
            if m.get("importance") in ["high", "medium"]
        ]

        if missing:
            lines.append("### Notions manquantes importantes")
            for m in missing:
                lines.append(f"- {m.get('importance')} - {m.get('notion')}")
                lines.append(f"  - Question suggeree : {m.get('suggested_question')}")
            lines.append("")

        if r.get("duplicates"):
            lines.append("### Doublons")
            for d in r.get("duplicates", [])[:5]:
                lines.append(f"- {', '.join(d.get('question_ids', []))}")
                lines.append(f"  - {d.get('explanation')}")
            lines.append("")

    Path(OUT_FILE).write_text("\n".join(lines), encoding="utf-8")
    print("OK : tableau de bord cree ->", OUT_FILE)


if __name__ == "__main__":
    main()
