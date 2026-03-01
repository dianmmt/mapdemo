
function collapseLeftPanel() {
  leftPanel.classList.add('collapsed');
  leftExpandTab.style.display = 'flex';
  invalidateMap();
}

function expandLeftPanel() {
  leftPanel.classList.remove('collapsed');
  leftExpandTab.style.display = 'none';
  invalidateMap();
}

/* ══════════════════════════════════════════════
   LEFT PANEL  –  drag to resize
══════════════════════════════════════════════ */
(function () {
  const handle = document.getElementById('left-panel-resize-handle');
  let dragging = false, startX, startW;
  const MIN = 200, MAX = 420;

  handle.addEventListener('mousedown', e => {
    if (leftPanel.classList.contains('collapsed')) return;
    dragging = true;
    startX = e.clientX;
    startW = leftPanel.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const delta = e.clientX - startX;
    const w = Math.min(MAX, Math.max(MIN, startW + delta));
    leftPanel.style.width = w + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    invalidateMap();
  });

  handle.addEventListener('touchstart', e => {
    if (leftPanel.classList.contains('collapsed')) return;
    startX = e.touches[0].clientX;
    startW = leftPanel.offsetWidth;
    dragging = true;
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', e => {
    if (!dragging) return;
    const delta = e.touches[0].clientX - startX;
    const w = Math.min(MAX, Math.max(MIN, startW + delta));
    leftPanel.style.width = w + 'px';
  }, { passive: false });

  document.addEventListener('touchend', () => { dragging = false; });
})();

/* ══════════════════════════════════════════════
   LEFT PANEL  –  Current Location & Marker
══════════════════════════════════════════════ */
let currentLocationMarker = null;

function createCurrentLocationIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 20px; height: 20px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(59,130,246,0.3), 0 4px 12px rgba(0,0,0,0.3);
      animation: currentLocPulse 2s ease-in-out infinite;
    "></div>
    <style>
      @keyframes currentLocPulse {
        0%, 100% { box-shadow: 0 0 0 4px rgba(59,130,246,0.3), 0 4px 12px rgba(0,0,0,0.3); }
        50% { box-shadow: 0 0 0 8px rgba(59,130,246,0.15), 0 4px 12px rgba(0,0,0,0.3); }
      }
    </style>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function updateCurrentLocationMarker(lat, lng) {
  if (!window.map) return;
  
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  
  if (isNaN(latNum) || isNaN(lngNum)) return;
  
  if (currentLocationMarker) {
    currentLocationMarker.setLatLng([latNum, lngNum]);
  } else {
    currentLocationMarker = L.marker([latNum, lngNum], { 
      icon: createCurrentLocationIcon(),
      zIndexOffset: 1000
    })
    .bindPopup(`
      <div class="popup-title">📍 Vị trí hiện tại</div>
      <div class="popup-row">Vĩ độ: <span>${latNum.toFixed(6)}</span></div>
      <div class="popup-row">Kinh độ: <span>${lngNum.toFixed(6)}</span></div>
    `)
    .addTo(map);
  }
  
  currentLocationMarker.setPopupContent(`
    <div class="popup-title">📍 Vị trí hiện tại</div>
    <div class="popup-row">Vĩ độ: <span>${latNum.toFixed(6)}</span></div>
    <div class="popup-row">Kinh độ: <span>${lngNum.toFixed(6)}</span></div>
  `);
}

function onCoordInputChange() {
  const lat = document.getElementById('lat').value;
  const lng = document.getElementById('lng').value;
  const statusEl = document.getElementById('location-status');
  
  if (lat && lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      statusEl.innerHTML = '<div class="status-dot" style="background:#f59e0b"></div><span>Nhấn "Đi đến vị trí"</span>';
      if (typeof updateLocationTabOnPositionChange === 'function') {
        updateLocationTabOnPositionChange();
      }
    } else {
      statusEl.innerHTML = '<div class="status-dot error"></div><span>Tọa độ không hợp lệ</span>';
    }
  }
}

function goToLocation() {
  const lat = document.getElementById('lat').value;
  const lng = document.getElementById('lng').value;
  const statusEl = document.getElementById('location-status');
  
  if (!lat || !lng) {
    showToast('Vui lòng nhập tọa độ');
    statusEl.innerHTML = '<div class="status-dot error"></div><span>Chưa nhập tọa độ</span>';
    return;
  }
  
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  
  if (isNaN(latNum) || isNaN(lngNum)) {
    showToast('Tọa độ không hợp lệ');
    statusEl.innerHTML = '<div class="status-dot error"></div><span>Tọa độ không hợp lệ</span>';
    return;
  }
  
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    showToast('Tọa độ ngoài phạm vi');
    statusEl.innerHTML = '<div class="status-dot error"></div><span>Tọa độ ngoài phạm vi</span>';
    return;
  }
  
  updateCurrentLocationMarker(latNum, lngNum);
  statusEl.innerHTML = '<div class="status-dot connected"></div><span>' + latNum.toFixed(6) + ', ' + lngNum.toFixed(6) + '</span>';
  
  if (window.map) {
    map.flyTo([latNum, lngNum], 15, { duration: 1.5 });
    setTimeout(() => {
      if (currentLocationMarker) currentLocationMarker.openPopup();
    }, 1600);
  }
  
  if (typeof updateLocationTabOnPositionChange === 'function') {
    updateLocationTabOnPositionChange();
  }
  
  showToast(`Đã đến: ${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`);
}

function getCurrentLocation() {
  const latInput = document.getElementById('lat');
  const lngInput = document.getElementById('lng');
  const btn = document.getElementById('btn-locate');
  const statusEl = document.getElementById('location-status');
  
  if (!navigator.geolocation) {
    showToast('Trình duyệt không hỗ trợ GPS');
    statusEl.innerHTML = '<div class="status-dot error"></div><span>Không hỗ trợ GPS</span>';
    return;
  }
  
  btn.innerHTML = '<span class="connect-icon">⏳</span> Đang lấy...';
  btn.disabled = true;
  statusEl.innerHTML = '<div class="status-dot" style="background:#f59e0b;animation:blink 0.8s infinite"></div><span>Đang xác định...</span>';
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      
      latInput.value = lat;
      lngInput.value = lng;
      
      btn.innerHTML = '<span class="connect-icon">📌</span> GPS tự động';
      btn.disabled = false;
      statusEl.innerHTML = '<div class="status-dot connected"></div><span>' + lat + ', ' + lng + '</span>';
      
      updateCurrentLocationMarker(lat, lng);
      
      if (typeof updateLocationTabOnPositionChange === 'function') {
        updateLocationTabOnPositionChange();
      }
      
      showToast(`Vị trí: ${lat}, ${lng}`);
      
      if (window.map) {
        map.flyTo([parseFloat(lat), parseFloat(lng)], 15, { duration: 1.5 });
        setTimeout(() => {
          if (currentLocationMarker) currentLocationMarker.openPopup();
        }, 1600);
      }
    },
    (error) => {
      btn.innerHTML = '<span class="connect-icon">📌</span> GPS tự động';
      btn.disabled = false;
      
      let msg = 'Không thể lấy vị trí';
      if (error.code === 1) msg = 'Từ chối quyền GPS';
      else if (error.code === 2) msg = 'Không tìm thấy vị trí';
      else if (error.code === 3) msg = 'Hết thời gian chờ';
      
      statusEl.innerHTML = '<div class="status-dot error"></div><span>' + msg + '</span>';
      showToast(msg);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

/* ══════════════════════════════════════════════
   LEFT PANEL  –  Generate COM ports
══════════════════════════════════════════════ */
(function() {
  const comSelect = document.getElementById('com-port');
  for (let i = 1; i <= 100; i++) {
    const opt = document.createElement('option');
    opt.value = `COM${i}`;
    opt.textContent = `COM${i}`;
    if (i === 7) opt.selected = true;
    comSelect.appendChild(opt);
  }
})();

/* ══════════════════════════════════════════════
   LEFT PANEL  –  Serial Connection
══════════════════════════════════════════════ */
const BACKEND_URL = 'http://localhost:5000';
let isConnected = false;
let dataPollingInterval = null;

async function connectSerial() {
  const port = document.getElementById('com-port').value;
  const baud = document.getElementById('baud-rate').value;
  const btn = document.getElementById('btn-connect');
  const statusEl = document.getElementById('connection-status');
  
  if (isConnected) {
    try {
      await fetch(`${BACKEND_URL}/disconnect`, { method: 'POST' });
    } catch (e) {}
    isConnected = false;
    btn.innerHTML = '<span class="connect-icon"></span> Kết nối';
    btn.classList.remove('connected');
    statusEl.innerHTML = '<div class="status-dot disconnected"></div><span>Đã ngắt kết nối</span>';
    if (dataPollingInterval) {
      clearInterval(dataPollingInterval);
      dataPollingInterval = null;
    }
    showToast('Đã ngắt kết nối');
    return;
  }
  
  btn.innerHTML = '<span class="connect-icon">⏳</span> Đang kết nối...';
  btn.disabled = true;
  
  try {
    const res = await fetch(`${BACKEND_URL}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port, baud: parseInt(baud) })
    });
    
    const data = await res.json();
    
    if (data.success) {
      isConnected = true;
      btn.innerHTML = '<span class="connect-icon">🔴</span> Ngắt kết nối';
      btn.classList.add('connected');
      statusEl.innerHTML = '<div class="status-dot connected"></div><span>Đã kết nối ' + port + '</span>';
      showToast(`Đã kết nối ${port} @ ${baud} baud`);
      startDataPolling();
    } else {
      statusEl.innerHTML = '<div class="status-dot error"></div><span>Lỗi: ' + data.error + '</span>';
      showToast('Lỗi kết nối: ' + data.error);
    }
  } catch (err) {
    statusEl.innerHTML = '<div class="status-dot error"></div><span>Không thể kết nối backend</span>';
    showToast('Không thể kết nối tới backend server');
  }
  
  btn.disabled = false;
}
function startDataPolling() {
    if (dataPollingInterval) clearInterval(dataPollingInterval);
    
    dataPollingInterval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/data`);
        const data = await res.json();
        if (data && data.freq !== undefined) {
          updateDeviceInfo(data);
        }
      } catch (e) {}
    }, 1000);
  }
  
  function updateDeviceInfo(data) {
    document.getElementById('info-freq').textContent = data.freq ? data.freq.toFixed(3) + ' MHz' : '-- MHz';
    document.getElementById('info-device-type').textContent = data.device_type || '--';
    document.getElementById('info-device-type-8').textContent = data.device_type_8 ?? '--';
    document.getElementById('info-gps-time').textContent = data.drone_gps_time || '--';
    
    document.getElementById('coord-drone-lat').textContent = (data.drone_lat ?? 0).toFixed(6);
    document.getElementById('coord-drone-lon').textContent = (data.drone_lon ?? 0).toFixed(6);
    document.getElementById('coord-home-lat').textContent = (data.home_lat ?? 0).toFixed(6);
    document.getElementById('coord-home-lon').textContent = (data.home_lon ?? 0).toFixed(6);
    document.getElementById('coord-app-lat').textContent = (data.app_lat ?? 0).toFixed(6);
    document.getElementById('coord-app-lon').textContent = (data.app_lon ?? 0).toFixed(6);
    
    document.getElementById('info-height').textContent = data.heigth !== undefined ? data.heigth.toFixed(1) + ' m' : '-- m';
    document.getElementById('info-altitude').textContent = data.altitude !== undefined ? data.altitude.toFixed(1) + ' m' : '-- m';
  }
  

 