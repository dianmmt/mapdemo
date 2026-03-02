/* ══════════════════════════════════════════════
   RESULT TAB - Hiển thị dữ liệu thô dạng terminal
══════════════════════════════════════════════ */

let resultPollingInterval = null;

// Lấy dữ liệu từ backend và hiển thị
async function fetchResultData() {
  try {
    const res = await fetch(`${BACKEND_URL}/drone-data`);
    const data = await res.json();
    
    if (Array.isArray(data)) {
      renderTerminalOutput(data);
      updateResultBadge(data.length);
    }
  } catch (err) {
    appendToTerminal(`[ERROR] ${err.message}`);
  }
}

function updateResultBadge(count) {
  const badge = document.getElementById('result-count');
  if (badge) badge.textContent = count;
}

function renderTerminalOutput(dataArray) {
  const container = document.getElementById('result-list');
  if (!container) return;
  
  if (dataArray.length === 0) {
    container.innerHTML = `<div class="terminal-output"><span class="terminal-line">[WAITING] Chờ dữ liệu từ thiết bị...</span></div>`;
    return;
  }
  
  let html = '<div class="terminal-output">';
  
  // Hiển thị mới nhất ở dưới (giống terminal)
  dataArray.forEach((item, index) => {
    const time = item.received_at || '--';
    const jsonStr = JSON.stringify(item);
    html += `<div class="terminal-line"><span class="terminal-time">[${time}]</span> <span class="terminal-data">${escapeHtml(jsonStr)}</span></div>`;
  });
  
  html += '</div>';
  container.innerHTML = html;
  
  // Auto scroll xuống dưới
  container.scrollTop = container.scrollHeight;
}

function appendToTerminal(text) {
  const container = document.getElementById('result-list');
  if (!container) return;
  
  let output = container.querySelector('.terminal-output');
  if (!output) {
    output = document.createElement('div');
    output.className = 'terminal-output';
    container.innerHTML = '';
    container.appendChild(output);
  }
  
  const line = document.createElement('div');
  line.className = 'terminal-line';
  line.textContent = text;
  output.appendChild(line);
  
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function startResultPolling() {
  if (resultPollingInterval) clearInterval(resultPollingInterval);
  fetchResultData();
  resultPollingInterval = setInterval(() => {
    if (isConnected) fetchResultData();
  }, 1000);
}

function stopResultPolling() {
  if (resultPollingInterval) {
    clearInterval(resultPollingInterval);
    resultPollingInterval = null;
  }
}

document.addEventListener('DOMContentLoaded', fetchResultData);
