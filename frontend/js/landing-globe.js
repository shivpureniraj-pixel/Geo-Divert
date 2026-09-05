/**
 * GeoDivert 3D Geospatial Hologram & Digital Twin Model
 * Pure HTML5 Canvas 3D Mathematical Projection Engine (Zero External Dependencies)
 */
(function() {
  var canvas = document.getElementById('globe3d-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W, H, cx, cy, dpr = window.devicePixelRatio || 1;
  var R = 170; // 3D Sphere radius
  var camDist = 550;
  var zoom = 1.0;
  var targetZoom = 1.0;

  // Rotation angles & inertia physics
  var rotX = -0.32;
  var rotY = 1.25;
  var vx = 0;
  var vy = 0.003;
  var isDragging = false;
  var lastMouseX = 0;
  var lastMouseY = 0;
  var autoSpin = true;
  var showArcs = true;

  // Interactive mouse highlight in 3D
  var mouseX = -999;
  var mouseY = -999;

  // Target lock interpolation
  var isTargeting = false;
  var targetRotX = 0;
  var targetRotY = 0;

  // 1. Generate Fibonacci sphere point lattice (420 nodes)
  var N = 420;
  var nodes = [];
  for (var i = 0; i < N; i++) {
    var phi = Math.acos(-1 + (2 * i) / N);
    var theta = Math.sqrt(N * Math.PI) * phi;
    nodes.push({
      x: R * Math.cos(theta) * Math.sin(phi),
      y: R * Math.sin(theta) * Math.sin(phi),
      z: R * Math.cos(phi),
      baseR: Math.random() * 1.5 + 1.2
    });
  }

  // 2. Generate 3D Latitude and Longitude wireframe rings
  var rings = [];
  var lats = [-50, -25, 0, 25, 50];
  lats.forEach(function(latDeg) {
    var latRad = (latDeg * Math.PI) / 180;
    var ringR = R * Math.cos(latRad);
    var ringY = -R * Math.sin(latRad);
    var pts = [];
    var segments = 48;
    for (var j = 0; j <= segments; j++) {
      var angle = (j / segments) * Math.PI * 2;
      pts.push({
        x: ringR * Math.sin(angle),
        y: ringY,
        z: ringR * Math.cos(angle)
      });
    }
    rings.push({ pts: pts, isEquator: latDeg === 0 });
  });

  // Longitude meridians
  var lons = [0, 45, 90, 135, 180, 225, 270, 315];
  lons.forEach(function(lonDeg) {
    var lonRad = (lonDeg * Math.PI) / 180;
    var pts = [];
    var segments = 48;
    for (var j = 0; j <= segments; j++) {
      var lat = (-90 + (j / segments) * 180) * Math.PI / 180;
      pts.push({
        x: R * Math.cos(lat) * Math.sin(lonRad),
        y: -R * Math.sin(lat),
        z: R * Math.cos(lat) * Math.cos(lonRad)
      });
    }
    rings.push({ pts: pts, isEquator: false });
  });

  // 3. Tilted Satellite Orbit Ring
  var satAngle = 0;
  var satOrbitR = R * 1.28;

  // 4. Geospatial Hotspots (Real Amravati tourist spots coordinates)
  function geoTo3D(lat, lon, r) {
    var latR = (lat * Math.PI) / 180;
    var lonR = (lon * Math.PI) / 180;
    return {
      x: r * Math.cos(latR) * Math.sin(lonR),
      y: -r * Math.sin(latR),
      z: r * Math.cos(latR) * Math.cos(lonR)
    };
  }

  var hotspots = [
    {
      id: 'hub',
      name: 'Amravati Central Hub',
      sub: '20.932° N, 77.752° E',
      lat: 20.9320, lon: 77.7523,
      type: 'hub',
      crowd: 48,
      color: '#00f2ff'
    },
    {
      id: 'ambadevi',
      name: 'Shri Ambadevi Temple',
      sub: 'Congested Hotspot',
      lat: 20.9345, lon: 77.7510,
      type: 'congested',
      crowd: 95.4,
      color: '#f43f5e'
    },
    {
      id: 'wadali',
      name: 'Wadali Talao Sanctuary',
      sub: 'Optimal Dispersal Spot',
      lat: 20.9412, lon: 77.7780,
      type: 'serene',
      crowd: 21.1,
      color: '#10b981'
    },
    {
      id: 'bamboo',
      name: 'Bamboo Garden Reserve',
      sub: 'Eco Botanical Reserve',
      lat: 20.9150, lon: 77.7420,
      type: 'serene',
      crowd: 18.7,
      color: '#10b981'
    },
    {
      id: 'chikhaldara',
      name: 'Chikhaldara Fort',
      sub: 'Hill Station Peak',
      lat: 21.4012, lon: 77.3248,
      type: 'congested',
      crowd: 92.0,
      color: '#f43f5e'
    },
    {
      id: 'kondeshwar',
      name: 'Kondeshwar Gorge',
      sub: 'Forest Waterfall',
      lat: 20.8120, lon: 77.8210,
      type: 'serene',
      crowd: 29.2,
      color: '#00f2ff'
    }
  ];

  hotspots.forEach(function(h) {
    var p = geoTo3D(h.lat, h.lon, R);
    h.x = p.x;
    h.y = p.y;
    h.z = p.z;
    h.pulse = 0;
  });

  // 5. Crowd Dispersal Arcs (Curving high in 3D above the surface)
  var arcs = [
    { from: 'ambadevi', to: 'wadali', progress: 0, color: '#00f2ff' },
    { from: 'ambadevi', to: 'bamboo', progress: 0.45, color: '#10b981' },
    { from: 'chikhaldara', to: 'kondeshwar', progress: 0.72, color: '#38bdf8' }
  ];

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    cx = W / 2;
    cy = H / 2;
  }

  // 3D Point transformation & projection
  function project(p, rx, ry) {
    // Rotate around Y
    var cosY = Math.cos(ry), sinY = Math.sin(ry);
    var x1 = p.x * cosY + p.z * sinY;
    var z1 = -p.x * sinY + p.z * cosY;
    var y1 = p.y;

    // Rotate around X
    var cosX = Math.cos(rx), sinX = Math.sin(rx);
    var y2 = y1 * cosX - z1 * sinX;
    var z2 = y1 * sinX + z1 * cosX;
    var x2 = x1;

    // Perspective projection
    var scale = (camDist / (camDist + z2)) * zoom;
    return {
      x: cx + x2 * scale,
      y: cy + y2 * scale,
      z: z2,
      scale: scale,
      visible: z2 > -R * 0.4
    };
  }

  // Pulse timer for holographic waves
  var pulseClock = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    pulseClock += 0.04;

    // Handle smooth target lock interpolation
    if (isTargeting) {
      rotX += (targetRotX - rotX) * 0.08;
      rotY += (targetRotY - rotY) * 0.08;
      if (Math.abs(rotX - targetRotX) < 0.005 && Math.abs(rotY - targetRotY) < 0.005) {
        isTargeting = false;
      }
    } else if (!isDragging && autoSpin) {
      rotY += vy;
      rotX += vx;
      vx *= 0.96;
      vy = vy * 0.98 + 0.002 * 0.02; // Return to gentle auto-spin
    } else if (!isDragging) {
      rotY += vy;
      rotX += vx;
      vx *= 0.92;
      vy *= 0.92;
    }

    // Zoom easing
    zoom += (targetZoom - zoom) * 0.1;

    // A. Draw Outer Glow Halo
    var grad = ctx.createRadialGradient(cx, cy, R * 0.6 * zoom, cx, cy, R * 1.35 * zoom);
    grad.addColorStop(0, 'rgba(0, 242, 255, 0.06)');
    grad.addColorStop(0.7, 'rgba(0, 242, 255, 0.015)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.35 * zoom, 0, Math.PI * 2);
    ctx.fill();

    // B. Draw 3D Latitude & Longitude Wireframe Rings
    ctx.lineWidth = 0.8;
    rings.forEach(function(ring) {
      var pts = ring.pts;
      ctx.beginPath();
      var started = false;
      for (var i = 0; i < pts.length; i++) {
        var pr = project(pts[i], rotX, rotY);
        if (pr.visible) {
          var alpha = Math.max(0.04, (pr.z + R) / (2.5 * R));
          ctx.strokeStyle = ring.isEquator ? 'rgba(0, 242, 255, ' + (alpha * 0.8) + ')' : 'rgba(56, 189, 248, ' + (alpha * 0.35) + ')';
          if (!started) {
            ctx.moveTo(pr.x, pr.y);
            started = true;
          } else {
            ctx.lineTo(pr.x, pr.y);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();
    });

    // C. Draw Tilted Satellite Orbit Ring
    satAngle += 0.018;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.18)';
    ctx.lineWidth = 1;
    var satSegments = 64;
    var tiltCos = Math.cos(0.55), tiltSin = Math.sin(0.55);
    for (var k = 0; k <= satSegments; k++) {
      var a = (k / satSegments) * Math.PI * 2;
      var ox = satOrbitR * Math.cos(a);
      var oy = satOrbitR * Math.sin(a) * tiltSin;
      var oz = satOrbitR * Math.sin(a) * tiltCos;
      var op = project({ x: ox, y: oy, z: oz }, rotX, rotY);
      if (k === 0) ctx.moveTo(op.x, op.y);
      else ctx.lineTo(op.x, op.y);
    }
    ctx.stroke();

    // Orbiting Satellite Probe
    var sx = satOrbitR * Math.cos(satAngle);
    var sy = satOrbitR * Math.sin(satAngle) * tiltSin;
    var sz = satOrbitR * Math.sin(satAngle) * tiltCos;
    var satProj = project({ x: sx, y: sy, z: sz }, rotX, rotY);
    if (satProj.visible) {
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(satProj.x, satProj.y, 3 * satProj.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Small probe telemetry label
      ctx.font = '600 9px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
      ctx.fillText('SAT-01 [AMR]', satProj.x + 8, satProj.y + 3);
    }

    // D. Draw 3D Point Nodes (Fibonacci Mesh)
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var pr = project(node, rotX, rotY);

      if (pr.visible) {
        var normZ = (pr.z + R) / (2 * R); // 0 (back) to 1 (front)
        var alpha = Math.max(0.12, Math.min(1, normZ * 0.95));

        // Proximity to mouse interaction
        var dx = pr.x - mouseX;
        var dy = pr.y - mouseY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var hoverFactor = dist < 50 ? (50 - dist) / 50 : 0;

        var ptR = (node.baseR + hoverFactor * 2) * pr.scale;

        ctx.beginPath();
        ctx.arc(pr.x, pr.y, ptR, 0, Math.PI * 2);

        if (normZ > 0.6) {
          ctx.fillStyle = 'rgba(0, 242, 255, ' + alpha + ')';
          if (normZ > 0.85) {
            ctx.shadowColor = 'rgba(0, 242, 255, 0.8)';
            ctx.shadowBlur = 6;
          }
        } else {
          ctx.fillStyle = 'rgba(56, 189, 248, ' + (alpha * 0.45) + ')';
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // E. Draw 3D Crowd Dispersal Arcs & Traveling Photons
    if (showArcs) {
      arcs.forEach(function(arc) {
        var fromSpot = hotspots.find(function(h) { return h.id === arc.from; });
        var toSpot = hotspots.find(function(h) { return h.id === arc.to; });
        if (!fromSpot || !toSpot) return;

        // Sample 32 points along a 3D parabolic arc
        var arcPts = [];
        var numSamples = 28;
        for (var s = 0; s <= numSamples; s++) {
          var t = s / numSamples;
          // Midpoint lifts outward by +60 units in 3D
          var mx = (1 - t) * fromSpot.x + t * toSpot.x;
          var my = (1 - t) * fromSpot.y + t * toSpot.y;
          var mz = (1 - t) * fromSpot.z + t * toSpot.z;
          var lift = Math.sin(t * Math.PI) * 65;
          // Direction away from sphere center
          var len = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
          var nx = mx / len, ny = my / len, nz = mz / len;

          arcPts.push({
            x: mx + nx * lift,
            y: my + ny * lift,
            z: mz + nz * lift
          });
        }

        // Render Arc Curve
        ctx.beginPath();
        var arcVisible = false;
        for (var p = 0; p < arcPts.length; p++) {
          var pr = project(arcPts[p], rotX, rotY);
          if (p === 0) {
            ctx.moveTo(pr.x, pr.y);
            if (pr.z > -R * 0.3) arcVisible = true;
          } else {
            ctx.lineTo(pr.x, pr.y);
            if (pr.z > -R * 0.3) arcVisible = true;
          }
        }
        if (arcVisible) {
          ctx.strokeStyle = arc.color === '#f43f5e' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(0, 242, 255, 0.45)';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // Traveling Photon Particles along Arc
          arc.progress = (arc.progress + 0.012) % 1.0;
          var photonIndex = Math.floor(arc.progress * (arcPts.length - 1));
          var photonPt = arcPts[photonIndex];
          var photonProj = project(photonPt, rotX, rotY);
          if (photonProj.visible && photonProj.z > -R * 0.2) {
            ctx.beginPath();
            ctx.arc(photonProj.x, photonProj.y, 3.5 * photonProj.scale, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.shadowColor = arc.color;
            ctx.shadowBlur = 14;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });
    }

    // F. Draw Amravati Hotspot Beacons & Holographic Rings
    hotspots.forEach(function(h) {
      var pr = project(h, rotX, rotY);

      if (pr.visible && pr.z > -R * 0.2) {
        var isFront = pr.z > 0;
        var beaconScale = pr.scale;

        // Concentric Holographic Radar Wave
        var waveR = ((pulseClock * 18 + (h.id.length * 5)) % 32) * beaconScale;
        var waveAlpha = Math.max(0, 1 - waveR / (32 * beaconScale));
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, waveR, 0, Math.PI * 2);
        ctx.strokeStyle = h.color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = waveAlpha * (isFront ? 0.8 : 0.3);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Solid Center Beacon Dot
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, (h.type === 'hub' ? 5 : 3.8) * beaconScale, 0, Math.PI * 2);
        ctx.fillStyle = h.color;
        ctx.shadowColor = h.color;
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Floating Callout Pin & Text (Visible when facing forward)
        if (pr.z > 20) {
          var pinOffset = 18 * beaconScale;
          ctx.beginPath();
          ctx.moveTo(pr.x, pr.y);
          ctx.lineTo(pr.x + pinOffset, pr.y - pinOffset);
          ctx.lineTo(pr.x + pinOffset + 35, pr.y - pinOffset);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.font = '700 10px Outfit, sans-serif';
          ctx.fillStyle = h.color;
          ctx.fillText(h.name, pr.x + pinOffset + 4, pr.y - pinOffset - 4);

          ctx.font = '500 8.5px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(h.sub + ' (' + h.crowd + '%)', pr.x + pinOffset + 4, pr.y - pinOffset + 8);
        }
      }
    });

    // G. Update HUD Telemetry Readouts
    var yawDeg = Math.round(((rotY % (Math.PI * 2)) * 180) / Math.PI);
    var pitchDeg = Math.round(((rotX % (Math.PI * 2)) * 180) / Math.PI);
    var yawEl = document.getElementById('hud-yaw');
    var pitchEl = document.getElementById('hud-pitch');
    if (yawEl) yawEl.textContent = 'YAW: ' + yawDeg + '°';
    if (pitchEl) pitchEl.textContent = 'PITCH: ' + pitchDeg + '°';

    requestAnimationFrame(draw);
  }

  // Event Listeners for Interaction
  function onPointerDown(e) {
    isDragging = true;
    autoSpin = false;
    isTargeting = false;
    lastMouseX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    lastMouseY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    canvas.style.cursor = 'grabbing';
  }

  function onPointerMove(e) {
    var clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    var clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    var rect = canvas.getBoundingClientRect();
    mouseX = clientX - rect.left;
    mouseY = clientY - rect.top;

    if (isDragging) {
      var dx = clientX - lastMouseX;
      var dy = clientY - lastMouseY;
      rotY += dx * 0.007;
      rotX += dy * 0.007;
      vy = dx * 0.007;
      vx = dy * 0.007;
      lastMouseX = clientX;
      lastMouseY = clientY;
    }
  }

  function onPointerUp() {
    isDragging = false;
    canvas.style.cursor = 'grab';
    setTimeout(function() {
      if (!isDragging && !isTargeting) autoSpin = true;
    }, 4000);
  }

  function onWheel(e) {
    e.preventDefault();
    targetZoom += (e.deltaY < 0 ? 0.08 : -0.08);
    targetZoom = Math.max(0.75, Math.min(1.5, targetZoom));
  }

  // Target Lock on Amravati
  window.targetAmravati = function() {
    isTargeting = true;
    autoSpin = false;
    // Angles to face India/Amravati directly
    targetRotX = -0.34;
    targetRotY = 1.32;
    targetZoom = 1.25;
    if (window.playSfx) window.playSfx('lock');
  };

  // Toggle Auto Spin
  window.toggleSpin = function() {
    autoSpin = !autoSpin;
    var btn = document.getElementById('btn-spin-toggle');
    if (btn) btn.textContent = autoSpin ? 'PAUSE SPIN' : 'RESUME SPIN';
    if (window.playSfx) window.playSfx('click');
  };

  // Toggle Arcs
  window.toggleArcs = function() {
    showArcs = !showArcs;
    var btn = document.getElementById('btn-arcs-toggle');
    if (btn) btn.textContent = showArcs ? 'HIDE ARCS' : 'SHOW ARCS';
    if (window.playSfx) window.playSfx('click');
  };

  canvas.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  canvas.addEventListener('touchstart', onPointerDown, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });
  window.addEventListener('touchend', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  window.addEventListener('resize', resize);

  resize();
  draw();
})();
