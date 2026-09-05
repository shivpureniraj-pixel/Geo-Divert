"""
GeoDivert Backend API & Local Web Server - FastAPI Central Orchestration Engine
Mounts frontend UI at http://127.0.0.1:8000/ for direct local web access and geolocation permission.
"""

import sys
import os
from typing import List, Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Ensure backend directory is in python search path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from backend.predict import predict_crowd_score
    from backend.dispersal_engine import run_spatial_dispersal
    from backend.opentripmap import fetch_cultural_pois, fetch_paired_local_merchant
    from backend.gemini_service import generate_tour_guide_story
except ImportError:
    from predict import predict_crowd_score
    from dispersal_engine import run_spatial_dispersal
    from opentripmap import fetch_cultural_pois, fetch_paired_local_merchant
    from gemini_service import generate_tour_guide_story

app = FastAPI(
    title="GeoDivert Tourism Crowd Redistribution Platform",
    description="FastAPI Orchestration Microservice connecting Scikit-Learn ML, Amravati Tourist Attractions, and Gemini 1.5 Flash",
    version="1.3.0"
)

# Enable CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DispersalRequest(BaseModel):
    latitude: float = 20.9320
    longitude: float = 77.7523
    hour: Optional[int] = 14
    day_of_week: Optional[int] = 6
    preferences: Optional[List[str]] = []
    selected_spot_name: Optional[str] = None

class PredictionRequest(BaseModel):
    latitude: float = 20.9320
    longitude: float = 77.7523
    hour: int = 14
    day_of_week: int = 6

class StoryRequest(BaseModel):
    destination_name: str
    category: str
    city: str = "Amravati"
    description: str
    merchant: Optional[dict] = None

@app.get("/api/health")
def get_health():
    return {
        "status": "online",
        "service": "GeoDivert FastAPI Engine",
        "ml_model": "DecisionTreeRegressor (Amravati Trained)",
        "city": "Amravati, Maharashtra"
    }

@app.get("/api/spots")
def get_monitored_spots(
    lat: float = Query(20.9320),
    lon: float = Query(77.7523),
    hour: int = Query(14),
    day_of_week: int = Query(6)
):
    """
    Returns verified Amravati tourist spots with live ML predicted crowd scores
    """
    pois = fetch_cultural_pois(lat, lon, radius_meters=45000)
    enriched = []
    
    for p in pois:
        p_lat = p.get("lat", lat)
        p_lon = p.get("lon", lon)
        score = predict_crowd_score(p_lat, p_lon, hour, day_of_week)
        enriched.append({
            "id": p.get("xid"),
            "name": p.get("name"),
            "category": p.get("category"),
            "lat": p_lat,
            "lng": p_lon,
            "crowd_score": score,
            "crowd_status": "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "SERENE",
            "cultural_value": p.get("cultural_value", 0.9),
            "preference_category": p.get("preference_category", "nature"),
            "description": p.get("description")
        })
        
    return {"spots": enriched}

@app.post("/api/recommend")
def recommend_dispersal(request: DispersalRequest):
    """
    Core Dispersal Pipeline:
    1. Evaluates origin crowd density via ML model.pkl
    2. Fetches verified tourist spots in Amravati
    3. Runs Spatial Dispersal Formula: min F(x) = alpha*d + beta*C(i) - gamma*V(i) - delta*PrefMatch
    4. Pairs authentic local merchant within 800m-1.5km
    5. Calls Gemini 1.5 Flash to synthesize plain text tour narrative
    """
    result = run_spatial_dispersal(
        origin_lat=request.latitude,
        origin_lon=request.longitude,
        hour=request.hour if request.hour is not None else 14,
        day_of_week=request.day_of_week if request.day_of_week is not None else 6,
        user_preferences=request.preferences or [],
        query_name=request.selected_spot_name
    )
    return result

@app.post("/api/predict-crowd")
def predict_crowd(request: PredictionRequest):
    """
    Predicts crowd score (0-100) using DecisionTreeRegressor model.pkl
    """
    score = predict_crowd_score(
        latitude=request.latitude,
        longitude=request.longitude,
        hour=request.hour,
        day_of_week=request.day_of_week
    )
    status = "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "SERENE"
    return {
        "latitude": request.latitude,
        "longitude": request.longitude,
        "hour": request.hour,
        "day_of_week": request.day_of_week,
        "crowd_score": score,
        "crowd_status": status,
        "reroute_recommended": score >= 60
    }

@app.post("/api/generate-story")
def generate_story_endpoint(request: StoryRequest):
    """
    Generates tour guide narrative via Gemini 1.5 Flash
    """
    merchant = request.merchant or {
        "name": "Raghuveer Sweets & Heritage Tea House",
        "description": "Local family bakery in Amravati serving fresh handmade cardamom tea and sweets"
    }
    story = generate_tour_guide_story(
        destination_name=request.destination_name,
        category=request.category,
        city=request.city,
        description=request.description,
        merchant=merchant
    )
    return {"story": story}

# Mount Frontend files directly for localhost web server
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
