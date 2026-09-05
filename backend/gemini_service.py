"""
Generative AI Engine - Gemini 1.5 Flash Integration for GeoDivert
Generates interactive 60-second conversational tour guide stories with local merchant pairing
"""

import os
import requests

try:
    from backend.config import GEMINI_API_KEY
except ImportError:
    try:
        from config import GEMINI_API_KEY
    except ImportError:
        GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

def generate_tour_guide_story(destination_name: str, category: str, city: str, description: str, merchant: dict) -> str:
    """
    Calls Gemini 1.5 Flash to write a concise, conversational 60-second tour guide narrative.
    Includes rules from Blueprint Section 6:
      - Fun, engaging tour guide persona
      - Focuses on 1 cool fact
      - Ends by recommending the paired local family-owned merchant
      - Strict constraint: No asterisks, markdown symbols, or bullet points
    """
    merchant_name = merchant.get("name", "the neighborhood bakery")
    merchant_desc = merchant.get("description", "local handmade snacks and fresh tea")

    prompt = f"""
You are an expert, lively, and warm local tour guide in {city}, India for the GeoDivert tourism platform.
The traveler has just been redirected away from an overcrowded tourist trap to this serene cultural hidden gem: '{destination_name}' ({category}).

Context / History: {description}
Paired Local Merchant: '{merchant_name}' ({merchant_desc})

Please write a fun, conversational 60-second tour guide script:
1. Welcome the traveler warmly and share one fascinating, lesser-known cultural or historical fact about {destination_name}.
2. Explain why visiting right now is so peaceful and rewarding compared to crowded tourist traps.
3. Conclude by casually recommending that they grab a refreshing treat or snack at '{merchant_name}' right around the corner to support the local economy.

STRICT FORMATTING RULES:
- Output ONLY plain conversational text sentences.
- Do NOT use markdown symbols, do NOT use asterisks, bold text, hashes, or bullet points.
"""

    if GEMINI_API_KEY:
        # Try Google GenAI SDK (v1 / v2)
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            if response and response.text:
                cleaned = response.text.replace("*", "").replace("#", "").strip()
                return cleaned
        except Exception:
            pass

        # Try direct REST endpoint for Gemini API
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}]
            }
            res = requests.post(url, json=payload, timeout=2.5)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        cleaned = parts[0]["text"].replace("*", "").replace("#", "").strip()
                        return cleaned
        except Exception:
            pass

    # High quality dynamic fallback tour guide narrative
    return (
        f"Welcome to {destination_name} in beautiful {city}! While the mainstream tourist spots are packed with long lines today, "
        f"you have arrived at one of the city's most peaceful cultural sanctuaries. {description} "
        f"The tranquil atmosphere here lets you truly immerse yourself in the architecture and history without the rushing crowds. "
        f"By the way, once you are done exploring, there is a fantastic family-owned spot just around the corner called {merchant_name}—"
        f"be sure to stop by for some authentic local refreshments and say hello to the friendly owners!"
    )
