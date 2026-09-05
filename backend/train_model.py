"""
Train DecisionTreeRegressor Crowd Density Model for Amravati Tourist Attractions & Region
Generates 3,000 realistic synthetic observations for Amravati's actual cultural spots:
- Shri Ambadevi & Ekvira Mandir (Peak temple traffic)
- Wadali Talao & Eco Park (Serene nature lake)
- Bamboo Garden Reserve (Very serene botanical reserve)
- Chikhaldara Hill Station (Weekend afternoon hill crowd)
- Kondeshwar Shiva Temple & Waterfalls (Quiet forest gorge)
- Chatri Talao Heritage Lake (Quiet promenade)
- Muktagiri Waterfall Shrines (Moderate pilgrimage valley)
- Melghat Tiger Reserve (Very uncrowded eco trails)
- Pandit Nehru Butterfly Park (Quiet garden)
- Upper Wardha Simbhora Dam (Calm waterside)
"""

import os
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

# Actual Amravati Tourist Landmarks with realistic crowd baseline profiles
AMRAVATI_TOURIST_SPOTS = [
    {
        "name": "Shri Ambadevi & Ekvira Mandir",
        "lat": 20.9320,
        "lon": 77.7523,
        "base_crowd": 45,
        "peak_hour_start": 9,
        "peak_hour_end": 19,
        "weekend_mult": 1.6,
        "is_major_hub": True
    },
    {
        "name": "Wadali Talao & Eco Park",
        "lat": 20.9580,
        "lon": 77.7845,
        "base_crowd": 16,
        "peak_hour_start": 16,
        "peak_hour_end": 19,
        "weekend_mult": 1.3,
        "is_major_hub": False
    },
    {
        "name": "Bamboo Garden Botanical Reserve",
        "lat": 20.9425,
        "lon": 77.7710,
        "base_crowd": 12,
        "peak_hour_start": 15,
        "peak_hour_end": 18,
        "weekend_mult": 1.25,
        "is_major_hub": False
    },
    {
        "name": "Chikhaldara Hill Station & Gawilghur Fort",
        "lat": 21.4010,
        "lon": 77.3320,
        "base_crowd": 28,
        "peak_hour_start": 11,
        "peak_hour_end": 17,
        "weekend_mult": 1.9,
        "is_major_hub": True
    },
    {
        "name": "Kondeshwar Shiva Temple & Waterfalls",
        "lat": 20.8120,
        "lon": 77.7680,
        "base_crowd": 15,
        "peak_hour_start": 10,
        "peak_hour_end": 16,
        "weekend_mult": 1.4,
        "is_major_hub": False
    },
    {
        "name": "Chatri Talao Heritage Lake",
        "lat": 20.9150,
        "lon": 77.7610,
        "base_crowd": 14,
        "peak_hour_start": 16,
        "peak_hour_end": 19,
        "weekend_mult": 1.3,
        "is_major_hub": False
    },
    {
        "name": "Muktagiri Waterfalls & 52 Shrines",
        "lat": 21.4167,
        "lon": 77.5333,
        "base_crowd": 22,
        "peak_hour_start": 10,
        "peak_hour_end": 16,
        "weekend_mult": 1.5,
        "is_major_hub": False
    },
    {
        "name": "Melghat Tiger Reserve & Eco Trails",
        "lat": 21.4800,
        "lon": 77.1500,
        "base_crowd": 8,
        "peak_hour_start": 7,
        "peak_hour_end": 11,
        "weekend_mult": 1.2,
        "is_major_hub": False
    },
    {
        "name": "Pandit Nehru Butterfly Park",
        "lat": 20.9490,
        "lon": 77.7660,
        "base_crowd": 11,
        "peak_hour_start": 15,
        "peak_hour_end": 18,
        "weekend_mult": 1.2,
        "is_major_hub": False
    },
    {
        "name": "Upper Wardha Simbhora Dam",
        "lat": 21.2720,
        "lon": 78.0580,
        "base_crowd": 15,
        "peak_hour_start": 12,
        "peak_hour_end": 17,
        "weekend_mult": 1.5,
        "is_major_hub": False
    }
]

def generate_amravati_crowd_data(n_samples=3000, seed=42):
    np.random.seed(seed)
    
    rows = []
    
    for _ in range(n_samples):
        # Pick a spot
        spot = AMRAVATI_TOURIST_SPOTS[np.random.randint(0, len(AMRAVATI_TOURIST_SPOTS))]
        
        # Add slight spatial jitter (+/- 500m) to allow continuous regression
        lat = spot["lat"] + np.random.normal(0, 0.003)
        lon = spot["lon"] + np.random.normal(0, 0.003)
        
        hour = np.random.randint(0, 24)
        day_of_week = np.random.randint(0, 7) # 0=Mon, ..., 6=Sun
        is_weekend = 1 if day_of_week in [5, 6] else 0
        
        base = spot["base_crowd"]
        
        # Time of day calculation
        if spot["peak_hour_start"] <= hour <= spot["peak_hour_end"]:
            # Peak hours curve
            mid = (spot["peak_hour_start"] + spot["peak_hour_end"]) / 2.0
            dist_from_mid = abs(hour - mid)
            time_factor = max(0.4, 1.0 - (dist_from_mid / 6.0))
            hour_boost = (38 if spot["is_major_hub"] else 20) * time_factor
        elif 7 <= hour <= 10:
            # Morning hours
            hour_boost = 12 if spot["is_major_hub"] else 5
        elif 22 <= hour or hour <= 5:
            # Night quiet hours
            hour_boost = -18
        else:
            hour_boost = 0
            
        weekend_boost = (base * (spot["weekend_mult"] - 1.0) * 1.5) if is_weekend else 0
        
        # Synergy boost for major hubs on weekend afternoons
        synergy = 18 if (is_weekend and 11 <= hour <= 17 and spot["is_major_hub"]) else 0
        
        # Gaussian noise
        noise = np.random.normal(0, 2.5)
        
        total_score = base + hour_boost + weekend_boost + synergy + noise
        final_score = np.clip(total_score, 6.0, 98.0)
        
        rows.append({
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "hour": hour,
            "day_of_week": day_of_week,
            "crowd_score": round(final_score, 2)
        })
        
    return pd.DataFrame(rows)

def train_and_save_model():
    print("=== Step 1: Generating Tourist Location Dataset for Amravati ===")
    df = generate_amravati_crowd_data(n_samples=3000, seed=42)
    
    os.makedirs("backend", exist_ok=True)
    csv_path = os.path.join("backend", "nagpur_crowd_data.csv")
    df.to_csv(csv_path, index=False)
    print(f"Generated dataset with {len(df)} rows covering {len(AMRAVATI_TOURIST_SPOTS)} Amravati tourist spots.")
    
    feature_cols = ['latitude', 'longitude', 'hour', 'day_of_week']
    X = df[feature_cols]
    y = df['crowd_score']

    print("\n=== Step 2: Training DecisionTreeRegressor (max_depth=7) ===")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)
    
    model = DecisionTreeRegressor(max_depth=7, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"Model Performance:")
    print(f"  - MAE: {mae:.2f}")
    print(f"  - R² Score: {r2:.4f}")
    
    model_path = os.path.join("backend", "model.pkl")
    joblib.dump(model, model_path)
    print(f"Successfully saved model to: {os.path.abspath(model_path)}")

    print("\n=== Individual Amravati Spot Predictions (Sunday 2 PM vs Sunday 3 AM) ===")
    for spot in AMRAVATI_TOURIST_SPOTS:
        # Sunday 2 PM (Peak)
        p_peak = model.predict(pd.DataFrame([{'latitude': spot['lat'], 'longitude': spot['lon'], 'hour': 14, 'day_of_week': 6}]))[0]
        # Sunday 3 AM (Night)
        p_night = model.predict(pd.DataFrame([{'latitude': spot['lat'], 'longitude': spot['lon'], 'hour': 3, 'day_of_week': 6}]))[0]
        # Wednesday 2 PM (Weekday)
        p_wday = model.predict(pd.DataFrame([{'latitude': spot['lat'], 'longitude': spot['lon'], 'hour': 14, 'day_of_week': 2}]))[0]
        
        print(f"{spot['name']:<42} -> Sun 2PM: {p_peak:4.1f}% | Sun 3AM: {p_night:4.1f}% | Wed 2PM: {p_wday:4.1f}%")

if __name__ == "__main__":
    train_and_save_model()
