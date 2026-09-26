/**
 * IntelliTicket - Intelligent Service Request & Prioritization System
 * Enterprise Client Application Controller
 */

// Global App State
const state = {
  currentTab: 'analytics',
  viewMode: 'list', // 'list' or 'kanban'
  tickets: [],
  dashboardStats: null,
  filterPriority: 'ALL',
  filterStatus: 'ALL',
  filterCategory: 'ALL',
  filterBreached: false,
  searchQuery: '',
  selectedTicket: null,
  charts: {
    priority: null,
    category: null,
    status: null
  },
  autoRefreshInterval: null,
  isAutoRefreshEnabled: true
};

// Preset Enterprise Scenarios for Quick Ingestion Testing
const PRESETS = [
  {
    label: "🔥 Prod Database Down",
    title: "EMERGENCY: Primary Production Database Cluster Unresponsive",
    description: "Our primary PostgreSQL and Redis clusters are reporting high connection failures. Checkout and user login APIs are failing globally. Immediate production outage fix required!",
    impact_scope: "ORGANIZATION",
    business_criticality: "SEVERE",
    name: "Alex Rivera",
    email: "a.rivera@company.com",
    dept: "Site Reliability",
    is_vip: true
  },
  {
    label: "💳 Payment Webhook 500",
    title: "Critical: Stripe & Razorpay Webhook Failures causing lost orders",
    description: "Incoming payment confirmation webhooks are throwing error 500 and timeout. Customers are being charged but orders are not marked as completed.",
    impact_scope: "ORGANIZATION",
    business_criticality: "SEVERE",
    name: "Vikram Mehta",
    email: "v.mehta@company.com",
    dept: "Payments & Billing",
    is_vip: false
  },
  {
    label: "🔐 VIP Account Locked Out",
    title: "Urgent: CFO locked out of banking approval portal before payroll cutoff",
    description: "2FA hardware token expired and unable to login to Corporate Banking portal. Payroll disbursement cut-off is in 2 hours.",
    impact_scope: "TEAM",
    business_criticality: "HIGH",
    name: "Catherine Vance",
    email: "c.vance@company.com",
    dept: "Finance Executive",
    is_vip: true
  },
  {
    label: "📶 London Office VPN",
    title: "Corporate VPN gateway failing for London office team",
    description: "Engineers in London branch cannot connect to corporate VPN. Intermittent connection drops preventing code pushes.",
    impact_scope: "TEAM",
    business_criticality: "HIGH",
    name: "Liam O'Connor",
    email: "liam.o@company.com",
    dept: "Engineering UK",
    is_vip: false
  },
  {
    label: "💺 Ergonomic Chair",
    title: "Request for lumbar support ergonomic chair for workstation #402",
    description: "Requesting replacement of current standard chair with ergonomic mesh chair to prevent posture strain.",
    impact_scope: "INDIVIDUAL",
    business_criticality: "LOW",
    name: "Ananya Sharma",
    email: "ananya.s@company.com",
    dept: "Product Design",
    is_vip: false
  }
];

// Keyword Rules for Real-Time Simulator Preview
const CRITICAL_KEYWORDS = ["down", "outage", "offline", "crashed", "emergency", "blocked", "cannot work", "production", "data loss", "breach", "security leak", "hacked", "payroll locked", "fire", "system halt", "unresponsive", "payment failing"];
const HIGH_KEYWORDS = ["asap", "urgent", "deadline today", "severe delay", "corrupted", "error 500", "unable to login", "broken", "critical bug", "customer blocked", "failed build"];
const MEDIUM_KEYWORDS = ["slow", "glitch", "warning", "intermittent", "delayed", "reinstall", "access requested", "update needed", "inconvenience", "question"];

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();
  renderPresets();
  loadData();
  startHealthMonitor();
  setupLiveScoringSimulator();

  // Auto-refresh every 12 seconds
  state.autoRefreshInterval = setInterval(() => {
    if (state.isAutoRefreshEnabled) {
      loadData(false);
    }
  }, 12000);
});

// Theme Management
function initTheme() {
  const saved = localStorage.getItem('intelliticket_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const target = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', target);
  localStorage.setItem('intelliticket_theme', target);
  updateThemeIcon(target);
  if (state.charts.priority) {
    updateCharts(state.dashboardStats);
  }
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
  }
}

// Navigation Tabs
function switchTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `section-${tabName}`);
  });

  if (tabName === 'analytics' && state.dashboardStats) {
    updateCharts(state.dashboardStats);
  }
}

// View Mode (List vs Kanban)
function switchViewMode(mode) {
  state.viewMode = mode;
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  document.getElementById('tickets-list-container').style.display = mode === 'list' ? 'flex' : 'none';
  document.getElementById('kanban-board-container').style.display = mode === 'kanban' ? 'grid' : 'none';
  renderTickets();
}

// Setup Event Listeners
function setupEventListeners() {
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => switchViewMode(btn.dataset.mode));
  });

  const searchInput = document.getElementById('search-input');
  let searchTimeout = null;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = e.target.value.trim();
      loadTickets();
    }, 250);
  });

  document.getElementById('ticket-ingest-form').addEventListener('submit', handleFormSubmit);
}

// Fetch Stats & Tickets
async function loadData(showToast = false) {
  await Promise.all([loadStats(), loadTickets()]);
  if (showToast) {
    createToast('System data updated from MongoDB', 'info');
  }
}

async function loadStats() {
  try {
    const res = await fetch('/api/v1/analytics/dashboard');
    if (!res.ok) throw new Error("Failed to load dashboard metrics");
    const data = await res.json();
    state.dashboardStats = data;
    renderStats(data);
    updateCharts(data);
  } catch (err) {
    console.error("Stats fetch error:", err);
  }
}

async function loadTickets() {
  try {
    let url = '/api/v1/tickets?sort_by_priority=true&limit=100';
    if (state.filterPriority !== 'ALL') {
      url += `&priority=${state.filterPriority}`;
    }
    if (state.filterStatus !== 'ALL') {
      url += `&status=${state.filterStatus}`;
    }
    if (state.filterCategory !== 'ALL') {
      url += `&category=${state.filterCategory}`;
    }
    if (state.filterBreached) {
      url += '&sla_breached_only=true';
    }
    if (state.searchQuery) {
      url += `&search=${encodeURIComponent(state.searchQuery)}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch tickets");
    const data = await res.json();
    state.tickets = data.tickets || [];
    renderTickets();
  } catch (err) {
    console.error("Tickets fetch error:", err);
    document.getElementById('tickets-list-container').innerHTML = `
      <div style="text-align: center; color: var(--p1-red); padding: 40px; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--p1-border);">
        <h3>⚠️ Cannot Connect to MongoDB Backend</h3>
        <p style="font-size: 13px; margin-top: 6px; color: var(--text-muted);">Please make sure MongoDB and FastAPI are running on <code>http://127.0.0.1:8000</code>.</p>
      </div>
    `;
  }
}

// Render Stats Banner
function renderStats(stats) {
  document.getElementById('stat-p1').innerText = stats.p1_critical_count;
  document.getElementById('stat-p2').innerText = stats.p2_high_count;
  document.getElementById('stat-breached').innerText = stats.sla_breached_count;
  document.getElementById('stat-at-risk').innerText = stats.sla_at_risk_count;
  document.getElementById('stat-avg-score').innerText = stats.avg_priority_score.toFixed(1);
  document.getElementById('stat-total').innerText = stats.total_tickets;
  document.getElementById('stat-resolved').innerText = `${stats.resolved_count} Resolved`;
}

// Render Charts via Chart.js
function updateCharts(data) {
  if (!data || !window.Chart) return;

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const textColor = isLight ? '#475569' : '#94a3b8';

  // 1. Priority Doughnut Chart
  const ctxPriority = document.getElementById('chart-priority')?.getContext('2d');
  if (ctxPriority) {
    if (state.charts.priority) state.charts.priority.destroy();
    
    const prioLabels = ['P1 Critical', 'P2 High', 'P3 Medium', 'P4 Low'];
    const prioValues = [
      data.priority_distribution['P1_CRITICAL'] || 0,
      data.priority_distribution['P2_HIGH'] || 0,
      data.priority_distribution['P3_MEDIUM'] || 0,
      data.priority_distribution['P4_LOW'] || 0
    ];

    state.charts.priority = new Chart(ctxPriority, {
      type: 'doughnut',
      data: {
        labels: prioLabels,
        datasets: [{
          data: prioValues,
          backgroundColor: ['#ef4444', '#f59e0b', '#06b6d4', '#64748b'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12, font: { size: 11 } } }
        },
        cutout: '68%'
      }
    });
  }

  // 2. Category Volume Bar Chart
  const ctxCat = document.getElementById('chart-category')?.getContext('2d');
  if (ctxCat) {
    if (state.charts.category) state.charts.category.destroy();

    const catLabels = Object.keys(data.category_distribution).map(c => c.replace('_', ' '));
    const catValues = Object.values(data.category_distribution);

    state.charts.category = new Chart(ctxCat, {
      type: 'bar',
      data: {
        labels: catLabels,
        datasets: [{
          label: 'Requests',
          data: catValues,
          backgroundColor: '#6366f1',
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: textColor, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } }
        }
      }
    });
  }

  // 3. Status Distribution Chart
  const ctxStatus = document.getElementById('chart-status')?.getContext('2d');
  if (ctxStatus) {
    if (state.charts.status) state.charts.status.destroy();

    const statusLabels = ['Open', 'In Progress', 'Escalated', 'Resolved'];
    const statusValues = [
      data.status_distribution['OPEN'] || 0,
      data.status_distribution['IN_PROGRESS'] || 0,
      data.status_distribution['ESCALATED'] || 0,
      data.status_distribution['RESOLVED'] || 0
    ];

    state.charts.status = new Chart(ctxStatus, {
      type: 'pie',
      data: {
        labels: statusLabels,
        datasets: [{
          data: statusValues,
          backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444', '#10b981'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12, font: { size: 11 } } }
        }
      }
    });
  }
}

// Render Tickets (List & Kanban)
function renderTickets() {
  if (state.viewMode === 'list') {
    renderListView();
  } else {
    renderKanbanView();
  }
}

function renderListView() {
  const container = document.getElementById('tickets-list-container');
  if (!state.tickets || state.tickets.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 50px; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);">
        <div style="font-size: 32px; margin-bottom: 8px;">📭</div>
        <h3>No matching service requests found</h3>
        <p style="font-size: 13px; margin-top: 4px;">Try changing filter criteria or click <strong>Seed Realistic Demo Data</strong> above.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.tickets.map(t => {
    const prioBadge = getPriorityBadgeClass(t.priority);
    const isBreached = t.sla.is_breached;
    const isAtRisk = !isBreached && t.sla.remaining_hours <= 2.0 && t.status !== 'RESOLVED' && t.status !== 'CLOSED';

    return `
      <div class="ticket-card ${t.priority}" onclick="openTicketModal('${t.ticket_id}')">
        <div class="ticket-card-header">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="ticket-id-tag">${t.ticket_id}</span>
            <span class="badge ${prioBadge}">⭐ ${t.priority.replace('_', ' ')}</span>
            <span class="badge badge-status ${t.status}">${t.status.replace('_', ' ')}</span>
            ${isBreached ? '<span class="badge badge-sla breached">🔥 SLA BREACHED</span>' : 
              (isAtRisk ? `<span class="badge badge-sla at-risk">⚠️ ${t.sla.remaining_hours}h left</span>` : 
              `<span class="badge badge-sla">⏱️ ${t.sla.remaining_hours}h SLA</span>`)}
          </div>
          <div style="display: flex; gap: 6px;" onclick="event.stopPropagation()">
            <button class="btn btn-secondary btn-sm" onclick="openTicketModal('${t.ticket_id}')">🔍 Inspect</button>
            ${t.status !== 'RESOLVED' ? `<button class="btn btn-primary btn-sm" onclick="quickResolve('${t.ticket_id}')">✓ Resolve</button>` : ''}
          </div>
        </div>

        <div class="ticket-title">${escapeHtml(t.title)}</div>
        <div class="ticket-desc-snippet">${escapeHtml(t.description)}</div>

        <div class="ticket-meta-row">
          <div class="ticket-meta-left">
            <div class="meta-chip">
              <span>👤</span>
              <strong>${escapeHtml(t.requester.name)}</strong>
              <span>(${escapeHtml(t.requester.department)})</span>
              ${t.requester.is_vip ? '<span style="color:#fbbf24; font-weight:700;">👑 VIP</span>' : ''}
            </div>
            <div class="meta-chip">
              <span>📁</span>
              <span>${t.category.replace('_', ' ')}</span>
            </div>
            <div class="meta-chip">
              <span>🎯 Impact:</span>
              <strong>${t.impact_scope}</strong>
            </div>
            <div class="meta-chip">
              <span>⚡ AI Score:</span>
              <span class="score-badge">${t.priority_score}/100</span>
            </div>
          </div>
          <div>
            ${t.assigned_to ? 
              `<span style="color: #a5b4fc; font-weight: 600;">🛠️ ${escapeHtml(t.assigned_to.name)}</span>` : 
              '<span style="color: #f59e0b; font-weight: 600;">⏳ Unassigned</span>'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderKanbanView() {
  const columns = {
    OPEN: document.getElementById('kanban-col-open'),
    IN_PROGRESS: document.getElementById('kanban-col-progress'),
    PENDING_INFO: document.getElementById('kanban-col-pending'),
    ESCALATED: document.getElementById('kanban-col-escalated'),
    RESOLVED: document.getElementById('kanban-col-resolved')
  };

  const counts = { OPEN: 0, IN_PROGRESS: 0, PENDING_INFO: 0, ESCALATED: 0, RESOLVED: 0 };

  // Clear columns
  Object.values(columns).forEach(col => {
    if (col) col.innerHTML = '';
  });

  state.tickets.forEach(t => {
    const colKey = t.status === 'CLOSED' ? 'RESOLVED' : t.status;
    if (columns[colKey]) {
      counts[colKey]++;
      const prioBadge = getPriorityBadgeClass(t.priority);
      const isBreached = t.sla.is_breached;

      const card = document.createElement('div');
      card.className = `kanban-card ${t.priority}`;
      card.onclick = () => openTicketModal(t.ticket_id);
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span class="ticket-id-tag" style="font-size: 10px; padding: 2px 5px;">${t.ticket_id}</span>
          <span class="badge ${prioBadge}" style="font-size: 10px; padding: 2px 5px;">${t.priority_score} pts</span>
        </div>
        <div class="kanban-card-title">${escapeHtml(t.title)}</div>
        <div style="font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 8px;">
          <span>👤 ${escapeHtml(t.requester.name.split(' ')[0])}</span>
          ${isBreached ? '<span style="color:#ef4444; font-weight:700;">🔥 Breached</span>' : `<span>⏱️ ${t.sla.remaining_hours}h</span>`}
        </div>
      `;
      columns[colKey].appendChild(card);
    }
  });

  // Update counts
  document.getElementById('count-open').innerText = counts.OPEN;
  document.getElementById('count-progress').innerText = counts.IN_PROGRESS;
  document.getElementById('count-pending').innerText = counts.PENDING_INFO;
  document.getElementById('count-escalated').innerText = counts.ESCALATED;
  document.getElementById('count-resolved').innerText = counts.RESOLVED;
}

// Live Scoring Simulator for Ingestion Form
function setupLiveScoringSimulator() {
  const titleInput = document.getElementById('input-title');
  const descInput = document.getElementById('input-desc');
  const scopeSelect = document.getElementById('input-scope');
  const critSelect = document.getElementById('input-crit');
  const vipCheck = document.getElementById('input-vip');

  const updateSim = () => {
    const title = titleInput.value.trim();
    const desc = descInput.value.trim();
    const fullText = `${title.toLowerCase()} ${desc.toLowerCase()}`;
    const scope = scopeSelect.value;
    const crit = critSelect.value;
    const isVip = vipCheck.checked;

    // Urgency calculation
    let urgency = 5;
    let detected = [];
    CRITICAL_KEYWORDS.forEach(kw => {
      if (fullText.includes(kw)) {
        urgency = 30;
        detected.push(kw);
      }
    });
    if (urgency < 30) {
      HIGH_KEYWORDS.forEach(kw => {
        if (fullText.includes(kw)) {
          urgency = Math.max(urgency, 22);
          detected.push(kw);
        }
      });
    }
    if (urgency < 22) {
      MEDIUM_KEYWORDS.forEach(kw => {
        if (fullText.includes(kw)) {
          urgency = Math.max(urgency, 14);
          detected.push(kw);
        }
      });
    }

    // Impact
    const impactMap = { ORGANIZATION: 30, TEAM: 20, INDIVIDUAL: 10 };
    const impact = impactMap[scope] || 10;

    // Criticality
    const critMap = { SEVERE: 30, HIGH: 22, MEDIUM: 14, LOW: 5 };
    const criticality = critMap[crit] || 14;

    // VIP
    const vipBonus = isVip ? 10 : 0;

    // Total
    const total = Math.min(100, urgency + impact + criticality + vipBonus);

    // Classification
    let prio = "P4 LOW (72h SLA)";
    let prioColor = "#64748b";
    if (total >= 75) {
      prio = "🚨 P1 CRITICAL (2h SLA)";
      prioColor = "#ef4444";
    } else if (total >= 55) {
      prio = "⚠️ P2 HIGH (6h SLA)";
      prioColor = "#f59e0b";
    } else if (total >= 35) {
      prio = "🔷 P3 MEDIUM (24h SLA)";
      prioColor = "#06b6d4";
    }

    // Update UI elements
    document.getElementById('sim-total-score').innerText = `${total}/100`;
    document.getElementById('sim-prio-tag').innerText = prio;
    document.getElementById('sim-prio-tag').style.color = prioColor;
    document.getElementById('sim-progress-bar').style.width = `${Math.max(5, total)}%`;

    document.getElementById('sim-urgency-val').innerText = `${urgency}/30`;
    document.getElementById('sim-impact-val').innerText = `${impact}/30`;
    document.getElementById('sim-crit-val').innerText = `${criticality}/30`;
    document.getElementById('sim-vip-val').innerText = `+${vipBonus}`;

    const kwBox = document.getElementById('sim-keywords-box');
    if (detected.length > 0) {
      kwBox.style.display = 'block';
      kwBox.innerHTML = `<strong>Detected Urgency Triggers:</strong> <span style="color:#f87171;">${[...new Set(detected)].join(', ')}</span>`;
    } else {
      kwBox.style.display = 'none';
    }
  };

  [titleInput, descInput, scopeSelect, critSelect, vipCheck].forEach(el => {
    el.addEventListener('input', updateSim);
    el.addEventListener('change', updateSim);
  });

  updateSim();
}

// Render Presets
function renderPresets() {
  const box = document.getElementById('presets-container');
  if (!box) return;
  box.innerHTML = PRESETS.map((p, idx) => `
    <button type="button" class="preset-btn" onclick="applyPreset(${idx})">${p.label}</button>
  `).join('');
}

function applyPreset(idx) {
  const p = PRESETS[idx];
  document.getElementById('input-title').value = p.title;
  document.getElementById('input-desc').value = p.description;
  document.getElementById('input-scope').value = p.impact_scope;
  document.getElementById('input-crit').value = p.business_criticality;
  document.getElementById('input-req-name').value = p.name;
  document.getElementById('input-req-email').value = p.email;
  document.getElementById('input-req-dept').value = p.dept;
  document.getElementById('input-vip').checked = p.is_vip;

  // Trigger preview update
  document.getElementById('input-title').dispatchEvent(new Event('input'));
  createToast(`Preset applied: ${p.label}`, 'info');
}

// Handle Form Submission
async function handleFormSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('btn-submit-ticket');
  submitBtn.disabled = true;
  submitBtn.innerText = '⚡ Prioritizing & Ingesting...';

  const payload = {
    title: document.getElementById('input-title').value.trim(),
    description: document.getElementById('input-desc').value.trim(),
    impact_scope: document.getElementById('input-scope').value,
    business_criticality: document.getElementById('input-crit').value,
    requester: {
      name: document.getElementById('input-req-name').value.trim(),
      email: document.getElementById('input-req-email').value.trim(),
      department: document.getElementById('input-req-dept').value.trim(),
      is_vip: document.getElementById('input-vip').checked
    }
  };

  try {
    const res = await fetch('/api/v1/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Validation error");
    }

    const created = await res.json();
    createToast(`Ticket ${created.ticket_id} created with Priority ${created.priority.replace('_', ' ')}!`, 'success');

    // Reset Form
    document.getElementById('input-title').value = '';
    document.getElementById('input-desc').value = '';
    document.getElementById('input-title').dispatchEvent(new Event('input'));

    await loadData();
    switchTab('triage');
    openTicketModal(created.ticket_id);
  } catch (err) {
    createToast(`Failed to ingest ticket: ${err.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = '⚡ Ingest & Prioritize Request';
  }
}

// Quick Actions
async function quickResolve(ticketId) {
  try {
    const res = await fetch(`/api/v1/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'RESOLVED',
        actor: 'Admin Specialist',
        note: 'Resolved directly from Triage Dashboard.'
      })
    });

    if (!res.ok) throw new Error("Status update failed");
    createToast(`Ticket ${ticketId} marked as RESOLVED`, 'success');
    await loadData();
  } catch (err) {
    createToast(`Error resolving ticket: ${err.message}`, 'error');
  }
}

// Ticket Details Inspection Modal
async function openTicketModal(ticketId) {
  try {
    const res = await fetch(`/api/v1/tickets/${ticketId}`);
    if (!res.ok) throw new Error("Ticket not found");
    const t = await res.json();
    state.selectedTicket = t;

    document.getElementById('modal-ticket-id').innerText = t.ticket_id;
    document.getElementById('modal-title').innerText = t.title;
    document.getElementById('modal-desc').innerText = t.description;
    
    // Status Select
    document.getElementById('modal-select-status').value = t.status;
    
    // Reasoning & AI Breakdown
    document.getElementById('modal-reasoning').innerHTML = `
      <strong>Prioritization Decision:</strong> ${escapeHtml(t.priority_breakdown.reasoning)}<br/>
      ${t.priority_breakdown.detected_urgency_keywords.length > 0 ? 
        `<strong>Keywords Triggered:</strong> <span style="color:#f87171;">${t.priority_breakdown.detected_urgency_keywords.join(', ')}</span>` : ''}
    `;

    document.getElementById('modal-scores').innerHTML = `
      <span class="badge badge-status">Urgency: ${t.priority_breakdown.urgency_score}/30</span>
      <span class="badge badge-status">Impact: ${t.priority_breakdown.impact_score}/30</span>
      <span class="badge badge-status">Criticality: ${t.priority_breakdown.criticality_score}/30</span>
      <span class="badge badge-status">VIP Bonus: +${t.priority_breakdown.vip_bonus}</span>
      <span class="badge" style="background:var(--primary); color:#fff;">Composite: ${t.priority_score}/100</span>
    `;

    // Audit Timeline
    const timelineContainer = document.getElementById('modal-timeline');
    timelineContainer.innerHTML = t.timeline.map(item => `
      <div class="timeline-node">
        <div class="timeline-action">${escapeHtml(item.action)}</div>
        <div class="timeline-meta">${new Date(item.timestamp).toLocaleString()} • Actor: <strong>${escapeHtml(item.actor)}</strong></div>
        ${item.note ? `<div class="timeline-note">${escapeHtml(item.note)}</div>` : ''}
      </div>
    `).join('');

    document.getElementById('ticket-modal-overlay').classList.add('active');
  } catch (err) {
    createToast(`Failed to open ticket inspector: ${err.message}`, 'error');
  }
}

function closeTicketModal() {
  document.getElementById('ticket-modal-overlay').classList.remove('active');
  state.selectedTicket = null;
}

// Modal Status Change
async function handleModalStatusChange() {
  if (!state.selectedTicket) return;
  const newStatus = document.getElementById('modal-select-status').value;
  try {
    const res = await fetch(`/api/v1/tickets/${state.selectedTicket.ticket_id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        actor: 'Lead Administrator',
        note: `Status changed to ${newStatus} via Inspector Console.`
      })
    });
    if (!res.ok) throw new Error("Update failed");
    createToast(`Status updated to ${newStatus}`, 'success');
    await openTicketModal(state.selectedTicket.ticket_id);
    await loadData();
  } catch (err) {
    createToast(`Failed to update status: ${err.message}`, 'error');
  }
}

// Append Internal Note
async function handleAddNote(e) {
  e.preventDefault();
  if (!state.selectedTicket) return;
  const noteInput = document.getElementById('modal-new-note');
  const note = noteInput.value.trim();
  if (!note) return;

  try {
    const res = await fetch(`/api/v1/tickets/${state.selectedTicket.ticket_id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'Support Engineer',
        note: note
      })
    });

    if (!res.ok) throw new Error("Failed to append note");
    noteInput.value = '';
    createToast('Internal investigation note added to audit trail', 'success');
    await openTicketModal(state.selectedTicket.ticket_id);
    await loadData();
  } catch (err) {
    createToast(`Error adding note: ${err.message}`, 'error');
  }
}

// Filter Actions
function setPriorityFilter(prio, btn) {
  state.filterPriority = prio;
  state.filterBreached = false;
  document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadTickets();
}

function setBreachedFilter(btn) {
  state.filterPriority = 'ALL';
  state.filterBreached = true;
  document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadTickets();
}

function handleCategoryFilter(val) {
  state.filterCategory = val;
  loadTickets();
}

function handleStatusFilter(val) {
  state.filterStatus = val;
  loadTickets();
}

// Seed Demo Database Action
async function seedDemoData() {
  const btn = document.getElementById('btn-seed-data');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Seeding MongoDB...';

  try {
    const res = await fetch('/api/v1/tickets/seed', { method: 'POST' });
    if (!res.ok) throw new Error("Seed endpoint returned error");
    const data = await res.json();
    createToast(`Successfully loaded ${data.inserted_count || 9} realistic tickets into MongoDB!`, 'success');
    await loadData();
  } catch (err) {
    createToast(`Seed failed: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// Health Monitor Heartbeat
async function startHealthMonitor() {
  const checkHealth = async () => {
    try {
      const t0 = performance.now();
      const res = await fetch('/health');
      const t1 = performance.now();
      const data = await res.json();

      const el = document.getElementById('health-indicator');
      if (data.database === 'connected') {
        const ping = Math.round(t1 - t0);
        el.innerHTML = `<span class="health-dot"></span> <span>MongoDB Connected (${ping}ms)</span>`;
      } else {
        el.innerHTML = `<span class="health-dot" style="background:#ef4444; box-shadow:0 0 8px #ef4444;"></span> <span style="color:#ef4444;">DB Disconnected</span>`;
      }
    } catch (err) {
      const el = document.getElementById('health-indicator');
      el.innerHTML = `<span class="health-dot" style="background:#ef4444;"></span> <span style="color:#ef4444;">Server Offline</span>`;
    }
  };

  checkHealth();
  setInterval(checkHealth, 15000);
}

// Export Tickets (CSV & JSON)
function exportTicketsCSV() {
  if (!state.tickets.length) {
    createToast("No tickets available to export", "info");
    return;
  }

  const headers = ["Ticket ID", "Title", "Priority", "Priority Score", "Status", "Category", "Requester Name", "Department", "VIP", "SLA Target (h)", "Remaining (h)", "Created At"];
  const rows = state.tickets.map(t => [
    t.ticket_id,
    `"${t.title.replace(/"/g, '""')}"`,
    t.priority,
    t.priority_score,
    t.status,
    t.category,
    `"${t.requester.name}"`,
    `"${t.requester.department}"`,
    t.requester.is_vip ? "YES" : "NO",
    t.sla.target_hours,
    t.sla.remaining_hours,
    t.created_at
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `intelliticket_export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  createToast("Tickets exported to CSV", "success");
}

function exportTicketsJSON() {
  if (!state.tickets.length) {
    createToast("No tickets available to export", "info");
    return;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.tickets, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", dataStr);
  link.setAttribute("download", `intelliticket_export_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  createToast("Tickets exported to JSON", "success");
}

// Utility: Toast System
function createToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Utility Helpers
function getPriorityBadgeClass(prio) {
  if (prio === 'P1_CRITICAL') return 'badge-p1';
  if (prio === 'P2_HIGH') return 'badge-p2';
  if (prio === 'P3_MEDIUM') return 'badge-p3';
  return 'badge-p4';
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
