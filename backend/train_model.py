import os
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

def generate_crowd_data(n_samples=2000, seed=42):
    """
    Generates synthetic crowd density dataset for Amravati, Nagpur, and Vidarbha region.
    Columns: latitude, longitude, hour (0-23), day_of_week (0-6), crowd_score (0-100)
    Rules:
      - Weekends (day 5, 6) have +30 to +45 higher crowd scores.
      - Midday peak (11:00 AM - 4:00 PM) has +35 to +50 higher crowd scores.
      - Evening (5:00 PM - 8:00 PM) has +20 to +30 crowd score.
      - Night hours (11:00 PM - 6:00 AM) drop to low crowd (5 - 20).
    """
    np.random.seed(seed)
    
    # Amravati (lat ~20.93, lon ~77.75) and Nagpur (lat ~21.14, lon ~79.08) coordinates
    # Cover the full Vidarbha bounding box [lat: 20.4 to 21.8, lon: 76.8 to 79.8]
    latitudes = np.random.uniform(20.4000, 21.8000, n_samples)
    longitudes = np.random.uniform(76.8000, 79.8000, n_samples)
    
    # Hour of day: 0 to 23
    hours = np.random.randint(0, 24, n_samples)
    
    # Day of week: 0 to 6 (0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun)
    days_of_week = np.random.randint(0, 7, n_samples)
    
    crowd_scores = []
    
    for lat, lon, h, d in zip(latitudes, longitudes, hours, days_of_week):
        # Base crowd level (8 - 18)
        base = np.random.uniform(8, 18)
        
        # Weekend boost (Saturday = 5, Sunday = 6)
        is_weekend = 1 if d in [5, 6] else 0
        weekend_boost = 32 if is_weekend else 0
        
        # Midday surge (11 AM to 4 PM)
        is_midday = 1 if 11 <= h <= 16 else 0
        midday_boost = 36 if is_midday else 0
        
        # Combined synergy during weekend afternoons (huge crowd bottleneck at tourist spots)
        weekend_midday_synergy = 18 if (is_weekend and is_midday) else 0
        
        # Evening strolls (5 PM to 8 PM)
        is_evening = 1 if 17 <= h <= 20 else 0
        evening_boost = 18 if is_evening else 0
        
        # Morning hours (7 AM to 10 AM)
        morning_boost = 10 if 7 <= h <= 10 else 0
        
        # Late night / early morning discount (11 PM - 6 AM)
        night_discount = -20 if (h >= 23 or h <= 5) else 0
        
        # Location density modifier: central urban hubs vs outer areas
        # Amravati center (~20.93, 77.75) or Nagpur center (~21.14, 79.08)
        dist_amravati = np.sqrt((lat - 20.9320)**2 + (lon - 77.7523)**2)
        dist_nagpur = np.sqrt((lat - 21.1458)**2 + (lon - 79.0882)**2)
        min_hub_dist = min(dist_amravati, dist_nagpur)
        hub_boost = 8 if min_hub_dist < 0.15 else 0
        
        # Gaussian noise (+/- 4 points)
        noise = np.random.normal(0, 3.5)
        
        total_score = (
            base 
            + weekend_boost 
            + midday_boost 
            + weekend_midday_synergy 
            + evening_boost 
            + morning_boost 
            + night_discount 
            + hub_boost 
            + noise
        )
        
        # Ensure score is within realistic [5.0, 99.0] range
        final_score = np.clip(total_score, 5.0, 99.0)
        crowd_scores.append(round(final_score, 2))
        
    df = pd.DataFrame({
        'latitude': latitudes,
        'longitude': longitudes,
        'hour': hours,
        'day_of_week': days_of_week,
        'crowd_score': crowd_scores
    })
    
    return df


def train_and_save_model():
    print("=== Step 1: Generating Training Dataset for Amravati & Vidarbha Region ===")
    df = generate_crowd_data(n_samples=2000, seed=42)
    
    os.makedirs("backend", exist_ok=True)
    csv_path = os.path.join("backend", "nagpur_crowd_data.csv")
    df.to_csv(csv_path, index=False)
    print(f"Dataset generated with {len(df)} rows.")
    print(f"Saved dataset CSV to: {csv_path}")
    
    feature_cols = ['latitude', 'longitude', 'hour', 'day_of_week']
    X = df[feature_cols]
    y = df['crowd_score']

    print("\n=== Step 2: Training DecisionTreeRegressor (max_depth=6) ===")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = DecisionTreeRegressor(max_depth=6, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"Model Performance Metrics:")
    print(f"  - Mean Squared Error (MSE): {mse:.4f}")
    print(f"  - Mean Absolute Error (MAE): {mae:.4f}")
    print(f"  - R² Score: {r2:.4f}")
    print("\nFeature Importances:")
    for col, imp in zip(feature_cols, model.feature_importances_):
        print(f"  - {col}: {imp * 100:.2f}%")

    print("\n=== Step 3: Serializing Trained Model to model.pkl ===")
    model_path = os.path.join("backend", "model.pkl")
    joblib.dump(model, model_path)
    print(f"Model saved successfully to: {os.path.abspath(model_path)}")

    print("\n=== Sample Validation Predictions (Amravati & Nagpur) ===")
    test_cases = pd.DataFrame([
        # Amravati Tests
        {'latitude': 20.9320, 'longitude': 77.7523, 'hour': 14, 'day_of_week': 6}, # Weekend 2 PM -> High
        {'latitude': 20.9320, 'longitude': 77.7523, 'hour': 3,  'day_of_week': 6}, # Weekend 3 AM -> Very Low
        {'latitude': 20.9320, 'longitude': 77.7523, 'hour': 9,  'day_of_week': 2}, # Weekday 9 AM -> Moderate
        {'latitude': 20.9320, 'longitude': 77.7523, 'hour': 14, 'day_of_week': 2}, # Weekday 2 PM -> Medium
        # Nagpur Tests
        {'latitude': 21.1458, 'longitude': 79.0882, 'hour': 14, 'day_of_week': 6}, # Weekend 2 PM -> High
        {'latitude': 21.1458, 'longitude': 79.0882, 'hour': 18, 'day_of_week': 5}, # Weekend 6 PM -> High
    ])
    
    preds = model.predict(test_cases[feature_cols])
    for idx, row in test_cases.iterrows():
        day_str = "Weekend" if row['day_of_week'] in [5, 6] else "Weekday"
        loc_str = "Amravati" if row['latitude'] < 21.0 else "Nagpur"
        print(f"[{loc_str}] Lat={row['latitude']:.4f}, Lon={row['longitude']:.4f}, Day={int(row['day_of_week'])} ({day_str}), Hour={int(row['hour']):02d}:00 -> ML Predicted Crowd: {preds[idx]:.1f}/100")

if __name__ == "__main__":
    train_and_save_model()
