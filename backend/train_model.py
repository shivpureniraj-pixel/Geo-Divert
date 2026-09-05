import os
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

def generate_nagpur_crowd_data(n_samples=1000, seed=42):
    """
    Step 1: Generate 1,000 rows of fake crowd density data for Nagpur.
    Columns: latitude, longitude, hour, day_of_week, crowd_score (0-100)
    Rule: Higher crowd score on weekend and midday.
    """
    np.random.seed(seed)
    
    # Coordinates centered around Nagpur, Maharashtra (approx lat 21.1458, lon 79.0882)
    latitudes = np.random.uniform(21.0500, 21.2500, n_samples)
    longitudes = np.random.uniform(79.0000, 79.2000, n_samples)
    
    # Hour of day: 0 to 23
    hours = np.random.randint(0, 24, n_samples)
    
    # Day of week: 0 to 6 (0=Monday, ..., 5=Saturday, 6=Sunday)
    days_of_week = np.random.randint(0, 7, n_samples)
    
    # Calculate synthetic crowd scores based on rules
    crowd_scores = []
    
    for lat, lon, h, d in zip(latitudes, longitudes, hours, days_of_week):
        # Base crowd level (10 - 25)
        base = np.random.uniform(10, 25)
        
        # Weekend boost (days 5 and 6)
        is_weekend = 1 if d in [5, 6] else 0
        weekend_boost = 35 if is_weekend else 0
        
        # Midday boost (11:00 AM - 5:00 PM / 11-17)
        is_midday = 1 if 11 <= h <= 17 else 0
        midday_boost = 35 if is_midday else 0
        
        # Combined weekend + midday peak bonus
        peak_synergy = 15 if (is_weekend and is_midday) else 0
        
        # Secondary evening peak (5 PM - 8 PM)
        evening_boost = 15 if 17 < h <= 20 else 0
        
        # Nighttime quiet hours (11 PM - 6 AM)
        night_discount = -15 if (h >= 23 or h <= 6) else 0
        
        # Gaussian noise (+/- 5 points)
        noise = np.random.normal(0, 5)
        
        total_score = base + weekend_boost + midday_boost + peak_synergy + evening_boost + night_discount + noise
        
        # Clip to ensure valid score range [0, 100]
        final_score = np.clip(total_score, 0.0, 100.0)
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
    print("=== Step 1: Generating Dummy Data for Nagpur ===")
    df = generate_nagpur_crowd_data(n_samples=1000, seed=42)
    
    # Save synthetic dataset CSV for inspection
    os.makedirs("backend", exist_ok=True)
    csv_path = os.path.join("backend", "nagpur_crowd_data.csv")
    df.to_csv(csv_path, index=False)
    print(f"Generated dataset with {len(df)} rows.")
    print(f"Saved synthetic dataset to: {csv_path}")
    print("\nDataset Summary Preview:")
    print(df.head(10))
    print("\nAverage crowd score by Weekend status & Hour:")
    df['is_weekend'] = df['day_of_week'].isin([5, 6])
    print(df.groupby(['is_weekend', 'hour'])['crowd_score'].mean().unstack(level=0).iloc[10:18])

    # Feature matrix X and Target y
    feature_cols = ['latitude', 'longitude', 'hour', 'day_of_week']
    X = df[feature_cols]
    y = df['crowd_score']

    # Step 2: Train the Model (DecisionTreeRegressor with max_depth=5)
    print("\n=== Step 2: Training DecisionTreeRegressor (max_depth=5) ===")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = DecisionTreeRegressor(max_depth=5, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate model
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"Model Evaluation Results:")
    print(f"  - Mean Squared Error (MSE): {mse:.4f}")
    print(f"  - Mean Absolute Error (MAE): {mae:.4f}")
    print(f"  - R² Score: {r2:.4f}")
    print("\nFeature Importances:")
    for col, imp in zip(feature_cols, model.feature_importances_):
        print(f"  - {col}: {imp * 100:.2f}%")

    # Step 3: Save the Model into model.pkl using joblib
    print("\n=== Step 3: Saving Trained Model ===")
    model_path = os.path.join("backend", "model.pkl")
    joblib.dump(model, model_path)
    print(f"Successfully saved trained model to: {os.path.abspath(model_path)}")

    # Sanity Check Predictions
    print("\n=== Sanity Check / Sample Predictions ===")
    test_cases = pd.DataFrame([
        # [lat, lon, hour, day_of_week]
        {'latitude': 21.1458, 'longitude': 79.0882, 'hour': 14, 'day_of_week': 6}, # Weekend midday -> Expect HIGH
        {'latitude': 21.1458, 'longitude': 79.0882, 'hour': 3,  'day_of_week': 2}, # Weekday 3 AM -> Expect LOW
        {'latitude': 21.1458, 'longitude': 79.0882, 'hour': 14, 'day_of_week': 1}, # Weekday midday -> Expect MEDIUM
        {'latitude': 21.1458, 'longitude': 79.0882, 'hour': 19, 'day_of_week': 5}, # Weekend evening -> Expect MEDIUM-HIGH
    ])
    
    preds = model.predict(test_cases[feature_cols])
    for idx, row in test_cases.iterrows():
        day_str = "Weekend" if row['day_of_week'] in [5, 6] else "Weekday"
        print(f"Input: Lat={row['latitude']}, Lon={row['longitude']}, Day={row['day_of_week']} ({day_str}), Hour={row['hour']}:00 -> Predicted Crowd Score: {preds[idx]:.1f}/100")


if __name__ == "__main__":
    train_and_save_model()
