"""TT Pro backend API end-to-end tests."""
import os
import uuid
import time
import pytest
import requests

API = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") + "/api"


def _has_no_mongo_id(obj):
    """Recursively check that '_id' is not present anywhere in the response."""
    if isinstance(obj, dict):
        if "_id" in obj:
            return False
        return all(_has_no_mongo_id(v) for v in obj.values())
    if isinstance(obj, list):
        return all(_has_no_mongo_id(v) for v in obj)
    return True


# ---------- Health ----------
class TestHealth:
    def test_root(self, api_url, client):
        r = client.get(f"{api_url}/")
        assert r.status_code == 200
        body = r.json()
        assert body.get("status") == "ok"
        assert body.get("app") == "TT Pro"

    def test_health(self, api_url, client):
        r = client.get(f"{api_url}/health")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_stats_overview(self, api_url, client):
        r = client.get(f"{api_url}/stats/overview")
        assert r.status_code == 200
        data = r.json()
        for key in ("players", "competitions", "matches", "live_matches"):
            assert key in data, f"missing {key}"
            assert isinstance(data[key], int)
        assert data["players"] >= 22
        assert data["competitions"] >= 10
        assert data["matches"] >= 70


# ---------- Auth ----------
class TestAuth:
    def test_register_returns_token_and_user(self, api_url, client):
        email = f"tester+{uuid.uuid4().hex[:8]}@ttpro.app"
        r = client.post(
            f"{api_url}/auth/register",
            json={"email": email, "password": "TtPro2026!", "name": "T1"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data and len(data["access_token"]) > 10
        assert data["user"]["email"] == email
        assert data["user"]["name"] == "T1"
        assert "id" in data["user"]
        assert _has_no_mongo_id(data)

    def test_register_duplicate_email(self, api_url, client, test_user):
        r = client.post(
            f"{api_url}/auth/register",
            json={"email": test_user["email"], "password": "TtPro2026!", "name": "Dup"},
        )
        assert r.status_code == 400

    def test_login_success(self, api_url, client, test_user):
        r = client.post(
            f"{api_url}/auth/login",
            json={"email": test_user["email"], "password": test_user["password"]},
        )
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["user"]["email"] == test_user["email"]

    def test_login_invalid_credentials(self, api_url, client, test_user):
        r = client.post(
            f"{api_url}/auth/login",
            json={"email": test_user["email"], "password": "WRONG"},
        )
        assert r.status_code == 401

    def test_me_with_token(self, api_url, auth_client, test_user):
        r = auth_client.get(f"{api_url}/auth/me")
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == test_user["email"]
        assert body["id"] == test_user["user"]["id"]
        assert _has_no_mongo_id(body)

    def test_me_without_token(self, api_url, client):
        r = client.get(f"{api_url}/auth/me")
        assert r.status_code == 401


# ---------- Players ----------
class TestPlayers:
    def test_list_players_sorted_by_world_rank(self, api_url, client):
        r = client.get(f"{api_url}/players")
        assert r.status_code == 200
        players = r.json()
        assert isinstance(players, list)
        assert len(players) >= 5
        assert _has_no_mongo_id(players)
        ranks = [p.get("rank_world") for p in players if p.get("rank_world") is not None]
        assert ranks == sorted(ranks), "players should be sorted by rank_world ASC"

    def test_filter_country_fr(self, api_url, client):
        r = client.get(f"{api_url}/players", params={"country": "FR"})
        assert r.status_code == 200
        players = r.json()
        assert len(players) >= 1
        assert all(p["country_code"] == "FR" for p in players)

    def test_search_lebrun(self, api_url, client):
        r = client.get(f"{api_url}/players", params={"search": "Lebrun"})
        assert r.status_code == 200
        players = r.json()
        assert len(players) >= 1
        assert any("Lebrun" in p["name"] for p in players)

    def test_get_single_player(self, api_url, client):
        listing = client.get(f"{api_url}/players").json()
        pid = listing[0]["id"]
        r = client.get(f"{api_url}/players/{pid}")
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == pid
        assert _has_no_mongo_id(body)

    def test_get_player_404(self, api_url, client):
        r = client.get(f"{api_url}/players/nonexistent-id-xxx")
        assert r.status_code == 404

    def test_player_matches(self, api_url, client):
        listing = client.get(f"{api_url}/players").json()
        pid = listing[0]["id"]
        r = client.get(f"{api_url}/players/{pid}/matches")
        assert r.status_code == 200
        matches = r.json()
        assert isinstance(matches, list)
        for m in matches:
            assert pid in (m["player1_id"], m["player2_id"])


# ---------- Competitions ----------
class TestCompetitions:
    def test_list_competitions(self, api_url, client):
        r = client.get(f"{api_url}/competitions")
        assert r.status_code == 200
        comps = r.json()
        assert len(comps) >= 5
        assert _has_no_mongo_id(comps)

    def test_filter_category(self, api_url, client):
        r = client.get(f"{api_url}/competitions", params={"category": "WTT"})
        assert r.status_code == 200
        for c in r.json():
            assert c["category"] == "WTT"

    def test_filter_level(self, api_url, client):
        r = client.get(f"{api_url}/competitions", params={"level": "international"})
        assert r.status_code == 200
        for c in r.json():
            assert c["level"] == "international"

    def test_search_competition(self, api_url, client):
        r = client.get(f"{api_url}/competitions", params={"search": "WTT"})
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_get_single_competition(self, api_url, client):
        comps = client.get(f"{api_url}/competitions").json()
        cid = comps[0]["id"]
        r = client.get(f"{api_url}/competitions/{cid}")
        assert r.status_code == 200
        assert r.json()["id"] == cid

    def test_competition_404(self, api_url, client):
        r = client.get(f"{api_url}/competitions/missing-comp-id")
        assert r.status_code == 404

    def test_competition_matches(self, api_url, client):
        comps = client.get(f"{api_url}/competitions").json()
        cid = comps[0]["id"]
        r = client.get(f"{api_url}/competitions/{cid}/matches")
        assert r.status_code == 200
        matches = r.json()
        for m in matches:
            assert m["competition_id"] == cid


# ---------- Matches ----------
class TestMatches:
    def test_list_matches(self, api_url, client):
        r = client.get(f"{api_url}/matches")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_filter_status_live(self, api_url, client):
        r = client.get(f"{api_url}/matches", params={"status": "live"})
        assert r.status_code == 200
        for m in r.json():
            assert m["status"] == "live"

    def test_filter_category_wtt(self, api_url, client):
        r = client.get(f"{api_url}/matches", params={"category": "WTT"})
        assert r.status_code == 200
        for m in r.json():
            assert m["competition_category"] == "WTT"

    def test_live_matches_endpoint(self, api_url, client):
        r = client.get(f"{api_url}/matches/live")
        assert r.status_code == 200
        for m in r.json():
            assert m["status"] == "live"

    def test_upcoming_matches(self, api_url, client):
        r = client.get(f"{api_url}/matches/upcoming")
        assert r.status_code == 200
        for m in r.json():
            assert m["status"] == "scheduled"

    def test_get_single_match(self, api_url, client):
        listing = client.get(f"{api_url}/matches").json()
        assert len(listing) > 0
        mid = listing[0]["id"]
        r = client.get(f"{api_url}/matches/{mid}")
        assert r.status_code == 200
        assert r.json()["id"] == mid

    def test_match_404(self, api_url, client):
        r = client.get(f"{api_url}/matches/nope-match")
        assert r.status_code == 404

    def test_h2h(self, api_url, client):
        listing = client.get(f"{api_url}/matches").json()
        m = listing[0]
        r = client.get(f"{api_url}/matches/h2h/{m['player1_id']}/{m['player2_id']}")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1


# ---------- Search ----------
class TestSearch:
    def test_global_search(self, api_url, client):
        r = client.get(f"{api_url}/search", params={"q": "Wang"})
        assert r.status_code == 200
        data = r.json()
        assert "players" in data and "competitions" in data
        assert isinstance(data["players"], list)
        assert _has_no_mongo_id(data)


# ---------- Notifications ----------
class TestNotifications:
    def test_global_notifications_unauth(self, api_url, client):
        r = client.get(f"{api_url}/notifications")
        assert r.status_code == 200
        notes = r.json()
        assert len(notes) >= 1
        assert _has_no_mongo_id(notes)

    def test_notifications_with_auth(self, api_url, auth_client):
        r = auth_client.get(f"{api_url}/notifications")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Favorites ----------
class TestFavorites:
    def test_post_favorite_unauth(self, api_url, client):
        r = client.post(f"{api_url}/favorites", json={"target_type": "player", "target_id": "x"})
        assert r.status_code == 401

    def test_favorite_full_lifecycle(self, api_url, client, auth_client):
        players = client.get(f"{api_url}/players").json()
        pid = players[0]["id"]

        # Create
        r = auth_client.post(
            f"{api_url}/favorites",
            json={"target_type": "player", "target_id": pid},
        )
        assert r.status_code == 200, r.text
        fav = r.json()
        assert fav["target_type"] == "player"
        assert fav["target_id"] == pid

        # List
        r = auth_client.get(f"{api_url}/favorites")
        assert r.status_code == 200
        favs = r.json()
        assert any(f["target_id"] == pid for f in favs)
        assert _has_no_mongo_id(favs)

        # Idempotent re-add
        r = auth_client.post(
            f"{api_url}/favorites",
            json={"target_type": "player", "target_id": pid},
        )
        assert r.status_code == 200

        # Delete
        r = auth_client.delete(f"{api_url}/favorites/player/{pid}")
        assert r.status_code == 200
        assert r.json().get("deleted", 0) >= 1

        # Verify removed
        r = auth_client.get(f"{api_url}/favorites")
        assert all(f["target_id"] != pid for f in r.json())


# ---------- AI (slow tests) ----------
class TestAI:
    def test_ai_chat_and_history(self, api_url, client):
        session_id = f"sess-{uuid.uuid4().hex[:8]}"
        r = requests.post(
            f"{api_url}/ai/chat",
            json={"session_id": session_id, "message": "Bonjour, qui est numero 1 mondial femmes?"},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["session_id"] == session_id
        assert isinstance(data["reply"], str) and len(data["reply"]) > 0

        # History
        r2 = client.get(f"{api_url}/ai/chat/{session_id}/history")
        assert r2.status_code == 200
        msgs = r2.json()
        assert len(msgs) >= 2  # user + assistant
        roles = [m["role"] for m in msgs]
        assert "user" in roles and "assistant" in roles
        assert _has_no_mongo_id(msgs)

    def test_ai_predict(self, api_url, client):
        matches = client.get(f"{api_url}/matches").json()
        mid = matches[0]["id"]
        r = requests.post(f"{api_url}/ai/predict", json={"match_id": mid}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["match_id"] == mid
        assert 0 <= data["player1_win_probability"] <= 1
        assert 0 <= data["player2_win_probability"] <= 1
        assert isinstance(data["reasoning"], str) and len(data["reasoning"]) > 0
        assert isinstance(data["predicted_score"], str)

    def test_ai_predict_404(self, api_url, client):
        r = requests.post(f"{api_url}/ai/predict", json={"match_id": "nope"}, timeout=15)
        assert r.status_code == 404

    def test_ai_summary(self, api_url, client):
        matches = client.get(f"{api_url}/matches").json()
        mid = matches[0]["id"]
        r = requests.get(f"{api_url}/ai/summary/{mid}", timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["match_id"] == mid
        assert isinstance(data["summary"], str) and len(data["summary"]) > 0
        assert isinstance(data["highlights"], list)

    def test_ai_recommendations(self, api_url):
        r = requests.get(f"{api_url}/ai/recommendations", timeout=60)
        assert r.status_code == 200
        data = r.json()
        assert "recommendations" in data
        assert isinstance(data["recommendations"], str)
        assert len(data["recommendations"]) > 0
