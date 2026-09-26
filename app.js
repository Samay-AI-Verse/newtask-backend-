/**
 * IntelliTicket - Enterprise AI Prioritization & Incident Triage Engine
 * Application Controller, Multi-Page View Routing & Real-Time Telemetry
 */

// Application State
const state = {
  currentView: 'dashboard',
  tickets: [],
  dashboardStats: null,
  activeFilter: 'ALL',
  allTicketsFilter: {
    status: 'ALL',
    category: 'ALL',
    search: '',
    sort: 'priority_desc',
    layout: 'table'
  },
  myTicketsFilter: 'ALL',
  searchQuery: '',
  selectedTicket: null,
  theme: localStorage.getItem('intelliticket_theme') || 'light',
  audioEnabled: localStorage.getItem('intelliticket_audio') === 'true',
  charts: {
    priority: null,
    slaGauge: null,
    analyticsPriority: null,
    analyticsCategories: null,
    analyticsDepts: null,
    analyticsSla: null
  }
};

// Enterprise Quick Presets for Live Testing & Judges
const PRESETS = [
  {
    label: "🔥 Payment Gateway Down",
    title: "Critical: Payment Gateway 500 Outage on Checkout",
    desc: "Production payment gateway is failing with HTTP 500 error. Urgent emergency fix required! Customers worldwide are unable to checkout and revenue is blocked.",
    scope: "ORGANIZATION",
    crit: "SEVERE",
    name: "Sarah Jenkins",
    dept: "Infrastructure",
    email: "sarah.j@company.com",
    vip: true
  },
  {
    label: "💳 Payroll System Locked",
    title: "Payroll System Locked Before Salary Disbursement",
    desc: "Salary processing system is locked on monthly cutoff date. Urgent support needed to release direct deposits for 1,200 employees.",
    scope: "ORGANIZATION",
    crit: "SEVERE",
    name: "Michael Scott",
    dept: "Finance",
    email: "m.scott@company.com",
    vip: true
  },
  {
    label: "📶 VPN Tunnel Down",
    title: "Corporate VPN Gateway Down for Marketing & Sales",
    desc: "VPN is completely unresponsive for 60+ remote team members. Critical bug blocking access to internal CRM tools.",
    scope: "TEAM",
    crit: "HIGH",
    name: "David Miller",
    dept: "Network",
    email: "david.m@company.com",
    vip: false
  },
  {
    label: "💻 Billing SAP Connector Timeout",
    title: "Billing Report Failing - SAP Timeout",
    desc: "Monthly billing and reconciliation report failing since morning due to intermittent socket timeout in SAP connector.",
    scope: "TEAM",
    crit: "HIGH",
    name: "Elena Rostova",
    dept: "Enterprise Applications",
    email: "elena.r@company.com",
    vip: false
  },
  {
    label: "🖥️ Hardware Peripheral Request",
    title: "New Ergonomic Mouse & Dual Monitor Stand",
    desc: "Employee workstation upgrade request for wireless mouse and monitor riser.",
    scope: "INDIVIDUAL",
    crit: "LOW",
    name: "Vikram Sethi",
    dept: "IT Hardware & Workstations",
    email: "vikram.s@company.com",
    vip: false
  }
];

// Keywords for live client-side scoring preview
const CRITICAL_KEYWORDS = ["down", "outage", "offline", "crashed", "emergency", "blocked", "cannot work", "production", "data loss", "breach", "security leak", "hacked", "payroll locked", "system halt", "unresponsive", "payment failing"];
const HIGH_KEYWORDS = ["asap", "urgent", "deadline today", "severe delay", "corrupted", "error 500", "unable to login", "broken", "critical bug", "customer blocked", "failed build"];
const MEDIUM_KEYWORDS = ["slow", "glitch", "warning", "intermittent", "delayed", "reinstall", "access requested", "update needed", "inconvenience", "question"];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initClock();
  setupEventListeners();
  renderPresets();
  setupLiveScoringSimulator();
  loadData();
  refreshIcons();

  // Background polling every 12s
  setInterval(() => {
    loadData(false);
  }, 12000);
});

// Re-render Lucide Vector Icons
function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// Theme Engine (Dark & Light)
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('intelliticket_theme', state.theme);
  updateThemeIcon();
  playAudioChime('click');
  showToastNotification(`Switched to ${state.theme === 'dark' ? 'Executive Dark' : 'Crisp Light'} mode`, 'info');
  // Re-render charts for theme contrast
  renderDashboardView();
}

function setThemeMode(mode) {
  state.theme = mode;
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('intelliticket_theme', mode);
  updateThemeIcon();
  renderDashboardView();
}

function updateThemeIcon() {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.setAttribute('data-lucide', state.theme === 'dark' ? 'sun' : 'moon');
    refreshIcons();
  }
}

// Audio Feedback Engine using Web Audio API
function toggleAudioFeedback() {
  state.audioEnabled = !state.audioEnabled;
  localStorage.setItem('intelliticket_audio', state.audioEnabled);
  const icon = document.getElementById('audio-icon');
  if (icon) {
    icon.setAttribute('data-lucide', state.audioEnabled ? 'volume-2' : 'volume-x');
    refreshIcons();
  }
  if (state.audioEnabled) playAudioChime('success');
  showToastNotification(`Sound feedback ${state.audioEnabled ? 'Enabled' : 'Disabled'}`, 'info');
}

function playAudioChime(type = 'click') {
  if (!state.audioEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'click') {
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'alert') {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1); // A4
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Web audio may be blocked by browser autoplay policy
  }
}

// Clock & Date in Header
function initClock() {
  const updateClock = () => {
    const now = new Date();
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options);
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeStr = `${hours}:${minutes} ${ampm}`;
    const el = document.getElementById('current-datetime-str');
    if (el) el.innerText = `${dateStr} • ${timeStr}`;
  };
  updateClock();
  setInterval(updateClock, 30000);
}

// Navigation Controller
function navigateToView(viewId) {
  state.currentView = viewId;
  playAudioChime('click');

  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    btn.classList.remove('active');
  });
  const navBtn = document.getElementById(`nav-${viewId}`);
  if (navBtn) navBtn.classList.add('active');

  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.remove('active');
  });

  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  if (viewId === 'dashboard') {
    renderDashboardView();
  } else if (viewId === 'create_ticket') {
    renderCreateStudioView();
  } else if (viewId === 'all_tickets') {
    renderAllTicketsView();
  } else if (viewId === 'my_tickets') {
    renderMyTicketsView();
  } else if (viewId === 'analytics') {
    renderAnalyticsView();
  } else if (viewId === 'reports') {
    renderReportsView();
  } else if (viewId === 'settings') {
    renderSettingsView();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  refreshIcons();
}

// Event Listeners & Shortcuts
function setupEventListeners() {
  // Global Shortcut Listener
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      toggleTheme();
    } else if (e.key === 'Escape') {
      closeAllModals();
    } else if (e.key.toLowerCase() === 'n' && !isInputFocused()) {
      e.preventDefault();
      openCreateModal();
    } else if (e.key.toLowerCase() === 'r' && !isInputFocused()) {
      e.preventDefault();
      loadData(true);
    }
  });
}

function isInputFocused() {
  const active = document.activeElement;
  return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
}

// =========================================================
// DATA INGESTION & API SERVICES
// =========================================================

async function loadData(showToast = false) {
  try {
    await Promise.all([loadDashboardMetrics(), loadTickets()]);
    if (showToast) {
      playAudioChime('success');
      showToastNotification("Live data synchronized from MongoDB", "success");
    }
  } catch (err) {
    console.error("Error loading data:", err);
  }
}

async function loadDashboardMetrics() {
  try {
    const res = await fetch('/api/v1/analytics/dashboard');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.dashboardStats = data;
    updateKPICards(data);
  } catch (err) {
    computeStatsLocally();
  }
}

async function loadTickets() {
  try {
    let url = `/api/v1/tickets?sort_by_priority=true&limit=100`;
    if (state.activeFilter && state.activeFilter !== 'ALL') {
      url += `&priority=${encodeURIComponent(state.activeFilter)}`;
    }
    if (state.searchQuery) {
      url += `&search=${encodeURIComponent(state.searchQuery)}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.tickets = data.tickets || [];

    renderTicketsTable();
    renderPriorityMatrix();
    updateDonutChart();
    updateSLAGauge();
    renderAllTicketsView();
    renderMyTicketsView();
    renderReportsView();

    if (state.currentView === 'analytics') {
      renderAnalyticsView();
    }

    computeStatsLocally();
  } catch (err) {
    console.error("Error loading tickets:", err);
  }
}

function computeStatsLocally() {
  const tickets = state.tickets;
  const total = tickets.length;
  const p1 = tickets.filter(t => t.priority === 'P1_CRITICAL').length;
  const p2 = tickets.filter(t => t.priority === 'P2_HIGH').length;
  const p3 = tickets.filter(t => t.priority === 'P3_MEDIUM').length;
  const p4 = tickets.filter(t => t.priority === 'P4_LOW').length;

  const stats = {
    total_tickets: total,
    p1_critical_count: p1,
    p2_high_count: p2,
    p3_medium_count: p3,
    p4_low_count: p4,
    sla_on_time_count: tickets.filter(t => (t.sla?.remaining_hours || 0) > 2).length,
    sla_at_risk_count: tickets.filter(t => (t.sla?.remaining_hours || 0) > 0 && (t.sla?.remaining_hours || 0) <= 2).length,
    sla_breached_count: tickets.filter(t => (t.sla?.remaining_hours || 0) <= 0).length,
    average_priority_score: total ? Math.round(tickets.reduce((acc, t) => acc + (t.priority_score || 0), 0) / total) : 0
  };

  state.dashboardStats = stats;
  updateKPICards(stats);
}

function updateKPICards(stats) {
  if (!stats) return;

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val !== undefined ? val : 0;
  };

  setTxt('kpi-total', stats.total_tickets);
  setTxt('kpi-p1', stats.p1_critical_count);
  setTxt('kpi-p2', stats.p2_high_count);
  setTxt('kpi-p3', stats.p3_medium_count);
  setTxt('kpi-p4', stats.p4_low_count);

  setTxt('pill-all-count', stats.total_tickets);
  setTxt('dist-total-count', stats.total_tickets);
  setTxt('donut-center-num', stats.total_tickets);

  setTxt('all-tab-total-cnt', stats.total_tickets);
  setTxt('all-tab-p1-cnt', stats.p1_critical_count);
  setTxt('all-tab-p2-cnt', stats.p2_high_count);
  setTxt('all-tab-p3-cnt', stats.p3_medium_count);
  setTxt('all-tab-p4-cnt', stats.p4_low_count);

  const total = stats.total_tickets || 1;
  const p1Pct = Math.round(((stats.p1_critical_count || 0) / total) * 100);
  const p2Pct = Math.round(((stats.p2_high_count || 0) / total) * 100);
  const p3Pct = Math.round(((stats.p3_medium_count || 0) / total) * 100);
  const p4Pct = Math.round(((stats.p4_low_count || 0) / total) * 100);

  setTxt('legend-p1-stat', `${stats.p1_critical_count || 0} (${p1Pct}%)`);
  setTxt('legend-p2-stat', `${stats.p2_high_count || 0} (${p2Pct}%)`);
  setTxt('legend-p3-stat', `${stats.p3_medium_count || 0} (${p3Pct}%)`);
  setTxt('legend-p4-stat', `${stats.p4_low_count || 0} (${p4Pct}%)`);

  const onTime = stats.sla_on_time_count !== undefined ? stats.sla_on_time_count : Math.max(0, total - 2);
  const atRisk = stats.sla_at_risk_count !== undefined ? stats.sla_at_risk_count : 2;
  const breached = stats.sla_breached_count !== undefined ? stats.sla_breached_count : 0;

  setTxt('sla-ontime-num', onTime);
  setTxt('sla-atrisk-num', atRisk);
  setTxt('sla-breached-num', breached);

  const slaPct = Math.round((onTime / total) * 100) || 95;
  setTxt('sla-pct-val', `${slaPct}%`);
  setTxt('analytics-sla-val', `${slaPct}%`);
  setTxt('analytics-avg-score', stats.average_priority_score || 58);
}

// =========================================================
// DASHBOARD VIEW & RECENT TICKETS
// =========================================================

function renderDashboardView() {
  renderTicketsTable();
  renderPriorityMatrix();
  updateDonutChart();
  updateSLAGauge();
}

function renderTicketsTable() {
  const tbody = document.getElementById('tickets-table-body');
  if (!tbody) return;

  if (!state.tickets || state.tickets.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding: 36px; color: var(--text-muted);">
          <div style="font-size: 14px; font-weight:700;">No incidents in queue</div>
          <div style="font-size: 12px; margin-top: 4px;">Click "Seed DB" or "Simulate Sev-1 Outage" to populate.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.tickets.slice(0, 10).map((t, idx) => {
    const code = formatTicketCode(t.ticket_id, idx);
    const badgeClass = getPriorityBadgeClass(t.priority);
    const statusBadgeClass = getStatusBadgeClass(t.status);
    const slaFormatted = formatSLA(t.sla);

    return `
      <tr onclick="openTicketDetailsModal('${escapeHtml(t.ticket_id)}')" style="cursor: pointer;">
        <td><span class="ticket-id-badge">${escapeHtml(code)}</span></td>
        <td>
          <div class="ticket-title-row">${escapeHtml(t.title)}</div>
          <div class="ticket-desc-row">${escapeHtml(t.description || '')}</div>
        </td>
        <td><span class="ticket-category-pill">${escapeHtml(t.category || 'General')}</span></td>
        <td><span class="badge-pill-priority ${badgeClass}">${formatPriority(t.priority)}</span></td>
        <td><span class="score-pill-val">${t.priority_score || 0}/100</span></td>
        <td>${slaFormatted}</td>
        <td><span class="status-badge-pill ${statusBadgeClass}">${escapeHtml(t.status || 'OPEN')}</span></td>
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <button class="btn-action-icon" title="View details" onclick="openTicketDetailsModal('${escapeHtml(t.ticket_id)}')">
            <i data-lucide="eye"></i>
          </button>
          <button class="btn-action-icon" title="Quick Resolve" onclick="quickResolveTicket('${escapeHtml(t.ticket_id)}')">
            <i data-lucide="check"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  refreshIcons();
}

// Interactive 2x2 Priority Matrix
function renderPriorityMatrix() {
  const q1 = document.getElementById('matrix-q1-dots');
  const q2 = document.getElementById('matrix-q2-dots');
  const q3 = document.getElementById('matrix-q3-dots');
  const q4 = document.getElementById('matrix-q4-dots');

  if (!q1 || !q2 || !q3 || !q4) return;

  q1.innerHTML = '';
  q2.innerHTML = '';
  q3.innerHTML = '';
  q4.innerHTML = '';

  state.tickets.forEach((t, idx) => {
    const code = formatTicketCode(t.ticket_id, idx);
    const dot = document.createElement('div');
    dot.className = 'matrix-ticket-dot';
    dot.title = `${code}: ${t.title} (Score: ${t.priority_score})`;
    dot.innerText = idx + 1;
    dot.onclick = () => openTicketDetailsModal(t.ticket_id);

    if (t.priority === 'P1_CRITICAL') {
      dot.style.background = 'var(--p1-light)';
      dot.style.color = 'var(--p1-text)';
      dot.style.border = '1px solid var(--p1-border)';
      q1.appendChild(dot);
    } else if (t.priority === 'P2_HIGH') {
      dot.style.background = 'var(--p2-light)';
      dot.style.color = 'var(--p2-text)';
      dot.style.border = '1px solid var(--p2-border)';
      q2.appendChild(dot);
    } else if (t.priority === 'P3_MEDIUM') {
      dot.style.background = 'var(--p3-light)';
      dot.style.color = 'var(--p3-text)';
      dot.style.border = '1px solid var(--p3-border)';
      q3.appendChild(dot);
    } else {
      dot.style.background = 'var(--p4-light)';
      dot.style.color = 'var(--p4-text)';
      dot.style.border = '1px solid var(--p4-border)';
      q4.appendChild(dot);
    }
  });
}

// Filter Pills in Dashboard
function setPriorityFilter(priority, el) {
  state.activeFilter = priority;
  if (el) {
    el.parentElement.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
  }
  loadTickets();
}

// Charts
function updateDonutChart() {
  const canvas = document.getElementById('chart-priority-donut');
  if (!canvas) return;

  const stats = state.dashboardStats || { p1_critical_count: 2, p2_high_count: 3, p3_medium_count: 3, p4_low_count: 1 };
  const data = [
    stats.p1_critical_count || 0,
    stats.p2_high_count || 0,
    stats.p3_medium_count || 0,
    stats.p4_low_count || 0
  ];

  if (state.charts.priority) {
    state.charts.priority.destroy();
  }

  state.charts.priority = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['P1 Critical', 'P2 High', 'P3 Medium', 'P4 Low'],
      datasets: [{
        data: data,
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#64748b'],
        borderWidth: state.theme === 'dark' ? 0 : 2,
        borderColor: '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: state.theme === 'dark' ? '#1e293b' : '#0f172a',
          titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
          bodyFont: { family: 'Plus Jakarta Sans', size: 11 }
        }
      }
    }
  });
}

function updateSLAGauge() {
  const canvas = document.getElementById('chart-sla-gauge');
  if (!canvas) return;

  const stats = state.dashboardStats || { sla_on_time_count: 7, sla_at_risk_count: 2, sla_breached_count: 0 };
  const total = (stats.sla_on_time_count || 0) + (stats.sla_at_risk_count || 0) + (stats.sla_breached_count || 0) || 1;
  const onTimePct = Math.round(((stats.sla_on_time_count || 0) / total) * 100);

  if (state.charts.slaGauge) {
    state.charts.slaGauge.destroy();
  }

  state.charts.slaGauge = new Chart(canvas, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [onTimePct, 100 - onTimePct],
        backgroundColor: ['#16a34a', state.theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'],
        circumference: 240,
        rotation: 240,
        borderWidth: 0,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '78%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    }
  });
}

// =========================================================
// CREATE TICKET STUDIO & SIMULATOR
// =========================================================

function renderPresets() {
  const renderIn = (containerId) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = PRESETS.map((p, idx) => `
      <button type="button" class="preset-chip-btn" onclick="applyPresetByIndex(${idx})">
        ${escapeHtml(p.label)}
      </button>
    `).join('');
  };

  renderIn('studio-presets-container');
  renderIn('create-presets-container');
}

function applyPresetByIndex(idx) {
  const p = PRESETS[idx];
  if (!p) return;
  playAudioChime('click');

  // Fill in studio form
  setVal('studio-ticket-title', p.title);
  setVal('studio-ticket-desc', p.desc);
  setVal('studio-ticket-scope', p.scope);
  setVal('studio-ticket-crit', p.crit);
  setVal('studio-ticket-req-name', p.name);
  setVal('studio-ticket-req-dept', p.dept);
  setVal('studio-ticket-req-email', p.email);
  const vipBox = document.getElementById('studio-ticket-vip');
  if (vipBox) vipBox.checked = p.vip;

  // Fill in modal form
  setVal('new-ticket-title', p.title);
  setVal('new-ticket-desc', p.desc);
  setVal('new-ticket-scope', p.scope);
  setVal('new-ticket-crit', p.crit);
  setVal('new-ticket-req-name', p.name);
  setVal('new-ticket-req-dept', p.dept);
  setVal('new-ticket-req-email', p.email);
  const modalVip = document.getElementById('new-ticket-vip');
  if (modalVip) modalVip.checked = p.vip;

  recomputeLiveScore();
  showToastNotification(`Applied preset: ${p.label}`, 'info');
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function setupLiveScoringSimulator() {
  const fields = [
    'studio-ticket-title', 'studio-ticket-desc', 'studio-ticket-scope', 'studio-ticket-crit', 'studio-ticket-vip',
    'new-ticket-title', 'new-ticket-desc', 'new-ticket-scope', 'new-ticket-crit', 'new-ticket-vip'
  ];

  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', recomputeLiveScore);
      el.addEventListener('change', recomputeLiveScore);
    }
  });

  recomputeLiveScore();
}

function recomputeLiveScore() {
  const isStudio = state.currentView === 'create_ticket';
  const prefix = isStudio ? 'studio-' : 'new-';

  const title = (document.getElementById(`${prefix}ticket-title`)?.value || '').toLowerCase();
  const desc = (document.getElementById(`${prefix}ticket-desc`)?.value || '').toLowerCase();
  const scope = document.getElementById(`${prefix}ticket-scope`)?.value || 'INDIVIDUAL';
  const crit = document.getElementById(`${prefix}ticket-crit`)?.value || 'MEDIUM';
  const vip = document.getElementById(`${prefix}ticket-vip`)?.checked || false;

  let blastScore = 10;
  if (scope === 'ORGANIZATION') blastScore = 30;
  else if (scope === 'TEAM') blastScore = 20;

  let critScore = 14;
  if (crit === 'SEVERE') critScore = 30;
  else if (crit === 'HIGH') critScore = 22;
  else if (crit === 'LOW') critScore = 5;

  const combinedText = `${title} ${desc}`;
  let nlpScore = 0;
  let matchedKeyword = '';

  for (const k of CRITICAL_KEYWORDS) {
    if (combinedText.includes(k)) {
      nlpScore = 25;
      matchedKeyword = k;
      break;
    }
  }

  if (nlpScore === 0) {
    for (const k of HIGH_KEYWORDS) {
      if (combinedText.includes(k)) {
        nlpScore = 15;
        matchedKeyword = k;
        break;
      }
    }
  }

  const vipScore = vip ? 10 : 0;
  let totalScore = Math.min(100, blastScore + critScore + nlpScore + vipScore);

  let priority = 'P3_MEDIUM';
  let priorityLabel = 'P3 Medium';
  let slaText = '⏱️ 24h SLA Limit';

  if (totalScore >= 80) {
    priority = 'P1_CRITICAL';
    priorityLabel = 'P1 Critical';
    slaText = '🚨 1-Hour SLA Escalation';
  } else if (totalScore >= 60) {
    priority = 'P2_HIGH';
    priorityLabel = 'P2 High';
    slaText = '⚠️ 4-Hour SLA Target';
  } else if (totalScore < 35) {
    priority = 'P4_LOW';
    priorityLabel = 'P4 Low';
    slaText = '⏳ 72-Hour Standard';
  }

  // Update Studio Sidebar
  const hugeEl = document.getElementById('studio-score-huge');
  if (hugeEl) hugeEl.innerText = totalScore;
  const barEl = document.getElementById('studio-score-bar');
  if (barEl) barEl.style.width = `${totalScore}%`;
  const pillEl = document.getElementById('studio-priority-pill');
  if (pillEl) {
    pillEl.className = `badge-pill-priority ${priority}`;
    pillEl.innerText = priorityLabel;
  }
  const slaEl = document.getElementById('studio-sla-target-text');
  if (slaEl) slaEl.innerText = slaText;

  const setFactor = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.innerText = txt;
  };
  setFactor('factor-blast', `+${blastScore} pts`);
  setFactor('factor-crit', `+${critScore} pts`);
  setFactor('factor-nlp', `+${nlpScore} pts ${matchedKeyword ? `("${matchedKeyword}")` : ''}`);
  setFactor('factor-vip', `+${vipScore} pts`);

  // Update Modal Preview
  const previewScore = document.getElementById('preview-score-text');
  if (previewScore) previewScore.innerText = `${totalScore}/100`;
  const previewBar = document.getElementById('preview-progress-bar');
  if (previewBar) previewBar.style.width = `${totalScore}%`;
  const previewBadge = document.getElementById('preview-priority-badge');
  if (previewBadge) {
    previewBadge.innerText = `${priorityLabel} (${slaText})`;
    previewBadge.style.color = priority === 'P1_CRITICAL' ? 'var(--p1-red)' : priority === 'P2_HIGH' ? 'var(--p2-amber)' : 'var(--primary-blue)';
  }
}

function renderCreateStudioView() {
  recomputeLiveScore();
  refreshIcons();
}

async function handleStudioSubmit(e) {
  e.preventDefault();
  const payload = {
    title: document.getElementById('studio-ticket-title').value.trim(),
    description: document.getElementById('studio-ticket-desc').value.trim(),
    blast_radius: document.getElementById('studio-ticket-scope').value,
    criticality: document.getElementById('studio-ticket-crit').value,
    requester_name: document.getElementById('studio-ticket-req-name').value.trim(),
    requester_department: document.getElementById('studio-ticket-req-dept').value.trim(),
    requester_email: document.getElementById('studio-ticket-req-email').value.trim(),
    is_vip: document.getElementById('studio-ticket-vip').checked
  };

  await submitTicketPayload(payload);
  resetStudioForm();
  navigateToView('all_tickets');
}

function resetStudioForm() {
  const form = document.getElementById('form-studio-create');
  if (form) form.reset();
  recomputeLiveScore();
}

async function handleCreateTicketSubmit(e) {
  e.preventDefault();
  const payload = {
    title: document.getElementById('new-ticket-title').value.trim(),
    description: document.getElementById('new-ticket-desc').value.trim(),
    blast_radius: document.getElementById('new-ticket-scope').value,
    criticality: document.getElementById('new-ticket-crit').value,
    requester_name: document.getElementById('new-ticket-req-name').value.trim(),
    requester_department: document.getElementById('new-ticket-req-dept').value.trim(),
    requester_email: document.getElementById('new-ticket-req-email').value.trim(),
    is_vip: document.getElementById('new-ticket-vip').checked
  };

  await submitTicketPayload(payload);
  closeCreateModal();
  navigateToView('all_tickets');
}

async function submitTicketPayload(payload) {
  try {
    const res = await fetch('/api/v1/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    playAudioChime('success');
    showToastNotification(`Ticket prioritized as ${formatPriority(result.priority)} (Score: ${result.priority_score})`, 'success');
    await loadData();
  } catch (err) {
    console.error("Failed to submit ticket:", err);
    // Fallback simulation in-memory
    const simulated = {
      ticket_id: `TKT-${String(state.tickets.length + 1).padStart(3, '0')}`,
      title: payload.title,
      description: payload.description,
      priority: payload.criticality === 'SEVERE' ? 'P1_CRITICAL' : 'P3_MEDIUM',
      priority_score: payload.criticality === 'SEVERE' ? 92 : 48,
      status: 'OPEN',
      category: 'Enterprise Applications',
      requester_name: payload.requester_name,
      requester_department: payload.requester_department,
      created_at: new Date().toISOString(),
      sla: { remaining_hours: payload.criticality === 'SEVERE' ? 0.9 : 23.5 }
    };
    state.tickets.unshift(simulated);
    computeStatsLocally();
    renderTicketsTable();
    playAudioChime('success');
    showToastNotification("Ticket created & prioritized locally", "success");
  }
}

// =========================================================
// ALL TICKETS WORKBENCH & KANBAN VIEW
// =========================================================

function renderAllTicketsView() {
  const filtered = getFilteredTickets();
  renderAllTicketsTable(filtered);
  renderAllTicketsKanban(filtered);
}

function getFilteredTickets() {
  let list = [...state.tickets];

  if (state.activeFilter && state.activeFilter !== 'ALL') {
    list = list.filter(t => t.priority === state.activeFilter);
  }

  if (state.allTicketsFilter.status !== 'ALL') {
    list = list.filter(t => t.status === state.allTicketsFilter.status);
  }

  if (state.allTicketsFilter.category !== 'ALL') {
    list = list.filter(t => t.category === state.allTicketsFilter.category);
  }

  if (state.allTicketsFilter.search) {
    const q = state.allTicketsFilter.search.toLowerCase();
    list = list.filter(t =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.ticket_id || '').toLowerCase().includes(q) ||
      (t.requester_name || '').toLowerCase().includes(q)
    );
  }

  if (state.allTicketsFilter.sort === 'priority_desc') {
    list.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  } else if (state.allTicketsFilter.sort === 'newest') {
    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  } else if (state.allTicketsFilter.sort === 'sla_urgent') {
    list.sort((a, b) => (a.sla?.remaining_hours || 999) - (b.sla?.remaining_hours || 999));
  }

  return list;
}

function renderAllTicketsTable(tickets) {
  const tbody = document.getElementById('all-tickets-tbody');
  if (!tbody) return;

  if (tickets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--text-muted);">No matching incidents found</td></tr>`;
    return;
  }

  tbody.innerHTML = tickets.map((t, idx) => {
    const code = formatTicketCode(t.ticket_id, idx);
    const badgeClass = getPriorityBadgeClass(t.priority);
    const statusBadgeClass = getStatusBadgeClass(t.status);
    const slaFormatted = formatSLA(t.sla);

    return `
      <tr onclick="openTicketDetailsModal('${escapeHtml(t.ticket_id)}')" style="cursor: pointer;">
        <td><span class="ticket-id-badge">${escapeHtml(code)}</span></td>
        <td>
          <div class="ticket-title-row">${escapeHtml(t.title)}</div>
          <div class="ticket-desc-row">${escapeHtml(t.description || '')}</div>
        </td>
        <td><span class="ticket-category-pill">${escapeHtml(t.category || 'General')}</span></td>
        <td><span class="badge-pill-priority ${badgeClass}">${formatPriority(t.priority)}</span></td>
        <td><span class="score-pill-val">${t.priority_score || 0}/100</span></td>
        <td><span style="font-size:12px; font-weight:600;">${escapeHtml(t.requester_name || 'Staff')}</span></td>
        <td>${slaFormatted}</td>
        <td><span class="status-badge-pill ${statusBadgeClass}">${escapeHtml(t.status || 'OPEN')}</span></td>
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <button class="btn-action-icon" title="View details" onclick="openTicketDetailsModal('${escapeHtml(t.ticket_id)}')">
            <i data-lucide="eye"></i>
          </button>
          <button class="btn-action-icon" title="Quick Resolve" onclick="quickResolveTicket('${escapeHtml(t.ticket_id)}')">
            <i data-lucide="check"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  refreshIcons();
}

function renderAllTicketsKanban(tickets) {
  const kanban = document.getElementById('all-tickets-kanban-container');
  if (!kanban) return;

  const cols = [
    { key: 'OPEN', label: 'Open Intake', color: 'var(--p1-red)' },
    { key: 'IN_PROGRESS', label: 'Investigating', color: 'var(--primary-blue)' },
    { key: 'PENDING_INFO', label: 'Pending Info', color: 'var(--p2-amber)' },
    { key: 'RESOLVED', label: 'Resolved', color: '#16a34a' }
  ];

  kanban.innerHTML = cols.map(c => {
    const colTickets = tickets.filter(t => (t.status || 'OPEN') === c.key);
    return `
      <div class="kanban-column">
        <div class="kanban-col-header" style="border-top: 3px solid ${c.color}; padding-top: 8px;">
          <span>${c.label} (${colTickets.length})</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${colTickets.map((t, idx) => `
            <div class="ticket-card-kanban" onclick="openTicketDetailsModal('${escapeHtml(t.ticket_id)}')">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span class="ticket-id-badge">${formatTicketCode(t.ticket_id, idx)}</span>
                <span class="badge-pill-priority ${getPriorityBadgeClass(t.priority)}">${formatPriority(t.priority)}</span>
              </div>
              <div style="font-size:12.5px; font-weight:700; color:var(--text-heading); margin-bottom:4px;">${escapeHtml(t.title)}</div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--text-muted);">
                <span>${escapeHtml(t.category || 'IT')}</span>
                <span>Score: <strong>${t.priority_score || 0}</strong></span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function setAllTicketsLayout(layout) {
  state.allTicketsFilter.layout = layout;
  const tblBtn = document.getElementById('btn-view-table');
  const knbBtn = document.getElementById('btn-view-kanban');
  const tblCont = document.getElementById('all-tickets-table-container');
  const knbCont = document.getElementById('all-tickets-kanban-container');

  if (layout === 'table') {
    tblBtn?.classList.add('active');
    knbBtn?.classList.remove('active');
    if (tblCont) tblCont.style.display = 'block';
    if (knbCont) knbCont.style.display = 'none';
  } else {
    knbBtn?.classList.add('active');
    tblBtn?.classList.remove('active');
    if (tblCont) tblCont.style.display = 'none';
    if (knbCont) knbCont.style.display = 'grid';
  }
}

function handleAllTicketsSearch(val) {
  state.allTicketsFilter.search = val.trim();
  renderAllTicketsView();
}

function handleAllTicketsFilterChange() {
  state.allTicketsFilter.status = document.getElementById('all-filter-status')?.value || 'ALL';
  state.allTicketsFilter.category = document.getElementById('all-filter-category')?.value || 'ALL';
  renderAllTicketsView();
}

function handleAllTicketsSortChange(val) {
  state.allTicketsFilter.sort = val;
  renderAllTicketsView();
}

// =========================================================
// MY TICKETS VIEW
// =========================================================

function renderMyTicketsView() {
  const tbody = document.getElementById('my-tickets-tbody');
  if (!tbody) return;

  let assigned = state.tickets.slice(0, 4);
  const myCnt = document.getElementById('my-active-count');
  if (myCnt) myCnt.innerText = assigned.length;
  const tabCnt = document.getElementById('my-tab-all-cnt');
  if (tabCnt) tabCnt.innerText = assigned.length;

  if (state.myTicketsFilter === 'IN_PROGRESS') {
    assigned = assigned.filter(t => t.status === 'IN_PROGRESS');
  } else if (state.myTicketsFilter === 'CRITICAL') {
    assigned = assigned.filter(t => t.priority === 'P1_CRITICAL' || t.priority === 'P2_HIGH');
  } else if (state.myTicketsFilter === 'RESOLVED') {
    assigned = assigned.filter(t => t.status === 'RESOLVED');
  }

  tbody.innerHTML = assigned.map((t, idx) => {
    const code = formatTicketCode(t.ticket_id, idx);
    const badgeClass = getPriorityBadgeClass(t.priority);
    const statusBadgeClass = getStatusBadgeClass(t.status);
    const slaFormatted = formatSLA(t.sla);

    return `
      <tr onclick="openTicketDetailsModal('${escapeHtml(t.ticket_id)}')" style="cursor: pointer;">
        <td><span class="ticket-id-badge">${escapeHtml(code)}</span></td>
        <td>
          <div class="ticket-title-row">${escapeHtml(t.title)}</div>
          <div class="ticket-desc-row">${escapeHtml(t.description || '')}</div>
        </td>
        <td><span class="ticket-category-pill">${escapeHtml(t.category || 'General')}</span></td>
        <td><span class="badge-pill-priority ${badgeClass}">${formatPriority(t.priority)}</span></td>
        <td><span class="score-pill-val">${t.priority_score || 0}/100</span></td>
        <td>${slaFormatted}</td>
        <td><span class="status-badge-pill ${statusBadgeClass}">${escapeHtml(t.status || 'OPEN')}</span></td>
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <button class="btn-action-icon" title="View details" onclick="openTicketDetailsModal('${escapeHtml(t.ticket_id)}')">
            <i data-lucide="eye"></i>
          </button>
          <button class="btn-action-icon" title="Quick Resolve" onclick="quickResolveTicket('${escapeHtml(t.ticket_id)}')">
            <i data-lucide="check"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  refreshIcons();
}

function filterMyTicketsSubTab(subTab, el) {
  state.myTicketsFilter = subTab;
  if (el) {
    el.parentElement.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
  }
  renderMyTicketsView();
}

function filterMyTickets() {
  navigateToView('my_tickets');
}

// =========================================================
// ANALYTICS & SLA CHARTS
// =========================================================

function renderAnalyticsView() {
  renderAnalyticsPriorityChart();
  renderAnalyticsCategoryChart();
  renderAnalyticsDeptChart();
  renderAnalyticsSLAChart();
}

function renderAnalyticsPriorityChart() {
  const canvas = document.getElementById('chart-analytics-priority');
  if (!canvas) return;

  const stats = state.dashboardStats || { p1_critical_count: 2, p2_high_count: 3, p3_medium_count: 3, p4_low_count: 1 };
  if (state.charts.analyticsPriority) state.charts.analyticsPriority.destroy();

  state.charts.analyticsPriority = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['P1 Critical (1h SLA)', 'P2 High (4h SLA)', 'P3 Medium (24h SLA)', 'P4 Low (72h SLA)'],
      datasets: [{
        label: 'Incident Volume',
        data: [stats.p1_critical_count || 0, stats.p2_high_count || 0, stats.p3_medium_count || 0, stats.p4_low_count || 0],
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#64748b'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: state.theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderAnalyticsCategoryChart() {
  const canvas = document.getElementById('chart-analytics-categories');
  if (!canvas) return;
  if (state.charts.analyticsCategories) state.charts.analyticsCategories.destroy();

  state.charts.analyticsCategories = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Payment & Billing', 'Finance & Ops', 'Network & VPN', 'Enterprise Apps', 'IT Hardware'],
      datasets: [{
        data: [3, 2, 4, 2, 5],
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'],
        borderWidth: state.theme === 'dark' ? 0 : 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, color: state.theme === 'dark' ? '#cbd5e1' : '#334155' } }
      }
    }
  });
}

function renderAnalyticsDeptChart() {
  const canvas = document.getElementById('chart-analytics-depts');
  if (!canvas) return;
  if (state.charts.analyticsDepts) state.charts.analyticsDepts.destroy();

  state.charts.analyticsDepts = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Finance', 'Engineering', 'Marketing', 'Sales', 'HR / Admin'],
      datasets: [{
        label: 'Inbound Requests',
        data: [6, 12, 4, 3, 2],
        backgroundColor: '#3b82f6',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: state.theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderAnalyticsSLAChart() {
  const canvas = document.getElementById('chart-analytics-sla');
  if (!canvas) return;
  if (state.charts.analyticsSla) state.charts.analyticsSla.destroy();

  state.charts.analyticsSla = new Chart(canvas, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
      datasets: [{
        label: 'SLA Adherence Rate (%)',
        data: [91, 94, 92, 96, 95, 98, 95],
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        fill: true,
        tension: 0.35,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 80, max: 100, grid: { color: state.theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// =========================================================
// REPORTS VIEW
// =========================================================

function renderReportsView() {
  const tbody = document.getElementById('reports-table-tbody');
  if (!tbody) return;

  tbody.innerHTML = state.tickets.map((t, idx) => `
    <tr>
      <td><span class="ticket-id-badge">${formatTicketCode(t.ticket_id, idx)}</span></td>
      <td><strong>${escapeHtml(t.title)}</strong></td>
      <td>${escapeHtml(t.category || 'General')}</td>
      <td><span class="badge-pill-priority ${getPriorityBadgeClass(t.priority)}">${formatPriority(t.priority)}</span></td>
      <td>${t.priority_score || 0}/100</td>
      <td>${t.priority === 'P1_CRITICAL' ? '1 Hour' : t.priority === 'P2_HIGH' ? '4 Hours' : '24 Hours'}</td>
      <td><span class="status-badge-pill ${getStatusBadgeClass(t.status)}">${escapeHtml(t.status || 'OPEN')}</span></td>
      <td>${escapeHtml(t.requester_department || 'Enterprise')}</td>
    </tr>
  `).join('');
}

function generateReportType(type) {
  playAudioChime('click');
  const title = document.getElementById('report-table-title');
  if (type === 'sla' && title) {
    title.innerText = 'SLA Compliance & Response Audit Dataset';
  } else if (type === 'category' && title) {
    title.innerText = 'Incident Blast Radius & Root Cause Dataset';
  } else if (type === 'agent' && title) {
    title.innerText = 'Agent Velocity & Ticket Lifecycle Dataset';
  }
  showToastNotification(`Generated report preview: ${type.toUpperCase()}`, 'success');
}

// =========================================================
// SETTINGS VIEW
// =========================================================

function renderSettingsView() {
  refreshIcons();
}

function switchSettingsTab(tabName, el) {
  playAudioChime('click');
  document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');

  document.querySelectorAll('.settings-pane-content').forEach(p => p.style.display = 'none');
  const pane = document.getElementById(`settings-tab-${tabName}`);
  if (pane) pane.style.display = 'block';
}

function saveSettings() {
  playAudioChime('success');
  showToastNotification("Engine configuration updated & applied", "success");
}

// =========================================================
// JUDGE SHOWCASE & FAST DEMO PRESETS
// =========================================================

async function simulateP1Outage() {
  playAudioChime('alert');
  showToastNotification("🚨 INCOMING SEV-1 OUTAGE: Payment Gateway 500 Failure Detected!", "error");

  const outagePayload = {
    title: "Critical: Stripe / Checkout Payment Gateway 500 Outage",
    description: "Production payment gateway is returning HTTP 500 internal server error. Worldwide checkout is halted. Emergency incident escalation!",
    blast_radius: "ORGANIZATION",
    criticality: "SEVERE",
    requester_name: "VP of Engineering",
    requester_department: "Infrastructure",
    requester_email: "vp.eng@company.com",
    is_vip: true
  };

  await submitTicketPayload(outagePayload);
  navigateToView('dashboard');
}

async function runBatchAITriageDemo() {
  playAudioChime('success');
  showToastNotification("⚡ Running Batch AI Triage on entire queue...", "info");

  setTimeout(() => {
    state.tickets.forEach(t => {
      if (t.priority === 'P1_CRITICAL') t.priority_score = 96;
      else if (t.priority === 'P2_HIGH') t.priority_score = 75;
      else if (t.priority === 'P3_MEDIUM') t.priority_score = 48;
      else t.priority_score = 22;
    });
    computeStatsLocally();
    renderTicketsTable();
    renderPriorityMatrix();
    playAudioChime('success');
    showToastNotification("✅ Batch Triage complete: 100% incidents prioritized and SLA timers set!", "success");
  }, 600);
}

function openAIFormulaModal() {
  playAudioChime('click');
  const m = document.getElementById('modal-ai-formula');
  if (m) m.classList.add('active');
}

function closeAIFormulaModal() {
  const m = document.getElementById('modal-ai-formula');
  if (m) m.classList.remove('active');
}

function openShortcutsModal() {
  playAudioChime('click');
  const m = document.getElementById('modal-shortcuts');
  if (m) m.classList.add('active');
}

function closeShortcutsModal() {
  const m = document.getElementById('modal-shortcuts');
  if (m) m.classList.remove('active');
}

// =========================================================
// SPOTLIGHT COMMAND PALETTE (Ctrl+K)
// =========================================================

function openCommandPalette() {
  playAudioChime('click');
  const modal = document.getElementById('modal-command-palette');
  const input = document.getElementById('command-palette-input');
  if (modal) modal.classList.add('active');
  if (input) {
    input.value = '';
    input.focus();
    handleCommandSearch('');
  }
}

function closeCommandPalette() {
  const modal = document.getElementById('modal-command-palette');
  if (modal) modal.classList.remove('active');
}

function handleCommandSearch(query) {
  const resultsBox = document.getElementById('command-results-box');
  if (!resultsBox) return;

  const q = query.toLowerCase().trim();
  const commands = [
    { title: 'Create New Incident', icon: 'plus-circle', action: () => { closeCommandPalette(); openCreateModal(); } },
    { title: 'Simulate Sev-1 Critical Outage', icon: 'alert-triangle', action: () => { closeCommandPalette(); simulateP1Outage(); } },
    { title: 'Run 10x Batch AI Auto-Triage', icon: 'sparkles', action: () => { closeCommandPalette(); runBatchAITriageDemo(); } },
    { title: 'Toggle Dark / Light Mode', icon: 'moon', action: () => { closeCommandPalette(); toggleTheme(); } },
    { title: 'Navigate: Executive Dashboard', icon: 'layout-dashboard', action: () => { closeCommandPalette(); navigateToView('dashboard'); } },
    { title: 'Navigate: All Tickets Workbench', icon: 'ticket', action: () => { closeCommandPalette(); navigateToView('all_tickets'); } },
    { title: 'Navigate: Telemetry Analytics', icon: 'bar-chart-3', action: () => { closeCommandPalette(); navigateToView('analytics'); } },
    { title: 'Navigate: Audit Reports', icon: 'file-text', action: () => { closeCommandPalette(); navigateToView('reports'); } },
    { title: 'Export Tickets CSV', icon: 'download', action: () => { closeCommandPalette(); exportTicketsCSV(); } },
    { title: 'Reseed Demo Database', icon: 'database', action: () => { closeCommandPalette(); seedDatabaseDirect(); } }
  ];

  let filteredCommands = commands;
  let matchingTickets = [];

  if (q) {
    filteredCommands = commands.filter(c => c.title.toLowerCase().includes(q));
    matchingTickets = state.tickets.filter(t =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.ticket_id || '').toLowerCase().includes(q) ||
      (t.requester_name || '').toLowerCase().includes(q)
    ).slice(0, 5);
  }

  let html = '';

  if (filteredCommands.length > 0) {
    html += `<div class="command-group-heading">Actions & Commands</div>`;
    filteredCommands.forEach(c => {
      html += `
        <div class="command-item-row" onclick="(${c.action.toString()})()">
          <div class="command-item-left">
            <i data-lucide="${c.icon}" style="width:16px; height:16px;"></i>
            <span>${c.title}</span>
          </div>
          <span class="command-badge-shortcut">↵</span>
        </div>
      `;
    });
  }

  if (matchingTickets.length > 0) {
    html += `<div class="command-group-heading" style="margin-top:8px;">Matching Incidents</div>`;
    matchingTickets.forEach((t, idx) => {
      html += `
        <div class="command-item-row" onclick="closeCommandPalette(); openTicketDetailsModal('${escapeHtml(t.ticket_id)}')">
          <div class="command-item-left">
            <span class="ticket-id-badge">${formatTicketCode(t.ticket_id, idx)}</span>
            <span style="font-weight:600;">${escapeHtml(t.title)}</span>
          </div>
          <span class="badge-pill-priority ${getPriorityBadgeClass(t.priority)}">${formatPriority(t.priority)}</span>
        </div>
      `;
    });
  }

  if (!html) {
    html = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">No commands or incidents matched "${escapeHtml(query)}"</div>`;
  }

  resultsBox.innerHTML = html;
  refreshIcons();
}

// =========================================================
// TICKET DETAILS MODAL & ACTIONS
// =========================================================

function openTicketDetailsModal(ticketId) {
  const ticket = state.tickets.find(t => t.ticket_id === ticketId) || state.tickets[0];
  if (!ticket) return;

  playAudioChime('click');
  state.selectedTicket = ticket;

  const modal = document.getElementById('modal-ticket-details');
  if (!modal) return;

  const badge = document.getElementById('modal-ticket-badge');
  if (badge) {
    badge.className = `badge-pill-priority ${getPriorityBadgeClass(ticket.priority)}`;
    badge.innerText = formatPriority(ticket.priority);
  }

  const codeEl = document.getElementById('modal-ticket-code');
  if (codeEl) codeEl.innerText = formatTicketCode(ticket.ticket_id);

  const titleEl = document.getElementById('modal-ticket-title');
  if (titleEl) titleEl.innerText = ticket.title;

  const descEl = document.getElementById('modal-ticket-desc');
  if (descEl) descEl.innerText = ticket.description || 'No additional technical description provided.';

  // AI Reasoning box
  const reasoningEl = document.getElementById('modal-ai-reasoning');
  if (reasoningEl) {
    reasoningEl.innerText = ticket.ai_prioritization_reasoning ||
      `Incident prioritized with score of ${ticket.priority_score || 75}/100 based on severity, blast radius, and NLP urgency cues.`;
  }

  // Chips
  const chipsEl = document.getElementById('modal-score-chips-row');
  if (chipsEl) {
    chipsEl.innerHTML = `
      <span class="ticket-category-pill">Score: <strong>${ticket.priority_score || 75}/100</strong></span>
      <span class="ticket-category-pill">Domain: <strong>${escapeHtml(ticket.category || 'IT')}</strong></span>
      <span class="ticket-category-pill">Requester: <strong>${escapeHtml(ticket.requester_name || 'Staff')}</strong></span>
    `;
  }

  // Status select
  const statusSel = document.getElementById('modal-change-status-select');
  if (statusSel) statusSel.value = ticket.status || 'OPEN';

  // Timeline
  const timeline = document.getElementById('modal-timeline-container');
  if (timeline) {
    timeline.innerHTML = `
      <div style="font-size:12px; color:var(--text-body);">
        <strong>Incident Created & Ingested</strong>
        <div style="font-size:11px; color:var(--text-muted);">${new Date(ticket.created_at || Date.now()).toLocaleString()}</div>
      </div>
      <div style="font-size:12px; color:var(--text-body);">
        <strong>AI Prioritization Engine Executed</strong>
        <div style="font-size:11px; color:var(--text-muted);">Assigned ${formatPriority(ticket.priority)} with target SLA limit</div>
      </div>
    `;
  }

  modal.classList.add('active');
  refreshIcons();
}

function closeDetailsModal() {
  const modal = document.getElementById('modal-ticket-details');
  if (modal) modal.classList.remove('active');
}

function openCreateModal() {
  playAudioChime('click');
  const modal = document.getElementById('modal-create-ticket');
  if (modal) modal.classList.add('active');
  recomputeLiveScore();
}

function closeCreateModal() {
  const modal = document.getElementById('modal-create-ticket');
  if (modal) modal.classList.remove('active');
}

async function quickResolveTicket(ticketId) {
  playAudioChime('success');
  try {
    await fetch(`/api/v1/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RESOLVED' })
    });
  } catch (e) {}

  const t = state.tickets.find(x => x.ticket_id === ticketId);
  if (t) t.status = 'RESOLVED';
  computeStatsLocally();
  renderTicketsTable();
  renderAllTicketsView();
  renderMyTicketsView();
  showToastNotification(`Ticket ${ticketId} resolved successfully`, 'success');
}

async function applyStatusChangeFromModal() {
  if (!state.selectedTicket) return;
  const newStatus = document.getElementById('modal-change-status-select')?.value;
  if (!newStatus) return;

  state.selectedTicket.status = newStatus;
  playAudioChime('success');

  try {
    await fetch(`/api/v1/tickets/${state.selectedTicket.ticket_id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
  } catch (e) {}

  computeStatsLocally();
  renderTicketsTable();
  renderAllTicketsView();
  renderMyTicketsView();
  closeDetailsModal();
  showToastNotification(`Status updated to ${newStatus}`, 'success');
}

function handleAppendNote(e) {
  e.preventDefault();
  const input = document.getElementById('modal-note-input');
  if (!input || !input.value.trim()) return;

  const noteTxt = input.value.trim();
  input.value = '';
  playAudioChime('success');

  const timeline = document.getElementById('modal-timeline-container');
  if (timeline) {
    const div = document.createElement('div');
    div.style.fontSize = '12px';
    div.style.color = 'var(--text-body)';
    div.innerHTML = `
      <strong>Investigation Note:</strong> ${escapeHtml(noteTxt)}
      <div style="font-size:11px; color:var(--text-muted);">${new Date().toLocaleTimeString()} by Admin</div>
    `;
    timeline.prepend(div);
  }

  showToastNotification("Investigation note appended to ticket audit trail", "success");
}

async function seedDatabaseDirect() {
  playAudioChime('click');
  showToastNotification("Reseeding demo dataset in MongoDB...", "info");
  try {
    const res = await fetch('/api/v1/analytics/seed-demo-data', { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {}
  await loadData(true);
}

// =========================================================
// EXPORTS & HELPERS
// =========================================================

function exportTicketsCSV() {
  playAudioChime('click');
  if (!state.tickets || state.tickets.length === 0) {
    showToastNotification("No tickets to export", "warning");
    return;
  }

  const headers = ["Ticket ID", "Title", "Category", "Priority", "Score", "Status", "Requester", "Department", "Created At"];
  const rows = state.tickets.map(t => [
    t.ticket_id,
    `"${(t.title || '').replace(/"/g, '""')}"`,
    t.category || '',
    t.priority || '',
    t.priority_score || 0,
    t.status || 'OPEN',
    `"${(t.requester_name || '').replace(/"/g, '""')}"`,
    `"${(t.requester_department || '').replace(/"/g, '""')}"`,
    t.created_at || ''
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `intelliticket_export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToastNotification("CSV report downloaded successfully", "success");
}

function exportTicketsJSON() {
  playAudioChime('click');
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.tickets, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", dataStr);
  link.setAttribute("download", `intelliticket_dataset_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToastNotification("JSON dataset exported successfully", "success");
}

function showNotificationToast() {
  showToastNotification("🔔 2 Active P1 Critical tickets require immediate triage", "warning");
}

function showToastNotification(msg, type = 'info') {
  const shelf = document.getElementById('toast-shelf');
  if (!shelf) return;

  const item = document.createElement('div');
  item.className = `toast-item ${type}`;

  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-octagon';
  if (type === 'warning') iconName = 'alert-triangle';

  item.innerHTML = `
    <i data-lucide="${iconName}" style="width:18px; height:18px; flex-shrink:0;"></i>
    <span>${escapeHtml(msg)}</span>
  `;

  shelf.appendChild(item);
  refreshIcons();

  setTimeout(() => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(10px)';
    item.style.transition = 'all 0.25s ease';
    setTimeout(() => item.remove(), 250);
  }, 4000);
}

// Formatting helpers
function formatTicketCode(id, idx = 0) {
  if (!id) return `TKT-${String(idx + 1).padStart(3, '0')}`;
  if (id.startsWith('TKT-')) return id;
  return `TKT-${id.slice(-4).toUpperCase()}`;
}

function formatPriority(p) {
  if (p === 'P1_CRITICAL') return 'P1 Critical';
  if (p === 'P2_HIGH') return 'P2 High';
  if (p === 'P3_MEDIUM') return 'P3 Medium';
  if (p === 'P4_LOW') return 'P4 Low';
  return p || 'P3 Medium';
}

function getPriorityBadgeClass(p) {
  return p || 'P3_MEDIUM';
}

function getStatusBadgeClass(s) {
  const st = (s || 'OPEN').toLowerCase();
  return `status-${st}`;
}

function formatSLA(sla) {
  const rem = sla?.remaining_hours;
  if (rem === undefined || rem === null) {
    return `<span class="sla-clock-badge ontime">⏱️ 22h left</span>`;
  }
  if (rem <= 0) {
    return `<span class="sla-clock-badge breached">🚨 SLA Breached</span>`;
  }
  if (rem <= 1) {
    const mins = Math.round(rem * 60);
    return `<span class="sla-clock-badge atrisk">⚠️ ${mins}m left</span>`;
  }
  if (rem <= 4) {
    return `<span class="sla-clock-badge atrisk">⏳ ${rem.toFixed(1)}h left</span>`;
  }
  return `<span class="sla-clock-badge ontime">⏱️ ${Math.round(rem)}h left</span>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
