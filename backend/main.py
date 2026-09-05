"""
GeoDivert Backend API - FastAPI Central Orchestration Engine
Integrates:
 - MapLibre GL JS data feeds
 - Scikit-Learn DecisionTree crowd density predictor (model.pkl)
 - OpenTripMap POI and local merchant retrieval
 - Gemini 1.5 Flash Tour Guide Narrative Generator
 - Spatial Dispersal Optimization Engine
"""

import sys
import os
from typing import List, Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure backend folder is in path
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
    description="FastAPI Orchestration Microservice connecting Scikit-Learn ML, OpenTripMap, and Gemini 1.5 Flash",
    version="1.1.0"
)

# Enable CORS Middleware for React frontend and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DispersalRequest(BaseModel):
    latitude: float = 21.1458
    longitude: float = 79.0882
    hour: Optional[int] = 14
    day_of_week: Optional[int] = 6
    preferences: Optional[List[str]] = []
    selected_spot_name: Optional[str] = None

class PredictionRequest(BaseModel):
    latitude: float = 21.1458
    longitude: float = 79.0882
    hour: int = 14
    day_of_week: int = 6

class StoryRequest(BaseModel):
    destination_name: str
    category: str
    city: str = "Nagpur"
    description: str
    merchant: Optional[dict] = None

@app.get("/")
def get_root():
    return {
        "service": "GeoDivert FastAPI Engine",
        "status": "online",
        "ml_engine": "Scikit-Learn DecisionTreeRegressor (max_depth=5)",
        "poi_source": "OpenTripMap API",
        "genai_engine": "Gemini 1.5 Flash",
        "nagpur_center": {"lat": 21.1458, "lng": 79.0882}
    }

@app.get("/api/spots")
def get_monitored_spots(
    lat: float = Query(21.1458),
    lon: float = Query(79.0882),
    hour: int = Query(14),
    day_of_week: int = Query(6)
):
    """
    Returns monitored points of interest with live ML predicted crowd scores
    """
    pois = fetch_cultural_pois(lat, lon, radius_meters=25000)
    enriched = []
    
    for p in pois:
        p_lat = p.get("lat", lat)
        p_lon = p.get("lon", lon)
        score = predict_crowd_score(p_lat, p_lon, hour, day_of_week)
        enriched.append({
            "id": p.get("xid"),
            "name": p.get("name"),
            "category": p.get("category"),
            "city": "Nagpur",
            "lat": p_lat,
            "lng": p_lon,
            "crowd_score": score,
            "crowd_status": "HIGH" if score >= 75 else "MEDIUM" if score >= 45 else "LOW",
            "cultural_value": p.get("cultural_value", 0.8),
            "preference_category": p.get("preference_category", "history"),
            "image": p.get("image"),
            "description": p.get("description")
        })
        
    return {"spots": enriched}

@app.post("/api/recommend")
def recommend_dispersal(request: DispersalRequest):
    """
    Core Dispersal Pipeline:
    1. Evaluates origin crowd density via ML model.pkl
    2. Fetches OpenTripMap POIs
    3. Runs Spatial Dispersal Formula: min F(x) = alpha*d + beta*C(i) - gamma*V(i) - delta*PrefMatch
    4. Pairs independent local merchant within 800m
    5. Calls Gemini 1.5 Flash to generate 60-second interactive tour guide story
    """
    result = run_spatial_dispersal(
        origin_lat=request.latitude,
        origin_lon=request.longitude,
        hour=request.hour if request.hour is not None else 14,
        day_of_week=request.day_of_week if request.day_of_week is not None else 6,
        user_preferences=request.preferences or []
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
    status = "HIGH" if score >= 75 else "MEDIUM" if score >= 45 else "LOW"
    return {
        "latitude": request.latitude,
        "longitude": request.longitude,
        "hour": request.hour,
        "day_of_week": request.day_of_week,
        "crowd_score": score,
        "crowd_status": status,
        "reroute_recommended": score >= 70
    }

@app.post("/api/generate-story")
def generate_story_endpoint(request: StoryRequest):
    """
    Generates tour guide narrative via Gemini 1.5 Flash
    """
    merchant = request.merchant or {
        "name": "Local Artisan Bakery & Cafe",
        "description": "30-year-old family bakery serving fresh handmade cardamom tea and snacks"
    }
    story = generate_tour_guide_story(
        destination_name=request.destination_name,
        category=request.category,
        city=request.city,
        description=request.description,
        merchant=merchant
    )
    return {"story": story}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
