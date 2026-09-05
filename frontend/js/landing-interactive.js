/**
 * GeoDivert - Next-Gen Interactive AI Feature Studio
 * Includes:
 * 1. Web Audio Synthesizer
 * 2. Model 1: Live Dispersal Vector Flow Canvas
 * 3. Model 2: 24h ML Crowd Prediction Neural Curve
 * 4. Model 3: 3D Terrain & Vector Geometry Canvas
 * 5. Model 4: Gemini AI Voice Spectrum & Speech Synthesizer
 * 6. 3D Card Tilt, Number Counters, Spot Telemetry Modal, Custom Cursor
 */

// ==================== 1. WEB AUDIO API SYNTHESIZER ====================
var sfxEnabled = true;
var audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

window.playSfx = function(type) {
  if (!sfxEnabled) return;
  try {
    var ctx = getAudioContext();
    if (!ctx) return;
    var now = ctx.currentTime;

    if (type === 'hover') {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(780, now);
      gain.gain.setValueAtTime(0.012, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'click') {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.07);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'switch') {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.12);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }
  } catch (e) {}
};

window.toggleSfx = function() {
  sfxEnabled = !sfxEnabled;
  var btn = document.getElementById('sfx-btn');
  if (btn) {
    btn.classList.toggle('muted', !sfxEnabled);
    var label = document.getElementById('sfx-label');
    if (label) label.textContent = sfxEnabled ? 'SFX: ON' : 'SFX: OFF';
  }
  if (sfxEnabled) window.playSfx('click');
};


// ==================== 2. STUDIO TAB SWITCHING ====================
window.switchStudioTab = function(tabId, btn) {
  document.querySelectorAll('.studio-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.studio-panel').forEach(function(p) { p.classList.remove('active'); });

  if (btn) btn.classList.add('active');
  var target = document.getElementById('panel-' + tabId);
  if (target) target.classList.add('active');

  window.playSfx('switch');

  // Trigger redraw on canvases after panel becomes visible
  setTimeout(function() {
    if (tabId === 'dispersal' && window.resizeDispersalCanvas) window.resizeDispersalCanvas();
    if (tabId === 'curve' && window.resizeCurveCanvas) window.resizeCurveCanvas();
    if (tabId === 'terrain' && window.resizeTerrainCanvas) window.resizeTerrainCanvas();
    if (tabId === 'gemini' && window.resizeAudioEqCanvas) window.resizeAudioEqCanvas();
  }, 50);
};


// ==================== 3. MODEL 1: DISPERSAL VECTOR FLOW CANVAS ====================
var currentScenario = 'darshan';
var currentHour = 10;

var scenariosData = {
  darshan: {
    title: 'Morning Darshan Surge',
    hotspot: 'Shri Ambadevi Temple',
    hotspotCrowd: 96.4,
    sanctuary: 'Wadali Talao & Eco Park',
    sanctuaryCrowd: 21.1,
    dist: '4.2 km',
    eta: '11 mins',
    flow: '840 tourists/hr',
    drop: '-75.3%',
    desc: 'Redirects pilgrims from temple queue gridlock to serene lakeside nature trails.'
  },
  weekend: {
    title: 'Sunday Hill Station Rush',
    hotspot: 'Chikhaldara Fort & Plateau',
    hotspotCrowd: 93.8,
    sanctuary: 'Kondeshwar Shiva Gorge',
    sanctuaryCrowd: 28.5,
    dist: '14.5 km',
    eta: '25 mins',
    flow: '620 tourists/hr',
    drop: '-65.3%',
    desc: 'Bypasses severe hill station ghat bottlenecks directly into ancient forest waterfalls.'
  },
  monsoon: {
    title: 'Monsoon Waterfall Surge',
    hotspot: 'Chikhaldara Waterfalls',
    hotspotCrowd: 88.2,
    sanctuary: 'Bamboo Garden Botanical Reserve',
    sanctuaryCrowd: 18.7,
    dist: '5.8 km',
    eta: '14 mins',
    flow: '490 tourists/hr',
    drop: '-69.5%',
    desc: 'Guides nature enthusiasts away from slippery cliff lookouts into lush biodiversity gazebos.'
  },
  offpeak: {
    title: 'Early Morning Serenity',
    hotspot: 'Amravati City Center',
    hotspotCrowd: 28.0,
    sanctuary: 'Chatri Talao Heritage Promenade',
    sanctuaryCrowd: 14.2,
    dist: '3.5 km',
    eta: '9 mins',
    flow: '180 tourists/hr',
    drop: '-13.8%',
    desc: 'All regional sanctuaries report serene status with zero congestion across the grid.'
  }
};

window.selectScenario = function(scId, el) {
  currentScenario = scId;
  document.querySelectorAll('.sc-card').forEach(function(c) { c.classList.remove('active'); });
  if (el) el.classList.add('active');

  updateDispersalUI();
  window.playSfx('click');
};

window.onHourScrub = function(val) {
  currentHour = parseInt(val);
  var disp = document.getElementById('scrub-hour-disp');
  if (disp) {
    var period = currentHour >= 12 ? 'PM' : 'AM';
    var hr12 = currentHour % 12 || 12;
    disp.textContent = currentHour + ':00 (' + hr12 + ' ' + period + ')';
  }
  updateDispersalUI();
};

function updateDispersalUI() {
  var data = scenariosData[currentScenario];
  if (!data) return;

  var targetName = document.getElementById('p1-target-name');
  var targetMeta = document.getElementById('p1-target-meta');
  var targetDesc = document.getElementById('p1-target-desc');
  var hudRate = document.getElementById('hud-flow-rate');

  if (targetName) targetName.textContent = data.sanctuary;
  if (targetMeta) targetMeta.textContent = '↓ ' + data.drop + ' Congestion Drop • ' + data.dist + ' (' + data.eta + ')';
  if (targetDesc) targetDesc.textContent = data.desc;
  if (hudRate) hudRate.textContent = 'FLOW: ' + data.flow;
}

// Dispersal Vector Canvas Animation
function initDispersalCanvas() {
  var canvas = document.getElementById('dispersal-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, dpr = window.devicePixelRatio || 1;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
  }
  window.resizeDispersalCanvas = resize;
  resize();
  window.addEventListener('resize', resize);

  // 55 Flow particles along Bezier curve
  var particles = [];
  var P_COUNT = 50;
  for (var i = 0; i < P_COUNT; i++) {
    particles.push({
      t: Math.random(),
      speed: Math.random() * 0.007 + 0.005,
      size: Math.random() * 2 + 1.5,
      offsetY: (Math.random() - 0.5) * 16
    });
  }

  var clock = 0;

  function draw() {
    if (!W || !H) {
      requestAnimationFrame(draw);
      return;
    }
    ctx.clearRect(0, 0, W, H);
    clock += 0.04;

    var pA = { x: W * 0.22, y: H * 0.52 }; // Hotspot Node
    var pB = { x: W * 0.78, y: H * 0.48 }; // Sanctuary Node
    var cp1 = { x: W * 0.42, y: H * 0.18 }; // Curve control point 1
    var cp2 = { x: W * 0.58, y: H * 0.25 }; // Curve control point 2

    // 1. Draw Subtle Topological Grid Lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = 1;
    for (var x = 0; x < W; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (var y = 0; y < H; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 2. Draw Main Dispersal Flow Curve
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, pB.x, pB.y);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. Draw Traveling Vector Particles
    particles.forEach(function(p) {
      p.t += p.speed;
      if (p.t > 1) p.t = 0;

      // Cubic Bezier evaluation
      var t = p.t;
      var invT = 1 - t;
      var bx = invT*invT*invT*pA.x + 3*invT*invT*t*cp1.x + 3*invT*t*t*cp2.x + t*t*t*pB.x;
      var by = invT*invT*invT*pA.y + 3*invT*invT*t*cp1.y + 3*invT*t*t*cp2.y + t*t*t*pB.y + p.offsetY * Math.sin(t * Math.PI);

      // Color shifts from coral (congested) to azure to emerald (serene)
      var color = 'rgba(56, 189, 248, 0.85)';
      if (t < 0.3) color = 'rgba(251, 113, 133, 0.9)';
      else if (t > 0.7) color = 'rgba(52, 211, 153, 0.95)';

      ctx.beginPath();
      ctx.arc(bx, by, p.size, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 4. Draw Hotspot Node (Pulsing Coral Waves)
    var pulseR1 = ((clock * 20) % 40);
    var alpha1 = Math.max(0, 1 - pulseR1 / 40) * 0.6;
    ctx.beginPath();
    ctx.arc(pA.x, pA.y, pulseR1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(251, 113, 133, ' + alpha1 + ')';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pA.x, pA.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fb7185';
    ctx.shadowColor = '#fb7185';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Hotspot Label
    ctx.font = '700 11px Outfit, sans-serif';
    ctx.fillStyle = '#fb7185';
    ctx.textAlign = 'center';
    var scData = scenariosData[currentScenario];
    ctx.fillText(scData ? scData.hotspot : 'Bottleneck', pA.x, pA.y + 22);
    ctx.font = '600 9px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText((scData ? scData.hotspotCrowd : '95') + '% CHOKED', pA.x, pA.y + 34);

    // 5. Draw Sanctuary Node (Tranquil Emerald Waves)
    var pulseR2 = (((clock + 1) * 16) % 36);
    var alpha2 = Math.max(0, 1 - pulseR2 / 36) * 0.6;
    ctx.beginPath();
    ctx.arc(pB.x, pB.y, pulseR2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(52, 211, 153, ' + alpha2 + ')';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pB.x, pB.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#34d399';
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Sanctuary Label
    ctx.font = '700 11px Outfit, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText(scData ? scData.sanctuary : 'Sanctuary', pB.x, pB.y + 22);
    ctx.font = '600 9px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText((scData ? scData.sanctuaryCrowd : '20') + '% SERENE', pB.x, pB.y + 34);

    requestAnimationFrame(draw);
  }
  draw();
}


// ==================== 4. MODEL 2: 24-HOUR ML CROWD NEURAL CURVE ====================
var activeCurveSpot = 'ambadevi';
var scrubCurveX = -1;

window.selectCurveSpot = function(spotKey, btn) {
  activeCurveSpot = spotKey;
  document.querySelectorAll('.p2-spot-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  window.playSfx('click');
};

function initCurveCanvas() {
  var canvas = document.getElementById('curve-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, dpr = window.devicePixelRatio || 1;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
  }
  window.resizeCurveCanvas = resize;
  resize();
  window.addEventListener('resize', resize);

  canvas.addEventListener('mousemove', function(e) {
    var rect = canvas.getBoundingClientRect();
    scrubCurveX = e.clientX - rect.left;
  });
  canvas.addEventListener('mouseleave', function() {
    scrubCurveX = -1;
  });

  // Calculate synthetic 24h curve points
  function getScoreAtHour(hr, spot) {
    if (spot === 'ambadevi') {
      // Temple peaks around 10 AM and 7 PM
      return Math.sin((hr - 6) / 4.5) * 45 + Math.sin((hr - 15) / 3) * 35 + 22;
    } else if (spot === 'chikhaldara') {
      // Hill station peaks in afternoon
      return Math.sin((hr - 8) / 6) * 55 + 38;
    } else {
      // Wadali Talao is serene
      return Math.sin((hr - 10) / 5) * 15 + 18;
    }
  }

  function draw() {
    if (!W || !H) {
      requestAnimationFrame(draw);
      return;
    }
    ctx.clearRect(0, 0, W, H);

    var padX = 40, padY = 30;
    var graphW = W - padX * 2;
    var graphH = H - padY * 2;

    // 1. Draw Zones (Danger, Moderate, Serene)
    var y70 = padY + graphH * (1 - 0.7);
    var y40 = padY + graphH * (1 - 0.4);

    // High zone (70% - 100%)
    ctx.fillStyle = 'rgba(251, 113, 133, 0.04)';
    ctx.fillRect(padX, padY, graphW, y70 - padY);

    // Serene zone (0% - 40%)
    ctx.fillStyle = 'rgba(52, 211, 153, 0.04)';
    ctx.fillRect(padX, y40, graphW, padY + graphH - y40);

    // Threshold lines
    ctx.strokeStyle = 'rgba(251, 113, 133, 0.2)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padX, y70);
    ctx.lineTo(padX + graphW, y70);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(52, 211, 153, 0.2)';
    ctx.beginPath();
    ctx.moveTo(padX, y40);
    ctx.lineTo(padX + graphW, y40);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Plot the Continuous ML Curve
    ctx.beginPath();
    var pts = [];
    for (var h = 0; h <= 24; h += 0.2) {
      var rawScore = getScoreAtHour(h, activeCurveSpot);
      var score = Math.max(5, Math.min(98, rawScore));
      var px = padX + (h / 24) * graphW;
      var py = padY + graphH * (1 - score / 100);
      pts.push({ x: px, y: py, h: h, s: score });
      if (h === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = activeCurveSpot === 'wadali' ? '#34d399' : '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(padX + graphW, padY + graphH);
    ctx.lineTo(padX, padY + graphH);
    ctx.closePath();
    var grad = ctx.createLinearGradient(0, padY, 0, padY + graphH);
    grad.addColorStop(0, activeCurveSpot === 'wadali' ? 'rgba(52, 211, 153, 0.18)' : 'rgba(56, 189, 248, 0.18)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fill();

    // 3. Draw Hour Marks on X Axis
    ctx.font = '600 10px Outfit, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    for (var hourMark = 0; hourMark <= 24; hourMark += 4) {
      var markX = padX + (hourMark / 24) * graphW;
      ctx.fillText(hourMark + ':00', markX, H - 10);
    }

    // 4. Interactive Cursor Scrubber
    var hoverX = scrubCurveX >= padX && scrubCurveX <= padX + graphW ? scrubCurveX : (padX + (14 / 24) * graphW);
    var normT = (hoverX - padX) / graphW;
    var scrubHr = Math.max(0, Math.min(24, normT * 24));
    var currScore = Math.max(5, Math.min(98, getScoreAtHour(scrubHr, activeCurveSpot)));
    var scrubY = padY + graphH * (1 - currScore / 100);

    // Laser Line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hoverX, padY);
    ctx.lineTo(hoverX, padY + graphH);
    ctx.stroke();

    // Dot on Curve
    ctx.beginPath();
    ctx.arc(hoverX, scrubY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = currScore > 70 ? '#fb7185' : '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Tooltip HUD Card
    var tooltipX = hoverX > W - 140 ? hoverX - 130 : hoverX + 15;
    var tooltipY = Math.max(padY + 10, Math.min(H - 80, scrubY - 30));
    ctx.fillStyle = 'rgba(3, 7, 18, 0.88)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tooltipX, tooltipY, 120, 52, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 11px Outfit, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(Math.floor(scrubHr) + ':00 • ' + Math.round(currScore) + '% Crowd', tooltipX + 10, tooltipY + 20);

    ctx.font = '600 9px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = currScore > 70 ? '#fb7185' : currScore < 40 ? '#34d399' : '#fbbf24';
    ctx.fillText(currScore > 70 ? '● REROUTE ACTIVE' : currScore < 40 ? '● SERENE SANCTUARY' : '● MODERATE FLOW', tooltipX + 10, tooltipY + 38);

    requestAnimationFrame(draw);
  }
  draw();
}


// ==================== 5. MODEL 3: 3D TERRAIN & VECTOR GEOMETRY ====================
function initTerrainCanvas() {
  var canvas = document.getElementById('terrain-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, dpr = window.devicePixelRatio || 1;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
  }
  window.resizeTerrainCanvas = resize;
  resize();
  window.addEventListener('resize', resize);

  var mouseX = 0, mouseY = 0;
  canvas.addEventListener('mousemove', function(e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left - W / 2) * 0.003;
    mouseY = (e.clientY - rect.top - H / 2) * 0.003;
  });

  var vehicleProgress = 0;

  function draw() {
    if (!W || !H) {
      requestAnimationFrame(draw);
      return;
    }
    ctx.clearRect(0, 0, W, H);

    var rows = 14, cols = 18;
    var stepX = W / (cols + 2);
    var stepY = H / (rows + 4);
    var cx = W / 2, cy = H / 2;

    vehicleProgress = (vehicleProgress + 0.006) % 1;

    // 3D Isometric Terrain Projection
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 1;

    var grid = [];
    for (var r = 0; r <= rows; r++) {
      grid[r] = [];
      for (var c = 0; c <= cols; c++) {
        // Elevation profile using sine waves
        var elev = Math.sin(c * 0.45 + mouseX * 5) * Math.cos(r * 0.5 + mouseY * 5) * 28;
        var px = (c - cols / 2) * stepX * 1.3;
        var pz = (r - rows / 2) * stepY * 1.3;
        var py = -elev;

        // Rotate around X and Y
        var rotX = 0.85 + mouseY;
        var rotY = mouseX;

        var cosY = Math.cos(rotY), sinY = Math.sin(rotY);
        var x1 = px * cosY + pz * sinY;
        var z1 = -px * sinY + pz * cosY;

        var cosX = Math.cos(rotX), sinX = Math.sin(rotX);
        var y2 = py * cosX - z1 * sinX;
        var z2 = py * sinX + z1 * cosX;

        var fov = 450;
        var scale = fov / (fov + z2 + 250);
        grid[r][c] = { x: cx + x1 * scale, y: cy + y2 * scale + 20 };
      }
    }

    // Draw Grid Wireframe
    for (var r = 0; r <= rows; r++) {
      ctx.beginPath();
      for (var c = 0; c <= cols; c++) {
        var pt = grid[r][c];
        if (c === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
    for (var c = 0; c <= cols; c++) {
      ctx.beginPath();
      for (var r = 0; r <= rows; r++) {
        var pt = grid[r][c];
        if (r === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    // Glowing Turn-by-Turn Road Vector through Terrain
    var roadPoints = [
      grid[2][3], grid[4][6], grid[7][9], grid[10][13], grid[12][16]
    ];
    ctx.beginPath();
    for (var k = 0; k < roadPoints.length; k++) {
      if (k === 0) ctx.moveTo(roadPoints[k].x, roadPoints[k].y);
      else ctx.lineTo(roadPoints[k].x, roadPoints[k].y);
    }
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Moving Vehicle Node
    var seg = Math.floor(vehicleProgress * (roadPoints.length - 1));
    var segT = (vehicleProgress * (roadPoints.length - 1)) - seg;
    var pStart = roadPoints[seg];
    var pEnd = roadPoints[seg + 1];
    var vx = pStart.x + (pEnd.x - pStart.x) * segT;
    var vy = pStart.y + (pEnd.y - pStart.y) * segT;

    ctx.beginPath();
    ctx.arc(vx, vy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;

    requestAnimationFrame(draw);
  }
  draw();
}


// ==================== 6. MODEL 4: GEMINI AI VOICE EQUALIZER ====================
var isSpeaking = false;

function initAudioEqCanvas() {
  var canvas = document.getElementById('audio-eq-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, dpr = window.devicePixelRatio || 1;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
  }
  window.resizeAudioEqCanvas = resize;
  resize();
  window.addEventListener('resize', resize);

  var clock = 0;
  var BARS = 28;

  function draw() {
    if (!W || !H) {
      requestAnimationFrame(draw);
      return;
    }
    ctx.clearRect(0, 0, W, H);
    clock += isSpeaking ? 0.12 : 0.03;

    var barW = (W - 20) / BARS;
    for (var i = 0; i < BARS; i++) {
      var factor = isSpeaking ? (Math.sin(clock + i * 0.5) * 0.4 + 0.55) : (Math.sin(clock + i * 0.3) * 0.15 + 0.2);
      var barH = Math.max(6, H * 0.8 * factor);
      var bx = 10 + i * barW;
      var by = H - barH - 8;

      var grad = ctx.createLinearGradient(0, by, 0, by + barH);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(1, '#34d399');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(bx + 2, by, barW - 4, barH, 4);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
}

window.playGeminiStory = function() {
  if (!('speechSynthesis' in window)) {
    alert('Web Speech API is not supported in this browser.');
    return;
  }
  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    document.getElementById('audio-btn-label').textContent = 'Play Voice Story';
    return;
  }

  var text = "Welcome to Wadali Talao, Amravati. Created in 1889 as a serene freshwater reservoir, this sanctuary offers tranquil lake promenades, shaded botanical gazebos, and clean fresh air far away from crowded temple queues.";
  var utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1.0;

  utter.onstart = function() {
    isSpeaking = true;
    document.getElementById('audio-btn-label').textContent = 'Pause Narration';
  };
  utter.onend = function() {
    isSpeaking = false;
    document.getElementById('audio-btn-label').textContent = 'Play Voice Story';
  };
  utter.onerror = function() {
    isSpeaking = false;
    document.getElementById('audio-btn-label').textContent = 'Play Voice Story';
  };

  window.speechSynthesis.speak(utter);
  window.playSfx('click');
};


// ==================== 7. SPOT TELEMETRY MODAL ====================
var spotDetails = {
  ambadevi: {
    name: 'Shri Ambadevi & Ekvira Mandir',
    category: 'Sacred Heritage Temple (12th Century)',
    crowd: 95.4,
    status: 'HIGH',
    statusClass: 'ssh',
    badgeClass: 'bsh',
    icon: '🙏',
    bestTime: '06:00 AM - 07:30 AM',
    eta: '6 mins from city center',
    desc: 'Ancient shrine dedicated to Goddess Amba and Ekvira, famous for Navratri and mythological ties to Lord Krishna. The central sanctum experiences extreme congestion during holiday hours.',
    merchant: {
      name: 'Raghuveer Sweets & Heritage Tea House',
      desc: 'Local family confectionery offering hot cardamom tea & traditional pedas.',
      discount: '15% Off with GeoDivert Pass'
    }
  },
  wadali: {
    name: 'Wadali Talao & Eco Botanical Sanctuary',
    category: 'Scenic Lake & Nature Reserve',
    crowd: 21.1,
    status: 'SERENE',
    statusClass: 'ss',
    badgeClass: 'bss',
    icon: '🌊',
    bestTime: 'Anytime • Sunset Recommended',
    eta: '11 mins (4.2 km)',
    desc: 'Sprawling clean water reservoir flanked by lush manicured botanical gardens, winding lakeside paths, and a dedicated bird sanctuary. Perfect serene escape for tourists and families.',
    merchant: {
      name: 'Lakeview Bamboo Cafe & Bakery',
      desc: 'Lakeside garden cafe serving organic herbal infusions and wood-fired pastries.',
      discount: '15% Off with GeoDivert Pass'
    }
  },
  bamboo: {
    name: 'Bamboo Garden Botanical Reserve',
    category: 'Botanical Biodiversity Reserve',
    crowd: 18.7,
    status: 'SERENE',
    statusClass: 'ss',
    badgeClass: 'bss',
    icon: '🎋',
    bestTime: '08:00 AM - 05:00 PM',
    eta: '14 mins (5.8 km)',
    desc: 'Premier conservation garden harboring over 60 indigenous bamboo varieties, medicinal herb arboretums, and tranquil shaded nature trails with open-air gazebos.',
    merchant: {
      name: 'Vidarbha Organic Honey & Handicrafts',
      desc: 'Cooperative store supporting local Melghat forest tribes and bamboo artisans.',
      discount: '20% Off Artisanal Souvenirs'
    }
  },
  kondeshwar: {
    name: 'Kondeshwar Shiva Temple & Forest Gorge',
    category: 'Ancient Forest Gorge & Waterfall',
    crowd: 29.2,
    status: 'SERENE',
    statusClass: 'ss',
    badgeClass: 'bss',
    icon: '⛰️',
    bestTime: '09:00 AM - 04:30 PM',
    eta: '25 mins (14.5 km)',
    desc: 'Hemadpanthi stone architectural marvel built in deep forest terrain around a cascade waterfall. A spiritual haven surrounded by dramatic basalt cliffs and monsoon pools.',
    merchant: {
      name: 'Kondeshwar Valley Herbal Refreshments',
      desc: 'Rustic rest stop serving fresh sugarcane juice and Maharashtrian spiced poha.',
      discount: 'Complimentary Chai with Meal'
    }
  },
  chikhaldara: {
    name: 'Chikhaldara Hill Station & Gavilgad Fort',
    category: 'Hill Station & Historical Fort',
    crowd: 92.0,
    status: 'HIGH',
    statusClass: 'ssh',
    badgeClass: 'bsh',
    icon: '☕',
    bestTime: 'Early Weekday Mornings',
    eta: '1 hr 45 mins (84 km)',
    desc: 'The only coffee growing hill station in Vidarbha, perched at 1,118m elevation with cliff-top views of Melghat Tiger Reserve. Severe holiday traffic snarls occur on winding ghat roads.',
    merchant: {
      name: 'Satpura Coffee Estate & Roastery',
      desc: 'Artisanal hill station plantation shop brewing fresh single-origin Arabica coffee.',
      discount: '10% Off Coffee Beans'
    }
  },
  chatri: {
    name: 'Chatri Talao Heritage Promenade',
    category: 'Heritage Lake & Promenade',
    crowd: 48.3,
    status: 'MODERATE',
    statusClass: 'ssm',
    badgeClass: 'bsm',
    icon: '🌅',
    bestTime: '05:30 PM - 08:00 PM',
    eta: '9 mins (3.5 km)',
    desc: 'Historic reservoir built in the British Raj era featuring an ornate stone pavilion (Chatri), evening solar illumination, children play parks, and lakeside jogging tracks.',
    merchant: {
      name: 'Royal Heritage Chat & Street Delights',
      desc: 'Authentic local street food kiosk serving hot bhelpuri and fresh roasted corn.',
      discount: '15% Off with GeoDivert Pass'
    }
  }
};

window.openSpotModal = function(spotKey) {
  var data = spotDetails[spotKey];
  if (!data) return;

  var modal = document.getElementById('telemetry-modal');
  if (!modal) return;

  document.getElementById('tm-icon').textContent = data.icon;
  document.getElementById('tm-title').textContent = data.name;
  document.getElementById('tm-cat').textContent = data.category;
  document.getElementById('tm-crowd').textContent = data.crowd + '%';
  document.getElementById('tm-crowd').className = 'tm-stat-val ' + data.statusClass;
  document.getElementById('tm-status-badge').textContent = data.status;
  document.getElementById('tm-status-badge').className = 'lb ' + data.badgeClass;
  document.getElementById('tm-time').textContent = data.bestTime;
  document.getElementById('tm-eta').textContent = data.eta;
  document.getElementById('tm-desc').textContent = data.desc;

  if (data.merchant) {
    document.getElementById('tm-mname').textContent = data.merchant.name;
    document.getElementById('tm-mdesc').textContent = data.merchant.desc + ' • ' + data.merchant.discount;
  }

  var launchBtn = document.getElementById('tm-launch');
  if (launchBtn) {
    launchBtn.onclick = function(e) {
      addRipple(e, launchBtn);
      setTimeout(function() { launchAppWithSpot(spotKey); }, 400);
    };
  }

  modal.classList.add('active');
  window.playSfx('click');
};

window.closeSpotModal = function() {
  var modal = document.getElementById('telemetry-modal');
  if (modal) modal.classList.remove('active');
  window.playSfx('click');
};


// ==================== 8. 3D CARD TILT & SPECULAR GLARE ====================
function init3DCardTilt() {
  var tiltCards = document.querySelectorAll('.fc, .lcard, .studio-stage');

  tiltCards.forEach(function(card) {
    card.addEventListener('mousemove', function(e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var cx = rect.width / 2;
      var cy = rect.height / 2;

      var dx = (x - cx) / cx;
      var dy = (y - cy) / cy;

      card.style.transform = 'perspective(1000px) rotateX(' + (-dy * 5) + 'deg) rotateY(' + (dx * 5) + 'deg) translateY(-3px)';
      card.style.setProperty('--mx', ((x / rect.width) * 100) + '%');
      card.style.setProperty('--my', ((y / rect.height) * 100) + '%');
    });

    card.addEventListener('mouseleave', function() {
      card.style.transform = '';
      card.style.setProperty('--mx', '50%');
      card.style.setProperty('--my', '50%');
    });
  });
}


// ==================== 9. NUMBER COUNTERS ON SCROLL ====================
function initNumberCounters() {
  var counterEls = document.querySelectorAll('[data-counter]');
  if (!counterEls.length) return;

  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var el = entry.target;
        var targetVal = parseFloat(el.getAttribute('data-counter'));
        var prefix = el.getAttribute('data-prefix') || '';
        var suffix = el.getAttribute('data-suffix') || '';
        var decimals = parseInt(el.getAttribute('data-decimals') || '0');
        var duration = 1500;
        var startTime = null;

        function step(timestamp) {
          if (!startTime) startTime = timestamp;
          var progress = Math.min((timestamp - startTime) / duration, 1);
          var ease = 1 - Math.pow(1 - progress, 3);
          var current = (targetVal * ease).toFixed(decimals);
          el.textContent = prefix + current + suffix;
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            el.textContent = prefix + targetVal.toFixed(decimals) + suffix;
          }
        }
        requestAnimationFrame(step);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.2 });

  counterEls.forEach(function(el) { obs.observe(el); });
}


// ==================== 10. CURSOR & MAGNETISM ====================
function initCursorAndMagnetism() {
  var cursor = document.getElementById('cursor-glow');
  if (!cursor) return;

  var mouseX = -100, mouseY = -100;
  var curX = -100, curY = -100;

  window.addEventListener('mousemove', function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function renderCursor() {
    curX += (mouseX - curX) * 0.2;
    curY += (mouseY - curY) * 0.2;
    cursor.style.left = curX + 'px';
    cursor.style.top = curY + 'px';
    requestAnimationFrame(renderCursor);
  }
  renderCursor();

  var hoverTargets = document.querySelectorAll('button, a, .fc, .lcard, .studio-tab, .sc-card, .hud-btn, input[type=range]');
  hoverTargets.forEach(function(t) {
    t.addEventListener('mouseenter', function() {
      cursor.classList.add('hovering');
      window.playSfx('hover');
    });
    t.addEventListener('mouseleave', function() {
      cursor.classList.remove('hovering');
    });
  });

  var magneticBtns = document.querySelectorAll('.bp, .lb2, .nc, .p1-route-btn');
  magneticBtns.forEach(function(btn) {
    btn.addEventListener('mousemove', function(e) {
      var rect = btn.getBoundingClientRect();
      var bx = e.clientX - (rect.left + rect.width / 2);
      var by = e.clientY - (rect.top + rect.height / 2);
      btn.style.transform = 'translate(' + (bx * 0.2) + 'px, ' + (by * 0.2) + 'px)';
    });
    btn.addEventListener('mouseleave', function() {
      btn.style.transform = '';
    });
  });
}


// ==================== 11. TYPEWRITER & STARFIELD ====================
function initTypewriter() {
  var el = document.getElementById('tw');
  if (!el) return;
  var phrases = ['Discover Serenity.', 'Escape the Crowd.', 'Find Hidden Gems.', 'Explore Amravati AI.'];
  var pi = 0, ci = 0, deleting = false;

  function tick() {
    var cur = phrases[pi];
    if (!deleting) {
      ci++;
      el.textContent = cur.slice(0, ci);
      if (ci === cur.length) {
        deleting = true;
        setTimeout(tick, 2400);
        return;
      }
      setTimeout(tick, 75);
    } else {
      ci--;
      el.textContent = cur.slice(0, ci);
      if (ci === 0) {
        deleting = false;
        pi = (pi + 1) % phrases.length;
        setTimeout(tick, 400);
        return;
      }
      setTimeout(tick, 40);
    }
  }
  setTimeout(tick, 2000);
}

function initStarfield() {
  var container = document.getElementById('stl');
  if (!container) return;
  for (var i = 0; i < 90; i++) {
    var s = document.createElement('div');
    s.className = 'st';
    var size = Math.random() * 2 + 0.6;
    s.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (Math.random() * 100) + '%;top:' + (Math.random() * 100) + '%;--dur:' + (2.5 + Math.random() * 4) + 's;--delay:-' + (Math.random() * 6) + 's;';
    container.appendChild(s);
  }
}

function initScrollReveals() {
  var revealEls = document.querySelectorAll('.fc, .ps, .lcard');
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var delay = parseInt(entry.target.dataset.delay || 0);
        setTimeout(function() {
          entry.target.classList.add('iv');
        }, delay);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach(function(el) { obs.observe(el); });
}

window.addRipple = function(e, btn) {
  var r = document.createElement('span');
  r.className = 'rp';
  var rc = btn.getBoundingClientRect();
  r.style.left = (e.clientX - rc.left) + 'px';
  r.style.top = (e.clientY - rc.top) + 'px';
  btn.appendChild(r);
  r.addEventListener('animationend', function() { r.remove(); });
};

window.launchApp = function() {
  window.playSfx('click');
  var overlay = document.getElementById('to');
  if (overlay) overlay.classList.add('active');
  setTimeout(function() {
    window.location.href = '/map';
  }, 1100);
};

window.launchAppWithSpot = function(spotKey) {
  window.playSfx('click');
  var overlay = document.getElementById('to');
  if (overlay) overlay.classList.add('active');
  setTimeout(function() {
    window.location.href = '/map?spot=' + encodeURIComponent(spotKey);
  }, 1100);
};


// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
  initTypewriter();
  initStarfield();
  initScrollReveals();
  init3DCardTilt();
  initNumberCounters();
  initCursorAndMagnetism();

  // Initialize all 4 interactive models
  initDispersalCanvas();
  initCurveCanvas();
  initTerrainCanvas();
  initAudioEqCanvas();
  updateDispersalUI();
});
