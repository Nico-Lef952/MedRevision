# MedRevision - PRD (Product Requirements Document)

## Date: 2026-05-10 (last update)

## Problème original
Créer une plateforme de révision intelligente pour étudiants en médecine (DFASM1/2/3) inspirée et concurrentielle face à EDN.fr / EDN.chat / Hippocampus.

## Architecture technique

### Stack
- **Frontend**: React 19 + Tailwind CSS + Lucide React + React Router
- **Backend**: FastAPI (Python) + Motor (MongoDB async)
- **Database**: MongoDB
- **IA**: OpenAI GPT-5.2 via Emergent LLM Key (emergentintegrations)
- **Document parsing**: PyPDF2 (PDF), python-docx (DOCX text), mammoth (DOCX→HTML formaté)

### Routes Frontend
- `/` Dashboard
- `/auth` Auth
- `/subjects`, `/subjects/:id` Matières
- `/courses`, `/courses/:id` Cours (avec viewer DOCX/PDF)
- `/quiz` Quiz (7 modes EDN)
- `/ancrage` Ancrage / mémorisation long terme
- `/exam` Examen blanc chronométré
- `/flashcards` Flashcards SM-2
- `/stats` Statistiques
- `/knowledge-graph` Carte des savoirs

## Core Requirements (Implémentés ✅)

### Authentification
- [x] Inscription/Connexion email + mot de passe
- [x] JWT Bearer token (+ cookies fallback)
- [x] Protection brute force
- [x] Admin seeding automatique

### Gestion matières & cours
- [x] CRUD matières (couleurs/icônes)
- [x] CRUD cours, tags, chapitre
- [x] Upload PDF / DOCX / Markdown / TXT
- [x] **Affichage du DOCX avec mise en page complète** (mammoth → HTML stylé)
- [x] Affichage natif PDF (iframe)
- [x] Recherche full-text

### Analyse IA des cours
- [x] Extraction notions clés, définitions, mécanismes, signes cliniques, traitements
- [x] Résumé automatique
- [x] Liens transversaux entre cours

### Génération de questions (alignée EDN)
- [x] **QI** — Question Isolée (1 bonne réponse / 5)
- [x] **QRM** — Question à Réponses Multiples (2-4 correctes / 5)
- [x] **QROC** — Question à Réponse Ouverte Courte
- [x] **DP** — Dossier Progressif (vignette clinique + sous-questions)
- [x] Champ `rang` (A = base / B = avancé)
- [x] Compatibilité legacy (qcm, vrai_faux, flashcard, cas_clinique)

### Quiz
- [x] 7 modes : par matière, par cours, transversal, mes erreurs, à ancrer, mes favoris, nouvelles
- [x] Correction immédiate avec explication
- [x] **Lien "Voir le cours"** dans l'explication
- [x] Bouton **Bookmark / Favoris**
- [x] Bouton **Reporter** (snooze 1j / 7j / 30j)
- [x] Vignette clinique affichée pour DP
- [x] Support QROC (textarea + match approximatif)

### Examen blanc (NEW)
- [x] Mode chronométré conditions ECN/EDN
- [x] Configurateur (matière, count 10-60, durée 15-180min, types)
- [x] Pas de feedback pendant l'examen
- [x] Grille de navigation entre questions
- [x] Auto-submit si timer expire
- [x] Modal de confirmation avant soumission
- [x] Page résultats avec correction détaillée par question
- [x] Historique d'examens

### Système d'Ancrage (NEW - hybride SM-2 + EDN)
- [x] **3 bonnes réponses consécutives = "ancrée"** (style EDN)
- [x] Algorithme **SM-2** classique pour intervalles de révision
- [x] Statuts : new / acquired / anchored / to_review / snoozed / bookmarked
- [x] Compteurs par statut sur dashboard
- [x] Page Ancrage dédiée avec vue d'ensemble + sessions rapides
- [x] Snooze : 1j / 7j / 30j

### Flashcards (existant)
- [x] Répétition espacée SM-2
- [x] Score quality 0-5

### Statistiques
- [x] Taux de réussite global
- [x] Progression par matière
- [x] Notions à travailler
- [x] Heatmap d'activité (30 derniers jours)

### UX / Polissage
- [x] Logo MedRevision cliquable → Dashboard
- [x] Sidebar scrollable (9 entrées)
- [x] Bannière "Ancrage du jour" sur le dashboard
- [x] CTA Examen blanc
- [x] Card "Ancrées" dans les stats globales
- [x] Empty states sur toutes les pages

## Backlog / Futures améliorations

### P1 (High Priority)
- [ ] Mode hors-ligne (PWA)
- [ ] Export fiches de révision en PDF
- [ ] Notifications de rappel de révision
- [ ] Onboarding interactif pour nouveaux utilisateurs

### P2 (Medium Priority)
- [ ] Refactoring `server.py` (2037 lignes) en modules `/app/backend/routes/{auth, courses, questions, quiz, exam}.py`
- [ ] CORS_ORIGINS depuis env (au lieu de hardcoded)
- [ ] Thème sombre
- [ ] Application mobile native (React Native)
- [ ] Partage de cours entre étudiants
- [ ] Annotations directes sur PDF/DOCX (surlignage)

### P3 (Nice to have)
- [ ] Gamification (badges, streaks, classement)
- [ ] Recommandations IA personnalisées
- [ ] Génération de DP complets sur cas clinique
- [ ] Timer de session (Pomodoro)

## Tests
- Backend: 21/21 pytest passés (100%) — `/app/backend/tests/test_medrevision.py`
- Frontend: 100% des flows e2e testés (login, dashboard, ancrage, exam complet, quiz, courses)

## Changelog récent
- **2026-05-10** :
  - Système d'**Ancrage** hybride (SM-2 + EDN 3-correct rule)
  - **Mode Examen blanc** chronométré ECN/EDN
  - Génération IA alignée **EDN** (QI/QRM/QROC/DP)
  - **Snooze** + **Bookmark** sur questions
  - Quiz : 3 nouveaux modes (à ancrer / favoris / nouvelles)
  - Lien "Voir le cours" dans l'explication
  - **DOCX rendu fidèle** via mammoth
  - **Logo cliquable** → Dashboard
  - Dashboard : nouvelle stat "Ancrées", bannière du jour, CTA Examen
- **2026-04-06** : MVP complet (auth, CRUD, IA, Quiz basique, Flashcards, Stats, Carte savoirs)

## Credentials
Voir `/app/memory/test_credentials.md` (admin@medrevision.com / admin123)
