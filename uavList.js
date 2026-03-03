
const UAV_KEYS = {
    freq: ['freq'],
    device_type: ['device_type'],
    device_type_8: ['device_type_8'],
    drone_gps_time: ['drone_gps_time'],
    app_lat: ['app_lat'],
    app_lon: ['app_lon'],
    drone_lat: ['drone_lat'],
    drone_lon: ['drone_lon'],
    home_lat: ['home_lat'],
    home_lon: ['home_lon'],
    received_at: ['received_at'],
  };

const ITEMS_PER_PAGE = 10;
let currentPage = 1;

function getField(obj, candidates) {
    for (const k of candidates) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return null;
  }

  function formatReceivedTime(dateStr) {
    if (!dateStr) return '--';
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);

        if (diffSec < 60) return `${diffSec}s trước`;
        if (diffMin < 60) return `${diffMin}p trước`; 
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return dateStr;
    }
}

function useDemoData() {
    const demo = [
        // === Dữ liệu gốc (thêm received_at) ===
        { device_type: 'DJI Mavic 2 Pro', freq: 5756.5, drone_lat: 16.5,  drone_lon: 107.5,  received_at: '2026-02-23T06:00:00Z' },
        { device_type: 'DJI Phantom 4',   freq: 5816.5, drone_lat: 21.0,  drone_lon: 105.8,  received_at: '2026-02-23T06:05:00Z' },
        { device_type: 'DJI Mini 3 Pro',  freq: 5776.5, drone_lat: 10.8,  drone_lon: 106.6,  received_at: '2026-02-23T06:10:00Z' },
        { device_type: 'DJI Air 2S',      freq: 5836.5, drone_lat: 16.1,  drone_lon: 108.2,  received_at: '2026-02-23T06:15:00Z' },
        { device_type: 'Autel EVO II',    freq: 5796.5, drone_lat: 12.2,  drone_lon: 109.2,  received_at: '2026-02-23T06:20:00Z' },
      
        // === 5 thiết bị trong vòng 20km từ 21.024656, 105.773893 ===
      
        // DJI Mavic 2 Pro — ~8.2km Đông Bắc (21.0719, 105.8521)
        { device_type: 'DJI Mavic 2 Pro', freq: 5756.5, drone_lat: 21.0720, drone_lon: 105.8520, received_at: '2026-02-23T08:14:22Z' },
        { device_type: 'DJI Mavic 2 Pro', freq: 5756.5, drone_lat: 21.0718, drone_lon: 105.8522, received_at: '2026-02-24T09:30:11Z' },
        { device_type: 'DJI Mavic 2 Pro', freq: 5756.5, drone_lat: 21.0715, drone_lon: 105.8519, received_at: '2026-02-25T07:45:33Z' },
        { device_type: 'DJI Mavic 2 Pro', freq: 5756.5, drone_lat: 21.0721, drone_lon: 105.8523, received_at: '2026-02-26T10:12:05Z' },
        { device_type: 'DJI Mavic 2 Pro', freq: 5756.5, drone_lat: 21.0719, drone_lon: 105.8521, received_at: '2026-02-27T14:55:47Z' },
        { device_type: 'DJI Mavic 2 Pro', freq: 5756.5, drone_lat: 21.0722, drone_lon: 105.8518, received_at: '2026-02-28T08:22:19Z' },
        { device_type: 'DJI Mavic 2 Pro', freq: 5756.5, drone_lat: 21.0717, drone_lon: 105.8524, received_at: '2026-03-01T09:10:44Z' },
      
        // DJI Phantom 4 — ~15.3km Đông Nam (20.9381, 105.8891)
        { device_type: 'DJI Phantom 4', freq: 5816.5, drone_lat: 20.9380, drone_lon: 105.8890, received_at: '2026-02-23T11:05:38Z' },
        { device_type: 'DJI Phantom 4', freq: 5816.5, drone_lat: 20.9382, drone_lon: 105.8892, received_at: '2026-02-24T13:44:22Z' },
        { device_type: 'DJI Phantom 4', freq: 5816.5, drone_lat: 20.9379, drone_lon: 105.8888, received_at: '2026-02-25T16:30:09Z' },
        { device_type: 'DJI Phantom 4', freq: 5816.5, drone_lat: 20.9381, drone_lon: 105.8891, received_at: '2026-02-26T08:55:17Z' },
        { device_type: 'DJI Phantom 4', freq: 5816.5, drone_lat: 20.9383, drone_lon: 105.8893, received_at: '2026-02-27T11:20:33Z' },
        { device_type: 'DJI Phantom 4', freq: 5816.5, drone_lat: 20.9378, drone_lon: 105.8887, received_at: '2026-02-28T15:45:58Z' },
        { device_type: 'DJI Phantom 4', freq: 5816.5, drone_lat: 20.9380, drone_lon: 105.8890, received_at: '2026-03-01T10:30:12Z' },
      
       
      ];
  displayUAVData(demo);
  setStatus('error', 'Đang dùng dữ liệu demo.');
  showToast('Đang dùng dữ liệu demo');
}

function displayUAVData(data) {
  if (!Array.isArray(data)) {
    console.error('displayUAVData: data is not an array', data);
    setStatus('error', 'Dữ liệu không hợp lệ');
    return;
  }

  allData = data;
  markerLayer.clearLayers();
  markerMap = {};
  selectedIndices.clear();

  let validCount = 0;

  data.forEach((item, idx) => {
    const lat = getField(item, ['drone_lat', 'lat', 'latitude']);
    const lng = getField(item, ['drone_lon', 'lon', 'lng', 'longitude']);
    const freq = getField(item, UAV_KEYS.freq);
    const deviceType = getField(item, UAV_KEYS.device_type);

    if (lat !== null && lng !== null && (lat !== 0 || lng !== 0)) {
      const marker = L.marker([lat, lng], { icon: dotIcon })
        .bindPopup(`
          <div class="popup-title">${deviceType || 'UAV #' + (idx + 1)}</div>
          <div class="popup-row">Tần số: <span>${freq ? freq.toFixed(3) + ' MHz' : '--'}</span></div>
          <div class="popup-row">Vĩ độ: <span>${lat.toFixed(6)}</span></div>
          <div class="popup-row">Kinh độ: <span>${lng.toFixed(6)}</span></div>
        `)
        .addTo(markerLayer);

      marker.on('click', () => {
        if (measureMode) {
          selectMeasurePoint(marker.getLatLng(), deviceType || 'UAV #' + (idx + 1), marker);
        } else {
          toggleSelect(idx);
        }
      });

      markerMap[idx] = marker;
      validCount++;
    }
  });

  renderSidebar();
  
  if (validCount > 0) {
    setStatus('ok', `Đã tải ${validCount} thiết bị UAV với tọa độ hợp lệ.`);
  } else if (data.length > 0) {
    setStatus('warning', `Có ${data.length} UAV nhưng không có tọa độ hợp lệ.`);
  } else {
    setStatus('error', 'Không có dữ liệu UAV.');
  }

  updateSelAllBox(selectedIndices.size, Object.keys(markerMap).length);
}

function renderSidebar() {
  const listEl = document.getElementById('point-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  const filtered = allData.filter((item, idx) => {
    if (!searchQuery) return true;
    const name = getDeviceName(item, idx).toLowerCase();
    const freq = getField(item, UAV_KEYS.freq);
    const freqStr = freq ? freq.toString() : '';
    return name.includes(searchQuery) || freqStr.includes(searchQuery);
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
  
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const pageItems = filtered.slice(startIdx, endIdx);

  pageItems.forEach((item) => {
    const idx = allData.indexOf(item);
    const deviceType = getField(item, UAV_KEYS.device_type) || `UAV #${idx + 1}`;
    const freq = getField(item, UAV_KEYS.freq);
    const lat = getField(item, ['drone_lat', 'lat', 'latitude']);
    const lng = getField(item, ['drone_lon', 'lon', 'lng', 'longitude']);
    const receivedAt = getField(item, UAV_KEYS.received_at);
    const hasCoords = lat !== null && lng !== null && (lat !== 0 || lng !== 0);

    const card = document.createElement('div');
    card.className = 'point-card' + (selectedIndices.has(idx) ? ' selected' : '');
    card.dataset.idx = idx;

    card.innerHTML = `
      <div class="point-card-checkbox"></div>
      <div class="point-card-dot"></div>
      <div class="point-card-body">
        <div class="point-card-name">${deviceType}</div>
        <div class="point-card-meta">
          <span class="point-card-freq">${freq ? freq.toFixed(3) + ' MHz' : '--'}</span>
          <span class="point-card-divider">•</span>
          <span class="point-card-time" title="${receivedAt || ''}">${formatReceivedTime(receivedAt)}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      toggleSelect(idx);
      if (hasCoords && markerMap[idx]) {
        map.flyTo([lat, lng], 14, { duration: 0.8 });
        markerMap[idx].openPopup();
      }
    });

    listEl.appendChild(card);
  });

  renderPagination(filtered.length, totalPages);

  document.getElementById('total-visible').textContent = filtered.length;
  
  const sidebarCountEl = document.getElementById('sidebar-count');
  if (sidebarCountEl) sidebarCountEl.textContent = allData.length;

  const totalCountEl = document.getElementById('total-count');
  if (totalCountEl) totalCountEl.textContent = allData.length;
  
  const lastUpdateEl = document.getElementById('last-update');
  if (lastUpdateEl) {
    const now = new Date();
    lastUpdateEl.textContent = now.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
  }
}

function renderPagination(totalItems, totalPages) {
  let paginationEl = document.getElementById('pagination');
  
  if (!paginationEl) {
    paginationEl = document.createElement('div');
    paginationEl.id = 'pagination';
    paginationEl.className = 'pagination';
    const listEl = document.getElementById('point-list');
    listEl.parentNode.insertBefore(paginationEl, listEl.nextSibling);
  }

  if (totalPages <= 1) {
    paginationEl.style.display = 'none';
    return;
  }

  paginationEl.style.display = 'flex';
  paginationEl.innerHTML = `
    <button class="page-btn" onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''} title="Trang đầu">«</button>
    <button class="page-btn" onclick="prevPage()" ${currentPage === 1 ? 'disabled' : ''} title="Trang trước">‹</button>
    <span class="page-info">${currentPage} / ${totalPages}</span>
    <button class="page-btn" onclick="nextPage()" ${currentPage === totalPages ? 'disabled' : ''} title="Trang sau">›</button>
    <button class="page-btn" onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''} title="Trang cuối">»</button>
  `;
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderSidebar();
  }
}

function nextPage() {
  const filtered = allData.filter((item, idx) => {
    if (!searchQuery) return true;
    const name = getDeviceName(item, idx).toLowerCase();
    const freq = getField(item, UAV_KEYS.freq);
    const freqStr = freq ? freq.toString() : '';
    return name.includes(searchQuery) || freqStr.includes(searchQuery);
  });
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  
  if (currentPage < totalPages) {
    currentPage++;
    renderSidebar();
  }
}

function goToPage(page) {
  currentPage = page;
  renderSidebar();
}

function toggleSelect(idx) {
  if (selectedIndices.has(idx)) {
    selectedIndices.delete(idx);
    if (markerMap[idx]) markerMap[idx].setIcon(dotIcon);
  } else {
    selectedIndices.add(idx);
    if (markerMap[idx]) markerMap[idx].setIcon(selIcon);
  }
  renderSidebar();
  updateSelAllBox(selectedIndices.size, Object.keys(markerMap).length);
}

function selectAll() {
  Object.keys(markerMap).forEach(idx => {
    const i = parseInt(idx);
    selectedIndices.add(i);
    markerMap[i].setIcon(selIcon);
  });
  renderSidebar();
  updateSelAllBox(selectedIndices.size, Object.keys(markerMap).length);
}

function clearSelection() {
  selectedIndices.forEach(idx => {
    if (markerMap[idx]) markerMap[idx].setIcon(dotIcon);
  });
  selectedIndices.clear();
  renderSidebar();
  updateSelAllBox(0, Object.keys(markerMap).length);
}

function toggleSelectAll() {
  const box = document.getElementById('sel-all-box');
  const hasAny = box.classList.contains('all-checked') || box.classList.contains('some-checked');
  if (hasAny) {
    clearSelection();
  } else {
    selectAll();
  }
}

function updateSelAllBox(selected, total) {
  const box = document.getElementById('sel-all-box');
  if (!box) return;
  box.classList.remove('all-checked', 'some-checked');
  if (total > 0 && selected === total) box.classList.add('all-checked');
  else if (selected > 0) box.classList.add('some-checked');
  
  const selCountEl = document.getElementById('sel-count');
  const totalVisibleEl = document.getElementById('total-visible');
  if (selCountEl) selCountEl.textContent = selected;
  if (totalVisibleEl) totalVisibleEl.textContent = total;
}

function focusSelectedOnMap() {
  if (selectedIndices.size === 0) {
    showToast('Chưa chọn UAV nào');
    return;
  }
  
  const bounds = [];
  selectedIndices.forEach(idx => {
    if (markerMap[idx]) {
      bounds.push(markerMap[idx].getLatLng());
    }
  });
  
  if (bounds.length > 0) {
    if (bounds.length === 1) {
      map.flyTo(bounds[0], 14, { duration: 0.8 });
    } else {
      map.fitBounds(L.latLngBounds(bounds).pad(0.2));
    }
  }
}

async function fetchAndPlot() {
    setStatus('loading', `Đang lấy dữ liệu từ ${UAV_API_URL} ...`);
    selectedIndices.clear();
  
    let data;
    try {
      const res = await fetch(UAV_API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      data = Array.isArray(json) ? json : (json.data ?? json.items ?? json.results ?? []);
    } catch (err) {
      setStatus('error', `Lỗi kết nối: ${err.message}`);
      showToast('Không thể kết nối tới API');
      useDemoData();
      return;
    }
  
    displayUAVData(data);
  }

fetchAndPlot();

