# MedRevision - PRD (Product Requirements Document)

## Date: 2026-04-06

## Problème original
Créer une plateforme de révision intelligente pour étudiants en médecine (1ère, 2ème, 3ème année) inspirée d'EDNi.

## Architecture technique

### Stack
- **Frontend**: React 19 + Tailwind CSS + Framer Motion
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **IA**: OpenAI GPT-5.2 via Emergent LLM Key

### Structure des fichiers
```
/app/
├── backend/
│   ├── server.py          # API FastAPI complète
│   └── .env               # Configuration
├── frontend/
│   ├── src/
│   │   ├── App.js         # Routing principal
│   │   ├── contexts/      # AuthContext
│   │   ├── lib/           # API helpers
│   │   ├── pages/         # Toutes les pages
│   │   └── components/    # Layout, UI
│   └── .env
└── memory/
    ├── PRD.md
    └── test_credentials.md
```

## User Personas
1. **Étudiant DFASM1** : Besoin de réviser les bases, QCM simples
2. **Étudiant DFASM2** : Révisions transversales, cas cliniques
3. **Étudiant DFASM3** : Préparation ECN, dossiers progressifs

## Core Requirements (Implémentés ✅)

### Authentification
- [x] Inscription/Connexion email + mot de passe
- [x] JWT avec cookies httpOnly
- [x] Protection contre brute force
- [x] Admin seeding automatique

### Gestion des matières
- [x] CRUD matières avec couleurs/icônes personnalisables
- [x] Compteurs de cours et questions par matière
- [x] Archivage (soft delete)

### Gestion des cours
- [x] Création de cours avec titre, contenu, tags, chapitre
- [x] Import de fichiers (PDF, Markdown, TXT)
- [x] Recherche full-text dans les cours
- [x] Filtrage par matière

### Analyse IA des cours
- [x] Extraction automatique des notions clés
- [x] Identification des définitions et mécanismes
- [x] Détection des signes cliniques et traitements
- [x] Génération de résumé
- [x] Détection des confusions possibles
- [x] Liens transversaux entre cours

### Génération de questions
- [x] QCM à choix multiples
- [x] Vrai/Faux
- [x] Flashcards
- [x] Cas cliniques
- [x] QROC (Questions à réponse ouverte courte)
- [x] Explications détaillées des réponses

### Modes de révision
- [x] Quiz par matière
- [x] Quiz par cours
- [x] Quiz transversal
- [x] Mode "Mes erreurs"
- [x] Flashcards avec répétition espacée (SM-2)

### Statistiques
- [x] Taux de réussite global
- [x] Progression par matière (graphique radar)
- [x] Activité récente (graphique ligne)
- [x] Notions à travailler

### Carte des savoirs
- [x] Visualisation des liens entre cours
- [x] Graph interactif avec zoom

## Ce qui est implémenté (100%)
- Authentification complète avec JWT
- CRUD matières et cours
- Import de fichiers PDF/MD/TXT
- Analyse IA avec GPT-5.2
- Génération automatique de questions
- Quiz avec correction détaillée
- Flashcards avec répétition espacée
- Statistiques avec graphiques
- Carte des savoirs
- Interface responsive

## Backlog / Futures améliorations

### P0 (Critical)
- ✅ Tous les P0 sont implémentés

### P1 (High Priority)
- [ ] Mode hors-ligne (PWA)
- [ ] Export de fiches de révision en PDF
- [ ] Notifications de rappel de révision
- [ ] Partage de cours entre étudiants

### P2 (Medium Priority)
- [ ] Thème sombre
- [ ] Application mobile native (React Native)
- [ ] Intégration avec Google Drive
- [ ] Tableaux de bord collaboratifs

### P3 (Nice to have)
- [ ] Gamification (badges, streaks)
- [ ] Classement entre étudiants
- [ ] Recommandations IA personnalisées
- [ ] Génération de dossiers progressifs complets

## Tests
- Backend: 28/28 tests passés (100%)
- Frontend: Validation visuelle complète

## Credentials
Voir `/app/memory/test_credentials.md`
