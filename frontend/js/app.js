/**
 * GeoDivert – Main Interactive Web Application Engine
 * Orchestrates Frontend UI, 3D MapLibre, FastAPI Dispersal Engine, OpenTripMap POIs, and Gemini 1.5 Flash
 */

(function () {
  'use strict';

  const BACKEND_API_URL = 'http://127.0.0.1:8000';

  // Application State
  const state = {
    selectedDestination: null,
    recommendedAlternative: null,
    topAlternatives: [],
    selectedPreferences: new Set(['history', 'nature']),
    timeSlot: 'afternoon', // 'morning' (9 AM), 'afternoon' (2 PM), 'evening' (6 PM)
    hour: 14,
    dayOfWeek: 6, // Sunday / Weekend default
    isGovAdminMode: false,
    destinations: [],
    categories: []
  };

  // Cached DOM references
  let dom = {};

  document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 GeoDivert Application Initializing...');

    // Load initial dataset from data.js
    if (window.GEODIVERT_DATA) {
      state.destinations = JSON.parse(JSON.stringify(window.GEODIVERT_DATA.destinations));
      state.categories = window.GEODIVERT_DATA.preferenceCategories;
    }

    cacheDOMElements();
    setupEventListeners();
    renderPreferencesModalGrid();
    renderFeaturedDestinationsGrid();
    renderAdminTable();
    updateNavPrefBadge();

    // Default select first high crowd destination (e.g. Futala Lake or Shaniwar Wada)
    const initialSpot = state.destinations.find(d => d.crowdStatus === 'HIGH') || state.destinations[0];
    if (initialSpot) {
      selectDestination(initialSpot.id);
    }

    // Initialize 3D MapLibre Engine
    if (window.GeoDivertMap) {
      window.GeoDivertMap.initMap('map-container', state.destinations);
    }
  });

  /**
   * Caches all interactive DOM elements
   */
  function cacheDOMElements() {
    dom = {
      searchInput: document.getElementById('search-input'),
      searchClearBtn: document.getElementById('search-clear-btn'),
      exploreBtn: document.getElementById('explore-btn'),
      autocompleteDropdown: document.getElementById('autocomplete-dropdown'),
      quickChips: document.querySelectorAll('.quick-chip'),
      featuredGrid: document.querySelector('.featured-grid'),
      resultsSection: document.getElementById('results-section'),

      // Selected Destination Elements
      destImg: document.getElementById('dest-image'),
      destName: document.getElementById('dest-name'),
      destCategory: document.getElementById('dest-category'),
      destLocation: document.getElementById('dest-location'),
      destCrowdPercent: document.getElementById('dest-crowd-percent'),
      destCrowdMeterFill: document.getElementById('dest-crowd-meter-fill'),
      destCrowdStatus: document.getElementById('dest-crowd-status'),
      destRating: document.getElementById('dest-rating'),
      destWaitTime: document.getElementById('dest-wait-time'),
      destPeakHours: document.getElementById('dest-peak-hours'),

      // Recommended Destination Elements
      recImg: document.getElementById('rec-image'),
      recName: document.getElementById('rec-name'),
      recCategory: document.getElementById('rec-category'),
      recCrowdPercent: document.getElementById('rec-crowd-percent'),
      recCrowdStatus: document.getElementById('rec-crowd-status'),
      recRating: document.getElementById('rec-rating'),
      recDistance: document.getElementById('rec-distance'),
      recReductionBadge: document.getElementById('rec-reduction-badge'),
      recReasonsList: document.getElementById('rec-reasons-list'),
      recPrefMatchBadge: document.getElementById('rec-pref-match-badge'),
      geminiStoryText: document.getElementById('gemini-story-text'),
      btnExploreAlternative: document.getElementById('btn-explore-alternative'),

      // Alternatives Deck & Comparison
      altDeckGrid: document.getElementById('alt-deck-grid'),
      compOrigName: document.getElementById('comp-orig-name'),
      compOrigPercent: document.getElementById('comp-orig-percent'),
      compOrigBar: document.getElementById('comp-orig-bar'),
      compAltName: document.getElementById('comp-alt-name'),
      compAltPercent: document.getElementById('comp-alt-percent'),
      compAltBar: document.getElementById('comp-alt-bar'),
      compDiffBadge: document.getElementById('comp-diff-badge'),

      // Navigation Route Info
      routeStart: document.getElementById('route-start'),
      routeEnd: document.getElementById('route-end'),
      routeDistance: document.getElementById('route-distance'),
      routeDuration: document.getElementById('route-duration'),
      timeSlotBtns: document.querySelectorAll('.time-slot-btn'),

      // Hospitality Grid & Tabs
      hospitalityGrid: document.getElementById('hospitality-cards-grid'),
      hospFilterTabs: document.querySelectorAll('.hosp-filter-tab'),

      // Preferences Modal
      prefModal: document.getElementById('preferences-modal'),
      prefModalCloseBtn: document.getElementById('pref-modal-close-btn'),
      navPrefBtn: document.getElementById('nav-pref-btn'),
      navPrefCount: document.getElementById('nav-pref-count'),
      prefGrid: document.getElementById('pref-categories-grid'),
      prefClearBtn: document.getElementById('pref-clear-btn'),
      prefSaveBtn: document.getElementById('pref-save-btn'),
      prefCountIndicator: document.getElementById('pref-count-indicator'),

      // Admin Dashboard
      modeToggleBtn: document.getElementById('mode-toggle-btn'),
      touristViewContainer: document.getElementById('tourist-view-container'),
      adminDashboardContainer: document.getElementById('admin-dashboard-container'),
      adminTableBody: document.getElementById('admin-dest-table-body'),
      toastContainer: document.getElementById('toast-container')
    };
  }

  /**
   * Sets up all click and interaction listeners
   */
  function setupEventListeners() {
    // Search input typing & enter key
    if (dom.searchInput) {
      dom.searchInput.addEventListener('input', handleSearchInput);
      dom.searchInput.addEventListener('focus', handleSearchInput);
      dom.searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          triggerSearch();
        }
      });
    }

    if (dom.searchClearBtn) {
      dom.searchClearBtn.addEventListener('click', function () {
        if (dom.searchInput) dom.searchInput.value = '';
        if (dom.autocompleteDropdown) dom.autocompleteDropdown.innerHTML = '';
      });
    }

    if (dom.exploreBtn) {
      dom.exploreBtn.addEventListener('click', triggerSearch);
    }

    // Quick hotspot chip buttons
    dom.quickChips.forEach(chip => {
      chip.addEventListener('click', function () {
        const query = this.getAttribute('data-query');
        if (dom.searchInput) dom.searchInput.value = query;
        const matched = findDestinationByQuery(query);
        if (matched) {
          selectDestination(matched.id);
          showToast(`⚡ Inspecting crowd congestion for ${matched.name}...`);
        }
      });
    });

    // Time Slot Selector buttons (Morning, Afternoon, Evening)
    dom.timeSlotBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        dom.timeSlotBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        state.timeSlot = this.getAttribute('data-time');
        
        if (state.timeSlot === 'morning') state.hour = 9;
        else if (state.timeSlot === 'afternoon') state.hour = 14;
        else if (state.timeSlot === 'evening') state.hour = 18;

        showToast(`⏰ Simulated Time Slot: ${state.timeSlot.toUpperCase()} (${state.hour}:00)`);
        recalculateDispersal();
      });
    });

    // "Explore This Alternative" button -> scroll to 3D map & route
    if (dom.btnExploreAlternative) {
      dom.btnExploreAlternative.addEventListener('click', function () {
        const mapSec = document.getElementById('map-section');
        if (mapSec) mapSec.scrollIntoView({ behavior: 'smooth' });
        showToast(`🗺️ Navigating to ${state.recommendedAlternative ? state.recommendedAlternative.name : 'Alternative'} via 3D Map`);
      });
    }

    // Preferences Modal Events
    if (dom.navPrefBtn) dom.navPrefBtn.addEventListener('click', () => toggleModal(dom.prefModal, true));
    if (dom.prefModalCloseBtn) dom.prefModalCloseBtn.addEventListener('click', () => toggleModal(dom.prefModal, false));
    
    // Close modal when clicking on backdrop
    if (dom.prefModal) {
      dom.prefModal.addEventListener('click', function (e) {
        if (e.target === dom.prefModal) toggleModal(dom.prefModal, false);
      });
    }

    if (dom.prefClearBtn) {
      dom.prefClearBtn.addEventListener('click', function () {
        state.selectedPreferences.clear();
        updatePrefModalSelectionUI();
      });
    }

    if (dom.prefSaveBtn) {
      dom.prefSaveBtn.addEventListener('click', function () {
        toggleModal(dom.prefModal, false);
        updateNavPrefBadge();
        recalculateDispersal();
        showToast(`✨ Preferences saved! Spatial Dispersal recalibrated.`);
      });
    }

    // Hospitality Category Filter Tabs
    dom.hospFilterTabs.forEach(tab => {
      tab.addEventListener('click', function () {
        dom.hospFilterTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const filter = this.getAttribute('data-filter');
        renderHospitalityGrid(state.recommendedAlternative, filter);
      });
    });

    // Admin Command Center / Tourist View Mode Toggle
    if (dom.modeToggleBtn) {
      dom.modeToggleBtn.addEventListener('click', function () {
        state.isGovAdminMode = !state.isGovAdminMode;
        if (state.isGovAdminMode) {
          dom.touristViewContainer.classList.add('hidden');
          dom.adminDashboardContainer.classList.remove('hidden');
          this.innerHTML = `<span>🧭 Switch to Tourist View</span>`;
          showToast(`🏛️ Command Center Active: Live Municipal Crowd Surveillance`);
        } else {
          dom.adminDashboardContainer.classList.add('hidden');
          dom.touristViewContainer.classList.remove('hidden');
          this.innerHTML = `<span>🏛️ Switch to Gov Admin</span>`;
        }
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
      if (dom.searchInput && !dom.searchInput.contains(e.target) && dom.autocompleteDropdown && !dom.autocompleteDropdown.contains(e.target)) {
        dom.autocompleteDropdown.innerHTML = '';
      }
    });
  }

  function triggerSearch() {
    const query = dom.searchInput ? dom.searchInput.value.trim() : '';
    if (!query) return;
    const matched = findDestinationByQuery(query);
    if (matched) {
      selectDestination(matched.id);
      showToast(`📍 Analyzing crowd for "${matched.name}"...`);
    } else {
      showToast(`Searching live POIs for "${query}"...`);
    }
  }

  function findDestinationByQuery(query) {
    const q = query.toLowerCase();
    return state.destinations.find(d => 
      d.name.toLowerCase().includes(q) || 
      d.category.toLowerCase().includes(q) || 
      d.city.toLowerCase().includes(q)
    );
  }

  /**
   * Main Selection Workflow
   */
  function selectDestination(destId) {
    const selected = state.destinations.find(d => d.id === destId);
    if (!selected) return;

    state.selectedDestination = selected;

    // Reveal Results Section
    if (dom.resultsSection) dom.resultsSection.classList.remove('hidden');

    // Render Origin Card
    renderSelectedDestCard(selected);

    // Run Dispersal Algorithm (via FastAPI Backend with client fallback)
    recalculateDispersal();
  }

  /**
   * Orchestrates the Dispersal Engine:
   * 1. Calls FastAPI /api/recommend endpoint
   * 2. Runs Scikit-Learn ML Model + OpenTripMap + Gemini 1.5 Flash
   * 3. Falls back smoothly if offline
   */
  async function recalculateDispersal() {
    const orig = state.selectedDestination;
    if (!orig) return;

    // Show loading text in Gemini card
    if (dom.geminiStoryText) {
      dom.geminiStoryText.innerHTML = `<em>✨ Gemini 1.5 Flash is synthesizing an interactive tour guide story & pairing local merchants...</em>`;
    }

    const payload = {
      latitude: orig.lat,
      longitude: orig.lng,
      hour: state.hour,
      day_of_week: state.dayOfWeek,
      preferences: Array.from(state.selectedPreferences),
      selected_spot_name: orig.name
    };

    try {
      const response = await fetch(`${BACKEND_API_URL}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ FastAPI Dispersal Engine Response:', data);

        if (data.recommended_alternative) {
          const rec = data.recommended_alternative;
          state.recommendedAlternative = {
            id: rec.id,
            name: rec.name,
            category: rec.category,
            city: rec.city,
            lat: rec.lat,
            lng: rec.lng,
            crowdScore: rec.crowd_score,
            crowdStatus: rec.crowd_status,
            rating: 4.6,
            computedDist: rec.distance_km,
            image: rec.image,
            description: rec.description,
            culturalValue: rec.cultural_value,
            preferenceCategory: rec.preference_category,
            pairedMerchant: data.paired_merchant
          };

          state.topAlternatives = (data.top_3_alternatives || []).map(alt => ({
            id: alt.id,
            name: alt.name,
            category: alt.category,
            city: alt.city,
            lat: alt.lat,
            lng: alt.lng,
            crowdScore: alt.crowd_score,
            crowdStatus: alt.crowd_status,
            computedDist: alt.distance_km,
            image: alt.image,
            description: alt.description
          }));

          renderAllResults(orig, state.recommendedAlternative, state.topAlternatives, data.gemini_tour_guide_story, data.paired_merchant);
          return;
        }
      }
    } catch (err) {
      console.log('⚠️ FastAPI backend offline or connecting. Using client dispersal engine:', err.message);
    }

    // Client-side Fallback Execution
    runClientSideDispersal(orig);
  }

  function runClientSideDispersal(orig) {
    let candidates = state.destinations.filter(d => d.id !== orig.id);

    candidates.forEach(cand => {
      const dist = calculateDistance(orig.lat, orig.lng, cand.lat, cand.lng);
      cand.computedDist = dist;

      const isPrefMatch = state.selectedPreferences.has(cand.preferenceCategory);
      cand.prefMatchBonus = isPrefMatch ? 0.35 : 0.0;

      // Dispersal Math: min F(x) = 0.3*(dist/10) + 0.5*(crowd/100) - 0.2*cultural - prefMatch
      const score = (0.3 * (dist / 10)) + (0.5 * (cand.crowdScore / 100)) - (0.2 * (cand.culturalValue || 0.8)) - cand.prefMatchBonus;
      cand.dispersalScore = score;
    });

    candidates.sort((a, b) => a.dispersalScore - b.dispersalScore);

    state.recommendedAlternative = candidates[0];
    state.topAlternatives = candidates.slice(0, 3);

    const pairedMerchant = {
      name: `${state.recommendedAlternative.name} Heritage Tea & Bakery`,
      type: 'restaurant',
      rating: 4.7,
      dist: '300 m',
      description: '30-year-old family-owned artisan bakery serving hot cardamom tea and fresh handmade cookies.'
    };

    const fallbackStory = `Welcome to ${state.recommendedAlternative.name} in Nagpur! While ${orig.name} is currently experiencing heavy crowd congestion (${orig.crowdScore}%), you have arrived at one of the city's most serene cultural treasures. ${state.recommendedAlternative.description} Enjoy the peaceful surroundings without ticket queues or traffic delays. When you are done exploring, be sure to stop by ${pairedMerchant.name} just around the corner to support the local family bakery!`;

    renderAllResults(orig, state.recommendedAlternative, state.topAlternatives, fallbackStory, pairedMerchant);
  }

  function renderAllResults(orig, rec, top3, geminiStory, pairedMerchant) {
    renderRecommendationCard(rec, orig, geminiStory);
    renderTop3AlternativesDeck(top3);
    renderComparisonDuel(orig, rec);
    renderRouteInfo(orig, rec);
    renderHospitalityGrid(rec, 'all', pairedMerchant);

    // Update 3D Map
    if (window.GeoDivertMap) {
      window.GeoDivertMap.drawRoute(orig, rec);
    }
  }

  // --- RENDERING MODULES ---

  function renderSelectedDestCard(dest) {
    if (!dom.destName) return;
    dom.destImg.src = dest.image;
    dom.destName.textContent = dest.name;
    dom.destCategory.textContent = dest.category;
    dom.destLocation.textContent = `${dest.city || 'Nagpur'}, India`;
    dom.destCrowdPercent.textContent = `${dest.crowdScore}%`;
    dom.destCrowdMeterFill.style.width = `${dest.crowdScore}%`;

    dom.destCrowdStatus.textContent = `${dest.crowdStatus} CROWD`;
    dom.destCrowdStatus.style.background = dest.crowdStatus === 'HIGH' ? '#f43f5e' : dest.crowdStatus === 'MEDIUM' ? '#f59e0b' : '#10b981';

    dom.destRating.textContent = `⭐ ${dest.rating || 4.4} (${dest.reviewCount || '25k'})`;
    dom.destWaitTime.textContent = `⏱️ ${dest.waitTime || '~50 min wait'}`;
    dom.destPeakHours.textContent = `⏰ Peak: ${dest.peakHours || '11 AM - 5 PM'}`;
  }

  function renderRecommendationCard(rec, orig, geminiStory) {
    if (!dom.recName || !rec) return;
    dom.recImg.src = rec.image;
    dom.recName.textContent = rec.name;
    dom.recCategory.textContent = rec.category;
    dom.recCrowdPercent.textContent = `${rec.crowdScore}%`;
    dom.recRating.textContent = `⭐ ${rec.rating || 4.7}`;
    dom.recDistance.textContent = `${rec.computedDist ? rec.computedDist.toFixed(1) : 5.2} km`;

    const reduction = Math.max(0, orig.crowdScore - rec.crowdScore);
    dom.recReductionBadge.innerHTML = `🎉 <strong>${reduction}% less crowded</strong> than ${orig.name}`;

    const isMatch = state.selectedPreferences.has(rec.preferenceCategory);
    dom.recPrefMatchBadge.textContent = isMatch ? `🎯 95% Preference Match` : `🌿 Serene Corridor`;

    dom.recReasonsList.innerHTML = `
      <li>🟢 <strong>Zero Congestion:</strong> Only ${rec.crowdScore}% capacity utilized right now.</li>
      <li>⏱️ <strong>Save ~45 mins:</strong> Skip long security queues and bumper-to-bumper traffic.</li>
      <li>🌿 <strong>Cultural Value:</strong> Verified high-rated cultural landmark in Nagpur.</li>
    `;

    // Render Gemini 1.5 Flash Tour Guide Story
    if (dom.geminiStoryText) {
      dom.geminiStoryText.textContent = geminiStory || `Welcome to ${rec.name}! Experience a peaceful, uncrowded visit surrounded by authentic heritage and nature.`;
    }
  }

  function renderTop3AlternativesDeck(top3) {
    if (!dom.altDeckGrid) return;
    dom.altDeckGrid.innerHTML = (top3 || []).map((alt, i) => `
      <div class="alt-deck-card" onclick="window.GeoDivertApp.selectDestination('${alt.id}')" style="
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 1rem;
        cursor: pointer;
        transition: var(--transition);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <span style="font-size:0.75rem; font-weight:700; color:var(--primary); background:rgba(56,189,248,0.1); padding:3px 8px; border-radius:12px;">Rank #${i+1} Alternative</span>
          <span style="font-size:0.8rem; color:#34d399; font-weight:700;">🟢 ${alt.crowdScore}% Crowd</span>
        </div>
        <h4 style="font-size:1.05rem; margin-bottom:0.25rem;">${alt.name}</h4>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.75rem;">${alt.category} • ${alt.computedDist ? alt.computedDist.toFixed(1) : 4} km away</p>
        <button style="width:100%; background:var(--bg-surface); color:var(--text-main); border:1px solid var(--border-color); padding:6px; border-radius:8px; font-size:0.8rem; cursor:pointer;">
          Inspect This Spot →
        </button>
      </div>
    `).join('');
  }

  function renderComparisonDuel(orig, alt) {
    if (!dom.compOrigName || !alt) return;
    dom.compOrigName.textContent = orig.name;
    dom.compOrigPercent.textContent = `${orig.crowdScore}% 🔴 HIGH`;
    dom.compOrigBar.style.width = `${orig.crowdScore}%`;

    dom.compAltName.textContent = alt.name;
    dom.compAltPercent.textContent = `${alt.crowdScore}% 🟢 LOW`;
    dom.compAltBar.style.width = `${alt.crowdScore}%`;

    const diff = orig.crowdScore - alt.crowdScore;
    dom.compDiffBadge.innerHTML = `📉 <strong>${diff}% Crowd Reduction</strong> achieved with GeoDivert dynamic routing!`;
  }

  function renderRouteInfo(orig, alt) {
    if (!dom.routeStart || !alt) return;
    dom.routeStart.textContent = orig.name;
    dom.routeEnd.textContent = alt.name;
    dom.routeDistance.textContent = `${alt.computedDist ? alt.computedDist.toFixed(1) : 5.2} km`;
    
    const driveMins = Math.round((alt.computedDist || 5) * 2.5) + 4;
    dom.routeDuration.textContent = `🚗 ${driveMins} mins`;
  }

  function renderHospitalityGrid(dest, filter, pairedMerchant) {
    if (!dom.hospitalityGrid || !dest) return;

    let items = dest.hospitality ? [...dest.hospitality] : [];
    
    if (pairedMerchant && pairedMerchant.name) {
      items.unshift(pairedMerchant);
    }

    if (items.length === 0) {
      items = [
        { name: `${dest.name} Artisan Cafe`, type: 'restaurant', rating: 4.7, dist: '0.2 km', desc: 'Family-owned cafe serving traditional tea and snacks.' },
        { name: 'Nagpur Handloom Souvenirs', type: 'experience', rating: 4.8, dist: '0.4 km', desc: 'Handcrafted items supporting rural artisans.' }
      ];
    }

    if (filter !== 'all') {
      items = items.filter(h => (h.type || 'restaurant') === filter);
    }

    dom.hospitalityGrid.innerHTML = items.map(h => `
      <div class="hosp-card" style="
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 1.25rem;
      ">
        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
          <span style="font-size:0.8rem; color:var(--primary); font-weight:600;">${(h.type || 'restaurant').toUpperCase()}</span>
          <span style="font-size:0.85rem; color:#fbbf24; font-weight:700;">⭐ ${h.rating || 4.6}</span>
        </div>
        <h4 style="font-size:1.1rem; margin-bottom:0.4rem;">${h.name}</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem;">${h.description || h.desc || 'Local independent merchant near destination'}</p>
        <span style="font-size:0.8rem; color:#34d399; font-weight:600;">📍 ${h.dist || '300 m'} away from serene spot</span>
      </div>
    `).join('');
  }

  function renderFeaturedDestinationsGrid() {
    if (!dom.featuredGrid) return;
    dom.featuredGrid.innerHTML = state.destinations.slice(0, 6).map(dest => `
      <div class="dest-card" onclick="window.GeoDivertApp.selectDestination('${dest.id}')" style="cursor:pointer;">
        <div class="dest-card-banner">
          <img src="${dest.image}" alt="${dest.name}" />
          <div class="crowd-status-pill" style="background:${dest.crowdStatus === 'HIGH' ? '#f43f5e' : dest.crowdStatus === 'MEDIUM' ? '#f59e0b' : '#10b981'};">
            ${dest.crowdStatus} (${dest.crowdScore}%)
          </div>
        </div>
        <div class="dest-card-body">
          <h3>${dest.name}</h3>
          <p style="font-size:0.85rem; color:var(--text-muted);">${dest.category} • ${dest.city}</p>
        </div>
      </div>
    `).join('');
  }

  function renderPreferencesModalGrid() {
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

  function renderAdminTable() {
    if (!dom.adminTableBody) return;
    dom.adminTableBody.innerHTML = state.destinations.map(dest => `
      <tr>
        <td><strong>${dest.name}</strong> (${dest.city})</td>
        <td>
          <span style="color:${dest.crowdStatus === 'HIGH' ? '#fb7185' : '#34d399'}; font-weight:700;">
            ${dest.crowdScore}% ${dest.crowdStatus}
          </span>
        </td>
        <td>${Math.round(dest.crowdScore * 40)} / 4,000 visitors</td>
        <td>${dest.crowdStatus === 'HIGH' ? '⚠️ Dispersal Active' : '🟢 Optimal Capacity'}</td>
        <td>
          <button onclick="window.GeoDivertApp.simulateSurge('${dest.id}')" style="
            background: var(--primary-dark);
            color: #fff;
            border: none;
            padding: 4px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.75rem;
          ">
            Toggle Surge
          </button>
        </td>
      </tr>
    `).join('');
  }

  function togglePreference(catId) {
    if (state.selectedPreferences.has(catId)) {
      state.selectedPreferences.delete(catId);
    } else {
      state.selectedPreferences.add(catId);
    }
    updatePrefModalSelectionUI();
  }

  function updatePrefModalSelectionUI() {
    renderPreferencesModalGrid();
    if (dom.prefCountIndicator) {
      dom.prefCountIndicator.textContent = `${state.selectedPreferences.size} categories selected`;
    }
  }

  function updateNavPrefBadge() {
    if (dom.navPrefCount) {
      dom.navPrefCount.textContent = state.selectedPreferences.size > 0 ? `${state.selectedPreferences.size} Active` : 'Set';
    }
  }

  function handleSearchInput() {
    const val = dom.searchInput.value.trim().toLowerCase();
    if (!val) {
      dom.autocompleteDropdown.innerHTML = '';
      return;
    }

    const matches = state.destinations.filter(d => 
      d.name.toLowerCase().includes(val) || 
      d.category.toLowerCase().includes(val)
    );

    dom.autocompleteDropdown.innerHTML = matches.map(m => `
      <div onclick="window.GeoDivertApp.selectDestination('${m.id}')" style="
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid var(--border-color);
        color: #fff;
      ">
        <strong>${m.name}</strong> <span style="font-size:0.8rem; color:#94a3b8;">(${m.category})</span>
      </div>
    `).join('');
  }

  function simulateSurge(destId) {
    const dest = state.destinations.find(d => d.id === destId);
    if (dest) {
      dest.crowdScore = dest.crowdScore >= 80 ? 25 : 92;
      dest.crowdStatus = dest.crowdScore >= 75 ? 'HIGH' : 'LOW';
      renderAdminTable();
      renderFeaturedDestinationsGrid();
      if (state.selectedDestination && state.selectedDestination.id === destId) {
        selectDestination(destId);
      }
      showToast(`⚡ Surge toggled for ${dest.name}: ${dest.crowdScore}% (${dest.crowdStatus})`);
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

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Export Global API
  window.GeoDivertApp = {
    selectDestination: selectDestination,
    togglePreference: togglePreference,
    simulateSurge: simulateSurge
  };

})();
