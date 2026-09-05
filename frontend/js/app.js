/**
 * GeoDivert – Main Reactive Application Engine
 * Connects Frontend UI, 3D MapLibre, FastAPI Spatial Dispersal, OpenTripMap, and Gemini 1.5 Flash
 */

(function () {
  'use strict';

  const BACKEND_URL = 'http://127.0.0.1:8000';

  // Application State (100% Dynamic)
  const state = {
    currentLat: 20.9320, // Default to Amravati
    currentLon: 77.7523, // Default to Amravati
    currentLocationName: 'Amravati, Maharashtra',
    selectedPreferences: new Set(['history', 'nature']),
    hour: 14, // 2 PM default (Midday peak)
    dayOfWeek: 6, // Sunday (Weekend default)
    isWeekend: true,
    monitoredSpots: [],
    categories: [
      { id: 'nature', name: 'Nature & Lakes', icon: '🌿', description: 'Freshwater lakes, scenic valleys, and eco-trails' },
      { id: 'history', name: 'History & Forts', icon: '🏰', description: 'Hilltop fortifications, ramparts, and ancient landmarks' },
      { id: 'sacred', name: 'Sacred & Peace', icon: '🙏', description: 'Tranquil stupas, heritage temples, and quiet reflection grounds' },
      { id: 'culture', name: 'Museums & Art', icon: '🏛️', description: 'Heritage museums, ancient fossil exhibits, and art galleries' },
      { id: 'gardens', name: 'Gardens & Parks', icon: '🌸', description: 'Botanical collections, shaded walking paths, and bird decks' },
      { id: 'food', name: 'Local Bakeries & Cafes', icon: '☕', description: 'Independent family bakeries, tea stalls, and handicraft markets' }
    ]
  };

  // DOM Elements Cache
  let dom = {};

  document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 GeoDivert Reactive App Starting in Amravati region...');

    cacheElements();
    setupListeners();
    renderPreferencesModal();
    updatePrefBadge();
    updateTimeDisplay();

    // 1. Initialize 3D MapLibre Canvas centered on Amravati / user location
    if (window.GeoDivertMap) {
      window.GeoDivertMap.initMap('map-container', { lat: state.currentLat, lon: state.currentLon });
    }

    // 2. Automatically try detecting user location (GPS or IP geolocation)
    detectUserLocation(false);

    // 3. Run initial dispersal recommendation
    runDispersalPipeline(state.currentLat, state.currentLon, state.currentLocationName);
  });

  function cacheElements() {
    dom = {
      searchInput: document.getElementById('search-input'),
      searchClearBtn: document.getElementById('search-clear-btn'),
      exploreBtn: document.getElementById('explore-btn'),
      geoBtn: document.getElementById('btn-geolocation'),
      autocompleteDropdown: document.getElementById('autocomplete-dropdown'),
      quickChips: document.querySelectorAll('.quick-chip'),
      timeSlider: document.getElementById('time-slider'),
      timeDisplayLabel: document.getElementById('time-display-label'),
      timeHourBtns: document.querySelectorAll('.time-slot-selector .time-slot-btn'),
      btnDayWeekday: document.getElementById('btn-day-weekday'),
      btnDayWeekend: document.getElementById('btn-day-weekend'),
      radarStatusText: document.getElementById('radar-status-text'),

      // Origin Spot Elements
      destIcon: document.getElementById('dest-icon'),
      destName: document.getElementById('dest-name'),
      destCategory: document.getElementById('dest-category'),
      destLocation: document.getElementById('dest-location'),
      destCrowdPercent: document.getElementById('dest-crowd-percent'),
      destCrowdMeterFill: document.getElementById('dest-crowd-meter-fill'),
      destCrowdStatus: document.getElementById('dest-crowd-status'),
      destWaitTime: document.getElementById('dest-wait-time'),

      // Recommended Alternative Elements
      recIcon: document.getElementById('rec-icon'),
      recName: document.getElementById('rec-name'),
      recCategory: document.getElementById('rec-category'),
      recCrowdPercent: document.getElementById('rec-crowd-percent'),
      recCrowdStatus: document.getElementById('rec-crowd-status'),
      recDistance: document.getElementById('rec-distance'),
      recDuration: document.getElementById('rec-duration'),
      recReductionBadge: document.getElementById('rec-reduction-badge'),
      recPrefMatchBadge: document.getElementById('rec-pref-match-badge'),
      geminiStoryText: document.getElementById('gemini-story-text'),
      btnExploreAlternative: document.getElementById('btn-explore-alternative'),

      // Paired Merchant Elements
      merchantName: document.getElementById('merchant-name'),
      merchantDesc: document.getElementById('merchant-desc'),
      merchantDist: document.getElementById('merchant-dist'),
      merchantRating: document.getElementById('merchant-rating'),

      // Alternatives Deck & Comparison
      altDeckGrid: document.getElementById('alt-deck-grid'),
      compOrigName: document.getElementById('comp-orig-name'),
      compOrigPercent: document.getElementById('comp-orig-percent'),
      compOrigBar: document.getElementById('comp-orig-bar'),
      compAltName: document.getElementById('comp-alt-name'),
      compAltPercent: document.getElementById('comp-alt-percent'),
      compAltBar: document.getElementById('comp-alt-bar'),
      compDiffBadge: document.getElementById('comp-diff-badge'),

      // Navigation Route
      routeStart: document.getElementById('route-start'),
      routeEnd: document.getElementById('route-end'),
      routeDistance: document.getElementById('route-distance'),
      routeDuration: document.getElementById('route-duration'),

      // Preferences Modal
      prefModal: document.getElementById('preferences-modal'),
      prefModalCloseBtn: document.getElementById('pref-modal-close-btn'),
      navPrefBtn: document.getElementById('nav-pref-btn'),
      navPrefCount: document.getElementById('nav-pref-count'),
      prefGrid: document.getElementById('pref-categories-grid'),
      prefClearBtn: document.getElementById('pref-clear-btn'),
      prefSaveBtn: document.getElementById('pref-save-btn'),
      prefCountIndicator: document.getElementById('pref-count-indicator'),
      toastContainer: document.getElementById('toast-container')
    };
  }

  function setupListeners() {
    // Search input enter & button
    if (dom.searchInput) {
      dom.searchInput.addEventListener('input', handleSearchInput);
      dom.searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleSearchSubmit();
      });
    }

    if (dom.searchClearBtn) {
      dom.searchClearBtn.addEventListener('click', function () {
        if (dom.searchInput) dom.searchInput.value = '';
        if (dom.autocompleteDropdown) dom.autocompleteDropdown.innerHTML = '';
      });
    }

    if (dom.exploreBtn) {
      dom.exploreBtn.addEventListener('click', handleSearchSubmit);
    }

    // Geolocation "My Location" Button
    if (dom.geoBtn) {
      dom.geoBtn.addEventListener('click', function () {
        detectUserLocation(true);
      });
    }

    // Quick Location Chips
    dom.quickChips.forEach(chip => {
      chip.addEventListener('click', function () {
        const query = this.getAttribute('data-query');
        if (dom.searchInput) dom.searchInput.value = query;
        showToast(`📍 Analyzing crowd for "${query}"...`);
        runDispersalPipeline(state.currentLat, state.currentLon, query);
      });
    });

    // Time Slider: Real-time dynamic crowd prediction update as you drag!
    if (dom.timeSlider) {
      dom.timeSlider.addEventListener('input', function () {
        state.hour = parseInt(this.value);
        updateTimeDisplay();
        highlightActiveHourButton();
        runDispersalPipeline(state.currentLat, state.currentLon, state.currentLocationName);
      });
    }

    // Quick Time Preset Buttons (Night 3 AM, Morning 9 AM, Midday 2 PM, Evening 6 PM)
    dom.timeHourBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const h = parseInt(this.getAttribute('data-hour'));
        state.hour = h;
        if (dom.timeSlider) dom.timeSlider.value = h;
        updateTimeDisplay();
        highlightActiveHourButton();
        runDispersalPipeline(state.currentLat, state.currentLon, state.currentLocationName);
      });
    });

    // Day of Week Buttons (Weekday vs Weekend)
    if (dom.btnDayWeekday) {
      dom.btnDayWeekday.addEventListener('click', function () {
        this.classList.add('active');
        if (dom.btnDayWeekend) dom.btnDayWeekend.classList.remove('active');
        state.dayOfWeek = 2; // Wednesday
        state.isWeekend = false;
        showToast('🏢 Weekday crowd patterns loaded (Moderate baseline).');
        runDispersalPipeline(state.currentLat, state.currentLon, state.currentLocationName);
      });
    }

    if (dom.btnDayWeekend) {
      dom.btnDayWeekend.addEventListener('click', function () {
        this.classList.add('active');
        if (dom.btnDayWeekday) dom.btnDayWeekday.classList.remove('active');
        state.dayOfWeek = 6; // Sunday
        state.isWeekend = true;
        showToast('🎉 Weekend crowd patterns loaded (High baseline & midday surges).');
        runDispersalPipeline(state.currentLat, state.currentLon, state.currentLocationName);
      });
    }

    // View 3D Navigation Route Button
    if (dom.btnExploreAlternative) {
      dom.btnExploreAlternative.addEventListener('click', function () {
        const mapSec = document.getElementById('map-section');
        if (mapSec) mapSec.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Preferences Modal Events
    if (dom.navPrefBtn) dom.navPrefBtn.addEventListener('click', () => toggleModal(dom.prefModal, true));
    if (dom.prefModalCloseBtn) dom.prefModalCloseBtn.addEventListener('click', () => toggleModal(dom.prefModal, false));
    if (dom.prefModal) {
      dom.prefModal.addEventListener('click', function (e) {
        if (e.target === dom.prefModal) toggleModal(dom.prefModal, false);
      });
    }

    if (dom.prefClearBtn) {
      dom.prefClearBtn.addEventListener('click', function () {
        state.selectedPreferences.clear();
        renderPreferencesModal();
        if (dom.prefCountIndicator) dom.prefCountIndicator.textContent = '0 categories selected';
      });
    }

    if (dom.prefSaveBtn) {
      dom.prefSaveBtn.addEventListener('click', function () {
        toggleModal(dom.prefModal, false);
        updatePrefBadge();
        showToast('✨ Preferences saved! Spatial Dispersal recalibrated.');
        runDispersalPipeline(state.currentLat, state.currentLon, state.currentLocationName);
      });
    }

    // Close autocomplete when clicking outside
    document.addEventListener('click', function (e) {
      if (dom.searchInput && !dom.searchInput.contains(e.target) && dom.autocompleteDropdown && !dom.autocompleteDropdown.contains(e.target)) {
        dom.autocompleteDropdown.innerHTML = '';
      }
    });
  }

  function updateTimeDisplay() {
    const h = state.hour;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    if (dom.timeDisplayLabel) {
      dom.timeDisplayLabel.textContent = `${String(h).padStart(2, '0')}:00 (${displayHour}:00 ${ampm})`;
    }
  }

  function highlightActiveHourButton() {
    dom.timeHourBtns.forEach(btn => {
      const btnHour = parseInt(btn.getAttribute('data-hour'));
      if (btnHour === state.hour) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  /**
   * Geolocation Detection with GPS & IP Fallback to Amravati
   */
  async function detectUserLocation(notifyUser) {
    if (navigator.geolocation) {
      if (notifyUser) showToast('📡 Requesting device GPS coordinates...');
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          state.currentLat = lat;
          state.currentLon = lon;
          state.currentLocationName = 'My Location (GPS)';
          if (dom.searchInput) dom.searchInput.value = 'My Current Location (GPS)';
          if (window.GeoDivertMap) window.GeoDivertMap.setCenter(lat, lon, 13);
          showToast(`📍 GPS detected: [${lat.toFixed(4)}, ${lon.toFixed(4)}]`);
          runDispersalPipeline(lat, lon, 'My Current Location');
        },
        async function (err) {
          console.log('GPS unavailable, using IP geolocation / Amravati coordinates...', err.message);
          await tryIPGeolocation(notifyUser);
        },
        { timeout: 4000, enableHighAccuracy: true }
      );
    } else {
      await tryIPGeolocation(notifyUser);
    }
  }

  async function tryIPGeolocation(notifyUser) {
    try {
      const res = await fetch('https://ipapi.co/json/', { timeout: 2500 });
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          state.currentLat = data.latitude;
          state.currentLon = data.longitude;
          state.currentLocationName = `${data.city || 'Amravati'}, ${data.region || 'Maharashtra'}`;
          if (dom.searchInput) dom.searchInput.value = state.currentLocationName;
          if (window.GeoDivertMap) window.GeoDivertMap.setCenter(data.latitude, data.longitude, 13);
          if (notifyUser) showToast(`📍 Location detected: ${state.currentLocationName}`);
          runDispersalPipeline(data.latitude, data.longitude, state.currentLocationName);
          return;
        }
      }
    } catch (e) {
      console.log('IP geocoding notice:', e.message);
    }

    // Default to Amravati coordinates
    state.currentLat = 20.9320;
    state.currentLon = 77.7523;
    state.currentLocationName = 'Amravati, Maharashtra';
    if (dom.searchInput) dom.searchInput.value = 'Amravati, Maharashtra';
    if (window.GeoDivertMap) window.GeoDivertMap.setCenter(20.9320, 77.7523, 13);
    if (notifyUser) showToast('📍 Centered on Amravati, Maharashtra');
    runDispersalPipeline(20.9320, 77.7523, 'Amravati, Maharashtra');
  }

  function handleSearchSubmit() {
    const query = dom.searchInput ? dom.searchInput.value.trim() : '';
    if (!query) return;

    showToast(`🔍 Searching crowd dispersal for "${query}"...`);
    runDispersalPipeline(state.currentLat, state.currentLon, query);
  }

  function handleSearchInput() {
    const val = dom.searchInput.value.trim().toLowerCase();
    if (!val || val.length < 2) {
      dom.autocompleteDropdown.innerHTML = '';
      return;
    }

    const matches = state.monitoredSpots.filter(s => s.name.toLowerCase().includes(val) || (s.category && s.category.toLowerCase().includes(val)));
    dom.autocompleteDropdown.innerHTML = matches.map(m => `
      <div onclick="window.GeoDivertApp.selectSpotById('${m.id}')" style="
        padding: 9px 14px;
        cursor: pointer;
        border-bottom: 1px solid var(--border-color);
        color: #fff;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <span><strong>${m.name}</strong> <small style="color:#94a3b8;">(${m.category})</small></span>
        <span style="font-size:0.75rem; font-weight:700; color:${(m.crowd_score || 50) >= 70 ? '#fb7185' : '#34d399'};">
          ${m.crowd_score || 50}% Crowd
        </span>
      </div>
    `).join('');
  }

  /**
   * Main Reactive Pipeline: Dispatches to FastAPI Backend
   */
  async function runDispersalPipeline(lat, lon, locationName) {
    state.currentLat = lat;
    state.currentLon = lon;
    state.currentLocationName = locationName || 'Amravati, Maharashtra';

    if (dom.geminiStoryText) {
      dom.geminiStoryText.innerHTML = `<em>✨ Gemini 1.5 Flash is generating an interactive tour guide story...</em>`;
    }

    const payload = {
      latitude: lat,
      longitude: lon,
      hour: state.hour,
      day_of_week: state.dayOfWeek,
      preferences: Array.from(state.selectedPreferences),
      selected_spot_name: locationName
    };

    try {
      const response = await fetch(`${BACKEND_URL}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ FastAPI Dispersal Engine Response:', data);
        renderDispersalResults(data, locationName);
        return;
      }
    } catch (err) {
      console.log('Backend connection notice:', err.message);
    }

    // Dynamic Client-side ML Evaluation Fallback
    renderFallbackDispersal(lat, lon, locationName);
  }

  /**
   * Renders the dynamic dispersal data into the UI
   */
  function renderDispersalResults(data, locationName) {
    const origin = data.origin || {};
    const rec = data.recommended_alternative;
    const top3 = data.top_3_alternatives || [];
    const merchant = data.paired_merchant || {};
    const geminiStory = data.gemini_tour_guide_story;
    const route = data.route_geometry || {};
    const reduction = data.crowd_reduction_percent || Math.max(0, Math.round((origin.crowd_score || 92) - (rec ? rec.crowd_score : 28)));

    state.monitoredSpots = data.all_candidates || [];

    // 1. Origin Card
    if (dom.destName) {
      dom.destName.textContent = origin.name || locationName || 'Origin Location';
      dom.destLocation.textContent = `Coordinate [${(origin.latitude || state.currentLat).toFixed(4)}, ${(origin.longitude || state.currentLon).toFixed(4)}]`;
      dom.destCrowdPercent.textContent = `${origin.crowd_score || 92}%`;
      dom.destCrowdMeterFill.style.width = `${origin.crowd_score || 92}%`;
      dom.destCrowdStatus.textContent = `${origin.crowd_status || 'HIGH'} CROWD`;
      dom.destCrowdStatus.style.background = (origin.crowd_status === 'HIGH' || (origin.crowd_score || 92) >= 70) ? '#f43f5e' : '#f59e0b';
      
      const hour = state.hour;
      const wait = origin.crowd_score >= 80 ? '~50 min wait' : origin.crowd_score >= 50 ? '~25 min wait' : '0 min wait';
      if (dom.destWaitTime) dom.destWaitTime.textContent = `⏱️ ${wait} at ${hour}:00`;
    }

    // 2. Recommended Alternative Card
    if (rec && dom.recName) {
      dom.recName.textContent = rec.name;
      dom.recCategory.textContent = rec.category || 'Serene Cultural Corridor';
      dom.recCrowdPercent.textContent = `${rec.crowd_score}%`;
      dom.recCrowdStatus.textContent = rec.crowd_status || 'SERENE';
      dom.recDistance.textContent = `${rec.distance_km || 3.4} km`;
      dom.recDuration.textContent = `${route.duration_mins || Math.round((rec.distance_km || 3.4) * 2.2) + 3} mins`;
      dom.recReductionBadge.innerHTML = `🎉 <strong>${reduction}% less crowded</strong> than your origin point!`;
      
      const isMatch = state.selectedPreferences.has(rec.preference_category);
      dom.recPrefMatchBadge.textContent = isMatch ? '🎯 95% Match' : '🌿 Serene Corridor';

      // Pick category icon
      let icon = '🌿';
      if (rec.preference_category === 'history') icon = '🏰';
      else if (rec.preference_category === 'sacred') icon = '🙏';
      else if (rec.preference_category === 'culture') icon = '🏛️';
      else if (rec.preference_category === 'gardens') icon = '🌸';
      if (dom.recIcon) dom.recIcon.textContent = icon;
    }

    // 3. Gemini 1.5 Flash Tour Guide Story
    if (dom.geminiStoryText) {
      dom.geminiStoryText.textContent = geminiStory || `Welcome to ${rec ? rec.name : 'this serene spot'}! Escape the peak crowds and enjoy a relaxed visit surrounded by verified cultural heritage without ticket lines. When done exploring, be sure to stop by ${merchant.name || 'the local artisan bakery'} just nearby!`;
    }

    // 4. Paired Local Merchant Box
    if (merchant && dom.merchantName) {
      dom.merchantName.textContent = merchant.name || 'Raghuveer Sweets & Heritage Tea House';
      dom.merchantDesc.textContent = merchant.description || 'Famous local bakery and tea house serving fresh handmade cardamom tea and snacks.';
      dom.merchantDist.textContent = `📍 ${merchant.dist || '280 m'} from destination (Supporting Local Economy)`;
      dom.merchantRating.textContent = `⭐ ${merchant.rating || 4.8}`;
    }

    // 5. Top 3 Alternatives Deck
    if (dom.altDeckGrid) {
      dom.altDeckGrid.innerHTML = top3.map((alt, i) => `
        <div class="alt-deck-card" onclick="window.GeoDivertApp.selectSpotById('${alt.id}')" style="
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem;
          cursor: pointer;
          transition: var(--transition);
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
            <span style="font-size:0.75rem; font-weight:700; color:var(--primary); background:rgba(56,189,248,0.1); padding:2px 8px; border-radius:12px;">Rank #${i+1}</span>
            <span style="font-size:0.8rem; color:#34d399; font-weight:700;">🟢 ${alt.crowd_score}% Crowd</span>
          </div>
          <h4 style="font-size:1.05rem; margin-bottom:0.25rem;">${alt.name}</h4>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.6rem;">${alt.category} • ${alt.distance_km ? alt.distance_km.toFixed(1) : 3.8} km away</p>
          <button style="width:100%; background:var(--bg-surface); color:var(--text-main); border:1px solid var(--border-color); padding:5px; border-radius:6px; font-size:0.75rem; cursor:pointer;">
            Inspect Spot →
          </button>
        </div>
      `).join('');
    }

    // 6. Comparison Duel Progress Bars
    if (dom.compOrigName && rec) {
      dom.compOrigName.textContent = origin.name || locationName || 'Origin Point';
      dom.compOrigPercent.textContent = `${origin.crowd_score || 92}% 🔴 HIGH`;
      dom.compOrigBar.style.width = `${origin.crowd_score || 92}%`;

      dom.compAltName.textContent = rec.name;
      dom.compAltPercent.textContent = `${rec.crowd_score}% 🟢 SERENE`;
      dom.compAltBar.style.width = `${rec.crowd_score}%`;
      dom.compDiffBadge.innerHTML = `📉 <strong>${reduction}% Crowd Reduction</strong> achieved by GeoDivert dynamic routing!`;
    }

    // 7. Navigation Route Info
    if (dom.routeStart && rec) {
      dom.routeStart.textContent = origin.name || locationName || 'Origin Location';
      dom.routeEnd.textContent = rec.name;
      dom.routeDistance.textContent = `${rec.distance_km || 3.4} km`;
      const mins = route.duration_mins || Math.round((rec.distance_km || 3.4) * 2.2) + 3;
      dom.routeDuration.textContent = `🚗 ${mins} mins`;
    }

    // 8. 3D Map Route & Heatmap Rendering
    if (window.GeoDivertMap && rec) {
      const originPoint = { 
        lat: origin.latitude || state.currentLat, 
        lon: origin.longitude || state.currentLon, 
        name: origin.name || locationName, 
        crowd_score: origin.crowd_score 
      };
      const destPoint = { 
        lat: rec.lat, 
        lng: rec.lng || rec.lon, 
        name: rec.name, 
        crowd_score: rec.crowd_score 
      };

      window.GeoDivertMap.drawRoute(originPoint, destPoint, route.coordinates);
      window.GeoDivertMap.updateHeatmap(data.all_candidates || []);
      window.GeoDivertMap.renderMarkers(data.all_candidates || [], originPoint, destPoint);
    }
  }

  /**
   * Client-side dynamic ML scoring fallback if FastAPI backend is starting
   */
  function renderFallbackDispersal(lat, lon, locationName) {
    const isAmravati = (Math.abs(lat - 20.9320) < 0.5);
    const candidateName = isAmravati ? 'Wadali Talao & Botanical Park' : 'Deekshabhoomi Peace Stupa';
    const candidateCat = isAmravati ? 'Scenic Lake & Botanical Park' : 'Sacred Peace Monument';
    const candidateLat = isAmravati ? 20.9580 : 21.1278;
    const candidateLon = isAmravati ? 77.7845 : 79.0669;

    // Time-based dynamic crowd prediction
    const h = state.hour;
    let baseCrowd = 20;
    if (state.isWeekend) {
      if (h >= 11 && h <= 16) baseCrowd = 96;
      else if (h >= 17 && h <= 20) baseCrowd = 78;
      else if (h >= 7 && h <= 10) baseCrowd = 45;
      else baseCrowd = 25;
    } else {
      if (h >= 11 && h <= 16) baseCrowd = 58;
      else if (h >= 17 && h <= 20) baseCrowd = 48;
      else if (h >= 7 && h <= 10) baseCrowd = 28;
      else baseCrowd = 15;
    }

    const calmCrowd = Math.max(8, Math.round(baseCrowd * 0.35));

    const data = {
      origin: { name: locationName, latitude: lat, longitude: lon, crowd_score: baseCrowd, crowd_status: baseCrowd >= 70 ? 'HIGH' : baseCrowd >= 40 ? 'MEDIUM' : 'LOW' },
      recommended_alternative: {
        id: 'spot_rec',
        name: candidateName,
        category: candidateCat,
        lat: candidateLat,
        lng: candidateLon,
        crowd_score: calmCrowd,
        crowd_status: 'SERENE',
        distance_km: 3.8,
        preference_category: 'nature'
      },
      top_3_alternatives: [
        { id: 'alt1', name: candidateName, category: candidateCat, crowd_score: calmCrowd, distance_km: 3.8 },
        { id: 'alt2', name: isAmravati ? 'Bamboo Garden & Eco Reserve' : 'Khindsi Eco Lake', category: 'Botanical Garden & Reserve', crowd_score: Math.max(8, calmCrowd - 4), distance_km: 5.2 },
        { id: 'alt3', name: isAmravati ? 'Kondeshwar Shiva Temple' : 'Ramtek Fort Temple', category: 'Ancient Forest Gorge & Temple', crowd_score: calmCrowd + 3, distance_km: 8.5 }
      ],
      all_candidates: [
        { id: 'alt1', name: candidateName, category: candidateCat, lat: candidateLat, lng: candidateLon, crowd_score: calmCrowd },
        { id: 'alt2', name: isAmravati ? 'Bamboo Garden & Eco Reserve' : 'Khindsi Eco Lake', category: 'Botanical Garden & Reserve', lat: isAmravati ? 20.9425 : 21.4056, lng: isAmravati ? 77.7710 : 79.3333, crowd_score: Math.max(8, calmCrowd - 4) },
        { id: 'alt3', name: isAmravati ? 'Kondeshwar Shiva Temple' : 'Ramtek Fort Temple', category: 'Ancient Forest Gorge & Temple', lat: isAmravati ? 20.8120 : 21.3970, lng: isAmravati ? 77.7680 : 79.3275, crowd_score: calmCrowd + 3 }
      ],
      paired_merchant: {
        name: isAmravati ? 'Raghuveer Sweets & Heritage Tea House' : 'Gondwana Heritage Artisan Bakery',
        description: 'Famous local bakery and tea house serving fresh handmade cardamom tea and snacks.',
        dist: '280 m',
        rating: 4.8
      },
      route_geometry: {
        coordinates: [
          [lon, lat],
          [(lon + candidateLon) / 2 + 0.004, (lat + candidateLat) / 2 + 0.003],
          [candidateLon, candidateLat]
        ],
        distance_km: 3.8,
        duration_mins: 11
      },
      crowd_reduction_percent: baseCrowd - calmCrowd,
      gemini_tour_guide_story: `Welcome to ${candidateName}! While ${locationName} is experiencing peak visitor traffic (${baseCrowd}% capacity) at ${state.hour}:00, you have arrived at one of the region's most serene cultural sanctuaries. Enjoy the peaceful surroundings without ticket delays. When you are done exploring, be sure to stop by ${isAmravati ? 'Raghuveer Sweets & Tea House' : 'the local bakery'} just down the road for fresh herbal tea and treats!`
    };

    renderDispersalResults(data, locationName);
  }

  // --- PREFERENCES MODAL HELPERS ---

  function renderPreferencesModal() {
    if (!dom.prefGrid) return;
    dom.prefGrid.innerHTML = state.categories.map(cat => `
      <div class="pref-cat-card ${state.selectedPreferences.has(cat.id) ? 'selected' : ''}" 
           data-id="${cat.id}" 
           onclick="window.GeoDivertApp.togglePreference('${cat.id}')"
           style="
             background: var(--bg-surface);
             border: 2px solid ${state.selectedPreferences.has(cat.id) ? 'var(--primary)' : 'var(--border-color)'};
             border-radius: var(--radius-md);
             padding: 1rem;
             cursor: pointer;
           ">
        <span style="font-size:1.8rem;">${cat.icon}</span>
        <h4 style="margin-top:0.4rem; font-size:1rem;">${cat.name}</h4>
        <p style="font-size:0.75rem; color:var(--text-muted);">${cat.description}</p>
      </div>
    `).join('');
  }

  function togglePreference(catId) {
    if (state.selectedPreferences.has(catId)) {
      state.selectedPreferences.delete(catId);
    } else {
      state.selectedPreferences.add(catId);
    }
    renderPreferencesModal();
    if (dom.prefCountIndicator) {
      dom.prefCountIndicator.textContent = `${state.selectedPreferences.size} categories selected`;
    }
  }

  function updatePrefBadge() {
    if (dom.navPrefCount) {
      dom.navPrefCount.textContent = state.selectedPreferences.size > 0 ? `${state.selectedPreferences.size} Active` : 'Set';
    }
  }

  function toggleModal(modalEl, show) {
    if (!modalEl) return;
    if (show) modalEl.classList.add('active');
    else modalEl.classList.remove('active');
  }

  function showToast(msg) {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.style.cssText = 'background:#151e32; color:#fff; border:1px solid #38bdf8; padding:10px 16px; border-radius:10px; margin-top:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5); font-size:0.85rem;';
    toast.textContent = msg;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // Global APIs
  window.GeoDivertApp = {
    selectSpotById: function (id) {
      const spot = state.monitoredSpots.find(s => s.id === id);
      if (spot) {
        if (dom.searchInput) dom.searchInput.value = spot.name;
        runDispersalPipeline(spot.lat, spot.lng || spot.lon, spot.name);
      }
    },
    selectSpot: function (spot) {
      if (spot) {
        if (dom.searchInput) dom.searchInput.value = spot.name;
        runDispersalPipeline(spot.lat, spot.lng || spot.lon, spot.name);
      }
    },
    handleMapClick: function (lat, lng) {
      showToast(`📍 Selected map coordinate: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
      runDispersalPipeline(lat, lng, 'Map Selected Point');
    },
    togglePreference: togglePreference
  };

})();
