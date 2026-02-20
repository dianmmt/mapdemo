
  // ──────────────────────────────────────────
  // CONFIG – đổi endpoint nếu cần
  // ──────────────────────────────────────────
  const API_URL = 'http://localhost:3000/thon'; // GET → trả về mảng JSON

  /*
  Cấu trúc JSON mong đợi từ API — chỉ cần tọa độ:
  [
    { "lat": 21.0285, "lng": 105.8542 },
    { "lat": 16.067,  "lon": 108.223  },
    ...
  ]
  Cũng hỗ trợ: latitude/longitude, x/y
  */
  const MAP_KEYS = {
    lat: ['lat', 'latitude', 'y'],
    lng: ['lng', 'lon', 'longitude', 'x'],
  };

  function getField(obj, candidates) {
    for (const k of candidates) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return null;
  }

  // ──────────────────────────────────────────
  // MAP INIT – dùng bản đồ tối CartoDB
  // ──────────────────────────────────────────
  const map = L.map('map', {
    center: [16.5, 107.5],
    zoom: 6,
    zoomControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  let markerLayer = L.layerGroup().addTo(map);
  let activeMarker = null;

  function fitVietnam() {
    map.setView([16.5, 107.5], 6);
  }

  // ──────────────────────────────────────────
  // DOT ICON
  // ──────────────────────────────────────────
  function makeDotIcon(color = '#e63946', size = 12) {
    return L.divIcon({
      className: '',
      html: `<div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};
        box-shadow:0 0 0 2px #fff, 0 2px 6px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2],
    });
  }

  const dotIcon    = makeDotIcon('#e63946', 12);
  const activeIcon = makeDotIcon('#f97316', 16);

  // ──────────────────────────────────────────
  // STATUS
  // ──────────────────────────────────────────
  function setStatus(state, msg) {
    const ind = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    ind.className = state;
    txt.textContent = msg;
  }

  function showToast(msg, dur = 2500) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), dur);
  }

  // ──────────────────────────────────────────
  // FETCH & PLOT
  // ──────────────────────────────────────────
  async function fetchAndPlot() {
    setStatus('loading', `Đang lấy dữ liệu từ ${API_URL} ...`);
    markerLayer.clearLayers();
    activeMarker = null;

    let data;
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Hỗ trợ { data: [...] } hoặc [...] trực tiếp
      data = Array.isArray(json) ? json : (json.data ?? json.items ?? json.results ?? []);
    } catch (err) {
      setStatus('error', `Lỗi kết nối: ${err.message}`);
      showToast('❌ Không thể kết nối tới API');
      useDemoData(); // fallback
      return;
    }

    plotPoints(data);
  }

  function plotPoints(data) {
    let count = 0;

    data.forEach((item, idx) => {
      const lat = parseFloat(getField(item, MAP_KEYS.lat));
      const lng = parseFloat(getField(item, MAP_KEYS.lng));

      if (isNaN(lat) || isNaN(lng)) return;

      const label = item.id != null ? `#${item.id}` : `#${idx + 1}`;

      const marker = L.marker([lat, lng], { icon: dotIcon })
        .bindPopup(`
          <div class="popup-title">Điểm ${label}</div>
          <div class="popup-row">Vĩ độ (lat): <span>${lat.toFixed(6)}</span></div>
          <div class="popup-row">Kinh độ (lng): <span>${lng.toFixed(6)}</span></div>
        `)
        .on('mouseover', function() {
          if (measureMode && measurePoints.length < 2) {
            this.setIcon(makeDotIcon('#2563eb', 16));
          }
        })
        .on('mouseout', function() {
          if (measureMode) {
            const isSelected = measurePoints.some(p =>
              p.latlng.lat === this.getLatLng().lat && p.latlng.lng === this.getLatLng().lng
            );
            if (!isSelected) this.setIcon(dotIcon);
          }
        })
        .on('click', function (e) {
          L.DomEvent.stopPropagation(e);
          if (measureMode) {
            const coordLabel = `Điểm ${label} (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
            selectMeasurePoint(this.getLatLng(), coordLabel, this);
            return;
          }
          if (activeMarker && activeMarker !== this) activeMarker.setIcon(dotIcon);
          this.setIcon(activeIcon);
          activeMarker = this;
        });

      markerLayer.addLayer(marker);
      count++;
    });

    document.getElementById('total-count').textContent = count.toLocaleString('vi-VN');
    document.getElementById('last-update').textContent = new Date().toLocaleTimeString('vi-VN');
    setStatus('ok', `Đã tải ${count} điểm thành công.`);
  }

  // ──────────────────────────────────────────
  // DEMO DATA (khi API chưa chạy)
  // ──────────────────────────────────────────
  function useDemoData() {
    const demo = [
      { lat: 21.148, lng: 105.844 },
      { lat: 20.844, lng: 106.688 },
      { lat: 16.067, lng: 108.223 },
      { lat: 10.823, lng: 106.629 },
      { lat: 15.879, lng: 108.335 },
      { lat: 10.940, lng: 107.241 },
      { lat: 10.014, lng: 105.786 },
      { lat: 10.361, lng: 105.362 },
      { lat: 21.853, lng: 106.761 },
      { lat: 16.467, lng: 107.595 },
    ];
    plotPoints(demo);
    setStatus('error', '⚠ Dùng dữ liệu demo vì API chưa sẵn sàng.');
    showToast('⚠ Đang dùng dữ liệu demo');
  }

  // ──────────────────────────────────────────
  // DISTANCE MEASUREMENT
  // ──────────────────────────────────────────
  let measureMode   = false;
  let measurePoints = [];       // [{latlng, name, sourceMarker}]
  let measureMarkers= [];       // L.marker (A/B labels)
  let measureLine   = null;     // L.polyline

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

    // Replace the source red dot with the A/B icon
    const icon = measurePoints.length === 1 ? distIconA : distIconB;
    if (sourceMarker) {
      sourceMarker.setIcon(icon);
    } else {
      // free-click on map: place a new label marker
      const m = L.marker(latlng, { icon }).addTo(map);
      measureMarkers.push(m);
    }

    if (measurePoints.length === 1) {
      document.getElementById('measure-hint').textContent = '📍 Chọn điểm B (click chấm đỏ hoặc bất kỳ vị trí)';
    } else {
      finishMeasure();
    }
  }

  function finishMeasure() {
    const [pA, pB] = measurePoints;

    // Draw dashed line
    const coords = [pA.latlng, pB.latlng];
    measureLine = L.polyline(coords, {
      color: '#2563eb', weight: 2.5, dashArray: '8 5', opacity: 0.9
    }).addTo(map);

    // Compute
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
    document.getElementById('measure-hint').textContent = '✅ Nhấn "Đo lại" để chọn 2 điểm khác';

    map.fitBounds(L.latLngBounds(coords).pad(0.3));
  }

  function toggleMeasure() {
    measureMode = !measureMode;
    const btn  = document.getElementById('dist-mode-btn');
    const hint = document.getElementById('measure-hint');
    const mapEl = document.getElementById('map');
    if (measureMode) {
      btn.classList.add('active');
      btn.textContent = '✕ Thoát đo khoảng cách';
      hint.textContent = '📍 Chọn điểm A — click thẳng vào chấm đỏ!';
      hint.classList.add('visible');
      mapEl.classList.add('measure-mode');
      clearMeasure(false);
    } else {
      btn.classList.remove('active');
      btn.textContent = '📏 Đo khoảng cách';
      hint.classList.remove('visible');
      mapEl.classList.remove('measure-mode');
      clearMeasure(false);
    }
  }

  function clearMeasure(keepMode = true) {
    // Restore any source markers back to red dot
    measurePoints.forEach(p => {
      if (p.sourceMarker) p.sourceMarker.setIcon(dotIcon);
    });
    measurePoints = [];
    measureMarkers.forEach(m => map.removeLayer(m));
    measureMarkers = [];
    if (measureLine) { map.removeLayer(measureLine); measureLine = null; }
    document.getElementById('dist-panel').classList.remove('visible');
    if (measureMode && keepMode) {
      document.getElementById('measure-hint').textContent = '📍 Chọn điểm A — click thẳng vào chấm đỏ!';
    }
  }

  // Map click = free-point (not on a dot)
  map.on('click', function(e) {
    if (!measureMode) return;
    if (measurePoints.length >= 2) return;
    // Only fire if not clicking on a marker (markers stopPropagation)
    selectMeasurePoint(e.latlng, null, null);
  });

  // ──────────────────────────────────────────
  // BOOT
  // ──────────────────────────────────────────
  fetchAndPlot();

  // Tự làm mới mỗi 60s
  setInterval(fetchAndPlot, 60_000);
