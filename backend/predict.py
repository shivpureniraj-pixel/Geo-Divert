import os
import joblib
import pandas as pd

# Path to the trained Decision Tree model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

_model = None

def load_crowd_model():
    """Loads and caches the trained DecisionTreeRegressor model from model.pkl."""
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model file not found at {MODEL_PATH}. "
                f"Please run 'python backend/train_model.py' first to generate model.pkl."
            )
        _model = joblib.load(MODEL_PATH)
    return _model

def predict_crowd_score(latitude: float, longitude: float, hour: int, day_of_week: int) -> float:
    """
    Predict crowd score (0-100) for a given location coordinate, hour (0-23), and day of week (0-6).
    
    Parameters:
        latitude (float): Location latitude (e.g. 20.9320 for Amravati)
        longitude (float): Location longitude (e.g. 77.7523 for Amravati)
        hour (int): Hour of day (0 to 23)
        day_of_week (int): Day of week (0=Monday, ..., 5=Saturday, 6=Sunday)
        
    Returns:
        float: Crowd density score from 0 (empty) to 100 (heavily crowded)
    """
    model = load_crowd_model()
    input_data = pd.DataFrame([{
        'latitude': latitude,
        'longitude': longitude,
        'hour': hour,
        'day_of_week': day_of_week
    }])
    
    score = float(model.predict(input_data)[0])
    return round(score, 2)

if __name__ == "__main__":
    # Test for Amravati (Weekend, 2 PM)
    score = predict_crowd_score(latitude=20.9320, longitude=77.7523, hour=14, day_of_week=6)
    print(f"Test Crowd Score Prediction for Shri Ambadevi Temple (Amravati, Sun 2 PM): {score}/100")
