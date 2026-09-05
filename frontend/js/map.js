/**
 * GeoDivert – 3D MapLibre Map Engine
 * Renders 3D Terrain, Turn-by-Turn Road Routes, Persistent User GPS Radar Marker, and 🟢🟡🔴 Density Badges
 */

(function () {
  'use strict';

  function getMaptilerKey() {
    return (localStorage.getItem('geodivert_maptiler_key') || window.GEODIVERT_MAPTILER_KEY || '1F9CGOeQFYlGPknSOSpJ').trim();
  }

  let map = null;
  let isMapLoaded = false;
  let queuedActions = [];
  let currentPitch = 70;
  let activeMarkers = [];
  let userLocationMarker = null;
  let userCoordinates = [77.7523, 20.9320]; // Default Amravati Center [lon, lat]
  let heatmapVisible = true;

  function initMap(containerId, initialCenter) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (initialCenter && initialCenter.lon && initialCenter.lat) {
      userCoordinates = [initialCenter.lon, initialCenter.lat];
    }

    const activeMaptilerKey = getMaptilerKey();

    if (window.maptilersdk) {
      window.maptilersdk.config.apiKey = activeMaptilerKey;
    }

    const styleUrl = `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${activeMaptilerKey}`;

    try {
      const MapClass = (window.maptilersdk && window.maptilersdk.Map) ? window.maptilersdk.Map : (window.maplibregl ? maplibregl.Map : null);
      if (!MapClass) return;

      map = new MapClass({
        container: containerId,
        style: styleUrl,
        center: userCoordinates,
        zoom: 13.2,
        pitch: currentPitch,
        bearing: -10,
        maxPitch: 85,
        terrainExaggeration: 1.5,
        attributionControl: false
      });

      const NavControl = (window.maptilersdk && window.maptilersdk.NavigationControl) 
        ? window.maptilersdk.NavigationControl 
        : (window.maplibregl ? maplibregl.NavigationControl : null);
      
      if (NavControl) {
        map.addControl(new NavControl({ visualizePitch: true }), 'top-right');
      }

      map.on('load', function () {
        console.log('✅ 3D MapLibre Initialized for User Location at', userCoordinates);
        isMapLoaded = true;

        setup3DTerrain();
        ensureRouteLayers();
        
        // Render initial user location marker
        renderUserLocationMarker(userCoordinates[1], userCoordinates[0]);

        queuedActions.forEach(fn => {
          try { fn(); } catch (err) { console.warn('Queued map error:', err); }
        });
        queuedActions = [];

        setTimeout(() => {
          if (map) map.resize();
        }, 200);
      });

      map.on('click', function (e) {
        const lngLat = e.lngLat;
        if (window.GeoDivertApp && window.GeoDivertApp.handleMapClick) {
          window.GeoDivertApp.handleMapClick(lngLat.lat, lngLat.lng);
        }
      });

    } catch (err) {
      console.warn('Map init warning:', err);
    }
  }

  function setup3DTerrain() {
    if (!map) return;
    try {
      if (!map.getSource('maptiler-dem')) {
        map.addSource('maptiler-dem', {
          type: 'raster-dem',
          url: `https://api.maptiler.com/tiles/terrain-dem/tiles.json?key=${getMaptilerKey()}`,
          tileSize: 512,
          maxzoom: 14
        });
      }
      map.setTerrain({ source: 'maptiler-dem', exaggeration: 1.5 });
    } catch (e) {
      console.log('Terrain info:', e.message);
    }
  }

  function ensureRouteLayers() {
    if (!map) return;

    try {
      if (!map.getSource('route-source')) {
        map.addSource('route-source', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} }
        });
      }

      if (!map.getLayer('route-line-casing')) {
        map.addLayer({
          id: 'route-line-casing',
          type: 'line',
          source: 'route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#0284c7',
            'line-width': 8,
            'line-opacity': 0.8
          }
        });
      }

      if (!map.getLayer('route-line-core')) {
        map.addLayer({
          id: 'route-line-core',
          type: 'line',
          source: 'route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#38bdf8',
            'line-width': 4,
            'line-opacity': 1.0
          }
        });
      }
    } catch (e) {
      console.warn('Route layer error:', e.message);
    }
  }

  /**
   * Always-Persistent User Location Marker (Blue Pulsing Radar Beacon)
   */
  function renderUserLocationMarker(lat, lon) {
    if (!map || !lat || !lon) return;

    userCoordinates = [lon, lat];

    if (!isMapLoaded) {
      queuedActions.push(() => renderUserLocationMarker(lat, lon));
      return;
    }

    const MarkerClass = (window.maptilersdk && window.maptilersdk.Marker) ? window.maptilersdk.Marker : (window.maplibregl ? maplibregl.Marker : null);
    if (!MarkerClass) return;

    if (userLocationMarker) {
      userLocationMarker.remove();
    }

    const el = document.createElement('div');
    el.style.cssText = `
      position: relative;
      width: 32px;
      height: 32px;
      cursor: pointer;
      z-index: 100;
    `;
    el.innerHTML = `
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        width: 16px;
        height: 16px;
        background: #38bdf8;
        border: 2.5px solid #ffffff;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 12px #38bdf8, 0 0 24px rgba(56,189,248,0.8);
        z-index: 2;
      "></div>
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        width: 36px;
        height: 36px;
        border: 2px solid rgba(56, 189, 248, 0.9);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: userRadarPing 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        z-index: 1;
      "></div>
      <div style="
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.95);
        color: #38bdf8;
        padding: 2px 7px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 800;
        white-space: nowrap;
        border: 1px solid rgba(56, 189, 248, 0.5);
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
      ">📍 You Are Here</div>
    `;

    userLocationMarker = new MarkerClass({ element: el })
      .setLngLat([lon, lat])
      .addTo(map);
  }

  function setUserLocation(lat, lon) {
    userCoordinates = [lon, lat];
    renderUserLocationMarker(lat, lon);
  }

  /**
   * Updates Dynamic Crowd Heatmap
   */
  function updateHeatmap(spots) {
    if (!map) return;

    if (!isMapLoaded) {
      queuedActions.push(() => updateHeatmap(spots));
      return;
    }

    const geojsonData = {
      type: 'FeatureCollection',
      features: (spots || []).map(spot => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [spot.lng || spot.lon, spot.lat]
        },
        properties: {
          id: spot.id,
          name: spot.name,
          crowd_size: spot.crowd_score || 30
        }
      }))
    };

    try {
      if (map.getSource('crowd-heatmap-source')) {
        map.getSource('crowd-heatmap-source').setData(geojsonData);
      } else {
        map.addSource('crowd-heatmap-source', {
          type: 'geojson',
          data: geojsonData
        });
      }

      if (!map.getLayer('crowd-heatmap-layer')) {
        map.addLayer({
          id: 'crowd-heatmap-layer',
          type: 'heatmap',
          source: 'crowd-heatmap-source',
          maxzoom: 16,
          paint: {
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', 'crowd_size'],
              0, 0.1,
              100, 1.0
            ],
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 1.0,
              16, 3.0
            ],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0, 0, 0, 0)',
              0.2, 'rgba(16, 185, 129, 0.5)',
              0.5, 'rgba(245, 158, 11, 0.75)',
              0.8, 'rgba(244, 63, 94, 0.9)',
              1.0, 'rgba(225, 29, 72, 1.0)'
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 15,
              10, 45,
              16, 85
            ],
            'heatmap-opacity': 0.8
          }
        });
      }
    } catch (e) {
      console.warn('Heatmap update info:', e.message);
    }
  }

  /**
   * Renders Tourist Destination Markers with 🟢🟡🔴 Circular Density Indicators
   */
  function renderMarkers(spots, originPoint, recPoint) {
    if (!map) return;

    if (!isMapLoaded) {
      queuedActions.push(() => renderMarkers(spots, originPoint, recPoint));
      return;
    }

    // Remove old tourist destination markers (userLocationMarker is preserved!)
    activeMarkers.forEach(m => m.remove());
    activeMarkers = [];

    const MarkerClass = (window.maptilersdk && window.maptilersdk.Marker) ? window.maptilersdk.Marker : (window.maplibregl ? maplibregl.Marker : null);
    const PopupClass = (window.maptilersdk && window.maptilersdk.Popup) ? window.maptilersdk.Popup : (window.maplibregl ? maplibregl.Popup : null);

    if (!MarkerClass) return;

    // 1. If Origin is a SPECIFIC tourist spot (not the user's GPS), render an origin pin
    if (originPoint && originPoint.isExplicitSpot && originPoint.lat && (originPoint.lon || originPoint.lng)) {
      const el = document.createElement('div');
      const score = originPoint.crowd_score || 95;
      const dotColor = score >= 70 ? '#f43f5e' : score >= 40 ? '#f59e0b' : '#10b981';
      
      el.style.cssText = `
        background: #0f172a;
        color: #fff;
        padding: 5px 10px;
        border-radius: 16px;
        font-weight: 700;
        font-size: 11px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.6);
        border: 2px solid ${dotColor};
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        white-space: nowrap;
        transform: translate(-50%, -50%);
      `;
      el.innerHTML = `<span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${dotColor}; box-shadow:0 0 6px ${dotColor};"></span> <span>${originPoint.name}: <strong>${score}%</strong></span>`;

      const m = new MarkerClass({ element: el })
        .setLngLat([originPoint.lon || originPoint.lng, originPoint.lat])
        .addTo(map);
      activeMarkers.push(m);
    }

    // 2. Recommended Destination Marker (🟢 Serene Gem Pin)
    if (recPoint && recPoint.lat && (recPoint.lng || recPoint.lon)) {
      const el = document.createElement('div');
      const score = recPoint.crowd_score || 21;
      
      el.style.cssText = `
        background: #064e3b;
        color: #34d399;
        padding: 6px 12px;
        border-radius: 18px;
        font-weight: 800;
        font-size: 11px;
        box-shadow: 0 0 16px rgba(16,185,129,0.8);
        border: 2px solid #34d399;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        transform: translate(-50%, -50%);
        z-index: 50;
      `;
      el.innerHTML = `<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#34d399; box-shadow:0 0 8px #34d399;"></span> <span>✨ ${recPoint.name}: <strong>${score}%</strong></span>`;

      const m = new MarkerClass({ element: el })
        .setLngLat([recPoint.lng || recPoint.lon, recPoint.lat])
        .addTo(map);
      activeMarkers.push(m);
    }

    // 3. Other Monitored Amravati Spots (Clean circular density dots)
    (spots || []).forEach(spot => {
      if (originPoint && spot.name === originPoint.name) return;
      if (recPoint && spot.name === recPoint.name) return;
      if (!spot.lat || (!spot.lng && !spot.lon)) return;

      const score = spot.crowd_score || 25;
      const dotColor = score >= 70 ? '#f43f5e' : score >= 40 ? '#f59e0b' : '#10b981';

      const el = document.createElement('div');
      el.style.cssText = `
        background: #0f172a;
        color: #e2e8f0;
        padding: 3px 8px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.15);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        transform: translate(-50%, -50%);
      `;
      el.innerHTML = `<span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${dotColor}; box-shadow:0 0 5px ${dotColor};"></span> <span>${spot.name} (${score}%)</span>`;

      el.addEventListener('click', function () {
        if (window.GeoDivertApp && window.GeoDivertApp.selectSpot) {
          window.GeoDivertApp.selectSpot(spot);
        }
      });

      const marker = new MarkerClass({ element: el })
        .setLngLat([spot.lng || spot.lon, spot.lat]);
      
      if (PopupClass) {
        marker.setPopup(new PopupClass({ offset: 12, closeButton: false }).setHTML(`
          <div style="color:#0f172a; padding:3px; font-family:sans-serif;">
            <strong style="font-size:12px;">${spot.name}</strong><br/>
            <span style="font-size:10px; color:#64748b;">${spot.category || 'Tourist Spot'}</span><br/>
            <span style="font-weight:700; color:${dotColor}; font-size:11px;">ML Score: ${score}%</span>
          </div>
        `));
      }

      marker.addTo(map);
      activeMarkers.push(marker);
    });
  }

  /**
   * Draws OSRM Navigation Road Route from User Location / Origin -> Destination
   */
  function drawRoute(origin, destination, routeCoords) {
    if (!map || !origin || !destination) return;

    if (!isMapLoaded) {
      queuedActions.push(() => drawRoute(origin, destination, routeCoords));
      return;
    }

    ensureRouteLayers();

    const oLng = origin.lng || origin.lon || origin.longitude;
    const oLat = origin.lat || origin.latitude;
    const dLng = destination.lng || destination.lon || destination.longitude;
    const dLat = destination.lat || destination.latitude;

    if (!oLng || !oLat || !dLng || !dLat) return;

    let coordinates = [];
    if (routeCoords && Array.isArray(routeCoords) && routeCoords.length >= 2) {
      coordinates = routeCoords;
    } else {
      for (let i = 0; i <= 10; i++) {
        const t = i / 10.0;
        const curLng = oLng + (dLng - oLng) * t;
        const curLat = oLat + (dLat - oLat) * t;
        const offset = Math.sin(t * Math.PI) * 0.004;
        coordinates.push([curLng + offset, curLat + offset * 0.5]);
      }
    }

    const routeGeoJSON = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      }
    };

    try {
      if (map.getSource('route-source')) {
        map.getSource('route-source').setData(routeGeoJSON);
      }

      fitBounds([
        { lat: oLat, lng: oLng },
        { lat: dLat, lng: dLng }
      ]);
    } catch (e) {
      console.warn('Route draw error:', e.message);
    }
  }

  function fitBounds(locations) {
    if (!map || !locations || locations.length === 0) return;

    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;

    locations.forEach(loc => {
      const lng = loc.lng || loc.lon || loc.longitude;
      const lat = loc.lat || loc.latitude;
      if (lng !== undefined && lat !== undefined) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    });

    if (minLng > maxLng || minLat > maxLat) return;

    try {
      map.fitBounds(
        [[minLng - 0.02, minLat - 0.02], [maxLng + 0.02, maxLat + 0.02]],
        { padding: 60, pitch: currentPitch, duration: 800 }
      );
    } catch (e) {
      console.warn('fitBounds warning:', e.message);
    }
  }

  function setCenter(lat, lon, zoom) {
    userCoordinates = [lon, lat];
    if (map) {
      map.flyTo({ center: [lon, lat], zoom: zoom || 13.5, pitch: currentPitch, duration: 800 });
    }
  }

  function recenterOnUser() {
    if (map && userCoordinates) {
      map.flyTo({ center: userCoordinates, zoom: 14.0, pitch: currentPitch, duration: 900 });
    }
  }

  function toggle3D() {
    if (!map) return;
    currentPitch = currentPitch === 70 ? 0 : 70;
    map.easeTo({ pitch: currentPitch, duration: 600 });
  }

  function toggleHeatmap() {
    if (!map || !map.getLayer('crowd-heatmap-layer')) return;
    heatmapVisible = !heatmapVisible;
    map.setLayoutProperty('crowd-heatmap-layer', 'visibility', heatmapVisible ? 'visible' : 'none');
  }

  // Global Export
  window.GeoDivertMap = {
    initMap: initMap,
    setCenter: setCenter,
    setUserLocation: setUserLocation,
    renderUserLocationMarker: renderUserLocationMarker,
    updateHeatmap: updateHeatmap,
    renderMarkers: renderMarkers,
    drawRoute: drawRoute,
    recenterOnUser: recenterOnUser,
    resetBounds: recenterOnUser,
    toggle3D: toggle3D,
    toggleHeatmap: toggleHeatmap
  };

})();
