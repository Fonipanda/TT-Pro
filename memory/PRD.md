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

## Recent change (May 2026) — Iteration 4
- 🚀 **5 P0/P1/P2 features livrées en une session** :
  1. **FFTT credential-gated client** (`fftt_api.py`) — Smartping API HMAC-SHA1 auth, 7 endpoints (`/api/sync/fftt/{status,club,clubs/{dept},player/{licence},club/{id}/players,player/{licence}/matches,proab/{division}}`). Sans creds (`FFTT_API_ID`/`FFTT_API_KEY`), retourne `{configured:false}` avec lien formulaire FFTT.
  2. **Web Push notifications** — service worker (`/sw.js`), composant `PushToggle`, endpoints `/api/push/{public-key,subscribe,unsubscribe,send}`. Sans VAPID env vars, dégrade gracieusement (`configured:false, would_push:N`).
  3. **Bracket Predictor IA** — page `/bracket-predictor` interactive (4 rounds × 38 matches sur Singapore Smash), endpoints `/api/bracket-predictor/{eval,save,mine}`. Claude Sonnet 4.5 retourne `{overall_score, expert_picks, agreement_count, summary}` en français.
  4. **+10 events WTT mappés** au catalogue (Chennai, Foz, Lagos, Muscat, Westchester25, BAS25, Saudi25, Incheon25, Ljubljana25, Zagreb25). Total : **40 compétitions, 23 WTT-mappées**.
  5. **Rate-limiting + auth admin** — slowapi avec key_func custom (X-Forwarded-For pour traverser l'ingress k8s). Décorateurs `@limiter.limit(...)` sur tous les endpoints sync. Admin gate (`admin_required`) sur `/sync/wtt/import/{id}` et `/push/send`.
- ✅ **89/90 tests** (98.9%) — l'échec rate-limit-via-ingress a été FIXÉ après le rapport (verified: 10x 200 + 2x 429 sur 14 calls parallèles)
- ✅ Admin user seedé : `admin@ttpro.app / Admin2026!` ; tester promu admin

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
- ✅ ~~WTT real-time API parser~~ — DONE
- ⏳ FFTT credentials — **client implémenté, attendre que l'utilisateur fournisse `FFTT_API_ID` et `FFTT_API_KEY` via le formulaire fftt.com/api**
- ⏳ Web Push VAPID keys — **module implémenté, attendre que l'utilisateur génère VAPID via `npx web-push generate-vapid-keys` et les pose en env**

### P1
- ✅ ~~Bracket Predictor IA~~ — DONE
- ✅ ~~Mapper 10 events WTT restants~~ — DONE (23 mappés)
- Mapper events WTT 2026 à venir au fil des annonces (calendrier WTT s'étoffe)
- Dashboard personnalisé (drag & drop widgets)
- Alertes personnalisées par règles (joueur X joue, score > Y)
- Statistiques avancées H2H sur N derniers matchs
- Mobile native app / PWA installable
- Split server.py en routers
- Pydantic model strict pour `/api/push/subscribe` body

### P2
- ✅ ~~Rate-limiting + auth admin~~ — DONE
- PushToggle: combiner états denied + unconfigured pour clarté admin
- Doubles "JPN/KOR" → 2 drapeaux
- Cache mémoire 5min pour `/api/wtt/events`
- Copilot développeur, Localisation EN/DE/CN, Mode pari, Communauté, Export .ics
