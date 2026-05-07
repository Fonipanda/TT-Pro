"""Real World Table Tennis (WTT) API client.

The WTT website (worldtabletennis.com) is an Angular SPA backed by Azure-hosted
APIs. This module talks directly to those APIs:

  - Live results:      GET /api/cms/GetLiveResult?EventId={id}
  - Official results:  GET /api/cms/GetOfficialResult?EventId={id}
                       &take={n}&include_match_card=true

Both endpoints REQUIRE an `Origin: https://www.worldtabletennis.com` header,
otherwise they reject with 422.

This module also discovers events via the public routes file.
"""
from __future__ import annotations

import logging
from typing import Optional
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

WTT_LIVE_API = "https://liveeventsapi.worldtabletennis.com/api"
WTT_ROUTES_URL = (
    "https://wtt-web-frontdoor-cthahjeqhbh6aqe3.a01.azurefd.net"
    "/staticfiles/jsonfiles/routes_all_list.json"
)
WTT_HEADERS = {
    "Origin": "https://www.worldtabletennis.com",
    "Referer": "https://www.worldtabletennis.com/",
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}

WTT_TIMEOUT = 15.0


# ----- Discovery -----
async def fetch_event_routes() -> list[dict]:
    """Return list of all WTT events: [{eventId, eventName, routeName, routeId}, ...]"""
    async with httpx.AsyncClient(timeout=WTT_TIMEOUT) as client:
        r = await client.get(f"{WTT_ROUTES_URL}?q={int(datetime.now(timezone.utc).timestamp())}",
                             headers=WTT_HEADERS, follow_redirects=True)
        r.raise_for_status()
        data = r.json()
    if isinstance(data, list) and data and isinstance(data[0], dict) and "rows" in data[0]:
        return data[0]["rows"]
    return data if isinstance(data, list) else []


# ----- Live & official results -----
async def get_live_result(event_id: int) -> list[dict]:
    """Return raw list of currently-LIVE matches for a WTT event."""
    try:
        async with httpx.AsyncClient(timeout=WTT_TIMEOUT) as client:
            r = await client.get(
                f"{WTT_LIVE_API}/cms/GetLiveResult",
                params={"EventId": event_id},
                headers=WTT_HEADERS,
            )
        if r.status_code != 200:
            logger.warning("WTT live %s -> %s", event_id, r.status_code)
            return []
        return r.json() or []
    except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.RequestError) as e:
        logger.warning("WTT live fetch %s timed out: %s", event_id, e)
        return []
    except Exception as e:
        logger.warning("WTT live fetch %s failed: %s", event_id, e)
        return []


async def get_official_result(event_id: int, take: int = 30,
                              include_match_card: bool = True) -> list[dict]:
    """Return list of finished/official matches for a WTT event."""
    try:
        async with httpx.AsyncClient(timeout=WTT_TIMEOUT) as client:
            r = await client.get(
                f"{WTT_LIVE_API}/cms/GetOfficialResult",
                params={
                    "EventId": event_id,
                    "take": take,
                    **({"include_match_card": "true"} if include_match_card else {}),
                },
                headers=WTT_HEADERS,
            )
        if r.status_code != 200:
            logger.warning("WTT official %s -> %s", event_id, r.status_code)
            return []
        return r.json() or []
    except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.RequestError) as e:
        logger.warning("WTT official fetch %s timed out: %s", event_id, e)
        return []
    except Exception as e:
        logger.warning("WTT official fetch %s failed: %s", event_id, e)
        return []


# ----- Parsing into our domain Match shape -----
COUNTRY_CODE_TO_FLAG = {
    "FRA": ("France", "FR", "🇫🇷"),
    "CHN": ("China", "CN", "🇨🇳"),
    "JPN": ("Japan", "JP", "🇯🇵"),
    "KOR": ("South Korea", "KR", "🇰🇷"),
    "GER": ("Germany", "DE", "🇩🇪"),
    "SWE": ("Sweden", "SE", "🇸🇪"),
    "TPE": ("Chinese Taipei", "TW", "🇹🇼"),
    "BRA": ("Brazil", "BR", "🇧🇷"),
    "ENG": ("England", "EN", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"),
    "GBR": ("Great Britain", "GB", "🇬🇧"),
    "USA": ("United States", "US", "🇺🇸"),
    "POR": ("Portugal", "PT", "🇵🇹"),
    "HKG": ("Hong Kong", "HK", "🇭🇰"),
    "CRO": ("Croatia", "HR", "🇭🇷"),
    "ROU": ("Romania", "RO", "🇷🇴"),
    "AUT": ("Austria", "AT", "🇦🇹"),
    "MDA": ("Moldova", "MD", "🇲🇩"),
    "KAZ": ("Kazakhstan", "KZ", "🇰🇿"),
    "POL": ("Poland", "PL", "🇵🇱"),
    "IND": ("India", "IN", "🇮🇳"),
    "ESP": ("Spain", "ES", "🇪🇸"),
    "ITA": ("Italy", "IT", "🇮🇹"),
    "DEN": ("Denmark", "DK", "🇩🇰"),
    "SLO": ("Slovenia", "SI", "🇸🇮"),
    "SRB": ("Serbia", "RS", "🇷🇸"),
    "HUN": ("Hungary", "HU", "🇭🇺"),
    "CZE": ("Czech Republic", "CZ", "🇨🇿"),
    "EGY": ("Egypt", "EG", "🇪🇬"),
    "TUN": ("Tunisia", "TN", "🇹🇳"),
    "AUS": ("Australia", "AU", "🇦🇺"),
    "ARG": ("Argentina", "AR", "🇦🇷"),
    "PUR": ("Puerto Rico", "PR", "🇵🇷"),
    "SGP": ("Singapore", "SG", "🇸🇬"),
    "MAS": ("Malaysia", "MY", "🇲🇾"),
    "UKR": ("Ukraine", "UA", "🇺🇦"),
    "PRK": ("North Korea", "KP", "🇰🇵"),
    "LUX": ("Luxembourg", "LU", "🇱🇺"),
    "WAL": ("Wales", "WL", "🏴󠁧󠁢󠁷󠁬󠁳󠁿"),
    "NED": ("Netherlands", "NL", "🇳🇱"),
    "SUI": ("Switzerland", "CH", "🇨🇭"),
    "SVK": ("Slovakia", "SK", "🇸🇰"),
}


def _flag_lookup(org_code: str) -> tuple[str, str, str]:
    """Map IOC 3-letter code → (country_name, ISO2, flag_emoji)."""
    if not org_code:
        return ("Unknown", "XX", "🏴")
    return COUNTRY_CODE_TO_FLAG.get(org_code.upper(), (org_code, org_code[:2], "🏴"))


def _round_from_doc_code(code: str) -> str:
    """Decode WTT documentCode → human round name.

    Example: 'TTEMSINGLES-----------FNL-000100----------' → 'Final'
             'TTEMSINGLES-----------SFNL000100----------' → 'Semi Final'
             'TTEMSINGLES-----------QFNL000100----------' → 'Quarter Final'
             'TTEMSINGLES-----------R032000100----------' → 'Round of 32'
    """
    if not code:
        return "Match"
    c = code.upper()
    mapping = [
        ("FNL-", "Final"),
        ("SFNL", "Semi Final"),
        ("QFNL", "Quarter Final"),
        ("8FNL", "Round of 16"),    # Eighth final
        ("16FNL", "Round of 32"),   # Sixteenth final (rare)
        ("R016", "Round of 16"),
        ("R032", "Round of 32"),
        ("R064", "Round of 64"),
        ("R128", "Round of 128"),
        ("R16-", "Round of 16"),
        ("R32-", "Round of 32"),
        ("R64-", "Round of 64"),
        ("R128", "Round of 128"),
        ("GRP-", "Group Stage"),
        ("RR--", "Round Robin"),
        ("PLY-", "Play-off"),
    ]
    for token, label in mapping:
        if token in c:
            return label
    return "Match"


def _gender_from_subevent(sub_event: str) -> str:
    """'Men's Singles', 'Men Singles', 'Mixed Doubles' → 'men' / 'women'."""
    if not sub_event:
        return "men"
    s = sub_event.lower()
    if "women" in s or "ladies" in s or "girls" in s:
        return "women"
    if "mixed" in s:
        # Mixed = both genders; we tag as 'men' by default (could be 'mixed' in future)
        return "men"
    return "men"


def _parse_scores(scores_str: str) -> list[int]:
    """'8,11,7,9,11,8,0' → [8,11,7,9,11,8,0]"""
    if not scores_str:
        return []
    out = []
    for tok in scores_str.split(","):
        tok = tok.strip()
        if tok.isdigit() or (tok.startswith("-") and tok[1:].isdigit()):
            out.append(int(tok))
    return out


def _parse_overall(overall: str) -> tuple[int, int]:
    """'2-4' → (2, 4)"""
    if not overall or "-" not in overall:
        return (0, 0)
    try:
        a, b = overall.split("-", 1)
        return (int(a.strip()), int(b.strip()))
    except Exception:
        return (0, 0)


def _parse_iso(date_str: str) -> str:
    """'02/15/2026 12:30:00' (UTC) → ISO 8601 with tz."""
    if not date_str:
        return datetime.now(timezone.utc).isoformat()
    for fmt in ("%m/%d/%Y %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            continue
    return datetime.now(timezone.utc).isoformat()


def parse_match_card(raw: dict, comp_id: str, comp_name: str,
                     comp_category: str, status: str) -> Optional[dict]:
    """Convert a single WTT raw result item → our Match dict.

    Returns None if the raw item doesn't have a usable match_card (e.g. just
    metadata without players).
    """
    mc = raw.get("match_card")
    if not mc:
        return None
    competitors = mc.get("competitiors") or []
    if len(competitors) < 2:
        return None
    p1, p2 = competitors[0], competitors[1]

    p1_country, p1_cc, p1_flag = _flag_lookup(p1.get("competitiorOrg") or "")
    p2_country, p2_cc, p2_flag = _flag_lookup(p2.get("competitiorOrg") or "")

    # Sets — combine p1 and p2 score tracks
    p1_sets = _parse_scores(p1.get("scores") or "")
    p2_sets = _parse_scores(p2.get("scores") or "")
    sets = []
    for a, b in zip(p1_sets, p2_sets):
        # WTT pads completed-but-unplayed sets with 0-0 — skip those
        if a == 0 and b == 0:
            continue
        sets.append([a, b])

    score_p1, score_p2 = _parse_overall(mc.get("overallScores") or "")

    # Detect team match: documentCode contains 'TEAM' or competitorType has team marker
    is_team = "TEAM" in (mc.get("documentCode") or "").upper()

    when_iso = _parse_iso((mc.get("matchDateTime") or {}).get("startDateUTC", ""))

    # Use WTT match id as a deterministic id (so we can upsert)
    wtt_match_id = str(raw.get("id") or "")
    if not wtt_match_id:
        # Without a stable WTT id we cannot safely upsert — skip
        return None
    match_id = f"wtt-{wtt_match_id}"

    # Service info for live matches
    serving = None
    action = mc.get("action") or {}
    if status == "live":
        sp = action.get("serverCompetitor") or action.get("serverNext")
        if sp == p1.get("competitiorId"):
            serving = 1
        elif sp == p2.get("competitiorId"):
            serving = 2

    # Current set live score (last entry in scores if game in progress)
    current_p1 = current_p2 = 0
    if status == "live" and p1_sets and p2_sets:
        # The trailing pair (often "0,0" if not started) represents in-progress
        if len(p1_sets) > len(sets):
            current_p1 = p1_sets[len(sets)]
            current_p2 = p2_sets[len(sets)]

    return {
        "id": match_id,
        "competition_id": comp_id,
        "competition_name": comp_name,
        "competition_category": comp_category,
        "round_name": _round_from_doc_code(mc.get("documentCode") or ""),
        "match_type": "team" if is_team else "individual",
        "gender": _gender_from_subevent(mc.get("subEventName") or ""),
        "player1_id": f"wtt-player-{p1.get('competitiorId')}",
        "player1_name": (p1.get("competitiorName") or "").title(),
        "player1_country": p1_country,
        "player1_flag": p1_flag,
        "player2_id": f"wtt-player-{p2.get('competitiorId')}",
        "player2_name": (p2.get("competitiorName") or "").title(),
        "player2_country": p2_country,
        "player2_flag": p2_flag,
        "status": status,
        "scheduled_at": when_iso,
        "sets": sets,
        "score_p1": score_p1,
        "score_p2": score_p2,
        "current_set_p1": current_p1,
        "current_set_p2": current_p2,
        "serving": serving,
        "stream_url": None,  # WTT doesn't expose direct stream URL here
        "venue": mc.get("venueName") or "",
        "rubbers": [],
        "wtt_match_id": wtt_match_id,
        "wtt_synced_at": datetime.now(timezone.utc).isoformat(),
    }
