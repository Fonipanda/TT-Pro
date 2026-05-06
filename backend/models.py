"""Pydantic models for TT Pro platform."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid


def _uid() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


# ---------- Player ----------
class Player(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uid)
    name: str
    country: str
    country_code: str  # ISO2 (FR, CN, JP...)
    flag: str  # emoji flag
    rank_world: Optional[int] = None
    rank_national: Optional[int] = None
    points: Optional[int] = None
    handedness: Optional[str] = None  # right / left
    style: Optional[str] = None
    birth_year: Optional[int] = None
    photo_url: Optional[str] = None
    bio: Optional[str] = None
    recent_form: List[str] = Field(default_factory=list)  # ['W','W','L','W','L']


# ---------- Competition ----------
class Competition(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uid)
    name: str
    short_name: str
    category: str  # WTT, ITTF, France, Bundesliga, CSL, ChampionsLeague
    level: str  # international, national, league
    country: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    start_date: str
    end_date: str
    venue: Optional[str] = None
    description: Optional[str] = None


# ---------- Match ----------
class Rubber(BaseModel):
    """Individual rubber inside a team match."""
    player1_name: str
    player2_name: str
    score_p1: int  # games won
    score_p2: int
    sets: List[List[int]] = Field(default_factory=list)  # [[11,9],[7,11]]


class Match(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uid)
    competition_id: str
    competition_name: str
    competition_category: str
    round_name: str  # "Quarter Final", "Round of 16", "Final", "Group Stage"
    match_type: str = "individual"  # "individual" or "team"
    gender: str = "men"  # "men" or "women"
    player1_id: str
    player1_name: str
    player1_country: str
    player1_flag: str
    player2_id: str
    player2_name: str
    player2_country: str
    player2_flag: str
    status: Literal["scheduled", "live", "finished"]
    scheduled_at: str
    sets: List[List[int]] = Field(default_factory=list)
    score_p1: int = 0
    score_p2: int = 0
    current_set_p1: int = 0
    current_set_p2: int = 0
    serving: Optional[int] = None
    stream_url: Optional[str] = None
    venue: Optional[str] = None
    rubbers: List[Rubber] = Field(default_factory=list)  # for team matches


# ---------- Favorite ----------
class FavoriteCreate(BaseModel):
    target_type: Literal["player", "competition"]
    target_id: str

class Favorite(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uid)
    user_id: str
    target_type: str
    target_id: str
    created_at: str = Field(default_factory=_now_iso)


# ---------- Notification ----------
class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uid)
    user_id: Optional[str] = None  # None = global
    title: str
    body: str
    type: str  # match_start, score_update, tournament_start
    related_id: Optional[str] = None
    read: bool = False
    created_at: str = Field(default_factory=_now_iso)


# ---------- AI ----------
class ChatMessage(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    session_id: str
    reply: str

class PredictionRequest(BaseModel):
    match_id: str

class PredictionResponse(BaseModel):
    match_id: str
    player1_win_probability: float
    player2_win_probability: float
    predicted_score: str
    reasoning: str

class SummaryResponse(BaseModel):
    match_id: str
    summary: str
    highlights: List[str]
