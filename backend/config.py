"""
Configuration and Environment Settings for GeoDivert Backend
"""

import os
from dotenv import load_dotenv

# Load .env file from project root or backend folder
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

OPENTRIPMAP_API_KEY = os.getenv("OPENTRIPMAP_API_KEY", "5ae2e3f221c38a28845f05b673b2386b3790201c3e885aedca017137")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MAPTILER_API_KEY = os.getenv("MAPTILER_API_KEY", "1F9CGOeQFYlGPknSOSpJ")
