"""TT Pro - Main FastAPI server."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from models import (
    UserCreate, UserLogin, UserPublic, TokenResponse,
    Player, Competition, Match,
    FavoriteCreate, Favorite, Notification,
    ChatMessage, ChatResponse,
    PredictionRequest, PredictionResponse, SummaryResponse,
)
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user_id, get_current_user_id_optional,
)
from seed_data import seed_database
from ai_service import chat_reply, predict_match, summarize_match, recommend_for_user

# DB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="TT Pro API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------- Health ----------
@api.get("/")
async def root():
    return {"app": "TT Pro", "status": "ok"}


@api.get("/health")
async def health():
    return {"status": "ok", "ts": datetime.now(timezone.utc).isoformat()}


# ---------- Auth ----------
@api.post("/auth/register", response_model=TokenResponse)
async def register(body: UserCreate):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    import uuid
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": body.email.lower(),
        "name": body.name,
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id)
    public = UserPublic(id=user_id, email=doc['email'], name=doc['name'], created_at=doc['created_at'])
    return TokenResponse(access_token=token, user=public)


@api.post("/auth/login", response_model=TokenResponse)
async def login(body: UserLogin):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not verify_password(body.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user['id'])
    public = UserPublic(id=user['id'], email=user['email'], name=user['name'], created_at=user['created_at'])
    return TokenResponse(access_token=token, user=public)


@api.get("/auth/me", response_model=UserPublic)
async def me(user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserPublic(**user)


# ---------- Players ----------
@api.get("/players", response_model=List[Player])
async def list_players(
    country: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
):
    q = {}
    if country:
        q['country_code'] = country.upper()
    if search:
        q['name'] = {"$regex": search, "$options": "i"}
    docs = await db.players.find(q, {"_id": 0}).sort("rank_world", 1).to_list(limit)
    return docs


@api.get("/players/{player_id}", response_model=Player)
async def get_player(player_id: str):
    p = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Player not found")
    return p


@api.get("/players/{player_id}/matches", response_model=List[Match])
async def player_matches(player_id: str, limit: int = 20):
    docs = await db.matches.find({"$or": [{"player1_id": player_id}, {"player2_id": player_id}]}, {"_id": 0}).sort("scheduled_at", -1).to_list(limit)
    return docs


# ---------- Competitions ----------
@api.get("/competitions", response_model=List[Competition])
async def list_competitions(
    category: Optional[str] = None,
    level: Optional[str] = None,
    search: Optional[str] = None,
):
    q = {}
    if category:
        q['category'] = category
    if level:
        q['level'] = level
    if search:
        q['name'] = {"$regex": search, "$options": "i"}
    docs = await db.competitions.find(q, {"_id": 0}).sort("start_date", 1).to_list(100)
    return docs


@api.get("/competitions/{comp_id}", response_model=Competition)
async def get_competition(comp_id: str):
    c = await db.competitions.find_one({"id": comp_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Competition not found")
    return c


@api.get("/competitions/{comp_id}/matches", response_model=List[Match])
async def competition_matches(comp_id: str):
    docs = await db.matches.find({"competition_id": comp_id}, {"_id": 0}).sort("scheduled_at", 1).to_list(200)
    return docs


# ---------- Matches ----------
@api.get("/matches", response_model=List[Match])
async def list_matches(
    status: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
):
    q = {}
    if status:
        q['status'] = status
    if category:
        q['competition_category'] = category
    docs = await db.matches.find(q, {"_id": 0}).sort("scheduled_at", -1).to_list(limit)
    return docs


@api.get("/matches/live", response_model=List[Match])
async def live_matches():
    docs = await db.matches.find({"status": "live"}, {"_id": 0}).to_list(50)
    return docs


@api.get("/matches/upcoming", response_model=List[Match])
async def upcoming_matches(limit: int = 20):
    now = datetime.now(timezone.utc).isoformat()
    docs = await db.matches.find(
        {"status": "scheduled", "scheduled_at": {"$gte": now}},
        {"_id": 0},
    ).sort("scheduled_at", 1).to_list(limit)
    return docs


@api.get("/matches/{match_id}", response_model=Match)
async def get_match(match_id: str):
    m = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not m:
        raise HTTPException(404, "Match not found")
    return m


@api.get("/matches/h2h/{p1_id}/{p2_id}", response_model=List[Match])
async def head_to_head(p1_id: str, p2_id: str):
    q = {
        "$or": [
            {"player1_id": p1_id, "player2_id": p2_id},
            {"player1_id": p2_id, "player2_id": p1_id},
        ]
    }
    docs = await db.matches.find(q, {"_id": 0}).sort("scheduled_at", -1).to_list(50)
    return docs


# ---------- Favorites ----------
@api.get("/favorites", response_model=List[Favorite])
async def list_favorites(user_id: str = Depends(get_current_user_id)):
    docs = await db.favorites.find({"user_id": user_id}, {"_id": 0}).to_list(200)
    return docs


@api.post("/favorites", response_model=Favorite)
async def add_favorite(body: FavoriteCreate, user_id: str = Depends(get_current_user_id)):
    existing = await db.favorites.find_one({
        "user_id": user_id,
        "target_type": body.target_type,
        "target_id": body.target_id,
    }, {"_id": 0})
    if existing:
        return Favorite(**existing)
    fav = Favorite(user_id=user_id, target_type=body.target_type, target_id=body.target_id)
    await db.favorites.insert_one(fav.model_dump())
    return fav


@api.delete("/favorites/{target_type}/{target_id}")
async def remove_favorite(target_type: str, target_id: str, user_id: str = Depends(get_current_user_id)):
    result = await db.favorites.delete_one({
        "user_id": user_id, "target_type": target_type, "target_id": target_id,
    })
    return {"deleted": result.deleted_count}


# ---------- Search ----------
@api.get("/search")
async def search(q: str = Query(..., min_length=1)):
    regex = {"$regex": q, "$options": "i"}
    players = await db.players.find({"name": regex}, {"_id": 0}).limit(10).to_list(10)
    comps = await db.competitions.find({"name": regex}, {"_id": 0}).limit(10).to_list(10)
    return {"players": players, "competitions": comps}


# ---------- Notifications ----------
@api.get("/notifications", response_model=List[Notification])
async def list_notifications(user_id: Optional[str] = Depends(get_current_user_id_optional)):
    q = {"user_id": None}
    if user_id:
        q = {"$or": [{"user_id": None}, {"user_id": user_id}]}
    docs = await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).to_list(50)
    return docs


# ---------- AI ----------
@api.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(body: ChatMessage):
    # store messages
    await db.chat_messages.insert_one({
        "session_id": body.session_id,
        "role": "user",
        "content": body.message,
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    try:
        reply = await chat_reply(body.session_id, body.message)
    except Exception as e:
        logger.exception("chat error")
        raise HTTPException(500, f"AI chat failed: {str(e)}")
    await db.chat_messages.insert_one({
        "session_id": body.session_id,
        "role": "assistant",
        "content": reply,
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    return ChatResponse(session_id=body.session_id, reply=reply)


@api.get("/ai/chat/{session_id}/history")
async def chat_history(session_id: str):
    docs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("ts", 1).to_list(200)
    return docs


@api.post("/ai/predict", response_model=PredictionResponse)
async def ai_predict(body: PredictionRequest):
    match = await db.matches.find_one({"id": body.match_id}, {"_id": 0})
    if not match:
        raise HTTPException(404, "Match not found")
    p1 = await db.players.find_one({"id": match['player1_id']}, {"_id": 0})
    p2 = await db.players.find_one({"id": match['player2_id']}, {"_id": 0})
    if not p1 or not p2:
        raise HTTPException(404, "Players not found")
    # cache predictions in db
    cached = await db.predictions.find_one({"match_id": body.match_id}, {"_id": 0})
    if cached:
        return PredictionResponse(**cached)
    try:
        data = await predict_match(match, p1, p2)
    except Exception as e:
        logger.exception("predict error")
        raise HTTPException(500, f"Prediction failed: {str(e)}")
    record = {"match_id": body.match_id, **data}
    await db.predictions.insert_one(record.copy())
    return PredictionResponse(match_id=body.match_id, **data)


@api.get("/ai/summary/{match_id}", response_model=SummaryResponse)
async def ai_summary(match_id: str):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(404, "Match not found")
    cached = await db.summaries.find_one({"match_id": match_id}, {"_id": 0})
    if cached:
        return SummaryResponse(**cached)
    p1 = await db.players.find_one({"id": match['player1_id']}, {"_id": 0})
    p2 = await db.players.find_one({"id": match['player2_id']}, {"_id": 0})
    try:
        data = await summarize_match(match, p1, p2)
    except Exception as e:
        logger.exception("summary error")
        raise HTTPException(500, f"Summary failed: {str(e)}")
    record = {"match_id": match_id, **data}
    await db.summaries.insert_one(record.copy())
    return SummaryResponse(match_id=match_id, **data)


@api.get("/ai/recommendations")
async def ai_recommendations(user_id: Optional[str] = Depends(get_current_user_id_optional)):
    favs_targets: list[str] = []
    if user_id:
        favs = await db.favorites.find({"user_id": user_id}, {"_id": 0}).to_list(50)
        for f in favs:
            if f['target_type'] == 'player':
                p = await db.players.find_one({"id": f['target_id']}, {"_id": 0})
                if p:
                    favs_targets.append(p['name'])
            else:
                c = await db.competitions.find_one({"id": f['target_id']}, {"_id": 0})
                if c:
                    favs_targets.append(c['name'])
    upcoming = await db.matches.find({"status": "scheduled"}, {"_id": 0}).sort("scheduled_at", 1).to_list(8)
    try:
        text = await recommend_for_user(favs_targets, upcoming)
    except Exception as e:
        logger.exception("reco error")
        raise HTTPException(500, f"Recommendation failed: {str(e)}")
    return {"recommendations": text}


# ---------- Stats ----------
@api.get("/stats/overview")
async def stats_overview():
    return {
        "players": await db.players.count_documents({}),
        "competitions": await db.competitions.count_documents({}),
        "matches": await db.matches.count_documents({}),
        "live_matches": await db.matches.count_documents({"status": "live"}),
    }


# Mount router
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    result = await seed_database(db)
    logger.info("Seed result: %s", result)
    # default global notifications
    if await db.notifications.count_documents({}) == 0:
        from models import Notification as N
        notes = [
            N(title="WTT Champions Frankfurt commence !", body="Suivez les meilleurs joueurs en direct.", type="tournament_start").model_dump(),
            N(title="Felix Lebrun en quart de finale", body="Match crucial ce soir 20h.", type="match_start").model_dump(),
            N(title="Sun Yingsha en tête du classement", body="La numéro 1 mondiale conserve sa place.", type="ranking_update").model_dump(),
        ]
        await db.notifications.insert_many(notes)


@app.on_event("shutdown")
async def shutdown():
    client.close()
