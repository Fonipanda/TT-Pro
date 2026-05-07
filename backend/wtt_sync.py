"""WTT live-score sync — REAL implementation.

Uses the discovered WTT Azure-backed APIs (see wtt_api.py) to fetch live and
official results, and upserts them into our DB. For competitions WITHOUT a
linked `wtt_event_id`, falls back to a deterministic simulator so the demo
keeps moving.

Public surface:
  - sync_live_scores(db, competition_id=None) — main sync entry point used by
    POST /api/sync/wtt
  - import_wtt_event(db, competition_id) — bulk import all official + live
    matches for a given competition (eventId required on the comp)
"""
from __future__ import annotations

import logging
import random
from datetime import datetime, timezone
from typing import Optional

from wtt_api import (
    get_live_result, get_official_result, parse_match_card,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Real WTT sync (per competition with wtt_event_id)
# =============================================================================
async def _sync_real_event(db, comp: dict, *, full: bool = False) -> dict:
    """Pull WTT data for a comp's eventId; upsert matches.

    If `full=True`, also fetches official (finished) results. Otherwise only
    LIVE results are pulled (cheap, used for the periodic /api/sync/wtt poll).
    """
    event_id = comp.get("wtt_event_id")
    if not event_id:
        return {"updated": 0, "inserted": 0, "skipped": "no_wtt_event_id"}

    cid = comp["id"]
    cname = comp["name"]
    ccat = comp.get("category", "WTT")

    inserted = 0
    updated = 0

    # --- LIVE matches (currently playing) ---
    live_raw = await get_live_result(int(event_id))
    for raw in live_raw:
        m = parse_match_card(raw, cid, cname, ccat, status="live")
        if not m:
            continue
        result = await db.matches.update_one(
            {"id": m["id"]},
            {"$set": m},
            upsert=True,
        )
        if result.upserted_id is not None:
            inserted += 1
        else:
            updated += 1

    official_count = 0
    if full:
        # --- OFFICIAL (finished) matches ---
        off_raw = await get_official_result(int(event_id), take=30, include_match_card=True)
        official_count = len(off_raw)
        for raw in off_raw:
            m = parse_match_card(raw, cid, cname, ccat, status="finished")
            if not m:
                continue
            existing = await db.matches.find_one({"id": m["id"]}, {"_id": 0, "status": 1})
            if existing and existing.get("status") == "live":
                continue
            result = await db.matches.update_one(
                {"id": m["id"]},
                {"$set": m},
                upsert=True,
            )
            if result.upserted_id is not None:
                inserted += 1
            else:
                updated += 1

    return {"event_id": event_id, "live_count": len(live_raw),
            "official_count": official_count,
            "inserted": inserted, "updated": updated}


async def import_wtt_event(db, competition_id: str) -> dict:
    """One-shot bulk import for a competition with a wtt_event_id (full=True)."""
    comp = await db.competitions.find_one({"id": competition_id}, {"_id": 0})
    if not comp:
        return {"error": "competition_not_found", "competition_id": competition_id}
    if not comp.get("wtt_event_id"):
        return {"error": "no_wtt_event_id_on_competition",
                "competition_id": competition_id,
                "hint": "Set wtt_event_id on the competition document first."}
    return await _sync_real_event(db, comp, full=True)


# =============================================================================
# Simulator fallback (when no real WTT data available)
# =============================================================================
def _next_tick(p1: int, p2: int, serving: Optional[int]) -> tuple[int, int, Optional[int]]:
    if serving == 1:
        if random.random() < 0.55:
            p1 += 1
        else:
            p2 += 1
    elif serving == 2:
        if random.random() < 0.55:
            p2 += 1
        else:
            p1 += 1
    else:
        if random.random() < 0.5:
            p1 += 1
        else:
            p2 += 1
    total = p1 + p2
    if total >= 2 and total % 2 == 0:
        serving = 2 if serving == 1 else 1
    return p1, p2, serving


def _maybe_close_set(p1: int, p2: int) -> bool:
    if p1 >= 11 and p1 - p2 >= 2:
        return True
    if p2 >= 11 and p2 - p1 >= 2:
        return True
    return False


async def _simulate_tick(db, competition_id: Optional[str]) -> dict:
    q = {"status": "live", "match_type": "individual"}
    if competition_id:
        q["competition_id"] = competition_id

    updated = 0
    cursor = db.matches.find(q, {"_id": 0})
    async for m in cursor:
        # Skip real WTT-synced matches — they get fresh data from API
        if m.get("wtt_match_id"):
            continue
        sets = list(m.get("sets") or [])
        score_p1 = m.get("score_p1", 0)
        score_p2 = m.get("score_p2", 0)
        cur_p1 = m.get("current_set_p1", 0)
        cur_p2 = m.get("current_set_p2", 0)
        serving = m.get("serving") or random.choice([1, 2])

        ticks = random.randint(1, 2)
        finished = False
        for _ in range(ticks):
            cur_p1, cur_p2, serving = _next_tick(cur_p1, cur_p2, serving)
            if _maybe_close_set(cur_p1, cur_p2):
                sets.append([cur_p1, cur_p2])
                if cur_p1 > cur_p2:
                    score_p1 += 1
                else:
                    score_p2 += 1
                cur_p1 = cur_p2 = 0
                serving = random.choice([1, 2])
                if score_p1 == 4 or score_p2 == 4:
                    await db.matches.update_one(
                        {"id": m["id"]},
                        {"$set": {
                            "status": "finished",
                            "score_p1": score_p1, "score_p2": score_p2,
                            "current_set_p1": 0, "current_set_p2": 0,
                            "serving": None, "sets": sets,
                            "synced_at": datetime.now(timezone.utc).isoformat(),
                        }},
                    )
                    updated += 1
                    finished = True
                    break
        if not finished:
            await db.matches.update_one(
                {"id": m["id"]},
                {"$set": {
                    "score_p1": score_p1, "score_p2": score_p2,
                    "current_set_p1": cur_p1, "current_set_p2": cur_p2,
                    "serving": serving, "sets": sets,
                    "synced_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            updated += 1
    return {"updated": updated}


# =============================================================================
# Public main entry point
# =============================================================================
async def sync_live_scores(db, competition_id: Optional[str] = None) -> dict:
    """Sync live scores for ALL (or one) WTT-mapped competition + simulator
    fallback for non-WTT live matches.

    Real WTT events are processed in parallel via asyncio.gather to keep total
    latency bounded (one slow event no longer blocks the others).
    """
    import asyncio

    summary = {
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "wtt": {"events": 0, "inserted": 0, "updated": 0, "live_total": 0,
                "official_total": 0, "details": []},
        "simulator": {"updated": 0},
        "errors": [],
    }

    # 1. Real WTT events (any comp with wtt_event_id) — run in parallel
    q = {"wtt_event_id": {"$ne": None}}
    if competition_id:
        q["id"] = competition_id
    comps = await db.competitions.find(q, {"_id": 0}).to_list(50)

    async def _one(comp):
        try:
            res = await _sync_real_event(db, comp)
            return ("ok", comp, res)
        except Exception as e:
            logger.exception("WTT sync failed for comp %s", comp.get("id"))
            return ("err", comp, str(e))

    if comps:
        results = await asyncio.gather(*[_one(c) for c in comps])
        for kind, comp, payload in results:
            if kind == "ok":
                summary["wtt"]["events"] += 1
                summary["wtt"]["inserted"] += payload.get("inserted", 0)
                summary["wtt"]["updated"] += payload.get("updated", 0)
                summary["wtt"]["live_total"] += payload.get("live_count", 0)
                summary["wtt"]["official_total"] += payload.get("official_count", 0)
                summary["wtt"]["details"].append({
                    "competition_id": comp["id"],
                    "wtt_event_id": comp.get("wtt_event_id"),
                    **payload,
                })
            else:
                summary["errors"].append({"competition_id": comp["id"], "error": payload})

    # 2. Simulator for everything else (non-WTT-mapped live individual matches)
    try:
        sim = await _simulate_tick(db, competition_id)
        summary["simulator"]["updated"] = sim["updated"]
    except Exception as e:
        logger.exception("Simulator sync error")
        summary["errors"].append({"source": "simulator", "error": str(e)})

    summary["synced"] = True
    summary["source"] = "wtt+simulator" if comps else "simulator"
    summary["updated"] = (summary["wtt"]["updated"] + summary["wtt"]["inserted"]
                          + summary["simulator"]["updated"])
    return summary
