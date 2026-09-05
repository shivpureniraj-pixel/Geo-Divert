"""
Spatial Dispersal Multi-Objective Optimization Engine for GeoDivert
Implements mathematical routing formula: min F(x) = alpha * Distance + beta * Crowd - gamma * Value - delta * PrefMatch
"""

import math
from typing import List, Dict, Any

try:
    from backend.predict import predict_crowd_score
    from backend.opentripmap import fetch_cultural_pois, fetch_paired_local_merchant, geocode_location, fetch_osrm_route
    from backend.gemini_service import generate_tour_guide_story
except ImportError:
    from predict import predict_crowd_score
    from opentripmap import fetch_cultural_pois, fetch_paired_local_merchant, geocode_location, fetch_osrm_route
    from gemini_service import generate_tour_guide_story

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
    query_name: str = None,
    alpha: float = 0.3,
    beta: float = 0.5,
    gamma: float = 0.2,
    delta: float = 0.35
) -> Dict[str, Any]:
    """
    Executes the GeoDivert Spatial Dispersal Algorithm for ANY given location (Amravati, Nagpur, Pune, etc.)
    """
    if user_preferences is None:
        user_preferences = []

    user_pref_set = set(p.lower() for p in user_preferences)

    # If a location search string is provided, resolve coordinates
    resolved_name = query_name or "My Location"
    if query_name and query_name.lower() not in ["origin point", "my current location", "my gps location", "selected location"]:
        geocoded = geocode_location(query_name)
        if geocoded:
            origin_lat = geocoded["lat"]
            origin_lon = geocoded["lon"]
            resolved_name = geocoded.get("display_name", query_name)

    # 1. Predict origin crowd density dynamically via ML DecisionTree model.pkl
    raw_origin_crowd = predict_crowd_score(origin_lat, origin_lon, hour, day_of_week)
    origin_crowd = round(raw_origin_crowd, 1)
    origin_status = "HIGH" if origin_crowd >= 70 else "MEDIUM" if origin_crowd >= 40 else "LOW"

    # 2. Fetch candidate cultural landmarks from OpenTripMap / regional database
    candidate_pois = fetch_cultural_pois(origin_lat, origin_lon, radius_meters=35000)

    evaluated_candidates = []

    for poi in candidate_pois:
        p_lat = poi.get("lat", origin_lat)
        p_lon = poi.get("lon", origin_lon)
        
        # Calculate real geographic distance (km)
        dist_km = calculate_distance(origin_lat, origin_lon, p_lat, p_lon)
        
        # Skip spot if it is virtually identical to origin (dist < 0.2km)
        if dist_km < 0.2 and len(candidate_pois) > 1:
            continue
        
        # Dynamic ML crowd prediction for the candidate spot at this exact hour & day
        base_ml = predict_crowd_score(p_lat, p_lon, hour, day_of_week)
        
        # Serene cultural corridors & botanical reserves receive calm capacity multiplier
        is_serene = (
            poi.get("preference_category") in ["nature", "sacred", "gardens", "culture"] 
            or "lake" in poi.get("name", "").lower() 
            or "talao" in poi.get("name", "").lower() 
            or "garden" in poi.get("name", "").lower()
            or "park" in poi.get("name", "").lower()
            or "waterfall" in poi.get("name", "").lower()
        )
        
        calm_multiplier = 0.35 if is_serene else 0.75
        c_i = round(min(100.0, max(8.0, base_ml * calm_multiplier)), 1)
        
        v_i = poi.get("cultural_value", 0.85)
        
        # Preference matching bonus
        poi_cat = poi.get("preference_category", "").lower()
        pref_match = 1.0 if (poi_cat in user_pref_set) else 0.0

        # Spatial Dispersal Formula: min F(x) = alpha * (dist/25) + beta * (C(i)/100) - gamma * V(i) - delta * pref_match
        normalized_dist = min(dist_km / 25.0, 1.0)
        normalized_crowd = c_i / 100.0
        
        dispersal_score = (alpha * normalized_dist) + (beta * normalized_crowd) - (gamma * v_i) - (delta * pref_match)

        evaluated_candidates.append({
            "id": poi.get("xid", f"spot_{len(evaluated_candidates)}"),
            "name": poi.get("name"),
            "category": poi.get("category", "Cultural Landmark"),
            "lat": p_lat,
            "lng": p_lon,
            "crowd_score": c_i,
            "crowd_status": "HIGH" if c_i >= 70 else "MEDIUM" if c_i >= 40 else "SERENE",
            "distance_km": dist_km,
            "cultural_value": v_i,
            "preference_category": poi_cat,
            "pref_match": bool(pref_match),
            "dispersal_score": round(dispersal_score, 4),
            "description": poi.get("description", "A verified serene cultural landmark.")
        })

    # Sort candidates by lowest objective dispersal score
    evaluated_candidates.sort(key=lambda x: x["dispersal_score"])

    # Best recommendation
    best_candidate = evaluated_candidates[0] if evaluated_candidates else None
    top_3_alternatives = evaluated_candidates[:3]

    # 3. Secondary Search: Pair Independent Local Merchant within 800m-1.5km
    paired_merchant = {}
    if best_candidate:
        paired_merchant = fetch_paired_local_merchant(best_candidate["lat"], best_candidate["lng"], radius_meters=1500)

    # 4. Fetch Real Road Routing Path from OSRM
    route_data = {"coordinates": [], "distance_km": 0, "duration_mins": 0}
    if best_candidate:
        route_data = fetch_osrm_route(origin_lat, origin_lon, best_candidate["lat"], best_candidate["lng"])
        if route_data.get("distance_km"):
            best_candidate["distance_km"] = route_data["distance_km"]

    # 5. Generate Gemini 1.5 Flash Tour Guide Story
    ai_story = ""
    if best_candidate:
        ai_story = generate_tour_guide_story(
            destination_name=best_candidate["name"],
            category=best_candidate["category"],
            city=resolved_name,
            description=best_candidate["description"],
            merchant=paired_merchant
        )

    crowd_reduction = 0
    if best_candidate:
        crowd_reduction = max(0, int(origin_crowd - best_candidate["crowd_score"]))

    return {
        "status": "success",
        "origin": {
            "name": resolved_name,
            "latitude": origin_lat,
            "longitude": origin_lon,
            "crowd_score": origin_crowd,
            "crowd_status": origin_status,
            "reroute_recommended": origin_crowd >= 60
        },
        "recommended_alternative": best_candidate,
        "top_3_alternatives": top_3_alternatives,
        "all_candidates": evaluated_candidates,
        "paired_merchant": paired_merchant,
        "route_geometry": route_data,
        "crowd_reduction_percent": crowd_reduction,
        "gemini_tour_guide_story": ai_story
    }
