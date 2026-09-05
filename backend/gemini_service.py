"""
Generative AI Engine - Gemini 1.5/2.5 Flash Integration for GeoDivert
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

def generate_tour_guide_story(
    destination_name: str, 
    category: str, 
    city: str, 
    description: str, 
    merchant: dict,
    custom_api_key: str = None
) -> str:
    """
    Calls Gemini 1.5 / 2.5 Flash to write a concise, conversational 60-second tour guide narrative.
    Supports user-provided custom API key or system environment key.
    Includes rules:
      - Warm, engaging local tour guide persona
      - Focuses on 1 cool fact
      - Ends by recommending the paired local family-owned merchant
      - Strict constraint: No asterisks, markdown symbols, or bullet points
    """
    api_key = custom_api_key.strip() if (custom_api_key and custom_api_key.strip()) else GEMINI_API_KEY
    merchant_name = merchant.get("name", "the neighborhood tea house") if merchant else "the neighborhood tea house"
    merchant_desc = merchant.get("description", "local handmade snacks and fresh tea") if merchant else "local handmade snacks and fresh tea"

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

    if api_key:
        # Try Google GenAI SDK with active available models
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            for model_name in ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.5-flash"]:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    if response and response.text:
                        cleaned = response.text.replace("*", "").replace("#", "").strip()
                        print(f"[Gemini Service] Generated narrative with model: {model_name}")
                        return cleaned
                except Exception as m_err:
                    print(f"[Gemini Service] Model {model_name} notice: {str(m_err)[:100]}")
                    continue
        except Exception as sdk_err:
            print(f"[Gemini Service] SDK notice: {str(sdk_err)[:100]}")

        # Try direct REST endpoint for Gemini API
        for rest_model in ["gemini-flash-lite-latest", "gemini-flash-latest"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{rest_model}:generateContent?key={api_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}]
                }
                res = requests.post(url, json=payload, timeout=5.0)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            cleaned = parts[0]["text"].replace("*", "").replace("#", "").strip()
                            print(f"[Gemini Service] Generated narrative via REST with {rest_model}")
                            return cleaned
            except Exception as rest_err:
                print(f"[Gemini Service] REST notice with {rest_model}: {str(rest_err)[:100]}")
            pass

    # High quality dynamic fallback tour guide narrative
    return (
        f"Welcome to {destination_name} in beautiful {city}! While the mainstream tourist spots are packed with long lines today, "
        f"you have arrived at one of the city's most peaceful cultural sanctuaries. {description} "
        f"The tranquil atmosphere here lets you truly immerse yourself in the architecture and history without the rushing crowds. "
        f"By the way, once you are done exploring, there is a fantastic family-owned spot just around the corner called {merchant_name}—"
        f"be sure to stop by for some authentic local refreshments and say hello to the friendly owners!"
    )
