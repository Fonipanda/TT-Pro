"""Mock realistic table tennis data seeder."""
from datetime import datetime, timedelta, timezone
from models import Player, Competition, Match
import random
import uuid


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def build_players() -> list[dict]:
    raw = [
        # Top international men
        ("Wang Chuqin", "China", "CN", "🇨🇳", 1, 1, 12450, "right", "Shakehand attacker", 2000),
        ("Fan Zhendong", "China", "CN", "🇨🇳", 2, 2, 11320, "right", "Two-winged looper", 1997),
        ("Tomokazu Harimoto", "Japan", "JP", "🇯🇵", 3, 1, 10890, "right", "Aggressive backhand", 2003),
        ("Hugo Calderano", "Brazil", "BR", "🇧🇷", 4, 1, 10210, "right", "Power hitter", 1996),
        ("Lin Shidong", "China", "CN", "🇨🇳", 5, 3, 10050, "right", "All-round attacker", 2004),
        ("Truls Moregard", "Sweden", "SE", "🇸🇪", 6, 1, 9870, "right", "Pen-hold reverse", 2002),
        ("Lin Yun-Ju", "Chinese Taipei", "TW", "🇹🇼", 7, 1, 9600, "right", "Counter-driver", 2001),
        ("Felix Lebrun", "France", "FR", "🇫🇷", 8, 1, 9450, "right", "Pen-hold prodigy", 2006),
        ("Alexis Lebrun", "France", "FR", "🇫🇷", 9, 2, 9120, "right", "Aggressive forehand", 2003),
        ("Dimitrij Ovtcharov", "Germany", "DE", "🇩🇪", 10, 1, 8950, "right", "Veteran defender-attacker", 1988),
        ("Patrick Franziska", "Germany", "DE", "🇩🇪", 12, 2, 8540, "right", "Strong backhand block", 1992),
        ("Anton Kallberg", "Sweden", "SE", "🇸🇪", 14, 2, 8320, "right", "Forehand looper", 1997),
        ("Darko Jorgic", "Slovenia", "SI", "🇸🇮", 15, 1, 8100, "right", "Counter-attacker", 1998),
        ("Simon Gauzy", "France", "FR", "🇫🇷", 18, 3, 7820, "left", "Lefty looper", 1994),
        ("Cristian Pletea", "Romania", "RO", "🇷🇴", 22, 1, 7400, "right", "Defender", 2001),

        # Top women
        ("Sun Yingsha", "China", "CN", "🇨🇳", 1, 1, 12690, "right", "Two-winged looper", 2000),
        ("Wang Manyu", "China", "CN", "🇨🇳", 2, 2, 11450, "right", "Power attacker", 1999),
        ("Chen Meng", "China", "CN", "🇨🇳", 3, 3, 10920, "right", "Olympic champion", 1994),
        ("Hina Hayata", "Japan", "JP", "🇯🇵", 4, 1, 9870, "right", "Quick attacker", 2000),
        ("Mima Ito", "Japan", "JP", "🇯🇵", 5, 2, 9560, "right", "Pen-hold short pips", 2000),
        ("Prithika Pavade", "France", "FR", "🇫🇷", 9, 1, 8420, "right", "All-round looper", 2004),
        ("Yuan Jia Nan", "France", "FR", "🇫🇷", 25, 2, 6800, "right", "Veteran defender", 1979),
    ]
    out = []
    for n, country, cc, flag, rw, rn, pts, hand, style, by in raw:
        recent = random.choices(["W", "L"], weights=[7, 3], k=5)
        out.append(Player(
            name=n, country=country, country_code=cc, flag=flag,
            rank_world=rw, rank_national=rn, points=pts,
            handedness=hand, style=style, birth_year=by,
            photo_url=f"https://api.dicebear.com/7.x/initials/svg?seed={n.replace(' ', '')}&backgroundColor=FF3B30&textColor=ffffff",
            bio=f"{n} is a {country} table tennis professional ranked #{rw} in the world with {pts} ranking points. Known for {style.lower()} playstyle.",
            recent_form=recent,
        ).model_dump())
    return out


def build_competitions() -> list[dict]:
    today = _now()
    raw = [
        ("WTT Champions Frankfurt", "WTT Champions", "WTT", "international", "Germany", -2, 5),
        ("WTT Grand Smash Singapore", "Grand Smash SG", "WTT", "international", "Singapore", 8, 14),
        ("ITTF World Championships", "World Champs", "ITTF", "international", "Qatar", 30, 40),
        ("Pro A Championnat de France", "Pro A FR", "France", "national", "France", -10, 60),
        ("Pro B Championnat de France", "Pro B FR", "France", "national", "France", -10, 60),
        ("Bundesliga TTBL", "Bundesliga", "Bundesliga", "league", "Germany", -5, 80),
        ("Chinese Super League", "CSL", "CSL", "league", "China", 1, 70),
        ("ETTU Champions League", "Champions League", "ChampionsLeague", "league", "Europe", -3, 90),
        ("WTT Star Contender Doha", "Star Contender", "WTT", "international", "Qatar", 20, 25),
        ("WTT Feeder Westchester", "Feeder", "WTT", "international", "USA", 12, 16),
    ]
    out = []
    for name, short, cat, level, country, ds, de in raw:
        start = today + timedelta(days=ds)
        end = today + timedelta(days=de)
        out.append(Competition(
            name=name, short_name=short, category=cat, level=level,
            country=country,
            logo_url=f"https://api.dicebear.com/7.x/shapes/svg?seed={short.replace(' ', '')}&backgroundColor=0A0A0A",
            banner_url="https://images.unsplash.com/photo-1690576499915-75585d29e562?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
            start_date=_iso(start), end_date=_iso(end),
            venue=f"{country} Arena",
            description=f"{name} is a premier {level} table tennis competition held in {country}.",
        ).model_dump())
    return out


def _gen_sets(p1_strong: bool) -> tuple[list, int, int]:
    """Generate realistic completed match sets."""
    sets = []
    p1_wins = 0
    p2_wins = 0
    while p1_wins < 4 and p2_wins < 4:
        # winner of set probabilistic
        if p1_strong:
            p1_takes = random.random() < 0.6
        else:
            p1_takes = random.random() < 0.4
        if p1_takes:
            p1_score = 11
            p2_score = random.choice([5, 6, 7, 8, 9, 9, 9])
            if p2_score == 9 and random.random() < 0.3:
                # deuce scenario
                margin = random.choice([12, 13, 14])
                p1_score = margin
                p2_score = margin - 2
            p1_wins += 1
        else:
            p2_score = 11
            p1_score = random.choice([5, 6, 7, 8, 9, 9, 9])
            if p1_score == 9 and random.random() < 0.3:
                margin = random.choice([12, 13, 14])
                p2_score = margin
                p1_score = margin - 2
            p2_wins += 1
        sets.append([p1_score, p2_score])
    return sets, p1_wins, p2_wins


def build_matches(players: list[dict], competitions: list[dict]) -> list[dict]:
    today = _now()
    rounds = ["Round of 32", "Round of 16", "Quarter Final", "Semi Final", "Final"]
    matches = []
    male_players = [p for p in players if p['birth_year'] and p['rank_world'] and p['name'] not in (
        "Sun Yingsha", "Wang Manyu", "Chen Meng", "Hina Hayata", "Mima Ito",
        "Prithika Pavade", "Yuan Jia Nan",
    )]
    female_players = [p for p in players if p['name'] in (
        "Sun Yingsha", "Wang Manyu", "Chen Meng", "Hina Hayata", "Mima Ito",
        "Prithika Pavade", "Yuan Jia Nan",
    )]

    youtube_embeds = [
        "https://www.youtube.com/embed/V9PVRfjEBTI",
        "https://www.youtube.com/embed/o0CY7qSMRjo",
        "https://www.youtube.com/embed/X2OqgGW9hR4",
        "https://www.youtube.com/embed/DyPDhTRnE-A",
    ]

    for comp in competitions:
        pool = male_players if random.random() > 0.3 else female_players
        if len(pool) < 2:
            pool = male_players
        n_matches = random.randint(6, 10)
        for i in range(n_matches):
            p1, p2 = random.sample(pool, 2)
            # status distribution
            r = random.random()
            if r < 0.18:
                status = "live"
                offset = -timedelta(minutes=random.randint(5, 60))
            elif r < 0.55:
                status = "scheduled"
                offset = timedelta(hours=random.randint(2, 120))
            else:
                status = "finished"
                offset = -timedelta(hours=random.randint(2, 240))
            scheduled = today + offset

            sets = []
            score_p1 = 0
            score_p2 = 0
            curr_p1 = 0
            curr_p2 = 0
            serving = None

            if status == "finished":
                p1_strong = (p1['rank_world'] or 99) < (p2['rank_world'] or 99)
                sets, score_p1, score_p2 = _gen_sets(p1_strong)
            elif status == "live":
                # play 1-3 sets, current set partial
                completed = random.randint(1, 3)
                p1_strong = (p1['rank_world'] or 99) < (p2['rank_world'] or 99)
                temp_sets, sp1, sp2 = _gen_sets(p1_strong)
                sets = temp_sets[:completed]
                score_p1 = sum(1 for s in sets if s[0] > s[1])
                score_p2 = sum(1 for s in sets if s[1] > s[0])
                curr_p1 = random.randint(0, 9)
                curr_p2 = random.randint(0, 9)
                serving = random.choice([1, 2])

            matches.append(Match(
                competition_id=comp['id'],
                competition_name=comp['name'],
                competition_category=comp['category'],
                round_name=random.choice(rounds),
                player1_id=p1['id'], player1_name=p1['name'],
                player1_country=p1['country'], player1_flag=p1['flag'],
                player2_id=p2['id'], player2_name=p2['name'],
                player2_country=p2['country'], player2_flag=p2['flag'],
                status=status, scheduled_at=_iso(scheduled),
                sets=sets, score_p1=score_p1, score_p2=score_p2,
                current_set_p1=curr_p1, current_set_p2=curr_p2,
                serving=serving,
                stream_url=random.choice(youtube_embeds) if status in ("live", "scheduled") else None,
                venue=comp.get('venue'),
            ).model_dump())
    return matches


async def seed_database(db):
    """Seed if empty."""
    existing_players = await db.players.count_documents({})
    if existing_players > 0:
        return {"seeded": False, "players": existing_players}

    players = build_players()
    competitions = build_competitions()
    matches = build_matches(players, competitions)

    if players:
        await db.players.insert_many(players)
    if competitions:
        await db.competitions.insert_many(competitions)
    if matches:
        await db.matches.insert_many(matches)

    return {
        "seeded": True,
        "players": len(players),
        "competitions": len(competitions),
        "matches": len(matches),
    }
