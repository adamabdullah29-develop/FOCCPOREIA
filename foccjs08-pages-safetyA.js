/* =========================================================================
   FOCC — 08-pages-safety.js
   Compliance Dashboard, Misconduct (map), Safety Equipment.
   ========================================================================= */

/* ============================================================
   PAGE: COMPLIANCE DASHBOARD
============================================================= */
async function renderComplianceDashboard(){
  async function safeGetData(tableKey){
    try {
      return await getData(tableKey);
    } catch (err){
      console.warn('Compliance Dashboard: skipping table', tableKey, '-', err && err.message);
      return [];
    }
  }
  const speeding = await safeGetData('speedingIdling');
  const misconduct = await safeGetData('misconduct');
  const safetyEquipment = await safeGetData('safetyEquipment');
  const feg = await safeGetData('feg');
  const primeMover = await safeGetData('primeMover');
  const trailer = await safeGetData('trailer');
  const staffDatabase = await safeGetData('staffDatabase');

  let rangeMode = 'all';
  let customFrom = '';
  let customTo = '';

  function inRange(dateStr){
    if (rangeMode === 'all') return true;
    if (!dateStr) return false;
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    if (rangeMode === '7'){
      const from = new Date(today); from.setDate(from.getDate() - 6);
      return d >= from && d <= today;
    }
    if (rangeMode === '30'){
      const from = new Date(today); from.setDate(from.getDate() - 29);
      return d >= from && d <= today;
    }
    if (rangeMode === 'month'){
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    }
    if (rangeMode === 'custom'){
      if (!customFrom && !customTo) return true;
      const from = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
      const to = customTo ? new Date(`${customTo}T00:00:00`) : null;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    }
    return true;
  }

  function currentRangeLabel(){
    if (rangeMode === '7') return 'Last 7 days';
    if (rangeMode === '30') return 'Last 30 days';
    if (rangeMode === 'month') return 'This month';
    if (rangeMode === 'custom') return (customFrom || customTo) ? 'Selected range' : 'All recorded';
    return 'All recorded';
  }

  function parseIdleMinutes(v){
    if (!v) return 0;
    const m = String(v).trim().match(/^(\d+):(\d+)$/);
    if (!m) return 0;
    return Number(m[1]) * 60 + Number(m[2]);
  }
  function formatIdleMinutes(mins){
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  function buildSpeedingAgg(rows){
    const map = new Map();
    rows.forEach(r => {
      if (!inRange(r.date)) return;
      const key = r.driver || '(No Driver)';
      if (!map.has(key)) map.set(key, {driver:key, over80:0, over90:0, over100:0});
      const rec = map.get(key);
      rec.over80 += Number(r.over80) || 0;
      rec.over90 += Number(r.over90) || 0;
      rec.over100 += Number(r.over100) || 0;
    });
    return Array.from(map.values())
      .map(r => ({...r, total: r.over80 + r.over90 + r.over100}))
      .filter(r => r.total > 0)
      .sort((a,b) => b.total - a.total || b.over100 - a.over100 || b.over90 - a.over90 || b.over80 - a.over80);
  }

  function buildIdlingAgg(rows){
    const map = new Map();
    rows.forEach(r => {
      if (!inRange(r.date)) return;
      const key = r.driver || '(No Driver)';
      if (!map.has(key)) map.set(key, {driver:key, minutes:0, cost:0});
      const rec = map.get(key);
      rec.minutes += parseIdleMinutes(r.idleDuration);
      rec.cost += Number(r.idleCost) || 0;
    });
    return Array.from(map.values())
      .filter(r => r.minutes > 0 || r.cost > 0)
      .sort((a,b) => b.minutes - a.minutes);
  }

  function buildMisconductAgg(rows){
    return rows
      .filter(r => (r.status || '').trim().toLowerCase() === 'open')
      .map(r => ({driver: r.driver || '(No Driver)', caseDate: r.caseDate || '', category: r.category || ''}))
      .sort((a,b) => (b.caseDate || '').localeCompare(a.caseDate || ''));
  }

  function safetyItemIsNearExpiry(dateStr, today){
    if (!dateStr || dateStr === '-') return false;
    const dt = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dt.getTime())) return false;
    const expiry = new Date(dt.getFullYear() + 1, dt.getMonth(), dt.getDate());
    const daysLeft = Math.round((expiry - today) / 86400000);
    return daysLeft <= 30;
  }
  function safetyItemBalanceLabel(dateStr, today){
    if (!dateStr || dateStr === '-') return 'No Date';
    const dt = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dt.getTime())) return 'No Date';
    const expiry = new Date(dt.getFullYear() + 1, dt.getMonth(), dt.getDate());
    const daysLeft = Math.round((expiry - today) / 86400000);
    if (daysLeft > 30) return '-';
    if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
    return `${daysLeft} Days Balance`;
  }
  function buildSafetyRows(rows, category, itemFields){
    const today = new Date(); today.setHours(0,0,0,0);
    return rows
      .filter(r => (r.category || '') === category)
      .map(r => ({...r, asset: r.asset || '(No Name)'}))
      .filter(r => itemFields.some(it => safetyItemIsNearExpiry(r[it.id], today)));
  }

  function fegBalanceLabel(dateStr, today){
    if (!dateStr || dateStr === '-') return 'No Date';
    const dt = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dt.getTime())) return 'No Date';
    const daysLeft = Math.round((dt - today) / 86400000);
    if (daysLeft > 20) return '-';
    if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
    return `${daysLeft} Days Balance`;
  }
  function buildFegExpiry(rows){
    const today = new Date(); today.setHours(0,0,0,0);
    const out = [];
    (rows || []).forEach(r => {
      (r.units || []).forEach(u => {
        if (String(u.disposal || 'No') === 'Yes') return;
        if (!String(u.serialNo || '').trim()) return;
        let nearest = null, nearestLabel = '', nearestRaw = '';
        [['cylinderDue','Cylinder'], ['serviceDate','Service']].forEach(pair => {
          const raw = u[pair[0]];
          if (!raw || raw === '-') return;
          const dt = new Date(`${raw}T00:00:00`);
          if (isNaN(dt.getTime())) return;
          if (!nearest || dt < nearest){ nearest = dt; nearestRaw = raw; nearestLabel = pair[1]; }
        });
        if (!nearest) return;
        const daysLeft = Math.round((nearest - today) / 86400000);
        if (daysLeft > 20) return;
        out.push({
          truck: r.assetRef || '(No Asset)',
          serial: fegSerialLabel(u) || '-',
          item: nearestLabel,
          date: nearestRaw,
          daysLeft: daysLeft,
        });
      });
    });
    return out.sort((a,b) => a.daysLeft - b.daysLeft);
  }

  function primeMoverBalanceLabel(dateStr, today){
    if (!dateStr || dateStr === '-') return 'No Date';
    const dt = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dt.getTime())) return 'No Date';
    const daysLeft = Math.round((dt - today) / 86400000);
    if (daysLeft > 20) return '-';
    if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
    return `${daysLeft} Days Balance`;
  }
  function buildPrimeMoverExpiryRows(rows){
    const today = new Date(); today.setHours(0,0,0,0);
    const fields = ['permit','insurance','puspakom','roadtax'];
    return rows
      .map(r => {
        let minDays = null;
        fields.forEach(f => {
          if (!r[f] || r[f] === '-') return;
          const dt = new Date(`${r[f]}T00:00:00`);
          if (isNaN(dt.getTime())) return;
          const daysLeft = Math.round((dt - today) / 86400000);
          if (minDays === null || daysLeft < minDays) minDays = daysLeft;
        });
        if (minDays === null) return null;
        return {truck: r.lorry || '(No Truck)', permit: r.permit, insurance: r.insurance, puspakom: r.puspakom, roadtax: r.roadtax, minDays};
      })
      .filter(r => r && r.minDays <= 20)
      .sort((a,b) => a.minDays - b.minDays);
  }
  function renderPrimeMoverExpiryTable(rows){
    if (!rows.length) return cdxEmpty('Nothing nearing expiry.');
    const today = new Date(); today.setHours(0,0,0,0);
    return `<table class="cdx-table"><thead><tr><th>#</th><th>Truck No</th><th>Permit</th><th>Insurance</th><th>Puspakom</th><th>Roadtax</th></tr></thead><tbody>
      ${rows.map((r,i) => {
        return `<tr>
          <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
          <td><span class="truckchip">${escapeHtml(r.truck)}</span></td>
          <td>${primeMoverBalanceLabel(r.permit, today)}</td>
          <td>${primeMoverBalanceLabel(r.insurance, today)}</td>
          <td>${primeMoverBalanceLabel(r.puspakom, today)}</td>
          <td>${primeMoverBalanceLabel(r.roadtax, today)}</td>
        </tr>`;
      }).join('')}
      </tbody></table>`;
  }

  function buildPrimeMoverDocPendingRows(rows){
    return (rows || [])
      .map(r => {
        const slots = PM_DOCUMENT_SLOTS.filter(s => pmDocMeta(r, s.id).pending);
        if (!slots.length) return null;
        let since = '';
        slots.forEach(s => {
          const d = pmDocMeta(r, s.id).doc.pendingSince || '';
          if (d && (!since || d < since)) since = d;
        });
        return { truck: r.lorry || '(No Truck)', slots, since };
      })
      .filter(Boolean)
      .sort((a,b) => b.slots.length - a.slots.length);
  }
  function renderPrimeMoverDocPendingTable(rows){
    if (!rows.length) return cdxEmpty('No documents pending upload.');
    return `<table class="cdx-table"><thead><tr><th>#</th><th>Truck No</th><th>Documents Pending Upload</th><th>Since</th></tr></thead><tbody>
      ${rows.map((r,i) => `<tr>
        <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
        <td><span class="truckchip">${escapeHtml(r.truck)}</span></td>
        <td>${r.slots.map(s => `<span class="badge warn">${escapeHtml(pmDocSlotLabel(s.id))}</span>`).join(' ')}</td>
        <td>${r.since ? escapeHtml(fmtDate(r.since)) : '-'}</td>
      </tr>`).join('')}
      </tbody></table>`;
  }

  function trailerBalanceLabel(dateStr, today){
    if (!dateStr || dateStr === '-') return 'No Date';
    const dt = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dt.getTime())) return 'No Date';
    const daysLeft = Math.round((dt - today) / 86400000);
    if (daysLeft > 20) return '-';
    if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
    return `${daysLeft} Days Balance`;
  }
  function buildTrailerExpiryRows(rows){
    const today = new Date(); today.setHours(0,0,0,0);
    const fields = ['permit','insurance','puspakom','roadtax'];
    return rows
      .map(r => {
        let minDays = null;
        fields.forEach(f => {
          if (!r[f] || r[f] === '-') return;
          const dt = new Date(`${r[f]}T00:00:00`);
          if (isNaN(dt.getTime())) return;
          const daysLeft = Math.round((dt - today) / 86400000);
          if (minDays === null || daysLeft < minDays) minDays = daysLeft;
        });
        if (minDays === null) return null;
        return {truck: (r.lorry || '(No Trailer)').trim(), permit: r.permit, insurance: r.insurance, puspakom: r.puspakom, roadtax: r.roadtax, minDays};
      })
      .filter(r => r && r.minDays <= 20)
      .sort((a,b) => a.minDays - b.minDays);
  }
  function renderTrailerExpiryTable(rows){
    if (!rows.length) return cdxEmpty('Nothing nearing expiry.');
    const today = new Date(); today.setHours(0,0,0,0);
    return `<table class="cdx-table"><thead><tr><th>#</th><th>Trailer No</th><th>Permit</th><th>Insurance</th><th>Puspakom</th><th>Roadtax</th></tr></thead><tbody>
      ${rows.map((r,i) => {
        return `<tr>
          <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
          <td><span class="truckchip">${escapeHtml(r.truck)}</span></td>
          <td>${trailerBalanceLabel(r.permit, today)}</td>
          <td>${trailerBalanceLabel(r.insurance, today)}</td>
          <td>${trailerBalanceLabel(r.puspakom, today)}</td>
          <td>${trailerBalanceLabel(r.roadtax, today)}</td>
        </tr>`;
      }).join('')}
      </tbody></table>`;
  }

  function buildAssetExpiryItems(rows, nameField, fields){
    const today = new Date(); today.setHours(0,0,0,0);
    const out = [];
    rows.forEach(r => {
      fields.forEach(f => {
        if (!r[f.id]) return;
        const dt = new Date(`${r[f.id]}T00:00:00`);
        if (isNaN(dt.getTime())) return;
        const daysLeft = Math.round((dt - today) / 86400000);
        if (daysLeft <= 20) out.push({truck: r[nameField] || '(No Truck)', item: f.label, daysLeft});
      });
    });
    return out.sort((a,b) => a.daysLeft - b.daysLeft);
  }

  function buildStaffStatusMatrix(rows, fields){
    const map = new Map();
    rows.forEach(r => {
      const key = r.designation || '(No Designation)';
      if (!map.has(key)) {
        const entry = {designation:key, total:0};
        fields.forEach(f => entry[f.id] = 0);
        map.set(key, entry);
      }
      const rec = map.get(key);
      rec.total += 1;
      fields.forEach(f => { if (r[f.id]) rec[f.id] += 1; });
    });
    return Array.from(map.values()).sort((a,b) => a.designation.localeCompare(b.designation));
  }

  function staffFieldDueDate(rawValue, field){
    if (!rawValue || rawValue === '-') return '';
    return field && field.calc ? field.calc(rawValue) : rawValue;
  }
  function staffBalanceLabel(dateStr, today){
    if (!dateStr || dateStr === '-') return 'No Date';
    const dt = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dt.getTime())) return 'No Date';
    const daysLeft = Math.round((dt - today) / 86400000);
    if (daysLeft > 20) return '-';
    if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
    return `${daysLeft} Days Balance`;
  }
  function buildStaffNearExpiryRows(rows, fields){
    const today = new Date(); today.setHours(0,0,0,0);
    return rows
      .map(r => {
        let minDays = null;
        fields.forEach(f => {
          const dueDateStr = staffFieldDueDate(r[f.id], f);
          if (!dueDateStr) return;
          const dt = new Date(`${dueDateStr}T00:00:00`);
          if (isNaN(dt.getTime())) return;
          const daysLeft = Math.round((dt - today) / 86400000);
          if (minDays === null || daysLeft < minDays) minDays = daysLeft;
        });
        if (minDays === null) return null;
        const row = {designation: r.designation || '(No Designation)', name: r.staffName || '(No Name)', minDays};
        fields.forEach(f => { row[f.id] = r[f.id]; });
        return row;
      })
      .filter(r => r && r.minDays <= 20)
      .sort((a,b) => a.minDays - b.minDays);
  }
  function renderStaffNearExpiryTable(rows, fields){
    if (!rows.length) return cdxEmpty('No staff nearing expiry.');
    const today = new Date(); today.setHours(0,0,0,0);
    return `<div class="tablewrap safety-eq-table"><table class="cdx-table"><thead><tr><th>#</th><th>Designation</th><th>Staff Name</th>${fields.map(f=>`<th>${f.label}</th>`).join('')}</tr></thead><tbody>
      ${rows.map((r,i) => `<tr>
        <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
        <td>${escapeHtml(r.designation)}</td>
        <td><div class="cdx-driver"><span class="cdx-avatar">${cdxInitials(r.name)}</span><span class="cdx-driver-name">${escapeHtml(r.name)}</span></div></td>
        ${fields.map(f => `<td>${staffBalanceLabel(staffFieldDueDate(r[f.id], f), today)}</td>`).join('')}
      </tr>`).join('')}
      </tbody></table></div>`;
  }

  const wrap = document.createElement('div');
  wrap.className = 'cdx-wrap';
  let activeTab = 'speeding';

  const CDX_ICONS = {
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
    clock: '<circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15.5 14"></polyline>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="3"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
    truck: '<rect x="1" y="4" width="14" height="12"></rect><polygon points="15 8 19 8 22 11 22 16 15 16 15 8"></polygon><circle cx="5.5" cy="18.5" r="2.3"></circle><circle cx="18" cy="18.5" r="2.3"></circle>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>',
    check: '<circle cx="12" cy="12" r="9"></circle><path d="M9 12l2 2 4-4"></path>',
  };
  function cdxIcon(name, size){
    const s = size || 16;
    return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CDX_ICONS[name]||''}</svg>`;
  }
  function cdxEmpty(text){
    return `<div class="cdx-empty">${cdxIcon('check',30)}<div>${text}</div></div>`;
  }
  function cdxInitials(name){
    const parts = String(name||'').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  function renderToolbar(){
    const presets = [
      {key:'all', label:'All'},
      {key:'7', label:'Last 7 Days'},
      {key:'30', label:'Last 30 Days'},
      {key:'month', label:'This Month'},
    ];
    return `
      <div class="cdx-toolbar">
        ${presets.map(p => `<button class="cdx-pill${rangeMode===p.key ? ' active' : ''}" data-range="${p.key}">${p.label}</button>`).join('')}
        <span class="cdx-date-sep">|</span>
        <input type="date" id="rangeFrom" class="cdx-date-input" value="${customFrom}">
        <span class="cdx-date-sep">to</span>
        <input type="date" id="rangeTo" class="cdx-date-input" value="${customTo}">
        <button class="cdx-pill${rangeMode==='custom' ? ' active' : ''}" id="rangeApplyBtn">Apply</button>
      </div>`;
  }

  function renderSpeedingTable(agg){
    if (!agg.length) return cdxEmpty('No speeding records for the selected range.');
    const max = Math.max(...agg.map(r => r.total), 1);
    return `<table class="cdx-table"><thead><tr><th>#</th><th>Driver</th><th>&gt;80</th><th>&gt;90</th><th>&gt;100</th><th>Total</th></tr></thead><tbody>
      ${agg.map((r,i) => `<tr>
        <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
        <td><div class="cdx-driver"><span class="cdx-avatar">${cdxInitials(r.driver)}</span><span class="cdx-driver-name">${escapeHtml(r.driver)}</span></div></td>
        <td class="r">${FMT.num(r.over80)}</td>
        <td class="r">${FMT.num(r.over90)}</td>
        <td class="r">${FMT.num(r.over100)}</td>
        <td class="r"><b>${FMT.num(r.total)}</b><span class="cdx-bar-track"><i class="cdx-bar-fill" style="width:${Math.round(r.total/max*100)}%"></i></span></td>
      </tr>`).join('')}
      </tbody></table>`;
  }

  function renderIdlingTable(agg){
    if (!agg.length) return cdxEmpty('No idling records for the selected range.');
    const max = Math.max(...agg.map(r => r.minutes), 1);
    return `<table class="cdx-table"><thead><tr><th>#</th><th>Driver</th><th>Idle Duration</th><th>Idle Cost</th></tr></thead><tbody>
      ${agg.map((r,i) => `<tr>
        <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
        <td><div class="cdx-driver"><span class="cdx-avatar">${cdxInitials(r.driver)}</span><span class="cdx-driver-name">${escapeHtml(r.driver)}</span></div></td>
        <td class="r">${formatIdleMinutes(r.minutes)}<span class="cdx-bar-track"><i class="cdx-bar-fill" style="width:${Math.round(r.minutes/max*100)}%"></i></span></td>
        <td class="r"><b>${FMT.money(r.cost)}</b></td>
      </tr>`).join('')}
      </tbody></table>`;
  }

  function renderMisconductTable(agg){
    if (!agg.length) return cdxEmpty('No open misconduct cases.');
    return `<table class="cdx-table"><thead><tr><th>#</th><th>Case Date</th><th>Driver</th><th>Case Category</th><th>Status</th></tr></thead><tbody>
      ${agg.map((r,i) => {
        const statusHtml = `<span class="cdx-pill-status open">${cdxIcon('alert',12)} Open</span>`;
        return `<tr>
          <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
          <td>${fmtDate(r.caseDate)}</td>
          <td><div class="cdx-driver"><span class="cdx-avatar">${cdxInitials(r.driver)}</span><span class="cdx-driver-name">${escapeHtml(r.driver)}</span></div></td>
          <td>${escapeHtml(r.category || '-')}</td>
          <td>${statusHtml}</td>
        </tr>`;
      }).join('')}
      </tbody></table>`;
  }

  function renderSafetyTruckTable(rows){
    if (!rows.length) return cdxEmpty('No records.');
    const today = new Date(); today.setHours(0,0,0,0);
    return `<div class="tablewrap safety-eq-table"><table class="cdx-table"><thead><tr><th>#</th><th>Asset</th><th>Inspection Date</th><th>First Aid Kit</th><th>Triangle</th><th>Cone (5 unit)</th><th>Wheel Chock</th><th>Reflective String</th><th>Torchlight</th></tr></thead><tbody>
      ${rows.map((r,i) => `<tr>
        <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
        <td><span class="truckchip">${escapeHtml(r.asset)}</span></td>
        <td>${fmtDate(r.inspectionDate)}</td>
        <td>${safetyItemBalanceLabel(r.firstAid, today)}</td>
        <td>${safetyItemBalanceLabel(r.triangle, today)}</td>
        <td>${safetyItemBalanceLabel(r.cone, today)}</td>
        <td>${safetyItemBalanceLabel(r.wheelChock, today)}</td>
        <td>${safetyItemBalanceLabel(r.reflectiveString, today)}</td>
        <td>${safetyItemBalanceLabel(r.torchlight, today)}</td>
      </tr>`).join('')}
      </tbody></table></div>`;
  }
  function renderSafetyStaffTable(rows){
    if (!rows.length) return cdxEmpty('No records.');
    const today = new Date(); today.setHours(0,0,0,0);
    return `<div class="tablewrap safety-eq-table"><table class="cdx-table"><thead><tr><th>#</th><th>Staff</th><th>Inspection Date</th><th>Safety Helmet</th><th>Safety Shoes</th><th>Reflective Vest</th></tr></thead><tbody>
      ${rows.map((r,i) => `<tr>
        <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
        <td><span class="truckchip">${escapeHtml(r.asset)}</span></td>
        <td>${fmtDate(r.inspectionDate)}</td>
        <td>${safetyItemBalanceLabel(r.helmet, today)}</td>
        <td>${safetyItemBalanceLabel(r.safetyShoes, today)}</td>
        <td>${safetyItemBalanceLabel(r.reflectiveVest, today)}</td>
      </tr>`).join('')}
      </tbody></table></div>`;
  }

  function renderFegTable(rows){
    if (!rows.length) return cdxEmpty('No fire extinguishers nearing expiry.');
    const today = new Date(); today.setHours(0,0,0,0);
    return `<table class="cdx-table"><thead><tr><th>#</th><th>Asset / Location</th><th>Serial</th><th>Item</th><th>Expiry Date</th><th>Balance</th></tr></thead><tbody>
      ${rows.map((r,i) => {
        return `<tr>
          <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
          <td><span class="truckchip">${escapeHtml(r.truck)}</span></td>
          <td>${escapeHtml(r.serial || '-')}</td>
          <td>${escapeHtml(r.item || '-')}</td>
          <td>${r.date ? fmtDate(r.date) : '-'}</td>
          <td>${fegBalanceLabel(r.date, today)}</td>
        </tr>`;
      }).join('')}
      </tbody></table>`;
  }

  function renderAssetExpiryTable(rows, colLabel){
    if (!rows.length) return cdxEmpty('Nothing nearing expiry.');
    return `<table class="cdx-table"><thead><tr><th>#</th><th>${colLabel}</th><th>Item</th><th>Balance Days</th></tr></thead><tbody>
      ${rows.map((r,i) => {
        const expired = r.daysLeft < 0;
        const daysText = expired ? `Expired ${Math.abs(r.daysLeft)}d ago` : `${r.daysLeft}d left`;
        return `<tr>
          <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
          <td><span class="truckchip">${escapeHtml(r.truck)}</span></td>
          <td>${escapeHtml(r.item)}</td>
          <td><span class="cdx-countdown ${expired?'bad':'warn'}">${cdxIcon(expired?'alert':'clock',12)} ${daysText}</span></td>
        </tr>`;
      }).join('')}
      </tbody></table>`;
  }

  function renderStaffStatusMatrix(rows, fields){
    if (!rows.length) return cdxEmpty('No staff records.');
    return `<table class="cdx-table"><thead><tr><th>Designation</th><th>Total</th>${fields.map(f=>`<th>${f.label}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(r => {
        const cells = fields.map(f => {
          const count = r[f.id];
          const pct = r.total ? Math.round(count / r.total * 100) : 0;
          const color = pct === 100 ? 'var(--green)' : (pct === 0 ? 'var(--line)' : 'var(--amber)');
          return `<td><div class="cdx-progress-cell">
            <div class="cdx-progress-track"><div class="cdx-progress-fill" style="width:${pct}%;background:${color};"></div></div>
            <span class="cdx-progress-label">${count}/${r.total} &middot; ${pct}%</span>
          </div></td>`;
        }).join('');
        return `<tr><td><b>${escapeHtml(r.designation)}</b></td><td class="r">${FMT.num(r.total)}</td>${cells}</tr>`;
      }).join('')}
      </tbody></table>`;
  }

  function cdxCard(icon, title, sub, badge, bodyHtml, id){
    return `<div class="cdx-card">
      <div class="cdx-card-head">
        <div class="cdx-card-title"><span class="ico">${cdxIcon(icon,16)}</span><div><h4>${title}</h4>${sub ? `<span class="sub">${sub}</span>` : ''}</div></div>
        ${badge != null ? `<span class="cdx-card-badge">${badge}</span>` : ''}
      </div>
      <div class="cdx-card-body" id="${id}">${bodyHtml}</div>
    </div>`;
  }

  function renderAll(){
    const speedingAgg = buildSpeedingAgg(speeding);
    const idlingAgg = buildIdlingAgg(speeding);
    const misconductAgg = buildMisconductAgg(misconduct);
    const safetyTruckRows = buildSafetyRows(safetyEquipment, 'Truck', SAFETY_TRUCK_ITEMS);
    const safetyStaffRows = buildSafetyRows(safetyEquipment, 'Staff', SAFETY_STAFF_ITEMS);
    const fegRows = buildFegExpiry(feg);
    const primeMoverExpiryRows = buildPrimeMoverExpiryRows(primeMover);
    const primeMoverDocPendingRows = buildPrimeMoverDocPendingRows(primeMover);
    const trailerExpiryRows = buildTrailerExpiryRows(trailer);
    const staffStatusRows = buildStaffStatusMatrix(staffDatabase, STAFF_STATUS_FIELDS);
    const staffNearExpiryRows = buildStaffNearExpiryRows(staffDatabase, STAFF_STATUS_FIELDS);

    const totalSpeedingEvents = speeding.reduce((s,r) => inRange(r.date) ? s + (Number(r.over80)||0) + (Number(r.over90)||0) + (Number(r.over100)||0) : s, 0);
    const totalIdleCost = speeding.reduce((s,r) => inRange(r.date) ? s + (Number(r.idleCost)||0) : s, 0);
    const openMisconductCount = misconduct.filter(r => (r.status||'').trim().toLowerCase()==='open').length;
    const expiryWatchCount = fegRows.length + primeMoverExpiryRows.length + trailerExpiryRows.length;

    const tabs = [
      {key:'speeding', label:'Speeding & Idling', icon:'activity', count: speedingAgg.length + idlingAgg.length},
      {key:'misconduct', label:'Misconduct', icon:'alert', count: misconductAgg.length},
      {key:'safety', label:'Safety Equipment', icon:'shield', count: safetyTruckRows.length + safetyStaffRows.length},
      {key:'expiry', label:'Expiry Watch', icon:'calendar', count: expiryWatchCount},
      {key:'staff', label:'Staff', icon:'users', count: staffDatabase.length},
    ];

    wrap.innerHTML = `
      <div class="cdx-statgrid">
        <div class="mini-stat" style="--stat-accent:var(--red)">
          <div class="label">${cdxIcon('activity')}Speeding Events</div>
          <div class="value">${FMT.num(totalSpeedingEvents)}</div>
          <div class="meta">&gt;80 / &gt;90 / &gt;100 km/h combined &middot; ${currentRangeLabel()}</div>
        </div>
        <div class="mini-stat" style="--stat-accent:var(--amber)">
          <div class="label">${cdxIcon('clock')}Idle Cost</div>
          <div class="value">${FMT.money(totalIdleCost)}</div>
          <div class="meta">${currentRangeLabel()} idling</div>
        </div>
        <div class="mini-stat" style="--stat-accent:var(--red)">
          <div class="label">${cdxIcon('alert')}Open Misconduct</div>
          <div class="value">${FMT.num(openMisconductCount)}</div>
          <div class="meta">of ${misconduct.length} total cases</div>
        </div>
        <div class="mini-stat" style="--stat-accent:var(--amber)">
          <div class="label">${cdxIcon('calendar')}Nearing Expiry</div>
          <div class="value">${FMT.num(expiryWatchCount)}</div>
          <div class="meta">FEG + Prime Mover + Trailer</div>
        </div>
        <div class="mini-stat" style="--stat-accent:var(--teal)">
          <div class="label">${cdxIcon('users')}Total Staff</div>
          <div class="value">${FMT.num(staffDatabase.length)}</div>
          <div class="meta">All designations</div>
        </div>
        <div class="mini-stat" style="--stat-accent:var(--green)">
          <div class="label">${cdxIcon('shield')}Safety Equipment</div>
          <div class="value">${FMT.num(safetyTruckRows.length + safetyStaffRows.length)}</div>
          <div class="meta">Trucks + Staff flagged</div>
        </div>
      </div>

      <div class="cdx-tabs">
        ${tabs.map(t => `<button class="cdx-tab${activeTab===t.key?' active':''}" data-tab="${t.key}">${cdxIcon(t.icon,14)} ${t.label} <span class="count">${t.count}</span></button>`).join('')}
      </div>

      <div class="cdx-panel${activeTab==='speeding'?' active':''}" data-panel="speeding">
        <div class="cdx-card">
          <div class="cdx-card-body">${renderToolbar()}</div>
        </div>
        ${cdxCard('activity','Top Speeding Drivers','by speed threshold', speedingAgg.length, renderSpeedingTable(speedingAgg), 'speedingHost')}
        ${cdxCard('clock','Top Idling Drivers','by total idle duration & cost', idlingAgg.length, renderIdlingTable(idlingAgg), 'idlingHost')}
      </div>

      <div class="cdx-panel${activeTab==='misconduct'?' active':''}" data-panel="misconduct">
        ${cdxCard('alert','Misconduct Cases by Driver', `${misconduct.length} records`, null, renderMisconductTable(misconductAgg), 'misconductHost')}
      </div>

      <div class="cdx-panel${activeTab==='safety'?' active':''}" data-panel="safety">
        ${cdxCard('truck','Safety Equipment — Truck', `${safetyTruckRows.length} trucks`, null, renderSafetyTruckTable(safetyTruckRows), 'safetyTruckHost')}
        ${cdxCard('users','Safety Equipment — Staff', `${safetyStaffRows.length} staff`, null, renderSafetyStaffTable(safetyStaffRows), 'safetyStaffHost')}
      </div>

      <div class="cdx-panel${activeTab==='expiry'?' active':''}" data-panel="expiry">
        ${cdxCard('flame','FEG', '&le; 20 days or expired', fegRows.length, renderFegTable(fegRows), 'fegHost')}
        ${cdxCard('truck','Prime Mover', '&le; 20 days or expired', primeMoverExpiryRows.length, renderPrimeMoverExpiryTable(primeMoverExpiryRows), 'primeMoverExpiryHost')}
        ${cdxCard('alert','Documents Pending Upload', 'expiry date updated, new file not uploaded yet', primeMoverDocPendingRows.length, renderPrimeMoverDocPendingTable(primeMoverDocPendingRows), 'primeMoverDocPendingHost')}
        ${cdxCard('truck','Trailer', '&le; 20 days or expired', trailerExpiryRows.length, renderTrailerExpiryTable(trailerExpiryRows), 'trailerExpiryHost')}
      </div>

      <div class="cdx-panel${activeTab==='staff'?' active':''}" data-panel="staff">
        ${cdxCard('users','Staff Status Coverage by Designation', 'License / GDL / Drug / Alcohol / Medical status', `${staffDatabase.length} staff total`, renderStaffStatusMatrix(staffStatusRows, STAFF_STATUS_FIELDS), 'staffStatusHost')}
        ${cdxCard('calendar','Staff Nearing Expiry', '&le; 20 days or expired', staffNearExpiryRows.length, renderStaffNearExpiryTable(staffNearExpiryRows, STAFF_STATUS_FIELDS), 'staffNearExpiryHost')}
      </div>
    `;

    wrap.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        wrap.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
        wrap.querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('active', p.dataset.panel === activeTab));
      });
    });

    wrap.querySelectorAll('[data-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        rangeMode = btn.dataset.range;
        customFrom = ''; customTo = '';
        renderAll();
      });
    });
    const applyBtn = wrap.querySelector('#rangeApplyBtn');
    if (applyBtn){
      applyBtn.addEventListener('click', () => {
        customFrom = wrap.querySelector('#rangeFrom').value;
        customTo = wrap.querySelector('#rangeTo').value;
        rangeMode = 'custom';
        renderAll();
      });
    }
  }

  renderAll();
  return wrap;
}

/* ============================================================
   PAGE: MISCONDUCT (map + table)
============================================================= */
async function openMisconductModal(index, coordinates, onDone){
  const def = TABLES.misconduct;
  const existing = index == null ? {} : ((DATA_CACHE.misconduct || [])[index] || {});
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  const FIELD_ORDER = ['caseDate','branch','driver','truck','category','latitude','longitude','description',
    'interview','form','emailHr','driverSignForm','emailCustomer','investigationReport','fishboneAnalysis',
    'managementPresentation','emailResultCustomer','status','remark'];
  let fields = '';
  FIELD_ORDER.forEach(id => {
    const c = def.columns.find(col => col.id === id);
    if (!c || String(c.type || '').indexOf('computed') === 0) return;
    const value = id === 'latitude' ? coordinates.lat.toFixed(6) : id === 'longitude' ? coordinates.lng.toFixed(6) : (existing[id] ?? '');
    if (c.type === 'date') fields += `<div class="formfield"><label>${c.label}</label><input data-col="${id}" type="date" value="${escapeHtml(value)}"></div>`;
    else if (id === 'latitude' || id === 'longitude') fields += `<div class="formfield"><label>${c.label}</label><input data-col="${id}" type="text" value="${escapeHtml(value)}" readonly></div>`;
    else fields += `<div class="formfield"><label>${c.label}</label><input data-col="${id}" type="text" value="${escapeHtml(value)}"></div>`;
  });
  box.innerHTML = `<h4>${index == null ? 'Add' : 'Edit'} Misconduct Record</h4><div class="notice notice-info" style="margin-bottom:14px;">Location selected on map: <strong>${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}</strong></div><div class="formgrid">${fields}</div><div class="modalfoot"><button class="btn" id="cancelModal">Cancel</button><button class="btn primary" id="saveModal">Save Record</button></div>`;
  overlay.classList.add('show');
  await wireMisconductPickers(box, existing);
  box.querySelector('#cancelModal').onclick = () => overlay.classList.remove('show');
  box.querySelector('#saveModal').onclick = async () => {
    const record = {...existing, latitude:coordinates.lat, longitude:coordinates.lng};
    def.columns.forEach(c => {
      if (String(c.type || '').indexOf('computed') === 0) return;
      const field = box.querySelector(`[data-col="${c.id}"]`);
      record[c.id] = field ? field.value : '';
    });
    const rows = await getData('misconduct');
    if (index == null) rows.unshift(record); else rows[index] = record;
    await persist('misconduct');
    overlay.classList.remove('show');
    if (onDone) await onDone();
  };
}

function createMisconductMapController(context){
  const controller = {map:null, markers:null, editIndex:null};
  const mapHost = context.wrap.querySelector('#misconductMap');
  const notice = context.wrap.querySelector('#misconductMapNotice');
  const setNotice = message => { if (notice) notice.textContent = message; };
  const validCoordinates = row => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude));
  controller.renderMarkers = async () => {
    if (!controller.map || !controller.markers) return;
    controller.markers.clearLayers();
    (await getData('misconduct')).forEach((row, index) => {
      if (!validCoordinates(row)) return;
      const marker = L.marker([Number(row.latitude), Number(row.longitude)]).addTo(controller.markers);
      const caseNo = index + 1;
      marker.bindPopup(`<div class="misconduct-pin-popup"><div class="mp-title">Misconduct #${caseNo}</div><div class="mp-row"><span class="mp-k">Driver:</span> <span class="mp-v">${escapeHtml(row.driver || '-')}</span></div><div class="mp-row"><span class="mp-k">Date:</span> <span class="mp-v">${escapeHtml(fmtDate(row.caseDate))}</span></div><div class="mp-row"><span class="mp-k">Type:</span> <span class="mp-v">${escapeHtml(row.category || '-')}</span></div><div class="mp-row"><span class="mp-k">Lat/Long:</span> <span class="mp-v">${escapeHtml(Number(row.latitude).toFixed(5))}, ${escapeHtml(Number(row.longitude).toFixed(5))}</span></div></div>`);
    });
  };
  controller.focusRecord = async index => {
    const row = (await getData('misconduct'))[index];
    if (!row || !validCoordinates(row)){ setNotice('This record has no saved map location yet. Use Edit, then click the map to set one.'); return; }
    if (!controller.map) return;
    const latlng = L.latLng(Number(row.latitude), Number(row.longitude));
    controller.map.setView(latlng, 12, {animate:true});
    controller.markers.eachLayer(marker => { if (marker.getLatLng().equals(latlng)) marker.openPopup(); });
  };
  controller.refresh = async () => {
    const all = await getData('misconduct');
    const valEl = context.wrap.querySelector('[data-tblfilter-val="branch"]');
    const active = valEl ? (valEl.textContent || '').trim() : '';
    const opts = Object.assign({}, context.tableOptions);
    if (active && active !== 'All') opts.rowFilterFn = row => (row.branch || '') === active;
    const rows = (opts.rowFilterFn ? all.filter(opts.rowFilterFn) : all);
    context.tableHost.innerHTML = buildTableHTML('misconduct', rows, context.search.value, opts);
    const pill = context.wrap.querySelector('.eyebrow');
    if (pill) pill.textContent = `${rows.length} records`;
    await controller.renderMarkers();
  };
  controller.requestAdd = () => setNotice('Click a point on the Peninsular Malaysia map to add a Misconduct record.');
  controller.requestEdit = async index => {
    const row = (await getData('misconduct'))[index];
    const coordinates = (row && validCoordinates(row))
      ? L.latLng(Number(row.latitude), Number(row.longitude))
      : L.latLng(3.5, 102.5);
    await controller.focusRecord(index);
    openMisconductModal(index, coordinates, async () => {
      setNotice('Record updated.');
      await controller.refresh();
    });
  };
  controller.deleteRecord = async index => {
    const rows = await getData('misconduct');
    if (!confirm('Delete this misconduct record and its map marker?')) return;
    rows.splice(index, 1); await persist('misconduct'); setNotice('Record and its marker were removed.'); await controller.refresh();
  };
  setTimeout(async () => {
    if (!window.L){ mapHost.innerHTML = '<div style="padding:28px;color:var(--muted);">Map could not be loaded. Please check the internet connection and reopen this page.</div>'; setNotice('Map is unavailable until the mapping service loads.'); return; }
    const bounds = L.latLngBounds([[0.7,99.4],[7.6,105.7]]);
    controller.map = L.map(mapHost, {maxBounds:bounds, maxBoundsViscosity:1, minZoom:6, zoomControl:true}).fitBounds(bounds.pad(-0.08));
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=cb1_34bo_1_874ce241927909d248dc152d', {maxZoom:18, subdomains:'abcd', attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>', noWrap:true}).addTo(controller.map);
    let tileErrorNotified = false;
    tileLayer.on('tileerror', () => {
      if (tileErrorNotified) return;
      tileErrorNotified = true;
      setNotice('Map tiles could not be loaded right now — the map may appear blank. You can still click on it to set a location.');
    });
    controller.markers = L.layerGroup().addTo(controller.map);
    controller.map.on('click', event => {
      const coordinates = event.latlng; const editingIndex = controller.editIndex; controller.editIndex = null;
      if (editingIndex == null) openMisconductModal(null, coordinates, async () => { setNotice('Record saved. Its marker is now shown on the map.'); await controller.refresh(); });
      else openMisconductModal(editingIndex, coordinates, async () => { setNotice('Record and marker location updated.'); await controller.refresh(); });
    });
    await controller.renderMarkers();
    setNotice('Click the map to choose a location and add a Misconduct record.');
  }, 0);
  return controller;
}

async function renderMisconductPage(){
  let controller;
  const tableOptions = {
    onEditRow: index => controller && controller.requestEdit(index),
    onDeleteRow: index => controller && controller.deleteRecord(index),
    onRowClick: index => controller && controller.focusRecord(index),
  };
  const wrap = await renderDataPage('misconduct', {
    wrapperClass: 'opkpi-modern-page',
    filterFields: ['branch'],
    beforeSectionHtml: `<div class="section misconduct-map-shell"><div class="misconduct-map-head"><div><h3>Misconduct Location Map</h3><p class="misconduct-map-help">Peninsular Malaysia only. Click the map to set the incident location and open the record form.</p></div><span class="eyebrow">Map-based location</span></div><div id="misconductMap" aria-label="Peninsular Malaysia misconduct map"></div><div class="misconduct-map-notice" id="misconductMapNotice">Loading map…</div></div>`,
    tableOptions,
    onAddRow: () => controller && controller.requestAdd(),
  });
  controller = createMisconductMapController({wrap, tableHost:wrap.querySelector('#tableHost'), search:wrap.querySelector('.searchbox'), tableOptions});
  return wrap;
}