from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, WebSocket, WebSocketDisconnect
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import secrets
import uuid
import json
import asyncio
import httpx
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import bcrypt
import jwt
import hashlib

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ.get("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@tripsync.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---- Password & JWT helpers ----
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    return jwt.encode({"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

def serialize_user(user: dict) -> dict:
    u = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    u["id"] = str(user["_id"]) if "_id" in user else user.get("id", "")
    if "created_at" in u and isinstance(u["created_at"], datetime):
        u["created_at"] = u["created_at"].isoformat()
    return u

# ---- Pydantic models ----
class RegisterInput(BaseModel):
    name: str
    email: str
    password: str

class LoginInput(BaseModel):
    email: str
    password: str

class TripCreate(BaseModel):
    name: str
    trip_type: str = "weekend"
    description: str = ""
    group_size: int = 4
    per_person_budget: float = 500
    currency: str = "EUR"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    flexible_dates: bool = True

class DateRangeItem(BaseModel):
    start: str
    end: str

class PreferencesInput(BaseModel):
    departure_city: str = ""
    return_city: str = ""
    same_return_city: bool = True
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    flexible_dates: bool = True
    duration_days: int = 3
    max_budget: float = 500
    transport_types: List[str] = []
    destination_types: List[str] = []
    weather_preference: str = "any"
    accommodation_type: str = "any"
    travel_pace: str = "moderate"
    hard_constraints: List[str] = []
    nice_to_haves: List[str] = []
    passport_constraint: str = "none"
    long_distance_ok: bool = True
    departure_time_preference: str = "flexible"
    return_time_preference: str = "flexible"
    available_dates: List[str] = []
    date_ranges: List[DateRangeItem] = []

class VoteInput(BaseModel):
    destination_id: str
    score: int = 1
    comment: str = ""

class CommentInput(BaseModel):
    text: str
    parent_id: Optional[str] = None

class ChatMessageInput(BaseModel):
    message: str
    trip_id: Optional[str] = None

class DealAlertInput(BaseModel):
    trip_id: str
    destination_id: str
    max_budget: float
    currency: str = "EUR"

# ---- AUTH ROUTES ----
@api_router.post("/auth/register")
async def register(input: RegisterInput, response: Response):
    email = input.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "name": input.name, "email": email,
        "password_hash": hash_password(input.password),
        "role": "user", "created_at": datetime.now(timezone.utc),
        "avatar_url": ""
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    access = create_access_token(str(result.inserted_id), email)
    refresh = create_refresh_token(str(result.inserted_id))
    set_auth_cookies(response, access, refresh)
    return {**serialize_user(user_doc), "access_token": access}

@api_router.post("/auth/login")
async def login(input: LoginInput, response: Response):
    email = input.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access = create_access_token(str(user["_id"]), email)
    refresh = create_refresh_token(str(user["_id"]))
    set_auth_cookies(response, access, refresh)
    return {**serialize_user(user), "access_token": access}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return serialize_user({"_id": ObjectId(user["_id"]) if isinstance(user["_id"], str) else user["_id"], **{k: v for k, v in user.items() if k != "_id"}})

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        set_auth_cookies(response, access, token)
        return {"access_token": access}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ---- GOOGLE OAUTH (Emergent-managed) ----
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.post("/auth/google/session")
async def google_oauth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    # Call Emergent Auth to exchange session_id for user data
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google session")
    data = resp.json()
    email = data.get("email", "").lower().strip()
    name = data.get("name", "")
    picture = data.get("picture", "")
    # Upsert user
    existing = await db.users.find_one({"email": email})
    if existing:
        await db.users.update_one({"email": email}, {"$set": {"name": name, "avatar_url": picture, "auth_provider": "google"}})
        user_id = str(existing["_id"])
    else:
        user_doc = {
            "email": email, "name": name, "avatar_url": picture,
            "password_hash": "", "role": "user", "auth_provider": "google",
            "created_at": datetime.now(timezone.utc)
        }
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return {**serialize_user(user), "access_token": access}

# ---- WEBSOCKET MANAGER ----
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, trip_id: str):
        await websocket.accept()
        if trip_id not in self.active_connections:
            self.active_connections[trip_id] = []
        self.active_connections[trip_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, trip_id: str):
        if trip_id in self.active_connections:
            self.active_connections[trip_id] = [c for c in self.active_connections[trip_id] if c != websocket]
    
    async def broadcast(self, trip_id: str, message: dict):
        if trip_id in self.active_connections:
            dead = []
            for conn in self.active_connections[trip_id]:
                try:
                    await conn.send_json(message)
                except Exception:
                    dead.append(conn)
            for d in dead:
                self.active_connections[trip_id].remove(d)

ws_manager = ConnectionManager()

@app.websocket("/ws/trip/{trip_id}")
async def websocket_endpoint(websocket: WebSocket, trip_id: str):
    await ws_manager.connect(websocket, trip_id)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg["timestamp"] = datetime.now(timezone.utc).isoformat()
            await ws_manager.broadcast(trip_id, msg)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, trip_id)

# Helper to broadcast updates
async def notify_trip(trip_id: str, event_type: str, data: dict = None):
    await ws_manager.broadcast(trip_id, {"type": event_type, "data": data or {}, "timestamp": datetime.now(timezone.utc).isoformat()})

# ---- STRIPE PAYMENT ----
class PaymentCreateInput(BaseModel):
    trip_id: str
    origin_url: str

class PaymentStatusInput(BaseModel):
    session_id: str

# ---- TRIP ROUTES ----
@api_router.post("/trips")
async def create_trip(input: TripCreate, user=Depends(get_current_user)):
    invite_code = secrets.token_urlsafe(8)
    trip_doc = {
        "name": input.name, "trip_type": input.trip_type,
        "description": input.description, "group_size": input.group_size,
        "per_person_budget": input.per_person_budget, "currency": input.currency,
        "start_date": input.start_date, "end_date": input.end_date,
        "flexible_dates": input.flexible_dates,
        "owner_id": user["_id"], "owner_name": user.get("name", ""),
        "invite_code": invite_code, "status": "planning",
        "participants": [{"user_id": user["_id"], "name": user.get("name", ""), "status": "joined", "preferences_submitted": False}],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.trips.insert_one(trip_doc)
    trip_doc.pop("_id", None)
    trip_doc["id"] = str(result.inserted_id)
    return trip_doc

@api_router.get("/trips")
async def get_trips(user=Depends(get_current_user)):
    cursor = db.trips.find({"participants.user_id": user["_id"]}, {"_id": 1, "name": 1, "trip_type": 1, "status": 1, "participants": 1, "created_at": 1, "per_person_budget": 1, "invite_code": 1, "owner_id": 1, "start_date": 1, "end_date": 1, "group_size": 1, "currency": 1})
    trips = []
    async for t in cursor:
        t["id"] = str(t.pop("_id"))
        trips.append(t)
    return trips

@api_router.get("/trips/{trip_id}")
async def get_trip(trip_id: str, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip["id"] = str(trip.pop("_id"))

    # Compute readiness score
    participants = trip.get("participants", [])
    prefs = await db.preferences.find({"trip_id": trip_id}, {"_id": 0}).to_list(100)
    votes = await db.votes.find({"trip_id": trip_id}, {"_id": 0}).to_list(200)
    budget_items = await db.budget_items.find({"trip_id": trip_id}, {"_id": 0}).to_list(200)

    checks = {
        "has_participants": len(participants) >= 2,
        "all_prefs_submitted": len(prefs) >= len(participants) and len(prefs) > 0,
        "has_dates_locked": trip.get("locked_dates") is not None,
        "has_votes": len(votes) > 0,
        "has_budget_items": len(budget_items) > 0,
        "has_destination": trip.get("status") in ["booked", "completed"] or len(votes) > 0,
    }
    readiness_pct = round(sum(checks.values()) / max(len(checks), 1) * 100)

    # Determine current phase
    if trip.get("status") in ["booked", "completed"]:
        phase = "booked"
    elif trip.get("locked_dates"):
        phase = "dates_locked"
    elif len(votes) > 0:
        phase = "voting"
    elif len(prefs) > 0:
        phase = "preferences"
    else:
        phase = "setup"

    # Next action
    if not checks["has_participants"]:
        next_action = "Invite friends to join the trip"
    elif not checks["all_prefs_submitted"]:
        next_action = f"{len(participants) - len(prefs)} participants haven't submitted preferences yet"
    elif not checks["has_dates_locked"]:
        next_action = "Check availability and lock travel dates"
    elif not checks["has_votes"]:
        next_action = "Vote on destinations"
    elif not checks["has_budget_items"]:
        next_action = "Start tracking your budget"
    else:
        next_action = "Trip is ready! Time to book."

    # Get winning destination if voted
    winning_dest = None
    if votes:
        tally = {}
        for v in votes:
            tally[v.get("destination_id", "")] = tally.get(v.get("destination_id", ""), 0) + v.get("score", 0)
        if tally:
            winner_id = max(tally, key=tally.get)
            winner_doc = await db.destinations.find_one({"id": winner_id}, {"_id": 0, "id": 1, "name": 1, "image": 1, "country": 1})
            if winner_doc:
                winning_dest = winner_doc

    trip["readiness"] = {
        "score": readiness_pct,
        "checks": checks,
        "phase": phase,
        "next_action": next_action,
        "prefs_count": len(prefs),
        "votes_count": len(votes),
        "budget_items_count": len(budget_items),
        "winning_destination": winning_dest
    }
    return trip

@api_router.post("/trips/join/{invite_code}")
async def join_trip(invite_code: str, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"invite_code": invite_code})
    if not trip:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    existing = [p for p in trip.get("participants", []) if p["user_id"] == user["_id"]]
    if existing:
        trip["id"] = str(trip.pop("_id"))
        return trip
    await db.trips.update_one({"_id": trip["_id"]}, {"$push": {"participants": {"user_id": user["_id"], "name": user.get("name", ""), "status": "joined", "preferences_submitted": False}}})
    trip = await db.trips.find_one({"_id": trip["_id"]})
    trip_id_str = str(trip["_id"])
    trip["id"] = str(trip.pop("_id"))
    await notify_trip(trip_id_str, "participant_joined", {"user_name": user.get("name", "")})
    # Create notification for trip owner
    if trip.get("owner_id"):
        await create_notification(trip.get("owner_id"), "New participant!", f"{user.get('name','')} joined your trip", trip_id_str, "participant")
    return trip

@api_router.get("/trips/invite/{invite_code}")
async def get_trip_by_invite(invite_code: str):
    trip = await db.trips.find_one({"invite_code": invite_code}, {"_id": 1, "name": 1, "trip_type": 1, "owner_name": 1, "participants": 1, "group_size": 1})
    if not trip:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    trip["id"] = str(trip.pop("_id"))
    return trip

# ---- PREFERENCES ----
@api_router.post("/trips/{trip_id}/preferences")
async def submit_preferences(trip_id: str, input: PreferencesInput, user=Depends(get_current_user)):
    pref_doc = {
        "trip_id": trip_id, "user_id": user["_id"], "user_name": user.get("name", ""),
        **input.model_dump(), "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    await db.preferences.update_one(
        {"trip_id": trip_id, "user_id": user["_id"]},
        {"$set": pref_doc}, upsert=True
    )
    await db.trips.update_one(
        {"_id": ObjectId(trip_id), "participants.user_id": user["_id"]},
        {"$set": {"participants.$.preferences_submitted": True}}
    )
    await notify_trip(trip_id, "preferences_updated", {"user_name": user.get("name", "")})
    return {"message": "Preferences saved"}

@api_router.get("/trips/{trip_id}/preferences")
async def get_preferences(trip_id: str, user=Depends(get_current_user)):
    prefs = await db.preferences.find({"trip_id": trip_id}, {"_id": 0}).to_list(100)
    return prefs

@api_router.get("/trips/{trip_id}/my-preferences")
async def get_my_preferences(trip_id: str, user=Depends(get_current_user)):
    pref = await db.preferences.find_one({"trip_id": trip_id, "user_id": user["_id"]}, {"_id": 0})
    return pref or {}

# ---- DESTINATIONS (seeded) ----
@api_router.get("/destinations")
async def get_destinations():
    dests = await db.destinations.find({}, {"_id": 0}).to_list(100)
    return dests

@api_router.get("/destinations/{dest_id}")
async def get_destination(dest_id: str):
    dest = await db.destinations.find_one({"id": dest_id}, {"_id": 0})
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    return dest

# ---- MATCHING ENGINE ----
def calc_match_score(destination: dict, prefs_list: list, trip: dict) -> dict:
    if not prefs_list:
        return {"overall": 70, "budget": 70, "date_fit": 70, "convenience": 70, "preference": 70, "time_fit": 70, "notes": ["No preferences submitted yet"], "departure_cities": [], "time_summary": {}}
    scores = {"budget": 0, "preference": 0, "convenience": 0, "date_fit": 70, "time_fit": 0}
    notes = []
    n = len(prefs_list)
    dest_types = set(destination.get("types", []))
    dest_budget = destination.get("avg_budget_per_person", 500)
    
    # Collect departure/return cities for aggregation
    departure_cities = []
    return_cities = []
    dep_times = []
    ret_times = []
    for p in prefs_list:
        if p.get("departure_city"):
            departure_cities.append({"city": p["departure_city"], "user": p.get("user_name", "")})
        rc = p.get("return_city", "") if not p.get("same_return_city", True) else p.get("departure_city", "")
        if rc:
            return_cities.append({"city": rc, "user": p.get("user_name", "")})
        dep_times.append(p.get("departure_time_preference", "flexible"))
        ret_times.append(p.get("return_time_preference", "flexible"))
    
    # Budget scoring
    budget_scores = []
    for p in prefs_list:
        max_b = p.get("max_budget", 1000)
        if dest_budget <= max_b:
            budget_scores.append(100)
        elif dest_budget <= max_b * 1.2:
            budget_scores.append(70)
            notes.append(f"{p.get('user_name','')} might stretch budget slightly")
        else:
            budget_scores.append(30)
            notes.append(f"Over budget for {p.get('user_name','')}")
    scores["budget"] = sum(budget_scores) / n if budget_scores else 50
    
    # Preference scoring
    pref_scores = []
    for p in prefs_list:
        user_types = set(p.get("destination_types", []))
        if not user_types:
            pref_scores.append(70)
        else:
            overlap = len(user_types & dest_types)
            pref_scores.append(min(100, 40 + overlap * 20))
    scores["preference"] = sum(pref_scores) / n if pref_scores else 50
    
    # Convenience scoring (departure + return cities)
    conv_scores = []
    dest_transport_keys = [k.lower() for k in destination.get("transport_from", {}).keys()]
    for p in prefs_list:
        city = p.get("departure_city", "").lower()
        if city in dest_transport_keys:
            conv_scores.append(90)
        elif p.get("long_distance_ok", True):
            conv_scores.append(60)
        else:
            conv_scores.append(30)
            notes.append(f"Far from {p.get('user_name','')}'s departure")
        # Penalize if return city is different and also not convenient
        rc = p.get("return_city", "")
        if rc and not p.get("same_return_city", True) and rc.lower() not in dest_transport_keys:
            conv_scores[-1] = max(20, conv_scores[-1] - 15)
            notes.append(f"{p.get('user_name','')}'s return to {rc} may be complex")
    scores["convenience"] = sum(conv_scores) / n if conv_scores else 50
    
    # Time compatibility scoring
    time_scores = []
    for dt in dep_times:
        if dt == "flexible":
            time_scores.append(100)
        elif dt in ("morning", "afternoon"):
            time_scores.append(90)
        elif dt == "very_early":
            time_scores.append(70)
        else:
            time_scores.append(80)
    for rt in ret_times:
        if rt == "flexible":
            time_scores.append(100)
        elif rt in ("afternoon", "evening"):
            time_scores.append(90)
        else:
            time_scores.append(75)
    scores["time_fit"] = sum(time_scores) / len(time_scores) if time_scores else 70
    
    # Check time conflicts
    non_flex_dep = [t for t in dep_times if t != "flexible"]
    if len(set(non_flex_dep)) > 2 and non_flex_dep:
        notes.append("Group has mixed departure time preferences")
    
    # Find best departure time consensus
    from collections import Counter
    dep_consensus = Counter(dep_times).most_common(1)[0][0] if dep_times else "flexible"
    ret_consensus = Counter(ret_times).most_common(1)[0][0] if ret_times else "flexible"
    time_summary = {"best_departure": dep_consensus, "best_return": ret_consensus, "departure_prefs": dict(Counter(dep_times)), "return_prefs": dict(Counter(ret_times))}
    
    # Hard constraint check
    for p in prefs_list:
        for hc in p.get("hard_constraints", []):
            hc_lower = hc.lower()
            if "no fly" in hc_lower and "plane" in destination.get("main_transport", []):
                scores["convenience"] = max(10, scores["convenience"] - 30)
                notes.append(f"Conflict: {p.get('user_name','')} can't fly")
    
    overall = int(scores["budget"] * 0.20 + scores["preference"] * 0.25 + scores["convenience"] * 0.20 + scores["date_fit"] * 0.15 + scores["time_fit"] * 0.20)
    return {
        "overall": min(100, overall), "budget": int(scores["budget"]),
        "date_fit": int(scores["date_fit"]), "convenience": int(scores["convenience"]),
        "preference": int(scores["preference"]), "time_fit": int(scores["time_fit"]),
        "notes": list(set(notes))[:5],
        "departure_cities": departure_cities, "return_cities": return_cities,
        "time_summary": time_summary
    }

@api_router.get("/trips/{trip_id}/recommendations")
async def get_recommendations(trip_id: str, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    prefs = await db.preferences.find({"trip_id": trip_id}, {"_id": 0}).to_list(100)
    dests = await db.destinations.find({}, {"_id": 0}).to_list(100)
    recommendations = []
    for d in dests:
        score = calc_match_score(d, prefs, trip)
        recommendations.append({**d, "match_score": score})
    recommendations.sort(key=lambda x: x["match_score"]["overall"], reverse=True)
    # Tag best compromise
    if recommendations:
        recommendations[0]["badges"] = ["Best Compromise"]
    return recommendations

# ---- AI SUMMARY ----
@api_router.post("/trips/{trip_id}/ai-summary")
async def get_ai_summary(trip_id: str, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    prefs = await db.preferences.find({"trip_id": trip_id}, {"_id": 0}).to_list(100)
    dests = await db.destinations.find({}, {"_id": 0}).to_list(50)
    recs = []
    for d in dests[:5]:
        score = calc_match_score(d, prefs, trip)
        recs.append({"name": d["name"], "score": score["overall"], "budget": d.get("avg_budget_per_person")})
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY", "")
        if not api_key:
            return {"summary": "AI summary unavailable. Please configure API key.", "error": True}
        chat = LlmChat(api_key=api_key, session_id=f"trip-{trip_id}-{uuid.uuid4().hex[:8]}", system_message="You are TripSync AI, a travel planning assistant. Provide concise, actionable group travel recommendations. Be enthusiastic but practical. Use emojis sparingly.")
        chat.with_model("openai", "gpt-5.2")
        prefs_summary = json.dumps([{"name": p.get("user_name"), "city": p.get("departure_city"), "budget": p.get("max_budget"), "types": p.get("destination_types"), "constraints": p.get("hard_constraints")} for p in prefs], default=str)
        prompt = f"""Analyze this group trip and recommend the best option:

Trip: {trip.get('name')} ({trip.get('trip_type')}) for {len(trip.get('participants', []))} people
Budget target: {trip.get('per_person_budget')} {trip.get('currency', 'EUR')} per person

Participant preferences:
{prefs_summary}

Top scored destinations:
{json.dumps(recs, default=str)}

Provide:
1. Your top recommendation and why
2. Key compromises the group needs to make
3. Budget tips
4. Best dates suggestion
Keep it under 200 words, friendly and decisive."""
        msg = UserMessage(text=prompt)
        response = await chat.send_message(msg)
        return {"summary": response, "error": False}
    except Exception as e:
        logger.error(f"AI summary error: {e}")
        return {"summary": f"Could not generate AI summary: {str(e)}", "error": True}

# ---- VOTING ----
@api_router.post("/trips/{trip_id}/votes")
async def cast_vote(trip_id: str, input: VoteInput, user=Depends(get_current_user)):
    vote_doc = {
        "trip_id": trip_id, "user_id": user["_id"], "user_name": user.get("name", ""),
        "destination_id": input.destination_id, "score": input.score,
        "comment": input.comment, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.votes.update_one(
        {"trip_id": trip_id, "user_id": user["_id"], "destination_id": input.destination_id},
        {"$set": vote_doc}, upsert=True
    )
    await notify_trip(trip_id, "vote_cast", {"user_name": user.get("name", ""), "destination_id": input.destination_id, "score": input.score})
    return {"message": "Vote recorded"}

@api_router.get("/trips/{trip_id}/votes")
async def get_votes(trip_id: str, user=Depends(get_current_user)):
    votes = await db.votes.find({"trip_id": trip_id}, {"_id": 0}).to_list(500)
    return votes

# ---- COMMENTS ----
@api_router.post("/trips/{trip_id}/comments")
async def add_comment(trip_id: str, input: CommentInput, user=Depends(get_current_user)):
    comment = {
        "id": str(uuid.uuid4()), "trip_id": trip_id,
        "user_id": user["_id"], "user_name": user.get("name", ""),
        "text": input.text, "parent_id": input.parent_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment)
    comment.pop("_id", None)
    await notify_trip(trip_id, "new_comment", {"user_name": user.get("name", ""), "text": input.text})
    return comment

@api_router.get("/trips/{trip_id}/comments")
async def get_comments(trip_id: str, user=Depends(get_current_user)):
    comments = await db.comments.find({"trip_id": trip_id}, {"_id": 0}).to_list(500)
    return comments

# ---- ADMIN ----
@api_router.get("/admin/users")
async def admin_get_users(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    users = []
    async for u in db.users.find({}, {"password_hash": 0}):
        u["id"] = str(u.pop("_id"))
        if "created_at" in u and isinstance(u["created_at"], datetime):
            u["created_at"] = u["created_at"].isoformat()
        users.append(u)
    return users

@api_router.get("/admin/trips")
async def admin_get_trips(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    trips = []
    async for t in db.trips.find({}):
        t["id"] = str(t.pop("_id"))
        trips.append(t)
    return trips

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"message": "User deleted"}

# ---- HEALTH ----
@api_router.get("/")
async def root():
    return {"message": "TripSync API", "status": "ok"}

# ---- STRIPE PAYMENT ROUTES ----
@api_router.post("/payments/create-checkout")
async def create_payment_checkout(input_data: PaymentCreateInput, request: Request, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(input_data.trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    # Amount is determined server-side from trip budget
    amount = float(trip.get("per_person_budget", 500))
    currency = trip.get("currency", "EUR").lower()
    origin = input_data.origin_url
    success_url = f"{origin}/trip/{input_data.trip_id}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/trip/{input_data.trip_id}"
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        api_key = os.environ.get("STRIPE_API_KEY", "")
        host_url = str(request.base_url)
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        checkout_req = CheckoutSessionRequest(
            amount=amount, currency=currency,
            success_url=success_url, cancel_url=cancel_url,
            metadata={"trip_id": input_data.trip_id, "user_id": user["_id"], "user_name": user.get("name", ""), "trip_name": trip.get("name", "")}
        )
        session = await stripe_checkout.create_checkout_session(checkout_req)
        # Store payment transaction
        await db.payment_transactions.insert_one({
            "session_id": session.session_id, "trip_id": input_data.trip_id,
            "user_id": user["_id"], "user_name": user.get("name", ""),
            "amount": amount, "currency": currency,
            "payment_status": "pending", "status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"url": session.url, "session_id": session.session_id}
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request, user=Depends(get_current_user)):
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        api_key = os.environ.get("STRIPE_API_KEY", "")
        host_url = str(request.base_url)
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        status = await stripe_checkout.get_checkout_status(session_id)
        # Update transaction
        existing = await db.payment_transactions.find_one({"session_id": session_id})
        if existing and existing.get("payment_status") != "paid":
            new_status = status.payment_status
            update_data = {"payment_status": new_status, "status": status.status, "updated_at": datetime.now(timezone.utc).isoformat()}
            if new_status == "paid":
                update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
            await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update_data})
            # If paid, update trip participant payment status
            if new_status == "paid" and existing:
                trip_id = existing.get("trip_id")
                uid = existing.get("user_id")
                await db.trips.update_one(
                    {"_id": ObjectId(trip_id), "participants.user_id": uid},
                    {"$set": {"participants.$.payment_status": "paid", "participants.$.paid_amount": existing.get("amount", 0)}}
                )
                await notify_trip(trip_id, "payment_received", {"user_name": existing.get("user_name", ""), "amount": existing.get("amount", 0)})
        return {"payment_status": status.payment_status, "status": status.status, "amount_total": status.amount_total, "currency": status.currency}
    except Exception as e:
        logger.error(f"Payment status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        api_key = os.environ.get("STRIPE_API_KEY", "")
        host_url = str(request.base_url)
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        body = await request.body()
        sig = request.headers.get("Stripe-Signature", "")
        webhook_response = await stripe_checkout.handle_webhook(body, sig)
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            existing = await db.payment_transactions.find_one({"session_id": session_id})
            if existing and existing.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "paid", "status": "complete", "paid_at": datetime.now(timezone.utc).isoformat()}}
                )
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ---- TRIP COST SPLITTER ----
@api_router.get("/trips/{trip_id}/payments")
async def get_trip_payments(trip_id: str, user=Depends(get_current_user)):
    payments = await db.payment_transactions.find({"trip_id": trip_id}, {"_id": 0}).to_list(100)
    return payments

@api_router.get("/trips/{trip_id}/cost-summary")
async def get_cost_summary(trip_id: str, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    participants = trip.get("participants", [])
    per_person = trip.get("per_person_budget", 0)
    total = per_person * len(participants)
    payments = await db.payment_transactions.find({"trip_id": trip_id, "payment_status": "paid"}, {"_id": 0}).to_list(100)
    paid_total = sum(p.get("amount", 0) for p in payments)
    paid_users = {p.get("user_id") for p in payments}
    summary = {
        "total_budget": total, "per_person": per_person,
        "currency": trip.get("currency", "EUR"),
        "participants_count": len(participants), "paid_count": len(paid_users),
        "paid_total": paid_total, "remaining": total - paid_total,
        "participants": []
    }
    for p in participants:
        user_payments = [pay for pay in payments if pay.get("user_id") == p["user_id"]]
        paid = sum(pay.get("amount", 0) for pay in user_payments)
        summary["participants"].append({
            "user_id": p["user_id"], "name": p.get("name", ""),
            "share": per_person, "paid": paid,
            "status": "paid" if paid >= per_person else "pending"
        })
    return summary

# ---- NOTIFICATIONS ----
@api_router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    notifs = await db.notifications.find({"user_id": user["_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return notifs

@api_router.post("/notifications/read")
async def mark_notifications_read(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["_id"], "read": False}, {"$set": {"read": True}})
    return {"message": "All marked as read"}

@api_router.get("/notifications/unread-count")
async def get_unread_count(user=Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["_id"], "read": False})
    return {"count": count}

async def create_notification(user_id: str, title: str, message: str, trip_id: str = "", notif_type: str = "info"):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "title": title,
        "message": message, "trip_id": trip_id, "type": notif_type,
        "read": False, "created_at": datetime.now(timezone.utc).isoformat()
    })

# ---- WEATHER DATA ----
WEATHER_DATA = {
    "paris": {"jan": {"temp": 5, "rain": 12, "sun": 2, "label": "Cold"}, "feb": {"temp": 6, "rain": 10, "sun": 3, "label": "Cold"}, "mar": {"temp": 10, "rain": 10, "sun": 4, "label": "Cool"}, "apr": {"temp": 13, "rain": 9, "sun": 6, "label": "Mild"}, "may": {"temp": 17, "rain": 9, "sun": 7, "label": "Warm"}, "jun": {"temp": 20, "rain": 8, "sun": 8, "label": "Warm"}, "jul": {"temp": 23, "rain": 6, "sun": 8, "label": "Hot"}, "aug": {"temp": 23, "rain": 6, "sun": 8, "label": "Hot"}, "sep": {"temp": 19, "rain": 7, "sun": 7, "label": "Warm"}, "oct": {"temp": 14, "rain": 9, "sun": 5, "label": "Mild"}, "nov": {"temp": 9, "rain": 11, "sun": 3, "label": "Cool"}, "dec": {"temp": 6, "rain": 11, "sun": 2, "label": "Cold"}},
    "barcelona": {"jan": {"temp": 10, "rain": 5, "sun": 5, "label": "Mild"}, "feb": {"temp": 11, "rain": 4, "sun": 6, "label": "Mild"}, "mar": {"temp": 13, "rain": 5, "sun": 7, "label": "Mild"}, "apr": {"temp": 16, "rain": 6, "sun": 8, "label": "Warm"}, "may": {"temp": 19, "rain": 5, "sun": 9, "label": "Warm"}, "jun": {"temp": 23, "rain": 3, "sun": 10, "label": "Hot"}, "jul": {"temp": 26, "rain": 2, "sun": 11, "label": "Hot"}, "aug": {"temp": 26, "rain": 4, "sun": 10, "label": "Hot"}, "sep": {"temp": 23, "rain": 6, "sun": 8, "label": "Warm"}, "oct": {"temp": 18, "rain": 8, "sun": 6, "label": "Warm"}, "nov": {"temp": 13, "rain": 6, "sun": 5, "label": "Mild"}, "dec": {"temp": 10, "rain": 5, "sun": 5, "label": "Mild"}},
    "london": {"jan": {"temp": 5, "rain": 14, "sun": 2, "label": "Cold"}, "feb": {"temp": 5, "rain": 11, "sun": 2, "label": "Cold"}, "mar": {"temp": 8, "rain": 11, "sun": 4, "label": "Cool"}, "apr": {"temp": 11, "rain": 9, "sun": 5, "label": "Cool"}, "may": {"temp": 14, "rain": 8, "sun": 6, "label": "Mild"}, "jun": {"temp": 17, "rain": 8, "sun": 7, "label": "Warm"}, "jul": {"temp": 20, "rain": 7, "sun": 7, "label": "Warm"}, "aug": {"temp": 19, "rain": 8, "sun": 6, "label": "Warm"}, "sep": {"temp": 17, "rain": 8, "sun": 5, "label": "Warm"}, "oct": {"temp": 13, "rain": 11, "sun": 4, "label": "Mild"}, "nov": {"temp": 8, "rain": 13, "sun": 2, "label": "Cool"}, "dec": {"temp": 5, "rain": 13, "sun": 1, "label": "Cold"}},
    "madrid": {"jan": {"temp": 6, "rain": 4, "sun": 5, "label": "Cold"}, "feb": {"temp": 8, "rain": 4, "sun": 6, "label": "Cool"}, "mar": {"temp": 12, "rain": 3, "sun": 7, "label": "Mild"}, "apr": {"temp": 14, "rain": 5, "sun": 8, "label": "Mild"}, "may": {"temp": 18, "rain": 4, "sun": 9, "label": "Warm"}, "jun": {"temp": 24, "rain": 2, "sun": 11, "label": "Hot"}, "jul": {"temp": 28, "rain": 1, "sun": 12, "label": "Hot"}, "aug": {"temp": 27, "rain": 1, "sun": 11, "label": "Hot"}, "sep": {"temp": 22, "rain": 3, "sun": 9, "label": "Warm"}, "oct": {"temp": 16, "rain": 5, "sun": 7, "label": "Warm"}, "nov": {"temp": 10, "rain": 5, "sun": 5, "label": "Cool"}, "dec": {"temp": 7, "rain": 5, "sun": 4, "label": "Cold"}},
    "lisbon": {"jan": {"temp": 12, "rain": 8, "sun": 5, "label": "Mild"}, "feb": {"temp": 13, "rain": 7, "sun": 6, "label": "Mild"}, "mar": {"temp": 15, "rain": 6, "sun": 7, "label": "Mild"}, "apr": {"temp": 17, "rain": 6, "sun": 8, "label": "Warm"}, "may": {"temp": 19, "rain": 4, "sun": 10, "label": "Warm"}, "jun": {"temp": 22, "rain": 2, "sun": 11, "label": "Hot"}, "jul": {"temp": 25, "rain": 1, "sun": 12, "label": "Hot"}, "aug": {"temp": 25, "rain": 1, "sun": 11, "label": "Hot"}, "sep": {"temp": 23, "rain": 3, "sun": 9, "label": "Warm"}, "oct": {"temp": 19, "rain": 7, "sun": 7, "label": "Warm"}, "nov": {"temp": 14, "rain": 8, "sun": 5, "label": "Mild"}, "dec": {"temp": 12, "rain": 9, "sun": 5, "label": "Mild"}},
    "marrakech": {"jan": {"temp": 12, "rain": 3, "sun": 7, "label": "Mild"}, "feb": {"temp": 14, "rain": 3, "sun": 7, "label": "Mild"}, "mar": {"temp": 17, "rain": 3, "sun": 8, "label": "Warm"}, "apr": {"temp": 19, "rain": 2, "sun": 9, "label": "Warm"}, "may": {"temp": 23, "rain": 1, "sun": 10, "label": "Hot"}, "jun": {"temp": 28, "rain": 0, "sun": 11, "label": "Hot"}, "jul": {"temp": 33, "rain": 0, "sun": 12, "label": "Very Hot"}, "aug": {"temp": 33, "rain": 0, "sun": 11, "label": "Very Hot"}, "sep": {"temp": 27, "rain": 1, "sun": 9, "label": "Hot"}, "oct": {"temp": 22, "rain": 3, "sun": 8, "label": "Warm"}, "nov": {"temp": 17, "rain": 4, "sun": 7, "label": "Warm"}, "dec": {"temp": 13, "rain": 4, "sun": 6, "label": "Mild"}},
    "rome": {"jan": {"temp": 8, "rain": 7, "sun": 4, "label": "Cool"}, "feb": {"temp": 9, "rain": 6, "sun": 5, "label": "Cool"}, "mar": {"temp": 12, "rain": 6, "sun": 6, "label": "Mild"}, "apr": {"temp": 15, "rain": 6, "sun": 7, "label": "Mild"}, "may": {"temp": 19, "rain": 4, "sun": 9, "label": "Warm"}, "jun": {"temp": 24, "rain": 2, "sun": 10, "label": "Hot"}, "jul": {"temp": 27, "rain": 1, "sun": 11, "label": "Hot"}, "aug": {"temp": 27, "rain": 2, "sun": 10, "label": "Hot"}, "sep": {"temp": 23, "rain": 4, "sun": 8, "label": "Warm"}, "oct": {"temp": 18, "rain": 7, "sun": 6, "label": "Warm"}, "nov": {"temp": 12, "rain": 8, "sun": 4, "label": "Mild"}, "dec": {"temp": 9, "rain": 7, "sun": 3, "label": "Cool"}},
    "milan": {"jan": {"temp": 3, "rain": 6, "sun": 3, "label": "Cold"}, "feb": {"temp": 6, "rain": 5, "sun": 4, "label": "Cold"}, "mar": {"temp": 11, "rain": 6, "sun": 5, "label": "Cool"}, "apr": {"temp": 15, "rain": 8, "sun": 6, "label": "Mild"}, "may": {"temp": 20, "rain": 8, "sun": 7, "label": "Warm"}, "jun": {"temp": 24, "rain": 6, "sun": 9, "label": "Hot"}, "jul": {"temp": 27, "rain": 5, "sun": 10, "label": "Hot"}, "aug": {"temp": 26, "rain": 7, "sun": 9, "label": "Hot"}, "sep": {"temp": 21, "rain": 6, "sun": 7, "label": "Warm"}, "oct": {"temp": 15, "rain": 8, "sun": 5, "label": "Mild"}, "nov": {"temp": 8, "rain": 8, "sun": 3, "label": "Cool"}, "dec": {"temp": 4, "rain": 6, "sun": 2, "label": "Cold"}},
    "athens": {"jan": {"temp": 10, "rain": 6, "sun": 4, "label": "Mild"}, "feb": {"temp": 10, "rain": 5, "sun": 5, "label": "Mild"}, "mar": {"temp": 13, "rain": 5, "sun": 6, "label": "Mild"}, "apr": {"temp": 17, "rain": 3, "sun": 8, "label": "Warm"}, "may": {"temp": 22, "rain": 2, "sun": 10, "label": "Warm"}, "jun": {"temp": 27, "rain": 1, "sun": 12, "label": "Hot"}, "jul": {"temp": 30, "rain": 0, "sun": 13, "label": "Hot"}, "aug": {"temp": 30, "rain": 0, "sun": 12, "label": "Hot"}, "sep": {"temp": 26, "rain": 2, "sun": 10, "label": "Warm"}, "oct": {"temp": 20, "rain": 5, "sun": 7, "label": "Warm"}, "nov": {"temp": 15, "rain": 7, "sun": 5, "label": "Mild"}, "dec": {"temp": 11, "rain": 7, "sun": 4, "label": "Mild"}},
    "amsterdam": {"jan": {"temp": 4, "rain": 12, "sun": 2, "label": "Cold"}, "feb": {"temp": 4, "rain": 9, "sun": 3, "label": "Cold"}, "mar": {"temp": 7, "rain": 10, "sun": 4, "label": "Cool"}, "apr": {"temp": 10, "rain": 8, "sun": 6, "label": "Cool"}, "may": {"temp": 14, "rain": 8, "sun": 7, "label": "Mild"}, "jun": {"temp": 17, "rain": 8, "sun": 7, "label": "Warm"}, "jul": {"temp": 19, "rain": 8, "sun": 7, "label": "Warm"}, "aug": {"temp": 19, "rain": 9, "sun": 6, "label": "Warm"}, "sep": {"temp": 16, "rain": 9, "sun": 5, "label": "Warm"}, "oct": {"temp": 12, "rain": 11, "sun": 4, "label": "Mild"}, "nov": {"temp": 7, "rain": 12, "sun": 2, "label": "Cool"}, "dec": {"temp": 4, "rain": 12, "sun": 1, "label": "Cold"}}
}

PRICE_TRENDS = {
    "jan": 0.85, "feb": 0.80, "mar": 0.90, "apr": 1.0, "may": 1.10,
    "jun": 1.25, "jul": 1.40, "aug": 1.35, "sep": 1.05, "oct": 0.95,
    "nov": 0.80, "dec": 1.15
}

MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

@api_router.get("/weather/{dest_id}")
async def get_weather(dest_id: str):
    weather = WEATHER_DATA.get(dest_id, {})
    return {"destination": dest_id, "monthly": weather}

@api_router.get("/weather/{dest_id}/{month}")
async def get_weather_month(dest_id: str, month: str):
    weather = WEATHER_DATA.get(dest_id, {}).get(month.lower(), {})
    return {"destination": dest_id, "month": month, **weather}

# ---- SMART WEEKEND FINDER ----
@api_router.get("/trips/{trip_id}/smart-weekends")
async def smart_weekend_finder(trip_id: str, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    prefs = await db.preferences.find({"trip_id": trip_id}, {"_id": 0}).to_list(100)
    dests = await db.destinations.find({}, {"_id": 0}).to_list(100)
    
    # Collect all available dates from participants
    all_available = []
    for p in prefs:
        avail = p.get("available_dates", [])
        if avail:
            all_available.append(set(avail))
    
    # Find overlapping dates
    if all_available:
        common_dates = set.intersection(*all_available) if all_available else set()
    else:
        # If no flexible dates, generate next 6 months of weekends
        common_dates = set()
        from_date = datetime.now(timezone.utc)
        for i in range(180):
            d = from_date + timedelta(days=i)
            if d.weekday() in (4, 5, 6):  # Fri, Sat, Sun
                common_dates.add(d.strftime("%Y-%m-%d"))
    
    # Group into weekend clusters (Fri-Sat-Sun)
    sorted_dates = sorted(common_dates)
    weekends = []
    i = 0
    while i < len(sorted_dates):
        start = sorted_dates[i]
        cluster = [start]
        j = i + 1
        while j < len(sorted_dates):
            prev = datetime.strptime(cluster[-1], "%Y-%m-%d")
            curr = datetime.strptime(sorted_dates[j], "%Y-%m-%d")
            if (curr - prev).days <= 2:
                cluster.append(sorted_dates[j])
                j += 1
            else:
                break
        if len(cluster) >= 2:
            weekends.append({"start": cluster[0], "end": cluster[-1], "days": len(cluster)})
        i = j if j > i + 1 else i + 1
    
    # Score each weekend + destination combo
    suggestions = []
    budget_target = trip.get("per_person_budget", 500)
    
    for wk in weekends[:12]:  # Max 12 weekends
        start_date = datetime.strptime(wk["start"], "%Y-%m-%d")
        month_key = MONTH_NAMES[start_date.month - 1]
        price_mult = PRICE_TRENDS.get(month_key, 1.0)
        
        for dest in dests[:10]:
            dest_weather = WEATHER_DATA.get(dest["id"], {}).get(month_key, {})
            base_budget = dest.get("avg_budget_per_person", 500)
            adjusted_budget = base_budget * price_mult
            
            # Weather score (0-100)
            temp = dest_weather.get("temp", 15)
            sun = dest_weather.get("sun", 5)
            rain = dest_weather.get("rain", 5)
            weather_score = min(100, max(0, (temp - 5) * 3 + sun * 5 - rain * 2))
            
            # Price score (0-100, lower = better)
            if adjusted_budget <= budget_target:
                price_score = 100
            elif adjusted_budget <= budget_target * 1.2:
                price_score = 70
            else:
                price_score = max(10, 100 - int((adjusted_budget - budget_target) / budget_target * 100))
            
            # Participants available
            avail_count = sum(1 for p_dates in all_available if any(d in p_dates for d in [wk["start"], wk["end"]])) if all_available else len(prefs)
            availability_score = (avail_count / max(len(prefs), 1)) * 100 if prefs else 50
            
            # Overall score
            overall = int(weather_score * 0.30 + price_score * 0.30 + availability_score * 0.40)
            
            suggestions.append({
                "weekend": wk,
                "destination": {"id": dest["id"], "name": dest["name"], "country": dest["country"], "image": dest["image"]},
                "weather": {"temp": temp, "sun_hours": sun, "rain_days": rain, "label": dest_weather.get("label", "")},
                "estimated_budget": round(adjusted_budget, 0),
                "price_trend": round(price_mult, 2),
                "currency": dest.get("currency", "EUR"),
                "scores": {"overall": overall, "weather": int(weather_score), "price": int(price_score), "availability": int(availability_score)},
                "available_participants": avail_count if all_available else len(trip.get("participants", [])),
                "total_participants": len(trip.get("participants", []))
            })
    
    suggestions.sort(key=lambda x: x["scores"]["overall"], reverse=True)
    
    # Add badges
    if suggestions:
        suggestions[0]["badge"] = "Best Overall"
        cheapest = min(suggestions[:20], key=lambda x: x["estimated_budget"])
        cheapest["badge"] = cheapest.get("badge", "") + " Best Value" if cheapest.get("badge") else "Best Value"
        warmest = max(suggestions[:20], key=lambda x: x["weather"]["temp"])
        warmest["badge"] = warmest.get("badge", "") + " Best Weather" if warmest.get("badge") else "Best Weather"
    
    return {"suggestions": suggestions[:30], "total_weekends": len(weekends), "common_dates_count": len(common_dates)}

# ---- RECEIPT GENERATION ----
@api_router.get("/payments/receipt/{session_id}")
async def get_receipt(session_id: str, user=Depends(get_current_user)):
    payment = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.get("user_id") != user["_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    trip = await db.trips.find_one({"_id": ObjectId(payment.get("trip_id", ""))})
    trip_name = trip.get("name", "Trip") if trip else "Trip"
    receipt = {
        "receipt_id": f"TS-{session_id[:8].upper()}",
        "trip_name": trip_name,
        "payer_name": payment.get("user_name", ""),
        "amount": payment.get("amount", 0),
        "currency": payment.get("currency", "EUR"),
        "payment_status": payment.get("payment_status", ""),
        "paid_at": payment.get("paid_at", ""),
        "created_at": payment.get("created_at", ""),
        "session_id": session_id,
        "trip_id": payment.get("trip_id", ""),
        "items": [
            {"description": f"Trip share - {trip_name}", "amount": payment.get("amount", 0)}
        ]
    }
    return receipt

# ---- GROUP AVAILABILITY HEATMAP ----

def extract_dates_from_pref(pref: dict) -> tuple:
    """Extract dates set and ranges list from a single preference/guest doc."""
    dates = set()
    ranges = []
    for dr in pref.get("date_ranges", []):
        try:
            start = datetime.strptime(dr["start"], "%Y-%m-%d")
            end = datetime.strptime(dr["end"], "%Y-%m-%d")
            ranges.append({"start": dr["start"], "end": dr["end"]})
            current = start
            while current <= end:
                dates.add(current.strftime("%Y-%m-%d"))
                current += timedelta(days=1)
        except Exception:
            pass
    # Backward compat: individual dates
    for d in pref.get("available_dates", []):
        dates.add(d)
    # Backward compat: single date range
    if not ranges and pref.get("date_start") and pref.get("date_end"):
        try:
            start = datetime.strptime(pref["date_start"], "%Y-%m-%d")
            end = datetime.strptime(pref["date_end"], "%Y-%m-%d")
            ranges.append({"start": pref["date_start"], "end": pref["date_end"]})
            current = start
            while current <= end:
                dates.add(current.strftime("%Y-%m-%d"))
                current += timedelta(days=1)
        except Exception:
            pass
    return dates, ranges

def classify_availability_level(count: int, prefs_submitted: int) -> str:
    """Return heatmap level string based on available count vs total."""
    if prefs_submitted == 0:
        return "unknown"
    if count == prefs_submitted:
        return "all"
    if count >= prefs_submitted * 0.6:
        return "most"
    if count >= 1:
        return "some"
    return "none"

def find_best_periods(sorted_dates: list, heatmap: dict, prefs_submitted: int) -> list:
    """Find consecutive date stretches where at least half are available."""
    best_periods = []
    current_streak = None
    for date_str in sorted_dates:
        cell = heatmap.get(date_str, {})
        count = cell.get("count", 0)
        if count >= max(1, prefs_submitted * 0.5):
            if current_streak is None:
                current_streak = {"start": date_str, "end": date_str, "min_count": count, "max_count": count, "dates": [date_str]}
            else:
                prev_end = datetime.strptime(current_streak["end"], "%Y-%m-%d")
                curr = datetime.strptime(date_str, "%Y-%m-%d")
                if (curr - prev_end).days <= 2:
                    current_streak["end"] = date_str
                    current_streak["min_count"] = min(current_streak["min_count"], count)
                    current_streak["max_count"] = max(current_streak["max_count"], count)
                    current_streak["dates"].append(date_str)
                else:
                    if len(current_streak["dates"]) >= 2:
                        best_periods.append(current_streak)
                    current_streak = {"start": date_str, "end": date_str, "min_count": count, "max_count": count, "dates": [date_str]}
        else:
            if current_streak and len(current_streak["dates"]) >= 2:
                best_periods.append(current_streak)
            current_streak = None
    if current_streak and len(current_streak["dates"]) >= 2:
        best_periods.append(current_streak)
    # Score periods
    for bp in best_periods:
        avg_count = sum(heatmap.get(d, {}).get("count", 0) for d in bp["dates"]) / len(bp["dates"])
        bp["avg_available"] = round(avg_count, 1)
        bp["score"] = round((avg_count / prefs_submitted) * 100) if prefs_submitted else 0
        bp["days"] = len(bp["dates"])
        bp["all_available_days"] = sum(1 for d in bp["dates"] if heatmap.get(d, {}).get("count", 0) == prefs_submitted)
    best_periods.sort(key=lambda x: (x["score"], x["days"]), reverse=True)
    return best_periods

@api_router.get("/trips/{trip_id}/availability-heatmap")
async def get_availability_heatmap(trip_id: str, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    prefs = await db.preferences.find({"trip_id": trip_id}, {"_id": 0}).to_list(100)
    participants = trip.get("participants", [])
    total_participants = len(participants)

    # Collect every participant's available dates and date ranges
    participant_dates = {}  # user_name -> set of date strings
    participant_ranges = {}  # user_name -> list of {start, end} range dicts
    all_dates_set = set()

    for p in prefs:
        name = p.get("user_name", "Unknown")
        dates, ranges = extract_dates_from_pref(p)
        participant_dates[name] = dates
        participant_ranges[name] = ranges
        all_dates_set.update(dates)

    # Build heatmap: for each date, count how many participants are available
    heatmap = {}
    prefs_submitted = len(prefs)

    # Include guest availability submissions
    guest_submissions = await db.guest_availability.find({"trip_id": trip_id}, {"_id": 0}).to_list(100)
    for g in guest_submissions:
        name = f"{g.get('name', 'Guest')} (guest)"
        dates, ranges = extract_dates_from_pref(g)
        if dates:
            participant_dates[name] = dates
            participant_ranges[name] = ranges
            all_dates_set.update(dates)
            prefs_submitted += 1

    # If nobody submitted dates, generate next 3 months as "unknown"
    if not all_dates_set:
        today = datetime.now(timezone.utc)
        for i in range(90):
            d = today + timedelta(days=i)
            all_dates_set.add(d.strftime("%Y-%m-%d"))
    for date_str in sorted(all_dates_set):
        count = 0
        available_names = []
        unavailable_names = []
        for name, dates in participant_dates.items():
            if date_str in dates:
                count += 1
                available_names.append(name)
            else:
                unavailable_names.append(name)
        # Also count participants who haven't submitted prefs as unknown
        no_prefs_names = [p.get("name", "") for p in participants if p.get("name", "") not in participant_dates]
        level = classify_availability_level(count, prefs_submitted)

        heatmap[date_str] = {
            "count": count,
            "total_with_prefs": prefs_submitted,
            "total_participants": total_participants,
            "level": level,
            "available": available_names,
            "unavailable": unavailable_names,
            "no_prefs": no_prefs_names
        }

    # Find best weekends (Fri+Sat+Sun where everyone or most are available)
    sorted_dates = sorted(all_dates_set)
    best_weekends = []
    for date_str in sorted_dates:
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d")
            if d.weekday() == 4:  # Friday
                sat = (d + timedelta(days=1)).strftime("%Y-%m-%d")
                sun = (d + timedelta(days=2)).strftime("%Y-%m-%d")
                if sat in heatmap and sun in heatmap:
                    fri_data = heatmap[date_str]
                    sat_data = heatmap[sat]
                    sun_data = heatmap[sun]
                    min_count = min(fri_data["count"], sat_data["count"], sun_data["count"])
                    avg_count = (fri_data["count"] + sat_data["count"] + sun_data["count"]) / 3
                    if min_count >= 1:
                        best_weekends.append({
                            "friday": date_str, "saturday": sat, "sunday": sun,
                            "min_available": min_count, "avg_available": round(avg_count, 1),
                            "score": round((avg_count / max(prefs_submitted, 1)) * 100)
                        })
        except Exception:
            pass
    best_weekends.sort(key=lambda w: w["score"], reverse=True)

    # Build Doodle-style per-participant grid
    participant_grid = []
    for name, dates in participant_dates.items():
        participant_grid.append({
            "name": name,
            "dates": {d: True for d in dates},
            "ranges": participant_ranges.get(name, [])
        })
    # Also add participants who haven't submitted prefs
    for p in participants:
        pname = p.get("name", "")
        if pname and pname not in participant_dates:
            participant_grid.append({"name": pname, "dates": {}, "pending": True})

    # Find best periods using helper
    best_periods = find_best_periods(sorted_dates, heatmap, prefs_submitted) if sorted_dates and prefs_submitted > 0 else []

    # Compute most probable travel ranges by finding overlapping ranges across users
    # For each unique range submitted by any user, count how many other users also cover that range
    most_probable_ranges = []
    all_ranges_list = []
    for name, ranges in participant_ranges.items():
        for r in ranges:
            all_ranges_list.append({"start": r["start"], "end": r["end"], "user": name})

    if all_ranges_list and prefs_submitted > 0:
        # For each range, count how many users are available for ALL days in that range
        seen_ranges = set()
        for r in all_ranges_list:
            range_key = f"{r['start']}_{r['end']}"
            if range_key in seen_ranges:
                continue
            seen_ranges.add(range_key)
            try:
                rstart = datetime.strptime(r["start"], "%Y-%m-%d")
                rend = datetime.strptime(r["end"], "%Y-%m-%d")
                range_days = []
                cur = rstart
                while cur <= rend:
                    range_days.append(cur.strftime("%Y-%m-%d"))
                    cur += timedelta(days=1)
                # Count users who are available on ALL days of this range
                full_overlap_users = []
                partial_overlap_users = []
                for uname, udates in participant_dates.items():
                    days_covered = sum(1 for d in range_days if d in udates)
                    if days_covered == len(range_days):
                        full_overlap_users.append(uname)
                    elif days_covered > 0:
                        partial_overlap_users.append(uname)
                most_probable_ranges.append({
                    "start": r["start"],
                    "end": r["end"],
                    "days": len(range_days),
                    "full_overlap_count": len(full_overlap_users),
                    "full_overlap_users": full_overlap_users,
                    "partial_overlap_users": partial_overlap_users,
                    "score": round((len(full_overlap_users) / prefs_submitted) * 100) if prefs_submitted else 0
                })
            except Exception:
                pass
        most_probable_ranges.sort(key=lambda x: (x["full_overlap_count"], x["days"]), reverse=True)

    # Auto-suggestion: detect if ALL participants overlap on any range
    auto_lock_suggestion = None
    if most_probable_ranges and prefs_submitted >= 2:
        top = most_probable_ranges[0]
        if top["full_overlap_count"] == prefs_submitted:
            auto_lock_suggestion = {
                "start": top["start"], "end": top["end"], "days": top["days"],
                "message": f"Everyone is available {top['start']} to {top['end']}! Lock these dates?"
            }

    return {
        "heatmap": heatmap,
        "total_participants": total_participants,
        "prefs_submitted": prefs_submitted,
        "participant_names": list(participant_dates.keys()),
        "participant_grid": participant_grid,
        "best_weekends": best_weekends[:8],
        "best_periods": best_periods[:6],
        "most_probable_ranges": most_probable_ranges[:10],
        "auto_lock_suggestion": auto_lock_suggestion,
        "locked_dates": trip.get("locked_dates"),
        "is_owner": trip.get("owner_id") == user["_id"],
        "guest_share_token": trip.get("guest_share_token", ""),
        "date_range": {"start": sorted_dates[0] if sorted_dates else "", "end": sorted_dates[-1] if sorted_dates else ""}
    }

# ---- LOCK IN DATES ----
class LockDatesInput(BaseModel):
    start: str
    end: str

@api_router.post("/trips/{trip_id}/lock-dates")
async def lock_dates(trip_id: str, input: LockDatesInput, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.get("owner_id") != user["_id"]:
        raise HTTPException(status_code=403, detail="Only the trip owner can lock dates")
    locked_dates = {
        "start": input.start,
        "end": input.end,
        "locked_by": user.get("name", ""),
        "locked_at": datetime.now(timezone.utc).isoformat()
    }
    await db.trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$set": {"locked_dates": locked_dates, "start_date": input.start, "end_date": input.end, "status": "dates_locked"}}
    )
    await notify_trip(trip_id, "dates_locked", {"start": input.start, "end": input.end, "user_name": user.get("name", "")})
    # Notify all participants
    for p in trip.get("participants", []):
        if p.get("user_id") != user["_id"]:
            await create_notification(
                p["user_id"], "Dates locked!",
                f"{user.get('name','')} locked the trip dates: {input.start} to {input.end}",
                trip_id, "dates"
            )
    # Send mock emails to guests with emails
    await notify_guests_dates_locked(trip_id, input.start, input.end, user.get("name", ""))
    return {"message": "Dates locked", "locked_dates": locked_dates}

@api_router.post("/trips/{trip_id}/unlock-dates")
async def unlock_dates(trip_id: str, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.get("owner_id") != user["_id"]:
        raise HTTPException(status_code=403, detail="Only the trip owner can unlock dates")
    await db.trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$unset": {"locked_dates": ""}, "$set": {"status": "planning"}}
    )
    await notify_trip(trip_id, "dates_unlocked", {"user_name": user.get("name", "")})
    return {"message": "Dates unlocked"}

@api_router.get("/trips/{trip_id}/locked-dates")
async def get_locked_dates(trip_id: str, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)}, {"locked_dates": 1, "owner_id": 1})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {
        "locked_dates": trip.get("locked_dates"),
        "is_owner": trip.get("owner_id") == user["_id"]
    }

# ---- GUEST AVAILABILITY (share link, no auth) ----
class GuestAvailabilityInput(BaseModel):
    name: str
    email: Optional[str] = None
    date_ranges: List[DateRangeItem] = []

@api_router.post("/trips/{trip_id}/guest-share-link")
async def create_guest_share_link(trip_id: str, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    # Check if link already exists
    existing = trip.get("guest_share_token")
    if existing:
        return {"token": existing, "trip_name": trip.get("name", "")}
    token = secrets.token_urlsafe(16)
    await db.trips.update_one({"_id": ObjectId(trip_id)}, {"$set": {"guest_share_token": token}})
    return {"token": token, "trip_name": trip.get("name", "")}

@api_router.get("/trips/guest/{token}")
async def get_guest_trip_info(token: str):
    trip = await db.trips.find_one({"guest_share_token": token}, {"_id": 1, "name": 1, "trip_type": 1, "owner_name": 1, "participants": 1, "group_size": 1, "locked_dates": 1})
    if not trip:
        raise HTTPException(status_code=404, detail="Invalid share link")
    trip_id = str(trip["_id"])
    # Get existing guest submissions
    guests = await db.guest_availability.find({"trip_id": trip_id}, {"_id": 0}).to_list(100)
    return {
        "id": trip_id,
        "name": trip.get("name", ""),
        "trip_type": trip.get("trip_type", ""),
        "owner_name": trip.get("owner_name", ""),
        "participant_count": len(trip.get("participants", [])),
        "group_size": trip.get("group_size", 4),
        "locked_dates": trip.get("locked_dates"),
        "guest_submissions": [{"name": g.get("name", ""), "date_ranges": g.get("date_ranges", []), "email": g.get("email", "")} for g in guests]
    }

# Guest can check if they already submitted (for edit on revisit)
@api_router.get("/trips/guest/{token}/check/{guest_name}")
async def check_guest_submission(token: str, guest_name: str):
    trip = await db.trips.find_one({"guest_share_token": token})
    if not trip:
        raise HTTPException(status_code=404, detail="Invalid share link")
    trip_id = str(trip["_id"])
    existing = await db.guest_availability.find_one({"trip_id": trip_id, "name": guest_name.strip()}, {"_id": 0})
    if existing:
        return {"found": True, "date_ranges": existing.get("date_ranges", []), "email": existing.get("email", "")}
    return {"found": False}

@api_router.post("/trips/guest/{token}/submit")
async def submit_guest_availability(token: str, input: GuestAvailabilityInput):
    trip = await db.trips.find_one({"guest_share_token": token})
    if not trip:
        raise HTTPException(status_code=404, detail="Invalid share link")
    if not input.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    trip_id = str(trip["_id"])
    guest_doc = {
        "trip_id": trip_id,
        "name": input.name.strip(),
        "email": input.email or "",
        "date_ranges": [r.model_dump() for r in input.date_ranges],
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "is_guest": True
    }
    # Upsert by name+trip_id
    await db.guest_availability.update_one(
        {"trip_id": trip_id, "name": input.name.strip()},
        {"$set": guest_doc}, upsert=True
    )
    await notify_trip(trip_id, "guest_availability", {"guest_name": input.name.strip()})
    # Notify trip owner
    if trip.get("owner_id"):
        await create_notification(
            trip["owner_id"], "Guest submitted dates!",
            f"{input.name.strip()} shared their travel dates via guest link",
            trip_id, "guest"
        )
    return {"message": "Availability submitted! The trip organizer will see your dates."}

# ---- MOCK EMAIL SERVICE ----
email_log = []  # In-memory log of sent emails

async def send_mock_email(to_email: str, subject: str, body: str):
    """Mock email sender - logs to memory and console"""
    entry = {
        "to": to_email, "subject": subject, "body": body,
        "sent_at": datetime.now(timezone.utc).isoformat(), "status": "sent"
    }
    email_log.append(entry)
    logger.info(f"[MOCK EMAIL] To: {to_email} | Subject: {subject}")
    return entry

async def notify_guests_dates_locked(trip_id: str, start: str, end: str, locker_name: str):
    """Send mock emails to all guests with emails when dates are locked"""
    guests = await db.guest_availability.find({"trip_id": trip_id, "email": {"$ne": ""}}, {"_id": 0}).to_list(100)
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)}, {"name": 1})
    trip_name = trip.get("name", "Trip") if trip else "Trip"
    for g in guests:
        if g.get("email"):
            await send_mock_email(
                g["email"],
                f"Dates confirmed for {trip_name}!",
                f"Hi {g.get('name', 'there')}!\n\n"
                f"{locker_name} has locked the travel dates for {trip_name}:\n"
                f"{start} to {end}\n\n"
                f"Start packing! The group has agreed on these dates.\n\n"
                f"— TripSync"
            )

@api_router.get("/email-log")
async def get_email_log(user=Depends(get_current_user)):
    """Debug endpoint to see all mock emails sent"""
    return {"emails": email_log[-50:], "total": len(email_log)}

# ---- TRIP BUDGET TRACKER ----
class BudgetItemInput(BaseModel):
    category: str  # flight, hotel, activity, food, transport, custom
    name: str
    amount: float
    per_person: bool = True
    notes: str = ""

@api_router.get("/trips/{trip_id}/budget")
async def get_budget(trip_id: str, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    items = await db.budget_items.find({"trip_id": trip_id}, {"_id": 1, "trip_id": 0}).to_list(200)
    for item in items:
        item["id"] = str(item.pop("_id"))

    participants = trip.get("participants", [])
    group_size = len(participants) or 1
    target_budget = trip.get("per_person_budget", 500) * group_size
    per_person_target = trip.get("per_person_budget", 500)
    currency = trip.get("currency", "EUR")

    # Compute totals
    total_group = 0
    total_per_person = 0
    by_category = {}
    for item in items:
        amt = item.get("amount", 0)
        if item.get("per_person"):
            total_per_person += amt
            total_group += amt * group_size
        else:
            total_group += amt
            total_per_person += amt / group_size
        cat = item.get("category", "custom")
        by_category[cat] = by_category.get(cat, 0) + (amt if item.get("per_person") else amt / group_size)

    return {
        "items": items,
        "summary": {
            "total_per_person": round(total_per_person, 2),
            "total_group": round(total_group, 2),
            "target_per_person": per_person_target,
            "target_group": target_budget,
            "remaining_per_person": round(per_person_target - total_per_person, 2),
            "remaining_group": round(target_budget - total_group, 2),
            "pct_used": round((total_per_person / max(per_person_target, 1)) * 100),
            "group_size": group_size,
            "currency": currency,
            "by_category": by_category
        }
    }

@api_router.post("/trips/{trip_id}/budget")
async def add_budget_item(trip_id: str, input: BudgetItemInput, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    doc = {
        "trip_id": trip_id,
        "category": input.category,
        "name": input.name,
        "amount": input.amount,
        "per_person": input.per_person,
        "notes": input.notes,
        "added_by": user.get("name", ""),
        "added_by_id": user["_id"],
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.budget_items.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    await notify_trip(trip_id, "budget_item_added", {"item_name": input.name, "amount": input.amount, "user_name": user.get("name", "")})
    return doc

@api_router.delete("/trips/{trip_id}/budget/{item_id}")
async def delete_budget_item(trip_id: str, item_id: str, user=Depends(get_current_user)):
    result = await db.budget_items.delete_one({"_id": ObjectId(item_id), "trip_id": trip_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Deleted"}

@api_router.get("/trips/{trip_id}/budget/suggestions")
async def get_budget_suggestions(trip_id: str, user=Depends(get_current_user)):
    """Return pre-populated expense options from destination data"""
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    # Get voted/recommended destinations
    dests = await db.destinations.find({}, {"_id": 0}).to_list(50)
    suggestions = []
    for d in dests[:5]:
        dest_suggestions = {"destination": d["name"], "items": []}
        for acc in d.get("accommodations", []):
            dest_suggestions["items"].append({
                "category": "hotel", "name": f"{acc['name']} ({d['name']})",
                "amount": acc.get("price_night", 80), "per_person": False,
                "notes": f"Rating: {acc.get('rating', 'N/A')}", "link": acc.get("link", "")
            })
        for act in d.get("activities", []):
            dest_suggestions["items"].append({
                "category": "activity", "name": f"{act['name']}",
                "amount": act.get("price", 0), "per_person": True,
                "notes": f"{act.get('duration', '')} · {act.get('type', '')}"
            })
        for tf_city, modes in d.get("transport_from", {}).items():
            for mode, details in modes.items():
                dest_suggestions["items"].append({
                    "category": "flight" if mode == "plane" else "transport",
                    "name": f"{mode.title()} from {tf_city} to {d['name']}",
                    "amount": details.get("price", 0), "per_person": True,
                    "notes": details.get("duration", ""), "link": details.get("link", "")
                })
        suggestions.append(dest_suggestions)
    return {"suggestions": suggestions}

# ---- SLOT PRICE COMPARISON ----
def get_slot_price(dest: dict, departure_city: str, start_date: str, end_date: str, num_travelers: int = 1) -> dict:
    """Generate simulated but realistic prices for a specific date slot"""
    seed_str = f"{dest['id']}-{departure_city}-{start_date}-{end_date}"
    seed_val = int(hashlib.sha256(seed_str.encode()).hexdigest()[:8], 16)
    random.seed(seed_val)

    # Date-based price factors (weekends more expensive, summer peak)
    try:
        s = datetime.strptime(start_date, "%Y-%m-%d")
        e = datetime.strptime(end_date, "%Y-%m-%d")
        nights = max((e - s).days, 1)
        month = s.month
        # Peak season multiplier
        peak_mult = 1.3 if month in [6, 7, 8, 12] else 1.0 if month in [3, 4, 5, 9, 10] else 0.85
        # Weekend departure surcharge
        weekend_mult = 1.1 if s.weekday() >= 4 else 0.95
    except Exception:
        nights = 3
        peak_mult = 1.0
        weekend_mult = 1.0

    # Flight price per person
    transport = dest.get("transport_from", {})
    base_flight = 80
    flight_link = ""
    for city, options in transport.items():
        if departure_city.lower() in city.lower() or city.lower() in departure_city.lower():
            for mode, details in options.items():
                if mode == "plane":
                    base_flight = details.get("price", 80)
                    flight_link = details.get("link", "")
                    break
            break

    flight_price = round(base_flight * peak_mult * weekend_mult * random.uniform(0.8, 1.3))

    # Hotel price per night (cheapest accommodation)
    accoms = dest.get("accommodations", [])
    cheapest_accom = min(accoms, key=lambda a: a.get("price_night", 999)) if accoms else {"price_night": 80, "name": "Average Hotel", "link": ""}
    hotel_night = round(cheapest_accom["price_night"] * peak_mult * random.uniform(0.85, 1.2))
    hotel_total = hotel_night * nights

    # Per person total
    per_person = flight_price + hotel_total + round(nights * 30 * random.uniform(0.8, 1.2))  # food/activities
    group_total = per_person * num_travelers

    return {
        "flight_price_pp": flight_price,
        "hotel_per_night": hotel_night,
        "hotel_total": hotel_total,
        "nights": nights,
        "per_person_total": per_person,
        "group_total": group_total,
        "num_travelers": num_travelers,
        "accommodation": {"name": cheapest_accom.get("name", ""), "link": cheapest_accom.get("link", "")},
        "flight_link": flight_link or f"https://www.skyscanner.com/transport/flights/{departure_city[:3].lower()}/{dest['id'][:3]}/",
        "peak_factor": round(peak_mult, 2),
        "currency": dest.get("currency", "EUR")
    }

@api_router.get("/trips/{trip_id}/slot-prices")
async def get_slot_prices(trip_id: str, user=Depends(get_current_user)):
    """Compare prices across all overlapping date slots for the group"""
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    prefs = await db.preferences.find({"trip_id": trip_id}, {"_id": 0}).to_list(100)
    dests = await db.destinations.find({}, {"_id": 0}).to_list(100)

    # Collect all date ranges from all participants
    all_ranges = []
    departure_cities = set()
    for p in prefs:
        dep_city = p.get("departure_city", "Paris")
        if dep_city:
            departure_cities.add(dep_city)
        for dr in p.get("date_ranges", []):
            all_ranges.append({"start": dr["start"], "end": dr["end"], "user": p.get("user_name", "")})
        if p.get("date_start") and p.get("date_end"):
            all_ranges.append({"start": p["date_start"], "end": p["date_end"], "user": p.get("user_name", "")})

    # Find unique ranges where multiple users overlap
    seen = set()
    unique_ranges = []
    for r in all_ranges:
        key = f"{r['start']}_{r['end']}"
        if key not in seen:
            seen.add(key)
            unique_ranges.append(r)

    num_travelers = len(prefs) or 1
    primary_city = list(departure_cities)[0] if departure_cities else "Paris"

    # For each voted/recommended destination, compute prices per slot
    slot_comparisons = []
    for dest in dests[:5]:  # top 5 destinations
        slots = []
        for r in unique_ranges:
            prices = get_slot_price(dest, primary_city, r["start"], r["end"], num_travelers)
            slots.append({
                "start": r["start"], "end": r["end"],
                **prices
            })
        slots.sort(key=lambda s: s["per_person_total"])
        cheapest = slots[0] if slots else None
        slot_comparisons.append({
            "destination": {"id": dest["id"], "name": dest["name"], "country": dest["country"], "image": dest["image"]},
            "slots": slots,
            "cheapest_slot": cheapest,
            "accommodations": dest.get("accommodations", []),
            "restaurants": dest.get("restaurants", [])
        })

    # Sort destinations by cheapest option
    slot_comparisons.sort(key=lambda x: x["cheapest_slot"]["per_person_total"] if x.get("cheapest_slot") else 9999)

    return {
        "comparisons": slot_comparisons,
        "departure_cities": list(departure_cities),
        "num_travelers": num_travelers,
        "slots_count": len(unique_ranges)
    }

# ---- FLIGHT COORDINATION ----
@api_router.get("/trips/{trip_id}/flight-coordination")
async def get_flight_coordination(trip_id: str, user=Depends(get_current_user)):
    """Suggest flights so group members from different cities arrive within 1h of each other"""
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    prefs = await db.preferences.find({"trip_id": trip_id}, {"_id": 0}).to_list(100)
    dests = await db.destinations.find({}, {"_id": 0}).to_list(100)

    # Get locked dates or best range
    locked = trip.get("locked_dates")
    if not locked:
        return {"coordination": [], "message": "Lock dates first to coordinate flights"}

    travel_start = locked["start"]
    travel_end = locked["end"]

    # Gather departure/return cities per participant
    travelers = []
    for p in prefs:
        dep_city = p.get("departure_city", "").strip()
        ret_city = p.get("return_city", "").strip() if not p.get("same_return_city", True) else dep_city
        dep_time_pref = p.get("departure_time_preference", "flexible")
        ret_time_pref = p.get("return_time_preference", "flexible")
        if dep_city:
            travelers.append({
                "name": p.get("user_name", "Unknown"),
                "departure_city": dep_city,
                "return_city": ret_city or dep_city,
                "dep_time_pref": dep_time_pref,
                "ret_time_pref": ret_time_pref
            })

    if not travelers:
        return {"coordination": [], "message": "No departure cities specified yet"}

    # For each destination, generate coordinated flight suggestions
    coordination_results = []
    for dest in dests[:5]:
        transport_from = dest.get("transport_from", {})

        # Generate arrival flight suggestions per traveler
        outbound_flights = []
        for t in travelers:
            # Find transport options from this city
            matched_transport = None
            for city, options in transport_from.items():
                if t["departure_city"].lower() in city.lower() or city.lower() in t["departure_city"].lower():
                    matched_transport = options
                    break

            if matched_transport and "plane" in matched_transport:
                flight_info = matched_transport["plane"]
                duration_str = flight_info.get("duration", "2h")
                base_price = flight_info.get("price", 80)

                # Generate 3 flight options at different times
                time_slots = []
                if t["dep_time_pref"] == "very_early":
                    time_slots = ["06:00", "07:30", "08:00"]
                elif t["dep_time_pref"] == "morning":
                    time_slots = ["09:00", "10:30", "11:00"]
                elif t["dep_time_pref"] == "afternoon":
                    time_slots = ["13:00", "14:30", "16:00"]
                elif t["dep_time_pref"] == "evening":
                    time_slots = ["18:00", "19:30", "21:00"]
                else:
                    time_slots = ["08:00", "12:00", "17:00"]

                for i, dep_time in enumerate(time_slots):
                    seed_val = int(hashlib.sha256(f"{t['departure_city']}-{dest['id']}-{dep_time}-{travel_start}".encode()).hexdigest()[:8], 16)
                    random.seed(seed_val)
                    price = round(base_price * random.uniform(0.8, 1.3))

                    # Calculate arrival time
                    dur_hours = int(duration_str.replace("h", "").split("m")[0]) if "h" in duration_str else 1
                    dur_mins = int(duration_str.split("h")[1].replace("min", "").strip()) if "h" in duration_str and len(duration_str.split("h")) > 1 and duration_str.split("h")[1].strip() else 0
                    dep_h, dep_m = int(dep_time.split(":")[0]), int(dep_time.split(":")[1])
                    arr_h = dep_h + dur_hours
                    arr_m = dep_m + dur_mins
                    if arr_m >= 60:
                        arr_h += 1
                        arr_m -= 60
                    arrival_time = f"{arr_h:02d}:{arr_m:02d}"

                    outbound_flights.append({
                        "traveler": t["name"],
                        "from": t["departure_city"],
                        "to": dest["name"],
                        "departure_time": dep_time,
                        "arrival_time": arrival_time,
                        "duration": duration_str,
                        "price": price,
                        "date": travel_start,
                        "link": flight_info.get("link", ""),
                        "option_index": i
                    })
            else:
                # No direct flight found, generate generic
                for i, dep_time in enumerate(["09:00", "13:00", "18:00"]):
                    outbound_flights.append({
                        "traveler": t["name"],
                        "from": t["departure_city"],
                        "to": dest["name"],
                        "departure_time": dep_time,
                        "arrival_time": f"{int(dep_time.split(':')[0])+2:02d}:00",
                        "duration": "2h",
                        "price": round(80 * random.uniform(0.8, 1.3)),
                        "date": travel_start,
                        "link": f"https://www.skyscanner.com/transport/flights/{t['departure_city'][:3].lower()}/{dest['id'][:3]}",
                        "option_index": i
                    })

        # Find best combination where everyone arrives within 1h
        best_combo = None
        best_spread = 999
        if outbound_flights:
            traveler_names = list(set(f["traveler"] for f in outbound_flights))
            traveler_flights = {name: [f for f in outbound_flights if f["traveler"] == name] for name in traveler_names}

            # Simple greedy: try all option_index combos (max 3^n but n is small)
            from itertools import product
            options_per = [list(range(min(3, len(traveler_flights.get(n, []))))) for n in traveler_names]
            for combo in product(*options_per):
                selected = []
                for idx, name in enumerate(traveler_names):
                    flights = traveler_flights.get(name, [])
                    if combo[idx] < len(flights):
                        selected.append(flights[combo[idx]])
                if len(selected) == len(traveler_names):
                    arrivals = [int(f["arrival_time"].replace(":", "")) for f in selected]
                    spread = max(arrivals) - min(arrivals)
                    total_cost = sum(f["price"] for f in selected)
                    if spread < best_spread or (spread == best_spread and total_cost < (best_combo["total_cost"] if best_combo else 9999)):
                        best_spread = spread
                        best_combo = {
                            "flights": selected,
                            "arrival_spread_mins": spread // 100 * 60 + spread % 100,
                            "total_cost": total_cost,
                            "within_1h": spread <= 100  # 1h = 100 in HHMM
                        }

        coordination_results.append({
            "destination": {"id": dest["id"], "name": dest["name"], "image": dest["image"]},
            "best_combination": best_combo,
            "all_flights": outbound_flights
        })

    coordination_results.sort(key=lambda x: x["best_combination"]["arrival_spread_mins"] if x.get("best_combination") else 9999)

    return {
        "coordination": coordination_results,
        "travel_dates": {"start": travel_start, "end": travel_end},
        "travelers": travelers
    }

# ---- GROUP POLLING ----
class PollCreateInput(BaseModel):
    question: str
    options: List[str]
    allow_multiple: bool = False
    expires_in_hours: Optional[int] = None

class PollVoteInput(BaseModel):
    option_indices: List[int]

@api_router.post("/trips/{trip_id}/polls")
async def create_poll(trip_id: str, input_data: PollCreateInput, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if len(input_data.options) < 2:
        raise HTTPException(status_code=400, detail="At least 2 options required")
    
    now = datetime.now(timezone.utc)
    expires_at = None
    if input_data.expires_in_hours:
        expires_at = (now + timedelta(hours=input_data.expires_in_hours)).isoformat()
    
    poll = {
        "id": str(uuid.uuid4()),
        "trip_id": trip_id,
        "creator_id": user["_id"],
        "creator_name": user.get("name", ""),
        "question": input_data.question,
        "options": [{"text": opt, "votes": []} for opt in input_data.options],
        "allow_multiple": input_data.allow_multiple,
        "status": "active",
        "expires_at": expires_at,
        "created_at": now.isoformat(),
        "total_votes": 0
    }
    await db.polls.insert_one(poll)
    poll.pop("_id", None)
    
    # Notify all participants
    participants = trip.get("participants", [])
    for p in participants:
        if p.get("user_id") != user["_id"]:
            await create_notification(
                p["user_id"],
                "New Poll!",
                f'{user.get("name", "")} asks: "{input_data.question}"',
                trip_id,
                "poll"
            )
    
    # WebSocket broadcast
    await notify_trip(trip_id, "new_poll", {
        "poll_id": poll["id"],
        "question": input_data.question,
        "creator_name": user.get("name", "")
    })
    
    return poll

@api_router.get("/trips/{trip_id}/polls")
async def get_polls(trip_id: str, user=Depends(get_current_user)):
    polls = await db.polls.find({"trip_id": trip_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    # Check expiry
    now = datetime.now(timezone.utc).isoformat()
    for p in polls:
        if p.get("expires_at") and p["expires_at"] < now and p["status"] == "active":
            p["status"] = "expired"
            await db.polls.update_one({"id": p["id"]}, {"$set": {"status": "expired"}})
    return polls

@api_router.post("/trips/{trip_id}/polls/{poll_id}/vote")
async def vote_on_poll(trip_id: str, poll_id: str, input_data: PollVoteInput, user=Depends(get_current_user)):
    poll = await db.polls.find_one({"id": poll_id, "trip_id": trip_id}, {"_id": 0})
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    if poll.get("status") != "active":
        raise HTTPException(status_code=400, detail="Poll is closed")
    
    # Remove existing votes from this user
    for opt in poll["options"]:
        opt["votes"] = [v for v in opt["votes"] if v.get("user_id") != user["_id"]]
    
    # Add new votes
    if not poll.get("allow_multiple") and len(input_data.option_indices) > 1:
        raise HTTPException(status_code=400, detail="Only one choice allowed")
    
    vote_entry = {"user_id": user["_id"], "user_name": user.get("name", ""), "voted_at": datetime.now(timezone.utc).isoformat()}
    for idx in input_data.option_indices:
        if 0 <= idx < len(poll["options"]):
            poll["options"][idx]["votes"].append(vote_entry)
    
    total = sum(len(o["votes"]) for o in poll["options"])
    await db.polls.update_one(
        {"id": poll_id},
        {"$set": {"options": poll["options"], "total_votes": total}}
    )
    
    # WebSocket broadcast
    await notify_trip(trip_id, "poll_vote", {
        "poll_id": poll_id,
        "user_name": user.get("name", ""),
        "question": poll.get("question", "")
    })
    
    poll["total_votes"] = total
    return poll

@api_router.post("/trips/{trip_id}/polls/{poll_id}/close")
async def close_poll(trip_id: str, poll_id: str, user=Depends(get_current_user)):
    poll = await db.polls.find_one({"id": poll_id, "trip_id": trip_id})
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    if poll.get("creator_id") != user["_id"]:
        raise HTTPException(status_code=403, detail="Only the creator can close a poll")
    await db.polls.update_one({"id": poll_id}, {"$set": {"status": "closed"}})
    
    # Find winner
    poll_data = await db.polls.find_one({"id": poll_id}, {"_id": 0})
    winner = max(poll_data["options"], key=lambda o: len(o["votes"]))
    
    # Notify
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    for p in trip.get("participants", []):
        await create_notification(
            p["user_id"],
            "Poll closed!",
            f'"{poll_data["question"]}" — Winner: {winner["text"]}',
            trip_id,
            "poll"
        )
    await notify_trip(trip_id, "poll_closed", {"poll_id": poll_id, "winner": winner["text"]})
    return {"message": "Poll closed", "winner": winner["text"]}

# ---- TRIP TEMPLATES ----
TRIP_TEMPLATES = [
    {
        "id": "bachelor-barcelona", "name": "Bachelor Weekend in Barcelona",
        "trip_type": "evg", "description": "3-day legendary stag do with beach, nightlife, and tapas crawl",
        "group_size": 8, "per_person_budget": 400, "currency": "EUR", "duration_days": 3,
        "destination_id": "barcelona",
        "image": "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800",
        "suggested_activities": ["Las Ramblas Bar Crawl", "Barceloneta Beach", "Sagrada Familia", "Tapas Crawl"],
        "tags": ["party", "beach", "culture"], "popularity": 95
    },
    {
        "id": "romantic-paris", "name": "Romantic Weekend in Paris",
        "trip_type": "romantic", "description": "The ultimate couples escape with Seine river cruise, Montmartre, and fine dining",
        "group_size": 2, "per_person_budget": 500, "currency": "EUR", "duration_days": 3,
        "destination_id": "paris",
        "image": "https://images.unsplash.com/photo-1642947392578-b37fbd9a4d45?w=800",
        "suggested_activities": ["Seine River Cruise", "Montmartre Walking Tour", "Eiffel Tower Visit", "Louvre Museum"],
        "tags": ["romantic", "culture", "luxury"], "popularity": 92
    },
    {
        "id": "bachelorette-lisbon", "name": "Bachelorette in Lisbon",
        "trip_type": "evjf", "description": "Sun-drenched girls trip with rooftop bars, tram 28, and Sintra palace",
        "group_size": 6, "per_person_budget": 350, "currency": "EUR", "duration_days": 3,
        "destination_id": "lisbon",
        "image": "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800",
        "suggested_activities": ["Tram 28 Ride", "LX Factory", "Sintra Day Trip", "Belem Tower"],
        "tags": ["party", "culture", "beach"], "popularity": 90
    },
    {
        "id": "birthday-amsterdam", "name": "Birthday Weekend in Amsterdam",
        "trip_type": "birthday", "description": "Canal cruises, world-class museums, and legendary nightlife",
        "group_size": 6, "per_person_budget": 450, "currency": "EUR", "duration_days": 3,
        "destination_id": "amsterdam",
        "image": "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800",
        "suggested_activities": ["Van Gogh Museum", "Canal Cruise", "Vondelpark Cycling", "Nightlife Tour"],
        "tags": ["party", "culture", "nature"], "popularity": 88
    },
    {
        "id": "family-rome", "name": "Family Holiday in Rome",
        "trip_type": "family", "description": "Ancient wonders, incredible food, and gelato for the kids",
        "group_size": 4, "per_person_budget": 400, "currency": "EUR", "duration_days": 4,
        "destination_id": "rome",
        "image": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800",
        "suggested_activities": ["Colosseum Tour", "Vatican Museums", "Trastevere Food Tour"],
        "tags": ["family-friendly", "culture", "food"], "popularity": 87
    },
    {
        "id": "adventure-marrakech", "name": "Adventure Trip to Marrakech",
        "trip_type": "adventure", "description": "Explore souks, hike the Atlas Mountains, and relax in a riad",
        "group_size": 4, "per_person_budget": 300, "currency": "EUR", "duration_days": 4,
        "destination_id": "marrakech",
        "image": "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800",
        "suggested_activities": ["Medina Walking Tour", "Atlas Mountains Day Trip", "Traditional Hammam"],
        "tags": ["adventure", "culture", "luxury"], "popularity": 85
    },
    {
        "id": "citybreak-london", "name": "City Break in London",
        "trip_type": "city_break", "description": "West End shows, Borough Market, and Camden vibes",
        "group_size": 4, "per_person_budget": 520, "currency": "GBP", "duration_days": 3,
        "destination_id": "london",
        "image": "https://images.unsplash.com/photo-1694453517907-5e60ca5e548a?w=800",
        "suggested_activities": ["Tower of London", "West End Show", "Camden Market", "Borough Market"],
        "tags": ["culture", "party", "shopping"], "popularity": 86
    },
    {
        "id": "beach-athens", "name": "Beach & Culture in Athens",
        "trip_type": "beach", "description": "Ancient ruins by day, island hopping and rooftop bars by night",
        "group_size": 5, "per_person_budget": 350, "currency": "EUR", "duration_days": 4,
        "destination_id": "athens",
        "image": "https://images.unsplash.com/photo-1555993539-1732b0258235?w=800",
        "suggested_activities": ["Acropolis Visit", "Plaka Walking Tour", "Aegina Island Day Trip"],
        "tags": ["beach", "culture", "adventure"], "popularity": 84
    },
]

@api_router.get("/templates")
async def get_trip_templates():
    return TRIP_TEMPLATES

@api_router.get("/templates/{template_id}")
async def get_template(template_id: str):
    t = next((t for t in TRIP_TEMPLATES if t["id"] == template_id), None)
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return t

@api_router.post("/trips/from-template/{template_id}")
async def create_trip_from_template(template_id: str, user=Depends(get_current_user)):
    template = next((t for t in TRIP_TEMPLATES if t["id"] == template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    invite_code = secrets.token_urlsafe(8)
    trip_doc = {
        "name": template["name"], "trip_type": template["trip_type"],
        "description": template["description"], "group_size": template["group_size"],
        "per_person_budget": template["per_person_budget"], "currency": template["currency"],
        "start_date": None, "end_date": None, "flexible_dates": True,
        "owner_id": user["_id"], "owner_name": user.get("name", ""),
        "invite_code": invite_code, "status": "planning",
        "template_id": template_id, "suggested_destination": template["destination_id"],
        "participants": [{"user_id": user["_id"], "name": user.get("name", ""), "status": "joined", "preferences_submitted": False}],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.trips.insert_one(trip_doc)
    trip_doc.pop("_id", None)
    trip_doc["id"] = str(result.inserted_id)
    return trip_doc

# ---- AI CHATBOT ----
@api_router.post("/chat")
async def ai_chat(input_data: ChatMessageInput, user=Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY", "")
        if not api_key:
            return {"response": "AI chatbot unavailable. Please configure API key.", "error": True}
        
        # Build context
        context = ""
        if input_data.trip_id:
            trip = await db.trips.find_one({"_id": ObjectId(input_data.trip_id)})
            if trip:
                prefs = await db.preferences.find({"trip_id": input_data.trip_id}, {"_id": 0}).to_list(20)
                context = f"""Current trip: {trip.get('name')} ({trip.get('trip_type')})
Group size: {len(trip.get('participants', []))} people, Budget: {trip.get('per_person_budget')} {trip.get('currency', 'EUR')}/person
Participants with prefs: {len(prefs)}
Departure cities: {', '.join(set(p.get('departure_city', '') for p in prefs if p.get('departure_city')))}
Preferred types: {', '.join(set(t for p in prefs for t in p.get('destination_types', [])))}"""
        
        # Store chat in DB for persistence
        chat_history = await db.chat_messages.find(
            {"user_id": user["_id"], "trip_id": input_data.trip_id or "general"}
        ).sort("created_at", -1).limit(10).to_list(10)
        chat_history.reverse()
        
        system_msg = f"""You are TripSync AI, an expert travel planning assistant. You help groups plan trips together.
Be concise, friendly, and actionable. Use specific recommendations with prices and links when possible.
Available destinations: Paris, Barcelona, London, Madrid, Lisbon, Marrakech, Rome, Milan, Athens, Amsterdam.
{context}"""
        
        chat = LlmChat(api_key=api_key, session_id=f"chat-{user['_id']}-{uuid.uuid4().hex[:6]}", system_message=system_msg)
        chat.with_model("openai", "gpt-5.2")
        
        msg = UserMessage(text=input_data.message)
        response = await chat.send_message(msg)
        
        # Save messages
        now = datetime.now(timezone.utc).isoformat()
        await db.chat_messages.insert_one({
            "user_id": user["_id"], "trip_id": input_data.trip_id or "general",
            "role": "user", "content": input_data.message, "created_at": now
        })
        await db.chat_messages.insert_one({
            "user_id": user["_id"], "trip_id": input_data.trip_id or "general",
            "role": "assistant", "content": response, "created_at": now
        })
        
        return {"response": response, "error": False}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"response": f"Sorry, I couldn't process that: {str(e)}", "error": True}

@api_router.get("/chat/history")
async def get_chat_history(trip_id: str = "general", user=Depends(get_current_user)):
    messages = await db.chat_messages.find(
        {"user_id": user["_id"], "trip_id": trip_id}, {"_id": 0}
    ).sort("created_at", 1).limit(50).to_list(50)
    return messages

# ---- GOOGLE CALENDAR EXPORT ----
@api_router.get("/trips/{trip_id}/calendar-export")
async def export_calendar(trip_id: str, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Get top voted destination
    votes = await db.votes.find({"trip_id": trip_id}, {"_id": 0}).to_list(500)
    tally = {}
    for v in votes:
        tally[v["destination_id"]] = tally.get(v["destination_id"], 0) + v.get("score", 0)
    winner_id = max(tally, key=tally.get) if tally else None
    dest = await db.destinations.find_one({"id": winner_id}, {"_id": 0}) if winner_id else None
    
    trip_name = trip.get("name", "Trip")
    start = trip.get("start_date", "")
    end = trip.get("end_date", "")
    dest_name = dest.get("name", "TBD") if dest else "TBD"
    
    # Generate ICS
    now_str = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    start_ics = start.replace("-", "") + "T100000Z" if start else now_str
    end_ics = end.replace("-", "") + "T180000Z" if end else now_str
    
    desc_parts = [f"Trip: {trip_name}", f"Destination: {dest_name}", f"Type: {trip.get('trip_type', '')}"]
    desc_parts.append(f"Budget: {trip.get('per_person_budget', 0)} {trip.get('currency', 'EUR')}/person")
    desc_parts.append(f"Group: {len(trip.get('participants', []))} people")
    if dest:
        desc_parts.append(f"Activities: {', '.join(a['name'] for a in dest.get('activities', [])[:4])}")
        desc_parts.append(f"Restaurants: {', '.join(r['name'] for r in dest.get('restaurants', [])[:3])}")
    description = "\\n".join(desc_parts)
    
    ics = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TripSync//EN
BEGIN:VEVENT
UID:{trip_id}@tripsync
DTSTART:{start_ics}
DTEND:{end_ics}
SUMMARY:{trip_name} - {dest_name}
DESCRIPTION:{description}
LOCATION:{dest_name}, {dest.get('country', '') if dest else ''}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR"""
    
    # Also return Google Calendar URL
    gc_title = f"{trip_name} - {dest_name}".replace(" ", "+")
    gc_details = description.replace("\\n", "%0A").replace(" ", "+")
    gc_location = f"{dest_name},+{dest.get('country', '') if dest else ''}".replace(" ", "+")
    google_cal_url = f"https://calendar.google.com/calendar/render?action=TEMPLATE&text={gc_title}&dates={start_ics}/{end_ics}&details={gc_details}&location={gc_location}"
    
    return {
        "ics_content": ics,
        "google_calendar_url": google_cal_url,
        "trip_name": trip_name,
        "destination": dest_name,
        "start_date": start,
        "end_date": end
    }

# ---- GROUP DEAL FINDER ----
# Simulated price monitoring with realistic fluctuations
import random

def get_simulated_price(base_price: float, dest_id: str, seed: int = 0) -> dict:
    random.seed(hash(f"{dest_id}-{seed}-{datetime.now(timezone.utc).strftime('%Y%m%d')}"))
    flight_mult = random.uniform(0.7, 1.4)
    hotel_mult = random.uniform(0.75, 1.3)
    flight_price = round(base_price * 0.3 * flight_mult, 0)
    hotel_price = round(base_price * 0.4 * hotel_mult, 0)
    total = flight_price + hotel_price + round(base_price * 0.3, 0)  # activities/food fixed
    trend = "down" if flight_mult < 0.9 else "up" if flight_mult > 1.15 else "stable"
    pct_change = round((flight_mult - 1.0) * 100, 1)
    return {
        "total_estimated": total, "flight_price": flight_price,
        "hotel_price_night": round(hotel_price / 3, 0),
        "trend": trend, "pct_change": pct_change,
        "last_checked": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/trips/{trip_id}/deals")
async def get_deals(trip_id: str, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    dests = await db.destinations.find({}, {"_id": 0}).to_list(100)
    budget = trip.get("per_person_budget", 500)
    deals = []
    for d in dests:
        base = d.get("avg_budget_per_person", 500)
        prices = get_simulated_price(base, d["id"])
        is_deal = prices["total_estimated"] <= budget
        savings = max(0, base - prices["total_estimated"])
        deals.append({
            "destination": {"id": d["id"], "name": d["name"], "country": d["country"], "image": d["image"]},
            "base_price": base, "current_price": prices["total_estimated"],
            "flight_price": prices["flight_price"], "hotel_price_night": prices["hotel_price_night"],
            "savings": savings, "is_deal": is_deal,
            "trend": prices["trend"], "pct_change": prices["pct_change"],
            "currency": d.get("currency", "EUR"),
            "budget_target": budget,
            "deep_links": {
                "flights": f"https://www.skyscanner.com/transport/flights/any/{d['id'][:3]}",
                "hotels": f"https://www.booking.com/searchresults.html?ss={d['name']}",
                "airbnb": f"https://www.airbnb.com/s/{d['name']}"
            },
            "last_checked": prices["last_checked"]
        })
    deals.sort(key=lambda x: x["savings"], reverse=True)
    # Tag best deals
    for d in deals[:3]:
        if d["savings"] > 0:
            d["badge"] = "Hot Deal"
    return {"deals": deals, "budget_target": budget, "currency": trip.get("currency", "EUR")}

@api_router.post("/deal-alerts")
async def create_deal_alert(input_data: DealAlertInput, user=Depends(get_current_user)):
    alert = {
        "id": str(uuid.uuid4()), "user_id": user["_id"], "user_name": user.get("name", ""),
        "trip_id": input_data.trip_id, "destination_id": input_data.destination_id,
        "max_budget": input_data.max_budget, "currency": input_data.currency,
        "active": True, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.deal_alerts.insert_one(alert)
    alert.pop("_id", None)
    return alert

@api_router.get("/deal-alerts")
async def get_deal_alerts(user=Depends(get_current_user)):
    alerts = await db.deal_alerts.find({"user_id": user["_id"]}, {"_id": 0}).to_list(50)
    return alerts

@api_router.delete("/deal-alerts/{alert_id}")
async def delete_deal_alert(alert_id: str, user=Depends(get_current_user)):
    await db.deal_alerts.delete_one({"id": alert_id, "user_id": user["_id"]})
    return {"message": "Alert deleted"}

# ---- SEED DATA ----
DESTINATIONS_SEED = [
    {
        "id": "paris", "name": "Paris", "country": "France", "emoji": "FR",
        "image": "https://images.unsplash.com/photo-1642947392578-b37fbd9a4d45?w=800",
        "description": "The City of Light enchants with world-class cuisine, iconic landmarks, and romantic ambiance.",
        "types": ["city", "culture", "romantic", "luxury", "family-friendly"],
        "avg_budget_per_person": 450, "currency": "EUR",
        "best_months": ["apr", "may", "jun", "sep", "oct"],
        "weather": {"spring": "mild", "summer": "warm", "autumn": "cool", "winter": "cold"},
        "main_transport": ["plane", "train"],
        "transport_from": {
            "London": {"train": {"duration": "2h15", "price": 80, "link": "https://www.eurostar.com"}, "plane": {"duration": "1h15", "price": 60, "link": "https://www.skyscanner.com/transport/flights/lond/pari"}},
            "Madrid": {"plane": {"duration": "2h", "price": 70, "link": "https://www.skyscanner.com/transport/flights/mad/pari"}},
            "Brussels": {"train": {"duration": "1h20", "price": 35, "link": "https://www.thalys.com"}},
            "Amsterdam": {"train": {"duration": "3h20", "price": 50, "link": "https://www.thalys.com"}, "plane": {"duration": "1h10", "price": 65, "link": "https://www.skyscanner.com/transport/flights/ams/pari"}}
        },
        "accommodations": [
            {"type": "hotel", "name": "Le Marais Boutique", "price_night": 120, "rating": 4.5, "link": "https://www.booking.com/searchresults.html?ss=Le+Marais+Paris"},
            {"type": "airbnb", "name": "Montmartre Apartment", "price_night": 85, "rating": 4.7, "link": "https://www.airbnb.com/s/Montmartre--Paris"},
            {"type": "hostel", "name": "Generator Paris", "price_night": 35, "rating": 4.2, "link": "https://www.booking.com/hotel/fr/generator-paris.html"}
        ],
        "restaurants": [
            {"name": "Le Bouillon Chartier", "cuisine": "French", "price_range": "15-25 EUR", "rating": 4.4, "link": "https://maps.google.com/?q=Le+Bouillon+Chartier+Paris"},
            {"name": "Pink Mamma", "cuisine": "Italian", "price_range": "20-35 EUR", "rating": 4.5, "link": "https://maps.google.com/?q=Pink+Mamma+Paris"},
            {"name": "Chez Janou", "cuisine": "French Bistro", "price_range": "25-40 EUR", "rating": 4.6, "link": "https://maps.google.com/?q=Chez+Janou+Paris"}
        ],
        "activities": [
            {"name": "Eiffel Tower Visit", "price": 26, "duration": "2h", "type": "culture"},
            {"name": "Louvre Museum", "price": 17, "duration": "3h", "type": "culture"},
            {"name": "Seine River Cruise", "price": 15, "duration": "1h", "type": "romantic"},
            {"name": "Montmartre Walking Tour", "price": 0, "duration": "2h", "type": "culture"}
        ],
        "transfers": [
            {"from": "CDG Airport", "to": "City Center", "options": [
                {"type": "RER Train", "price": 11, "duration": "35min", "link": "https://www.ratp.fr"},
                {"type": "Taxi", "price": 55, "duration": "45min", "link": "https://www.uber.com"},
                {"type": "Uber", "price": 40, "duration": "45min", "link": "https://www.uber.com"}
            ]}
        ],
        "trip_type_tags": ["romantic", "evjf", "birthday", "city_break", "culture"]
    },
    {
        "id": "barcelona", "name": "Barcelona", "country": "Spain", "emoji": "ES",
        "image": "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800",
        "description": "Sun-soaked city with stunning architecture, vibrant nightlife, and Mediterranean beaches.",
        "types": ["city", "beach", "party", "culture", "adventure"],
        "avg_budget_per_person": 380, "currency": "EUR",
        "best_months": ["may", "jun", "sep", "oct"],
        "weather": {"spring": "warm", "summer": "hot", "autumn": "warm", "winter": "mild"},
        "main_transport": ["plane", "train"],
        "transport_from": {
            "Paris": {"plane": {"duration": "1h50", "price": 55, "link": "https://www.skyscanner.com/transport/flights/pari/bcn"}, "train": {"duration": "6h30", "price": 60, "link": "https://www.renfe.com"}},
            "London": {"plane": {"duration": "2h15", "price": 50, "link": "https://www.skyscanner.com/transport/flights/lond/bcn"}},
            "Madrid": {"train": {"duration": "2h30", "price": 35, "link": "https://www.renfe.com"}, "plane": {"duration": "1h15", "price": 40, "link": "https://www.skyscanner.com/transport/flights/mad/bcn"}}
        },
        "accommodations": [
            {"type": "hotel", "name": "Hotel Arts Barcelona", "price_night": 150, "rating": 4.7, "link": "https://www.booking.com/hotel/es/arts-barcelona.html"},
            {"type": "airbnb", "name": "Gothic Quarter Flat", "price_night": 70, "rating": 4.6, "link": "https://www.airbnb.com/s/Gothic-Quarter--Barcelona"},
            {"type": "hostel", "name": "Sant Jordi Hostel", "price_night": 25, "rating": 4.5, "link": "https://www.booking.com/hotel/es/sant-jordi-hostel.html"}
        ],
        "restaurants": [
            {"name": "Can Paixano", "cuisine": "Spanish Tapas", "price_range": "10-20 EUR", "rating": 4.3, "link": "https://maps.google.com/?q=Can+Paixano+Barcelona"},
            {"name": "El Nacional", "cuisine": "Mediterranean", "price_range": "25-45 EUR", "rating": 4.5, "link": "https://maps.google.com/?q=El+Nacional+Barcelona"},
            {"name": "Cerveceria Catalana", "cuisine": "Tapas", "price_range": "15-30 EUR", "rating": 4.6, "link": "https://maps.google.com/?q=Cerveceria+Catalana+Barcelona"}
        ],
        "activities": [
            {"name": "Sagrada Familia", "price": 26, "duration": "1h30", "type": "culture"},
            {"name": "Park Guell", "price": 10, "duration": "2h", "type": "culture"},
            {"name": "Barceloneta Beach", "price": 0, "duration": "3h", "type": "beach"},
            {"name": "Las Ramblas Bar Crawl", "price": 30, "duration": "4h", "type": "party"}
        ],
        "transfers": [
            {"from": "El Prat Airport", "to": "City Center", "options": [
                {"type": "Aerobus", "price": 7, "duration": "35min", "link": "https://aerobusbcn.com"},
                {"type": "Taxi", "price": 40, "duration": "25min", "link": "https://www.uber.com"}
            ]}
        ],
        "trip_type_tags": ["evg", "evjf", "birthday", "beach", "party", "city_break"]
    },
    {
        "id": "london", "name": "London", "country": "United Kingdom", "emoji": "GB",
        "image": "https://images.unsplash.com/photo-1694453517907-5e60ca5e548a?w=800",
        "description": "Cosmopolitan capital with rich history, world-class shows, and eclectic neighborhoods.",
        "types": ["city", "culture", "party", "luxury", "family-friendly"],
        "avg_budget_per_person": 520, "currency": "GBP",
        "best_months": ["may", "jun", "jul", "aug", "sep"],
        "weather": {"spring": "mild", "summer": "warm", "autumn": "cool", "winter": "cold"},
        "main_transport": ["plane", "train"],
        "transport_from": {
            "Paris": {"train": {"duration": "2h15", "price": 80, "link": "https://www.eurostar.com"}, "plane": {"duration": "1h15", "price": 55, "link": "https://www.skyscanner.com/transport/flights/pari/lond"}},
            "Amsterdam": {"plane": {"duration": "1h10", "price": 50, "link": "https://www.skyscanner.com/transport/flights/ams/lond"}},
            "Madrid": {"plane": {"duration": "2h30", "price": 65, "link": "https://www.skyscanner.com/transport/flights/mad/lond"}}
        },
        "accommodations": [
            {"type": "hotel", "name": "The Hoxton Shoreditch", "price_night": 140, "rating": 4.5, "link": "https://www.booking.com/hotel/gb/the-hoxton-shoreditch.html"},
            {"type": "airbnb", "name": "Camden Town Flat", "price_night": 95, "rating": 4.4, "link": "https://www.airbnb.com/s/Camden--London"},
            {"type": "hostel", "name": "Wombats City Hostel", "price_night": 30, "rating": 4.3, "link": "https://www.booking.com/hotel/gb/wombats-city-hostel-london.html"}
        ],
        "restaurants": [
            {"name": "Dishoom", "cuisine": "Indian", "price_range": "15-25 GBP", "rating": 4.7, "link": "https://maps.google.com/?q=Dishoom+London"},
            {"name": "Borough Market", "cuisine": "Street Food", "price_range": "10-20 GBP", "rating": 4.6, "link": "https://maps.google.com/?q=Borough+Market+London"}
        ],
        "activities": [
            {"name": "Tower of London", "price": 30, "duration": "3h", "type": "culture"},
            {"name": "West End Show", "price": 50, "duration": "3h", "type": "entertainment"},
            {"name": "Camden Market", "price": 0, "duration": "2h", "type": "shopping"}
        ],
        "transfers": [
            {"from": "Heathrow Airport", "to": "City Center", "options": [
                {"type": "Heathrow Express", "price": 25, "duration": "15min", "link": "https://www.heathrowexpress.com"},
                {"type": "Underground", "price": 6, "duration": "50min", "link": "https://tfl.gov.uk"},
                {"type": "Uber", "price": 45, "duration": "45min", "link": "https://www.uber.com"}
            ]}
        ],
        "trip_type_tags": ["evg", "evjf", "birthday", "culture", "party", "city_break"]
    },
    {
        "id": "madrid", "name": "Madrid", "country": "Spain", "emoji": "ES",
        "image": "https://images.unsplash.com/photo-1735091761934-c17b8432fa97?w=800",
        "description": "Lively Spanish capital with late-night tapas, stunning art museums, and warm hospitality.",
        "types": ["city", "culture", "party", "family-friendly"],
        "avg_budget_per_person": 350, "currency": "EUR",
        "best_months": ["apr", "may", "jun", "sep", "oct"],
        "weather": {"spring": "warm", "summer": "hot", "autumn": "warm", "winter": "mild"},
        "main_transport": ["plane", "train"],
        "transport_from": {
            "Paris": {"plane": {"duration": "2h", "price": 65, "link": "https://www.skyscanner.com/transport/flights/pari/mad"}},
            "Barcelona": {"train": {"duration": "2h30", "price": 35, "link": "https://www.renfe.com"}},
            "Lisbon": {"plane": {"duration": "1h15", "price": 40, "link": "https://www.skyscanner.com/transport/flights/lis/mad"}}
        },
        "accommodations": [
            {"type": "hotel", "name": "Room Mate Oscar", "price_night": 100, "rating": 4.5, "link": "https://www.booking.com/hotel/es/room-mate-oscar.html"},
            {"type": "airbnb", "name": "Malasana Loft", "price_night": 65, "rating": 4.6, "link": "https://www.airbnb.com/s/Malasana--Madrid"}
        ],
        "restaurants": [
            {"name": "Mercado de San Miguel", "cuisine": "Tapas Market", "price_range": "15-30 EUR", "rating": 4.5, "link": "https://maps.google.com/?q=Mercado+de+San+Miguel+Madrid"},
            {"name": "Sobrino de Botin", "cuisine": "Traditional Spanish", "price_range": "30-50 EUR", "rating": 4.6, "link": "https://maps.google.com/?q=Sobrino+de+Botin+Madrid"}
        ],
        "activities": [
            {"name": "Prado Museum", "price": 15, "duration": "3h", "type": "culture"},
            {"name": "Retiro Park", "price": 0, "duration": "2h", "type": "nature"},
            {"name": "Tapas Crawl", "price": 25, "duration": "3h", "type": "party"}
        ],
        "transfers": [
            {"from": "Barajas Airport", "to": "City Center", "options": [
                {"type": "Metro", "price": 5, "duration": "30min", "link": "https://www.metromadrid.es"},
                {"type": "Taxi", "price": 30, "duration": "20min", "link": "https://www.uber.com"}
            ]}
        ],
        "trip_type_tags": ["evg", "evjf", "birthday", "culture", "party", "city_break"]
    },
    {
        "id": "lisbon", "name": "Lisbon", "country": "Portugal", "emoji": "PT",
        "image": "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800",
        "description": "Hilly coastal capital with pastel buildings, incredible seafood, and affordable charm.",
        "types": ["city", "beach", "culture", "adventure", "party"],
        "avg_budget_per_person": 300, "currency": "EUR",
        "best_months": ["apr", "may", "jun", "sep", "oct"],
        "weather": {"spring": "warm", "summer": "hot", "autumn": "warm", "winter": "mild"},
        "main_transport": ["plane"],
        "transport_from": {
            "Paris": {"plane": {"duration": "2h30", "price": 55, "link": "https://www.skyscanner.com/transport/flights/pari/lis"}},
            "London": {"plane": {"duration": "2h45", "price": 50, "link": "https://www.skyscanner.com/transport/flights/lond/lis"}},
            "Madrid": {"plane": {"duration": "1h15", "price": 40, "link": "https://www.skyscanner.com/transport/flights/mad/lis"}}
        },
        "accommodations": [
            {"type": "hotel", "name": "Hotel Alfama", "price_night": 80, "rating": 4.5, "link": "https://www.booking.com/searchresults.html?ss=Alfama+Lisbon"},
            {"type": "airbnb", "name": "Bairro Alto Flat", "price_night": 55, "rating": 4.7, "link": "https://www.airbnb.com/s/Bairro-Alto--Lisbon"}
        ],
        "restaurants": [
            {"name": "Time Out Market", "cuisine": "Food Hall", "price_range": "10-25 EUR", "rating": 4.5, "link": "https://maps.google.com/?q=Time+Out+Market+Lisbon"},
            {"name": "Cervejaria Ramiro", "cuisine": "Seafood", "price_range": "25-45 EUR", "rating": 4.7, "link": "https://maps.google.com/?q=Cervejaria+Ramiro+Lisbon"}
        ],
        "activities": [
            {"name": "Tram 28 Ride", "price": 3, "duration": "1h", "type": "culture"},
            {"name": "Belem Tower", "price": 8, "duration": "1h", "type": "culture"},
            {"name": "LX Factory", "price": 0, "duration": "2h", "type": "shopping"},
            {"name": "Sintra Day Trip", "price": 20, "duration": "6h", "type": "adventure"}
        ],
        "transfers": [
            {"from": "Lisbon Airport", "to": "City Center", "options": [
                {"type": "Metro", "price": 2, "duration": "20min", "link": "https://www.metrolisboa.pt"},
                {"type": "Uber", "price": 12, "duration": "15min", "link": "https://www.uber.com"}
            ]}
        ],
        "trip_type_tags": ["evg", "evjf", "birthday", "beach", "culture", "adventure"]
    },
    {
        "id": "marrakech", "name": "Marrakech", "country": "Morocco", "emoji": "MA",
        "image": "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800",
        "description": "Exotic medina city with vibrant souks, riads, and Saharan adventure doorstep.",
        "types": ["culture", "adventure", "luxury", "quiet"],
        "avg_budget_per_person": 280, "currency": "EUR",
        "best_months": ["mar", "apr", "may", "oct", "nov"],
        "weather": {"spring": "warm", "summer": "very_hot", "autumn": "warm", "winter": "mild"},
        "main_transport": ["plane"],
        "transport_from": {
            "Paris": {"plane": {"duration": "3h15", "price": 80, "link": "https://www.skyscanner.com/transport/flights/pari/rak"}},
            "London": {"plane": {"duration": "3h30", "price": 75, "link": "https://www.skyscanner.com/transport/flights/lond/rak"}},
            "Madrid": {"plane": {"duration": "2h", "price": 50, "link": "https://www.skyscanner.com/transport/flights/mad/rak"}}
        },
        "accommodations": [
            {"type": "riad", "name": "Riad Yasmine", "price_night": 70, "rating": 4.8, "link": "https://www.booking.com/hotel/ma/riad-yasmine.html"},
            {"type": "hotel", "name": "La Mamounia", "price_night": 250, "rating": 4.9, "link": "https://www.booking.com/hotel/ma/la-mamounia.html"}
        ],
        "restaurants": [
            {"name": "Nomad", "cuisine": "Moroccan Modern", "price_range": "15-30 EUR", "rating": 4.5, "link": "https://maps.google.com/?q=Nomad+Marrakech"},
            {"name": "Jemaa el-Fnaa Food Stalls", "cuisine": "Street Food", "price_range": "5-10 EUR", "rating": 4.3, "link": "https://maps.google.com/?q=Jemaa+el+Fnaa+Marrakech"}
        ],
        "activities": [
            {"name": "Medina Walking Tour", "price": 15, "duration": "3h", "type": "culture"},
            {"name": "Atlas Mountains Day Trip", "price": 45, "duration": "8h", "type": "adventure"},
            {"name": "Traditional Hammam", "price": 25, "duration": "2h", "type": "luxury"}
        ],
        "transfers": [
            {"from": "Menara Airport", "to": "Medina", "options": [
                {"type": "Taxi", "price": 8, "duration": "15min", "link": ""},
                {"type": "Hotel Transfer", "price": 15, "duration": "20min", "link": ""}
            ]}
        ],
        "trip_type_tags": ["evjf", "romantic", "adventure", "culture"]
    },
    {
        "id": "rome", "name": "Rome", "country": "Italy", "emoji": "IT",
        "image": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800",
        "description": "The Eternal City where ancient ruins meet la dolce vita lifestyle.",
        "types": ["city", "culture", "romantic", "family-friendly"],
        "avg_budget_per_person": 400, "currency": "EUR",
        "best_months": ["apr", "may", "jun", "sep", "oct"],
        "weather": {"spring": "warm", "summer": "hot", "autumn": "warm", "winter": "mild"},
        "main_transport": ["plane", "train"],
        "transport_from": {
            "Paris": {"plane": {"duration": "2h", "price": 55, "link": "https://www.skyscanner.com/transport/flights/pari/rome"}},
            "London": {"plane": {"duration": "2h30", "price": 50, "link": "https://www.skyscanner.com/transport/flights/lond/rome"}},
            "Milan": {"train": {"duration": "3h", "price": 30, "link": "https://www.trenitalia.com"}}
        },
        "accommodations": [
            {"type": "hotel", "name": "Hotel Campo de Fiori", "price_night": 110, "rating": 4.5, "link": "https://www.booking.com/searchresults.html?ss=Campo+de+Fiori+Rome"},
            {"type": "airbnb", "name": "Trastevere Apartment", "price_night": 75, "rating": 4.6, "link": "https://www.airbnb.com/s/Trastevere--Rome"}
        ],
        "restaurants": [
            {"name": "Da Enzo al 29", "cuisine": "Roman", "price_range": "15-30 EUR", "rating": 4.7, "link": "https://maps.google.com/?q=Da+Enzo+al+29+Rome"},
            {"name": "Pizzarium", "cuisine": "Pizza", "price_range": "8-15 EUR", "rating": 4.6, "link": "https://maps.google.com/?q=Pizzarium+Rome"}
        ],
        "activities": [
            {"name": "Colosseum Tour", "price": 18, "duration": "2h", "type": "culture"},
            {"name": "Vatican Museums", "price": 17, "duration": "3h", "type": "culture"},
            {"name": "Trastevere Food Tour", "price": 35, "duration": "3h", "type": "food"}
        ],
        "transfers": [
            {"from": "Fiumicino Airport", "to": "City Center", "options": [
                {"type": "Leonardo Express", "price": 14, "duration": "32min", "link": "https://www.trenitalia.com"},
                {"type": "Taxi", "price": 48, "duration": "40min", "link": "https://www.uber.com"}
            ]}
        ],
        "trip_type_tags": ["romantic", "birthday", "culture", "family", "city_break"]
    },
    {
        "id": "milan", "name": "Milan", "country": "Italy", "emoji": "IT",
        "image": "https://images.unsplash.com/photo-1520440229-6469bdd0c394?w=800",
        "description": "Fashion capital with stunning architecture, aperitivo culture, and Lake Como nearby.",
        "types": ["city", "culture", "luxury", "shopping"],
        "avg_budget_per_person": 420, "currency": "EUR",
        "best_months": ["apr", "may", "jun", "sep", "oct"],
        "weather": {"spring": "warm", "summer": "hot", "autumn": "cool", "winter": "cold"},
        "main_transport": ["plane", "train"],
        "transport_from": {
            "Paris": {"plane": {"duration": "1h30", "price": 50, "link": "https://www.skyscanner.com/transport/flights/pari/mila"}},
            "London": {"plane": {"duration": "2h", "price": 55, "link": "https://www.skyscanner.com/transport/flights/lond/mila"}},
            "Rome": {"train": {"duration": "3h", "price": 30, "link": "https://www.trenitalia.com"}}
        },
        "accommodations": [
            {"type": "hotel", "name": "NYX Hotel Milan", "price_night": 100, "rating": 4.4, "link": "https://www.booking.com/hotel/it/nyx-milan.html"},
            {"type": "airbnb", "name": "Navigli Canal Flat", "price_night": 70, "rating": 4.5, "link": "https://www.airbnb.com/s/Navigli--Milan"}
        ],
        "restaurants": [
            {"name": "Pavé", "cuisine": "Italian Brunch", "price_range": "12-25 EUR", "rating": 4.6, "link": "https://maps.google.com/?q=Pave+Milan"},
            {"name": "Navigli Aperitivo Tour", "cuisine": "Aperitivo", "price_range": "10-20 EUR", "rating": 4.5, "link": "https://maps.google.com/?q=Navigli+Milan"}
        ],
        "activities": [
            {"name": "Duomo Rooftop", "price": 14, "duration": "1h", "type": "culture"},
            {"name": "Lake Como Day Trip", "price": 25, "duration": "8h", "type": "nature"},
            {"name": "Galleria Vittorio Emanuele", "price": 0, "duration": "1h", "type": "shopping"}
        ],
        "transfers": [
            {"from": "Malpensa Airport", "to": "City Center", "options": [
                {"type": "Malpensa Express", "price": 13, "duration": "50min", "link": "https://www.malpensaexpress.it"},
                {"type": "Taxi", "price": 95, "duration": "50min", "link": "https://www.uber.com"}
            ]}
        ],
        "trip_type_tags": ["evjf", "birthday", "luxury", "culture", "shopping"]
    },
    {
        "id": "athens", "name": "Athens", "country": "Greece", "emoji": "GR",
        "image": "https://images.unsplash.com/photo-1555993539-1732b0258235?w=800",
        "description": "Ancient wonders meet vibrant street art, rooftop bars, and island-hopping gateways.",
        "types": ["city", "culture", "beach", "party", "adventure"],
        "avg_budget_per_person": 320, "currency": "EUR",
        "best_months": ["may", "jun", "sep", "oct"],
        "weather": {"spring": "warm", "summer": "hot", "autumn": "warm", "winter": "mild"},
        "main_transport": ["plane"],
        "transport_from": {
            "Paris": {"plane": {"duration": "3h20", "price": 70, "link": "https://www.skyscanner.com/transport/flights/pari/ath"}},
            "London": {"plane": {"duration": "3h45", "price": 65, "link": "https://www.skyscanner.com/transport/flights/lond/ath"}},
            "Rome": {"plane": {"duration": "2h", "price": 45, "link": "https://www.skyscanner.com/transport/flights/rome/ath"}}
        },
        "accommodations": [
            {"type": "hotel", "name": "Hotel Plaka", "price_night": 75, "rating": 4.5, "link": "https://www.booking.com/hotel/gr/plaka.html"},
            {"type": "airbnb", "name": "Acropolis View Apt", "price_night": 55, "rating": 4.7, "link": "https://www.airbnb.com/s/Plaka--Athens"}
        ],
        "restaurants": [
            {"name": "Ta Karamanlidika", "cuisine": "Greek Meze", "price_range": "12-25 EUR", "rating": 4.6, "link": "https://maps.google.com/?q=Ta+Karamanlidika+Athens"},
            {"name": "Psyrri Street Food", "cuisine": "Street Food", "price_range": "5-12 EUR", "rating": 4.4, "link": "https://maps.google.com/?q=Psyrri+Athens"}
        ],
        "activities": [
            {"name": "Acropolis Visit", "price": 20, "duration": "2h", "type": "culture"},
            {"name": "Plaka Walking Tour", "price": 0, "duration": "2h", "type": "culture"},
            {"name": "Aegina Island Day Trip", "price": 25, "duration": "8h", "type": "beach"}
        ],
        "transfers": [
            {"from": "Athens Airport", "to": "City Center", "options": [
                {"type": "Metro", "price": 9, "duration": "40min", "link": "https://www.stasy.gr"},
                {"type": "Taxi", "price": 40, "duration": "35min", "link": "https://www.uber.com"}
            ]}
        ],
        "trip_type_tags": ["evg", "evjf", "birthday", "culture", "beach", "adventure"]
    },
    {
        "id": "amsterdam", "name": "Amsterdam", "country": "Netherlands", "emoji": "NL",
        "image": "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800",
        "description": "Charming canal city with world-class museums, cycling culture, and vibrant nightlife.",
        "types": ["city", "culture", "party", "nature"],
        "avg_budget_per_person": 430, "currency": "EUR",
        "best_months": ["apr", "may", "jun", "jul", "aug", "sep"],
        "weather": {"spring": "mild", "summer": "warm", "autumn": "cool", "winter": "cold"},
        "main_transport": ["plane", "train"],
        "transport_from": {
            "Paris": {"train": {"duration": "3h20", "price": 50, "link": "https://www.thalys.com"}, "plane": {"duration": "1h10", "price": 65, "link": "https://www.skyscanner.com/transport/flights/pari/ams"}},
            "London": {"plane": {"duration": "1h15", "price": 50, "link": "https://www.skyscanner.com/transport/flights/lond/ams"}},
            "Brussels": {"train": {"duration": "2h", "price": 30, "link": "https://www.thalys.com"}}
        },
        "accommodations": [
            {"type": "hotel", "name": "The Student Hotel", "price_night": 90, "rating": 4.4, "link": "https://www.booking.com/hotel/nl/the-student-hotel-amsterdam.html"},
            {"type": "airbnb", "name": "Jordaan Canal House", "price_night": 100, "rating": 4.6, "link": "https://www.airbnb.com/s/Jordaan--Amsterdam"},
            {"type": "hostel", "name": "ClinkNOORD", "price_night": 30, "rating": 4.3, "link": "https://www.booking.com/hotel/nl/clinknord.html"}
        ],
        "restaurants": [
            {"name": "Foodhallen", "cuisine": "Food Hall", "price_range": "10-25 EUR", "rating": 4.5, "link": "https://maps.google.com/?q=Foodhallen+Amsterdam"},
            {"name": "De Kas", "cuisine": "Farm-to-Table", "price_range": "40-65 EUR", "rating": 4.7, "link": "https://maps.google.com/?q=De+Kas+Amsterdam"}
        ],
        "activities": [
            {"name": "Van Gogh Museum", "price": 20, "duration": "2h", "type": "culture"},
            {"name": "Canal Cruise", "price": 15, "duration": "1h", "type": "romantic"},
            {"name": "Vondelpark Cycling", "price": 10, "duration": "2h", "type": "nature"},
            {"name": "Nightlife Tour", "price": 35, "duration": "4h", "type": "party"}
        ],
        "transfers": [
            {"from": "Schiphol Airport", "to": "City Center", "options": [
                {"type": "NS Train", "price": 5, "duration": "15min", "link": "https://www.ns.nl"},
                {"type": "Uber", "price": 30, "duration": "20min", "link": "https://www.uber.com"}
            ]}
        ],
        "trip_type_tags": ["evg", "birthday", "party", "culture", "city_break"]
    }
]

async def seed_data():
    # Seed admin
    admin_email = ADMIN_EMAIL
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc), "avatar_url": ""
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})
    # Seed destinations
    for dest in DESTINATIONS_SEED:
        existing = await db.destinations.find_one({"id": dest["id"]})
        if not existing:
            await db.destinations.insert_one(dest)
    logger.info(f"Seeded {len(DESTINATIONS_SEED)} destinations")
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.trips.create_index("invite_code")
    await db.trips.create_index("owner_id")
    await db.preferences.create_index([("trip_id", 1), ("user_id", 1)], unique=True)
    await db.votes.create_index([("trip_id", 1), ("user_id", 1), ("destination_id", 1)], unique=True)
    await db.guest_availability.create_index([("trip_id", 1), ("name", 1)], unique=True)
    await db.trips.create_index("guest_share_token", sparse=True)
    # Write test credentials
    cred_dir = Path("/app/memory")
    cred_dir.mkdir(exist_ok=True)
    (cred_dir / "test_credentials.md").write_text(f"""# TripSync Test Credentials
## Admin
- Email: {admin_email}
- Password: {ADMIN_PASSWORD}
- Role: admin

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh
""")

@app.on_event("startup")
async def startup():
    await seed_data()

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
