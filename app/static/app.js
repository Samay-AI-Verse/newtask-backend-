/**
 * IntelliTicket - Smarter Tickets. Faster Solutions.
 * Application Controller & Real-Time MongoDB Connector with Professional Vector Icons
 */

// Application State
const state = {
  tickets: [],
  dashboardStats: null,
  activeFilter: 'ALL',
  searchQuery: '',
  selectedTicket: null,
  charts: {
    priority: null,
    slaGauge: null
  }
};

// Enterprise Quick Presets
const PRESETS = [
  {
    label: "🔥 Payment Gateway Down",
    title: "Payment Gateway Down",
    desc: "Production payment gateway is failing with 500 error. Urgent fix required! Customers unable to checkout.",
    scope: "ORGANIZATION",
    crit: "SEVERE",
    name: "Sarah Jenkins",
    dept: "Infrastructure",
    email: "sarah.j@company.com",
    vip: true
  },
  {
    label: "💳 Payroll System Locked",
    title: "Payroll System Locked",
    desc: "Salary processing system is locked on salary day. Need immediate support before cutoff time.",
    scope: "ORGANIZATION",
    crit: "SEVERE",
    name: "Michael Scott",
    dept: "Finance",
    email: "m.scott@company.com",
    vip: true
  },
  {
    label: "📶 VPN Not Working",
    title: "VPN Not Working",
    desc: "VPN is down for entire Marketing department. 50+ employees affected and cannot access internal tools.",
    scope: "TEAM",
    crit: "HIGH",
    name: "David Miller",
    dept: "Network",
    email: "david.m@company.com",
    vip: false
  },
  {
    label: "💻 Billing Report Failing",
    title: "Billing Report Failing",
    desc: "Monthly billing report not generating since morning due to timeout in SAP connector.",
    scope: "TEAM",
    crit: "HIGH",
    name: "Elena Rostova",
    dept: "Application",
    email: "elena.r@company.com",
    vip: false
  },
  {
    label: "🖥️ New Mouse Request",
    title: "New Mouse Request",
    desc: "Employee needs a new wireless mouse for workstation desk setup.",
    scope: "INDIVIDUAL",
    crit: "LOW",
    name: "Vikram Sethi",
    dept: "Hardware",
    email: "vikram.s@company.com",
    vip: false
  }
];

// Keywords for live client-side scoring preview
const CRITICAL_KEYWORDS = ["down", "outage", "offline", "crashed", "emergency", "blocked", "cannot work", "production", "data loss", "breach", "security leak", "hacked", "payroll locked", "system halt", "unresponsive", "payment failing"];
const HIGH_KEYWORDS = ["asap", "urgent", "deadline today", "severe delay", "corrupted", "error 500", "unable to login", "broken", "critical bug", "customer blocked", "failed build"];
const MEDIUM_KEYWORDS = ["slow", "glitch", "warning", "intermittent", "delayed", "reinstall", "access requested", "update needed", "inconvenience", "question"];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  setupEventListeners();
  renderPresets();
  setupLiveScoringSimulator();
  loadData();
  refreshIcons();

  // Polling every 10s for real-time background sync
  setInterval(() => {
    loadData(false);
  }, 10000);
});

// Re-render Lucide Vector Icons
function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// Dynamic Clock & Date in Header
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

// Setup Event Listeners
function setupEventListeners() {
  // Global Search
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.searchQuery = e.target.value.trim();
        loadTickets();
      }, 250);
    });
  }

  // Ctrl + K Global Shortcut
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput?.focus();
    }
  });
}

// Data Fetching
async function loadData(showToast = false) {
  await Promise.all([loadDashboardMetrics(), loadTickets()]);
  if (showToast) {
    showToastNotification("Data synchronized with MongoDB", "info");
  }
}

async function loadDashboardMetrics() {
  try {
    const res = await fetch('/api/v1/analytics/dashboard');
    if (!res.ok) throw new Error("Metrics API error");
    const data = await res.json();
    state.dashboardStats = data;
    renderTopMetrics(data);
    renderPriorityDonut(data);
    renderSLAGauge(data);
  } catch (err) {
    console.error("Failed to load metrics:", err);
  }
}

async function loadTickets() {
  try {
    let url = '/api/v1/tickets?sort_by_priority=true&limit=100';
    if (state.activeFilter !== 'ALL') {
      url += `&priority=${state.activeFilter}`;
    }
    if (state.searchQuery) {
      url += `&search=${encodeURIComponent(state.searchQuery)}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error("Tickets API error");
    const data = await res.json();
    state.tickets = data.tickets || [];
    renderTicketsTable();
    updateLiveActivityStream();
    refreshIcons();
  } catch (err) {
    console.error("Failed to fetch tickets:", err);
    const tbody = document.getElementById('tickets-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: #ef4444; padding: 40px;">
            ⚠️ Could not connect to MongoDB. Ensure backend server is running on <strong>http://127.0.0.1:8000</strong>
          </td>
        </tr>
      `;
    }
  }
}

// Render Top 5 KPI Cards
function renderTopMetrics(stats) {
  const total = stats.total_tickets || 0;
  const p1 = stats.p1_critical_count || 0;
  const p2 = stats.p2_high_count || 0;
  const p3 = stats.priority_distribution['P3_MEDIUM'] || 0;
  const p4 = stats.priority_distribution['P4_LOW'] || 0;

  document.getElementById('kpi-total').innerText = total;
  document.getElementById('kpi-p1').innerText = p1;
  document.getElementById('kpi-p2').innerText = p2;
  document.getElementById('kpi-p3').innerText = p3;
  document.getElementById('kpi-p4').innerText = p4;

  document.getElementById('pill-all-count').innerText = total;
  document.getElementById('dist-total-count').innerText = total;
  document.getElementById('donut-center-num').innerText = total;
}

// Render Tickets Table
function renderTicketsTable() {
  const tbody = document.getElementById('tickets-table-body');
  if (!tbody) return;

  if (!state.tickets || state.tickets.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 40px;">
          No matching service requests found. Click <strong>"Seed Demo Data"</strong> or <strong>"+ Create New Ticket"</strong>.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.tickets.map((t, index) => {
    const pIconClass = t.priority === 'P1_CRITICAL' ? 'p1' : (t.priority === 'P2_HIGH' ? 'p2' : (t.priority === 'P3_MEDIUM' ? 'p3' : 'p4'));
    const pLucideName = t.priority === 'P1_CRITICAL' ? 'alert-circle' : (t.priority === 'P2_HIGH' ? 'alert-triangle' : (t.priority === 'P3_MEDIUM' ? 'info' : 'minus-circle'));
    
    const prioLabel = t.priority === 'P1_CRITICAL' ? 'P1 Critical' : 
                     (t.priority === 'P2_HIGH' ? 'P2 High' : 
                     (t.priority === 'P3_MEDIUM' ? 'P3 Medium' : 'P4 Low'));

    const categoryIcon = getCategoryLucideTag(t.category);
    const categoryName = formatCategoryName(t.category);

    const statusLabel = t.status === 'IN_PROGRESS' ? 'In Progress' : 
                       (t.status === 'PENDING_INFO' ? 'Pending Info' : 
                       (t.status === 'RESOLVED' ? 'Resolved' : 
                       (t.status === 'ESCALATED' ? 'Escalated' : 'Open')));

    const slaHours = t.sla ? `${Math.round(t.sla.remaining_hours)}h` : '2h';
    const formattedCode = formatTicketCode(t.ticket_id, index);

    return `
      <tr onclick="openTicketInspector('${t.ticket_id}')">
        <!-- 1. # Column -->
        <td>
          <div class="ticket-id-col">
            <div class="ticket-priority-icon ${pIconClass}">
              <i data-lucide="${pLucideName}"></i>
            </div>
            <span class="ticket-code-str">${formattedCode}</span>
          </div>
        </td>

        <!-- 2. Title & Description -->
        <td>
          <div class="ticket-title-cell">
            <div class="ticket-title-bold">${escapeHtml(t.title)}</div>
            <div class="ticket-snippet-text">${escapeHtml(t.description)}</div>
          </div>
        </td>

        <!-- 3. Category -->
        <td>
          <div class="category-cell">
            ${categoryIcon}
            <span>${categoryName}</span>
          </div>
        </td>

        <!-- 4. Priority -->
        <td>
          <span class="badge-pill-priority ${t.priority}">${prioLabel}</span>
        </td>

        <!-- 5. Score -->
        <td>
          <span class="score-num-bold">${t.priority_score}</span>
        </td>

        <!-- 6. SLA -->
        <td>
          <div class="sla-clock-cell">
            <i data-lucide="clock" style="width: 13px; height: 13px;"></i>
            <span>${slaHours}</span>
          </div>
        </td>

        <!-- 7. Status -->
        <td>
          <span class="badge-pill-status ${t.status}">${statusLabel}</span>
        </td>

        <!-- 8. Actions -->
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <button class="action-dots-btn" onclick="openTicketInspector('${t.ticket_id}')" title="Inspect Ticket Details">
            <i data-lucide="more-horizontal"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Format ticket ID into friendly code like TKT-001 or TC-1001
function formatTicketCode(ticketId, index) {
  if (!ticketId) return `TKT-${String(index + 1).padStart(3, '0')}`;
  if (ticketId.startsWith('TC-')) {
    const num = parseInt(ticketId.replace('TC-', ''), 10);
    if (num >= 1000) {
      return `TKT-${String(num - 1000).padStart(3, '0')}`;
    }
  }
  return ticketId;
}

function getCategoryLucideTag(cat) {
  switch (cat) {
    case 'IT_INFRASTRUCTURE': return '<i data-lucide="server"></i>';
    case 'FINANCE_BILLING': return '<i data-lucide="credit-card"></i>';
    case 'SECURITY_ACCESS': return '<i data-lucide="wifi"></i>';
    case 'SOFTWARE_APPLICATIONS': return '<i data-lucide="monitor"></i>';
    case 'FACILITIES_OFFICE': return '<i data-lucide="building"></i>';
    case 'HR_PAYROLL': return '<i data-lucide="users"></i>';
    default: return '<i data-lucide="hard-drive"></i>';
  }
}

function formatCategoryName(cat) {
  switch (cat) {
    case 'IT_INFRASTRUCTURE': return 'Infrastructure';
    case 'FINANCE_BILLING': return 'Finance';
    case 'SECURITY_ACCESS': return 'Network';
    case 'SOFTWARE_APPLICATIONS': return 'Application';
    case 'FACILITIES_OFFICE': return 'Facilities';
    case 'HR_PAYROLL': return 'HR & Payroll';
    default: return 'Hardware';
  }
}

// Render Priority Donut Chart
function renderPriorityDonut(stats) {
  const canvas = document.getElementById('chart-priority-donut');
  if (!canvas || !window.Chart) return;

  const p1 = stats.priority_distribution['P1_CRITICAL'] || 0;
  const p2 = stats.priority_distribution['P2_HIGH'] || 0;
  const p3 = stats.priority_distribution['P3_MEDIUM'] || 0;
  const p4 = stats.priority_distribution['P4_LOW'] || 0;
  const total = p1 + p2 + p3 + p4 || 1;

  // Update Legend Values
  document.getElementById('legend-p1-stat').innerText = `${p1} (${Math.round((p1/total)*100)}%)`;
  document.getElementById('legend-p2-stat').innerText = `${p2} (${Math.round((p2/total)*100)}%)`;
  document.getElementById('legend-p3-stat').innerText = `${p3} (${Math.round((p3/total)*100)}%)`;
  document.getElementById('legend-p4-stat').innerText = `${p4} (${Math.round((p4/total)*100)}%)`;

  if (state.charts.priority) state.charts.priority.destroy();

  const ctx = canvas.getContext('2d');
  state.charts.priority = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['P1 Critical', 'P2 High', 'P3 Medium', 'P4 Low'],
      datasets: [{
        data: [p1, p2, p3, p4],
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#64748b'],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      cutout: '72%'
    }
  });
}

// Render SLA Performance Gauge
function renderSLAGauge(stats) {
  const canvas = document.getElementById('chart-sla-gauge');
  if (!canvas || !window.Chart) return;

  const onTime = stats.resolved_count || 7;
  const atRisk = stats.sla_at_risk_count || 2;
  const breached = stats.sla_breached_count || 0;
  const total = onTime + atRisk + breached || 1;
  const onTimePct = Math.round((onTime / total) * 100);

  document.getElementById('sla-pct-val').innerText = `${onTimePct}%`;
  document.getElementById('sla-ontime-num').innerText = onTime;
  document.getElementById('sla-atrisk-num').innerText = atRisk;
  document.getElementById('sla-breached-num').innerText = breached;

  if (state.charts.slaGauge) state.charts.slaGauge.destroy();

  const ctx = canvas.getContext('2d');
  state.charts.slaGauge = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [onTime, atRisk, breached],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      cutout: '76%'
    }
  });
}

// Live Activity Stream
function updateLiveActivityStream() {
  const container = document.getElementById('activity-stream-box');
  if (!container || !state.tickets.length) return;

  const activities = [];
  state.tickets.slice(0, 4).forEach((t, i) => {
    const code = formatTicketCode(t.ticket_id, i);
    if (t.status === 'IN_PROGRESS') {
      activities.push(`<strong>${code}</strong> moved to In Progress <span style="color:var(--text-muted);">${formatTimeOnly(t.updated_at)}</span>`);
    } else if (t.status === 'RESOLVED') {
      activities.push(`<strong>${code}</strong> resolved <span style="color:var(--text-muted);">${formatTimeOnly(t.updated_at)}</span>`);
    } else {
      activities.push(`<strong>${code}</strong> priority marked ${t.priority.replace('_', ' ')} <span style="color:var(--text-muted);">${formatTimeOnly(t.created_at)}</span>`);
    }
  });

  container.innerHTML = activities.map(a => `<span class="activity-item-pill">${a}</span>`).join('');
}

function formatTimeOnly(dateStr) {
  if (!dateStr) return "Just now";
  const d = new Date(dateStr);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// Live Scoring Simulator inside Create Modal
function setupLiveScoringSimulator() {
  const titleInput = document.getElementById('new-ticket-title');
  const descInput = document.getElementById('new-ticket-desc');
  const scopeSelect = document.getElementById('new-ticket-scope');
  const critSelect = document.getElementById('new-ticket-crit');
  const vipCheck = document.getElementById('new-ticket-vip');

  const updateSim = () => {
    const title = titleInput?.value.trim() || '';
    const desc = descInput?.value.trim() || '';
    const fullText = `${title.toLowerCase()} ${desc.toLowerCase()}`;
    const scope = scopeSelect?.value || 'INDIVIDUAL';
    const crit = critSelect?.value || 'MEDIUM';
    const isVip = vipCheck?.checked || false;

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

    const impactMap = { ORGANIZATION: 30, TEAM: 20, INDIVIDUAL: 10 };
    const impact = impactMap[scope] || 10;

    const critMap = { SEVERE: 30, HIGH: 22, MEDIUM: 14, LOW: 5 };
    const criticality = critMap[crit] || 14;

    const vipBonus = isVip ? 10 : 0;
    const total = Math.min(100, urgency + impact + criticality + vipBonus);

    let prioTag = "P4 Low (72h SLA)";
    let prioColor = "#64748b";
    if (total >= 75) {
      prioTag = "P1 Critical (2h SLA)";
      prioColor = "#ef4444";
    } else if (total >= 55) {
      prioTag = "P2 High (6h SLA)";
      prioColor = "#f59e0b";
    } else if (total >= 35) {
      prioTag = "P3 Medium (24h SLA)";
      prioColor = "#2563eb";
    }

    const scoreEl = document.getElementById('preview-score-text');
    const barEl = document.getElementById('preview-progress-bar');
    const badgeEl = document.getElementById('preview-priority-badge');
    const kwEl = document.getElementById('preview-keywords-pill');

    if (scoreEl) scoreEl.innerText = `${total}/100`;
    if (barEl) barEl.style.width = `${Math.max(5, total)}%`;
    if (badgeEl) {
      badgeEl.innerText = prioTag;
      badgeEl.style.color = prioColor;
    }
    if (kwEl) {
      kwEl.innerText = detected.length ? `🚨 Trigger: ${detected.slice(0, 2).join(', ')}` : '';
    }
  };

  [titleInput, descInput, scopeSelect, critSelect, vipCheck].forEach(el => {
    el?.addEventListener('input', updateSim);
    el?.addEventListener('change', updateSim);
  });
}

// Render Scenario Presets
function renderPresets() {
  const container = document.getElementById('create-presets-container');
  if (!container) return;
  container.innerHTML = PRESETS.map((p, idx) => `
    <button type="button" class="preset-chip" onclick="applyPreset(${idx})">${p.label}</button>
  `).join('');
}

function applyPreset(idx) {
  const p = PRESETS[idx];
  document.getElementById('new-ticket-title').value = p.title;
  document.getElementById('new-ticket-desc').value = p.desc;
  document.getElementById('new-ticket-scope').value = p.scope;
  document.getElementById('new-ticket-crit').value = p.crit;
  document.getElementById('new-ticket-req-name').value = p.name;
  document.getElementById('new-ticket-req-dept').value = p.dept;
  document.getElementById('new-ticket-req-email').value = p.email;
  document.getElementById('new-ticket-vip').checked = p.vip;

  document.getElementById('new-ticket-title').dispatchEvent(new Event('input'));
  showToastNotification(`Loaded preset: ${p.title}`, 'info');
}

// Handle Form Submission -> Write Directly to MongoDB
async function handleCreateTicketSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('btn-submit-create');
  submitBtn.disabled = true;
  submitBtn.innerText = "⏳ Ingesting to MongoDB...";

  const payload = {
    title: document.getElementById('new-ticket-title').value.trim(),
    description: document.getElementById('new-ticket-desc').value.trim(),
    impact_scope: document.getElementById('new-ticket-scope').value,
    business_criticality: document.getElementById('new-ticket-crit').value,
    requester: {
      name: document.getElementById('new-ticket-req-name').value.trim(),
      email: document.getElementById('new-ticket-req-email').value.trim(),
      department: document.getElementById('new-ticket-req-dept').value.trim(),
      is_vip: document.getElementById('new-ticket-vip').checked
    }
  };

  try {
    const res = await fetch('/api/v1/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Validation Error");
    }

    const created = await res.json();
    closeCreateModal();
    showToastNotification(`Ticket ${created.ticket_id} ingested! Classified as ${created.priority.replace('_', ' ')}`, 'success');

    // Real-time refresh
    await loadData();
    openTicketInspector(created.ticket_id);
  } catch (err) {
    showToastNotification(`Error: ${err.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "⚡ Submit & Prioritize in MongoDB";
  }
}

// Inspection Modal
async function openTicketInspector(ticketId) {
  try {
    const res = await fetch(`/api/v1/tickets/${ticketId}`);
    if (!res.ok) throw new Error("Ticket not found");
    const t = await res.json();
    state.selectedTicket = t;

    document.getElementById('modal-ticket-code').innerText = t.ticket_id;
    document.getElementById('modal-ticket-title').innerText = t.title;
    document.getElementById('modal-ticket-desc').innerText = t.description;
    document.getElementById('modal-change-status-select').value = t.status;

    const badge = document.getElementById('modal-ticket-badge');
    badge.className = `badge-pill-priority ${t.priority}`;
    badge.innerText = `${t.priority.replace('_', ' ')} (${t.priority_score}/100)`;

    // AI Reasoning breakdown
    const pb = t.priority_breakdown;
    document.getElementById('modal-ai-reasoning').innerHTML = `
      ${pb.ai_model_used ? `<div style="margin-bottom:6px;"><span class="badge-pill-priority P3_MEDIUM">🤖 AI Engine: ${pb.ai_model_used}</span></div>` : ''}
      <strong>Decision Reasoning:</strong> ${escapeHtml(pb.reasoning)}<br/>
      ${pb.root_cause_hypothesis ? `<div style="margin-top:6px; color:#334155;">🔍 <strong>Root-Cause Hypothesis:</strong> ${escapeHtml(pb.root_cause_hypothesis)}</div>` : ''}
      ${pb.recommended_action ? `<div style="margin-top:6px; color:#16a34a;">💡 <strong>Recommended Action:</strong> ${escapeHtml(pb.recommended_action)}</div>` : ''}
      ${pb.detected_urgency_keywords?.length ? `<div style="margin-top:6px;"><strong>Triggered Keywords:</strong> <span style="color:#ef4444;">${pb.detected_urgency_keywords.join(', ')}</span></div>` : ''}
    `;

    document.getElementById('modal-score-chips-row').innerHTML = `
      <span class="filter-pill">Urgency: ${pb.urgency_score}/30</span>
      <span class="filter-pill">Scope: ${pb.impact_score}/30</span>
      <span class="filter-pill">Criticality: ${pb.criticality_score}/30</span>
      <span class="filter-pill">VIP: +${pb.vip_bonus}</span>
      <span class="filter-pill active">Total: ${t.priority_score}/100</span>
    `;

    // Timeline
    document.getElementById('modal-timeline-container').innerHTML = t.timeline.map(e => `
      <div style="font-size: 12.5px;">
        <div style="font-weight: 700; color: #0f172a;">${escapeHtml(e.action)}</div>
        <div style="color: var(--text-muted); font-size: 11px;">${new Date(e.timestamp).toLocaleTimeString()} • ${escapeHtml(e.actor)}</div>
        ${e.note ? `<div style="background: #f8fafc; padding: 4px 8px; border-radius: 6px; margin-top: 2px;">${escapeHtml(e.note)}</div>` : ''}
      </div>
    `).join('');

    document.getElementById('modal-ticket-details').classList.add('active');
  } catch (err) {
    showToastNotification(`Failed to open inspector: ${err.message}`, 'error');
  }
}

function closeDetailsModal() {
  document.getElementById('modal-ticket-details').classList.remove('active');
  state.selectedTicket = null;
}

// Modal Action: Update Lifecycle Status
async function applyStatusChangeFromModal() {
  if (!state.selectedTicket) return;
  const newStatus = document.getElementById('modal-change-status-select').value;
  try {
    const res = await fetch(`/api/v1/tickets/${state.selectedTicket.ticket_id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        actor: 'Admin Lead',
        note: `Status transitioned to ${newStatus}`
      })
    });
    if (!res.ok) throw new Error("Update status failed");
    showToastNotification(`Status changed to ${newStatus}`, 'success');
    await openTicketInspector(state.selectedTicket.ticket_id);
    await loadData();
  } catch (err) {
    showToastNotification(`Error: ${err.message}`, 'error');
  }
}

// Modal Action: Append Note
async function handleAppendNote(e) {
  e.preventDefault();
  if (!state.selectedTicket) return;
  const input = document.getElementById('modal-note-input');
  const note = input.value.trim();
  if (!note) return;

  try {
    const res = await fetch(`/api/v1/tickets/${state.selectedTicket.ticket_id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'Admin IT Support',
        note: note
      })
    });
    if (!res.ok) throw new Error("Failed to add note");
    input.value = '';
    showToastNotification('Note added to audit trail', 'success');
    await openTicketInspector(state.selectedTicket.ticket_id);
    await loadData();
  } catch (err) {
    showToastNotification(`Error: ${err.message}`, 'error');
  }
}

// Seed Demo Database Action
async function seedDatabaseDirect() {
  const btn = document.getElementById('btn-seed-fast');
  btn.disabled = true;
  btn.innerHTML = `<span>⏳</span><span>Seeding DB...</span>`;

  try {
    const res = await fetch('/api/v1/tickets/seed', { method: 'POST' });
    if (!res.ok) throw new Error("Seed failed");
    const data = await res.json();
    showToastNotification(`Success! ${data.inserted_count || 9} realistic tickets loaded into MongoDB`, 'success');
    await loadData();
  } catch (err) {
    showToastNotification(`Seed error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="database" style="width: 14px; height: 14px;"></i><span>Seed Demo Data</span>`;
    refreshIcons();
  }
}

// Filter Actions
function setPriorityFilter(filter, el) {
  state.activeFilter = filter;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  loadTickets();
}

function filterMyTickets() {
  state.searchQuery = "Sarah";
  loadTickets();
  showToastNotification("Filtered by Admin / Assigned tickets", "info");
}

function switchSidebarTab(tabName, el) {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

// Export CSV
function exportTicketsCSV() {
  if (!state.tickets.length) {
    showToastNotification("No tickets to export", "info");
    return;
  }
  const headers = ["Ticket ID", "Title", "Category", "Priority", "Score", "SLA Hours", "Status", "Requester", "Department"];
  const rows = state.tickets.map((t, i) => [
    formatTicketCode(t.ticket_id, i),
    `"${t.title.replace(/"/g, '""')}"`,
    t.category,
    t.priority,
    t.priority_score,
    t.sla?.remaining_hours || 0,
    t.status,
    `"${t.requester?.name || ''}"`,
    `"${t.requester?.department || ''}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `IntelliTicket_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  showToastNotification("CSV Report downloaded", "success");
}

// Modal Helpers
function openCreateModal() {
  document.getElementById('modal-create-ticket').classList.add('active');
  document.getElementById('new-ticket-title').focus();
  refreshIcons();
}

function closeCreateModal() {
  document.getElementById('modal-create-ticket').classList.remove('active');
}

function openSettingsModal() {
  showToastNotification("System running in Production Environment with MongoDB", "info");
}

function openAnalyticsModal() {
  showToastNotification("Analytics graphs updated in real-time on right column", "info");
}

function openAuditStreamModal() {
  showToastNotification("Audit log tracks every creation, status transition, and note.", "info");
}

function openCategoryFilterModal() {
  const current = state.activeFilter;
  const next = current === 'ALL' ? 'P1_CRITICAL' : (current === 'P1_CRITICAL' ? 'P2_HIGH' : 'ALL');
  setPriorityFilter(next);
}

function showNotificationToast() {
  showToastNotification("3 P1/P2 tickets currently require immediate SLA triage", "info");
}

// Toast Notifications
function showToastNotification(msg, type = 'info') {
  const shelf = document.getElementById('toast-shelf');
  if (!shelf) return;

  const item = document.createElement('div');
  item.className = `toast-item ${type}`;
  const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
  item.innerHTML = `<span>${icon}</span><span>${escapeHtml(msg)}</span>`;
  shelf.appendChild(item);

  setTimeout(() => {
    item.style.opacity = '0';
    item.style.transform = 'translateX(100%)';
    item.style.transition = 'all 0.3s ease';
    setTimeout(() => item.remove(), 300);
  }, 3500);
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
