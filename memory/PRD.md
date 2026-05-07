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
- [x] Live Scores (auto-refresh 12s + bouton Sync WTT manuel + filtre genre)
- [x] Matches list avec filtres status/catégorie/**genre (H/F/Tous)**
- [x] Match Detail (score live, sets, stream YouTube, prédiction IA, résumé IA, H2H)
- [x] Players list + profile + filtres pays/recherche
- [x] Competitions list + detail + filtres catégorie + matches par round + **filtre genre**
- [x] Calendar (vue mensuelle, navigation, comps du mois)
- [x] Search globale
- [x] Favoris (joueurs + compétitions)
- [x] Notifications page
- [x] Chat Assistant flottant (Claude 4.5)
- [x] AI Predictions / Summary / Recommendations endpoints
- [x] Real London 2026 ITTF World Team Champs data (men + women brackets jusqu'à R16)
- [x] **All major competitions seeded** : France Pro A/B/N1 + Champ. France 2026, ITTF Worlds Doha 2027 + JO LA 2028, WTT (Singapore/Saudi/China/USA Smash + Champions Frankfurt/Incheon + Star Doha/Ljubljana + Contender Tunis/Zagreb/Buenos Aires + Feeder Westchester/Otočec), Bundesliga TTBL + TTBF, Chinese Super League H/F, ETTU Champions League H/F + Europe Cup
- [x] **WTT live-score sync** (`POST /api/sync/wtt`) — tente fetch worldtabletennis.com puis fallback simulator déterministe
- [x] **Filtre genre `?gender=men|women`** sur `/api/matches`, `/api/matches/live`, `/api/competitions/{id}/matches`
- [x] Design "Performance Pro" complet (bannières uniques par compétition via Dicebear)
- [x] Tests backend 59/59 ✅ (40 itération 1 + 19 nouveaux)

## Stats (current)
- 92 joueurs · 30 compétitions · 189 matchs · 4 LIVE

## Backlog (P0/P1/P2)
### P0 (next)
- WTT real-time API parser (currently SPA-rendered, simulator fallback active) — investigate official WTT GraphQL or worldtabletennis.com Next.js `_next/data` JSON
- Brancher vraies APIs FFTT (libfftt) pour scores Pro A/B en direct
- Push notifications navigateur/mobile

### P1
- Dashboard personnalisé (drag & drop widgets)
- Historique de suivi (matchs vus)
- Alertes personnalisées par règles (joueur X joue, score > Y)
- Tableau bracket dynamique (tournoi)
- Statistiques avancées (head-to-head sur N derniers matchs)
- Mobile native app (React Native ou PWA installable)
- Bracket Predictor (pronostics user → IA Claude évalue & score)
- Split server.py en routers (auth/players/matches/comps/ai/admin) — approche 700 lignes

### P2
- Copilot développeur (génération code interne, debug assisté)
- Localisation EN/DE/CN
- Mode pari/coupons
- Communauté (commentaires, likes)
- Export calendrier .ics / Google Calendar
- Rate-limiting sur `/api/sync/wtt` + auth admin requise
