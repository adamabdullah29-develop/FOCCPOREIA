/* =========================================================================
   FOCC — 10-pages-notify.js
   FEG module: list, detail, disposal, service history, inspection, documents.
   ========================================================================= */

/* =========================================================================
   BAHAGIAN A — FEG pages (list / disposal / service history)
   ========================================================================= */

/* ============================================================
   FEG — Open key (session persistence)
============================================================= */
function fegRememberOpen(row){
  try{
    const v = row ? String(row.assetId || row.assetRef || '') : '';
    if (v) sessionStorage.setItem(FEG_OPEN_KEY, v);
    else sessionStorage.removeItem(FEG_OPEN_KEY);
  }catch(e){}
}
function fegForgetOpen(){
  try{ sessionStorage.removeItem(FEG_OPEN_KEY); }catch(e){}
}
function fegRecallOpenIndex(rows){
  let want = '';
  try{ want = sessionStorage.getItem(FEG_OPEN_KEY) || ''; }catch(e){ want = ''; }
  if (!want) return -1;
  return (rows || []).findIndex(r => r && (String(r.assetId || '') === want || String(r.assetRef || '') === want));
}
function fegRowKey(row){
  return row ? String(row.assetId || row.assetRef || '') : '';
}

/* Fasa 5: lompat dari Service History terus ke dokumen unit */
function fegJumpSet(assetId, unitId, slots){
  try{
    sessionStorage.setItem(FEG_JUMP_KEY, JSON.stringify({
      assetId: String(assetId || ''),
      unitId : String(unitId  || ''),
      slots  : Array.isArray(slots) ? slots : []
    }));
  }catch(e){}
}
function fegJumpPeek(){
  let v = null;
  try{ v = JSON.parse(sessionStorage.getItem(FEG_JUMP_KEY) || 'null'); }catch(e){ v = null; }
  return (v && typeof v === 'object') ? v : null;
}
function fegJumpTake(){
  const v = fegJumpPeek();
  try{ sessionStorage.removeItem(FEG_JUMP_KEY); }catch(e){}
  return v;
}
function fegApplyJumpFocus(root, jump, row){
  const units = (row && row.units) || [];
  const ui = units.findIndex(u => u && String(u.unitId || '') === String((jump && jump.unitId) || ''));
  if (ui < 0) return;
  const slots = (jump && Array.isArray(jump.slots)) ? jump.slots : [];
  let first = null;
  slots.forEach(slotId => {
    const el = root.querySelector(`.pm-doc-row[data-doc-unit="${ui}"][data-slot="${slotId}"]`);
    if (!el) return;
    if (!first) first = el;
    el.classList.add('is-flagged');
    setTimeout(() => el.classList.remove('is-flagged'), 3400);
  });
  if (first) setTimeout(() => first.scrollIntoView({behavior:'smooth', block:'center'}), 150);
}

function fegDocPageSave(row, unit){
  try{
    const k = FEG_DOC_UNIT_KEY + fegRowKey(row);
    if (unit && unit.unitId) sessionStorage.setItem(k, String(unit.unitId));
    else sessionStorage.removeItem(k);
  }catch(e){}
}
function fegDocPageIndex(row){
  const units = (row && Array.isArray(row.units)) ? row.units : [];
  if (!units.length) return 0;
  let want = '';
  try{ want = sessionStorage.getItem(FEG_DOC_UNIT_KEY + fegRowKey(row)) || ''; }catch(e){ want = ''; }
  const i = want ? units.findIndex(u => String((u && u.unitId) || '') === want) : -1;
  return i >= 0 ? i : 0;
}

/* ============================================================
   FEG — after-add helper
============================================================= */
async function fegAfterAdd(){
  const qty = (FEG_PENDING_QTY > 0) ? Math.min(FEG_PENDING_QTY, FEG_MAX_UNITS) : 1;
  FEG_PENDING_QTY = 0;
  try{
    const all = await getData('feg');
    const row = (all && all[0]) ? all[0] : null;
    if (!row) return;
    if (!Array.isArray(row.units) || !row.units.length){
      row.assetId   = row.assetId || fegNewId('FEG');
      row.units     = Array.from({ length: qty }, () => fegNewUnit());
      row.createdBy = getSessionEmail() || '';
      row.createdAt = new Date().toISOString();
      await persist('feg');
    }
  }catch(e){
    console.error('FEG post-add failed', e);
    alert('Rekod disimpan, tetapi unit tidak dapat dicipta: ' + (e && e.message ? e.message : e));
  }
}

/* ============================================================
   FEG — Page (list)
============================================================= */
async function renderFegPage(){
  const root = document.createElement('div');

  async function showList(){
    fegForgetOpen();
    const listWrap = await renderDataPage('feg', {
      wrapperClass: 'opkpi-modern-page',
      filterFields: ['branch'],
      showComplianceAlertButton: true,
      onComplianceAlert: () => openComplianceAlertModal('feg'),
      onAddRow: () => openAddRowModal('feg', async () => {
        await fegAfterAdd();
        await showList();
      }, {
        completeLabel: 'Save &amp; Complete Details',
        onComplete: async () => {
          await fegAfterAdd();
          await renderFegDetailView(root, 0, showList, { startEditing: true });
        },
      }),
      tableOptions: {
        linkColumnId: 'assetRef',
        onLinkClick: async index => { await renderFegDetailView(root, index, showList); },
        onEditRow:   async index => { await renderFegDetailView(root, index, showList, { startEditing: true }); },
      },
    });
    ['#importBtn', '#undoBtn', '#importFile'].forEach(sel => {
      const el = listWrap.querySelector(sel);
      if (el) el.style.display = 'none';
    });

    root.innerHTML = '';
    root.appendChild(listWrap);
  }

  const fegRows = await getData('feg');
  const openIdx = fegRecallOpenIndex(fegRows);
  if (openIdx >= 0){
    const jrow = fegRows[openIdx];
    const peek = fegJumpPeek();
    const jump = (jrow && peek && String(peek.assetId || '') === fegRowKey(jrow)) ? fegJumpTake() : null;
    if (jump && jrow){
      const units = jrow.units || [];
      const ui = units.findIndex(u => u && String(u.unitId || '') === String(jump.unitId || ''));
      if (ui >= 0) fegDocPageSave(jrow, units[ui]);
      await renderFegDetailView(root, openIdx, showList);
      fegApplyJumpFocus(root, jump, jrow);
    } else {
      await renderFegDetailView(root, openIdx, showList);
    }
  } else await showList();
  return root;
}

/* ============================================================
   FEG — Disposal page
============================================================= */
async function renderFegDisposalPage(){
  const root = document.createElement('div');
  const canEdit = fegCanDispose();
  let branch = '';
  let term   = '';

  await getData('feg');

  function entriesAll(){
    const out = [];
    (DATA_CACHE.feg || []).forEach(row => {
      (row.units || []).forEach(unit => { if (fegIsDisposed(unit)) out.push({ row: row, unit: unit }); });
    });
    out.sort((a,b) => String(b.unit.disposedAt || '').localeCompare(String(a.unit.disposedAt || '')));
    return out;
  }
  function entriesVisible(list){
    const t = term.trim().toLowerCase();
    return list.filter(e => {
      if (branch && String(e.row.branch || '') !== branch) return false;
      if (!t) return true;
      return [e.row.assetRef, e.row.assetType, e.row.branch, fegSerialLabel(e.unit), e.unit.fegType,
              e.unit.capacity, e.unit.disposalVendor, e.unit.disposalReason, e.unit.disposedBy]
        .map(v => String(v == null ? '' : v)).join(' ').toLowerCase().includes(t);
    });
  }
  function stamp(iso){
    if (!iso) return '-';
    const raw = String(iso);
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fmtDate(raw);
    return fmtDate(raw.slice(0,10)) + ' &middot; ' +
      d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  }

  function paint(){
    const all      = entriesAll();
    const branches = [...new Set((DATA_CACHE.feg || []).map(r => String((r && r.branch) || '').trim()).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b));
    const rows = entriesVisible(all);

    root.innerHTML = `
      <div class="section">
        <div class="section-head">
          <span class="eyebrow">${rows.length} disposed unit${rows.length === 1 ? '' : 's'}</span>
          <div class="spacer"></div>
          <span class="pm-doc-note">AUTO &mdash; from FEG Detail (unit Disposal = Yes)</span>
        </div>
        <div class="section-body">
          <div class="toolbar">
            <input class="searchbox" id="fegDisSearch" type="text" placeholder="Search asset, serial, vendor..." value="${escapeHtml(term)}">
            <span class="tblfilter-wrap">
              <span class="tblfilter-lbl">Branch:</span>
              <button type="button" class="tblfilter-btn" id="fegDisBranchBtn" aria-haspopup="listbox" aria-expanded="false">
                <span class="tblfilter-val" id="fegDisBranchVal">${escapeHtml(branch || 'All')}</span>
                <svg class="tblfilter-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <div class="tblfilter-panel" id="fegDisBranchPanel" role="listbox"></div>
            </span>
            <div class="toolbar-actions" style="display:flex;gap:8px;align-items:center">
              <button class="btn" id="fegDisExport"><span class="lbl-full">Export Data</span><span class="lbl-short">Export</span></button>
            </div>
          </div>
          ${rows.length ? `
          <div class="tablewrap">
            <table class="cdx-table">
              <thead><tr>
                <th>Date Disposed</th><th>Asset / Location</th><th>Category</th><th>Branch</th>
                <th>Serial</th><th>Type</th><th>Capacity</th><th>Vendor</th><th>Reason</th><th>Disposed By</th>
                ${canEdit ? '<th>Action</th>' : ''}
              </tr></thead>
              <tbody>
                ${rows.map((e, i) => `
                  <tr>
                    <td>${stamp(e.unit.disposedAt)}${e.unit.disposedLoggedAt ? `<div class="settings-note" style="margin:2px 0 0;">Recorded ${stamp(e.unit.disposedLoggedAt)}</div>` : ''}</td>
                    <td>${escapeHtml(e.row.assetRef || '-')}</td>
                    <td>${escapeHtml(e.row.assetType || '-')}</td>
                    <td>${escapeHtml(e.row.branch || '-')}</td>
                    <td>${escapeHtml(fegSerialLabel(e.unit) || '(no serial)')}</td>
                    <td>${escapeHtml(e.unit.fegType || '-')}</td>
                    <td>${escapeHtml(e.unit.capacity || '-')}</td>
                    <td>${escapeHtml(e.unit.disposalVendor || '-')}</td>
                    <td>${escapeHtml(e.unit.disposalReason || '-')}${e.unit.disposalNote ? `<div class="settings-note" style="margin:2px 0 0;">${escapeHtml(e.unit.disposalNote)}</div>` : ''}</td>
                    <td>${escapeHtml(e.unit.disposedBy || '-')}</td>
                    ${canEdit ? `<td><button type="button" class="btn" data-feg-restore-row="${i}">Restore</button></td>` : ''}
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : `<div class="settings-note" style="margin-top:0;">No disposed units yet. Dispose from FEG &rarr; open the Detail Page &rarr; <b>Dispose</b> button on the unit row.</div>`}
        </div>
      </div>`;

    const searchEl = root.querySelector('#fegDisSearch');
    if (searchEl){
      searchEl.addEventListener('input', () => {
        term = searchEl.value;
        paint();
        setTimeout(() => {
          const s = root.querySelector('#fegDisSearch');
          if (s){ s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
        }, 0);
      });
    }

    const bBtn   = root.querySelector('#fegDisBranchBtn');
    const bPanel = root.querySelector('#fegDisBranchPanel');
    if (bBtn && bPanel){
      const paintPanel = () => {
        bPanel.innerHTML = ['', ...branches].map(v => `
          <div class="tblfilter-option${branch === v ? ' is-active' : ''}" data-value="${escapeHtml(v)}" role="option">
            <span>${escapeHtml(v || 'All')}</span>
            <svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>`).join('');
      };
      bBtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = bPanel.classList.toggle('open');
        bBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) paintPanel();
      });
      bPanel.addEventListener('click', e => {
        const opt = e.target.closest('.tblfilter-option');
        if (!opt) return;
        branch = String(opt.dataset.value || '');
        bPanel.classList.remove('open');
        bBtn.setAttribute('aria-expanded','false');
        paint();
      });
    }

    const exBtn = root.querySelector('#fegDisExport');
    if (exBtn) exBtn.addEventListener('click', () => {
      const cols = ['Date Disposed','Asset / Location','Category','Branch','Serial','Type','Capacity','Vendor','Reason','Note','Disposed By'];
      const q = v => '"' + String(v == null ? '' : v).replace(/"/g,'""') + '"';
      const lines = [cols.map(q).join(',')].concat(rows.map(e => [
        e.unit.disposedAt || '', e.row.assetRef || '', e.row.assetType || '', e.row.branch || '',
        fegSerialLabel(e.unit), e.unit.fegType || '', e.unit.capacity || '',
        e.unit.disposalVendor || '', e.unit.disposalReason || '', e.unit.disposalNote || '', e.unit.disposedBy || ''
      ].map(q).join(',')));
      downloadBlob(new Blob([lines.join('\r\n')], {type:'text/csv;charset=utf-8;'}),
        'FEG-Disposal-' + new Date().toISOString().slice(0,10) + '.csv');
    });

    root.querySelectorAll('[data-feg-restore-row]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const e = rows[Number(btn.dataset.fegRestoreRow)];
        if (!e) return;
        const ok = await confirmModal('Restore Extinguisher',
          'Unit <strong>' + escapeHtml(fegSerialLabel(e.unit) || '(no serial)') + '</strong> at <strong>' +
          escapeHtml(e.row.assetRef || '-') + '</strong> will be restored to active and will <strong>disappear</strong> from this page.',
          { confirmLabel:'Restore', tone:'warning' });
        if (!ok) return;
        btn.disabled = true;
        try{ await fegRestoreUnit(e.row, e.unit); paint(); }
        catch(err){ btn.disabled = false; alert('Restore failed: ' + (err && err.message ? err.message : err)); }
      });
    });
  }

  paint();
  return root;
}

/* ============================================================
   FEG — Service History page
============================================================= */
async function renderFegServiceHistoryPage(){
  const root = document.createElement('div');
  const canComplete = fegCanDispose();
  const canDelete   = true;
  let branch = '';
  let term   = '';

  await getData('feg');

  function entriesAll(){
    return fegServiceEntries()
      .filter(e => e.rec && (e.rec.status === 'Active' || e.rec.status === 'Completed'));
  }
  function entriesVisible(list){
    const t = term.trim().toLowerCase();
    return list.filter(e => {
      if (branch && String(e.row.branch || '') !== branch) return false;
      if (!t) return true;
      return [e.row.assetRef, e.row.assetType, e.row.branch, fegSerialLabel(e.unit), e.unit.fegType,
              e.unit.capacity, e.rec.vendor, e.rec.reason, e.rec.serviceBy, e.rec.status]
        .map(v => String(v == null ? '' : v)).join(' ').toLowerCase().includes(t);
    });
  }
  function stamp(iso){
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return fmtDate(String(iso).slice(0,10)) + ' &middot; ' +
      d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  }
  function statusBadge(s){
    const v = String(s || '');
    return `<span class="badge ${v === 'Completed' ? 'good' : 'warn'}">${escapeHtml(v || '-')}</span>`;
  }

  function paint(){
    const all      = entriesAll();
    const branches = [...new Set((DATA_CACHE.feg || []).map(r => String((r && r.branch) || '').trim()).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b));
    const rows = entriesVisible(all);

    root.innerHTML = `
      <div class="section">
        <div class="section-head">
          <span class="eyebrow">${rows.length} service record${rows.length === 1 ? '' : 's'}</span>
          <div class="spacer"></div>
          <span class="pm-doc-note">AUTO &mdash; from FEG Detail (unit Service button)</span>
        </div>
        <div class="section-body">
          <div class="toolbar">
            <input class="searchbox" id="fegSvcSearch" type="text" placeholder="Search asset, serial, vendor..." value="${escapeHtml(term)}">
            <span class="tblfilter-wrap">
              <span class="tblfilter-lbl">Branch:</span>
              <button type="button" class="tblfilter-btn" id="fegSvcBranchBtn" aria-haspopup="listbox" aria-expanded="false">
                <span class="tblfilter-val" id="fegSvcBranchVal">${escapeHtml(branch || 'All')}</span>
                <svg class="tblfilter-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <div class="tblfilter-panel" id="fegSvcBranchPanel" role="listbox"></div>
            </span>
            <div class="toolbar-actions" style="display:flex;gap:8px;align-items:center">
              <button class="btn" id="fegSvcExport"><span class="lbl-full">Export Data</span><span class="lbl-short">Export</span></button>
            </div>
          </div>
          ${rows.length ? `
          <div class="tablewrap">
            <table class="cdx-table">
              <thead><tr>
                <th>Date Service</th><th>Asset / Location</th><th>Category</th><th>Branch</th>
                <th>Serial</th><th>Type</th><th>Capacity</th><th>Vendor</th><th>Reason</th><th>Service By</th><th>Status</th>${(canComplete || canDelete) ? '<th>Action</th>' : ''}
              </tr></thead>
              <tbody>
                ${rows.map(e => `
                  <tr>
                    <td>${stamp(e.rec.dateService)}</td>
                    <td>${escapeHtml(e.row.assetRef || '-')}</td>
                    <td>${escapeHtml(e.row.assetType || '-')}</td>
                    <td>${escapeHtml(e.row.branch || '-')}</td>
                    <td>${escapeHtml(fegSerialLabel(e.unit) || '(no serial)')}</td>
                    <td>${escapeHtml(e.unit.fegType || '-')}</td>
                    <td>${escapeHtml(e.unit.capacity || '-')}</td>
                    <td>${escapeHtml(e.rec.vendor || '-')}</td>
                    <td>${escapeHtml(e.rec.reason || '-')}${String(e.rec.remark || '').trim() ? `<div class="settings-note" style="margin:2px 0 0;">${escapeHtml(e.rec.remark)}</div>` : ''}${e.rec.status === 'Completed' ? `<div class="settings-note" style="margin:2px 0 0;">Received: ${escapeHtml(e.rec.receivedDate ? fmtDate(e.rec.receivedDate) : '-')}${String(e.rec.invoiceNo || '').trim() ? ' &middot; Invoice: ' + escapeHtml(e.rec.invoiceNo) : ''}${String(e.rec.price == null ? '' : e.rec.price) !== '' ? ' &middot; RM ' + escapeHtml(String(e.rec.price)) : ''}</div>` : ''}</td>
                    <td>${escapeHtml(e.rec.serviceBy || '-')}</td>
                    <td>${statusBadge(e.rec.status)}</td>
                    ${(canComplete || canDelete) ? `<td>${(e.rec.status === 'Active' || canDelete) ? `
                      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                        ${e.rec.status === 'Active' ? `
                          <button type="button" class="btn primary" data-feg-complete="${escapeHtml(e.rec.serviceId || '')}">Complete Service</button>
                          <button type="button" class="btn danger" data-feg-svc-cancel="${escapeHtml(e.rec.serviceId || '')}">Cancel</button>` : ''}
                        ${canDelete ? `
                          <button type="button" class="btn danger" data-feg-svc-delete="${escapeHtml(e.rec.serviceId || '')}">Delete</button>` : ''}
                      </div>` : '-'}</td>` : ''}
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : `<div class="settings-note" style="margin-top:0;">No service records yet. Go to FEG &rarr; open the Detail Page &rarr; press <b>Service</b> on the unit row.</div>`}
        </div>
      </div>`;

    const searchEl = root.querySelector('#fegSvcSearch');
    if (searchEl){
      searchEl.addEventListener('input', () => {
        term = searchEl.value;
        paint();
        setTimeout(() => {
          const s = root.querySelector('#fegSvcSearch');
          if (s){ s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
        }, 0);
      });
    }

    const bBtn   = root.querySelector('#fegSvcBranchBtn');
    const bPanel = root.querySelector('#fegSvcBranchPanel');
    if (bBtn && bPanel){
      const paintPanel = () => {
        bPanel.innerHTML = ['', ...branches].map(v => `
          <div class="tblfilter-option${branch === v ? ' is-active' : ''}" data-value="${escapeHtml(v)}" role="option">
            <span>${escapeHtml(v || 'All')}</span>
            <svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>`).join('');
      };
      bBtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = bPanel.classList.toggle('open');
        bBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) paintPanel();
      });
      bPanel.addEventListener('click', e => {
        const opt = e.target.closest('.tblfilter-option');
        if (!opt) return;
        branch = String(opt.dataset.value || '');
        bPanel.classList.remove('open');
        bBtn.setAttribute('aria-expanded','false');
        paint();
      });
    }

    const exBtn = root.querySelector('#fegSvcExport');
    if (exBtn) exBtn.addEventListener('click', () => {
      const cols = ['Date Service','Asset / Location','Category','Branch','Serial','Type','Capacity','Vendor','Reason','Remark','Service By','Status','Date Received','Invoice No','Price (RM)'];
      const q = v => '"' + String(v == null ? '' : v).replace(/"/g,'""') + '"';
      const lines = [cols.map(q).join(',')].concat(rows.map(e => [
        e.rec.dateService || '', e.row.assetRef || '', e.row.assetType || '', e.row.branch || '',
        fegSerialLabel(e.unit), e.unit.fegType || '', e.unit.capacity || '',
        e.rec.vendor || '', e.rec.reason || '', e.rec.remark || '', e.rec.serviceBy || '', e.rec.status || '',
        e.rec.receivedDate || '', e.rec.invoiceNo || '', e.rec.price || ''
      ].map(q).join(',')));
      downloadBlob(new Blob([lines.join('\r\n')], {type:'text/csv;charset=utf-8;'}),
        'FEG-Service-History-' + new Date().toISOString().slice(0,10) + '.csv');
    });

    root.querySelectorAll('[data-feg-complete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sid = String(btn.dataset.fegComplete || '');
        const e   = rows.find(x => x.rec && String(x.rec.serviceId || '') === sid);
        if (!e) return;
        const info = await openFegCompleteServiceModal(e.row, e.unit, e.rec);
        if (!info) return;
        btn.disabled = true;
        const assetId = String(e.row.assetId || e.row.assetRef || '');
        const unitId  = String(e.unit.unitId || '');
        try{
          await fegCompleteService(e.row, e.unit, info);
          const fresh = await getData('feg');
          const frow  = (fresh || []).find(r => r && String(r.assetId || r.assetRef || '') === assetId);
          const funit = frow ? ((frow.units || []).find(u => u && String(u.unitId || '') === unitId)) : null;
          if (frow && funit){
            fegRememberOpen(frow);
            fegJumpSet(assetId, unitId, ['fireCert', 'invoice']);
            await goTo('feg');
          } else {
            paint();
          }
        }catch(err){
          btn.disabled = false;
          alert('Complete Service failed: ' + (err && err.message ? err.message : err));
        }
      });
    });

    root.querySelectorAll('[data-feg-svc-cancel]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sid = String(btn.dataset.fegSvcCancel || '');
        const e   = rows.find(x => x.rec && String(x.rec.serviceId || '') === sid);
        if (!e) return;
        const ok = await confirmModal('Cancel Service',
          'Service record for <strong>' + escapeHtml(fegSerialLabel(e.unit) || '(no serial)') + '</strong> will be removed from this list. This cannot be undone.',
          { confirmLabel:'Cancel Service', tone:'warning' });
        if (!ok) return;
        btn.disabled = true;
        try{
          await fegCancelService(e.row, e.unit, sid);
          paint();
        }catch(err){
          btn.disabled = false;
          alert('Cancel Service failed: ' + (err && err.message ? err.message : err));
        }
      });
    });

    root.querySelectorAll('[data-feg-svc-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sid = String(btn.dataset.fegSvcDelete || '');
        const e   = rows.find(x => x.rec && String(x.rec.serviceId || '') === sid);
        if (!e) return;
        const ok = await confirmModal('Delete Service Record',
          'This record for <strong>' + escapeHtml(fegSerialLabel(e.unit) || '(no serial)') + '</strong> will be PERMANENTLY deleted from the service log. This cannot be undone.',
          { confirmLabel:'Delete', tone:'danger' });
        if (!ok) return;
        btn.disabled = true;
        try{
          await fegDeleteServiceRecord(e.row, e.unit, sid);
          paint();
        }catch(err){
          btn.disabled = false;
          alert('Delete failed: ' + (err && err.message ? err.message : err));
        }
      });
    });
  }

  paint();
  return root;
}