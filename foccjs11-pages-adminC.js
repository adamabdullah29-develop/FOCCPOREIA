/* =========================================================================
   BAHAGIAN C — System Health + Module Skeleton pages
   ========================================================================= */

/* ============================================================
   PAGE: SYSTEM HEALTH
============================================================= */
async function renderSystemHealthPage(){
  const wrap = document.createElement('div');
  wrap.className = 'opkpi-modern-page';
  wrap.innerHTML = '<div class="section"><div class="section-body" id="shRoot">'
                 + '<div class="focc-sh-empty">Loading system health…</div></div></div>';

  const root = wrap.querySelector('#shRoot');
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const TREND_KEY = 'focc-sh-storage-trend-v1';
  let busy = false;

  function fmtBytes(n){
    n = Number(n || 0);
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(2) + ' MB';
    return (n / 1073741824).toFixed(2) + ' GB';
  }
  function usePct(part, whole){
    const p = whole ? (Number(part || 0) / Number(whole)) * 100 : 0;
    return { n: p, txt: p >= 10 ? p.toFixed(1) : p.toFixed(2) };
  }
  function fmtWhen(iso){
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const now = new Date();
    const hh = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    const days = Math.floor((now - d) / 86400000);
    if (d.toDateString() === now.toDateString()) return 'Today ' + hh;
    if (days <= 1) return 'Yesterday ' + hh;
    if (days < 7) return days + 'd ago';
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + hh;
  }
  function fmtClock(iso){
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function statusPill(s){
    if (s === 'active_today')     return '<span class="focc-sh-pill is-today">Active today</span>';
    if (s === 'data_today')       return '<span class="focc-sh-pill is-today">Data today</span>';
    if (s === 'doc_today')        return '<span class="focc-sh-pill is-today">Upload today</span>';
    if (s === 'active_this_week') return '<span class="focc-sh-pill is-week">This week</span>';
    return '<span class="focc-sh-pill is-silent">Silent</span>';
  }

  function readTrend(){
    try{
      const a = JSON.parse(localStorage.getItem(TREND_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    }catch(_e){ return []; }
  }
  function writeTrend(a){
    try{ localStorage.setItem(TREND_KEY, JSON.stringify(a.slice(-60))); }catch(_e){}
  }
  function storageTrend(currentBytes){
    const today = new Date().toISOString().slice(0,10);
    const hist = readTrend();
    const last = hist.length - 1;
    let prev = null;

    if (last >= 0 && hist[last].day === today){
      prev = (last >= 1) ? hist[last - 1] : null;
      hist[last] = { day: today, bytes: Number(currentBytes || 0) };
    }else{
      prev = (last >= 0) ? hist[last] : null;
      hist.push({ day: today, bytes: Number(currentBytes || 0) });
    }
    writeTrend(hist);

    if (!prev) return { value: '—', sub: 'Baseline saved — the next check shows the change' };

    const diff = Number(currentBytes || 0) - Number(prev.bytes || 0);
    const when = (prev.day === today) ? 'the last check' : prev.day;

    if (diff === 0) return { value: 'No change', sub: 'Same size as ' + when };
    return {
      value: (diff > 0 ? '+' : '−') + ' ' + fmtBytes(Math.abs(diff)),
      sub: (diff > 0 ? 'Grew' : 'Shrank') + ' since ' + when
    };
  }

  function render(data, ms){
    data = data || {};
    const p = data.platform || {};
    const companies = data.companies || [];

    const used    = Number(p.totalStorageBytes || 0);
    const limit   = Number(p.storageLimitBytes || 0);
    const storage = usePct(used, limit);

    const dbUsed  = Number(p.databaseBytes || 0);
    const dbLimit = Number(p.dbLimitBytes || 0);
    const db      = usePct(dbUsed, dbLimit);

    const largest   = p.largestCompany || null;
    const topTables = Array.isArray(p.topTables) ? p.topTables : [];
    const trend     = storageTrend(used);

    let health = 'Healthy', dot = 'is-ok';
    if (storage.n >= 80 || db.n >= 80)       { health = 'Nearly full'; dot = 'is-bad'; }
    else if (storage.n >= 60 || db.n >= 60)  { health = 'Filling up';  dot = 'is-warn'; }
    else if (Number(p.silentCount || 0) > 0) { health = 'Attention';   dot = 'is-warn'; }

    const rowsHtml = companies.length
      ? companies.map(c => {
          const sub = escapeHtml(String(c.companyId || ''))
            + (c.companyStatus && c.companyStatus !== 'Active' ? ' · ' + escapeHtml(String(c.companyStatus)) : '');
          return '<tr>'
            + '<td><b>' + escapeHtml(String(c.companyName || c.companyId || '')) + '</b>'
            + '<div class="focc-sh-mute" style="font-size:11.5px;">' + sub + '</div></td>'
            + '<td>' + statusPill(c.activityStatus) + '</td>'
            + '<td class="focc-sh-num">' + escapeHtml(fmtWhen(c.lastSignInAt)) + '</td>'
            + '<td class="focc-sh-num">' + escapeHtml(fmtWhen(c.lastDataChangeAt)) + '</td>'
            + '<td class="focc-sh-num">' + escapeHtml(fmtWhen(c.lastUploadAt)) + '</td>'
            + '<td class="focc-sh-num">' + escapeHtml(fmtBytes(c.storageBytes)) + '</td>'
            + '<td class="focc-sh-num">' + Number(c.fileCount || 0) + '</td>'
            + '</tr>';
        }).join('')
      : '<tr><td colspan="7"><div class="focc-sh-empty">No company yet.</div></td></tr>';

    const topRowsHtml = topTables.length
      ? topTables.map(t => '<tr>'
          + '<td class="focc-sh-num">' + escapeHtml(String(t.schema || '')) + '</td>'
          + '<td><b>' + escapeHtml(String(t.table || '')) + '</b></td>'
          + '<td class="focc-sh-num">' + escapeHtml(fmtBytes(t.bytes)) + '</td>'
          + '</tr>').join('')
      : '<tr><td colspan="3"><div class="focc-sh-empty">No table data.</div></td></tr>';

    root.innerHTML = `
      <div class="section">
        <div class="section-head">
          <h3>Web Status</h3>
          <span class="eyebrow">SuperAdmin · read-only</span>
        </div>
        <div class="section-body">
          <div class="focc-sh-top">
            <div class="focc-sh-banner">
              <span class="focc-sh-dot ${dot}"></span>
              <div>
                <div class="focc-sh-statustext">${escapeHtml(health)}</div>
                <div class="focc-sh-stamp">Last check ${escapeHtml(fmtClock(data.checkedAt))} · Round trip ${Number(ms || 0)} ms · DB query ${Number(p.dbMs || 0)} ms</div>
              </div>
            </div>
            <button class="btn primary" id="shRefresh">Refresh Check</button>
          </div>
          <div class="focc-sh-tech">
            <span>Database ${escapeHtml(fmtBytes(dbUsed))} / ${escapeHtml(fmtBytes(dbLimit))}</span>
            <span>Storage ${escapeHtml(fmtBytes(used))} / ${escapeHtml(fmtBytes(limit))}</span>
            <span>Auth: OK</span>
            <span>${Number(p.activeToday || 0)} active today</span>
            <span>${Number(p.silentCount || 0)} silent</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Storage &amp; Database</h3>
          <span class="eyebrow">${escapeHtml(p.storageLimitLabel || ('Storage limit: ' + fmtBytes(limit)))}</span>
        </div>
        <div class="section-body">
          <div class="focc-sh-cards">
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Storage Used</div>
              <div class="focc-sh-card-value">${escapeHtml(fmtBytes(used))}</div>
              <div class="focc-sh-card-sub">of ${escapeHtml(fmtBytes(limit))} · ${storage.txt}%</div>
              <div class="focc-sh-bar"><span style="width:${Math.min(100, Math.max(0.6, storage.n))}%"></span></div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Database Used</div>
              <div class="focc-sh-card-value">${escapeHtml(fmtBytes(dbUsed))}</div>
              <div class="focc-sh-card-sub">of ${escapeHtml(fmtBytes(dbLimit))} · ${db.txt}%</div>
              <div class="focc-sh-bar"><span style="width:${Math.min(100, Math.max(0.6, db.n))}%"></span></div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Uploaded Files</div>
              <div class="focc-sh-card-value">${Number(p.totalFiles || 0)}</div>
              <div class="focc-sh-card-sub">${Number(p.companiesWithFiles || 0)} of ${Number(p.companyCount || 0)} companies have documents</div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Largest Company</div>
              <div class="focc-sh-card-value" style="font-size:20px;">${escapeHtml(largest ? String(largest.companyName || largest.companyId) : '—')}</div>
              <div class="focc-sh-card-sub">${largest ? escapeHtml(fmtBytes(largest.storageBytes)) : 'No documents yet'}</div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Speed</div>
              <div class="focc-sh-card-value">${Number(ms || 0)} ms</div>
              <div class="focc-sh-card-sub">Round trip from this browser · database part ${Number(p.dbMs || 0)} ms</div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Storage Trend</div>
              <div class="focc-sh-card-value" style="font-size:20px;">${escapeHtml(trend.value)}</div>
              <div class="focc-sh-card-sub">${escapeHtml(trend.sub)}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Largest Tables</h3>
          <span class="eyebrow">Live from Postgres · biggest first</span>
        </div>
        <div class="section-body">
          <div class="tablewrap">
            <table class="datatable">
              <thead><tr><th>Schema</th><th>Table</th><th>Size</th></tr></thead>
              <tbody>${topRowsHtml}</tbody>
            </table>
          </div>
          <div class="settings-note" style="margin-top:12px;">
            <code>auth.*</code>, <code>storage.*</code> and <code>realtime.*</code> are Supabase's own tables —
            they still count toward the database quota. <code>public.*</code> are this app's tables.
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Company Activity &amp; Usage</h3>
          <span class="eyebrow">24-hour rolling window · silent companies first</span>
        </div>
        <div class="section-body">
          <div class="tablewrap">
            <table class="datatable">
              <thead><tr>
                <th>Company</th><th>Activity (24h)</th><th>Last sign-in</th>
                <th>Data changed</th><th>Last upload</th><th>Storage</th><th>Files</th>
              </tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
          <div class="settings-note" style="margin-top:12px;">
            "Last sign-in" only means a staff member signed in successfully — it is not proof they use the system.
            Every figure is computed live from Supabase each time this page opens; nothing is stored on the server.
            The storage trend above is kept only in this browser.
          </div>
        </div>
      </div>
    `;

    const btn = root.querySelector('#shRefresh');
    if (btn) btn.addEventListener('click', load);
  }

  async function load(){
    if (busy) return;
    busy = true;
    root.innerHTML = '<div class="focc-sh-empty">Loading system health…</div>';
    const t0 = performance.now();
    try{
      const res = await adminInvoke('system_health');
      render(res && res.data ? res.data : {}, Math.round(performance.now() - t0));
    }catch(err){
      root.innerHTML = '<div class="settings-note" style="margin-top:0;color:var(--red);">'
        + 'Failed to load system health: ' + escapeHtml(String(err && err.message || err)) + '</div>';
    }
    busy = false;
  }

  await load();
  return wrap;
}

/* =========================================================================
   MODULE SKELETON PAGES
   Structure/layout ONLY for upcoming modules — no business logic, no
   API calls, no data loading.
   ========================================================================= */

function skelSvg(paths, size){
  const s = size || 30;
  return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const SKEL_ICON_EMPTY = skelSvg('<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 9h18"></path><path d="M8 14h8"></path>', 34);
const SKEL_ICON_CHART = skelSvg('<path d="M4 19V9"></path><path d="M10 19V5"></path><path d="M16 19v-7"></path><path d="M20 19H4"></path>', 32);

const SKELETON_MODULES = {
  tipperOpsDashboard: {
    title:'Tipper Operations Dashboard', crumb:'Tipper Operations',
    description:'Fleet-wide view of tipper truck activity, utilization and daily trip performance.',
    kpis:[
      {label:'Active Tippers', note:'On the road today'},
      {label:'Trips Completed', note:'Today'},
      {label:'Fleet Utilization', note:'Active vs total fleet'},
      {label:'Avg Turnaround Time', note:'Load to unload'},
    ],
    statusOptions:['Loading','In Transit','Unloading','Idle','Under Maintenance'],
    tableColumns:['Date','Truck No.','Driver','Route','Load (MT)','Status'],
    chartLabel:'Trips Trend (Last 30 Days)',
  },
  containerOpsDashboard: {
    title:'Container Operations Dashboard', crumb:'Container Operations',
    description:'Container movement, yard utilization and vessel schedule overview.',
    kpis:[
      {label:'Active Containers', note:'Currently in yard'},
      {label:'TEU Moved', note:'Today'},
      {label:'Yard Utilization', note:'Occupied vs capacity'},
      {label:'On-Time Delivery Rate', note:'Last 30 days'},
    ],
    statusOptions:['In Yard','Loading','In Transit','Delivered','Empty Return'],
    tableColumns:['Date','Container No.','Vessel','Yard Location','ETA','Status'],
    chartLabel:'TEU Volume Trend (Last 30 Days)',
  },
  tankerOpsDashboard: {
    title:'Tanker Operations Dashboard', crumb:'Tanker Operations',
    description:'Tanker fleet activity, product volumes and delivery status at a glance.',
    kpis:[
      {label:'Active Tankers', note:'On the road today'},
      {label:'Volume Delivered', note:'Litres, today'},
      {label:'Compartment Utilization', note:'Avg across fleet'},
      {label:'Safety Incidents', note:'This month'},
    ],
    statusOptions:['Loading','In Transit','Discharging','Idle','Under Maintenance'],
    tableColumns:['Date','Tanker No.','Product','Volume (L)','Route','Status'],
    chartLabel:'Volume Delivered Trend (Last 30 Days)',
  },
  logisticsDistributionDashboard: {
    title:'Logistics & Distribution Dashboard', crumb:'Logistics & Distribution',
    description:'Cross-fleet distribution performance, delivery volumes and cost overview.',
    kpis:[
      {label:'Total Deliveries', note:'This month'},
      {label:'On-Time Rate', note:'Last 30 days'},
      {label:'Fleet Utilization', note:'All vehicle types'},
      {label:'Distribution Cost', note:'This month'},
    ],
    statusOptions:['Scheduled','Dispatched','In Transit','Delivered','Delayed'],
    tableColumns:['Date','Order No.','Origin','Destination','Carrier','Status'],
    chartLabel:'Delivery Volume Trend (Last 30 Days)',
  },
  orderPlanning: {
    title:'Order Planning', crumb:'Planning',
    description:'Plan, schedule and allocate customer orders ahead of dispatch.',
    kpis:[
      {label:'Open Orders', note:'Awaiting allocation'},
      {label:'Scheduled Today', note:'Ready for dispatch'},
      {label:'Pending Allocation', note:'Needs vehicle/driver'},
      {label:'Fulfillment Rate', note:'Last 30 days'},
    ],
    statusOptions:['New','Scheduled','Allocated','Fulfilled','Cancelled'],
    tableColumns:['Order No.','Customer','Product','Qty','Requested Date','Status'],
  },
  routePlanning: {
    title:'Route Planning', crumb:'Planning',
    description:'Design and manage delivery routes, distances and vehicle assignments.',
    kpis:[
      {label:'Active Routes', note:'Currently in use'},
      {label:'Avg Distance', note:'Per route, km'},
      {label:'Avg Route Time', note:'Per route'},
      {label:'Optimization Savings', note:'This month'},
    ],
    statusOptions:['Draft','Active','Under Review','Archived'],
    tableColumns:['Route No.','Origin','Destination','Distance (km)','Assigned Vehicle','Status'],
    chartLabel:'Route Efficiency Overview',
  },
  deliveryPlanning: {
    title:'Delivery Planning', crumb:'Planning',
    description:'Coordinate delivery schedules, driver assignments and ETAs.',
    kpis:[
      {label:'Deliveries Planned', note:'Today'},
      {label:'Deliveries Completed', note:'Today'},
      {label:'Delayed Deliveries', note:'Today'},
      {label:'On-Time Rate', note:'Last 30 days'},
    ],
    statusOptions:['Planned','Dispatched','In Transit','Completed','Delayed'],
    tableColumns:['Delivery No.','Order No.','Driver','Vehicle','ETA','Status'],
  },
  podManagement: {
    title:'POD Management', crumb:'Delivery',
    description:'Track, verify and manage proof-of-delivery documents.',
    kpis:[
      {label:'Total PODs', note:'This month'},
      {label:'Pending Verification', note:'Awaiting review'},
      {label:'Verified PODs', note:'This month'},
      {label:'Rejected PODs', note:'This month'},
    ],
    statusOptions:['Pending','Verified','Rejected','Resubmitted'],
    tableColumns:['POD No.','Order No.','Delivery Date','Received By','Verification Status'],
  },
  jisa: {
    title:'JISA', crumb:'Safety & Compliance',
    description:'Job Inspection Safety Analysis records and review status.',
    kpis:[
      {label:'Total JISA Records', note:'All time'},
      {label:'Completed', note:'This month'},
      {label:'Pending Review', note:'Awaiting sign-off'},
      {label:'Overdue', note:'Past due date'},
    ],
    statusOptions:['Draft','Pending Review','Approved','Overdue'],
    tableColumns:['JISA No.','Task / Job','Location','Assessed By','Date','Status'],
  },
  hirarc: {
    title:'HIRARC', crumb:'Safety & Compliance',
    description:'Hazard Identification, Risk Assessment & Risk Control register.',
    kpis:[
      {label:'Total Assessments', note:'All time'},
      {label:'High Risk Items', note:'Currently open'},
      {label:'Under Review', note:'Awaiting sign-off'},
      {label:'Closed', note:'This month'},
    ],
    statusOptions:['Open','Under Review','Control In Place','Closed'],
    tableColumns:['HIRARC No.','Activity','Hazard','Risk Rating','Control Measures','Status'],
  },
  apadKnowledgeCenter: {
    title:'APAD Knowledge Center', crumb:'Knowledge Center',
    description:'Central library for APAD procedures, guidelines and reference documents.',
    kpis:[
      {label:'Total Documents', note:'Published'},
      {label:'Categories', note:'Active'},
      {label:'Recently Updated', note:'Last 30 days'},
      {label:'Pending Approval', note:'Awaiting review'},
    ],
    statusOptions:['Published','Draft','Under Review','Archived'],
    tableColumns:['Document Title','Category','Version','Last Updated','Status'],
    searchPlaceholder:'Search documents...',
    dateLabel:'Last Updated',
  },
  invoiceManagement: {
    title:'Invoice Management', crumb:'Finance',
    description:'Track invoices, payment status and outstanding balances.',
    kpis:[
      {label:'Total Invoices', note:'This month'},
      {label:'Outstanding Amount', note:'Unpaid'},
      {label:'Overdue Invoices', note:'Past due date'},
      {label:'Paid This Month', note:'Settled'},
    ],
    statusOptions:['Draft','Sent','Paid','Overdue','Cancelled'],
    tableColumns:['Invoice No.','Vendor / Customer','Amount','Due Date','Status'],
  },
  vendorManagement: {
    title:'Vendor Management', crumb:'Finance',
    description:'Manage vendor records, onboarding status and performance.',
    kpis:[
      {label:'Total Vendors', note:'Registered'},
      {label:'Active Vendors', note:'Currently engaged'},
      {label:'Pending Approval', note:'Awaiting onboarding'},
      {label:'Avg Rating', note:'Last 12 months'},
    ],
    statusOptions:['Active','Pending Approval','Suspended','Inactive'],
    tableColumns:['Vendor Name','Category','Contact','Onboarded Date','Status'],
    searchPlaceholder:'Search vendors...',
    dateLabel:'Onboarded Date',
  },
  pettyCash: {
    title:'Petty Cash', crumb:'Finance',
    description:'Track petty cash claims, approvals and reimbursements.',
    kpis:[
      {label:'Petty Cash Balance', note:'Current'},
      {label:'Claims This Month', note:'Submitted'},
      {label:'Pending Approval', note:'Awaiting sign-off'},
      {label:'Reimbursed Amount', note:'This month'},
    ],
    statusOptions:['Submitted','Pending Approval','Approved','Reimbursed','Rejected'],
    tableColumns:['Date','Requested By','Description','Amount','Status'],
    searchPlaceholder:'Search claims...',
  },
  tipperOperationKPI: {
    title: 'Tipper Operation KPI',
    crumb: 'Tipper Operations',
    description: 'Operational performance overview for the tipper fleet.',
    kpis: [
      { label: 'Daily Trips', note: 'Today' },
      { label: 'Fleet Running', note: 'Active now' },
      { label: 'Fleet Availability', note: 'Available vs total' },
      { label: 'Revenue', note: 'Today' },
    ],
    statusOptions: ['Running','Idle','Under Maintenance','Off Duty'],
    tableColumns: ['Date','Vehicle No','Driver','Destination','Trips','Tonnage','Revenue'],
    chartLabel: 'Tipper Trips & Revenue Trend',
  },
  tipperDriverKPI: {
    title: 'Tipper Driver KPI',
    crumb: 'Tipper Operations',
    description: 'Driver performance monitoring for tipper operations.',
    kpis: [
      { label: 'Driver Attendance', note: 'Today' },
      { label: 'Trips Completed', note: 'Today' },
      { label: 'Revenue Generated', note: 'Today' },
      { label: 'Safety Score', note: '30 Days' },
    ],
    statusOptions: ['Present','Absent','On Leave','Suspended'],
    tableColumns: ['Driver','Attendance','Trips','Revenue','Violations','KPI Score'],
    chartLabel: 'Driver Performance Trend',
  },
  containerOperationKPI: {
    title: 'Container Operation KPI',
    crumb: 'Container Operations',
    description: 'Operational performance overview for container operations.',
    kpis: [
      { label: 'Containers Delivered', note: 'Today' },
      { label: 'Fleet Running', note: 'Active now' },
      { label: 'Fleet Availability', note: 'Available vs total' },
      { label: 'Revenue', note: 'Today' },
    ],
    statusOptions: ['Running','Idle','Under Maintenance','Off Duty'],
    tableColumns: ['Date','Vehicle','Driver','Customer','Containers','Revenue'],
    chartLabel: 'Container Deliveries Trend',
  },
  containerDriverKPI: {
    title: 'Container Driver KPI',
    crumb: 'Container Operations',
    description: 'Driver performance monitoring for container operations.',
    kpis: [
      { label: 'Attendance', note: 'Today' },
      { label: 'Containers Delivered', note: 'Today' },
      { label: 'Revenue', note: 'Today' },
      { label: 'Safety Score', note: '30 Days' },
    ],
    statusOptions: ['Present','Absent','On Leave','Suspended'],
    tableColumns: ['Driver','Attendance','Deliveries','Revenue','Violations'],
    chartLabel: 'Driver Performance Trend',
  },
  tankerOperationKPI: {
    title: 'Tanker Operation KPI',
    crumb: 'Tanker Operations',
    description: 'Operational performance overview for tanker operations.',
    kpis: [
      { label: 'Loads Delivered', note: 'Today' },
      { label: 'Fleet Running', note: 'Active now' },
      { label: 'Fleet Availability', note: 'Available vs total' },
      { label: 'Revenue', note: 'Today' },
    ],
    statusOptions: ['Running','Idle','Under Maintenance','Off Duty'],
    tableColumns: ['Date','Vehicle','Driver','Product','Destination','Loads','Revenue'],
    chartLabel: 'Tanker Loads Trend',
  },
  tankerDriverKPI: {
    title: 'Tanker Driver KPI',
    crumb: 'Tanker Operations',
    description: 'Driver performance monitoring for tanker operations.',
    kpis: [
      { label: 'Attendance', note: 'Today' },
      { label: 'Loads Delivered', note: 'Today' },
      { label: 'Revenue', note: 'Today' },
      { label: 'Safety Score', note: '30 Days' },
    ],
    statusOptions: ['Present','Absent','On Leave','Suspended'],
    tableColumns: ['Driver','Attendance','Loads','Revenue','Violations'],
    chartLabel: 'Driver Performance Trend',
  },
};

function renderModuleSkeleton(moduleKey){
  const cfg = SKELETON_MODULES[moduleKey];
  const searchPlaceholder = cfg.searchPlaceholder || 'Search records...';
  const dateLabel = cfg.dateLabel || 'Date Range';

  const wrap = document.createElement('div');
  wrap.className = 'skel-page';
  wrap.innerHTML = `
    <div class="skel-intro">
      <div class="skel-intro-text">
        <div class="skel-crumbs">
          <span>${cfg.crumb}</span><span class="sep">/</span><span class="current">${cfg.title}</span>
        </div>
        <p>${cfg.description}</p>
      </div>
      <span class="skel-badge">Skeleton &middot; In Development</span>
    </div>

    <div class="kpirow">
      ${cfg.kpis.map(k => kpiCard({label:k.label, value:'&mdash;', note:k.note})).join('')}
    </div>

    <div class="section">
      <div class="section-head">
        <h3>Filters</h3>
        <span class="spacer"></span>
      </div>
      <div class="section-body">
        <div class="skel-filterbar">
          <input class="searchbox" type="text" placeholder="${searchPlaceholder}" disabled>
          <input class="skel-date" type="date" aria-label="${dateLabel}" disabled>
          <select class="skel-select" aria-label="Status" disabled>
            <option>All Statuses</option>
            ${cfg.statusOptions.map(s => `<option>${s}</option>`).join('')}
          </select>
          <button class="btn" disabled>Apply Filters</button>
        </div>
      </div>
    </div>

    <div class="skel-main-grid">
      <div class="section">
        <div class="section-head">
          <h3>Records</h3>
          <span class="eyebrow">0 records</span>
        </div>
        <div class="section-body skel-table-placeholder">
          <div class="tablewrap">
            <table class="datatable">
              <thead><tr>${cfg.tableColumns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
              <tbody></tbody>
            </table>
          </div>
          <div class="skel-empty">
            ${SKEL_ICON_EMPTY}
            <div class="skel-empty-title">No Data Available</div>
            <div class="skel-empty-sub">Records will appear here once this module is connected to live data.</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Overview</h3>
        </div>
        <div class="section-body">
          <div class="skel-chart-placeholder">
            ${SKEL_ICON_CHART}
            <span>${cfg.chartLabel || 'Chart placeholder'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  return wrap;
}