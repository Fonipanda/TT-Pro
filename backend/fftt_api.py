"""FFTT (French Table Tennis Federation) Smartping API client.

The official Smartping API requires:
  - An `id` (identifiant) and `clé` (key) issued by the FFTT after request
  - A signed query parameter `tm` (timestamp) + `tmc` (HMAC-SHA1 signature)
  - Base URL: https://www.fftt.com/mobile/pxml/

To request credentials, the user must fill the FFTT API form:
  https://www.fftt.com/wp-content/uploads/2026/01/formulaire-api-1484.pdf

This module reads `FFTT_API_ID` and `FFTT_API_KEY` from the environment.
If they are missing, all `fetch_*` calls return an explanatory dict instead of
raising — so the UI can show a clear "credentials required" message rather
than a generic 500 error.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time
import xml.etree.ElementTree as ET
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

FFTT_BASE = "https://www.fftt.com/mobile/pxml"
FFTT_TIMEOUT = 10.0


def _credentials() -> Optional[tuple[str, str]]:
    """Return (api_id, api_key) if both env vars are set, else None."""
    api_id = os.environ.get("FFTT_API_ID")
    api_key = os.environ.get("FFTT_API_KEY")
    if api_id and api_key:
        return api_id, api_key
    return None


def _sign(api_id: str, api_key: str) -> dict:
    """Build authenticated query params with HMAC-SHA1 signature."""
    tm = str(int(time.time() * 1000))
    tmc = hmac.new(
        api_key.encode("utf-8"),
        tm.encode("utf-8"),
        hashlib.sha1,
    ).hexdigest()
    return {"id": api_id, "tm": tm, "tmc": tmc}


async def _get_xml(endpoint: str, **params) -> Optional[ET.Element]:
    """GET an XML endpoint with auth params; return parsed root or None.

    Returns None when credentials are missing or the API responds non-200.
    """
    creds = _credentials()
    if not creds:
        return None
    api_id, api_key = creds
    auth = _sign(api_id, api_key)
    full_params = {**auth, **{k: v for k, v in params.items() if v is not None}}

    async with httpx.AsyncClient(timeout=FFTT_TIMEOUT) as client:
        try:
            r = await client.get(f"{FFTT_BASE}/{endpoint}", params=full_params,
                                 headers={"User-Agent": "TTPro/1.0 (FastAPI)"})
            if r.status_code != 200:
                logger.warning("FFTT %s -> %s", endpoint, r.status_code)
                return None
            return ET.fromstring(r.text)
        except (httpx.RequestError, ET.ParseError) as e:
            logger.warning("FFTT %s parse/fetch failed: %s", endpoint, e)
            return None


def _xml_records(root: ET.Element, tag: str = "joueur") -> list[dict]:
    """Convert all <{tag}> children of root into list of dicts (text values)."""
    out = []
    for el in root.findall(tag):
        item = {child.tag: (child.text or "").strip() for child in el}
        out.append(item)
    return out


# ---------- Public API ----------
def is_configured() -> bool:
    return _credentials() is not None


def status() -> dict:
    """Quick status report (does NOT call the API)."""
    return {
        "configured": is_configured(),
        "base_url": FFTT_BASE,
        "needed_env_vars": ["FFTT_API_ID", "FFTT_API_KEY"],
        "obtain_credentials": "https://www.fftt.com/api/",
    }


async def fetch_club(club_id: str) -> dict:
    """Get a single club's info by FFTT id (ex. '08940210')."""
    root = await _get_xml("xml_club_b.php", numero=club_id)
    if root is None:
        return {"error": "credentials_missing_or_endpoint_unreachable",
                "configured": is_configured()}
    clubs = _xml_records(root, "club")
    return {"clubs": clubs, "count": len(clubs)}


async def fetch_clubs_by_dept(dept: str) -> dict:
    """List clubs for a French department code (ex. '94')."""
    root = await _get_xml("xml_club_dep2.php", dep=dept)
    if root is None:
        return {"error": "credentials_missing_or_endpoint_unreachable",
                "configured": is_configured()}
    clubs = _xml_records(root, "club")
    return {"clubs": clubs, "count": len(clubs)}


async def fetch_player(licence: str) -> dict:
    """Get a player by FFTT licence number (ex. '1234567')."""
    root = await _get_xml("xml_licence.php", licence=licence)
    if root is None:
        return {"error": "credentials_missing_or_endpoint_unreachable",
                "configured": is_configured()}
    players = _xml_records(root, "licence")
    return {"player": players[0] if players else None, "count": len(players)}


async def fetch_players_by_club(club_id: str) -> dict:
    """List all licensed players for a club."""
    root = await _get_xml("xml_liste_joueur.php", club=club_id)
    if root is None:
        return {"error": "credentials_missing_or_endpoint_unreachable",
                "configured": is_configured()}
    players = _xml_records(root, "joueur")
    return {"players": players, "count": len(players)}


async def fetch_player_partees(licence: str) -> dict:
    """Get a player's match results (parties) for the current season."""
    root = await _get_xml("xml_partie_mysql.php", licence=licence)
    if root is None:
        return {"error": "credentials_missing_or_endpoint_unreachable",
                "configured": is_configured()}
    matches = _xml_records(root, "partie")
    return {"matches": matches, "count": len(matches)}


async def fetch_pro_a_b_calendar(division: str = "proa_h") -> dict:
    """Get Pro A/B calendar (division: 'proa_h', 'proa_f', 'prob_h', 'prob_f').

    Note: this uses the 'organisme' endpoint. Without auth, this is gated.
    The real production approach would be to scrape lpttf.com or an ad-hoc
    LNTT JSON endpoint — left as a TODO until credentials are available.
    """
    if not is_configured():
        return {"error": "credentials_required",
                "needed_env_vars": ["FFTT_API_ID", "FFTT_API_KEY"],
                "fetch_form": "https://www.fftt.com/api/",
                "division": division}
    # When configured, we'd query e.g. xml_resultat_equipe.php with the right
    # cx_poule for Pro A. For now return a structured placeholder so the UI
    # surfaces credential need rather than mocking data.
    return {"division": division,
            "matches": [],
            "note": "Pro A/B endpoint mapping pending — needs FFTT TEAM_PRO_A poule code."}
