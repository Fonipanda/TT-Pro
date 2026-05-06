# TT Pro – Product Requirements Doc

## Original Problem Statement
Plateforme web + mobile dédiée au tennis de table professionnel : suivi temps réel des compétitions (FFTT, ITTF, WTT, Bundesliga, Chinese Super League, Champions League européenne), joueurs, calendriers, scores live, retransmissions vidéo, IA (chatbot, prédictions, résumés, recommandations).

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`), MongoDB via Motor, JWT auth, Claude Sonnet 4.5 via emergentintegrations
- **Frontend**: React 19 + Tailwind, "Performance Pro" dark theme (Bebas Neue + Manrope, blaze #FF3B30)
- **Data source**: mock data réaliste (22 joueurs ITTF/WTT, 10 compétitions, 70 matchs)

## User Personas
1. **Fan** — suit ses joueurs/tournois favoris, lit les scores live et les résumés IA
2. **Joueur club** — consulte classements, calendriers Pro A/B, Bundesliga
3. **Parieur / analyste** — utilise prédictions et stats H2H

## Core Requirements (static)
- Live scores temps réel (polling 12-15s)
- Fiches joueurs détaillées avec H2H et historique
- Compétitions filtrables (catégorie / niveau / pays)
- Calendrier mensuel interactif
- Recherche globale joueurs + compétitions
- Favoris (auth requise)
- Notifications globales + spécifiques user
- IA: chatbot Claude 4.5, prédictions probabilistes, résumés auto, recommandations

## Implemented (2026-02)
- [x] Auth JWT (register/login/me) — bcrypt
- [x] Dashboard avec hero, stats, live, upcoming, recos IA, comps
- [x] Live Scores (auto-refresh 15s)
- [x] Matches list avec filtres status/catégorie
- [x] Match Detail (score live, sets, stream YouTube, prédiction IA, résumé IA, H2H)
- [x] Players list + profile + filtres pays/recherche
- [x] Competitions list + detail + filtres catégorie + matches par round
- [x] Calendar (vue mensuelle, navigation, comps du mois)
- [x] Search globale
- [x] Favoris (joueurs + compétitions)
- [x] Notifications page
- [x] Chat Assistant flottant (Claude 4.5)
- [x] AI Predictions / Summary / Recommendations endpoints
- [x] Mock data seeder auto au boot
- [x] Design "Performance Pro" complet
- [x] Tests backend 40/40 ✅

## Backlog (P0/P1/P2)
### P0 (next)
- Brancher vraies APIs FFTT (libfftt), STATSCORE, LSports — keys API requises
- Scraping fallback Livesport / AiScore
- Push notifications navigateur/mobile

### P1
- Dashboard personnalisé (drag & drop widgets)
- Historique de suivi (matchs vus)
- Alertes personnalisées par règles (joueur X joue, score > Y)
- Tableau bracket dynamique (tournoi)
- Statistiques avancées (head-to-head sur N derniers matchs)
- Mobile native app (React Native ou PWA installable)

### P2
- Copilot développeur (génération code interne, debug assisté)
- Localisation EN/DE/CN
- Mode pari/coupons
- Communauté (commentaires, likes)
- Export calendrier .ics / Google Calendar
