"""
GeoDivert Backend API - FastAPI & Scikit-Learn Crowd Density Prediction
"""

import sys
import os
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure backend directory is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from predict import predict_crowd_score

app = FastAPI(
    title="GeoDivert Crowd Redistribution API",
    description="FastAPI Backend for real-time ML crowd density prediction and spatial tourism routing",
    version="1.0.0"
)

# Section 3.1: Enable CORS Middleware to allow browser communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CrowdPredictionRequest(BaseModel):
    latitude: float = 21.1458
    longitude: float = 79.0882
    hour: int = 14
    day_of_week: int = 6

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "GeoDivert FastAPI Engine",
        "ml_model": "DecisionTreeRegressor (max_depth=5)",
        "nagpur_center": {"lat": 21.1458, "lng": 79.0882}
    }

@app.post("/api/predict-crowd")
def predict_crowd(request: CrowdPredictionRequest):
    """
    Predicts crowd score (0-100) using loaded model.pkl
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

@app.get("/api/predict-crowd")
def predict_crowd_get(
    latitude: float = Query(21.1458),
    longitude: float = Query(79.0882),
    hour: int = Query(14),
    day_of_week: int = Query(6)
):
    """
    GET version of crowd prediction endpoint for browser testing
    """
    score = predict_crowd_score(latitude, longitude, hour, day_of_week)
    status = "HIGH" if score >= 75 else "MEDIUM" if score >= 45 else "LOW"
    
    return {
        "latitude": latitude,
        "longitude": longitude,
        "hour": hour,
        "day_of_week": day_of_week,
        "crowd_score": score,
        "crowd_status": status,
        "reroute_recommended": score >= 70
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
