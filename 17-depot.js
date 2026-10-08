/* =========================================================================
   FOCC — 17-depot.js
   Depot Overview — main dashboard + full interactions.
   =========================================================================
   Phase 6 — Drag & Drop / Export CSV / Animation Polish
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

function depotSlotNo(blockName, row, col){
  const block = String(blockName || '').toUpperCase();
  const rowLetter = String.fromCharCode(65 + (row - 1));
  const colNum = String(col).padStart(2, '0');
  return rowLetter + '-' + colNum;
}

function depotParseSlotNo(slotNo){
  const m = /^([A-Z])-(\d+)$/i.exec(String(slotNo || '').trim());
  if (!m) return null;
  return { row: m[1].toUpperCase().charCodeAt(0) - 64, col: parseInt(m[2], 10) };
}

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

function depotDaysColor(days){
  const ranges = (typeof DEPOT_DAYS_RANGES !== 'undefined') ? DEPOT_DAYS_RANGES : [];
  for (const r of ranges){
    if (days >= r.min && days <= r.max) return r;
  }
  return { color: '#3f9a6e', label: days + 'd' };
}

function depotStatusBadge(status){
  const label = (typeof DEPOT_STATUS_LABELS !== 'undefined') ? (DEPOT_STATUS_LABELS[status] || status) : status;
  const cls = (typeof DEPOT_STATUS_BADGE !== 'undefined') ? (DEPOT_STATUS_BADGE[status] || 'neutral') : 'neutral';
  return `<span class="badge ${cls}">${escapeHtml(label)}</span>`;
}

function depotSparkline(data, color){
  if (!Array.isArray(data) || data.length < 2){
    data = [3, 5, 4, 6, 5, 7, 6, 8];
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

function depotGenId(){
  return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

/* ============================================================
   SAVE OPERATIONS
============================================================= */

async function depotSaveAll(containers){
  DATA_CACHE.depotContainers = containers;
  await persist('depotContainers');
}

/* ============================================================
   EXPORT CSV
============================================================= */

function depotExportCSV(containers, layout, filterLabel){
  const headers = [
    'Container No','Type','Status','Block','Slot','Stack',
    'Customer','Job No','Vessel','Weight (kg)',
    'In Date','Out Date','Departed',
    'Days in Yard','Remarks','Created By'
  ];

  const rows = containers.map(c => {
    const days = depotDaysInYard(c);
    const inTxt = c.inDate ? new Date(c.inDate).toISOString().slice(0,10) : '';
    const outTxt = c.outDate ? new Date(c.outDate).toISOString().slice(0,10) : '';
    return [
      c.containerNo || '',
      c.type || '',
      c.status || '',
      c.blockName || '',
      c.slotNo || '',
      c.stackLevel || 1,
      c.customer || '',
      c.jobNo || '',
      c.vessel || '',
      c.weight || '',
      inTxt,
      outTxt,
      c.departed ? 'Yes' : 'No',
      days,
      c.remarks || '',
      c.createdBy || '',
    ];
  });

  const q = v => {
    const s = String(v == null ? '' : v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')){
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const lines = [
    '# FOCC Depot Export',
    `# Depot: ${layout.depotName || 'My Depot'}`,
    `# Filter: ${filterLabel || 'All'}`,
    `# Exported: ${new Date().toLocaleString('en-GB')}`,
    `# Total: ${rows.length} container(s)`,
    '',
    headers.map(q).join(','),
  ];
  rows.forEach(r => lines.push(r.map(q).join(',')));

  const csv = lines.join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().slice(0,10);
  const safe = String(layout.depotName || 'Depot').replace(/[^\w\-]+/g, '-');
  a.href = url;
  a.download = `FOCC-Depot-${safe}-${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ============================================================
   MODAL HELPERS (shared)
============================================================= */

function depotModalWrap(html){
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.classList.remove('opkpi-modal', 'user-modal', 'bugreport-modal');
  box.innerHTML = html;
  overlay.classList.add('show');
  return box;
}

function depotCloseModal(){
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('show');
}

/* ============================================================
   MODAL — Add Container
============================================================= */

function openDepotAddContainer(block, preslotNo, onSubmit){
  const slotNo = preslotNo || '';

  const html = `
    <h4>Add Container</h4>
    <div class="notice notice-info" style="margin-bottom:14px;">
      Slot: <strong>${escapeHtml(slotNo || '(choose below)')}</strong> · Block <strong>${escapeHtml(block.name || '?')}</strong>
    </div>
    <div class="formgrid">
      <div class="formfield">
        <label>Container No. *</label>
        <input type="text" id="dcContainerNo" placeholder="e.g. MSKU1234567" maxlength="15" style="text-transform:uppercase;" autocomplete="off">
      </div>
      <div class="formfield">
        <label>Type *</label>
        <select id="dcType">
          <option value="20ft Standard">20ft Standard</option>
          <option value="40ft Standard">40ft Standard</option>
          <option value="40ft HC">40ft HC</option>
          <option value="45ft">45ft</option>
        </select>
      </div>
      <div class="formfield">
        <label>Customer</label>
        <input type="text" id="dcCustomer" placeholder="e.g. Tiong Nam Logistics" autocomplete="off">
      </div>
      <div class="formfield">
        <label>Job No.</label>
        <input type="text" id="dcJobNo" placeholder="e.g. JOB-2026-001" autocomplete="off">
      </div>
      <div class="formfield">
        <label>Vessel</label>
        <input type="text" id="dcVessel" placeholder="e.g. MV EVER GIVEN" autocomplete="off">
      </div>
      <div class="formfield">
        <label>Weight (kg)</label>
        <input type="number" id="dcWeight" step="any" placeholder="e.g. 2400">
      </div>
      <div class="formfield">
        <label>Status</label>
        <select id="dcStatus">
          <option value="ok">OK</option>
          <option value="repairing">Repairing</option>
          <option value="damaged">Damaged</option>
        </select>
      </div>
      <div class="formfield">
        <label>Slot *</label>
        <input type="text" id="dcSlot" placeholder="e.g. A-05" value="${escapeHtml(slotNo)}" autocomplete="off" style="text-transform:uppercase;">
      </div>
      <div class="formfield full">
        <label>Remarks</label>
        <input type="text" id="dcRemarks" placeholder="Optional note" autocomplete="off">
      </div>
    </div>
    <div class="settings-note" id="dcError" style="display:none;color:var(--red);"></div>
    <div class="modalfoot">
      <button class="btn" id="dcCancel">Cancel</button>
      <button class="btn primary" id="dcSave">Add Container</button>
    </div>`;

  const box = depotModalWrap(html);
  const containerNoInput = box.querySelector('#dcContainerNo');
  setTimeout(() => containerNoInput && containerNoInput.focus(), 50);

  containerNoInput.addEventListener('input', () => {
    containerNoInput.value = containerNoInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
  const slotInput = box.querySelector('#dcSlot');
  slotInput.addEventListener('input', () => {
    slotInput.value = slotInput.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  });

  box.querySelector('#dcCancel').onclick = depotCloseModal;
  box.querySelector('#dcSave').onclick = async () => {
    const errEl = box.querySelector('#dcError');
    const containerNo = box.querySelector('#dcContainerNo').value.trim().toUpperCase();
    const type = box.querySelector('#dcType').value;
    const customer = box.querySelector('#dcCustomer').value.trim();
    const jobNo = box.querySelector('#dcJobNo').value.trim();
    const vessel = box.querySelector('#dcVessel').value.trim();
    const weight = box.querySelector('#dcWeight').value;
    const status = box.querySelector('#dcStatus').value;
    const slot = box.querySelector('#dcSlot').value.trim().toUpperCase();
    const remarks = box.querySelector('#dcRemarks').value.trim();

    if (!containerNo){ errEl.style.display='block'; errEl.textContent='Container No. is required.'; return; }
    if (!slot){ errEl.style.display='block'; errEl.textContent='Slot is required.'; return; }
    const parsed = depotParseSlotNo(slot);
    if (!parsed){ errEl.style.display='block'; errEl.textContent='Slot format must be like A-05.'; return; }
    if (parsed.row < 1 || parsed.row > (block.rows || 30)){ errEl.style.display='block'; errEl.textContent='Slot row is out of range.'; return; }
    if (parsed.col < 1 || parsed.col > (block.cols || 20)){ errEl.style.display='block'; errEl.textContent='Slot column is out of range.'; return; }

    const payload = {
      containerId: depotGenId(),
      containerNo, type, customer, jobNo, vessel,
      weight: weight ? parseFloat(weight) : 0,
      status, slotNo: slot, stackLevel: 1,
      blockId: block.blockId,
      blockName: block.name,
      inDate: new Date().toISOString(),
      outDate: '', departed: false,
      remarks,
      createdBy: getSessionEmail() || '',
      createdAt: new Date().toISOString(),
    };
    errEl.style.display = 'none';
    depotCloseModal();
    if (onSubmit) await onSubmit(payload);
  };
}

/* ============================================================
   MODAL — Change Status
============================================================= */

function openDepotChangeStatus(container, onSubmit){
  const html = `
    <h4>Change Status</h4>
    <div class="notice notice-info" style="margin-bottom:14px;">
      Container: <strong>${escapeHtml(container.containerNo || '-')}</strong>
    </div>
    <div class="depot-status-picker">
      <label class="depot-status-option ${container.status==='ok'?'is-active':''}">
        <input type="radio" name="dcStatus" value="ok" ${container.status==='ok'?'checked':''}>
        <span class="depot-status-option-dot" style="background:#3f9a6e;"></span>
        <div class="depot-status-option-body"><b>OK</b><small>Container in good condition, ready for use.</small></div>
      </label>
      <label class="depot-status-option ${container.status==='repairing'?'is-active':''}">
        <input type="radio" name="dcStatus" value="repairing" ${container.status==='repairing'?'checked':''}>
        <span class="depot-status-option-dot" style="background:#e6a339;"></span>
        <div class="depot-status-option-body"><b>Repairing</b><small>Under repair, not available.</small></div>
      </label>
      <label class="depot-status-option ${container.status==='damaged'?'is-active':''}">
        <input type="radio" name="dcStatus" value="damaged" ${container.status==='damaged'?'checked':''}>
        <span class="depot-status-option-dot" style="background:#d1554a;"></span>
        <div class="depot-status-option-body"><b>Damaged</b><small>Broken, needs assessment.</small></div>
      </label>
    </div>
    <div class="formfield full" style="margin-top:14px;">
      <label>Note (optional)</label>
      <input type="text" id="dcStatusNote" placeholder="e.g. dent on left side" value="${escapeHtml(container.statusNote || '')}" autocomplete="off">
    </div>
    <div class="modalfoot">
      <button class="btn" id="csCancel">Cancel</button>
      <button class="btn primary" id="csSave">Save Status</button>
    </div>`;

  const box = depotModalWrap(html);
  box.querySelectorAll('.depot-status-option').forEach(el => {
    el.addEventListener('click', () => {
      box.querySelectorAll('.depot-status-option').forEach(x => x.classList.remove('is-active'));
      el.classList.add('is-active');
      el.querySelector('input[type=radio]').checked = true;
    });
  });
  box.querySelector('#csCancel').onclick = depotCloseModal;
  box.querySelector('#csSave').onclick = async () => {
    const sel = box.querySelector('input[name="dcStatus"]:checked');
    const status = sel ? sel.value : container.status;
    const note = box.querySelector('#dcStatusNote').value.trim();
    depotCloseModal();
    if (onSubmit) await onSubmit({ status, statusNote: note });
  };
}

/* ============================================================
   MODAL — Set OUT
============================================================= */

function openDepotSetOut(container, onSubmit){
  const todayStr = toISODateLocal(new Date());
  const html = `
    <h4>Set Container OUT</h4>
    <div class="notice notice-warning" style="margin-bottom:14px;">
      Mark <strong>${escapeHtml(container.containerNo || '-')}</strong> as <strong>departed</strong>? Slot will become empty.
    </div>
    <div class="formgrid">
      <div class="formfield">
        <label>Out Date *</label>
        <input type="date" id="dcOutDate" value="${todayStr}">
      </div>
      <div class="formfield">
        <label>Out Time</label>
        <input type="time" id="dcOutTime" value="${new Date().toTimeString().slice(0,5)}">
      </div>
      <div class="formfield full">
        <label>Remarks</label>
        <input type="text" id="dcOutRemarks" placeholder="e.g. Delivered to Port Klang" autocomplete="off">
      </div>
    </div>
    <div class="modalfoot">
      <button class="btn" id="soCancel">Cancel</button>
      <button class="btn primary" id="soSave">Confirm OUT</button>
    </div>`;

  const box = depotModalWrap(html);
  box.querySelector('#soCancel').onclick = depotCloseModal;
  box.querySelector('#soSave').onclick = async () => {
    const date = box.querySelector('#dcOutDate').value;
    const time = box.querySelector('#dcOutTime').value || '00:00';
    const remarks = box.querySelector('#dcOutRemarks').value.trim();
    if (!date){ alert('Out Date is required.'); return; }
    const outDate = new Date(`${date}T${time}:00`).toISOString();
    depotCloseModal();
    if (onSubmit) await onSubmit({ outDate, outRemarks: remarks });
  };
}

/* ============================================================
   MODAL — Move Slot
============================================================= */

function openDepotMoveSlot(container, layout, allContainers, onSubmit){
  const blocks = (layout.blocks || []).slice().sort((a,b) => (a.order||0) - (b.order||0));
  const blockOpts = blocks.map(b =>
    `<option value="${b.blockId}" ${b.blockId === container.blockId ? 'selected' : ''}>Block ${escapeHtml(b.name || '?')}</option>`
  ).join('');

  const html = `
    <h4>Move Container to Another Slot</h4>
    <div class="notice notice-info" style="margin-bottom:14px;">
      Container: <strong>${escapeHtml(container.containerNo || '-')}</strong><br>
      Current: Block <strong>${escapeHtml(container.blockName || '?')}</strong> · Slot <strong>${escapeHtml(container.slotNo || '-')}</strong>
    </div>
    <div class="formgrid">
      <div class="formfield">
        <label>Target Block</label>
        <select id="dcMoveBlock">${blockOpts}</select>
      </div>
      <div class="formfield">
        <label>Target Slot *</label>
        <input type="text" id="dcMoveSlot" placeholder="e.g. A-15" autocomplete="off" style="text-transform:uppercase;">
      </div>
    </div>
    <div class="settings-note" id="msError" style="display:none;color:var(--red);"></div>
    <div class="modalfoot">
      <button class="btn" id="msCancel">Cancel</button>
      <button class="btn primary" id="msSave">Move</button>
    </div>`;

  const box = depotModalWrap(html);
  const slotInput = box.querySelector('#dcMoveSlot');
  slotInput.addEventListener('input', () => {
    slotInput.value = slotInput.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  });
  setTimeout(() => slotInput.focus(), 50);

  box.querySelector('#msCancel').onclick = depotCloseModal;
  box.querySelector('#msSave').onclick = async () => {
    const errEl = box.querySelector('#msError');
    const blockId = box.querySelector('#dcMoveBlock').value;
    const slot = slotInput.value.trim().toUpperCase();
    if (!slot){ errEl.style.display='block'; errEl.textContent='Slot is required.'; return; }
    const parsed = depotParseSlotNo(slot);
    if (!parsed){ errEl.style.display='block'; errEl.textContent='Slot format must be like A-05.'; return; }
    const block = blocks.find(b => b.blockId === blockId);
    if (!block){ errEl.style.display='block'; errEl.textContent='Invalid block.'; return; }
    if (parsed.row < 1 || parsed.row > (block.rows || 30)){ errEl.style.display='block'; errEl.textContent='Slot row out of range.'; return; }
    if (parsed.col < 1 || parsed.col > (block.cols || 20)){ errEl.style.display='block'; errEl.textContent='Slot column out of range.'; return; }

    const existing = (allContainers || []).find(c =>
      c && !c.departed &&
      c.blockId === blockId &&
      String(c.slotNo || '').toUpperCase() === slot &&
      c.containerId !== container.containerId
    );
    if (existing){
      errEl.style.display='block';
      errEl.textContent = `Slot ${slot} is occupied by ${existing.containerNo}.`;
      return;
    }

    depotCloseModal();
    if (onSubmit) await onSubmit({ blockId, blockName: block.name, slotNo: slot });
  };
}

/* ============================================================
   MODAL — View Full Detail
============================================================= */

function openDepotContainerDetail(container){
  const c = container;
  const statusColor = (typeof DEPOT_STATUS_COLORS !== 'undefined' && DEPOT_STATUS_COLORS[c.status]) || '#3f9a6e';
  const statusLabel = (typeof DEPOT_STATUS_LABELS !== 'undefined' && DEPOT_STATUS_LABELS[c.status]) || c.status;
  const days = depotDaysInYard(c);
  const daysR = depotDaysColor(days);
  const inDateTxt = c.inDate ? new Date(c.inDate).toLocaleString('en-GB') : '-';
  const outDateTxt = c.outDate ? new Date(c.outDate).toLocaleString('en-GB') : '-';
  const size = c.size || {};
  const sizeTxt = (size.l && size.w && size.h) ? `${size.l} × ${size.w} × ${size.h} m` : '-';

  const html = `
    <h4>Container Detail</h4>
    <div class="depot-detail-head">
      <div class="depot-detail-id">${escapeHtml(c.containerNo || '-')}</div>
      <div class="depot-detail-status" style="background:${statusColor}1a;color:${statusColor};">
        <span class="depot-side-panel-status-dot" style="background:${statusColor};"></span>
        ${escapeHtml(statusLabel)}
      </div>
    </div>
    <div class="depot-detail-grid">
      <div class="depot-detail-row"><span class="depot-detail-k">Type</span><span class="depot-detail-v">${escapeHtml(c.type || '-')}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Size (L × W × H)</span><span class="depot-detail-v">${escapeHtml(sizeTxt)}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Weight</span><span class="depot-detail-v">${c.weight ? Number(c.weight).toLocaleString() + ' kg' : '-'}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Customer</span><span class="depot-detail-v">${escapeHtml(c.customer || '-')}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Job No.</span><span class="depot-detail-v">${escapeHtml(c.jobNo || '-')}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Vessel</span><span class="depot-detail-v">${escapeHtml(c.vessel || '-')}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Block</span><span class="depot-detail-v">${escapeHtml(c.blockName || '-')}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Slot</span><span class="depot-detail-v">${escapeHtml(c.slotNo || '-')}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Stack Level</span><span class="depot-detail-v">${escapeHtml(String(c.stackLevel || 1))}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Days in Yard</span><span class="depot-detail-v"><span class="depot-days-badge" style="background:${daysR.color}1a;color:${daysR.color};">${escapeHtml(daysR.label)}</span></span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">In Date</span><span class="depot-detail-v">${escapeHtml(inDateTxt)}</span></div>
      ${c.departed ? `<div class="depot-detail-row"><span class="depot-detail-k">Out Date</span><span class="depot-detail-v">${escapeHtml(outDateTxt)}</span></div>` : ''}
      ${c.remarks ? `<div class="depot-detail-row"><span class="depot-detail-k">Remarks</span><span class="depot-detail-v">${escapeHtml(c.remarks)}</span></div>` : ''}
      ${c.createdBy ? `<div class="depot-detail-row"><span class="depot-detail-k">Created By</span><span class="depot-detail-v">${escapeHtml(c.createdBy)}</span></div>` : ''}
    </div>
    <div class="modalfoot">
      <button class="btn primary" id="detailClose">Close</button>
    </div>`;

  const box = depotModalWrap(html);
  box.querySelector('#detailClose').onclick = depotCloseModal;
}

/* ============================================================
   RIGHT-CLICK CONTEXT MENU
============================================================= */

function openDepotContextMenu(x, y, container, actions){
  document.querySelectorAll('.depot-ctxmenu').forEach(el => el.remove());

  const menu = document.createElement('div');
  menu.className = 'depot-ctxmenu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const items = [
    { id: 'detail', label: 'View Full Detail', icon: '📋' },
    { id: 'change-status', label: 'Change Status', icon: '🔄' },
    { id: 'move-slot', label: 'Move Slot', icon: '↔️' },
    { sep: true },
    { id: 'set-out', label: 'Set OUT', icon: '⬅️' },
    { id: 'delete', label: 'Delete', icon: '🗑️', danger: true },
    { sep: true },
    { id: 'copy', label: 'Copy Container No', icon: '📎' },
  ];

  menu.innerHTML = items.map(it => {
    if (it.sep) return '<div class="depot-ctxmenu-sep"></div>';
    return `<button class="depot-ctxmenu-item${it.danger?' is-danger':''}" data-ctx="${it.id}">
      <span>${it.icon}</span>
      <span>${it.label}</span>
    </button>`;
  }).join('');

  document.body.appendChild(menu);

  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 10) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 10) + 'px';

  const closeMenu = () => { menu.remove(); document.removeEventListener('click', outside); document.removeEventListener('contextmenu', outside); };
  const outside = (e) => { if (!menu.contains(e.target)) closeMenu(); };
  setTimeout(() => {
    document.addEventListener('click', outside);
    document.addEventListener('contextmenu', outside);
  }, 10);

  menu.querySelectorAll('[data-ctx]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.ctx;
      closeMenu();
      if (id === 'copy'){ copyTextToClipboard(container.containerNo || ''); return; }
      if (actions && actions[id]) actions[id]();
    });
  });
}

/* ============================================================
   UNDO BANNER
============================================================= */

function showDepotUndoBanner(message, onUndo){
  document.querySelectorAll('.depot-undo-banner').forEach(el => el.remove());

  const banner = document.createElement('div');
  banner.className = 'depot-undo-banner';
  banner.innerHTML = `
    <span class="depot-undo-msg">${escapeHtml(message)}</span>
    <button class="depot-undo-btn" id="depotUndoBtn">Undo</button>
    <button class="depot-undo-close" id="depotUndoClose" aria-label="Dismiss">&times;</button>
  `;
  document.body.appendChild(banner);

  let timer = setTimeout(() => { banner.remove(); }, 10000);
  banner.querySelector('#depotUndoBtn').onclick = () => {
    clearTimeout(timer);
    banner.remove();
    if (onUndo) onUndo();
  };
  banner.querySelector('#depotUndoClose').onclick = () => {
    clearTimeout(timer);
    banner.remove();
  };
}

/* ============================================================
   PRINT YARD PLAN (PDF)
============================================================= */

async function depotPrintYardPlan(layout, containers){
  if (!(window.jspdf && window.jspdf.jsPDF)){
    alert('PDF library failed to load.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });

  const M = 12, R = 285;
  const INK = [17,17,17], GREY = [110,110,110], LINE = [180,180,180];

  function txt(text, x, y, size, bold, color){
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size || 9.5);
    const c = color || INK;
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(String(text == null ? '' : text), x, y);
  }
  function txtC(text, cx, y, size, bold, color){
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size || 9.5);
    const c = color || INK;
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(String(text == null ? '' : text), cx, y, { align: 'center' });
  }
  function rule(x1, y1, x2, y2, w){
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(w || 0.2);
    doc.line(x1, y1, x2, y2);
  }
  function box(x, y, w, h, fillRgb){
    doc.setDrawColor(150,150,150);
    doc.setLineWidth(0.2);
    if (fillRgb){
      doc.setFillColor(fillRgb[0], fillRgb[1], fillRgb[2]);
      doc.rect(x, y, w, h, 'FD');
    } else {
      doc.rect(x, y, w, h, 'S');
    }
  }

  let pageNum = 0;
  const totalPages = (layout.blocks || []).length;

  for (const block of (layout.blocks || [])){
    pageNum += 1;
    if (pageNum > 1) doc.addPage('a4', 'landscape');

    txt('Company: ' + (layout.depotName || ''), M, 15, 11, true);
    txt('YARD PLAN — Block ' + (block.name || '?'), M, 22, 14, true);
    txt('Page ' + pageNum + ' of ' + totalPages, R, 15, 9, false, GREY);
    txt('Generated: ' + new Date().toLocaleString('en-GB'), R, 20, 8, false, GREY);
    rule(M, 26, R, 26, 0.5);

    txt('Block: ' + (block.name || '?'), M, 34, 10, true);
    txt('Layout: ' + (block.cols || 0) + ' × ' + (block.rows || 0) + ' (' + ((block.cols||0)*(block.rows||0)) + ' slots)', M, 40, 9, false);
    txt('Stack limit: ' + (block.stackLimit || 1), M, 46, 9, false);

    const cols = block.cols || 6;
    const rows = block.rows || 8;
    const gridTop = 54;
    const cellW = (R - M) / (cols + 1);
    const cellH = Math.min(20, (270 - gridTop) / rows);

    for (let c = 1; c <= cols; c++){
      const x = M + c * cellW;
      txtC(String(c).padStart(2,'0'), x + cellW/2, gridTop - 2, 8, true, GREY);
    }
    for (let r = 1; r <= rows; r++){
      const y = gridTop + (r - 1) * cellH;
      const rowLetter = String.fromCharCode(64 + r);
      txtC(rowLetter, M + cellW/2, y + cellH/2 + 3, 9, true, GREY);

      for (let c = 1; c <= cols; c++){
        const x = M + c * cellW;
        const slotNo = depotSlotNo(block.name, r, c);
        const container = (containers || []).find(cn =>
          cn && !cn.departed &&
          cn.blockId === block.blockId &&
          String(cn.slotNo || '').toUpperCase() === slotNo.toUpperCase()
        );
        let fillRgb = null;
        if (container){
          const statusColor = (typeof DEPOT_STATUS_COLORS !== 'undefined' && DEPOT_STATUS_COLORS[container.status]) || '#3f9a6e';
          const hex = statusColor.replace('#','');
          const rr = parseInt(hex.substring(0,2), 16);
          const gg = parseInt(hex.substring(2,4), 16);
          const bb = parseInt(hex.substring(4,6), 16);
          fillRgb = [Math.round(rr*0.15 + 255*0.85), Math.round(gg*0.15 + 255*0.85), Math.round(bb*0.15 + 255*0.85)];
        }
        box(x, y, cellW - 0.5, cellH - 0.5, fillRgb);

        if (container){
          txtC(slotNo, x + cellW/2, y + 5, 6.5, false, GREY);
          txtC(String(container.containerNo || '').slice(0, 11), x + cellW/2, y + cellH/2 + 2, 7, true);
        } else {
          txtC(slotNo, x + cellW/2, y + cellH/2 + 2, 7, false, [200,200,200]);
        }
      }
    }
    const legY = gridTop + rows * cellH + 8;
    txt('Legend:', M, legY, 9, true);
    [['OK','#3f9a6e'],['Repairing','#e6a339'],['Damaged','#d1554a']].forEach((it, i) => {
      const x = M + 24 + i * 40;
      const hex = it[1].replace('#','');
      doc.setFillColor(parseInt(hex.substring(0,2),16), parseInt(hex.substring(2,4),16), parseInt(hex.substring(4,6),16));
      doc.setDrawColor(150,150,150);
      doc.setLineWidth(0.2);
      doc.rect(x, legY - 3, 3.5, 3.5, 'FD');
      txt(it[0], x + 6, legY, 9, false);
    });

    rule(M, 200, R, 200, 0.2);
    txt('FOCC — Fleet Operations Control Centre · Yard Plan · Generated by ' + (getSessionEmail() || 'user'), M, 205, 8, false, GREY);
  }
  doc.save('Yard-Plan-' + (layout.depotName || 'Depot').replace(/\s+/g,'-') + '-' + new Date().toISOString().slice(0,10) + '.pdf');
}

/* ============================================================
   RENDER — MAIN PAGE
============================================================= */

async function renderDepotOverview(){
  const wrap = document.createElement('div');
  wrap.className = 'depot-overview-page';

  let layout = await depotLoadLayout();
  let allContainers = await depotLoadContainers();

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

  let activeBlockId = layout.blocks[0].blockId;
  let selectedContainerId = null;
  let searchTerm = '';
  let statusFilter = 'all';
  let dragState = null; // { containerId, fromBlockId, fromSlotNo }

  const sortedBlocks = layout.blocks.slice().sort((a,b) => (a.order || 0) - (b.order || 0));

  function getActiveContainers(){
    return allContainers.filter(c => c && !c.departed);
  }
  function getDepartedContainers(){
    return allContainers
      .filter(c => c && c.departed)
      .sort((a,b) => String(b.outDate || '').localeCompare(String(a.outDate || '')));
  }

  function computeKPIs(){
    const act = getActiveContainers();
    const dep = getDepartedContainers();
    const byStatus = { ok: 0, repairing: 0, damaged: 0 };
    act.forEach(c => { const s = String(c.status || 'ok'); if (byStatus[s] !== undefined) byStatus[s]++; });
    const today = new Date(); today.setHours(0,0,0,0);
    const departedToday = dep.filter(c => {
      if (!c.outDate) return false;
      const d = new Date(c.outDate); d.setHours(0,0,0,0);
      return d.getTime() === today.getTime();
    }).length;
    return { total: act.length, inYard: act.length, departedToday, damaged: byStatus.damaged, ok: byStatus.ok, repairing: byStatus.repairing };
  }

  /* ---------- RENDER ---------- */

  function renderHeader(){
    const kpi = computeKPIs();
    return `
      <div class="depot-overview-header">
        <div class="depot-overview-header-left">
          <div class="depot-overview-title">${escapeHtml(layout.depotName || 'My Depot')}</div>
          <div class="depot-overview-sub">${sortedBlocks.length} block${sortedBlocks.length === 1 ? '' : 's'} · ${kpi.total} active container${kpi.total === 1 ? '' : 's'}</div>
        </div>
        <div class="depot-overview-header-right">
          <div class="depot-search-wrap">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" id="depotSearch" class="depot-search-input" placeholder="Search container, customer..." value="${escapeHtml(searchTerm)}" autocomplete="off">
          </div>
          <div class="depot-filter-wrap">
            <select id="depotStatusFilter" class="depot-filter-select">
              <option value="all"${statusFilter==='all'?' selected':''}>All Status</option>
              <option value="ok"${statusFilter==='ok'?' selected':''}>OK only</option>
              <option value="repairing"${statusFilter==='repairing'?' selected':''}>Repairing</option>
              <option value="damaged"${statusFilter==='damaged'?' selected':''}>Damaged</option>
            </select>
          </div>
          <button class="btn" id="depotExportBtn" title="Export CSV">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export
          </button>
          <button class="btn" id="depotPrintBtn" title="Print Yard Plan">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print
          </button>
          <button class="btn primary" id="depotAddBtn" title="Add Container (N)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Add Container
          </button>
        </div>
      </div>
    `;
  }

  function renderKPICards(){
    const kpi = computeKPIs();
    const sparkTotal = [kpi.total - 6, kpi.total - 4, kpi.total - 3, kpi.total - 5, kpi.total - 1, kpi.total - 2, kpi.total];
    const sparkYard = [kpi.inYard - 5, kpi.inYard - 3, kpi.inYard - 4, kpi.inYard - 2, kpi.inYard - 1, kpi.inYard - 3, kpi.inYard];
    const sparkDeparted = [Math.max(0, kpi.departedToday - 4), kpi.departedToday - 2, kpi.departedToday - 3, kpi.departedToday - 1, kpi.departedToday, kpi.departedToday - 2, kpi.departedToday];
    const sparkDamaged = [kpi.damaged + 2, kpi.damaged + 1, kpi.damaged + 2, kpi.damaged, kpi.damaged + 1, kpi.damaged, kpi.damaged];

    return `
      <div class="depot-kpi-grid">
        <div class="depot-kpi-card">
          <div class="depot-kpi-head">
            <div class="depot-kpi-icon" style="background:rgba(26,163,154,.12);color:#1aa39a;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            </div>
            <div class="depot-kpi-label">Total Containers</div>
          </div>
          <div class="depot-kpi-value">${kpi.total}</div>
          <div class="depot-kpi-sparkline">${depotSparkline(sparkTotal, '#1aa39a')}</div>
        </div>
        <div class="depot-kpi-card">
          <div class="depot-kpi-head">
            <div class="depot-kpi-icon" style="background:rgba(26,163,154,.12);color:#1aa39a;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            </div>
            <div class="depot-kpi-label">In Yard</div>
          </div>
          <div class="depot-kpi-value">${kpi.inYard}</div>
          <div class="depot-kpi-sparkline">${depotSparkline(sparkYard, '#1aa39a')}</div>
        </div>
        <div class="depot-kpi-card">
          <div class="depot-kpi-head">
            <div class="depot-kpi-icon" style="background:rgba(230,163,57,.12);color:#e6a339;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="5" width="10" height="9" rx="1"/><path d="M11 8h4.5L20 12v2h-9z"/><circle cx="5" cy="17.5" r="1.8"/><circle cx="16" cy="17.5" r="1.8"/></svg>
            </div>
            <div class="depot-kpi-label">Departed Today</div>
          </div>
          <div class="depot-kpi-value">${kpi.departedToday}</div>
          <div class="depot-kpi-sparkline">${depotSparkline(sparkDeparted, '#e6a339')}</div>
        </div>
        <div class="depot-kpi-card is-danger">
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
          const used = getActiveContainers().filter(c => c.blockId === b.blockId).length;
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

  function matchesFilter(container){
    if (!container) return true;
    if (statusFilter !== 'all' && String(container.status || '') !== statusFilter) return false;
    if (searchTerm){
      const t = searchTerm.toLowerCase();
      const hay = [container.containerNo, container.customer, container.jobNo, container.vessel, container.slotNo].map(v => String(v||'').toLowerCase()).join(' ');
      if (!hay.includes(t)) return false;
    }
    return true;
  }

  function getContainerAtSlot(block, slotNo){
    return getActiveContainers().find(c =>
      c.blockId === block.blockId &&
      String(c.slotNo || '').toUpperCase() === slotNo.toUpperCase()
    );
  }

  function renderSlot(block, row, col){
    const slotNo = depotSlotNo(block.name, row, col);
    const container = getContainerAtSlot(block, slotNo);
    const isSelected = container && selectedContainerId === container.containerId;
    const dimmed = container && !matchesFilter(container);
    const isDragging = container && dragState && dragState.containerId === container.containerId;

    if (!container){
      return `
        <div class="depot-slot is-empty" data-slot="${slotNo}" data-block-id="${block.blockId}" title="Empty slot — click to add container">
          <div class="depot-slot-no">${slotNo}</div>
          <div class="depot-slot-empty">+</div>
        </div>
      `;
    }

    const statusColor = (typeof DEPOT_STATUS_COLORS !== 'undefined' && DEPOT_STATUS_COLORS[container.status]) || '#3f9a6e';
    const statusLabel = (typeof DEPOT_STATUS_LABELS !== 'undefined' && DEPOT_STATUS_LABELS[container.status]) || container.status;

    return `
      <div class="depot-slot is-occupied${isSelected ? ' is-selected' : ''}${dimmed ? ' is-dimmed' : ''}${isDragging ? ' is-dragging' : ''}"
           draggable="true"
           data-slot="${slotNo}"
           data-block-id="${block.blockId}"
           data-container-id="${container.containerId}"
           title="${escapeHtml(container.containerNo || '')} · ${escapeHtml(container.customer || '')}">
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

    const headerCols = Array.from({ length: cols }, (_, i) => {
      const num = String(i + 1).padStart(2, '0');
      return `<div class="depot-grid-col-header">${num}</div>`;
    }).join('');

    const gridRows = [];
    for (let r = 1; r <= rows; r++){
      const rowLetter = String.fromCharCode(64 + r);
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
        <span class="depot-legend-item"><span class="depot-legend-dot" style="background:#3f9a6e;"></span> OK</span>
        <span class="depot-legend-item"><span class="depot-legend-dot" style="background:#e6a339;"></span> Repairing</span>
        <span class="depot-legend-item"><span class="depot-legend-dot" style="background:#d1554a;"></span> Damaged</span>
        <span class="depot-legend-item"><span class="depot-legend-dot is-empty"></span> Empty Slot</span>
        <span class="depot-legend-item" style="margin-left:auto;color:var(--muted);font-weight:500;">💡 Tip: Drag container to move · Right-click for menu</span>
      </div>
    `;
  }

  function renderBlockHeader(block){
    const totalSlots = (block.cols || 0) * (block.rows || 0);
    const used = getActiveContainers().filter(c => c.blockId === block.blockId).length;
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
            <div class="depot-side-panel-empty-sub">Click any container on the yard grid to see its details here. Drag to move. Right-click for quick actions.</div>
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
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Customer</span><span class="depot-side-panel-row-v">${escapeHtml(c.customer || '-')}</span></div>
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Type</span><span class="depot-side-panel-row-v">${escapeHtml(c.type || '-')}</span></div>
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Size (L × W × H)</span><span class="depot-side-panel-row-v">${escapeHtml(sizeTxt)}</span></div>
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Weight</span><span class="depot-side-panel-row-v">${escapeHtml(weightTxt)}</span></div>
          </div>
        </div>

        <div class="depot-side-panel-section">
          <div class="depot-side-panel-section-title">Location</div>
          <div class="depot-side-panel-rows">
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Block</span><span class="depot-side-panel-row-v">${escapeHtml(c.blockName || '-')}</span></div>
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Slot</span><span class="depot-side-panel-row-v">${escapeHtml(c.slotNo || '-')}</span></div>
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Stack</span><span class="depot-side-panel-row-v">${escapeHtml(String(c.stackLevel || 1))}</span></div>
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Days in Yard</span><span class="depot-side-panel-row-v"><span class="depot-days-badge" style="background:${daysR.color}1a;color:${daysR.color};">${escapeHtml(daysR.label)}</span></span></div>
          </div>
        </div>

        <div class="depot-side-panel-actions">
          <button class="btn primary" data-action="change-status">Change Status</button>
          <button class="btn" data-action="move-slot">Move Slot</button>
          <button class="btn" data-action="set-out">Set OUT</button>
          <button class="btn" data-action="view-detail">View Full Detail</button>
          <button class="btn danger" data-action="delete">Delete Container</button>
        </div>
      </div>
    `;
  }

  function renderDepartedTable(){
    const list = getDepartedContainers().slice(0, 20);
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
              <th>#</th><th>Container No.</th><th>Customer</th><th>Type</th>
              <th>Weight</th><th>Departed At</th><th>Days in Yard</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((c, i) => {
              const days = depotDaysInYard(c);
              const daysR = depotDaysColor(days);
              const statusColor = (typeof DEPOT_STATUS_COLORS !== 'undefined' && DEPOT_STATUS_COLORS[c.status]) || '#3f9a6e';
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

  /* ---------- MAIN PAINT ---------- */

  function paint(){
    const block = getActiveBlock();

    wrap.innerHTML = `
      ${renderHeader()}
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
          <span class="eyebrow">${getDepartedContainers().length} total departed</span>
          <div class="spacer"></div>
          <span class="depot-departed-sub">Showing last 20</span>
        </div>
        <div class="section-body">
          ${renderDepartedTable()}
        </div>
      </div>
    `;

    wireAll(block);
  }

  /* ---------- WIRING ---------- */

  function wireAll(block){
    // Search
    const searchInput = wrap.querySelector('#depotSearch');
    if (searchInput){
      searchInput.addEventListener('input', () => {
        searchTerm = searchInput.value;
        const gridHost = wrap.querySelector('.depot-main-grid');
        const tabsHost = wrap.querySelector('.depot-tabs');
        const kpiHost = wrap.querySelector('.depot-kpi-grid');
        if (gridHost){
          const activeBlock = getActiveBlock();
          gridHost.innerHTML = `
            <div class="depot-grid-card">
              ${renderBlockHeader(activeBlock)}
              ${renderYardGrid(activeBlock)}
            </div>
            ${renderSidePanel()}
          `;
          wireGridAndPanel(activeBlock);
        }
        if (tabsHost) tabsHost.outerHTML = renderBlockTabs();
        if (kpiHost) kpiHost.outerHTML = renderKPICards();
        wireTabs();
      });
    }

    // Filter
    const filterSel = wrap.querySelector('#depotStatusFilter');
    if (filterSel){
      filterSel.addEventListener('change', () => {
        statusFilter = filterSel.value;
        const activeBlock = getActiveBlock();
        const gridHost = wrap.querySelector('.depot-main-grid');
        if (gridHost){
          gridHost.innerHTML = `
            <div class="depot-grid-card">
              ${renderBlockHeader(activeBlock)}
              ${renderYardGrid(activeBlock)}
            </div>
            ${renderSidePanel()}
          `;
          wireGridAndPanel(activeBlock);
        }
      });
    }

    // Export CSV
    const exportBtn = wrap.querySelector('#depotExportBtn');
    if (exportBtn){
      exportBtn.onclick = () => {
        const all = getActiveContainers();
        const filtered = statusFilter === 'all' && !searchTerm
          ? all
          : all.filter(matchesFilter);
        const label = [];
        if (statusFilter !== 'all') label.push('status=' + statusFilter);
        if (searchTerm) label.push('search="' + searchTerm + '"');
        const filterLabel = label.length ? label.join(' & ') : 'All active containers';
        depotExportCSV(filtered, layout, filterLabel);
      };
    }

    // Print PDF
    const printBtn = wrap.querySelector('#depotPrintBtn');
    if (printBtn){
      printBtn.onclick = () => depotPrintYardPlan(layout, allContainers);
    }

    // Add Container
    const addBtn = wrap.querySelector('#depotAddBtn');
    if (addBtn){
      addBtn.onclick = () => {
        const activeBlock = getActiveBlock();
        openDepotAddContainer(activeBlock, '', async (newContainer) => {
          allContainers.push(newContainer);
          await depotSaveAll(allContainers);
          flashSaved();
          paint();
        });
      };
    }

    wireTabs();
    wireGridAndPanel(block);
  }

  function wireTabs(){
    wrap.querySelectorAll('.depot-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.blockId === activeBlockId) return;
        activeBlockId = btn.dataset.blockId;
        selectedContainerId = null;
        // Fade animation on grid
        const gridCard = wrap.querySelector('.depot-grid-card');
        if (gridCard){
          gridCard.style.opacity = '0';
          gridCard.style.transition = 'opacity .15s ease';
          setTimeout(() => { paint(); }, 150);
        } else {
          paint();
        }
      });
    });
  }

  function wireGridAndPanel(block){
    // Click + context menu + drag for occupied
    wrap.querySelectorAll('.depot-slot.is-occupied').forEach(el => {
      el.addEventListener('click', () => {
        selectedContainerId = el.dataset.containerId;
        paint();
      });

      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const containerId = el.dataset.containerId;
        const container = allContainers.find(x => x.containerId === containerId);
        if (!container) return;
        selectedContainerId = containerId;
        openDepotContextMenu(e.clientX, e.clientY, container, {
          detail: () => openDepotContainerDetail(container),
          'change-status': () => handleChangeStatus(container),
          'move-slot': () => handleMoveSlot(container),
          'set-out': () => handleSetOut(container),
          delete: () => handleDelete(container),
        });
      });

      // ---- DRAG START ----
      el.addEventListener('dragstart', (e) => {
        const containerId = el.dataset.containerId;
        const container = allContainers.find(x => x.containerId === containerId);
        if (!container) return;
        dragState = {
          containerId: container.containerId,
          fromBlockId: container.blockId,
          fromSlotNo: container.slotNo,
        };
        el.classList.add('is-dragging');
        try{
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', container.containerNo || '');
        }catch(err){}
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('is-dragging');
        dragState = null;
        wrap.querySelectorAll('.depot-slot').forEach(s => s.classList.remove('is-drop-valid', 'is-drop-invalid'));
      });
    });

    // ---- DROP TARGETS (all slots — occupied + empty) ----
    wrap.querySelectorAll('.depot-slot').forEach(el => {
      el.addEventListener('dragover', (e) => {
        if (!dragState) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const targetSlot = el.dataset.slot;
        if (dragState.fromSlotNo === targetSlot && el.dataset.blockId === dragState.fromBlockId) return;
        const isOccupied = el.classList.contains('is-occupied');
        el.classList.add(isOccupied ? 'is-drop-invalid' : 'is-drop-valid');
      });

      el.addEventListener('dragleave', () => {
        el.classList.remove('is-drop-valid', 'is-drop-invalid');
      });

      el.addEventListener('drop', async (e) => {
        if (!dragState) return;
        e.preventDefault();
        el.classList.remove('is-drop-valid', 'is-drop-invalid');

        const targetBlockId = el.dataset.blockId;
        const targetSlot = el.dataset.slot;
        const targetBlock = sortedBlocks.find(b => b.blockId === targetBlockId);

        if (!targetBlock){ dragState = null; return; }
        if (dragState.fromBlockId === targetBlockId && dragState.fromSlotNo === targetSlot){
          dragState = null;
          return;
        }

        // Check target occupied
        const occupied = getActiveContainers().find(c =>
          c.blockId === targetBlockId &&
          String(c.slotNo || '').toUpperCase() === targetSlot.toUpperCase() &&
          c.containerId !== dragState.containerId
        );
        if (occupied){
          alert(`Slot ${targetSlot} is occupied by ${occupied.containerNo}.`);
          dragState = null;
          return;
        }

        const idx = allContainers.findIndex(x => x.containerId === dragState.containerId);
        if (idx < 0){ dragState = null; return; }

        allContainers[idx] = Object.assign({}, allContainers[idx], {
          blockId: targetBlockId,
          blockName: targetBlock.name,
          slotNo: targetSlot,
          updatedAt: new Date().toISOString(),
          updatedBy: getSessionEmail() || '',
        });

        const prevBlockId = dragState.fromBlockId;
        dragState = null;

        try{
          await depotSaveAll(allContainers);
          flashSaved();
        }catch(err){
          console.error('Drag save failed:', err);
          alert('Save failed: ' + (err && err.message || err));
        }

        // Switch active block to target if changed
        if (prevBlockId !== targetBlockId) activeBlockId = targetBlockId;
        paint();
      });
    });

    // Click empty slot → Add (only if not from drag)
    wrap.querySelectorAll('.depot-slot.is-empty').forEach(el => {
      el.addEventListener('click', (e) => {
        if (dragState) return;
        openDepotAddContainer(block, el.dataset.slot, async (newContainer) => {
          allContainers.push(newContainer);
          await depotSaveAll(allContainers);
          flashSaved();
          paint();
        });
      });
    });

    // Side panel buttons
    wrap.querySelectorAll('.depot-side-panel-actions .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = allContainers.find(x => x.containerId === selectedContainerId);
        if (!c) return;
        const action = btn.dataset.action;
        if (action === 'change-status') handleChangeStatus(c);
        if (action === 'move-slot')     handleMoveSlot(c);
        if (action === 'set-out')       handleSetOut(c);
        if (action === 'view-detail')   openDepotContainerDetail(c);
        if (action === 'delete')        handleDelete(c);
      });
    });
  }

  /* ---------- ACTION HANDLERS ---------- */

  function handleChangeStatus(container){
    openDepotChangeStatus(container, async ({ status, statusNote }) => {
      const idx = allContainers.findIndex(x => x.containerId === container.containerId);
      if (idx >= 0){
        allContainers[idx] = Object.assign({}, allContainers[idx], {
          status, statusNote,
          updatedAt: new Date().toISOString(),
          updatedBy: getSessionEmail() || '',
        });
        await depotSaveAll(allContainers);
        flashSaved();
        paint();
      }
    });
  }

  function handleMoveSlot(container){
    openDepotMoveSlot(container, layout, allContainers, async ({ blockId, blockName, slotNo }) => {
      const idx = allContainers.findIndex(x => x.containerId === container.containerId);
      if (idx >= 0){
        allContainers[idx] = Object.assign({}, allContainers[idx], {
          blockId, blockName, slotNo,
          updatedAt: new Date().toISOString(),
          updatedBy: getSessionEmail() || '',
        });
        await depotSaveAll(allContainers);
        flashSaved();
        activeBlockId = blockId;
        paint();
      }
    });
  }

  function handleSetOut(container){
    openDepotSetOut(container, async ({ outDate, outRemarks }) => {
      const snapshot = JSON.parse(JSON.stringify(container));
      const idx = allContainers.findIndex(x => x.containerId === container.containerId);
      if (idx >= 0){
        allContainers[idx] = Object.assign({}, allContainers[idx], {
          departed: true,
          outDate,
          outRemarks: outRemarks || '',
          updatedAt: new Date().toISOString(),
          updatedBy: getSessionEmail() || '',
        });
        await depotSaveAll(allContainers);
        flashSaved();
        selectedContainerId = null;
        paint();

        showDepotUndoBanner(
          `Container ${container.containerNo} set OUT.`,
          async () => {
            const idx2 = allContainers.findIndex(x => x.containerId === snapshot.containerId);
            if (idx2 >= 0){
              allContainers[idx2] = snapshot;
              await depotSaveAll(allContainers);
              flashSaved();
              paint();
            }
          }
        );
      }
    });
  }

  async function handleDelete(container){
    const ok = await confirmModal(
      'Delete Container',
      `Delete <strong>${escapeHtml(container.containerNo || '')}</strong> from the yard?<br><br>This cannot be undone.`,
      { confirmLabel: 'Delete', tone: 'danger' }
    );
    if (!ok) return;
    allContainers = allContainers.filter(x => x.containerId !== container.containerId);
    await depotSaveAll(allContainers);
    flashSaved();
    selectedContainerId = null;
    paint();
  }

  /* ---------- KEYBOARD ---------- */

  function keyHandler(e){
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === 'n' || e.key === 'N'){
      e.preventDefault();
      const addBtn = wrap.querySelector('#depotAddBtn');
      if (addBtn) addBtn.click();
    }
    if (e.key === 'Escape'){
      selectedContainerId = null;
      paint();
    }
  }
  document.addEventListener('keydown', keyHandler);
  wrap.addEventListener('DOMNodeRemoved', () => {
    document.removeEventListener('keydown', keyHandler);
  });

  paint();
  return wrap;
}