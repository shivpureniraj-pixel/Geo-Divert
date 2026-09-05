# 🧭 GeoDivert — AI Tourism Crowd Redistribution & 3D Spatial Engine

[![Python FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Scikit-Learn ML](https://img.shields.io/badge/ML-Scikit--Learn%20DecisionTree-F7931E.svg)](https://scikit-learn.org/)
[![MapTiler 3D](https://img.shields.io/badge/Map-MapTiler%203D%20Terrain-0080FF.svg)](https://www.maptiler.com/)
[![Google Gemini 1.5/2.5](https://img.shields.io/badge/AI-Gemini%20Flash-4285F4.svg)](https://aistudio.google.com/)

**GeoDivert** is an interactive, AI-powered 3D spatial tourism redistribution platform for **Amravati, Maharashtra, India**. It proactively predicts live crowd congestion at major tourist hotspots using **Scikit-Learn DecisionTree Machine Learning**, reroutes travelers to nearby serene cultural hidden gems via **3D MapLibre terrain routing**, generates personalized **60-second Gemini 1.5/2.5 Flash voice narratives**, and pairs authentic local family-owned merchants to boost local economic growth.

---

## 🌟 Key Features

1. **3D MapLibre Spatial Terrain Engine**:
   - High-fidelity dark vector map tiles with 70° pitch 3D perspective elevation DEM.
   - Real-time density dots (🟢 Serene <40%, 🟡 Medium 40-70%, 🔴 Congested >70%) and OSRM turn-by-turn routing vectors.

2. **Scikit-Learn DecisionTree Crowd Prediction**:
   - Machine learning model trained on temporal hour-of-day, day-of-week, and seasonal tourist flux.
   - Instant 24-hour predictive curves with interactive timeline scrubbers.

3. **Spatial Dispersal Cost Optimization**:
   $$\min F(x) = \alpha \cdot d(x) + \beta \cdot C(x) - \gamma \cdot V(x) - \delta \cdot P(x)$$
   - Mathematically balances travel distance $d(x)$, destination congestion $C(x)$, cultural significance value $V(x)$, and user category preferences $P(x)$.

4. **Gemini 1.5/2.5 Flash Storyteller & Speech Synthesizer**:
   - Synthesizes warm, conversational 60-second tour guide narratives with plain-text constraints.
   - Built-in Web Speech API voice reader and live audio spectrum visualizer.

5. **Local Merchant Economic Pairing**:
   - Automatically recommends family-owned bakeries, tea houses, and artisan shops within 800m–1.5km of serene sanctuaries.

6. **In-App API Key Settings Modal (🔑)**:
   - Configure personal API keys directly in the UI without modifying source code or exposing secrets on GitHub!

---

## 🔑 API Key Setup & Configuration

To run GeoDivert on your local machine or deploy it to GitHub safely, you can configure API keys using either **Environment Variables (`.env`)** or the **In-App API Key Modal (🔑)**.

### Method 1: Environment File (`.env`) [Recommended for Local Server]

1. Copy the `.env.example` template to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your keys:
   ```env
   # Google Gemini API Key (https://aistudio.google.com/app/apikey)
   GEMINI_API_KEY=AIzaSy...

   # MapTiler API Key (https://cloud.maptiler.com/account/keys/)
   MAPTILER_API_KEY=1F9CG...

   # OpenTripMap API Key (https://opentripmap.io/product)
   OPENTRIPMAP_API_KEY=5ae2e...
   ```

> 🛡️ **GitHub Safety Note:** `.env` is listed in `.gitignore` and will never be committed to GitHub.

---

### Method 2: In-App UI Settings Modal (🔑) [Recommended for Live Demo / Users]

1. Launch the application in your browser (`http://127.0.0.1:8000/`).
2. Click the **🔑 API Keys** button in the top navigation header.
3. Enter your personal **Gemini 1.5/2.5**, **MapTiler 3D**, or **OpenTripMap** keys.
4. Click **Save & Apply Keys**. Your keys will be securely stored in your browser's `localStorage` and sent with live requests!

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.9+
- Modern Web Browser (Chrome, Edge, Firefox, Safari)

### Option A: One-Click Windows Batch Launcher

Double-click `run_geodivert.bat` or run in PowerShell:
```cmd
.\run_geodivert.bat
```

The launcher will automatically:
1. Verify Python and dependencies.
2. Train the Scikit-Learn DecisionTree model if `model.pkl` is missing.
3. Clean lingering port 8000 processes.
4. Launch the FastAPI server on `http://127.0.0.1:8000/`.

---

### Option B: Manual Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shivpureniraj-pixel/Geo-Divert.git
   cd Geo-Divert
   ```

2. **Install Python dependencies**:
   ```bash
   pip install fastapi uvicorn scikit-learn pandas numpy requests python-dotenv google-genai
   ```

3. **Train the Crowd Density Model**:
   ```bash
   python backend/train_model.py
   ```

4. **Launch FastAPI Backend**:
   ```bash
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

5. **Open in Browser**:
   - **Landing Presentation & AI Studio**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
   - **3D Spatial Dispersal Map Engine**: [http://127.0.0.1:8000/map](http://127.0.0.1:8000/map)

---

## 📁 Repository Structure

```text
Geo-Divert/
├── .env.example               # Template for API keys configuration
├── .gitignore                 # Excludes .env, __pycache__, and build artifacts
├── README.md                  # Complete project documentation & setup guide
├── ML_GUIDE_FOR_BEGINNERS.md  # Detailed breakdown of Scikit-Learn DecisionTree model
├── run_geodivert.bat          # One-click Windows starter script
│
├── backend/                   # FastAPI Backend Orchestration Microservice
│   ├── config.py              # Environment and API key loader
│   ├── main.py                # Central FastAPI endpoints & static file router
│   ├── predict.py             # Scikit-Learn model inference module
│   ├── train_model.py         # DecisionTree training script (Amravati dataset)
│   ├── dispersal_engine.py    # Spatial Dispersal cost function solver
│   ├── gemini_service.py      # Gemini 1.5/2.5 Flash narrative generator
│   ├── opentripmap.py         # OpenTripMap POI & local merchant engine
│   ├── amravati_crowd_data.csv# Amravati tourist spots crowd density dataset
│   └── model.pkl              # Serialized DecisionTreeRegressor ML model
│
└── frontend/                  # Modern Glassmorphic Web Interface
    ├── landing.html           # Interactive Landing Page & AI Feature Studio
    ├── index.html             # Main 3D Spatial Dispersal Application Page
    ├── css/
    │   ├── landing.css        # Landing page styling & 3D card tilt styles
    │   └── styles.css         # Main app styling & frosted glass design system
    └── js/
        ├── map.js             # MapLibre 3D vector map engine & terrain DEM
        ├── app.js             # Reactive application state & API integrations
        ├── landing-globe.js   # Interactive 3D Canvas Holographic Globe
        └── landing-interactive.js # 4 Interactive Feature Studio Models & Web Audio
```

---

## 🤝 Git & GitHub Deployment Workflow

When pushing updates to GitHub, follow the team branching guidelines:

1. **Pull the latest main code**:
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Add API Key configuration modal and GitHub setup"
   ```
3. **Push to GitHub**:
   ```bash
   git push origin main
   ```

---

## 📄 License
This project is open-source under the MIT License. Developed for intelligent urban tourism crowd redistribution and sustainable local economic growth.
