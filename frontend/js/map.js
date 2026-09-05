/**
 * GeoDivert – 3D MapLibre & MapTiler SDK Map Engine
 * Renders 3D Terrain, GeoJSON Crowd Heatmaps, 3D Location Markers, and Navigation Routes
 */

(function () {
  'use strict';

  const MAPTILER_KEY = '1F9CGOeQFYlGPknSOSpJ';

  let map = null;
  let currentPitch = 70; // 3D Camera tilt angle
  let activeMarkers = [];
  let heatmapVisible = true;

  /**
   * Initializes MapLibre / MapTiler 3D Canvas
   * @param {string} containerId - DOM element ID ('map-container')
   * @param {Array} initialSpots - Array of spot objects
   */
  function initMap(containerId, initialSpots) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Set MapTiler SDK key
    if (window.maptilersdk) {
      window.maptilersdk.config.apiKey = MAPTILER_KEY;
    }

    const styleUrl = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`;

    try {
      const MapClass = (window.maptilersdk && window.maptilersdk.Map) ? window.maptilersdk.Map : (window.maplibregl ? maplibregl.Map : null);
      if (!MapClass) {
        console.warn('MapLibre / MapTiler SDK not loaded yet.');
        return;
      }

      map = new MapClass({
        container: containerId,
        style: styleUrl,
        center: [79.0882, 21.1458], // Centered around Nagpur, Maharashtra
        zoom: 12,
        pitch: currentPitch, // 3D Tilted Perspective
        bearing: -15,
        maxPitch: 85,
        terrainExaggeration: 1.5,
        attributionControl: false
      });

      // Add 3D Navigation & Pitch Controls
      const NavControl = (window.maptilersdk && window.maptilersdk.NavigationControl) 
        ? window.maptilersdk.NavigationControl 
        : (window.maplibregl ? maplibregl.NavigationControl : null);
      
      if (NavControl) {
        map.addControl(new NavControl({ visualizePitch: true }), 'top-right');
      }

      map.on('load', function () {
        console.log('✅ GeoDivert 3D MapLibre Engine Initialized');

        // 1. Add 3D Terrain Elevation DEM Source
        setup3DTerrain();

        // 2. Add GeoJSON Crowd Heatmap Layer
        if (initialSpots && initialSpots.length > 0) {
          updateHeatmap(initialSpots);
          renderMarkers(initialSpots);
        }

        // 3. Trigger map resize to ensure full canvas dimensions
        setTimeout(() => {
          if (map) map.resize();
        }, 200);
      });

      // Handle map click to inspect custom location
      map.on('click', function (e) {
        const lngLat = e.lngLat;
        if (window.GeoDivertApp && window.GeoDivertApp.handleMapClick) {
          window.GeoDivertApp.handleMapClick(lngLat.lat, lngLat.lng);
        }
      });

    } catch (err) {
      console.warn('3D Map initialization notice:', err);
    }
  }

  /**
   * Configures 3D Terrain Elevation Mesh
   */
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
      map.setTerrain({ source: 'maptiler-dem', exaggeration: 1.5 });
    } catch (e) {
      console.log('3D Terrain info:', e.message);
    }
  }

  /**
   * Updates or Creates the GeoJSON Crowd Density Heatmap Layer
   */
  function updateHeatmap(spots) {
    if (!map) return;

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
          crowd_size: spot.crowd_score || spot.crowdScore || 50,
          crowd_status: spot.crowd_status || spot.crowdStatus || 'MEDIUM'
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
              0, 0,
              100, 1
            ],
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 1,
              16, 3
            ],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0, 0, 0, 0)',
              0.2, 'rgba(16, 185, 129, 0.4)',  // Green - Calm
              0.5, 'rgba(245, 158, 11, 0.7)',  // Amber - Medium
              0.8, 'rgba(244, 63, 94, 0.95)',  // Red - High Crowd
              1.0, 'rgba(225, 29, 72, 1.0)'    // Crimson - Heavy Congestion
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 15,
              10, 50,
              16, 90
            ],
            'heatmap-opacity': 0.85
          }
        });
      }
    } catch (e) {
      console.warn('Heatmap layer setup info:', e.message);
    }
  }

  /**
   * Renders 3D Custom Markers
   */
  function renderMarkers(spots) {
    if (!map) return;

    activeMarkers.forEach(m => m.remove());
    activeMarkers = [];

    const MarkerClass = (window.maptilersdk && window.maptilersdk.Marker) ? window.maptilersdk.Marker : (window.maplibregl ? maplibregl.Marker : null);
    const PopupClass = (window.maptilersdk && window.maptilersdk.Popup) ? window.maptilersdk.Popup : (window.maplibregl ? maplibregl.Popup : null);

    if (!MarkerClass) return;

    (spots || []).forEach(spot => {
      const score = spot.crowd_score || spot.crowdScore || 50;
      const status = spot.crowd_status || spot.crowdStatus || (score >= 75 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW');
      const badgeColor = status === 'HIGH' ? '#f43f5e' : status === 'MEDIUM' ? '#f59e0b' : '#10b981';

      const el = document.createElement('div');
      el.className = 'custom-map-marker';
      el.style.cssText = `
        background: ${badgeColor};
        color: #fff;
        padding: 5px 10px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 11px;
        box-shadow: 0 4px 15px ${badgeColor}80;
        border: 2px solid rgba(255,255,255,0.9);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        transform: translate(-50%, -50%);
        transition: transform 0.2s ease;
      `;
      el.innerHTML = `<span>${status === 'HIGH' ? '🔴' : status === 'MEDIUM' ? '🟠' : '🟢'}</span><span>${spot.name} (${score}%)</span>`;

      el.addEventListener('click', function () {
        if (window.GeoDivertApp && window.GeoDivertApp.selectSpot) {
          window.GeoDivertApp.selectSpot(spot);
        }
      });

      let popup = null;
      if (PopupClass) {
        popup = new PopupClass({ offset: 20, closeButton: false }).setHTML(`
          <div style="color: #0f172a; padding: 4px; font-family: sans-serif;">
            <strong style="font-size: 13px;">${spot.name}</strong><br/>
            <span style="font-size: 11px; color: #64748b;">${spot.category || 'Cultural Landmark'}</span><br/>
            <span style="font-weight: 700; color: ${badgeColor}; font-size: 11px;">Crowd: ${score}% (${status})</span>
          </div>
        `);
      }

      const marker = new MarkerClass({ element: el })
        .setLngLat([spot.lng || spot.lon, spot.lat]);
      
      if (popup) marker.setPopup(popup);
      marker.addTo(map);

      activeMarkers.push(marker);
    });
  }

  /**
   * Draws 3D Navigation Route from Origin to Recommended Alternative
   */
  function drawRoute(origin, destination) {
    if (!map || !origin || !destination) return;

    const oLng = origin.lng || origin.lon || origin.longitude;
    const oLat = origin.lat || origin.latitude;
    const dLng = destination.lng || destination.lon || destination.longitude;
    const dLat = destination.lat || destination.latitude;

    if (!oLng || !oLat || !dLng || !dLat) return;

    const midLng = (oLng + dLng) / 2 + 0.005;
    const midLat = (oLat + dLat) / 2 + 0.005;

    const routeGeoJSON = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [oLng, oLat],
          [midLng, midLat],
          [dLng, dLat]
        ]
      }
    };

    try {
      if (map.getSource('route-source')) {
        map.getSource('route-source').setData(routeGeoJSON);
      } else {
        map.addSource('route-source', {
          type: 'geojson',
          data: routeGeoJSON
        });

        map.addLayer({
          id: 'route-line-casing',
          type: 'line',
          source: 'route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#0284c7',
            'line-width': 8,
            'line-opacity': 0.4
          }
        });

        map.addLayer({
          id: 'route-line-core',
          type: 'line',
          source: 'route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#38bdf8',
            'line-width': 4,
            'line-dasharray': [2, 2]
          }
        });
      }

      // Fly to fit route bounds with 3D pitch
      fitBounds([
        { lat: oLat, lng: oLng },
        { lat: dLat, lng: dLng }
      ]);
    } catch (e) {
      console.warn('Route drawing info:', e.message);
    }
  }

  /**
   * Recenter camera to fit bounding box
   */
  function fitBounds(locations) {
    if (!map || !locations || locations.length === 0) return;

    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;

    locations.forEach(loc => {
      const lng = loc.lng || loc.lon || loc.longitude;
      const lat = loc.lat || loc.latitude;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    try {
      map.fitBounds(
        [[minLng - 0.025, minLat - 0.025], [maxLng + 0.025, maxLat + 0.025]],
        { padding: 70, pitch: currentPitch, duration: 1200 }
      );
    } catch (e) {
      console.warn('fitBounds info:', e.message);
    }
  }

  /**
   * Toggles 3D Pitch tilt angle between 70° and 0°
   */
  function toggle3D() {
    if (!map) return;
    currentPitch = currentPitch === 70 ? 0 : 70;
    map.easeTo({ pitch: currentPitch, duration: 1000 });
  }

  /**
   * Toggles Crowd Heatmap visibility
   */
  function toggleHeatmap() {
    if (!map || !map.getLayer('crowd-heatmap-layer')) return;
    heatmapVisible = !heatmapVisible;
    map.setLayoutProperty('crowd-heatmap-layer', 'visibility', heatmapVisible ? 'visible' : 'none');
  }

  // Global Export
  window.GeoDivertMap = {
    initMap: initMap,
    updateHeatmap: updateHeatmap,
    renderMarkers: renderMarkers,
    drawRoute: drawRoute,
    resetBounds: function () {
      if (map) {
        map.flyTo({ center: [79.0882, 21.1458], zoom: 12, pitch: currentPitch, duration: 1000 });
      }
    },
    toggle3D: toggle3D,
    toggleHeatmap: toggleHeatmap
  };

})();
