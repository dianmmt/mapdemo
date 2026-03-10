console.log("map")
const BACKEND_HOST = window.location.hostname || 'localhost';
const BACKEND_PORT = 5000;
const BACKEND_BASE_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
const API_URL = `${BACKEND_BASE_URL}/location`;
const UAV_API_URL = `${BACKEND_BASE_URL}/drone-data`;
const MAP_KEYS = {
  lat: ['lat', 'latitude', 'y'],
  lng: ['lng', 'lon', 'longitude', 'x'],
};


const map = L.map('map', {
  center: [16.5, 107.5],
  zoom: 6,
  zoomControl: true,
});
window.map = map;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);

let markerLayer = L.layerGroup().addTo(map);
let activeMarker = null;
let allData = [];
let markerMap = {};
let selectedIndices = new Set();

function fitHanoi() { map.setView([21.0285, 105.8542], 10); }


function makeDotIcon(color = '#e63946', size = 12) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;
      background:${color};box-shadow:0 0 0 2px #fff,0 2px 6px rgba(0,0,0,.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
}

const dotIcon    = makeDotIcon('#e63946', 12);  // Đỏ - UAV 
const activeIcon = makeDotIcon('#f97316', 16);
const selIcon    = makeDotIcon('#2563eb', 14);
function setStatus(state, msg) {
  document.getElementById('status-indicator').className = state;
  document.getElementById('status-text').textContent = msg;
}
function showToast(msg, dur = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}



let searchQuery = '';

document.getElementById('search-box').addEventListener('input', function() {
  searchQuery = this.value.trim().toLowerCase();
  currentPage = 1;
  renderSidebar();
});

function getDeviceName(item, idx) {
  const deviceType = getField(item, UAV_KEYS.device_type);
  if (deviceType) return deviceType;
  if (item.name) return item.name;
  return `UAV #${idx + 1}`;
}

  // DISTANCE MEASUREMENT
 
let measureMode    = false;
let measurePoints  = [];
let measureMarkers = [];
let measureLine    = null;

const distIconA = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;
    box-shadow:0 0 0 3px #fff,0 2px 8px rgba(37,99,235,.5);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-size:10px;font-weight:700;">A</div>`,
  iconSize:[18,18], iconAnchor:[9,9]
});
const distIconB = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#16a34a;
    box-shadow:0 0 0 3px #fff,0 2px 8px rgba(22,163,74,.5);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-size:10px;font-weight:700;">B</div>`,
  iconSize:[18,18], iconAnchor:[9,9]
});

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function selectMeasurePoint(latlng, name, sourceMarker = null) {
  if (measurePoints.length >= 2) return;
  measurePoints.push({ latlng, name, sourceMarker });
  const icon = measurePoints.length === 1 ? distIconA : distIconB;
  if (sourceMarker) {
    sourceMarker.setIcon(icon);
  } else {
    const m = L.marker(latlng, { icon }).addTo(map);
    measureMarkers.push(m);
  }
  if (measurePoints.length === 1) {
    document.getElementById('measure-hint').textContent = 'Chọn điểm B';
  } else {
    finishMeasure();
  }
}

function finishMeasure() {
  const [pA, pB] = measurePoints;
  const coords = [pA.latlng, pB.latlng];
  measureLine = L.polyline(coords, {
    color: '#2563eb', weight: 2.5, dashArray: '8 5', opacity: 0.9
  }).addTo(map);

  const { lat: la1, lng: lo1 } = pA.latlng;
  const { lat: la2, lng: lo2 } = pB.latlng;
  const km = haversine(la1, lo1, la2, lo2);

  document.getElementById('dist-km').textContent = km >= 1 ? km.toFixed(2) : (km*1000).toFixed(0);
  document.getElementById('dist-km').nextElementSibling.textContent =
    km >= 1 ? 'km (đường chim bay)' : 'm (đường chim bay)';

  const nameA = pA.name ?? `(${la1.toFixed(5)}, ${lo1.toFixed(5)})`;
  const nameB = pB.name ?? `(${la2.toFixed(5)}, ${lo2.toFixed(5)})`;
  document.getElementById('dist-names').innerHTML =
    `<b>A:</b> ${nameA}<br><b>B:</b> ${nameB}`;

  document.getElementById('dist-panel').classList.add('visible');
  map.fitBounds(L.latLngBounds(coords).pad(0.3));
}

function toggleMeasure() {
  measureMode = !measureMode;
  const btn   = document.getElementById('dist-mode-btn');
  const hint  = document.getElementById('measure-hint');
  const mapEl = document.getElementById('map');
  if (measureMode) {
    btn.classList.add('active');
    btn.textContent = '✕ Thoát';
    hint.classList.add('visible');
    mapEl.classList.add('measure-mode');
    clearMeasure(false);
  } else {
    btn.classList.remove('active');
    btn.textContent = '📏';
    hint.classList.remove('visible');
    mapEl.classList.remove('measure-mode');
    clearMeasure(false);
  }
}

function clearMeasure(keepMode = true) {
  measurePoints.forEach(p => {
    if (p.sourceMarker) {
      const idx = Object.keys(markerMap).find(k => markerMap[k] === p.sourceMarker);
      p.sourceMarker.setIcon(idx !== undefined && selectedIndices.has(parseInt(idx)) ? selIcon : dotIcon);
    }
  });
  measurePoints = [];
  measureMarkers.forEach(m => map.removeLayer(m));
  measureMarkers = [];
  if (measureLine) { map.removeLayer(measureLine); measureLine = null; }
  document.getElementById('dist-panel').classList.remove('visible');
  if (measureMode && keepMode) {
    document.getElementById('measure-hint').textContent = 'Chọn điểm A';
  }
}

map.on('click', function(e) {
  if (!measureMode) return;
  if (measurePoints.length >= 2) return;
  selectMeasurePoint(e.latlng, null, null);
});


(function () {
  const panel  = document.getElementById('dist-panel');
  const handle = document.getElementById('dist-drag-handle');
  let posX = 0, posY = 0, startMouseX = 0, startMouseY = 0, dragging = false;

  function initPosition() {
    const r = panel.getBoundingClientRect();
    posX = r.left; posY = r.top;
    applyPos();
  }
  function applyPos() {
    posX = Math.max(0, Math.min(posX, window.innerWidth  - panel.offsetWidth));
    posY = Math.max(0, Math.min(posY, window.innerHeight - panel.offsetHeight));
    panel.style.transform = 'none';
    panel.style.left = posX + 'px';
    panel.style.top  = posY + 'px';
  }
  function getXY(e) {
    return e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
  }
  handle.addEventListener('mousedown', startDrag);
  handle.addEventListener('touchstart', startDrag, { passive: false });
  function startDrag(e) {
    e.preventDefault();
    const { x, y } = getXY(e);
    startMouseX = x - posX; startMouseY = y - posY;
    dragging = true; panel.classList.add('dragging');
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove',  onMove, { passive: false });
  function onMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const { x, y } = getXY(e);
    posX = x - startMouseX; posY = y - startMouseY;
    applyPos();
  }
  document.addEventListener('mouseup',  endDrag);
  document.addEventListener('touchend', endDrag);
  function endDrag() { dragging = false; panel.classList.remove('dragging'); }

  new MutationObserver(() => {
    if (panel.classList.contains('visible')) {
      panel.style.transform = 'translate(-50%, -50%)';
      panel.style.left = '50%'; panel.style.top = '50%';
      requestAnimationFrame(() => initPosition());
    }
  }).observe(panel, { attributes: true, attributeFilter: ['class'] });
})();

const mapContainer = document.getElementById('map');
if (window.ResizeObserver) {
  const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(() => {
      map.invalidateSize({ animate: false, pan: false });
    });
  });
  resizeObserver.observe(mapContainer);
}



