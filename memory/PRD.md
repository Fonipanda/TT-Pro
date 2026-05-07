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

## Recent change (May 2026)
- ⚖️ **Plateforme rééquilibrée — multi-compétitions** : retrait de la focalisation London 2026 du Dashboard et des notifications. Hero générique "Tout le tennis de table pro, en un seul endroit" avec catégories FFTT · ITTF · WTT · Bundesliga · CSL · ECL. Section Compétitions groupée par catégorie (3 par catégorie). Notifications portent désormais sur l'ensemble des ligues (Pro A, Bundesliga spitzenspiel, CSL, ECL, Championnats France Élite, ITTF Doha 2027). London 2026 reste dans la base comme **une compétition parmi d'autres** (pas l'événement vedette).

## Implemented (2026-02 → 2026-05)
- [x] Auth JWT (register/login/me) — bcrypt
- [x] Dashboard générique multi-compétitions (FFTT · ITTF · WTT · Bundesliga · CSL · ECL) avec hero, stats, live, upcoming, recos IA, comps groupées par catégorie
- [x] Live Scores (auto-refresh 12s + bouton Sync WTT manuel + filtre genre)
- [x] Matches list avec filtres status/catégorie/**genre (H/F/Tous)**
- [x] Match Detail (score live, sets, stream YouTube, prédiction IA, résumé IA, H2H)
- [x] Players list + profile + filtres pays/recherche
- [x] Competitions list + detail + filtres catégorie + matches par round + **filtre genre + bouton Importer WTT**
- [x] Calendar (vue mensuelle, navigation, comps du mois)
- [x] Search globale
- [x] Favoris (joueurs + compétitions)
- [x] Notifications page
- [x] Chat Assistant flottant (Claude 4.5)
- [x] AI Predictions / Summary / Recommendations endpoints
- [x] Real London 2026 ITTF World Team Champs data (men + women brackets jusqu'à R16)
- [x] All major competitions seeded (FFTT Pro A/B/N1, ITTF Worlds 27 + JO LA 28, WTT calendar, Bundesliga, CSL, ETTU)
- [x] **🚀 REAL WTT API integration (Azure-backed)** : `wtt_api.py` + `wtt_sync.py` + endpoints `/api/sync/wtt`, `/api/sync/wtt/import/{id}`, `/api/wtt/events`. Données réelles importées de 13 events WTT (Singapore Smash 2026, Frankfurt 2025, Doha Champions 2026, Incheon, Ljubljana, Zagreb, Tunis, Buenos Aires, Westchester, Otočec, Saudi, China Smash, US Smash) — 30 matchs officiels par event. Parser supporte: documentCode patterns (FNL/SFNL/QFNL/8FNL/R016-R128 + variantes), 50+ codes IOC pays vers drapeaux emoji, parsing scores `"8,11,7,9,11,8,0"` → sets, gender depuis subEventName, serving détecté pour live.
- [x] Filtre genre `?gender=men|women` partout
- [x] Design "Performance Pro" (bannières uniques par compétition Dicebear)
- [x] Tests backend 65/65 ✅

## Stats (current)
- 92 joueurs · 30 compétitions · 550+ matchs · 4 LIVE
- 13 compétitions WTT branchées sur API réelle (`wtt_event_id`)

## Backlog (P0/P1/P2)
### P0 (next)
- ✅ ~~WTT real-time API parser~~ — **DONE** (Azure liveeventsapi.worldtabletennis.com)
- Brancher API FFTT (libfftt) pour scores Pro A/B en direct (Rust crate / fallback HTML scraping)
- Push notifications navigateur/mobile

### P1
- Mapper plus de compétitions WTT au catalogue routes_all_list (reste ~10 events)
- Bracket Predictor (pronostics user → Claude IA évalue)
- Dashboard personnalisé (drag & drop widgets)
- Alertes personnalisées par règles (joueur X joue, score > Y)
- Tableau bracket dynamique (tournoi)
- Statistiques avancées (head-to-head sur N derniers matchs)
- Mobile native app (React Native ou PWA installable)
- Split server.py en routers (auth/players/matches/comps/ai/admin/sync)

### P2
- Rate-limiting + auth admin sur `/api/sync/wtt` + `/api/sync/wtt/import/{id}`
- Doubles "JPN/KOR" → 2 drapeaux (parser doubles WTT)
- Cache mémoire 5min pour `/api/wtt/events`
- Copilot développeur, Localisation EN/DE/CN, Mode pari, Communauté, Export .ics
