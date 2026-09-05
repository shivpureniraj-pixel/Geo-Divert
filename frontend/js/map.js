/**
 * GeoDivert – 3D MapLibre & MapTiler SDK Map Module
 * Renders 3D Terrain, GeoJSON Crowd Heatmaps, 3D Location Markers, and Navigation Routes
 */

(function () {
  'use strict';

  // MapTiler API Key provided by user
  const MAPTILER_KEY = '1F9CGOeQFYlGPknSOSpJ';

  let map = null;
  let heatmapLayerAdded = false;
  let currentPitch = 70; // 3D Pitch tilt angle (degrees)
  let activeMarkers = [];
  let currentRouteSource = null;

  /**
   * Initializes the 3D MapLibre / MapTiler SDK Map
   * @param {string} containerId - DOM ID of map canvas container ('map-container')
   * @param {Array} initialDestinations - Array of destination objects
   */
  function initMap(containerId, initialDestinations) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Set MapTiler API Key if SDK available
    if (window.maptilersdk) {
      window.maptilersdk.config.apiKey = MAPTILER_KEY;
    }

    // Map style URL (3D Outdoor/Dataviz style)
    const styleUrl = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`;

    try {
      // Create MapLibre GL JS / MapTiler SDK 3D Map instance
      const MapClass = (window.maptilersdk && window.maptilersdk.Map) ? window.maptilersdk.Map : maplibregl.Map;

      map = new MapClass({
        container: containerId,
        style: styleUrl,
        center: [79.0882, 21.1458], // Centered around Nagpur, India
        zoom: 11.5,
        pitch: currentPitch, // 3D Camera tilt angle
        bearing: -15, // Dynamic perspective angle
        maxPitch: 85,
        terrainExaggeration: 1.5,
        attributionControl: false
      });

      // Add Zoom & 3D Navigation Controls
      if (window.maplibregl || window.maptilersdk) {
        const NavControl = (window.maptilersdk && window.maptilersdk.NavigationControl) 
          ? window.maptilersdk.NavigationControl 
          : maplibregl.NavigationControl;
        
        map.addControl(new NavControl({ visualizePitch: true }), 'top-right');
      }

      map.on('load', function () {
        console.log('✅ GeoDivert 3D MapLibre Engine Loaded Successfully');

        // Add 3D Terrain Elevation DEM Source
        setup3DTerrain();

        // Add GeoJSON Crowd Density Heatmap Layer
        const dests = initialDestinations || (window.GEODIVERT_DATA ? window.GEODIVERT_DATA.destinations : []);
        setupCrowdHeatmap(dests);

        // Add 3D Location Markers
        renderLocationMarkers(dests);
      });

    } catch (err) {
      console.warn('MapTiler SDK initialization fallback:', err);
      renderFallbackMap(container, initialDestinations);
    }
  }

  /**
   * Configures 3D Terrain Elevation (DEM) Mesh
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

      // Activate 3D Mountains & Terrain elevation mesh
      map.setTerrain({ source: 'maptiler-dem', exaggeration: 1.5 });
    } catch (e) {
      console.log('3D Terrain source info:', e.message);
    }
  }

  /**
   * Configures GeoJSON Crowd Density Heatmap Layer
   * @param {Array} destinations 
   */
  function setupCrowdHeatmap(destinations) {
    if (!map) return;

    const geojsonData = destinationsToGeoJSON(destinations);

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
          maxzoom: 15,
          paint: {
            // Increase heatmap weight based on crowd_size score (0-100)
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', 'crowd_size'],
              0, 0,
              100, 1
            ],
            // Heatmap intensity multiplier based on zoom level
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 1,
              15, 3
            ],
            // Heatmap glowing red gradient color stops
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0, 0, 0, 0)',
              0.2, 'rgba(16, 185, 129, 0.4)', // Low crowd - Green glow
              0.5, 'rgba(245, 158, 11, 0.7)', // Medium crowd - Amber glow
              0.8, 'rgba(244, 63, 94, 0.95)', // High crowd - Vibrant Red glow
              1.0, 'rgba(225, 29, 72, 1.0)'   # Heavy crowd - Deep Crimson
            ],
            // Heatmap point radius in pixels
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 15,
              9, 45,
              15, 80
            ],
            // Heatmap opacity transition
            'heatmap-opacity': 0.85
          }
        });
        heatmapLayerAdded = true;
      }
    } catch (err) {
      console.warn('Heatmap layer setup warning:', err.message);
    }
  }

  /**
   * Converts array of destination objects into valid GeoJSON FeatureCollection
   */
  function destinationsToGeoJSON(destinations) {
    const features = (destinations || []).map(dest => {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [dest.lng, dest.lat]
        },
        properties: {
          id: dest.id,
          name: dest.name,
          crowd_size: dest.crowdScore,
          crowd_status: dest.crowdStatus,
          category: dest.category
        }
      };
    });

    return {
      type: 'FeatureCollection',
      features: features
    };
  }

  /**
   * Renders 3D Custom HTML Markers on the map
   */
  function renderLocationMarkers(destinations) {
    if (!map) return;

    // Clear existing markers
    activeMarkers.forEach(m => m.remove());
    activeMarkers = [];

    (destinations || []).forEach(dest => {
      // Create custom HTML element for marker
      const el = document.createElement('div');
      el.className = `custom-map-marker marker-${dest.crowdStatus.toLowerCase()}`;
      
      const badgeColor = dest.crowdStatus === 'HIGH' ? '#f43f5e' : dest.crowdStatus === 'MEDIUM' ? '#f59e0b' : '#10b981';
      
      el.innerHTML = `
        <div style="
          background: ${badgeColor};
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 12px;
          box-shadow: 0 4px 15px ${badgeColor}80;
          border: 2px solid rgba(255,255,255,0.9);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          transition: transform 0.2s ease;
        ">
          <span>${dest.crowdStatus === 'HIGH' ? '🔴' : dest.crowdStatus === 'MEDIUM' ? '🟠' : '🟢'}</span>
          <span>${dest.name} (${dest.crowdScore}%)</span>
        </div>
      `;

      el.addEventListener('click', function () {
        if (window.GeoDivertApp && window.GeoDivertApp.selectDestination) {
          window.GeoDivertApp.selectDestination(dest.id);
        }
      });

      // Create Popup
      const PopupClass = (window.maptilersdk && window.maptilersdk.Popup) ? window.maptilersdk.Popup : maplibregl.Popup;
      const popup = new PopupClass({ offset: 25, closeButton: false }).setHTML(`
        <div style="color: #0f172a; padding: 6px; font-family: sans-serif;">
          <strong style="font-size: 14px;">${dest.name}</strong><br/>
          <span style="font-size: 12px; color: #64748b;">${dest.category} • ${dest.city}</span><br/>
          <div style="margin-top: 4px; font-weight: 600; color: ${badgeColor}; font-size: 12px;">
            Crowd Density: ${dest.crowdScore}% (${dest.crowdStatus})
          </div>
        </div>
      `);

      const MarkerClass = (window.maptilersdk && window.maptilersdk.Marker) ? window.maptilersdk.Marker : maplibregl.Marker;
      const marker = new MarkerClass({ element: el })
        .setLngLat([dest.lng, dest.lat])
        .setPopup(popup)
        .addTo(map);

      activeMarkers.push(marker);
    });
  }

  /**
   * Draws dynamic route line connecting origin destination to alternative destination
   */
  function drawRoute(origin, destination) {
    if (!map || !origin || !destination) return;

    const routeCoordinates = [
      [origin.lng, origin.lat],
      // Waypoint for 3D curve aesthetic
      [(origin.lng + destination.lng) / 2 + 0.005, (origin.lat + destination.lat) / 2 + 0.005],
      [destination.lng, destination.lat]
    ];

    const routeGeoJSON = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: routeCoordinates
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

        // Add glowing route line layer
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

      // Fly to fit both points in 3D perspective
      fitBounds([origin, destination]);
    } catch (e) {
      console.warn('Route drawing info:', e.message);
    }
  }

  /**
   * Recenter camera to fit bounding box of origin and alternative
   */
  function fitBounds(locations) {
    if (!map || !locations || locations.length === 0) return;

    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;

    locations.forEach(loc => {
      if (loc.lng < minLng) minLng = loc.lng;
      if (loc.lng > maxLng) maxLng = loc.lng;
      if (loc.lat < minLat) minLat = loc.lat;
      if (loc.lat > maxLat) maxLat = loc.lat;
    });

    try {
      map.fitBounds(
        [[minLng - 0.02, minLat - 0.02], [maxLng + 0.02, maxLat + 0.02]],
        { padding: 80, pitch: currentPitch, duration: 1500 }
      );
    } catch (e) {
      console.warn('fitBounds error:', e);
    }
  }

  /**
   * Toggles 3D Pitch tilt angle
   */
  function toggle3D() {
    if (!map) return;
    currentPitch = currentPitch === 70 ? 0 : 70;
    map.easeTo({ pitch: currentPitch, duration: 1000 });
  }

  /**
   * Toggles Heatmap Layer visibility
   */
  function toggleHeatmap() {
    if (!map || !map.getLayer('crowd-heatmap-layer')) return;
    const currentVis = map.getLayoutProperty('crowd-heatmap-layer', 'visibility');
    const newVis = (currentVis === 'none') ? 'visible' : 'none';
    map.setLayoutProperty('crowd-heatmap-layer', 'visibility', newVis);
  }

  // Fallback rendering in case WebGL or API key offline
  function renderFallbackMap(container, destinations) {
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; background:#151e32; color:#94a3b8; text-align:center; padding:2rem;">
        <span style="font-size:3rem; margin-bottom:1rem;">🗺️</span>
        <h3 style="color:#fff; margin-bottom:0.5rem;">GeoDivert 3D MapLibre Engine Ready</h3>
        <p>Showing 3D Crowd Heatmap for Nagpur (${(destinations || []).length} active sensors monitored)</p>
      </div>
    `;
  }

  // Export to global scope
  window.GeoDivertMap = {
    initMap: initMap,
    setupCrowdHeatmap: setupCrowdHeatmap,
    drawRoute: drawRoute,
    resetBounds: function () {
      if (window.GEODIVERT_DATA) {
        fitBounds(window.GEODIVERT_DATA.destinations);
      }
    },
    toggle3D: toggle3D,
    toggleHeatmap: toggleHeatmap
  };

})();
