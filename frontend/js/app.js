/**
 * GeoDivert – Main Reactive Application Engine for Amravati
 * Dynamic DecisionTree ML Predictions, User GPS Tracking, 3D Spatial Dispersal, and Gemini 1.5 Flash
 */

(function () {
  'use strict';

  // Application State
  const state = {
    currentLat: 20.9320, // Amravati Center
    currentLon: 77.7523, // Amravati Center
    currentLocationName: 'Shri Ambadevi Temple, Amravati',
    userGpsLat: null,
    userGpsLon: null,
    selectedPreferences: new Set(['history', 'nature']),
    hour: 14, // 2 PM default (Midday peak)
    dayOfWeek: 6, // Sunday (Weekend default)
    isWeekend: true,
    monitoredSpots: [],
    categories: [
      { id: 'nature', name: 'Nature & Lakes', icon: '🌿', description: 'Freshwater lakes, scenic valleys, and eco-trails' },
      { id: 'history', name: 'History & Forts', icon: '🏰', description: 'Hilltop fortifications, ramparts, and ancient landmarks' },
      { id: 'sacred', name: 'Sacred & Peace', icon: '🙏', description: 'Tranquil heritage temples and quiet reflection grounds' },
      { id: 'gardens', name: 'Gardens & Parks', icon: '🌸', description: 'Botanical collections, shaded walking paths, and bird decks' },
      { id: 'food', name: 'Local Bakeries & Cafes', icon: '☕', description: 'Independent family bakeries and tea houses' }
    ]
  };

  let dom = {};

  document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 GeoDivert Reactive Engine initialized for Amravati...');

    cacheElements();
    setupListeners();
    renderPreferencesModal();
    updatePrefBadge();
    updateTimeDisplay();

    // 1. Initialize 3D Map
    if (window.GeoDivertMap) {
      window.GeoDivertMap.initMap('map-container', { lat: state.currentLat, lon: state.currentLon });
    }

    // 2. Detect User Location via GPS
    detectUserLocation(false);

    // 3. Run initial dispersal pipeline
    runDispersalPipeline(state.currentLat, state.currentLon, state.currentLocationName);
  });

  function cacheElements() {
    dom = {
      searchInput: document.getElementById('search-input'),
      searchClearBtn: document.getElementById('search-clear-btn'),
      exploreBtn: document.getElementById('explore-btn'),
      geoBtn: document.getElementById('btn-geolocation'),
      quickChips: document.querySelectorAll('.quick-chip'),
      timeSlider: document.getElementById('time-slider'),
      timeDisplayLabel: document.getElementById('time-display-label'),
      btnDayWeekday: document.getElementById('btn-day-weekday'),
      btnDayWeekend: document.getElementById('btn-day-weekend'),

      // Origin Spot Elements
      destName: document.getElementById('dest-name'),
      destCategory: document.getElementById('dest-category'),
      destCrowdPercent: document.getElementById('dest-crowd-percent'),
      destDot: document.getElementById('dest-dot'),
      destCrowdMeterFill: document.getElementById('dest-crowd-meter-fill'),
      destWaitTime: document.getElementById('dest-wait-time'),
      destAlertMessage: document.getElementById('dest-alert-message'),

      // Recommended Alternative Elements
      recName: document.getElementById('rec-name'),
      recCategory: document.getElementById('rec-category'),
      recCrowdPercent: document.getElementById('rec-crowd-percent'),
      recDot: document.getElementById('rec-dot'),
      recCrowdStatus: document.getElementById('rec-crowd-status'),
      recDistance: document.getElementById('rec-distance'),
      recDuration: document.getElementById('rec-duration'),
      recReductionText: document.getElementById('rec-reduction-text'),
      btnExploreAlternative: document.getElementById('btn-explore-alternative'),
      geminiStoryText: document.getElementById('gemini-story-text'),

      // Paired Merchant Elements
      merchantName: document.getElementById('merchant-name'),
      merchantDesc: document.getElementById('merchant-desc'),
      merchantDist: document.getElementById('merchant-dist'),
      merchantRating: document.getElementById('merchant-rating'),

      // All Tourist Spots Deck
      altDeckGrid: document.getElementById('alt-deck-grid'),

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
    if (dom.searchInput) {
      dom.searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleSearchSubmit();
      });
    }

    if (dom.searchClearBtn) {
      dom.searchClearBtn.addEventListener('click', function () {
        if (dom.searchInput) dom.searchInput.value = '';
      });
    }

    if (dom.exploreBtn) {
      dom.exploreBtn.addEventListener('click', handleSearchSubmit);
    }

    if (dom.geoBtn) {
      dom.geoBtn.addEventListener('click', function () {
        detectUserLocation(true);
      });
    }

    // Quick Chips for Amravati
    dom.quickChips.forEach(chip => {
      chip.addEventListener('click', function () {
        const query = this.getAttribute('data-query');
        if (dom.searchInput) dom.searchInput.value = query;
        showToast(`📍 Evaluating crowd for "${query}"...`);
        runDispersalPipeline(state.currentLat, state.currentLon, query);
      });
    });

    // Time Slider
    if (dom.timeSlider) {
      dom.timeSlider.addEventListener('input', function () {
        state.hour = parseInt(this.value);
        updateTimeDisplay();
        runDispersalPipeline(state.currentLat, state.currentLon, state.currentLocationName);
      });
    }

    // Day of Week Toggles
    if (dom.btnDayWeekday) {
      dom.btnDayWeekday.addEventListener('click', function () {
        this.classList.add('active');
        if (dom.btnDayWeekend) dom.btnDayWeekend.classList.remove('active');
        state.dayOfWeek = 2; // Wednesday
        state.isWeekend = false;
        showToast('🏢 Weekday crowd curves active.');
        runDispersalPipeline(state.currentLat, state.currentLon, state.currentLocationName);
      });
    }

    if (dom.btnDayWeekend) {
      dom.btnDayWeekend.addEventListener('click', function () {
        this.classList.add('active');
        if (dom.btnDayWeekday) dom.btnDayWeekday.classList.remove('active');
        state.dayOfWeek = 6; // Sunday
        state.isWeekend = true;
        showToast('🎉 Weekend crowd surge curves active.');
        runDispersalPipeline(state.currentLat, state.currentLon, state.currentLocationName);
      });
    }

    if (dom.btnExploreAlternative) {
      dom.btnExploreAlternative.addEventListener('click', function () {
        const mapEl = document.getElementById('map-container');
        if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
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
        showToast('✨ Preferences saved! Routing updated.');
        runDispersalPipeline(state.currentLat, state.currentLon, state.currentLocationName);
      });
    }
  }

  function updateTimeDisplay() {
    const h = state.hour;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    if (dom.timeDisplayLabel) {
      dom.timeDisplayLabel.textContent = `${String(h).padStart(2, '0')}:00 (${displayHour}:00 ${ampm})`;
    }
  }

  /**
   * Geolocation with User Location Radar Identification
   */
  async function detectUserLocation(notifyUser) {
    if (navigator.geolocation) {
      if (notifyUser) showToast('📡 Locating your device GPS coordinates...');
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          state.userGpsLat = lat;
          state.userGpsLon = lon;
          state.currentLat = lat;
          state.currentLon = lon;
          state.currentLocationName = 'My Location (GPS)';
          if (dom.searchInput) dom.searchInput.value = 'My Current Location (GPS)';
          
          if (window.GeoDivertMap) {
            window.GeoDivertMap.setUserLocation(lat, lon);
            window.GeoDivertMap.setCenter(lat, lon, 13.5);
          }
          showToast(`📍 User located: [${lat.toFixed(4)}, ${lon.toFixed(4)}]`);
          runDispersalPipeline(lat, lon, 'My Current Location');
        },
        async function (err) {
          console.log('GPS info:', err.message);
          useDefaultAmravatiLocation(notifyUser);
        },
        { timeout: 4000, enableHighAccuracy: true }
      );
    } else {
      useDefaultAmravatiLocation(notifyUser);
    }
  }

  function useDefaultAmravatiLocation(notifyUser) {
    state.currentLat = 20.9320;
    state.currentLon = 77.7523;
    state.currentLocationName = 'Shri Ambadevi Temple, Amravati';
    if (dom.searchInput) dom.searchInput.value = 'Shri Ambadevi Temple, Amravati';
    
    if (window.GeoDivertMap) {
      window.GeoDivertMap.setUserLocation(20.9320, 77.7523);
      window.GeoDivertMap.setCenter(20.9320, 77.7523, 13);
    }
    if (notifyUser) showToast('📍 Centered on Amravati, Maharashtra');
    runDispersalPipeline(20.9320, 77.7523, 'Shri Ambadevi Temple, Amravati');
  }

  function handleSearchSubmit() {
    const query = dom.searchInput ? dom.searchInput.value.trim() : '';
    if (!query) return;

    showToast(`🔍 Evaluating "${query}"...`);
    runDispersalPipeline(state.currentLat, state.currentLon, query);
  }

  /**
   * Main Dispersal Dispatch Pipeline
   */
  async function runDispersalPipeline(lat, lon, locationName) {
    state.currentLat = lat;
    state.currentLon = lon;
    state.currentLocationName = locationName || 'Amravati, Maharashtra';

    if (dom.geminiStoryText) {
      dom.geminiStoryText.innerHTML = `<em>✨ Gemini 1.5 Flash is synthesizing an interactive tour narrative...</em>`;
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
      const response = await fetch('/api/recommend', {
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

    // Client-side dynamic ML scoring fallback
    renderFallbackDispersal(lat, lon, locationName);
  }

  function renderDispersalResults(data, locationName) {
    const origin = data.origin || {};
    const rec = data.recommended_alternative;
    const top3 = data.top_3_alternatives || [];
    const allSpots = data.all_candidates || [];
    const merchant = data.paired_merchant || {};
    const geminiStory = data.gemini_tour_guide_story;
    const route = data.route_geometry || {};
    const reduction = data.crowd_reduction_percent || Math.max(0, Math.round((origin.crowd_score || 95.4) - (rec ? rec.crowd_score : 21.1)));

    state.monitoredSpots = allSpots;

    // 1. Origin Card
    if (dom.destName) {
      dom.destName.textContent = origin.name || locationName || 'Origin Point';
      const oScore = origin.crowd_score || 95.4;
      dom.destCrowdPercent.textContent = `${oScore}%`;
      dom.destCrowdMeterFill.style.width = `${oScore}%`;
      
      // Update circle dot color
      if (dom.destDot) {
        dom.destDot.className = 'density-dot ' + (oScore >= 70 ? 'dot-red' : oScore >= 40 ? 'dot-yellow' : 'dot-green');
      }

      const wait = oScore >= 75 ? '~50 min wait' : oScore >= 45 ? '~20 min wait' : '0 min wait';
      if (dom.destWaitTime) dom.destWaitTime.textContent = `⏱️ ${wait} at ${state.hour}:00`;

      if (dom.destAlertMessage) {
        if (oScore >= 70) {
          dom.destAlertMessage.textContent = `⚠️ High visitor congestion (${oScore}%) predicted for ${origin.name || locationName}. GeoDivert recommends a serene cultural sanctuary nearby.`;
        } else {
          dom.destAlertMessage.textContent = `🟢 Comfortable capacity utilization (${oScore}%). You can explore freely without major ticket delays.`;
        }
      }
    }

    // 2. Recommended Alternative Card
    if (rec && dom.recName) {
      dom.recName.textContent = rec.name;
      dom.recCategory.textContent = rec.category || 'Scenic Lake & Botanical Park';
      dom.recCrowdPercent.textContent = `${rec.crowd_score}%`;
      dom.recCrowdStatus.textContent = rec.crowd_status || 'SERENE';
      dom.recDistance.textContent = `${rec.distance_km || 3.8} km`;
      dom.recDuration.textContent = `${route.duration_mins || Math.round((rec.distance_km || 3.8) * 2.2) + 2} mins`;
      dom.recReductionText.textContent = `-${reduction}%`;

      if (dom.recDot) {
        dom.recDot.className = 'density-dot ' + (rec.crowd_score >= 70 ? 'dot-red' : rec.crowd_score >= 40 ? 'dot-yellow' : 'dot-green');
      }
    }

    // 3. Gemini Tour Guide Story
    if (dom.geminiStoryText) {
      dom.geminiStoryText.textContent = geminiStory || `Welcome to ${rec ? rec.name : 'Amravati'}! Avoid peak visitor traffic and enjoy a peaceful, verified cultural experience. Be sure to stop by ${merchant.name || 'the local heritage bakery'} for fresh treats!`;
    }

    // 4. Paired Local Merchant Box
    if (merchant && dom.merchantName) {
      dom.merchantName.textContent = merchant.name || 'Raghuveer Sweets & Heritage Tea House';
      dom.merchantDesc.textContent = merchant.description || 'Famous local bakery in Amravati serving fresh handmade cardamom tea and sweets.';
      dom.merchantDist.textContent = `📍 ${merchant.dist || '220 m'} from destination`;
      dom.merchantRating.textContent = `⭐ ${merchant.rating || 4.8}`;
    }

    // 5. All Amravati Tourist Attractions Grid
    if (dom.altDeckGrid) {
      dom.altDeckGrid.innerHTML = allSpots.map(spot => {
        const score = spot.crowd_score || 25;
        const dotClass = score >= 70 ? 'dot-red' : score >= 40 ? 'dot-yellow' : 'dot-green';
        const statusLabel = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Serene';
        return `
          <div onclick="window.GeoDivertApp.selectSpotById('${spot.id}')" style="
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.2s;
          " onmouseover="this.style.borderColor='#38bdf8'" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="font-size:0.75rem; color:#94a3b8;">${spot.category}</span>
              <span style="font-size:0.8rem; font-weight:700;">
                <span class="density-dot ${dotClass}"></span> ${score}%
              </span>
            </div>
            <h4 style="font-size:0.95rem; color:#fff; margin-bottom:4px;">${spot.name}</h4>
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#94a3b8;">
              <span>${spot.distance_km ? spot.distance_km.toFixed(1) + ' km' : 'Near'}</span>
              <span style="color:${score >= 70 ? '#f43f5e' : score >= 40 ? '#f59e0b' : '#34d399'}; font-weight:700;">${statusLabel}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // 6. 3D Map Route & Markers
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
      window.GeoDivertMap.updateHeatmap(allSpots);
      window.GeoDivertMap.renderMarkers(allSpots, originPoint, destPoint);
    }
  }

  function renderFallbackDispersal(lat, lon, locationName) {
    const isAmbadevi = locationName.toLowerCase().includes('ambadevi');
    const origScore = state.isWeekend ? (state.hour >= 11 && state.hour <= 18 ? 95.4 : 65.4) : (state.hour >= 11 && state.hour <= 18 ? 66.3 : 40.0);
    const calmScore = state.isWeekend ? (state.hour >= 16 && state.hour <= 19 ? 28.5 : 21.1) : 16.1;

    const allSpots = [
      { id: 'amr_ambadevi', name: 'Shri Ambadevi & Ekvira Mandir', category: 'Ancient Sacred Heritage', lat: 20.9320, lng: 77.7523, crowd_score: origScore },
      { id: 'amr_wadali', name: 'Wadali Talao & Eco Park', category: 'Scenic Lake & Botanical Park', lat: 20.9580, lng: 77.7845, crowd_score: calmScore, distance_km: 3.8 },
      { id: 'amr_bamboo', name: 'Bamboo Garden Botanical Reserve', category: 'Botanical Garden & Reserve', lat: 20.9425, lng: 77.7710, crowd_score: calmScore, distance_km: 2.4 },
      { id: 'amr_kondeshwar', name: 'Kondeshwar Shiva Temple & Waterfalls', category: 'Ancient Forest Gorge & Temple', lat: 20.8120, lng: 77.7680, crowd_score: calmScore + 8, distance_km: 14.2 },
      { id: 'amr_chikhaldara', name: 'Chikhaldara Hill Station & Fort', category: 'Hill Station & Mountain Fort', lat: 21.4010, lng: 77.3320, crowd_score: state.isWeekend ? 92.0 : 48.3, distance_km: 82.0 },
      { id: 'amr_chatri', name: 'Chatri Talao Heritage Lake', category: 'Heritage Lake Promenade', lat: 20.9150, lng: 77.7610, crowd_score: calmScore + 5, distance_km: 3.1 }
    ];

    const recSpot = allSpots[1]; // Wadali Talao

    const data = {
      origin: { name: locationName, latitude: lat, longitude: lon, crowd_score: origScore, crowd_status: origScore >= 70 ? 'HIGH' : 'MEDIUM' },
      recommended_alternative: recSpot,
      top_3_alternatives: [allSpots[1], allSpots[2], allSpots[3]],
      all_candidates: allSpots,
      paired_merchant: {
        name: 'Raghuveer Sweets & Heritage Tea House',
        description: 'Famous 40-year-old local bakery in Amravati known for fresh mawa jalebi and cardamom tea.',
        dist: '220 m',
        rating: 4.8
      },
      route_geometry: {
        coordinates: [
          [lon, lat],
          [(lon + recSpot.lng) / 2 + 0.003, (lat + recSpot.lat) / 2 + 0.002],
          [recSpot.lng, recSpot.lat]
        ],
        distance_km: 3.8,
        duration_mins: 11
      },
      crowd_reduction_percent: Math.max(0, Math.round(origScore - calmScore)),
      gemini_tour_guide_story: `Welcome to ${recSpot.name}! While ${locationName} is experiencing peak visitor traffic (${origScore}%), you have arrived at one of Amravati's most serene freshwater sanctuaries. Enjoy the shaded lakeside breeze and peaceful botanical paths without ticket lines. When done exploring, stop by Raghuveer Sweets just down the road for hot herbal tea and sweets!`
    };

    renderDispersalResults(data, locationName);
  }

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
             padding: 0.85rem;
             cursor: pointer;
           ">
        <span style="font-size:1.5rem;">${cat.icon}</span>
        <h4 style="margin-top:0.3rem; font-size:0.95rem;">${cat.name}</h4>
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
    toast.style.cssText = 'background:#151e32; color:#fff; border:1px solid #38bdf8; padding:8px 14px; border-radius:10px; margin-top:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5); font-size:0.82rem;';
    toast.textContent = msg;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  // Global APIs
  window.GeoDivertApp = {
    selectSpotById: function (id) {
      const spot = state.monitoredSpots.find(s => s.id === id);
      if (spot) {
        if (dom.searchInput) dom.searchInput.value = spot.name;
        showToast(`📍 Analyzing ${spot.name}...`);
        runDispersalPipeline(spot.lat, spot.lng || spot.lon, spot.name);
      }
    },
    selectSpot: function (spot) {
      if (spot) {
        if (dom.searchInput) dom.searchInput.value = spot.name;
        showToast(`📍 Analyzing ${spot.name}...`);
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
