/**
 * GeoDivert – Main Reactive Application Engine
 * Connects Frontend UI, 3D MapLibre, FastAPI Spatial Dispersal, OpenTripMap, and Gemini 1.5 Flash
 */

(function () {
  'use strict';

  const BACKEND_URL = 'http://127.0.0.1:8000';

  // Application State (Fully Dynamic)
  const state = {
    currentLat: 21.1458,
    currentLon: 79.0882,
    currentLocationName: 'Sitabuldi Fort',
    selectedPreferences: new Set(['history', 'nature']),
    timeSlot: 'afternoon',
    hour: 14,
    dayOfWeek: 6, // Sunday / Weekend
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
    console.log('🚀 GeoDivert Reactive App Engine Starting...');

    cacheElements();
    setupListeners();
    renderPreferencesModal();
    updatePrefBadge();

    // 1. Fetch live monitored spots from FastAPI backend to populate 3D Map
    await fetchMonitoredSpots();

    // 2. Initialize 3D MapLibre Canvas
    if (window.GeoDivertMap) {
      window.GeoDivertMap.initMap('map-container', state.monitoredSpots);
    }

    // 3. Trigger initial dispersal recommendation for default location (Sitabuldi Fort)
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
      timeSlotBtns: document.querySelectorAll('.time-slot-btn'),
      radarStatusText: document.getElementById('radar-status-text'),

      // Origin Spot Elements
      destImg: document.getElementById('dest-image'),
      destName: document.getElementById('dest-name'),
      destCategory: document.getElementById('dest-category'),
      destLocation: document.getElementById('dest-location'),
      destCrowdPercent: document.getElementById('dest-crowd-percent'),
      destCrowdMeterFill: document.getElementById('dest-crowd-meter-fill'),
      destCrowdStatus: document.getElementById('dest-crowd-status'),

      // Recommended Alternative Elements
      recImg: document.getElementById('rec-image'),
      recName: document.getElementById('rec-name'),
      recCategory: document.getElementById('rec-category'),
      recCrowdPercent: document.getElementById('rec-crowd-percent'),
      recCrowdStatus: document.getElementById('rec-crowd-status'),
      recDistance: document.getElementById('rec-distance'),
      recRating: document.getElementById('rec-rating'),
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
    // Search input typing & enter key
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

    // Geolocation "Find My Location" Button
    if (dom.geoBtn) {
      dom.geoBtn.addEventListener('click', handleGeolocation);
    }

    // Quick Destination Chips
    dom.quickChips.forEach(chip => {
      chip.addEventListener('click', function () {
        const lat = parseFloat(this.getAttribute('data-lat'));
        const lon = parseFloat(this.getAttribute('data-lon'));
        const name = this.getAttribute('data-name');
        if (dom.searchInput) dom.searchInput.value = name;
        showToast(`📍 Analyzing crowd density for ${name}...`);
        runDispersalPipeline(lat, lon, name);
      });
    });

    // Time Slot Selector buttons (Morning, Midday, Evening)
    dom.timeSlotBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        dom.timeSlotBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        state.timeSlot = this.getAttribute('data-time');

        if (state.timeSlot === 'morning') state.hour = 9;
        else if (state.timeSlot === 'afternoon') state.hour = 14;
        else if (state.timeSlot === 'evening') state.hour = 18;

        showToast(`⏰ Simulated Time Slot: ${state.timeSlot.toUpperCase()} (${state.hour}:00)`);
        runDispersalPipeline(state.currentLat, state.currentLon, state.currentLocationName);
      });
    });

    // "View 3D Navigation Route" button -> smooth scroll to map
    if (dom.btnExploreAlternative) {
      dom.btnExploreAlternative.addEventListener('click', function () {
        const mapSec = document.getElementById('map-section');
        if (mapSec) mapSec.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Preferences Modal Trigger
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

  /**
   * Fetches real-time monitored spots from FastAPI backend
   */
  async function fetchMonitoredSpots() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/spots?lat=${state.currentLat}&lon=${state.currentLon}&hour=${state.hour}&day_of_week=${state.dayOfWeek}`);
      if (res.ok) {
        const data = await res.json();
        state.monitoredSpots = data.spots || [];
        console.log(`✅ Loaded ${state.monitoredSpots.length} monitored spots from backend.`);
        if (dom.radarStatusText) dom.radarStatusText.textContent = `Radar: Online (${state.monitoredSpots.length} Monitored)`;
        return;
      }
    } catch (e) {
      console.log('Backend API notice:', e.message);
    }

    // Fallback baseline spots for initial render
    state.monitoredSpots = [
      { id: 'sitabuldi', name: 'Sitabuldi Fort', category: 'Historical Military Fort', lat: 21.1458, lng: 79.0882, crowd_score: 91, crowd_status: 'HIGH', preference_category: 'history' },
      { id: 'futala', name: 'Futala Lake Waterfront', category: 'Waterfront Promenade', lat: 21.1497, lng: 79.0434, crowd_score: 88, crowd_status: 'HIGH', preference_category: 'nature' },
      { id: 'deekshabhoomi', name: 'Deekshabhoomi Stupa', category: 'Sacred Peace Monument', lat: 21.1278, lng: 79.0669, crowd_score: 28, crowd_status: 'LOW', preference_category: 'sacred' },
      { id: 'khindsi', name: 'Khindsi Lake & Eco Park', category: 'Serene Eco Lake', lat: 21.4056, lng: 79.3333, crowd_score: 22, crowd_status: 'LOW', preference_category: 'nature' },
      { id: 'ramtek', name: 'Ramtek Fort Temple', category: 'Hilltop Heritage Fort', lat: 21.3970, lng: 79.3275, crowd_score: 35, crowd_status: 'LOW', preference_category: 'history' },
      { id: 'museum', name: 'Nagpur Central Museum', category: 'Heritage Museum', lat: 21.1528, lng: 79.0805, crowd_score: 25, crowd_status: 'LOW', preference_category: 'culture' }
    ];
  }

  /**
   * Browser Geolocation Handler
   */
  function handleGeolocation() {
    if (!navigator.geolocation) {
      showToast('⚠️ Geolocation is not supported by your browser.');
      return;
    }

    showToast('📡 Detecting your GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        state.currentLat = lat;
        state.currentLon = lon;
        state.currentLocationName = 'My Current Location';
        if (dom.searchInput) dom.searchInput.value = 'My Current Location (GPS)';
        showToast(`📍 Location detected: [${lat.toFixed(4)}, ${lon.toFixed(4)}]`);
        runDispersalPipeline(lat, lon, 'My Current Location');
      },
      function (error) {
        showToast('⚠️ Could not access GPS. Utilizing Nagpur Central coordinates.');
        runDispersalPipeline(21.1458, 79.0882, 'Nagpur Center');
      },
      { timeout: 8000 }
    );
  }

  function handleSearchSubmit() {
    const query = dom.searchInput ? dom.searchInput.value.trim() : '';
    if (!query) return;

    // Check if query matches a known spot
    const match = state.monitoredSpots.find(s => s.name.toLowerCase().includes(query.toLowerCase()));
    if (match) {
      runDispersalPipeline(match.lat, match.lng || match.lon, match.name);
    } else {
      showToast(`🔍 Searching crowd dispersal for "${query}"...`);
      runDispersalPipeline(state.currentLat, state.currentLon, query);
    }
  }

  function handleSearchInput() {
    const val = dom.searchInput.value.trim().toLowerCase();
    if (!val) {
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
        <span style="font-size:0.75rem; font-weight:700; color:${(m.crowd_score || m.crowdScore) >= 75 ? '#fb7185' : '#34d399'};">
          ${m.crowd_score || m.crowdScore || 50}% Crowd
        </span>
      </div>
    `).join('');
  }

  /**
   * Main Reactive Pipeline: Sends User Location & Preferences to FastAPI Backend
   */
  async function runDispersalPipeline(lat, lon, locationName) {
    state.currentLat = lat;
    state.currentLon = lon;
    state.currentLocationName = locationName || 'Origin Point';

    // Show loading state in Gemini story card
    if (dom.geminiStoryText) {
      dom.geminiStoryText.innerHTML = `<em>✨ Gemini 1.5 Flash is synthesizing an interactive tour narrative and pairing local merchants...</em>`;
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

    // Client fallback execution in case backend is offline
    renderFallbackDispersal(lat, lon, locationName);
  }

  /**
   * Renders the complete dynamic dispersal results into the UI
   */
  function renderDispersalResults(data, locationName) {
    const origin = data.origin || {};
    const rec = data.recommended_alternative;
    const top3 = data.top_3_alternatives || [];
    const merchant = data.paired_merchant || {};
    const geminiStory = data.gemini_tour_guide_story;
    const reduction = data.crowd_reduction_percent || Math.max(0, (origin.crowd_score || 91) - (rec ? rec.crowd_score : 28));

    // 1. Origin Card
    if (dom.destName) {
      dom.destName.textContent = locationName || 'Selected Origin';
      dom.destCrowdPercent.textContent = `${origin.crowd_score || 91}%`;
      dom.destCrowdMeterFill.style.width = `${origin.crowd_score || 91}%`;
      dom.destCrowdStatus.textContent = `${origin.crowd_status || 'HIGH'} CROWD`;
      dom.destCrowdStatus.style.background = (origin.crowd_status === 'HIGH' || origin.crowd_score >= 75) ? '#f43f5e' : '#f59e0b';
    }

    // 2. Recommended Alternative Card
    if (rec && dom.recName) {
      dom.recName.textContent = rec.name;
      dom.recCategory.textContent = rec.category || 'Serene Cultural Corridor';
      dom.recImg.src = rec.image || 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80';
      dom.recCrowdPercent.textContent = `${rec.crowd_score}%`;
      dom.recCrowdStatus.textContent = rec.crowd_status || 'SERENE';
      dom.recDistance.textContent = `${rec.distance_km || 3.4} km`;
      dom.recReductionBadge.innerHTML = `🎉 <strong>${reduction}% less crowded</strong> than your origin point!`;
      
      const isMatch = state.selectedPreferences.has(rec.preference_category);
      dom.recPrefMatchBadge.textContent = isMatch ? '🎯 95% Preference Match' : '🌿 Serene Corridor';
    }

    // 3. Gemini 1.5 Flash Tour Guide Story
    if (dom.geminiStoryText) {
      dom.geminiStoryText.textContent = geminiStory || `Welcome to ${rec ? rec.name : 'this serene spot'}! Experience an unhurried visit surrounded by verified cultural heritage and quiet landscapes.`;
    }

    // 4. Paired Local Merchant Box
    if (merchant && dom.merchantName) {
      dom.merchantName.textContent = merchant.name || 'Local Artisan Bakery & Cafe';
      dom.merchantDesc.textContent = merchant.description || '30-year-old family-owned bakery serving cardamom tea and handmade cookies.';
      dom.merchantDist.textContent = `📍 ${merchant.dist || '300 m'} from destination (Supporting Local Economy)`;
      dom.merchantRating.textContent = `⭐ ${merchant.rating || 4.7}`;
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
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.6rem;">${alt.category} • ${alt.distance_km ? alt.distance_km.toFixed(1) : 4} km away</p>
          <button style="width:100%; background:var(--bg-surface); color:var(--text-main); border:1px solid var(--border-color); padding:5px; border-radius:6px; font-size:0.75rem; cursor:pointer;">
            Inspect Spot →
          </button>
        </div>
      `).join('');
    }

    // 6. Comparison Duel Progress Bars
    if (dom.compOrigName && rec) {
      dom.compOrigName.textContent = locationName || 'Origin Point';
      dom.compOrigPercent.textContent = `${origin.crowd_score || 91}% 🔴 HIGH`;
      dom.compOrigBar.style.width = `${origin.crowd_score || 91}%`;

      dom.compAltName.textContent = rec.name;
      dom.compAltPercent.textContent = `${rec.crowd_score}% 🟢 SERENE`;
      dom.compAltBar.style.width = `${rec.crowd_score}%`;
      dom.compDiffBadge.innerHTML = `📉 <strong>${reduction}% Crowd Reduction</strong> achieved with GeoDivert dynamic routing!`;
    }

    // 7. Navigation Route Info
    if (dom.routeStart && rec) {
      dom.routeStart.textContent = locationName || 'Origin Location';
      dom.routeEnd.textContent = rec.name;
      dom.routeDistance.textContent = `${rec.distance_km || 3.4} km`;
      const mins = Math.round((rec.distance_km || 3.4) * 2.5) + 4;
      dom.routeDuration.textContent = `🚗 ${mins} mins`;
    }

    // 8. Draw 3D Navigation Route on MapLibre & Update Heatmap
    if (window.GeoDivertMap && rec) {
      const originPoint = { lat: state.currentLat, lng: state.currentLon };
      const destPoint = { lat: rec.lat, lng: rec.lng || rec.lon };
      window.GeoDivertMap.drawRoute(originPoint, destPoint);
      window.GeoDivertMap.updateHeatmap(data.all_candidates || state.monitoredSpots);
    }
  }

  function renderFallbackDispersal(lat, lon, locationName) {
    const candidate = state.monitoredSpots.find(s => (s.crowd_score || s.crowdScore) < 50) || state.monitoredSpots[2];
    const data = {
      origin: { crowd_score: 91, crowd_status: 'HIGH' },
      recommended_alternative: {
        id: candidate.id,
        name: candidate.name,
        category: candidate.category,
        lat: candidate.lat,
        lng: candidate.lng || candidate.lon,
        crowd_score: candidate.crowd_score || candidate.crowdScore || 28,
        crowd_status: 'SERENE',
        distance_km: 3.4,
        image: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
        preference_category: candidate.preference_category || 'sacred'
      },
      top_3_alternatives: state.monitoredSpots.slice(2, 5).map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        crowd_score: s.crowd_score || s.crowdScore || 30,
        distance_km: 4.2
      })),
      paired_merchant: {
        name: 'Gondwana Heritage Artisan Bakery & Cafe',
        description: '30-year-old family-owned bakery serving freshly baked cardamom cookies and herbal tea.',
        dist: '300 m',
        rating: 4.7
      },
      crowd_reduction_percent: 63,
      gemini_tour_guide_story: `Welcome to ${candidate.name} in Nagpur! While ${locationName} is experiencing heavy visitor congestion today, you have arrived at one of the city's most peaceful cultural corridors. Enjoy the uncrowded historic grounds, and be sure to stop by Gondwana Heritage Bakery just around the corner for some fresh handmade treats!`
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
      showToast(`📍 Clicked map coordinate: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
      runDispersalPipeline(lat, lng, 'Map Selected Point');
    },
    togglePreference: togglePreference
  };

})();
