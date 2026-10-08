/* =========================================================================
   FOCC — 17-depot.js
   Depot Overview — main dashboard dengan KPI + yard grid + side panel.
   =========================================================================
   Phase 4.0 — RENDER sahaja. Interaction datang Phase 5.
   ========================================================================= */

/* ============================================================
   LOAD DATA
============================================================= */

async function depotLoadLayout(){
  try{
    const rows = await getData('depotLayout');
    if (Array.isArray(rows) && rows.length) return rows[0];
  }catch(e){
    console.warn('depotLoadLayout failed:', e);
  }
  return {
    layoutId: 'layout-default',
    depotName: 'My Depot',
    blocks: [],
  };
}

async function depotLoadContainers(){
  try{
    const rows = await getData('depotContainers');
    return Array.isArray(rows) ? rows : [];
  }catch(e){
    console.warn('depotLoadContainers failed:', e);
    return [];
  }
}

/* ============================================================
   HELPERS
============================================================= */

// Generate slot no: block A, row 1, col 5 → "A-05"
function depotSlotNo(blockName, row, col){
  const block = String(blockName || '').toUpperCase();
  const rowLetter = String.fromCharCode(65 + (row - 1)); // A, B, C...
  const colNum = String(col).padStart(2, '0');
  return rowLetter + '-' + colNum;
}

// Alt: slot no sekarang guna format "A-01" (block + colNum)
// Kita prefer format dengan row letter untuk konsisten dengan design
function depotSlotNoFromIndex(blockName, index, cols){
  const row = Math.floor(index / cols) + 1;
  const col = (index % cols) + 1;
  return depotSlotNo(blockName, row, col);
}

// Berapa hari container duduk dalam yard
function depotDaysInYard(container){
  if (!container || !container.inDate) return 0;
  const inDate = new Date(container.inDate);
  if (isNaN(inDate.getTime())) return 0;
  const today = new Date();
  today.setHours(0,0,0,0);
  inDate.setHours(0,0,0,0);
  const diff = Math.floor((today - inDate) / 86400000);
  return diff >= 0 ? diff : 0;
}

// Warna untuk Days in Yard (dari DEPOT_DAYS_RANGES)
function depotDaysColor(days){
  const ranges = (typeof DEPOT_DAYS_RANGES !== 'undefined') ? DEPOT_DAYS_RANGES : [];
  for (const r of ranges){
    if (days >= r.min && days <= r.max) return r;
  }
  // Fallback
  return { color: '#3f9a6e', label: days + 'd' };
}

// Status badge HTML
function depotStatusBadge(status){
  const label = (typeof DEPOT_STATUS_LABELS !== 'undefined') ? (DEPOT_STATUS_LABELS[status] || status) : status;
  const cls = (typeof DEPOT_STATUS_BADGE !== 'undefined') ? (DEPOT_STATUS_BADGE[status] || 'neutral') : 'neutral';
  return `<span class="badge ${cls}">${escapeHtml(label)}</span>`;
}

// Sparkline SVG — data = array of numbers
function depotSparkline(data, color){
  if (!Array.isArray(data) || data.length < 2){
    data = [3, 5, 4, 6, 5, 7, 6, 8]; // dummy
  }
  const w = 140, h = 36, pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = (max - min) || 1;
  const stepX = (w - pad * 2) / (data.length - 1);

  const pts = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y];
  });

  const pathD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const areaD = pathD + ` L${(pad + (data.length - 1) * stepX).toFixed(1)} ${h - pad} L${pad} ${h - pad} Z`;
  const c = color || '#1aa39a';

  return `
    <svg class="depot-sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="sparkGrad-${c.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${c}" stop-opacity=".25"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#sparkGrad-${c.replace('#','')})" />
      <path d="${pathD}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

/* ============================================================
   RENDER — MAIN PAGE
============================================================= */

async function renderDepotOverview(){
  const wrap = document.createElement('div');
  wrap.className = 'depot-overview-page';

  let layout = await depotLoadLayout();
  let allContainers = await depotLoadContainers();

  // Kalau takde block, tunjuk empty state
  if (!layout.blocks || !layout.blocks.length){
    wrap.innerHTML = `
      <div class="section">
        <div class="section-body">
          <div class="skel-empty">
            <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <path d="M3 9h18M9 21V9"></path>
            </svg>
            <div class="skel-empty-title">No depot layout yet</div>
            <div class="skel-empty-sub">Go to <b>Depot Layout</b> to define your first block, then come back here.</div>
            <button class="btn primary" onclick="reloadToRoute('depotLayout')" style="margin-top:12px;">Open Depot Layout</button>
          </div>
        </div>
      </div>`;
    return wrap;
  }

  // State
  let activeBlockId = layout.blocks[0].blockId;
  let selectedContainerId = null;

  // Sort blocks by order
  const sortedBlocks = layout.blocks.slice().sort((a,b) => (a.order || 0) - (b.order || 0));

  // Non-departed containers sahaja untuk yard
  const activeContainers = allContainers.filter(c => c && !c.departed);
  const departedContainers = allContainers
    .filter(c => c && c.departed)
    .sort((a,b) => String(b.outDate || '').localeCompare(String(a.outDate || '')));

  // ============ KPI COMPUTATION ============
  function computeKPIs(){
    const total = activeContainers.length;
    const byStatus = { ok: 0, repairing: 0, damaged: 0 };
    activeContainers.forEach(c => {
      const s = String(c.status || 'ok');
      if (byStatus[s] !== undefined) byStatus[s]++;
    });

    // Departed today
    const today = new Date(); today.setHours(0,0,0,0);
    const departedToday = departedContainers.filter(c => {
      if (!c.outDate) return false;
      const d = new Date(c.outDate); d.setHours(0,0,0,0);
      return d.getTime() === today.getTime();
    }).length;

    return {
      total,
      inYard: total,
      departedToday,
      damaged: byStatus.damaged,
      ok: byStatus.ok,
      repairing: byStatus.repairing,
    };
  }

  const kpi = computeKPIs();

  // ============ RENDER FUNCTIONS ============

  function renderKPICards(){
    // Sparkline data — dummy trend (last 7 days)
    const sparkTotal = [kpi.total - 6, kpi.total - 4, kpi.total - 3, kpi.total - 5, kpi.total - 1, kpi.total - 2, kpi.total];
    const sparkYard = [kpi.inYard - 5, kpi.inYard - 3, kpi.inYard - 4, kpi.inYard - 2, kpi.inYard - 1, kpi.inYard - 3, kpi.inYard];
    const sparkDeparted = [Math.max(0, kpi.departedToday - 4), kpi.departedToday - 2, kpi.departedToday - 3, kpi.departedToday - 1, kpi.departedToday, kpi.departedToday - 2, kpi.departedToday];
    const sparkDamaged = [kpi.damaged + 2, kpi.damaged + 1, kpi.damaged + 2, kpi.damaged, kpi.damaged + 1, kpi.damaged, kpi.damaged];

    return `
      <div class="depot-kpi-grid">
        <div class="depot-kpi-card" data-accent="#1aa39a">
          <div class="depot-kpi-head">
            <div class="depot-kpi-icon" style="background:rgba(26,163,154,.12);color:#1aa39a;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            </div>
            <div class="depot-kpi-label">Total Containers</div>
          </div>
          <div class="depot-kpi-value">${kpi.total}</div>
          <div class="depot-kpi-sparkline">${depotSparkline(sparkTotal, '#1aa39a')}</div>
        </div>

        <div class="depot-kpi-card" data-accent="#1aa39a">
          <div class="depot-kpi-head">
            <div class="depot-kpi-icon" style="background:rgba(26,163,154,.12);color:#1aa39a;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            </div>
            <div class="depot-kpi-label">In Yard</div>
          </div>
          <div class="depot-kpi-value">${kpi.inYard}</div>
          <div class="depot-kpi-sparkline">${depotSparkline(sparkYard, '#1aa39a')}</div>
        </div>

        <div class="depot-kpi-card" data-accent="#e6a339">
          <div class="depot-kpi-head">
            <div class="depot-kpi-icon" style="background:rgba(230,163,57,.12);color:#e6a339;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="5" width="10" height="9" rx="1"/><path d="M11 8h4.5L20 12v2h-9z"/><circle cx="5" cy="17.5" r="1.8"/><circle cx="16" cy="17.5" r="1.8"/></svg>
            </div>
            <div class="depot-kpi-label">Departed Today</div>
          </div>
          <div class="depot-kpi-value">${kpi.departedToday}</div>
          <div class="depot-kpi-sparkline">${depotSparkline(sparkDeparted, '#e6a339')}</div>
        </div>

        <div class="depot-kpi-card is-danger" data-accent="#d1554a">
          <div class="depot-kpi-head">
            <div class="depot-kpi-icon" style="background:rgba(209,85,74,.12);color:#d1554a;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
            </div>
            <div class="depot-kpi-label">Damaged</div>
          </div>
          <div class="depot-kpi-value">${kpi.damaged}</div>
          <div class="depot-kpi-sparkline">${depotSparkline(sparkDamaged, '#d1554a')}</div>
        </div>
      </div>
    `;
  }

  function renderBlockTabs(){
    return `
      <div class="depot-tabs">
        ${sortedBlocks.map(b => {
          const totalSlots = (b.cols || 0) * (b.rows || 0);
          const used = activeContainers.filter(c => c.blockId === b.blockId).length;
          const isActive = b.blockId === activeBlockId;
          return `
            <button class="depot-tab${isActive ? ' is-active' : ''}" data-block-id="${b.blockId}">
              <span class="depot-tab-color" style="background:${b.color || '#1aa39a'};"></span>
              <span class="depot-tab-name">Block ${escapeHtml(b.name || '?')}</span>
              <span class="depot-tab-count">${used}/${totalSlots}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  function getActiveBlock(){
    return sortedBlocks.find(b => b.blockId === activeBlockId) || sortedBlocks[0];
  }

  function getContainerAtSlot(block, slotNo){
    return activeContainers.find(c =>
      c.blockId === block.blockId &&
      String(c.slotNo || '').toUpperCase() === slotNo.toUpperCase()
    );
  }

  function renderSlot(block, row, col){
    const slotNo = depotSlotNo(block.name, row, col);
    const container = getContainerAtSlot(block, slotNo);
    const isSelected = container && selectedContainerId === container.containerId;

    if (!container){
      return `
        <div class="depot-slot is-empty" data-slot="${slotNo}" data-block-id="${block.blockId}">
          <div class="depot-slot-no">${slotNo}</div>
          <div class="depot-slot-empty">—</div>
        </div>
      `;
    }

    const statusColor = (typeof DEPOT_STATUS_COLORS !== 'undefined' && DEPOT_STATUS_COLORS[container.status]) || '#3f9a6e';
    const statusLabel = (typeof DEPOT_STATUS_LABELS !== 'undefined' && DEPOT_STATUS_LABELS[container.status]) || container.status;

    return `
      <div class="depot-slot is-occupied${isSelected ? ' is-selected' : ''}" data-slot="${slotNo}" data-block-id="${block.blockId}" data-container-id="${container.containerId}" title="${escapeHtml(container.containerNo || '')} · ${escapeHtml(container.customer || '')}">
        <div class="depot-slot-no">${slotNo}</div>
        <div class="depot-slot-body">
          <span class="depot-slot-dot" style="background:${statusColor};"></span>
          <span class="depot-slot-no-container">${escapeHtml(container.containerNo || '-')}</span>
        </div>
        <div class="depot-slot-status" style="color:${statusColor};">${escapeHtml(statusLabel)}</div>
      </div>
    `;
  }

  function renderYardGrid(block){
    const cols = block.cols || 6;
    const rows = block.rows || 8;

    // Column header
    const headerCols = Array.from({ length: cols }, (_, i) => {
      const num = String(i + 1).padStart(2, '0');
      return `<div class="depot-grid-col-header">${num}</div>`;
    }).join('');

    // Rows
    const gridRows = [];
    for (let r = 1; r <= rows; r++){
      const rowLetter = String.fromCharCode(64 + r); // A, B, C...
      const cells = [];
      for (let c = 1; c <= cols; c++){
        cells.push(renderSlot(block, r, c));
      }
      gridRows.push(`
        <div class="depot-grid-row">
          <div class="depot-grid-row-header">${rowLetter}</div>
          ${cells.join('')}
        </div>
      `);
    }

    return `
      <div class="depot-grid-wrap">
        <div class="depot-grid-inner" style="--grid-cols:${cols};">
          <div class="depot-grid-header-row">
            <div class="depot-grid-row-header is-corner"></div>
            ${headerCols}
          </div>
          ${gridRows.join('')}
        </div>
      </div>
      <div class="depot-legend">
        <span class="depot-legend-item">
          <span class="depot-legend-dot" style="background:#3f9a6e;"></span>
          OK
        </span>
        <span class="depot-legend-item">
          <span class="depot-legend-dot" style="background:#e6a339;"></span>
          Repairing
        </span>
        <span class="depot-legend-item">
          <span class="depot-legend-dot" style="background:#d1554a;"></span>
          Damaged
        </span>
        <span class="depot-legend-item">
          <span class="depot-legend-dot is-empty"></span>
          Empty Slot
        </span>
      </div>
    `;
  }

  function renderBlockHeader(block){
    const totalSlots = (block.cols || 0) * (block.rows || 0);
    const used = activeContainers.filter(c => c.blockId === block.blockId).length;
    return `
      <div class="depot-block-head">
        <div class="depot-block-head-left">
          <div class="depot-block-pin">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <div class="depot-block-title">Block ${escapeHtml(block.name || '?')}</div>
            <div class="depot-block-sub">${block.cols} columns × ${block.rows} rows (${totalSlots} slots)</div>
          </div>
        </div>
        <div class="depot-block-head-right">
          <span class="depot-block-counter">${used}/${totalSlots} used</span>
        </div>
      </div>
    `;
  }

  function renderSidePanel(){
    if (!selectedContainerId){
      return `
        <div class="depot-side-panel is-empty">
          <div class="depot-side-panel-empty">
            <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
            <div class="depot-side-panel-empty-title">No container selected</div>
            <div class="depot-side-panel-empty-sub">Click any container on the yard grid to see its details here.</div>
          </div>
        </div>
      `;
    }

    const c = allContainers.find(x => x.containerId === selectedContainerId);
    if (!c){
      return `<div class="depot-side-panel is-empty"><div class="depot-side-panel-empty">Container not found.</div></div>`;
    }

    const statusColor = (typeof DEPOT_STATUS_COLORS !== 'undefined' && DEPOT_STATUS_COLORS[c.status]) || '#3f9a6e';
    const statusLabel = (typeof DEPOT_STATUS_LABELS !== 'undefined' && DEPOT_STATUS_LABELS[c.status]) || c.status;
    const days = depotDaysInYard(c);
    const daysR = depotDaysColor(days);

    const size = c.size || {};
    const sizeTxt = (size.l && size.w && size.h) ? `${size.l} × ${size.w} × ${size.h} m` : '-';
    const weightTxt = c.weight ? (Number(c.weight).toLocaleString() + ' kg') : '-';

    return `
      <div class="depot-side-panel">
        <div class="depot-side-panel-head">
          <div class="depot-side-panel-head-left">
            <div class="depot-side-panel-image">
              <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="6" width="18" height="12" rx="1"/><path d="M7 6v12M11 6v12M15 6v12"/>
              </svg>
            </div>
            <div>
              <div class="depot-side-panel-id">${escapeHtml(c.containerNo || '-')}</div>
              <div class="depot-side-panel-type">${escapeHtml(c.type || 'Container')}</div>
            </div>
          </div>
          <div class="depot-side-panel-status" style="background:${statusColor}1a;color:${statusColor};">
            <span class="depot-side-panel-status-dot" style="background:${statusColor};"></span>
            ${escapeHtml(statusLabel)}
          </div>
        </div>

        <div class="depot-side-panel-section">
          <div class="depot-side-panel-section-title">Details</div>
          <div class="depot-side-panel-rows">
            <div class="depot-side-panel-row">
              <span class="depot-side-panel-row-k">Container No.</span>
              <span class="depot-side-panel-row-v">${escapeHtml(c.containerNo || '-')}</span>
            </div>
            <div class="depot-side-panel-row">
              <span class="depot-side-panel-row-k">Customer</span>
              <span class="depot-side-panel-row-v">${escapeHtml(c.customer || '-')}</span>
            </div>
            <div class="depot-side-panel-row">
              <span class="depot-side-panel-row-k">Type</span>
              <span class="depot-side-panel-row-v">${escapeHtml(c.type || '-')}</span>
            </div>
            <div class="depot-side-panel-row">
              <span class="depot-side-panel-row-k">Size (L × W × H)</span>
              <span class="depot-side-panel-row-v">${escapeHtml(sizeTxt)}</span>
            </div>
            <div class="depot-side-panel-row">
              <span class="depot-side-panel-row-k">Weight</span>
              <span class="depot-side-panel-row-v">${escapeHtml(weightTxt)}</span>
            </div>
          </div>
        </div>

        <div class="depot-side-panel-section">
          <div class="depot-side-panel-section-title">Location</div>
          <div class="depot-side-panel-rows">
            <div class="depot-side-panel-row">
              <span class="depot-side-panel-row-k">Block</span>
              <span class="depot-side-panel-row-v">${escapeHtml(c.blockName || '-')}</span>
            </div>
            <div class="depot-side-panel-row">
              <span class="depot-side-panel-row-k">Slot</span>
              <span class="depot-side-panel-row-v">${escapeHtml(c.slotNo || '-')}</span>
            </div>
            <div class="depot-side-panel-row">
              <span class="depot-side-panel-row-k">Stack</span>
              <span class="depot-side-panel-row-v">${escapeHtml(String(c.stackLevel || 1))}</span>
            </div>
            <div class="depot-side-panel-row">
              <span class="depot-side-panel-row-k">Days in Yard</span>
              <span class="depot-side-panel-row-v">
                <span class="depot-days-badge" style="background:${daysR.color}1a;color:${daysR.color};">${escapeHtml(daysR.label)}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="depot-side-panel-actions">
          <button class="btn primary" data-action="change-status">Change Status</button>
          <button class="btn" data-action="move-slot">Move Slot</button>
          <button class="btn" data-action="set-out">Set OUT</button>
          <button class="btn" data-action="view-detail">View Full Detail</button>
        </div>
      </div>
    `;
  }

  function renderDepartedTable(){
    const list = departedContainers.slice(0, 20);
    if (!list.length){
      return `
        <div class="depot-departed-empty">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <div>No departed containers yet</div>
        </div>
      `;
    }

    return `
      <div class="tablewrap depot-departed-table">
        <table class="datatable">
          <thead>
            <tr>
              <th>#</th>
              <th>Container No.</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Weight</th>
              <th>Departed At</th>
              <th>Days in Yard</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((c, i) => {
              const days = depotDaysInYard(c);
              const daysR = depotDaysColor(days);
              const statusColor = (typeof DEPOT_STATUS_COLORS !== 'undefined' && DEPOT_STATUS_COLORS[c.status]) || '#3f9a6e';
              const statusLabel = (typeof DEPOT_STATUS_LABELS !== 'undefined' && DEPOT_STATUS_LABELS[c.status]) || c.status;
              const outTxt = c.outDate ? new Date(c.outDate).toLocaleString('en-GB', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : '-';
              return `
                <tr>
                  <td>${i + 1}</td>
                  <td><b>${escapeHtml(c.containerNo || '-')}</b></td>
                  <td>${escapeHtml(c.customer || '-')}</td>
                  <td>${escapeHtml(c.type || '-')}</td>
                  <td>${c.weight ? Number(c.weight).toLocaleString() + ' kg' : '-'}</td>
                  <td>${escapeHtml(outTxt)}</td>
                  <td><span class="depot-days-badge" style="background:${daysR.color}1a;color:${daysR.color};">${escapeHtml(daysR.label)}</span></td>
                  <td><span class="badge good" style="background:${statusColor}1a;color:${statusColor};">Departed</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ============ MAIN PAINT ============

  function paint(){
    const block = getActiveBlock();

    wrap.innerHTML = `
      <div class="depot-overview-header">
        <div class="depot-overview-header-left">
          <div class="depot-overview-title">${escapeHtml(layout.depotName || 'My Depot')}</div>
          <div class="depot-overview-sub">${sortedBlocks.length} block${sortedBlocks.length === 1 ? '' : 's'} · ${activeContainers.length} active container${activeContainers.length === 1 ? '' : 's'}</div>
        </div>
        <div class="depot-overview-header-right">
          <button class="btn" onclick="reloadToRoute('depotLayout')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
            Edit Layout
          </button>
        </div>
      </div>

      ${renderKPICards()}

      ${renderBlockTabs()}

      <div class="depot-main-grid">
        <div class="depot-grid-card">
          ${renderBlockHeader(block)}
          ${renderYardGrid(block)}
        </div>
        ${renderSidePanel()}
      </div>

      <div class="section depot-departed-section">
        <div class="section-head">
          <h3>Departed Today</h3>
          <span class="eyebrow">${departedContainers.length} total departed</span>
          <div class="spacer"></div>
          <span class="depot-departed-sub">Showing last 20</span>
        </div>
        <div class="section-body">
          ${renderDepartedTable()}
        </div>
      </div>
    `;

    // Wire block tabs
    wrap.querySelectorAll('.depot-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeBlockId = btn.dataset.blockId;
        paint();
      });
    });

    // Wire slot clicks
    wrap.querySelectorAll('.depot-slot.is-occupied').forEach(el => {
      el.addEventListener('click', () => {
        selectedContainerId = el.dataset.containerId;
        paint();
      });
    });

    // Click empty slot → clear selection
    wrap.querySelectorAll('.depot-slot.is-empty').forEach(el => {
      el.addEventListener('click', () => {
        selectedContainerId = null;
        paint();
      });
    });

    // Side panel action buttons — Phase 5 (belum implement)
    wrap.querySelectorAll('.depot-side-panel-actions .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        alert('Coming in Phase 5: ' + action);
      });
    });
  }

  paint();
  return wrap;
}