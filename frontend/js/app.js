/**
 * GeoDivert – Main Interactive Web Application Engine
 * Connects UI Components, 3D Map, Preferences, ML Predictions, and Audio Tour Guide
 */

(function () {
  'use strict';

  // Application State
  const state = {
    selectedDestination: null,
    recommendedAlternative: null,
    topAlternatives: [],
    selectedPreferences: new Set(),
    timeSlot: 'afternoon', // 'morning', 'afternoon', 'evening'
    isGovAdminMode: false,
    destinations: [],
    categories: []
  };

  // DOM Elements cache
  let el = {};

  document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 GeoDivert Web Application Initializing...');
    
    // Load dataset from data.js
    if (window.GEODIVERT_DATA) {
      state.destinations = JSON.parse(JSON.stringify(window.GEODIVERT_DATA.destinations));
      state.categories = window.GEODIVERT_DATA.preferenceCategories;
    }

    cacheDOMElements();
    setupEventListeners();
    renderPreferencesModalGrid();
    renderFeaturedDestinationsGrid();
    renderAdminTable();

    // Default select first high crowd destination (Futala Lake or Shaniwar Wada)
    const initialHigh = state.destinations.find(d => d.crowdStatus === 'HIGH') || state.destinations[0];
    if (initialHigh) {
      selectDestination(initialHigh.id);
    }

    // Initialize 3D MapLibre Engine
    if (window.GeoDivertMap) {
      window.GeoDivertMap.initMap('map-container', state.destinations);
    }
  });

  /**
   * Caches all relevant DOM Elements for performant manipulation
   */
  function cacheDOMElements() {
    el = {
      searchInput: document.getElementById('search-input'),
      searchClearBtn: document.getElementById('search-clear-btn'),
      exploreBtn: document.getElementById('explore-btn'),
      autocompleteDropdown: document.getElementById('autocomplete-dropdown'),
      quickChips: document.querySelectorAll('.quick-chip'),
      featuredGrid: document.querySelector('.featured-grid'),
      resultsSection: document.getElementById('results-section'),
      
      // Selected Dest Card
      destImg: document.getElementById('dest-image'),
      destName: document.getElementById('dest-name'),
      destCategory: document.getElementById('dest-category'),
      destLocation: document.getElementById('dest-location'),
      destCrowdPercent: document.getElementById('dest-crowd-percent'),
      destCrowdMeterFill: document.getElementById('dest-crowd-meter-fill'),
      destCrowdStatus: document.getElementById('dest-crowd-status'),
      destAlertMsg: document.getElementById('dest-alert-message'),
      destRating: document.getElementById('dest-rating'),
      destWaitTime: document.getElementById('dest-wait-time'),
      destPeakHours: document.getElementById('dest-peak-hours'),

      // Recommended Card
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

      // Navigation Route
      routeStart: document.getElementById('route-start'),
      routeEnd: document.getElementById('route-end'),
      routeDistance: document.getElementById('route-distance'),
      routeDuration: document.getElementById('route-duration'),
      timeSlotBtns: document.querySelectorAll('.time-slot-btn'),

      // Hospitality Grid & Tabs
      hospitalityGrid: document.getElementById('hospitality-cards-grid'),
      hospFilterTabs: document.querySelectorAll('.hosp-filter-tab'),

      // Modals & Navigation
      prefModal: document.getElementById('preferences-modal'),
      prefModalCloseBtn: document.getElementById('pref-modal-close-btn'),
      navPrefBtn: document.getElementById('nav-pref-btn'),
      navPrefCount: document.getElementById('nav-pref-count'),
      prefGrid: document.getElementById('pref-categories-grid'),
      prefClearBtn: document.getElementById('pref-clear-btn'),
      prefSaveBtn: document.getElementById('pref-save-btn'),
      prefCountIndicator: document.getElementById('pref-count-indicator'),

      // Admin & Tourist Mode Toggle
      modeToggleBtn: document.getElementById('mode-toggle-btn'),
      touristViewContainer: document.getElementById('tourist-view-container'),
      adminDashboardContainer: document.getElementById('admin-dashboard-container'),
      adminTableBody: document.getElementById('admin-dest-table-body'),
      toastContainer: document.getElementById('toast-container')
    };
  }

  /**
   * Registers Event Listeners for UI interaction
   */
  function setupEventListeners() {
    // Search input autocomplete
    if (el.searchInput) {
      el.searchInput.addEventListener('input', handleSearchInput);
      el.searchInput.addEventListener('focus', handleSearchInput);
    }
    if (el.searchClearBtn) {
      el.searchClearBtn.addEventListener('click', function () {
        el.searchInput.value = '';
        if (el.autocompleteDropdown) el.autocompleteDropdown.innerHTML = '';
      });
    }
    if (el.exploreBtn) {
      el.exploreBtn.addEventListener('click', function () {
        const query = el.searchInput ? el.searchInput.value.trim() : '';
        if (query) {
          const matched = state.destinations.find(d => d.name.toLowerCase().includes(query.toLowerCase()));
          if (matched) selectDestination(matched.id);
          else showToast(`Searching live crowd data for "${query}"...`);
        }
      });
    }

    // Quick suggestion chips
    el.quickChips.forEach(chip => {
      chip.addEventListener('click', function () {
        const query = this.getAttribute('data-query');
        const matched = state.destinations.find(d => d.name.toLowerCase().includes(query.toLowerCase()));
        if (matched) {
          selectDestination(matched.id);
          showToast(`Inspecting crowd radar for ${matched.name}...`);
        }
      });
    });

    // Time Slot Selectors
    el.timeSlotBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        el.timeSlotBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        state.timeSlot = this.getAttribute('data-time');
        recalculateDispersal();
      });
    });

    // Explore Alternative Button -> Scroll to Map & Play Web Speech AI Tour
    if (el.btnExploreAlternative) {
      el.btnExploreAlternative.addEventListener('click', function () {
        const mapSec = document.getElementById('map-section');
        if (mapSec) mapSec.scrollIntoView({ behavior: 'smooth' });
        playAIAudioTour(state.recommendedAlternative);
      });
    }

    // Preferences Modal Events
    if (el.navPrefBtn) el.navPrefBtn.addEventListener('click', () => toggleModal(el.prefModal, true));
    if (el.prefModalCloseBtn) el.prefModalCloseBtn.addEventListener('click', () => toggleModal(el.prefModal, false));
    if (el.prefClearBtn) {
      el.prefClearBtn.addEventListener('click', function () {
        state.selectedPreferences.clear();
        updatePrefModalSelectionUI();
      });
    }
    if (el.prefSaveBtn) {
      el.prefSaveBtn.addEventListener('click', function () {
        toggleModal(el.prefModal, false);
        updateNavPrefBadge();
        recalculateDispersal();
        showToast(`✨ Preferences saved! Rerouting calibrated.`);
      });
    }

    // Hospitality Tabs
    el.hospFilterTabs.forEach(tab => {
      tab.addEventListener('click', function () {
        el.hospFilterTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const filter = this.getAttribute('data-filter');
        renderHospitalityGrid(state.recommendedAlternative, filter);
      });
    });

    // Admin / Tourist Mode Switcher
    if (el.modeToggleBtn) {
      el.modeToggleBtn.addEventListener('click', function () {
        state.isGovAdminMode = !state.isGovAdminMode;
        if (state.isGovAdminMode) {
          el.touristViewContainer.classList.add('hidden');
          el.adminDashboardContainer.classList.remove('hidden');
          this.innerHTML = `<span>🧭 Switch to Tourist View</span>`;
          showToast(`🏛️ Command Center Activated: Live Regional Crowd Surveillance.`);
        } else {
          el.adminDashboardContainer.classList.add('hidden');
          el.touristViewContainer.classList.remove('hidden');
          this.innerHTML = `<span>🏛️ Switch to Gov Admin</span>`;
        }
      });
    }
  }

  /**
   * Main Dispersal Rerouting Engine
   * Calculates scores: Score = 0.3 * Dist + 0.5 * CrowdScore - 0.2 * CulturalVal - 0.3 * PrefMatch
   */
  function selectDestination(destId) {
    const selected = state.destinations.find(d => d.id === destId);
    if (!selected) return;

    state.selectedDestination = selected;

    // Show Results Section
    if (el.resultsSection) el.resultsSection.classList.remove('hidden');

    // Render Selected Destination Card
    renderSelectedDestCard(selected);

    // Calculate & Rank Alternatives
    recalculateDispersal();

    // Scroll smoothly to analysis section
    if (el.resultsSection) {
      el.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function recalculateDispersal() {
    const orig = state.selectedDestination;
    if (!orig) return;

    // Filter alternatives (excluding selected)
    let candidates = state.destinations.filter(d => d.id !== orig.id);

    // Calculate scores for candidates
    candidates.forEach(cand => {
      const dist = calculateDistance(orig.lat, orig.lng, cand.lat, cand.lng);
      cand.computedDist = dist;

      // Check preference match
      const isPrefMatch = state.selectedPreferences.has(cand.preferenceCategory);
      cand.prefMatchScore = isPrefMatch ? 0.35 : 0.0;

      // Spatial Dispersal Formula
      const score = (0.3 * (dist / 10)) + (0.5 * (cand.crowdScore / 100)) - (0.2 * (cand.culturalValue || 0.5)) - cand.prefMatchScore;
      cand.dispersalScore = score;
    });

    // Sort by lowest dispersal score (best serene alternative)
    candidates.sort((a, b) => a.dispersalScore - b.dispersalScore);

    state.recommendedAlternative = candidates[0];
    state.topAlternatives = candidates.slice(0, 3);

    // Render UI Cards & Analytics
    renderRecommendationCard(state.recommendedAlternative, orig);
    renderTop3AlternativesDeck(state.topAlternatives);
    renderComparisonDuel(orig, state.recommendedAlternative);
    renderRouteInfo(orig, state.recommendedAlternative);
    renderHospitalityGrid(state.recommendedAlternative, 'all');

    // Update 3D Map
    if (window.GeoDivertMap) {
      window.GeoDivertMap.drawRoute(orig, state.recommendedAlternative);
    }
  }

  // --- RENDERING HELPERS ---

  function renderSelectedDestCard(dest) {
    if (!el.destName) return;
    el.destImg.src = dest.image;
    el.destName.textContent = dest.name;
    el.destCategory.textContent = dest.category;
    el.destLocation.textContent = `${dest.city}, India`;
    el.destCrowdPercent.textContent = `${dest.crowdScore}%`;
    el.destCrowdMeterFill.style.width = `${dest.crowdScore}%`;
    
    el.destCrowdStatus.textContent = `${dest.crowdStatus} CROWD`;
    el.destCrowdStatus.style.background = dest.crowdStatus === 'HIGH' ? '#f43f5e' : dest.crowdStatus === 'MEDIUM' ? '#f59e0b' : '#10b981';

    el.destRating.textContent = `⭐ ${dest.rating} (${dest.reviewCount})`;
    el.destWaitTime.textContent = `⏱️ ${dest.waitTime}`;
    el.destPeakHours.textContent = `⏰ Peak: ${dest.peakHours}`;
  }

  function renderRecommendationCard(rec, orig) {
    if (!el.recName || !rec) return;
    el.recImg.src = rec.image;
    el.recName.textContent = rec.name;
    el.recCategory.textContent = rec.category;
    el.recCrowdPercent.textContent = `${rec.crowdScore}%`;
    el.recRating.textContent = `⭐ ${rec.rating}`;
    el.recDistance.textContent = `${rec.computedDist.toFixed(1)} km`;

    const reduction = Math.max(0, orig.crowdScore - rec.crowdScore);
    el.recReductionBadge.innerHTML = `🎉 <strong>${reduction}% less crowded</strong> than ${orig.name}`;

    const isMatch = state.selectedPreferences.has(rec.preferenceCategory);
    el.recPrefMatchBadge.textContent = isMatch ? `🎯 95% Preference Match` : `🌿 High Serenity Score`;

    // Render Reasons
    el.recReasonsList.innerHTML = `
      <li>🟢 <strong>Zero Congestion:</strong> Only ${rec.crowdScore}% capacity utilization currently.</li>
      <li>⏱️ <strong>Save ~45 mins:</strong> Skip security line delays and traffic jams.</li>
      <li>🌿 <strong>Cultural Value:</strong> Verified high-rated ${rec.category} spot.</li>
    `;
  }

  function renderTop3AlternativesDeck(top3) {
    if (!el.altDeckGrid) return;
    el.altDeckGrid.innerHTML = top3.map((alt, i) => `
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
    if (!el.compOrigName || !alt) return;
    el.compOrigName.textContent = orig.name;
    el.compOrigPercent.textContent = `${orig.crowdScore}% 🔴 HIGH`;
    el.compOrigBar.style.width = `${orig.crowdScore}%`;

    el.compAltName.textContent = alt.name;
    el.compAltPercent.textContent = `${alt.crowdScore}% 🟢 LOW`;
    el.compAltBar.style.width = `${alt.crowdScore}%`;

    const diff = orig.crowdScore - alt.crowdScore;
    el.compDiffBadge.innerHTML = `📉 <strong>${diff}% Crowd Reduction</strong> achieved by choosing ${alt.name}!`;
  }

  function renderRouteInfo(orig, alt) {
    if (!el.routeStart || !alt) return;
    el.routeStart.textContent = orig.name;
    el.routeEnd.textContent = alt.name;
    el.routeDistance.textContent = `${alt.computedDist.toFixed(1)} km`;
    
    const driveMins = Math.round(alt.computedDist * 2.5) + 5;
    el.routeDuration.textContent = `🚗 ${driveMins} mins`;
  }

  function renderHospitalityGrid(dest, filter) {
    if (!el.hospitalityGrid || !dest) return;

    let items = dest.hospitality || [];
    if (filter !== 'all') {
      items = items.filter(h => h.type === filter);
    }

    if (items.length === 0) {
      items = [
        { name: `${dest.name} Eco Cafe`, type: 'restaurant', rating: 4.7, dist: '0.2 km', desc: 'Family-owned local cafe serving tea and snacks.' },
        { name: 'Heritage Artisan Stall', type: 'experience', rating: 4.8, dist: '0.4 km', desc: 'Handcrafted souvenirs supporting rural artisans.' }
      ];
    }

    el.hospitalityGrid.innerHTML = items.map(h => `
      <div class="hosp-card" style="
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 1.25rem;
      ">
        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
          <span style="font-size:0.8rem; color:var(--primary); font-weight:600;">${h.type.toUpperCase()}</span>
          <span style="font-size:0.85rem; color:#fbbf24; font-weight:700;">⭐ ${h.rating}</span>
        </div>
        <h4 style="font-size:1.1rem; margin-bottom:0.4rem;">${h.name}</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem;">${h.desc}</p>
        <span style="font-size:0.8rem; color:#34d399; font-weight:600;">📍 ${h.dist} away from alternative</span>
      </div>
    `).join('');
  }

  function renderFeaturedDestinationsGrid() {
    if (!el.featuredGrid) return;
    el.featuredGrid.innerHTML = state.destinations.slice(0, 6).map(dest => `
      <div class="dest-card" onclick="window.GeoDivertApp.selectDestination('${dest.id}')" style="cursor:pointer;">
        <div class="dest-card-banner">
          <img src="${dest.image}" alt="${dest.name}" />
          <div class="crowd-status-pill" style="background:${dest.crowdStatus === 'HIGH' ? '#f43f5e' : dest.crowdStatus === 'MEDIUM' ? '#f59e0b' : '#10b981'};">
            ${dest.crowdStatus} CROWD (${dest.crowdScore}%)
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
    if (!el.prefGrid) return;
    el.prefGrid.innerHTML = state.categories.map(cat => `
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
    if (!el.adminTableBody) return;
    el.adminTableBody.innerHTML = state.destinations.map(dest => `
      <tr>
        <td><strong>${dest.name}</strong> (${dest.city})</td>
        <td>
          <span style="color:${dest.crowdStatus === 'HIGH' ? '#fb7185' : '#34d399'}; font-weight:700;">
            ${dest.crowdScore}% ${dest.crowdStatus}
          </span>
        </td>
        <td>${Math.round(dest.crowdScore * 40)} / 4,000 visitors</td>
        <td>${dest.crowdStatus === 'HIGH' ? '⚠️ Rerouting Active' : '🟢 Optimal Capacity'}</td>
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

  // --- AUDIO TOUR GUIDE (Web Speech API) ---
  function playAIAudioTour(dest) {
    if (!dest || !('speechSynthesis' in window)) {
      showToast('🔊 AI Voice Tour: ' + (dest ? dest.description : 'Welcome to GeoDivert!'));
      return;
    }

    window.speechSynthesis.cancel();

    const text = `Welcome to ${dest.name} in ${dest.city}! GeoDivert has routed you here because it currently has only ${dest.crowdScore} percent capacity utilization. ${dest.description}. Enjoy your serene travel experience!`;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
    showToast(`🔊 Playing AI Tour Guide Audio for ${dest.name}...`);
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
    if (el.prefCountIndicator) {
      el.prefCountIndicator.textContent = `${state.selectedPreferences.size} categories selected`;
    }
  }

  function updateNavPrefBadge() {
    if (el.navPrefCount) {
      el.navPrefCount.textContent = state.selectedPreferences.size > 0 ? `${state.selectedPreferences.size} Active` : 'Set';
    }
  }

  function handleSearchInput() {
    const val = el.searchInput.value.trim().toLowerCase();
    if (!val) {
      el.autocompleteDropdown.innerHTML = '';
      return;
    }

    const matches = state.destinations.filter(d => d.name.toLowerCase().includes(val) || d.category.toLowerCase().includes(val));
    el.autocompleteDropdown.innerHTML = matches.map(m => `
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
      showToast(`⚡ Surge simulation updated for ${dest.name}`);
    }
  }

  function toggleModal(modalEl, show) {
    if (!modalEl) return;
    if (show) modalEl.classList.add('active');
    else modalEl.classList.remove('active');
  }

  function showToast(msg) {
    if (!el.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.style.cssText = 'background:#151e32; color:#fff; border:1px solid #38bdf8; padding:10px 16px; border-radius:10px; margin-top:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5); font-size:0.85rem;';
    toast.textContent = msg;
    el.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Export Global App API
  window.GeoDivertApp = {
    selectDestination: selectDestination,
    togglePreference: togglePreference,
    simulateSurge: simulateSurge
  };

})();
