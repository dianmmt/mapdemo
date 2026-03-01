
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
  };

const ITEMS_PER_PAGE = 10;
let currentPage = 1;

function getField(obj, candidates) {
    for (const k of candidates) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return null;
  }

function useDemoData() {
  const demo = [
    { device_type: 'DJI Mavic 2 Pro', freq: 5756.5, drone_lat: 16.5, drone_lon: 107.5 },
    { device_type: 'DJI Phantom 4', freq: 5816.5, drone_lat: 21.0, drone_lon: 105.8 },
    { device_type: 'DJI Mini 3 Pro', freq: 5776.5, drone_lat: 10.8, drone_lon: 106.6 },
    { device_type: 'DJI Air 2S', freq: 5836.5, drone_lat: 16.1, drone_lon: 108.2 },
    { device_type: 'Autel EVO II', freq: 5796.5, drone_lat: 12.2, drone_lon: 109.2 },
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
    const hasCoords = lat !== null && lng !== null && (lat !== 0 || lng !== 0);

    const card = document.createElement('div');
    card.className = 'point-card' + (selectedIndices.has(idx) ? ' selected' : '');
    card.dataset.idx = idx;

    card.innerHTML = `
      <div class="point-card-checkbox"></div>
      <div class="point-card-dot"></div>
      <div class="point-card-body">
        <div class="point-card-name">${deviceType}</div>
        <div class="point-card-coords">${freq ? freq.toFixed(3) + ' MHz' : '--'}</div>
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
setInterval(fetchAndPlot, 60_000);

// ══════════════════════════════════════════════
// TAB SWITCHING & LOCATION TAB
// ══════════════════════════════════════════════
let currentTab = 'all';
const LOCATION_RADIUS_KM = 20;

function switchTab(tabName) {
  currentTab = tabName;
  
  document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`tab-content-${tabName}`).classList.add('active');
  
  if (tabName === 'location') {
    renderLocationList();
  }
}

function getCurrentPosition() {
  const latInput = document.getElementById('lat');
  const lngInput = document.getElementById('lng');
  
  if (!latInput || !lngInput) return null;
  
  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);
  
  if (isNaN(lat) || isNaN(lng)) return null;
  
  return { lat, lng };
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function renderLocationList() {
  const listEl = document.getElementById('location-list');
  const countEl = document.getElementById('location-count');
  const posDisplayEl = document.getElementById('current-pos-display');
  
  if (!listEl) return;
  
  const currentPos = getCurrentPosition();
  
  if (!currentPos) {
    listEl.innerHTML = `
      <div class="point-list-empty">
        <div class="empty-icon">📍</div>
        Chưa xác định vị trí hiện tại.<br>Vui lòng nhập tọa độ ở panel bên trái.
      </div>
    `;
    if (countEl) countEl.textContent = '0';
    if (posDisplayEl) {
      posDisplayEl.textContent = 'Chưa xác định vị trí';
      posDisplayEl.classList.remove('active');
    }
    return;
  }
  
  if (posDisplayEl) {
    posDisplayEl.textContent = `${currentPos.lat.toFixed(6)}, ${currentPos.lng.toFixed(6)}`;
    posDisplayEl.classList.add('active');
  }
  
  const uavsWithDistance = [];
  
  allData.forEach((item, idx) => {
    const lat = getField(item, ['drone_lat', 'lat', 'latitude']);
    const lng = getField(item, ['drone_lon', 'lon', 'lng', 'longitude']);
    
    if (lat !== null && lng !== null && (lat !== 0 || lng !== 0)) {
      const distance = calculateDistance(currentPos.lat, currentPos.lng, lat, lng);
      
      if (distance <= LOCATION_RADIUS_KM) {
        uavsWithDistance.push({
          item,
          idx,
          distance,
          lat,
          lng
        });
      }
    }
  });
  
  uavsWithDistance.sort((a, b) => a.distance - b.distance);
  
  if (countEl) countEl.textContent = uavsWithDistance.length;
  
  if (uavsWithDistance.length === 0) {
    listEl.innerHTML = `
      <div class="location-no-results">
        <div class="no-result-icon">🔍</div>
        <div class="no-result-title">Không tìm thấy UAV</div>
        <div class="no-result-desc">
          Không có UAV nào trong phạm vi ${LOCATION_RADIUS_KM}km<br>
          từ vị trí hiện tại của bạn.
        </div>
      </div>
    `;
    return;
  }
  
  listEl.innerHTML = '';
  
  uavsWithDistance.forEach(({ item, idx, distance, lat, lng }) => {
    const deviceType = getField(item, UAV_KEYS.device_type) || `UAV #${idx + 1}`;
    const freq = getField(item, UAV_KEYS.freq);
    
    let distanceClass = 'close';
    if (distance < 5) distanceClass = 'very-close';
    else if (distance > 15) distanceClass = 'medium';
    
    let distanceDisplay, distanceUnit;
    if (distance < 1) {
      distanceDisplay = (distance * 1000).toFixed(0);
      distanceUnit = 'm';
    } else {
      distanceDisplay = distance.toFixed(2);
      distanceUnit = 'km';
    }
    
    const card = document.createElement('div');
    card.className = `location-card ${distanceClass}`;
    card.dataset.idx = idx;
    
    card.innerHTML = `
      <div class="location-card-icon">
        <span>🛸</span>
      </div>
      <div class="location-card-body">
        <div class="location-card-name">${deviceType}</div>
        <div class="location-card-freq">${freq ? freq.toFixed(3) + ' MHz' : 'N/A'}</div>
      </div>
      <div class="location-card-distance">
        <div class="distance-value">${distanceDisplay}</div>
        <div class="distance-unit">${distanceUnit}</div>
      </div>
    `;
    
    card.addEventListener('click', () => {
      if (markerMap[idx]) {
        map.flyTo([lat, lng], 14, { duration: 0.8 });
        markerMap[idx].openPopup();
      }
    });
    
    listEl.appendChild(card);
  });
}

function updateLocationTabOnPositionChange() {
  if (currentTab === 'location') {
    renderLocationList();
  }
  const countEl = document.getElementById('location-count');
  if (countEl) {
    const currentPos = getCurrentPosition();
    if (currentPos && allData.length > 0) {
      let count = 0;
      allData.forEach((item) => {
        const lat = getField(item, ['drone_lat', 'lat', 'latitude']);
        const lng = getField(item, ['drone_lon', 'lon', 'lng', 'longitude']);
        if (lat !== null && lng !== null && (lat !== 0 || lng !== 0)) {
          const distance = calculateDistance(currentPos.lat, currentPos.lng, lat, lng);
          if (distance <= LOCATION_RADIUS_KM) count++;
        }
      });
      countEl.textContent = count;
    }
  }
}

const originalDisplayUAVData = displayUAVData;
displayUAVData = function(data) {
  originalDisplayUAVData(data);
  setTimeout(updateLocationTabOnPositionChange, 100);
};
