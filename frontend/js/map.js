/**
 * GeoDivert – 3D MapLibre & MapTiler SDK Map Engine
 * Renders 3D Terrain, Turn-by-Turn Road Routes, GeoJSON Crowd Heatmaps, and 3D Location Markers
 */

(function () {
  'use strict';

  const MAPTILER_KEY = '1F9CGOeQFYlGPknSOSpJ';

  let map = null;
  let isMapLoaded = false;
  let queuedActions = [];
  let currentPitch = 70; // 3D Tilt Angle
  let activeMarkers = [];
  let heatmapVisible = true;
  let currentCenter = [77.7523, 20.9320]; // Default centered on Amravati

  /**
   * Initializes the 3D Map Canvas
   */
  function initMap(containerId, initialCenter) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (initialCenter && initialCenter.lon && initialCenter.lat) {
      currentCenter = [initialCenter.lon, initialCenter.lat];
    }

    if (window.maptilersdk) {
      window.maptilersdk.config.apiKey = MAPTILER_KEY;
    }

    // High clarity, modern dark vector tiles
    const styleUrl = `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`;

    try {
      const MapClass = (window.maptilersdk && window.maptilersdk.Map) ? window.maptilersdk.Map : (window.maplibregl ? maplibregl.Map : null);
      if (!MapClass) return;

      map = new MapClass({
        container: containerId,
        style: styleUrl,
        center: currentCenter,
        zoom: 12.5,
        pitch: currentPitch,
        bearing: -12,
        maxPitch: 85,
        terrainExaggeration: 1.6,
        attributionControl: false
      });

      // Add 3D Navigation Controls
      const NavControl = (window.maptilersdk && window.maptilersdk.NavigationControl) 
        ? window.maptilersdk.NavigationControl 
        : (window.maplibregl ? maplibregl.NavigationControl : null);
      
      if (NavControl) {
        map.addControl(new NavControl({ visualizePitch: true }), 'top-right');
      }

      map.on('load', function () {
        console.log('✅ 3D MapLibre Map Initialized at', currentCenter);
        isMapLoaded = true;

        // 1. Add 3D Terrain DEM Mesh
        setup3DTerrain();

        // 2. Setup Route Vector Layer
        ensureRouteLayers();

        // 3. Execute any queued render actions
        queuedActions.forEach(fn => {
          try { fn(); } catch (err) { console.warn('Queued action notice:', err); }
        });
        queuedActions = [];

        setTimeout(() => {
          if (map) map.resize();
        }, 200);
      });

      // Handle map coordinate clicks
      map.on('click', function (e) {
        const lngLat = e.lngLat;
        if (window.GeoDivertApp && window.GeoDivertApp.handleMapClick) {
          window.GeoDivertApp.handleMapClick(lngLat.lat, lngLat.lng);
        }
      });

    } catch (err) {
      console.warn('Map initialization notice:', err);
    }
  }

  function setup3DTerrain() {
    if (!map) return;
    try {
      if (!map.getSource('maptiler-dem')) {
        map.addSource('maptiler-dem', {
          type: 'raster-dem',
          url: `https://api.maptiler.com/tiles/terrain-dem/tiles.json?key=${MAPTILER_KEY}`,
          tileSize: 512,
          maxzoom: 14
        });
      }
      map.setTerrain({ source: 'maptiler-dem', exaggeration: 1.6 });
    } catch (e) {
      console.log('3D Terrain info:', e.message);
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
            'line-width': 10,
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
            'line-width': 5,
            'line-opacity': 1.0
          }
        });
      }
    } catch (e) {
      console.warn('ensureRouteLayers info:', e.message);
    }
  }

  /**
   * Updates the Glowing Red & Green Crowd Heatmap Layer
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
          crowd_size: spot.crowd_score || 50
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
              0, 1.2,
              16, 3.2
            ],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0, 0, 0, 0)',
              0.2, 'rgba(16, 185, 129, 0.55)', // Green Calm Corridor
              0.5, 'rgba(245, 158, 11, 0.80)', // Amber Moderate
              0.8, 'rgba(244, 63, 94, 0.95)',  // Red High Crowd
              1.0, 'rgba(225, 29, 72, 1.0)'    // Crimson Bottleneck
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 18,
              10, 50,
              16, 95
            ],
            'heatmap-opacity': 0.85
          }
        });
      }
    } catch (e) {
      console.warn('Heatmap update info:', e.message);
    }
  }

  /**
   * Renders 3D Markers on Map
   */
  function renderMarkers(spots, originPoint, recPoint) {
    if (!map) return;

    if (!isMapLoaded) {
      queuedActions.push(() => renderMarkers(spots, originPoint, recPoint));
      return;
    }

    activeMarkers.forEach(m => m.remove());
    activeMarkers = [];

    const MarkerClass = (window.maptilersdk && window.maptilersdk.Marker) ? window.maptilersdk.Marker : (window.maplibregl ? maplibregl.Marker : null);
    const PopupClass = (window.maptilersdk && window.maptilersdk.Popup) ? window.maptilersdk.Popup : (window.maplibregl ? maplibregl.Popup : null);

    if (!MarkerClass) return;

    // 1. Origin Marker (Red with pulsing glow)
    if (originPoint && originPoint.lat && (originPoint.lon || originPoint.lng)) {
      const elOrig = document.createElement('div');
      elOrig.style.cssText = `
        background: linear-gradient(135deg, #f43f5e, #be123c);
        color: #ffffff;
        padding: 7px 14px;
        border-radius: 20px;
        font-weight: 800;
        font-size: 12px;
        box-shadow: 0 0 18px rgba(244, 63, 94, 0.8);
        border: 2px solid #ffffff;
        cursor: pointer;
        white-space: nowrap;
        transform: translate(-50%, -50%);
        letter-spacing: 0.3px;
      `;
      elOrig.innerHTML = `📍 Origin: ${originPoint.name || 'Start'} (${originPoint.crowd_score || 91}%)`;

      const mOrig = new MarkerClass({ element: elOrig })
        .setLngLat([originPoint.lon || originPoint.lng, originPoint.lat])
        .addTo(map);
      activeMarkers.push(mOrig);
    }

    // 2. Recommended Destination Marker (Emerald Green with glowing aura)
    if (recPoint && recPoint.lat && (recPoint.lng || recPoint.lon)) {
      const elRec = document.createElement('div');
      elRec.style.cssText = `
        background: linear-gradient(135deg, #10b981, #047857);
        color: #ffffff;
        padding: 7px 14px;
        border-radius: 20px;
        font-weight: 800;
        font-size: 12px;
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.85);
        border: 2px solid #ffffff;
        cursor: pointer;
        white-space: nowrap;
        transform: translate(-50%, -50%);
        letter-spacing: 0.3px;
      `;
      elRec.innerHTML = `✨ Serene Spot: ${recPoint.name} (${recPoint.crowd_score || 28}%)`;

      const mRec = new MarkerClass({ element: elRec })
        .setLngLat([recPoint.lng || recPoint.lon, recPoint.lat])
        .addTo(map);
      activeMarkers.push(mRec);
    }

    // 3. Other Candidate Markers
    (spots || []).forEach(spot => {
      if (originPoint && spot.name === originPoint.name) return;
      if (recPoint && spot.name === recPoint.name) return;
      if (!spot.lat || (!spot.lng && !spot.lon)) return;

      const score = spot.crowd_score || 50;
      const badgeColor = score >= 70 ? '#f43f5e' : score >= 40 ? '#f59e0b' : '#10b981';

      const el = document.createElement('div');
      el.style.cssText = `
        background: ${badgeColor};
        color: #ffffff;
        padding: 4px 9px;
        border-radius: 14px;
        font-weight: 700;
        font-size: 10px;
        box-shadow: 0 2px 10px ${badgeColor}70;
        border: 1.5px solid rgba(255, 255, 255, 0.9);
        cursor: pointer;
        white-space: nowrap;
        transform: translate(-50%, -50%);
      `;
      el.innerHTML = `<span>${spot.name} (${score}%)</span>`;

      el.addEventListener('click', function () {
        if (window.GeoDivertApp && window.GeoDivertApp.selectSpot) {
          window.GeoDivertApp.selectSpot(spot);
        }
      });

      const marker = new MarkerClass({ element: el })
        .setLngLat([spot.lng || spot.lon, spot.lat]);
      
      if (PopupClass) {
        marker.setPopup(new PopupClass({ offset: 15, closeButton: false }).setHTML(`
          <div style="color:#0f172a; padding:4px; font-family:sans-serif;">
            <strong style="font-size:13px;">${spot.name}</strong><br/>
            <span style="font-size:11px; color:#64748b;">${spot.category || 'Cultural Spot'}</span><br/>
            <span style="font-weight:700; color:${badgeColor}; font-size:11px;">Predicted Crowd: ${score}%</span>
          </div>
        `));
      }

      marker.addTo(map);
      activeMarkers.push(marker);
    });
  }

  /**
   * Draws Turn-by-Turn Road Route on Map
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
      // Smooth 10-point arc
      for (let i = 0; i <= 10; i++) {
        const t = i / 10.0;
        const curLng = oLng + (dLng - oLng) * t;
        const curLat = oLat + (dLat - oLat) * t;
        const arcOffset = Math.sin(t * Math.PI) * 0.005;
        coordinates.push([curLng + arcOffset, curLat + arcOffset * 0.5]);
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

      // Smoothly fly and adjust bounds to frame both points
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
        { padding: 70, pitch: currentPitch, duration: 1000 }
      );
    } catch (e) {
      console.warn('fitBounds info:', e.message);
    }
  }

  function setCenter(lat, lon, zoom) {
    currentCenter = [lon, lat];
    if (map) {
      map.flyTo({ center: [lon, lat], zoom: zoom || 13, pitch: currentPitch, duration: 1000 });
    }
  }

  function toggle3D() {
    if (!map) return;
    currentPitch = currentPitch === 70 ? 0 : 70;
    map.easeTo({ pitch: currentPitch, duration: 800 });
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
    updateHeatmap: updateHeatmap,
    renderMarkers: renderMarkers,
    drawRoute: drawRoute,
    resetBounds: function () {
      if (map) {
        map.flyTo({ center: currentCenter, zoom: 12.5, pitch: currentPitch, duration: 900 });
      }
    },
    toggle3D: toggle3D,
    toggleHeatmap: toggleHeatmap
  };

})();
