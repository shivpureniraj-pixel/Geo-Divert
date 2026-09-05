"""
Configuration and Environment Settings for GeoDivert Backend
"""

import os
from dotenv import load_dotenv

# Load .env file from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

# Read API Keys from environment variables
OPENTRIPMAP_API_KEY = os.getenv("OPENTRIPMAP_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MAPTILER_API_KEY = os.getenv("MAPTILER_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
