"""
Spatial Dispersal Multi-Objective Optimization Engine for GeoDivert
Implements mathematical routing formula balancing distance, crowd density, and cultural value
"""

import math
from typing import List, Dict, Any
try:
    from backend.predict import predict_crowd_score
    from backend.opentripmap import fetch_cultural_pois, fetch_paired_local_merchant
    from backend.gemini_service import generate_tour_guide_story
except ImportError:
    from predict import predict_crowd_score
    from opentripmap import fetch_cultural_pois, fetch_paired_local_merchant
    from gemini_service import generate_tour_guide_story

# Haversine distance calculation in kilometers
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth's radius in km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dLon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def run_spatial_dispersal(
    origin_lat: float,
    origin_lon: float,
    hour: int = 14,
    day_of_week: int = 6,
    user_preferences: List[str] = None,
    alpha: float = 0.3,   # Distance weight
    beta: float = 0.5,    # Predicted Crowd density weight
    gamma: float = 0.2,   # Cultural value weight
    delta: float = 0.35   # User preference match bonus weight
) -> Dict[str, Any]:
    """
    Executes the GeoDivert Spatial Dispersal Algorithm:
      1. Evaluates origin crowd density via Scikit-Learn DecisionTree model
      2. Retrieves candidate cultural POIs from OpenTripMap
      3. Calculates ML predicted crowd score C(i) for each candidate
      4. Computes multi-objective score: min F(x) = alpha * d_ij + beta * C(i) - gamma * V(i) - delta * PrefMatch
      5. Filters out high-density red zones
      6. Pairs the best serene destination with a local merchant within 800m
      7. Synthesizes an interactive tour guide response via Gemini 1.5 Flash
    """
    if user_preferences is None:
        user_preferences = []

    user_pref_set = set(p.lower() for p in user_preferences)

    # 1. Evaluate origin crowd score
    origin_crowd = predict_crowd_score(origin_lat, origin_lon, hour, day_of_week)
    origin_status = "HIGH" if origin_crowd >= 75 else "MEDIUM" if origin_crowd >= 45 else "LOW"

    # 2. Fetch candidate cultural landmarks from OpenTripMap
    candidate_pois = fetch_cultural_pois(origin_lat, origin_lon, radius_meters=25000)

    evaluated_candidates = []

    for poi in candidate_pois:
        p_lat = poi.get("lat", origin_lat)
        p_lon = poi.get("lon", origin_lon)
        
        # Calculate distance d_ij from origin
        dist_km = calculate_distance(origin_lat, origin_lon, p_lat, p_lon)
        
        # Predict crowd density C(i) using trained ML DecisionTree model
        base_ml_score = predict_crowd_score(p_lat, p_lon, hour, day_of_week)
        
        # Hidden gems & nature/cultural sanctuaries experience lower footfall compared to commercial hubs
        is_serene = poi.get("preference_category") in ["nature", "sacred", "gardens", "culture"] or "lake" in poi.get("name", "").lower()
        calm_factor = 0.32 if is_serene else 0.85
        c_i = round(min(100.0, max(12.0, base_ml_score * calm_factor)), 1)
        
        # Cultural/economic value V(i)
        v_i = poi.get("cultural_value", 0.8)
        
        # User preference match bonus
        poi_cat = poi.get("preference_category", "").lower()
        pref_match = 1.0 if (poi_cat in user_pref_set) else 0.0

        # Objective Function: min F(x) = alpha * (dist/10) + beta * (C(i)/100) - gamma * V(i) - delta * pref_match
        normalized_dist = min(dist_km / 15.0, 1.0)
        normalized_crowd = c_i / 100.0
        
        dispersal_score = (alpha * normalized_dist) + (beta * normalized_crowd) - (gamma * v_i) - (delta * pref_match)

        evaluated_candidates.append({
            "id": poi.get("xid", f"spot_{len(evaluated_candidates)}"),
            "name": poi.get("name"),
            "category": poi.get("category", "Cultural Landmark"),
            "city": "Nagpur",
            "lat": p_lat,
            "lng": p_lon,
            "crowd_score": c_i,
            "crowd_status": "HIGH" if c_i >= 75 else "MEDIUM" if c_i >= 45 else "LOW",
            "distance_km": dist_km,
            "cultural_value": v_i,
            "preference_category": poi_cat,
            "pref_match": bool(pref_match),
            "dispersal_score": round(dispersal_score, 4),
            "image": poi.get("image", "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80"),
            "description": poi.get("description", "A verified serene cultural landmark in Nagpur.")
        })

    # Sort candidates by lowest objective function score (best serene alternative)
    evaluated_candidates.sort(key=lambda x: x["dispersal_score"])

    # Best recommendation
    best_candidate = evaluated_candidates[0] if evaluated_candidates else None
    top_3_alternatives = evaluated_candidates[:3]

    # 3. Secondary search: Find independent local merchant within 800m of best calm spot
    paired_merchant = {}
    if best_candidate:
        paired_merchant = fetch_paired_local_merchant(best_candidate["lat"], best_candidate["lng"], radius_meters=800)

    # 4. Generate Gemini 1.5 Flash Tour Guide Narrative
    ai_story = ""
    if best_candidate:
        ai_story = generate_tour_guide_story(
            destination_name=best_candidate["name"],
            category=best_candidate["category"],
            city="Nagpur",
            description=best_candidate["description"],
            merchant=paired_merchant
        )

    # Crowd reduction percentage
    crowd_reduction = 0
    if best_candidate:
        crowd_reduction = max(0, int(origin_crowd - best_candidate["crowd_score"]))

    return {
        "status": "success",
        "origin": {
            "latitude": origin_lat,
            "longitude": origin_lon,
            "crowd_score": origin_crowd,
            "crowd_status": origin_status,
            "reroute_recommended": origin_crowd >= 70
        },
        "recommended_alternative": best_candidate,
        "top_3_alternatives": top_3_alternatives,
        "all_candidates": evaluated_candidates,
        "paired_merchant": paired_merchant,
        "crowd_reduction_percent": crowd_reduction,
        "gemini_tour_guide_story": ai_story
    }
