"""FFTT integration via the libfftt public proxy (https://fftt.dafunker.com/v1).

Same API that the Rust crate `libfftt` (matlink/libfftt) uses. NO credentials
needed — it's a thin community-maintained proxy in front of the official FFTT
SPID/Smartping endpoints.

Endpoints exposed by the proxy:
  - GET /v1/joueur/{licence}                          → JSON player
  - GET /v1/parties/{licence}                         → JSON list of matches
  - GET /v1/club/{idclub}/equipes                     → JSON team engagements
  - GET /v1/proxy/xml_club_detail.php?club={id}       → XML club details
  - GET /v1/proxy/xml_licence_b.php?club={id}         → XML full club roster
  - GET /v1/proxy/xml_result_equ.php?D1=&cx_poule=    → XML poule results
  - GET /v1/proxy/xml_result_equ.php?action=classement → XML poule standings

This module wraps these with httpx.AsyncClient + tolerant XML parsing.
"""
from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

LIBFFTT_API = "https://fftt.dafunker.com/v1"
TIMEOUT = 12.0
HEADERS = {"User-Agent": "TTPro/1.0 (libfftt-proxy client)"}


def is_configured() -> bool:
    """Always True — the libfftt proxy is public, no credentials required."""
    return True


def status() -> dict:
    return {
        "configured": True,
        "source": "libfftt public proxy",
        "base_url": LIBFFTT_API,
        "credentials_required": False,
        "note": "Same API that the Rust crate `libfftt` uses. No FFTT_API_ID/KEY needed.",
    }


# ---------- Low-level helpers ----------
async def _get_json(path: str) -> Optional[dict | list]:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            r = await client.get(f"{LIBFFTT_API}{path}", headers=HEADERS, follow_redirects=True)
            if r.status_code != 200:
                logger.warning("libfftt %s -> %s", path, r.status_code)
                return None
            return r.json()
        except Exception as e:
            logger.warning("libfftt %s failed: %s", path, e)
            return None


async def _get_xml(path: str) -> Optional[ET.Element]:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            r = await client.get(f"{LIBFFTT_API}{path}", headers=HEADERS, follow_redirects=True)
            if r.status_code != 200 or not r.text.strip():
                return None
            # FFTT XML is ISO-8859-1 — httpx auto-decodes via encoding header
            return ET.fromstring(r.text)
        except Exception as e:
            logger.warning("libfftt XML %s failed: %s", path, e)
            return None


def _records(root: ET.Element, tag: str) -> list[dict]:
    out = []
    for el in root.findall(tag):
        item = {child.tag: (child.text or "").strip() for child in el}
        out.append(item)
    return out


# ---------- Public typed API ----------
async def fetch_player(licence: str) -> dict:
    """Get a player by FFTT licence number — returns the full JSON record
    or {error, licence} on failure.
    Example: 3421810 → Felix Lebrun, 4523.0 points, MONTPELLIER TT.
    """
    data = await _get_json(f"/joueur/{licence}")
    if not data or not isinstance(data, dict):
        return {"error": "player_not_found", "licence": licence}
    return {"player": data}


async def fetch_player_matches(licence: str) -> dict:
    """Get a player's matches/parties for the current season."""
    data = await _get_json(f"/parties/{licence}")
    if not data:
        return {"error": "no_matches", "licence": licence}
    # The proxy returns {"list": [{"journees": [...]}]}
    return {"matches": data.get("list", []) if isinstance(data, dict) else data,
            "licence": licence}


async def fetch_club(club_id: str) -> dict:
    """Get a club by id (e.g., '11340010' for Montpellier TT)."""
    root = await _get_xml(f"/proxy/xml_club_detail.php?club={club_id}")
    if root is None:
        return {"error": "club_not_found", "club_id": club_id}
    clubs = _records(root, "club")
    return {"club": clubs[0] if clubs else None, "club_id": club_id}


async def fetch_club_roster(club_id: str) -> dict:
    """Get the full roster (all licensed players) of a club. Each entry has
    licence, nom, prenom, points, classement, etc."""
    root = await _get_xml(f"/proxy/xml_licence_b.php?club={club_id}")
    if root is None:
        return {"error": "roster_not_found", "club_id": club_id}
    licences = _records(root, "licence")
    return {"players": licences, "count": len(licences), "club_id": club_id}


async def fetch_club_teams(club_id: str) -> dict:
    """Get all teams a club has engaged this season + the lien_division which
    contains the cx_poule needed to fetch results."""
    data = await _get_json(f"/club/{club_id}/equipes")
    if not isinstance(data, list):
        return {"error": "teams_not_found", "club_id": club_id}
    return {"teams": data, "count": len(data), "club_id": club_id}


async def fetch_poule_results(d1: str, cx_poule: str) -> dict:
    """Get results of a specific poule (D1 = championship id, cx_poule = poule id)."""
    root = await _get_xml(
        f"/proxy/xml_result_equ.php?force=1&D1={d1}&cx_poule={cx_poule}"
    )
    if root is None:
        return {"error": "poule_not_found", "d1": d1, "cx_poule": cx_poule}
    rencontres = _records(root, "tour")  # tag varies; try fallback
    if not rencontres:
        rencontres = _records(root, "rencontre")
    return {"matches": rencontres, "d1": d1, "cx_poule": cx_poule}


async def fetch_poule_standings(d1: str, cx_poule: str) -> dict:
    """Get the standings (classement) of a specific poule."""
    root = await _get_xml(
        f"/proxy/xml_result_equ.php?force=1&action=classement&D1={d1}&cx_poule={cx_poule}"
    )
    if root is None:
        return {"error": "standings_not_found", "d1": d1, "cx_poule": cx_poule}
    classement = _records(root, "classement")
    return {"standings": classement, "d1": d1, "cx_poule": cx_poule}


async def fetch_clubs_by_dept(dept: str) -> dict:
    """List all clubs in a French department (e.g., '49' for Maine-et-Loire).

    Returns names + numero (the id usable with fetch_club / fetch_club_roster).
    """
    root = await _get_xml(f"/proxy/xml_club_dep2.php?dep={dept}")
    if root is None:
        return {"error": "dept_not_found", "dept": dept}
    clubs = _records(root, "club")
    return {"clubs": clubs, "count": len(clubs), "dept": dept}


# ---------- Higher-level: sync a club's roster into our DB ----------
async def import_club_roster(db, club_id: str) -> dict:
    """Insert/update all licensed players of a FFTT club into our players collection.

    Maps libfftt licence record → our Player schema. Player.id = `fftt-{licence}`.
    """
    from models import Player
    from datetime import datetime, timezone

    res = await fetch_club_roster(club_id)
    if "error" in res:
        return res
    licenses = res["players"]
    inserted = 0
    updated = 0
    for r in licenses:
        try:
            licence = r.get("licence", "").strip()
            if not licence:
                continue
            nom = r.get("nom", "").title()
            prenom = r.get("prenom", "").title()
            points = float(r.get("point") or 0)
            sex = r.get("sexe", "M")
            place = r.get("place", "")
            try:
                rank_national = int(place) if place.isdigit() else None
            except Exception:
                rank_national = None
            cat = r.get("cat", "")
            club_name = r.get("nomclub", "")
            doc = Player(
                id=f"fftt-{licence}",
                name=f"{prenom} {nom}".strip(),
                country="France",
                country_code="FR",
                flag="🇫🇷",
                rank_world=None,
                rank_national=rank_national,
                points=int(points),
                handedness="right",
                style=f"FFTT {cat}",
                photo_url=f"https://api.dicebear.com/7.x/initials/svg?seed={prenom}{nom}&backgroundColor=002654,EE2A35",
                bio=f"{prenom} {nom} ({club_name}) — Licence FFTT #{licence}, {points} pts, {cat}.",
                recent_form=[],
                birth_year=None,
            ).model_dump()
            existing = await db.players.find_one({"id": doc["id"]}, {"_id": 0, "id": 1})
            if existing:
                await db.players.update_one({"id": doc["id"]}, {"$set": doc})
                updated += 1
            else:
                await db.players.insert_one(doc)
                inserted += 1
        except Exception as e:
            logger.warning("Failed to import licence %s: %s", r.get("licence"), e)
    return {"inserted": inserted, "updated": updated, "total": len(licenses),
            "club_id": club_id}
