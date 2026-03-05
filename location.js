
let currentTab = 'all';
const LOCATION_RADIUS_KM = 20;

function switchTab(tabName) {
  currentTab = tabName;
  
  // Only select tabs and content within #sidebar (right panel)
  document.querySelectorAll('#sidebar .sidebar-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');
  
  document.querySelectorAll('#sidebar .tab-content').forEach(content => {
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
    const receivedAt = getField(item, UAV_KEYS.received_at);
    
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
        <img src="images/djimavic2.jpg" alt="UAV" class="uav-icon">
      </div>
      <div class="location-card-body">
        <div class="location-card-name">${deviceType}</div>
        <div class="location-card-freq">${freq ? freq.toFixed(3) + ' MHz' : 'N/A'}</div>
        <div class="location-card-time">Time: ${formatReceivedTime(receivedAt)}</div>
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
