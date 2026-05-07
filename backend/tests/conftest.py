"""Shared fixtures for TT Pro backend tests."""
import os
import uuid
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load frontend env to get the public URL
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_url():
    return API


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def test_user():
    """Create a fresh registered user once per session."""
    email = f"tester+{uuid.uuid4().hex[:8]}@ttpro.app"
    password = "TtPro2026!"
    name = "Tester"
    r = requests.post(
        f"{API}/auth/register",
        json={"email": email, "password": password, "name": name},
        timeout=15,
    )
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    return {
        "email": email,
        "password": password,
        "name": name,
        "token": data["access_token"],
        "user": data["user"],
    }


@pytest.fixture
def auth_client(test_user):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {test_user['token']}",
    })
    return s


@pytest.fixture(scope="session")
def admin_user():
    """Login as the seeded admin user."""
    r = requests.post(
        f"{API}/auth/login",
        json={"email": "admin@ttpro.app", "password": "Admin2026!"},
        timeout=15,
    )
    if r.status_code != 200:
        pytest.skip(f"admin login failed: {r.status_code} {r.text}")
    data = r.json()
    return {
        "email": "admin@ttpro.app",
        "token": data["access_token"],
        "user": data["user"],
    }


@pytest.fixture
def admin_client(admin_user):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_user['token']}",
    })
    return s
