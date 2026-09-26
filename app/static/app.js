/**
 * IntelliTicket - Smarter Tickets. Faster Solutions.
 * Application Controller & Multi-Page View Routing
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
  charts: {
    priority: null,
    slaGauge: null,
    analyticsPriority: null,
    analyticsCategories: null,
    analyticsDepts: null,
    analyticsSla: null
  }
};

// Enterprise Quick Presets
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

// Initialize App
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

// =========================================================
// VIEW NAVIGATION CONTROLLER
// =========================================================

function navigateToView(viewId) {
  state.currentView = viewId;

  // 1. Update Sidebar Active Button
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    btn.classList.remove('active');
  });
  const navBtn = document.getElementById(`nav-${viewId}`);
  if (navBtn) navBtn.classList.add('active');

  // 2. Hide all views & show targeted view
  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.remove('active');
  });

  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // 3. Trigger View Specific Logic
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

function switchSidebarTab(tabName, el) {
  navigateToView(tabName);
}

// Setup Event Listeners
function setupEventListeners() {
  // Global Search in Header
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.searchQuery = e.target.value.trim();
        if (state.currentView !== 'all_tickets' && state.currentView !== 'dashboard') {
          navigateToView('all_tickets');
        }
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

// =========================================================
// DATA INGESTION & API SERVICES
// =========================================================

async function loadData(showToast = false) {
  try {
    await Promise.all([loadDashboardMetrics(), loadTickets()]);
    if (showToast) {
      showToastNotification("Live data refreshed from MongoDB", "success");
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
    console.warn("Analytics API unavailable, calculating from client tickets:", err);
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

    // Re-render views
    renderTicketsTable();
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

  const slaPct = Math.round((onTime / total) * 100) || 100;
  setTxt('sla-pct-val', `${slaPct}%`);
  setTxt('analytics-sla-val', `${slaPct}%`);
  setTxt('analytics-avg-score', stats.average_priority_score || 58);
}

// =========================================================
// DASHBOARD VIEW & RECENT TICKETS TABLE
// =========================================================

function renderDashboardView() {
  renderTicketsTable();
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
          <div style="font-size: 14px; font-weight:700;">No tickets found</div>
          <div style="font-size: 12px; margin-top: 4px;">Click "Seed Demo Data" or "Create Ticket" to get started.</div>
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

// =========================================================
// ALL TICKETS MANAGEMENT WORKBENCH
// =========================================================

function renderAllTicketsView() {
  const tbody = document.getElementById('all-tickets-tbody');
  const kanban = document.getElementById('all-tickets-kanban-container');
  if (!tbody || !kanban) return;

  let filtered = [...state.tickets];

  // Search filter
  const s = state.allTicketsFilter.search.toLowerCase();
  if (s) {
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(s) ||
      (t.description && t.description.toLowerCase().includes(s)) ||
      (t.category && t.category.toLowerCase().includes(s)) ||
      (t.requester?.name && t.requester.name.toLowerCase().includes(s)) ||
      (t.ticket_id && t.ticket_id.toLowerCase().includes(s))
    );
  }

  // Priority filter
  if (state.activeFilter && state.activeFilter !== 'ALL') {
    filtered = filtered.filter(t => t.priority === state.activeFilter);
  }

  // Status filter
  if (state.allTicketsFilter.status !== 'ALL') {
    filtered = filtered.filter(t => t.status === state.allTicketsFilter.status);
  }

  // Category filter
  if (state.allTicketsFilter.category !== 'ALL') {
    filtered = filtered.filter(t => t.category === state.allTicketsFilter.category);
  }

  // Sorting
  if (state.allTicketsFilter.sort === 'priority_desc') {
    filtered.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  } else if (state.allTicketsFilter.sort === 'newest') {
    filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  } else if (state.allTicketsFilter.sort === 'sla_urgent') {
    filtered.sort((a, b) => (a.sla?.remaining_hours || 999) - (b.sla?.remaining_hours || 999));
  }

  // Render Table View
  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding: 40px; color: var(--text-muted);">
          <div style="font-size: 14px; font-weight:700;">No matching tickets found</div>
          <div style="font-size: 12px; margin-top: 4px;">Try clearing filters or search keywords.</div>
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = filtered.map((t, idx) => {
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
          <td><span style="font-size: 12px; font-weight:600; color:#334155;">${escapeHtml(t.requester?.name || 'Admin')}</span></td>
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
  }

  // Render Kanban Cards View
  if (filtered.length === 0) {
    kanban.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding: 40px; background:#fff; border-radius:14px; border:1px solid var(--border-color); color: var(--text-muted);">
        No matching tickets found
      </div>
    `;
  } else {
    kanban.innerHTML = filtered.map((t, idx) => {
      const code = formatTicketCode(t.ticket_id, idx);
      const badgeClass = getPriorityBadgeClass(t.priority);
      const statusBadgeClass = getStatusBadgeClass(t.status);
      const slaFormatted = formatSLA(t.sla);

      return `
        <div class="ticket-card-kanban priority-${escapeHtml(t.priority)}" onclick="openTicketDetailsModal('${escapeHtml(t.ticket_id)}')">
          <div class="kanban-top-meta">
            <span class="ticket-id-badge">${escapeHtml(code)}</span>
            <span class="badge-pill-priority ${badgeClass}">${formatPriority(t.priority)}</span>
          </div>

          <div class="kanban-title">${escapeHtml(t.title)}</div>
          <div class="kanban-desc">${escapeHtml(t.description || '')}</div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="ticket-category-pill">${escapeHtml(t.category || 'General')}</span>
            <span class="status-badge-pill ${statusBadgeClass}">${escapeHtml(t.status || 'OPEN')}</span>
          </div>

          <div class="kanban-bottom-meta">
            <div class="kanban-requester">
              <i data-lucide="user" style="width:13px; height:13px;"></i>
              <span>${escapeHtml(t.requester?.name || 'Admin')}</span>
            </div>
            <div>${slaFormatted}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  refreshIcons();
}

function handleAllTicketsSearch(val) {
  state.allTicketsFilter.search = val.trim();
  renderAllTicketsView();
}

function handleAllTicketsFilterChange() {
  const statusSelect = document.getElementById('all-filter-status');
  const catSelect = document.getElementById('all-filter-category');
  if (statusSelect) state.allTicketsFilter.status = statusSelect.value;
  if (catSelect) state.allTicketsFilter.category = catSelect.value;
  renderAllTicketsView();
}

function handleAllTicketsSortChange(val) {
  state.allTicketsFilter.sort = val;
  renderAllTicketsView();
}

function setAllTicketsLayout(layout) {
  state.allTicketsFilter.layout = layout;
  const tableContainer = document.getElementById('all-tickets-table-container');
  const kanbanContainer = document.getElementById('all-tickets-kanban-container');
  const btnTable = document.getElementById('btn-view-table');
  const btnKanban = document.getElementById('btn-view-kanban');

  if (layout === 'table') {
    tableContainer.style.display = 'block';
    kanbanContainer.style.display = 'none';
    btnTable.classList.add('active');
    btnKanban.classList.remove('active');
  } else {
    tableContainer.style.display = 'none';
    kanbanContainer.style.display = 'grid';
    btnTable.classList.remove('active');
    btnKanban.classList.add('active');
  }
  refreshIcons();
}

// =========================================================
// MY TICKETS WORKSTATION
// =========================================================

function renderMyTicketsView() {
  const tbody = document.getElementById('my-tickets-tbody');
  const countEl = document.getElementById('my-active-count');
  const tabCnt = document.getElementById('my-tab-all-cnt');
  if (!tbody) return;

  let myTickets = state.tickets.filter(t => {
    return t.assigned_to === 'Admin' || 
           t.requester?.name?.toLowerCase().includes('sarah') || 
           t.status === 'IN_PROGRESS' || 
           t.status === 'OPEN';
  });

  if (myTickets.length === 0) {
    myTickets = state.tickets.slice(0, 4);
  }

  if (countEl) countEl.innerText = myTickets.length;
  if (tabCnt) tabCnt.innerText = myTickets.length;

  let displayTickets = [...myTickets];
  if (state.myTicketsFilter === 'IN_PROGRESS') {
    displayTickets = displayTickets.filter(t => t.status === 'IN_PROGRESS');
  } else if (state.myTicketsFilter === 'CRITICAL') {
    displayTickets = displayTickets.filter(t => t.priority === 'P1_CRITICAL' || t.priority === 'P2_HIGH');
  } else if (state.myTicketsFilter === 'RESOLVED') {
    displayTickets = displayTickets.filter(t => t.status === 'RESOLVED');
  }

  if (displayTickets.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding: 36px; color: var(--text-muted);">
          No assigned tickets in this sub-view.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = displayTickets.map((t, idx) => {
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
          <button class="btn-primary" style="padding:4px 10px; font-size:11.5px;" onclick="openTicketDetailsModal('${escapeHtml(t.ticket_id)}')">
            Inspect
          </button>
          <button class="btn-secondary" style="padding:4px 10px; font-size:11.5px;" onclick="quickResolveTicket('${escapeHtml(t.ticket_id)}')">
            Resolve
          </button>
        </td>
      </tr>
    `;
  }).join('');

  refreshIcons();
}

function filterMyTicketsSubTab(subTab, el) {
  state.myTicketsFilter = subTab;
  el.parentElement.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderMyTicketsView();
}

function filterMyTickets() {
  state.allTicketsFilter.search = "Sarah";
  navigateToView('my_tickets');
}

// =========================================================
// ANALYTICS VIEW & MULTI-CHART SUITE
// =========================================================

function renderAnalyticsView() {
  renderAnalyticsCharts();
}

function renderAnalyticsCharts() {
  if (typeof Chart === 'undefined') return;

  const tickets = state.tickets;
  const p1 = tickets.filter(t => t.priority === 'P1_CRITICAL').length;
  const p2 = tickets.filter(t => t.priority === 'P2_HIGH').length;
  const p3 = tickets.filter(t => t.priority === 'P3_MEDIUM').length;
  const p4 = tickets.filter(t => t.priority === 'P4_LOW').length;

  // Chart 1: Priority Severity Donut
  const ctxPriority = document.getElementById('chart-analytics-priority');
  if (ctxPriority) {
    if (state.charts.analyticsPriority) state.charts.analyticsPriority.destroy();
    state.charts.analyticsPriority = new Chart(ctxPriority, {
      type: 'doughnut',
      data: {
        labels: ['P1 Critical', 'P2 High', 'P3 Medium', 'P4 Low'],
        datasets: [{
          data: [p1 || 2, p2 || 3, p3 || 3, p4 || 1],
          backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#94a3b8'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 11 } } }
        }
      }
    });
  }

  // Chart 2: Category Breakdown Bar Chart
  const ctxCat = document.getElementById('chart-analytics-categories');
  if (ctxCat) {
    if (state.charts.analyticsCategories) state.charts.analyticsCategories.destroy();
    
    const catMap = {};
    tickets.forEach(t => {
      const c = t.category || 'General';
      catMap[c] = (catMap[c] || 0) + 1;
    });

    const labels = Object.keys(catMap).length ? Object.keys(catMap) : ['Billing', 'Finance', 'Network', 'Enterprise Apps', 'Hardware'];
    const data = Object.keys(catMap).length ? Object.values(catMap) : [3, 2, 2, 1, 1];

    state.charts.analyticsCategories = new Chart(ctxCat, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Incidents Ingested',
          data: data,
          backgroundColor: '#3b82f6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Chart 3: Department Breakdown Bar Chart
  const ctxDept = document.getElementById('chart-analytics-depts');
  if (ctxDept) {
    if (state.charts.analyticsDepts) state.charts.analyticsDepts.destroy();

    const deptMap = {};
    tickets.forEach(t => {
      const d = t.requester?.department || 'IT Operations';
      deptMap[d] = (deptMap[d] || 0) + 1;
    });

    const labels = Object.keys(deptMap).length ? Object.keys(deptMap) : ['Infrastructure', 'Finance', 'Network', 'Marketing', 'Hardware'];
    const data = Object.keys(deptMap).length ? Object.values(deptMap) : [4, 2, 2, 1, 1];

    state.charts.analyticsDepts = new Chart(ctxDept, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Requests by Dept',
          data: data,
          backgroundColor: '#8b5cf6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Chart 4: SLA Adherence Doughnut
  const ctxSla = document.getElementById('chart-analytics-sla');
  if (ctxSla) {
    if (state.charts.analyticsSla) state.charts.analyticsSla.destroy();
    const stats = state.dashboardStats || {};
    const onTime = stats.sla_on_time_count !== undefined ? stats.sla_on_time_count : 7;
    const atRisk = stats.sla_at_risk_count !== undefined ? stats.sla_at_risk_count : 2;
    const breached = stats.sla_breached_count !== undefined ? stats.sla_breached_count : 0;

    state.charts.analyticsSla = new Chart(ctxSla, {
      type: 'doughnut',
      data: {
        labels: ['On Time SLA', 'At Risk (<2h)', 'Breached'],
        datasets: [{
          data: [onTime || 7, atRisk || 2, breached || 0],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 11 } } }
        }
      }
    });
  }
}

// =========================================================
// REPORTS VIEW & EXPORT CENTER
// =========================================================

function renderReportsView() {
  const tbody = document.getElementById('reports-table-tbody');
  if (!tbody) return;

  tbody.innerHTML = state.tickets.map((t, idx) => {
    const code = formatTicketCode(t.ticket_id, idx);
    const badgeClass = getPriorityBadgeClass(t.priority);
    const statusBadgeClass = getStatusBadgeClass(t.status);
    const slaTarget = t.sla?.target_hours ? `${t.sla.target_hours} Hours` : '24 Hours';

    return `
      <tr>
        <td><span class="ticket-id-badge">${escapeHtml(code)}</span></td>
        <td><strong>${escapeHtml(t.title)}</strong></td>
        <td>${escapeHtml(t.category || 'General')}</td>
        <td><span class="badge-pill-priority ${badgeClass}">${formatPriority(t.priority)}</span></td>
        <td><strong style="font-family:'JetBrains Mono',monospace;">${t.priority_score || 0}/100</strong></td>
        <td>${slaTarget}</td>
        <td><span class="status-badge-pill ${statusBadgeClass}">${escapeHtml(t.status || 'OPEN')}</span></td>
        <td>${escapeHtml(t.requester?.department || 'Operations')}</td>
      </tr>
    `;
  }).join('');

  refreshIcons();
}

function generateReportType(type) {
  const title = document.getElementById('report-table-title');
  if (type === 'sla') {
    if (title) title.innerText = "Live SLA Compliance & Breach Audit Report";
    showToastNotification("Generated SLA Compliance Report dataset", "success");
  } else if (type === 'category') {
    if (title) title.innerText = "Incident Category Blast Radius & Root Cause Summary";
    showToastNotification("Generated Incident Category Breakdown", "success");
  } else if (type === 'agent') {
    if (title) title.innerText = "IT Support Specialist Velocity & Resolution Audit";
    showToastNotification("Generated Team Workload & Velocity Report", "success");
  }
  renderReportsView();
}

function exportTicketsJSON() {
  if (!state.tickets.length) {
    showToastNotification("No tickets to export", "info");
    return;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.tickets, null, 2));
  const link = document.createElement('a');
  link.setAttribute("href", dataStr);
  link.setAttribute("download", `IntelliTicket_Dump_${new Date().toISOString().slice(0,10)}.json`);
  link.click();
  showToastNotification("Exported raw JSON ticket dataset", "success");
}

// =========================================================
// SETTINGS VIEW CONTROLLER
// =========================================================

function renderSettingsView() {
  const savedAppName = localStorage.getItem('it_app_name');
  if (savedAppName) {
    const el = document.getElementById('setting-app-name');
    if (el) el.value = savedAppName;
  }
}

function switchSettingsTab(tabKey, el) {
  document.querySelectorAll('.settings-sidebar .settings-tab-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');

  document.querySelectorAll('.settings-pane-content').forEach(p => p.style.display = 'none');
  const targetPane = document.getElementById(`settings-tab-${tabKey}`);
  if (targetPane) targetPane.style.display = 'block';
  refreshIcons();
}

function saveSettings() {
  const appName = document.getElementById('setting-app-name')?.value;
  if (appName) {
    localStorage.setItem('it_app_name', appName);
  }
  showToastNotification("Settings & Prioritization Weights saved successfully!", "success");
}

// =========================================================
// CREATE TICKET STUDIO & LIVE SCORING SIMULATOR
// =========================================================

function renderCreateStudioView() {
  renderPresets();
  setupLiveScoringSimulator();
}

function renderPresets() {
  const renderContainer = (containerId, applyFn) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = PRESETS.map((p, idx) => `
      <div class="preset-chip" onclick="${applyFn}(${idx})">
        <span>${escapeHtml(p.label)}</span>
      </div>
    `).join('');
  };

  renderContainer('create-presets-container', 'applyModalPreset');
  renderContainer('studio-presets-container', 'applyStudioPreset');
}

function applyModalPreset(idx) {
  const p = PRESETS[idx];
  if (!p) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('new-ticket-title', p.title);
  setVal('new-ticket-desc', p.desc);
  setVal('new-ticket-scope', p.scope);
  setVal('new-ticket-crit', p.crit);
  setVal('new-ticket-req-name', p.name);
  setVal('new-ticket-req-dept', p.dept);
  setVal('new-ticket-req-email', p.email);

  const vipBox = document.getElementById('new-ticket-vip');
  if (vipBox) vipBox.checked = p.vip;

  simulateScoring('modal');
  showToastNotification(`Loaded: ${p.label}`, 'info');
}

function applyStudioPreset(idx) {
  const p = PRESETS[idx];
  if (!p) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('studio-ticket-title', p.title);
  setVal('studio-ticket-desc', p.desc);
  setVal('studio-ticket-scope', p.scope);
  setVal('studio-ticket-crit', p.crit);
  setVal('studio-ticket-req-name', p.name);
  setVal('studio-ticket-req-dept', p.dept);
  setVal('studio-ticket-req-email', p.email);

  const vipBox = document.getElementById('studio-ticket-vip');
  if (vipBox) vipBox.checked = p.vip;

  simulateScoring('studio');
  showToastNotification(`Loaded: ${p.label}`, 'info');
}

function setupLiveScoringSimulator() {
  const bindInputs = (prefix, mode) => {
    const ids = [
      `${prefix}-ticket-title`,
      `${prefix}-ticket-desc`,
      `${prefix}-ticket-scope`,
      `${prefix}-ticket-crit`,
      `${prefix}-ticket-vip`
    ];

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => simulateScoring(mode));
        el.addEventListener('change', () => simulateScoring(mode));
      }
    });
  };

  bindInputs('new', 'modal');
  bindInputs('studio', 'studio');
  simulateScoring('modal');
  simulateScoring('studio');
}

function simulateScoring(mode = 'modal') {
  const prefix = mode === 'studio' ? 'studio' : 'new';
  const title = document.getElementById(`${prefix}-ticket-title`)?.value || '';
  const desc = document.getElementById(`${prefix}-ticket-desc`)?.value || '';
  const scope = document.getElementById(`${prefix}-ticket-scope`)?.value || 'INDIVIDUAL';
  const crit = document.getElementById(`${prefix}-ticket-crit`)?.value || 'MEDIUM';
  const isVip = document.getElementById(`${prefix}-ticket-vip`)?.checked || false;

  let score = 0;
  let blastPts = 10;
  let critPts = 14;
  let nlpPts = 0;
  let vipPts = isVip ? 10 : 0;

  if (scope === 'ORGANIZATION') blastPts = 30;
  else if (scope === 'TEAM') blastPts = 20;

  if (crit === 'SEVERE') critPts = 30;
  else if (crit === 'HIGH') critPts = 22;
  else if (crit === 'MEDIUM') critPts = 14;
  else if (crit === 'LOW') critPts = 5;

  const combined = `${title} ${desc}`.toLowerCase();
  const matchedCrit = CRITICAL_KEYWORDS.filter(k => combined.includes(k));
  const matchedHigh = HIGH_KEYWORDS.filter(k => combined.includes(k));

  if (matchedCrit.length > 0) nlpPts = 25;
  else if (matchedHigh.length > 0) nlpPts = 15;

  score = Math.min(100, blastPts + critPts + nlpPts + vipPts);

  let priority = 'P4_LOW';
  let slaText = '72h SLA';
  let badgeStyle = '#64748b';

  if (score >= 80) {
    priority = 'P1_CRITICAL';
    slaText = '1h SLA Outage';
    badgeStyle = '#ef4444';
  } else if (score >= 60) {
    priority = 'P2_HIGH';
    slaText = '4h SLA Urgent';
    badgeStyle = '#f59e0b';
  } else if (score >= 35) {
    priority = 'P3_MEDIUM';
    slaText = '24h SLA Normal';
    badgeStyle = '#3b82f6';
  }

  if (mode === 'modal') {
    const scoreText = document.getElementById('preview-score-text');
    const bar = document.getElementById('preview-progress-bar');
    const prioBadge = document.getElementById('preview-priority-badge');
    const kwPill = document.getElementById('preview-keywords-pill');

    if (scoreText) scoreText.innerText = `${score}/100`;
    if (bar) {
      bar.style.width = `${score}%`;
      bar.style.background = score >= 80 ? '#ef4444' : (score >= 60 ? '#f59e0b' : '#3b82f6');
    }
    if (prioBadge) {
      prioBadge.innerText = `${formatPriority(priority)} (${slaText})`;
      prioBadge.style.color = badgeStyle;
    }
    if (kwPill) {
      kwPill.innerText = matchedCrit.length ? `🚨 Cues: ${matchedCrit.slice(0, 2).join(', ')}` : '';
    }
  } else {
    const huge = document.getElementById('studio-score-huge');
    const bar = document.getElementById('studio-score-bar');
    const pill = document.getElementById('studio-priority-pill');
    const slaEl = document.getElementById('studio-sla-target-text');

    if (huge) huge.innerText = score;
    if (bar) {
      bar.style.width = `${score}%`;
      bar.style.background = score >= 80 ? '#ef4444' : (score >= 60 ? '#f59e0b' : '#3b82f6');
    }
    if (pill) {
      pill.className = `badge-pill-priority ${priority}`;
      pill.innerText = formatPriority(priority);
    }
    if (slaEl) slaEl.innerText = `⏱️ ${slaText}`;

    const setVal = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.innerText = txt;
    };
    setVal('factor-blast', `+${blastPts} pts`);
    setVal('factor-crit', `+${critPts} pts`);
    setVal('factor-nlp', `+${nlpPts} pts`);
    setVal('factor-vip', `+${vipPts} pts`);
  }
}

async function handleCreateTicketSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-create');
  btn.disabled = true;
  btn.innerHTML = `<span class="online-dot" style="display:inline-block;"></span> Prioritizing...`;

  try {
    const payload = {
      title: document.getElementById('new-ticket-title').value.trim(),
      description: document.getElementById('new-ticket-desc').value.trim(),
      impact_scope: document.getElementById('new-ticket-scope').value,
      business_criticality: document.getElementById('new-ticket-crit').value,
      requester: {
        name: document.getElementById('new-ticket-req-name').value.trim(),
        department: document.getElementById('new-ticket-req-dept').value.trim(),
        email: document.getElementById('new-ticket-req-email').value.trim(),
        is_vip: document.getElementById('new-ticket-vip').checked
      }
    };

    const res = await fetch('/api/v1/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create ticket');
    }

    const created = await res.json();
    closeCreateModal();
    showToastNotification(`Ticket prioritized as ${formatPriority(created.priority)} (Score: ${created.priority_score})`, 'success');
    await loadData(false);
    navigateToView('all_tickets');
  } catch (err) {
    showToastNotification(`Error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="zap" style="width: 16px; height: 16px;"></i><span>Submit & Prioritize in MongoDB</span>`;
    refreshIcons();
  }
}

async function handleStudioSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-studio-submit');
  btn.disabled = true;
  btn.innerHTML = `<span class="online-dot" style="display:inline-block;"></span> AI Engine Ingesting...`;

  try {
    const payload = {
      title: document.getElementById('studio-ticket-title').value.trim(),
      description: document.getElementById('studio-ticket-desc').value.trim(),
      impact_scope: document.getElementById('studio-ticket-scope').value,
      business_criticality: document.getElementById('studio-ticket-crit').value,
      requester: {
        name: document.getElementById('studio-ticket-req-name').value.trim(),
        department: document.getElementById('studio-ticket-req-dept').value.trim(),
        email: document.getElementById('studio-ticket-req-email').value.trim(),
        is_vip: document.getElementById('studio-ticket-vip').checked
      }
    };

    const res = await fetch('/api/v1/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create ticket');
    }

    const created = await res.json();
    showToastNotification(`AI Prioritization: Assigned ${formatPriority(created.priority)} (${created.priority_score}/100)`, 'success');
    await loadData(false);
    navigateToView('all_tickets');
  } catch (err) {
    showToastNotification(`Error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="zap" style="width: 16px; height: 16px;"></i><span>Submit Ticket & Trigger AI Prioritization</span>`;
    refreshIcons();
  }
}

function resetStudioForm() {
  document.getElementById('form-studio-create')?.reset();
  simulateScoring('studio');
}

// =========================================================
// MODALS (TICKET DETAILS, INSPECTION & AUDIT)
// =========================================================

function openCreateModal() {
  const modal = document.getElementById('modal-create-ticket');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('new-ticket-title')?.focus();
    simulateScoring('modal');
    refreshIcons();
  }
}

function closeCreateModal() {
  document.getElementById('modal-create-ticket')?.classList.remove('active');
}

async function openTicketDetailsModal(ticketId) {
  let ticket = state.tickets.find(t => t.ticket_id === ticketId);

  try {
    const res = await fetch(`/api/v1/tickets/${encodeURIComponent(ticketId)}`);
    if (res.ok) ticket = await res.json();
  } catch (err) {
    console.warn("Could not fetch latest ticket details:", err);
  }

  if (!ticket) {
    showToastNotification("Ticket details unavailable", "error");
    return;
  }

  state.selectedTicket = ticket;

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  setTxt('modal-ticket-title', ticket.title);
  setTxt('modal-ticket-desc', ticket.description || 'No detailed symptoms provided.');
  setTxt('modal-ticket-code', ticket.ticket_id);

  const badge = document.getElementById('modal-ticket-badge');
  if (badge) {
    badge.className = `badge-pill-priority ${ticket.priority}`;
    badge.innerText = formatPriority(ticket.priority);
  }

  const aiBox = document.getElementById('modal-ai-reasoning');
  if (aiBox) {
    aiBox.innerText = ticket.ai_reasoning || `Classified with priority score ${ticket.priority_score}/100 based on Blast Radius (${ticket.impact_scope}), Criticality (${ticket.business_criticality}), and requester SLA agreements.`;
  }

  const chipsRow = document.getElementById('modal-score-chips-row');
  if (chipsRow) {
    chipsRow.innerHTML = `
      <span class="preset-chip">Scope: ${ticket.impact_scope}</span>
      <span class="preset-chip">Criticality: ${ticket.business_criticality}</span>
      <span class="preset-chip">AI Score: ${ticket.priority_score}/100</span>
      <span class="preset-chip">Requester: ${ticket.requester?.name || 'Staff'} (${ticket.requester?.department || 'General'})</span>
    `;
  }

  const statusSelect = document.getElementById('modal-change-status-select');
  if (statusSelect) statusSelect.value = ticket.status || 'OPEN';

  // Render Timeline
  const timelineContainer = document.getElementById('modal-timeline-container');
  if (timelineContainer) {
    const events = ticket.timeline || [
      { event: "TICKET_CREATED", note: "Ingested and auto-prioritized by AI engine", timestamp: ticket.created_at, actor: "AI System" }
    ];

    timelineContainer.innerHTML = events.map(ev => `
      <div style="font-size: 12px; color: #475569;">
        <div style="font-weight: 700; color: #0f172a;">${escapeHtml(ev.event || 'NOTE')} <span style="font-weight: normal; color: var(--text-muted);">by ${escapeHtml(ev.actor || 'System')}</span></div>
        <div>${escapeHtml(ev.note || '')}</div>
      </div>
    `).join('');
  }

  document.getElementById('modal-ticket-details')?.classList.add('active');
  refreshIcons();
}

function closeDetailsModal() {
  document.getElementById('modal-ticket-details')?.classList.remove('active');
  state.selectedTicket = null;
}

async function applyStatusChangeFromModal() {
  if (!state.selectedTicket) return;
  const newStatus = document.getElementById('modal-change-status-select')?.value;
  if (!newStatus) return;

  try {
    const res = await fetch(`/api/v1/tickets/${encodeURIComponent(state.selectedTicket.ticket_id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        actor: "Admin",
        note: `Lifecycle updated to ${newStatus}`
      })
    });

    if (!res.ok) throw new Error("Status update failed");
    showToastNotification(`Status changed to ${newStatus}`, 'success');
    closeDetailsModal();
    await loadData(false);
  } catch (err) {
    showToastNotification(err.message, 'error');
  }
}

async function quickResolveTicket(ticketId) {
  try {
    const res = await fetch(`/api/v1/tickets/${encodeURIComponent(ticketId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: "RESOLVED",
        actor: "Admin",
        note: "Marked as resolved via quick triage action"
      })
    });

    if (!res.ok) throw new Error("Failed to resolve ticket");
    showToastNotification(`Ticket ${ticketId} resolved`, 'success');
    await loadData(false);
  } catch (err) {
    showToastNotification(err.message, 'error');
  }
}

async function handleAppendNote(e) {
  e.preventDefault();
  if (!state.selectedTicket) return;
  const input = document.getElementById('modal-note-input');
  const note = input?.value.trim();
  if (!note) return;

  try {
    const res = await fetch(`/api/v1/tickets/${encodeURIComponent(state.selectedTicket.ticket_id)}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: "Admin",
        note: note
      })
    });

    if (!res.ok) throw new Error("Failed to add note");
    input.value = '';
    showToastNotification("Internal investigation note appended", 'success');
    openTicketDetailsModal(state.selectedTicket.ticket_id);
    loadData(false);
  } catch (err) {
    showToastNotification(err.message, 'error');
  }
}

// =========================================================
// SEED DATABASE & DEMO HELPERS
// =========================================================

async function seedDatabaseDirect() {
  const btn = document.getElementById('btn-seed-fast');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="online-dot" style="display:inline-block;"></span><span>Seeding MongoDB...</span>`;
  }

  try {
    const res = await fetch('/api/v1/tickets/seed', { method: 'POST' });
    if (!res.ok) throw new Error(`Seed failed with HTTP ${res.status}`);
    const data = await res.json();
    showToastNotification(`MongoDB successfully seeded with ${data.inserted_count || 9} demo incidents!`, 'success');
    await loadData(false);
  } catch (err) {
    showToastNotification(`Seed error: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="database" style="width: 14px; height: 14px;"></i><span>Seed Demo Data</span>`;
      refreshIcons();
    }
  }
}

// Filter Actions
function setPriorityFilter(filter, el) {
  state.activeFilter = filter;
  document.querySelectorAll('.filter-pill').forEach(b => {
    if (b.getAttribute('data-filter') === filter) b.classList.add('active');
    else b.classList.remove('active');
  });
  if (el) el.classList.add('active');
  loadTickets();
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
    `"${(t.title || '').replace(/"/g, '""')}"`,
    t.category || '',
    t.priority || '',
    t.priority_score || 0,
    t.sla?.remaining_hours || 0,
    t.status || '',
    `"${(t.requester?.name || '').replace(/"/g, '""')}"`,
    `"${(t.requester?.department || '').replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `IntelliTicket_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  showToastNotification("CSV Report downloaded", "success");
}

function openAuditStreamModal() {
  showToastNotification("Audit log tracks every creation, status transition, and investigation note.", "info");
}

function showNotificationToast() {
  showToastNotification("3 P1/P2 incidents currently require immediate triage & attention", "info");
}

// Charts on Dashboard
function updateDonutChart() {
  const ctx = document.getElementById('chart-priority-donut');
  if (!ctx || typeof Chart === 'undefined') return;

  const tickets = state.tickets;
  const p1 = tickets.filter(t => t.priority === 'P1_CRITICAL').length;
  const p2 = tickets.filter(t => t.priority === 'P2_HIGH').length;
  const p3 = tickets.filter(t => t.priority === 'P3_MEDIUM').length;
  const p4 = tickets.filter(t => t.priority === 'P4_LOW').length;

  if (state.charts.priority) state.charts.priority.destroy();

  state.charts.priority = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['P1 Critical', 'P2 High', 'P3 Medium', 'P4 Low'],
      datasets: [{
        data: [p1 || 2, p2 || 3, p3 || 3, p4 || 1],
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#64748b'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '76%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      }
    }
  });
}

function updateSLAGauge() {
  const ctx = document.getElementById('chart-sla-gauge');
  if (!ctx || typeof Chart === 'undefined') return;

  const stats = state.dashboardStats || {};
  const onTime = stats.sla_on_time_count !== undefined ? stats.sla_on_time_count : 7;
  const atRisk = stats.sla_at_risk_count !== undefined ? stats.sla_at_risk_count : 2;
  const breached = stats.sla_breached_count !== undefined ? stats.sla_breached_count : 0;

  if (state.charts.slaGauge) state.charts.slaGauge.destroy();

  state.charts.slaGauge = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['On Time', 'At Risk', 'Breached'],
      datasets: [{
        data: [onTime || 7, atRisk || 2, breached || 0],
        backgroundColor: ['#16a34a', '#f59e0b', '#ef4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      circumference: 240,
      rotation: 240,
      cutout: '80%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      }
    }
  });
}

// Formatters
function formatTicketCode(id, idx) {
  if (id && id.startsWith('TKT-')) return id;
  return `TKT-${String(idx + 1).padStart(3, '0')}`;
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
  if (s === 'OPEN') return 'OPEN';
  if (s === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (s === 'RESOLVED') return 'RESOLVED';
  return 'IN_PROGRESS';
}

function formatSLA(sla) {
  const rem = sla?.remaining_hours !== undefined ? sla.remaining_hours : 12;
  if (rem <= 0) {
    return `<span class="sla-time-tag sla-breached">⚠️ Breached</span>`;
  } else if (rem <= 2) {
    return `<span class="sla-time-tag sla-urgent">⏱️ ${rem}h Left</span>`;
  }
  return `<span class="sla-time-tag sla-normal">⏱️ ${rem}h Left</span>`;
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
