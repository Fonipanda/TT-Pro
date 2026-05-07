"""Iteration 4 tests: FFTT, Web Push, Bracket Predictor, admin auth, rate limiting."""
import time
import uuid
import pytest
import requests


def _no_id(obj):
    if isinstance(obj, dict):
        if "_id" in obj:
            return False
        return all(_no_id(v) for v in obj.values())
    if isinstance(obj, list):
        return all(_no_id(v) for v in obj)
    return True


# ---------- Admin Auth ----------
class TestAdminAuth:
    def test_admin_login_admin_role(self, api_url, client):
        r = client.post(f"{api_url}/auth/login",
                        json={"email": "admin@ttpro.app", "password": "Admin2026!"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "admin"

    def test_tester_login_admin_role(self, api_url, client):
        r = client.post(f"{api_url}/auth/login",
                        json={"email": "tester@ttpro.app", "password": "TtPro2026!"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "admin", "tester should be promoted to admin"

    def test_register_default_role_user(self, api_url, client):
        email = f"newuser+{uuid.uuid4().hex[:8]}@ttpro.app"
        r = client.post(f"{api_url}/auth/register",
                        json={"email": email, "password": "TtPro2026!", "name": "New"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "user"


# ---------- FFTT ----------
class TestFFTT:
    def test_fftt_status_unconfigured(self, api_url, client):
        r = client.get(f"{api_url}/sync/fftt/status")
        assert r.status_code == 200
        data = r.json()
        assert data.get("configured") is False
        assert data.get("base_url") == "https://www.fftt.com/mobile/pxml"
        assert "FFTT_API_ID" in data.get("needed_env_vars", [])
        assert "FFTT_API_KEY" in data.get("needed_env_vars", [])

    def test_fftt_club_graceful_degradation(self, api_url, client):
        r = client.get(f"{api_url}/sync/fftt/club/08940210")
        # Must NOT 500 — graceful error
        assert r.status_code == 200, r.text
        data = r.json()
        assert "error" in data
        # Either credentials_missing_or_endpoint_unreachable or credentials_required
        assert data.get("configured") is False

    def test_fftt_proab_graceful(self, api_url, client):
        r = client.get(f"{api_url}/sync/fftt/proab/proa_h")
        assert r.status_code == 200
        data = r.json()
        assert "error" in data
        if data.get("error") == "credentials_required":
            assert "needed_env_vars" in data


# ---------- Push ----------
class TestPush:
    def test_public_key_unconfigured(self, api_url, client):
        r = client.get(f"{api_url}/push/public-key")
        assert r.status_code == 200
        data = r.json()
        assert data.get("configured") is False
        assert data.get("public_key") is None

    def test_subscribe_no_auth(self, api_url, client):
        endpoint = f"https://test.push/endpoint-{uuid.uuid4().hex[:8]}"
        body = {
            "endpoint": endpoint,
            "keys": {"p256dh": "fakeP256dh", "auth": "fakeAuth"},
        }
        r = client.post(f"{api_url}/push/subscribe", json=body)
        assert r.status_code == 200, r.text
        # Unsubscribe to cleanup
        r2 = client.post(f"{api_url}/push/unsubscribe", json={"endpoint": endpoint})
        assert r2.status_code == 200

    def test_unsubscribe_missing_endpoint(self, api_url, client):
        r = client.post(f"{api_url}/push/unsubscribe", json={})
        assert r.status_code == 400

    def test_send_requires_auth(self, api_url, client):
        r = client.post(f"{api_url}/push/send", json={"title": "x", "body": "y"})
        assert r.status_code == 401

    def test_send_requires_admin(self, api_url, auth_client):
        # auth_client is a normal user
        r = auth_client.post(f"{api_url}/push/send", json={"title": "x", "body": "y"})
        assert r.status_code == 403

    def test_send_admin_unconfigured(self, api_url, admin_client):
        r = admin_client.post(f"{api_url}/push/send", json={"title": "x", "body": "y"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("configured") is False


# ---------- Admin gate on WTT import ----------
class TestWttImportAuth:
    def test_import_requires_auth(self, api_url, client):
        r = client.post(f"{api_url}/sync/wtt/import/wtt-smash-singapore-2026")
        assert r.status_code == 401

    def test_import_requires_admin(self, api_url, auth_client):
        r = auth_client.post(f"{api_url}/sync/wtt/import/wtt-smash-singapore-2026")
        assert r.status_code == 403

    def test_import_admin_ok(self, api_url, admin_client):
        r = admin_client.post(f"{api_url}/sync/wtt/import/wtt-smash-singapore-2026", timeout=45)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("event_id", "inserted", "updated"):
            assert k in data

    def test_sync_wtt_no_auth_still_works(self, api_url, client):
        # Periodic poll endpoint should NOT require auth
        r = client.post(f"{api_url}/sync/wtt", timeout=30)
        assert r.status_code == 200
        assert r.json().get("synced") is True


# ---------- Rate limiting ----------
class TestRateLimit:
    def test_sync_wtt_rate_limit(self, api_url, client):
        """12/min/IP — 13th call within 60s should be 429."""
        # Issue 13 fast calls
        statuses = []
        for i in range(13):
            r = client.post(f"{api_url}/sync/wtt", timeout=15)
            statuses.append(r.status_code)
            if r.status_code == 429:
                break
        # We must have hit 429 by call 13
        assert 429 in statuses, f"expected 429 in 13 calls, got {statuses}"


# ---------- Bracket Predictor ----------
class TestBracketPredictor:
    def test_eval_empty_predictions_400(self, api_url, client):
        r = client.post(f"{api_url}/bracket-predictor/eval",
                        json={"competition_name": "Test", "predictions": []})
        assert r.status_code == 400

    def test_eval_with_predictions(self, api_url, client):
        body = {
            "competition_name": "Test Tournament",
            "predictions": [
                {"round": "Quarter Final", "player1": "Lebrun Felix", "player2": "Wang Chuqin",
                 "picked_winner": "Wang Chuqin", "predicted_score": "4-2"},
                {"round": "Semi Final", "player1": "Wang Chuqin", "player2": "Lin Shidong",
                 "picked_winner": "Wang Chuqin", "predicted_score": "4-3"},
            ],
        }
        r = requests.post(f"{api_url}/bracket-predictor/eval", json=body, timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("overall_score", "expert_picks", "agreement_count", "summary"):
            assert k in data, f"missing {k}"
        assert isinstance(data["expert_picks"], list)
        assert isinstance(data["summary"], str) and len(data["summary"]) > 0
        assert _no_id(data)

    def test_save_requires_auth(self, api_url, client):
        r = client.post(f"{api_url}/bracket-predictor/save",
                        json={"competition_name": "X", "predictions": []})
        assert r.status_code == 401

    def test_save_and_mine(self, api_url, auth_client):
        body = {
            "competition_id": "wtt-smash-singapore-2026",
            "competition_name": "Singapore Smash",
            "predictions": [{"round": "Final", "player1": "A", "player2": "B",
                             "picked_winner": "A"}],
            "ai_evaluation": {"overall_score": 75, "summary": "ok"},
        }
        r = auth_client.post(f"{api_url}/bracket-predictor/save", json=body)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["competition_id"] == "wtt-smash-singapore-2026"
        assert "id" in doc
        assert _no_id(doc)

        r2 = auth_client.get(f"{api_url}/bracket-predictor/mine")
        assert r2.status_code == 200
        mine = r2.json()
        assert isinstance(mine, list)
        assert any(d["id"] == doc["id"] for d in mine)
        assert _no_id(mine)

    def test_mine_requires_auth(self, api_url, client):
        r = client.get(f"{api_url}/bracket-predictor/mine")
        assert r.status_code == 401


# ---------- Competitions count + WTT mapping ----------
class TestCompetitionsCount:
    def test_total_competitions_40(self, api_url, client):
        r = client.get(f"{api_url}/stats/overview")
        assert r.status_code == 200
        data = r.json()
        assert data["competitions"] >= 40, f"expected >=40, got {data['competitions']}"

    def test_wtt_mapped_count(self, api_url, client):
        r = client.get(f"{api_url}/competitions")
        assert r.status_code == 200
        comps = r.json()
        mapped = [c for c in comps if c.get("wtt_event_id")]
        assert len(mapped) >= 23, f"expected >=23 wtt-mapped, got {len(mapped)}"

    def test_new_wtt_events_present(self, api_url, client):
        r = client.get(f"{api_url}/competitions")
        assert r.status_code == 200
        comps = r.json()
        ids = {c["id"] for c in comps}
        # Check at least a few of the new events
        # (using flexible matching since we don't know exact ids)
        names = " ".join(c.get("name", "").lower() for c in comps)
        for keyword in ["chennai", "foz", "lagos", "muscat"]:
            assert keyword in names, f"new event '{keyword}' missing"
