/* =========================================================================
   FOCC — 10-pages-notify.js  (GABUNGAN A + B + C)
   FEG module: list, detail, disposal, service history, inspection, documents.
   =========================================================================
   Bahagian A — FEG pages (list / disposal / service history)
   Bahagian B — FEG Detail View + Documents + Unit Editor
   Bahagian C — FEG Inspection + PDF + Service/Dispose modals
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

/* =========================================================================
   BAHAGIAN B — FEG Detail View + Documents + Unit Editor
   ========================================================================= */

/* ============================================================
   FEG — Documents (per unit)
============================================================= */
function fegDocSlotLabel(slotId){
  const s = FEG_DOCUMENT_SLOTS.find(x => x.id === slotId);
  return s ? s.label : slotId;
}

function fegDocPath(companyId, row, unit, slotId){
  const asset = (row && row.assetId) ? row.assetId : 'unassigned';
  const u     = (unit && unit.unitId) ? unit.unitId : 'unit';
  return `${companyId}/feg/${asset}/${u}/${slotId}`;
}

async function fegUploadDoc(row, unit, slotId, file, expiryValue){
  const bad = await stValidateFile(file);
  if (bad) throw new Error(bad);

  const companyId = await SupabaseProvider.getCompanyId();
  const path      = fegDocPath(companyId, row, unit, slotId);
  const prevDoc   = (unit && unit.docs && unit.docs[slotId]) || {};
  const prevPath  = prevDoc.storagePath || '';
  const ctype     = stContentType(file);

  if (prevPath && prevPath !== path){
    try{ await FOCC_SUPABASE.storage.from(FEG_DOC_BUCKET).remove([prevPath]); }catch(e){}
  }

  const up = await FOCC_SUPABASE.storage
    .from(FEG_DOC_BUCKET)
    .upload(path, file, { upsert: true, contentType: ctype, cacheControl: '3600' });
  if (up.error) throw up.error;

  return {
    storagePath: path,
    fileName:    file.name || '',
    fileType:    ctype,
    fileSize:    file.size,
    uploadedAt:  new Date().toISOString(),
    uploadedBy:  getSessionEmail() || '',
    validUntil:  expiryValue || '',
    status:      'current',
    updateMode:  prevDoc.updateMode || '',
  };
}

async function fegDownloadDoc(unit, slotId){
  const doc = (unit && unit.docs) ? unit.docs[slotId] : null;
  if (!doc || !doc.storagePath) throw new Error('No file uploaded yet.');
  const res = await FOCC_SUPABASE.storage
    .from(FEG_DOC_BUCKET)
    .createSignedUrl(doc.storagePath, 60, doc.fileName ? { download: doc.fileName } : {});
  if (res.error) throw res.error;
  window.open(res.data.signedUrl, '_blank', 'noopener');
}

async function fegDeleteDoc(unit, slotId){
  const doc = (unit && unit.docs) ? unit.docs[slotId] : null;
  if (doc && doc.storagePath){
    const del = await FOCC_SUPABASE.storage.from(FEG_DOC_BUCKET).remove([doc.storagePath]);
    if (del.error) throw del.error;
  }
  return true;
}

/* ============================================================
   FEG — Doc state (anti "ghost file")
============================================================= */
let FOCC_FEG_DOC_SYNCING = false;

function fegDocState(unit, slotId){
  const m       = pmDocMeta(unit, slotId);
  const missing = m.hasFile && m.doc && m.doc.status === 'missing';
  return { m: m, missing: missing, usable: m.hasFile && !missing };
}

async function fegDocObjectExists(path){
  if (!path) return false;
  const cut    = path.lastIndexOf('/');
  const folder = cut >= 0 ? path.slice(0, cut) : '';
  const name   = cut >= 0 ? path.slice(cut + 1) : path;
  const res    = await FOCC_SUPABASE.storage.from(FEG_DOC_BUCKET).list(folder, { limit: 100 });
  if (res.error) return true;
  return (res.data || []).some(o => o && o.name === name);
}

async function fegSyncFegDocs(row, onChange){
  if (!row || FOCC_FEG_DOC_SYNCING) return;
  FOCC_FEG_DOC_SYNCING = true;
  let changed = false;
  try{
    const companyId = await SupabaseProvider.getCompanyId();
    const units     = Array.isArray(row.units) ? row.units : [];

    for (const u of units){
      if (!u || !u.unitId) continue;
      if (!u.docs || typeof u.docs !== 'object' || Array.isArray(u.docs)) continue;

      for (const slot of FEG_DOCUMENT_SLOTS){
        const doc = u.docs[slot.id];
        if (!doc || (!doc.storagePath && !doc.fileName)) continue;

        const t = doc.uploadedAt ? new Date(doc.uploadedAt).getTime() : 0;
        if (t && (Date.now() - t) < 60000) continue;

        const path   = fegDocPath(companyId, row, u, slot.id);
        const exists = await fegDocObjectExists(path);

        if (!exists && doc.status !== 'missing'){ doc.status = 'missing'; changed = true; }
        else if (exists && doc.status === 'missing'){ doc.status = 'current'; changed = true; }
      }
    }
  }catch(e){ console.error('fegSyncFegDocs:', e); }
  FOCC_FEG_DOC_SYNCING = false;

  if (changed){
    try{
      if (typeof all !== 'undefined' && Array.isArray(all) && index >= 0) all[index] = row;
      await persist('feg');
      if (typeof onChange === 'function') onChange();
    }catch(e){ console.error('fegSyncFegDocs save:', e); }
  }
}

/* ============================================================
   FEG — Documents card (2 units side-by-side + pager)
============================================================= */
function fegDocumentsCardHtml(row, unitPage){
  const units = Array.isArray(row.units) ? row.units : [];
  const total = units.length * FEG_DOCUMENT_SLOTS.length;
  let uploaded = 0;
  units.forEach(u => FEG_DOCUMENT_SLOTS.forEach(s => { if (fegDocState(u, s.id).usable) uploaded += 1; }));

  if (!units.length){
    return `
      <div class="section feg-doc-card" data-feg-docs="1">
        <div class="section-head"><h3>4 &middot; Documents</h3></div>
        <div class="section-body"><div class="settings-note" style="margin-top:0;">No units yet &mdash; add a unit first.</div></div>
      </div>`;
  }

  const per   = 2;
  const pages = Math.ceil(units.length / per);
  const cur   = Math.min(Math.max(Number(unitPage) || 0, 0), units.length - 1);
  const start = Math.min(Math.floor(cur / per) * per, Math.max(0, (pages - 1) * per));
  const end   = Math.min(start + per, units.length);

  const blocks = [];
  for (let i = start; i < end; i++){
    const u     = units[i];
    const title = fegSerialLabel(u) || ('Unit ' + (i + 1));

    const rows = FEG_DOCUMENT_SLOTS.map(slot => {
      const st       = fegDocState(u, slot.id);
      const m        = st.m;
      const rowCls   = m.pending ? ' is-pending' : '';
      const stateCls = st.usable ? ' is-on' : (m.pending ? ' is-warn' : (st.missing ? ' is-warn' : ''));
      const stateTxt = st.usable ? 'Uploaded' : (st.missing ? 'Missing in storage' : (m.pending ? 'Pending upload' : 'Not uploaded'));
      const byLine   = m.hasFile
        ? `<span class="pm-doc-date">${escapeHtml(m.doc.uploadedBy || '')}${m.doc.uploadedBy && m.doc.fileSize ? ' &middot; ' : ''}${m.doc.fileSize ? Math.round(m.doc.fileSize / 1024) + ' KB' : ''}</span>`
        : '';
      const untilLine = (m.hasFile && m.doc.validUntil)
        ? `<span class="pm-doc-date">Valid until ${escapeHtml(fmtDate(m.doc.validUntil))}</span>` : '';
      return `
        <div class="pm-doc-row${rowCls}" data-doc-unit="${i}" data-slot="${slot.id}">
          <div class="pm-doc-name">${escapeHtml(slot.label)}</div>
          <button type="button" class="pm-doc-btn" data-doc-action="upload"   data-doc-unit="${i}" data-slot="${slot.id}">Upload</button>
          <button type="button" class="pm-doc-btn" data-doc-action="download" data-doc-unit="${i}" data-slot="${slot.id}" ${st.usable ? '' : 'disabled'}>Download</button>
          <button type="button" class="pm-doc-btn is-del" data-doc-action="delete" data-doc-unit="${i}" data-slot="${slot.id}" ${m.hasFile ? '' : 'disabled'}>Delete</button>
          <div class="pm-doc-meta">
            <span class="pm-doc-state${stateCls}">
              <input type="checkbox" disabled ${m.status === 'current' ? 'checked' : ''}>
              ${stateTxt}
            </span>
            ${byLine}
            ${untilLine}
          </div>
          <input type="file" class="pm-doc-file" data-doc-unit="${i}" data-slot="${slot.id}" accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png" style="display:none;">
        </div>`;
    }).join('');

    const have = FEG_DOCUMENT_SLOTS.filter(s => fegDocState(u, s.id).usable).length;

    blocks.push(`
        <div class="feg-doc-unit">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span class="truckchip">${escapeHtml(title)}</span>
            <div class="spacer"></div>
            <span class="pm-doc-note">${have}/${FEG_DOCUMENT_SLOTS.length} UPLOADED</span>
          </div>
          ${rows}
        </div>`);
  }

  const pager = pages > 1 ? `
        <div class="feg-pager">
          <button type="button" class="btn" id="fegDocPrev" ${start <= 0 ? 'disabled' : ''} title="Previous units">&#8249;</button>
          <span class="feg-pager-count">${start / per + 1} / ${pages}</span>
          <button type="button" class="btn" id="fegDocNext" ${end >= units.length ? 'disabled' : ''} title="Next units">&#8250;</button>
        </div>` : '';

  return `
    <div class="section feg-doc-card" data-feg-docs="1">
      <div class="section-head">
        <h3>4 &middot; Documents</h3>
        <div class="spacer"></div>
        ${pager}
        <span class="pm-doc-note">${uploaded}/${total} UPLOADED</span>
        <span class="pm-doc-note">PDF &middot; JPG &middot; PNG &middot; MAX 5 MB</span>
      </div>
      <div class="section-body">
        <div class="feg-doc-grid">${blocks.join('')}</div>
      </div>
    </div>`;
}

/* ============================================================
   FEG — Unit pickers (fpick) helper
============================================================= */
let FOCC_FEG_PICK_DOC = null;

function wireFegUnitPickers(root, units, staffNames, vendorNames){
  const esc = s => String(s == null ? '' : s).replace(/"/g, '&quot;');

  function wireOne(unitIdx, fid, values, emptyLabel){
    const wrapEl = root.querySelector(`.fpick[data-fpick="${unitIdx}:${fid}"]`);
    if (!wrapEl) return;
    const input = wrapEl.querySelector('input[data-fid]');
    const panel = wrapEl.querySelector('[data-fpick-panel]');
    if (!input || !panel) return;

    const cur0 = String(input.value || '').trim();
    let vals = (values || []).slice();
    if (cur0 && !vals.includes(cur0)) vals = [cur0].concat(vals);
    const opts = [{ v: '', t: emptyLabel || '\u2014' }]
      .concat(vals.map(v => ({ v: v, t: v })));

    function render(){
      const cur = String(input.value || '');
      panel.innerHTML = opts.map(o => `
        <div class="combo-item fpick-option${o.v === cur ? ' is-active' : ''}" data-value="${esc(o.v)}">
          <span class="combo-item-text">${escapeHtml(o.t)}</span>
        </div>`).join('');
      panel.querySelectorAll('.fpick-option').forEach(rowEl => {
        rowEl.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          input.value = rowEl.dataset.value || '';
          panel.classList.remove('open');
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    }

    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
      render();
      panel.classList.add('open');
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if (panel.classList.contains('open')) panel.classList.remove('open');
        else { render(); panel.classList.add('open'); }
        return;
      }
      e.preventDefault();
    });
  }

  function wireVendorCombo(unitIdx, list){
    const input = root.querySelector(`input[data-fid="vendor"][data-unit="${unitIdx}"]`);
    if (!input) return;
    const wrapEl = input.closest('.combo-wrap');
    const panel  = wrapEl ? wrapEl.querySelector('.combo-panel') : null;
    if (!panel) return;
    const escV = s => String(s == null ? '' : s).replace(/"/g, '&quot;');

    function render(){
      const cur  = String(input.value || '').trim();
      const term = cur.toLowerCase();
      const vis  = list.slice()
        .sort((a,b) => String(a).localeCompare(String(b)))
        .filter(v => !term || String(v).toLowerCase().includes(term));
      panel.innerHTML = vis.length
        ? vis.map(v => `<div class="combo-item${v === cur ? ' is-active' : ''}" data-value="${escV(v)}">
             <span class="combo-item-text">${escV(v)}</span>
             <button type="button" class="combo-del can-del" data-del="${escV(v)}" title="Remove from list">&times;</button>
           </div>`).join('')
        : '<div class="combo-empty">Type a new vendor name&hellip;</div>';
      panel.querySelectorAll('.combo-item').forEach(rowEl => {
        const t = rowEl.querySelector('.combo-item-text');
        if (t) t.addEventListener('mousedown', e => {
          e.preventDefault(); e.stopPropagation();
          input.value = rowEl.dataset.value || '';
          panel.classList.remove('open');
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        const del = rowEl.querySelector('.combo-del');
        if (del) del.addEventListener('mousedown', async e => {
          e.preventDefault(); e.stopPropagation();
          const v = String(rowEl.dataset.value || '');
          const idx = list.findIndex(x => String(x) === v);
          if (idx >= 0) list.splice(idx, 1);
          try{ await saveOptionList('feg', 'vendor', list.slice()); }catch(err){}
          render();
        });
      });
    }

    input.addEventListener('focus', () => { render(); panel.classList.add('open'); });
    input.addEventListener('input', () => { render(); panel.classList.add('open'); });
    input.addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('open'); });
  }

  (units || []).forEach((u, i) => {
    if (u && String(u.disposal || 'No') === 'Yes') return;
    wireOne(i, 'serialPrefix', FEG_UNIT_PREFIXES, '\u2014');
    wireOne(i, 'driver',       staffNames || [],  '\u2014');
    wireOne(i, 'fegType',      FEG_TYPES,        'Select...');
    wireOne(i, 'capacity',     FEG_CAPACITIES,   'Select...');
    wireOne(i, 'manualStatus', FEG_MANUAL_STATUS,'Select...');
    wireVendorCombo(i, vendorNames || []);
  });

  if (FOCC_FEG_PICK_DOC) document.removeEventListener('mousedown', FOCC_FEG_PICK_DOC);
  FOCC_FEG_PICK_DOC = function(e){
    root.querySelectorAll('.fpick-panel.open, .combo-panel.open').forEach(p => {
      const w = p.closest('.fpick') || p.closest('.combo-wrap');
      if (w && w.contains(e.target)) return;
      p.classList.remove('open');
    });
  };
  document.addEventListener('mousedown', FOCC_FEG_PICK_DOC);
}

/* ============================================================
   FEG — Detail view
============================================================= */
async function renderFegDetailView(root, index, onBack, opts){
  const all = await getData('feg');
  let row = all[index];
  if (!row){ await onBack(); return; }
  fegRememberOpen(row);
  if (!Array.isArray(row.units)) row.units = [];

  let vendorNames = [];
  try{
    const savedV = await loadOptionList('feg','vendor');
    if (Array.isArray(savedV)) vendorNames = savedV.slice();
  }catch(e){ vendorNames = []; }
  (row.units || []).forEach(u => { const v = String((u && u.vendor) || '').trim(); if (v && !vendorNames.includes(v)) vendorNames.push(v); });
  vendorNames.sort((a,b) => String(a).localeCompare(String(b)));

  let staffNames = [];
  try{
    const staffRows = await getData('staffDatabase');
    staffNames = [...new Set((staffRows || []).map(r => String((r && r.staffName) || '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  }catch(e){ staffNames = []; }

  let branchList = [];
  try{
    const pmRows = await getData('primeMover');
    branchList = [...new Set((pmRows || []).map(r => String((r && r.branch) || '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  }catch(e){ branchList = []; }
  if (row.branch && !branchList.includes(String(row.branch))) branchList.push(String(row.branch));

  let editing = !!(opts && opts.startEditing);
  let draftUnits = null;
  const removedVendors = new Set();
  let fegDocRadioValue = '';
  let fegPendingFocus   = null;
  let docUnitPage = fegDocPageIndex(row);
  let fegDocBusy  = false;
  let inspAll     = [];
  try{ inspAll = await getData(FEG_INSPECTION_TABLE); }catch(e){ inspAll = []; }
  if (!Array.isArray(inspAll)) inspAll = [];

  function fegDocChanges(){
    const base = new Map();
    (row.units || []).forEach(u => { if (u && u.unitId) base.set(String(u.unitId), u); });
    const out = [];
    (draftUnits || []).forEach((u, i) => {
      const prev = base.get(String((u && u.unitId) || ''));
      if (!prev) return;
      FEG_DOC_FIELD_SLOTS.forEach(pair => {
        const el = root.querySelector(`[data-unit="${i}"][data-fid="${pair.field}"]`);
        if (!el) return;
        const nb = String(el.value || '');
        const pa = String(prev[pair.field] == null ? '' : prev[pair.field]);
        if (pa === nb) return;
        pair.slots.forEach(s => {
          if (!out.some(x => x.unitId === u.unitId && x.slotId === s)) out.push({ unitId: u.unitId, ui: i, slotId: s });
        });
      });
    });
    return out;
  }

  const attr = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const txt  = s => escapeHtml(String(s == null ? '' : s));
  const counts = () => fegUnitCounts(editing && draftUnits ? draftUnits : row.units);

  function groupInfoHtml(){
    if (!editing){
      return `
      <div class="section feg-info-card">
        <div class="section-head"><h3>1 &middot; Group Info</h3></div>
        <div class="section-body">
          <div class="pm-detail-grid">
            <div class="pm-detail-row"><span class="pm-detail-lbl">Category</span><span class="pm-detail-val">${txt(row.assetType)}</span></div>
            <div class="pm-detail-row"><span class="pm-detail-lbl">Asset / Location</span><span class="pm-detail-val">${txt(row.assetRef)}</span></div>
            <div class="pm-detail-row"><span class="pm-detail-lbl">Branch</span><span class="pm-detail-val">${txt(row.branch)}</span></div>
            <div class="pm-detail-row"><span class="pm-detail-lbl">Created</span><span class="pm-detail-val">${txt(row.createdBy || '-')}${row.createdAt ? ' &middot; ' + txt(fmtDate(String(row.createdAt).slice(0,10))) : ''}</span></div>
          </div>
          <div class="settings-note">Category, Asset / Location &amp; Branch are locked after creation — delete the group and create a new one if you picked the wrong value.</div>
        </div>
      </div>`;
    }
    return `
      <div class="section feg-info-card">
        <div class="section-head"><h3>1 &middot; Group Info</h3></div>
        <div class="section-body">
          <div class="formgrid">
            <div class="formfield"><label>Category (locked)</label><input type="text" value="${attr(row.assetType)}" disabled></div>
            <div class="formfield"><label>Asset / Location (locked)</label><input type="text" value="${attr(row.assetRef)}" disabled></div>
            <div class="formfield"><label>Branch (locked)</label><input id="fegBranch" type="text" value="${attr(row.branch || '')}" disabled></div>
          </div>
        </div>
      </div>`;
  }

  function unitsReadHtml(){
    const units = row.units || [];
    const c = counts();
    if (!units.length) return `<div class="settings-note" style="margin-top:0;">No units yet. Press Edit Details &rarr; Add Unit.</div>`;
    const canDispose = fegCanDispose();
    return `
      <div class="tablewrap">
        <table class="cdx-table" data-feg-units="1"${canDispose ? ' data-feg-disposal="1"' : ''}>
          <thead><tr><th>#</th><th>Serial</th><th>Inspection</th><th>Next Due</th><th>Serviced</th><th>Type</th><th>Capacity</th><th>Service Due</th><th>Cylinder Due</th><th>Driver</th><th>Manual Status</th><th>Final Status</th>${canDispose ? '<th>Action</th>' : ''}</tr></thead>
          <tbody>
            ${units.map((u,i) => {
              const fs  = fegFinalStatus(u);
              const dis = fegIsDisposed(u);
              const lbl = fegSerialLabel(u);
              const inSvc = !dis && fegIsInService(u);
              const svc = canDispose
                ? (dis ? ''
                    : (inSvc
                        ? `<button type="button" class="btn danger" data-feg-cancel-service="${i}">Cancel Service</button>`
                        : `<button type="button" class="btn" data-feg-service="${i}">Service</button>`))
                : '';
              const act = canDispose
                ? (dis
                    ? `<button type="button" class="btn" data-feg-restore="${i}">Restore</button>`
                    : `<button type="button" class="btn" data-feg-dispose="${i}">Dispose</button>`)
                : '';
              return `<tr${dis ? ' style="opacity:.55;"' : ''}>
                <td>${i + 1}</td>
                <td>${lbl ? txt(lbl) : '<span style="color:var(--muted)">(draft)</span>'}${String(u.note || '').trim() ? `<div class="settings-note" style="margin:2px 0 0;">${txt(u.note)}</div>` : ''}</td>
                <td>${u.inspectionDate ? txt(fmtDate(u.inspectionDate)) : '<span style="color:var(--muted)">Never</span>'}</td>
                <td>${(() => { const nd = fegInspectionDueLabel(fegNextInspectionDue(u)); return nd.cls ? `<span class="badge ${nd.cls}">${txt(nd.text)}</span>` : txt(nd.text); })()}</td>
                <td>${(() => { const n = fegServiceCount(u); return n ? '<b>' + txt(String(n) + 'x') + '</b>' : '<span style="color:var(--muted)">0x</span>'; })()}</td>
                <td>${txt(u.fegType || '-')}</td>
                <td>${txt(u.capacity || '-')}</td>
                <td>${u.serviceDate ? txt(fmtDate(u.serviceDate)) : '-'}</td>
                <td>${u.cylinderDue ? txt(fmtDate(u.cylinderDue)) : '-'}</td>
                <td>${txt(u.driver || '-')}</td>
                <td>${txt(u.manualStatus || '-')}</td>
                <td><span class="badge ${fegStatusClass(fs)}">${txt(fs)}</span></td>
                ${canDispose ? `<td><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">${svc}${act}</div></td>` : ''}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="settings-note">${c.active} active &middot; ${c.disposed} disposed &middot; ${c.draft} draft</div>`;
  }

  function unitBlockHtml(u, i){
    const fs  = fegFinalStatus(u);
    const dis = fegIsDisposed(u);
    const LK  = dis ? ' disabled' : '';
    const pick = (fid, cur, holder) => `
              <div class="fpick" data-fpick="${i}:${fid}">
                <input data-unit="${i}" data-fid="${fid}" class="fpick-input" type="text" inputmode="none" autocomplete="off" placeholder="${holder}" value="${attr(cur || '')}"${LK}>
                <span class="fpick-caret"></span>
                <div class="combo-panel fpick-panel" data-fpick-panel="${i}:${fid}"></div>
              </div>`;
    return `
      <div class="feg-unit-block" style="border:1px solid var(--line);border-radius:12px;padding:12px;${dis ? 'background:rgba(0,0,0,.03);' : ''}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <span class="truckchip">Unit ${i + 1}</span>
          <span class="badge ${fegStatusClass(fs)}">${txt(fs)}</span>
          <div class="spacer"></div>
          ${dis
            ? `<span class="settings-note" style="margin:0;">&#128274; Locked &mdash; Cancel edit first, then press <b>Restore</b> in the units table to unlock.</span>`
            : `<button type="button" class="btn" data-unit-remove="${i}">Remove</button>`}
        </div>
        <div class="formgrid"${dis ? ' style="opacity:.6;"' : ''}>
          <div class="formfield"><label>Serial No</label>
            <div style="display:flex;gap:6px;">
              <div style="flex:0 0 112px;max-width:112px;">
                <div class="fpick" data-fpick="${i}:serialPrefix">
                  <input data-unit="${i}" data-fid="serialPrefix" class="fpick-input" type="text" inputmode="none" autocomplete="off" placeholder="&mdash;" value="${attr(u.serialPrefix || '')}"${LK}>
                  <span class="fpick-caret"></span>
                  <div class="combo-panel fpick-panel" data-fpick-panel="${i}:serialPrefix"></div>
                </div>
              </div>
              <input data-unit="${i}" data-fid="serialNo" type="text" value="${attr(u.serialNo || '')}" placeholder="Serial number" autocomplete="off"${LK}>
            </div>
          </div>
          <div class="formfield"><label>Driver / Incharge</label>${pick('driver', u.driver, 'Select...')}</div>
          <div class="formfield"><label>FEG Type</label>${pick('fegType', u.fegType, 'Select...')}</div>
          <div class="formfield"><label>Capacity</label>${pick('capacity', u.capacity, 'Select...')}</div>
          <div class="formfield"><label>Manufacturing Date</label><input data-unit="${i}" data-fid="mfgDate" type="date" value="${attr(u.mfgDate || '')}"${LK}></div>
          <div class="formfield"><label>Service Date</label><input data-unit="${i}" data-fid="serviceDate" type="date" value="${attr(u.serviceDate || '')}"${LK}></div>
          <div class="formfield"><label>Inspection Date</label><input data-unit="${i}" data-fid="inspectionDate" type="date" value="${attr(u.inspectionDate || '')}"${LK}></div>
          <div class="formfield">
            <label>Cylinder Test Due <span style="font-weight:400;color:var(--muted);text-transform:none;">&mdash; auto: Manufacturing Date + ${FEG_CYLINDER_TEST_YEARS} years</span></label>
            <input data-feg-cyldue="${i}" type="date" value="${attr(fegCylinderDueFrom(u.mfgDate))}" disabled>
            <div class="settings-note" style="margin:0;">In the last ${FEG_CYLINDER_REPLACE_MONTHS} months before this date the cylinder <b>cannot be serviced</b> &mdash; it must be <b>replaced</b>.</div>
          </div>
          <div class="formfield"><label>Vendor</label>
            <div class="combo-wrap">
              <input data-unit="${i}" data-fid="vendor" type="text" autocomplete="off" placeholder="Type new or pick existing..." value="${attr(u.vendor || '')}"${LK}>
              <div class="combo-panel" data-fc-panel="${i}"></div>
            </div>
            <div class="settings-note" style="margin-top:6px;">Type a new vendor or pick from the list. &times; removes it from the list.</div>
          </div>
          <div class="formfield"><label>Manual Status</label>${pick('manualStatus', u.manualStatus, 'Select...')}</div>
          <div class="formfield"><label>Remark <span style="font-weight:400;color:var(--muted);text-transform:none;">&mdash; will trigger Final Status</span></label><input data-unit="${i}" data-fid="remark" type="text" value="${attr(u.remark || '')}" placeholder="e.g. damaged, under repair..."${LK}></div>
          <div class="formfield"><label>Note <span style="font-weight:400;color:var(--muted);text-transform:none;">&mdash; no effect on Final Status</span></label><input data-unit="${i}" data-fid="note" type="text" value="${attr(u.note || '')}" placeholder="Free note..."${LK}></div>
        </div>
      </div>`;
  }

  function unitsEditHtml(){
    const units = draftUnits || [];
    return `
      <div class="feg-unit-grid">
        ${units.map((u,i) => unitBlockHtml(u,i)).join('')}
      </div>
      <div style="display:flex;gap:10px;align-items:center;margin-top:14px;">
        <button type="button" class="btn" id="fegAddUnit">+ Add Unit</button>
        <span class="settings-note" style="margin:0;">Maximum ${FEG_MAX_UNITS} units. Empty serial = Draft (excluded from Compliance Alert).</span>
      </div>
      <div id="fegDocUpdatePanel"></div>`;
  }

  function readDraftFromDom(){
    const units = draftUnits || [];
    units.forEach((u,i) => {
      const get = fid => { const el = root.querySelector(`[data-unit="${i}"][data-fid="${fid}"]`); return el ? String(el.value || '') : ''; };
      u.serialPrefix = get('serialPrefix');
      u.serialNo     = get('serialNo');
      u.driver       = get('driver');
      u.fegType      = get('fegType');
      u.capacity     = get('capacity');
      u.mfgDate      = get('mfgDate');
      u.serviceDate  = get('serviceDate');
      u.inspectionDate = get('inspectionDate');
      u.cylinderDue  = fegCylinderDueFrom(u.mfgDate);
      u.vendor       = get('vendor');
      u.manualStatus = get('manualStatus');
      u.remark       = get('remark');
      u.note         = get('note');
      u.finalStatus  = fegFinalStatus(u);
    });
    return units;
  }

  async function saveUnits(){
    const units = readDraftFromDom();

    const seen = new Set();
    for (const u of units){
      if (!String(u.serialNo || '').trim()) continue;
      const key = (String(u.serialPrefix || '').trim() + '|' + String(u.serialNo || '').trim()).toLowerCase();
      if (seen.has(key)){ alert('Serial ' + fegSerialLabel(u) + ' is duplicated in this group.'); return false; }
      seen.add(key);
    }
    const others = (all || []).filter(r => r !== row);
    for (const other of others){
      for (const u of (other.units || [])){
        if (!String(u.serialNo || '').trim()) continue;
        const key = (String(u.serialPrefix || '').trim() + '|' + String(u.serialNo || '').trim()).toLowerCase();
        if (seen.has(key)){ alert('Serial ' + fegSerialLabel(u) + ' is already used by ' + (other.assetRef || 'another record') + '.'); return false; }
      }
    }

    const brEl = root.querySelector('#fegBranch');
    if (brEl) row.branch = String(brEl.value || '').trim();

    const fegChanges = fegDocChanges();
    if (fegChanges.length){
      if (!fegDocRadioValue){
        alert('Please choose Correction Only or Document Renewal / Update.');
        return false;
      }
      fegChanges.forEach(ch => {
        const u = units.find(x => x && String(x.unitId) === String(ch.unitId));
        if (!u) return;
        u.docs = pmApplyDocUpdateMode(u.docs || {}, [ch.slotId], fegDocRadioValue);
      });
      fegPendingFocus = fegChanges[0];
    }
    row.units = units;

    if (fegPendingFocus){
      docUnitPage = Math.max(0, Number(fegPendingFocus.ui) || 0);
      fegDocPageSave(row, (row.units || [])[docUnitPage]);
    }

    all[index] = row;
    await persist('feg');

    const kept = vendorNames.concat(units.map(u => String(u.vendor || '').trim()).filter(Boolean))
                            .filter(v => !removedVendors.has(String(v)));
    const vset = [...new Set(kept)].sort((a,b) => String(a).localeCompare(String(b)));
    try{ await saveOptionList('feg','vendor', vset); }catch(e){}
    return true;
  }

  if (editing && !Array.isArray(draftUnits)){
    draftUnits = JSON.parse(JSON.stringify(row.units || []));
  }

  function paint(){
    const c = counts();
    root.innerHTML = `
      <div class="pm-detail-head">
        <button class="btn" id="fegBack">&#8592; Back</button>
        <div>
          <span class="truckchip">${txt(row.assetRef || '(No Asset)')}</span>
          <span class="pm-detail-sub">${txt(row.assetType || '')}${row.branch ? ' &middot; ' + txt(row.branch) : ''}</span>
        </div>
        <div class="spacer"></div>
        ${editing
          ? `<button class="btn" id="fegCancel">Cancel</button>
             <button class="btn primary" id="fegSave">Save Changes</button>`
          : `<button class="btn primary" id="fegEdit">&#9998; Edit Details</button>`}
      </div>
      <datalist id="fegStaffList">${staffNames.map(n => `<option value="${attr(n)}"></option>`).join('')}</datalist>
      <datalist id="fegVendorList">${vendorNames.map(n => `<option value="${attr(n)}"></option>`).join('')}</datalist>
      <datalist id="fegBranchList">${branchList.map(n => `<option value="${attr(n)}"></option>`).join('')}</datalist>
      <div class="pm-detail-card-grid feg-detail ${editing ? 'is-edit' : 'is-view'}">
        ${groupInfoHtml()}
        ${editing ? fegInspectionCardHtml(row, fegInspectionForAsset(inspAll, row)) : ''}
        <div class="section feg-units-card">
          <div class="section-head">
            <h3>2 &middot; Extinguisher Units</h3>
            <div class="spacer"></div>
            <span class="pm-doc-note">${c.active} ACTIVE &middot; ${c.disposed} DISPOSED &middot; ${c.draft} DRAFT</span>
          </div>
          <div class="section-body">${editing ? unitsEditHtml() : unitsReadHtml()}</div>
        </div>
        ${editing ? '' : fegDocumentsCardHtml(row, docUnitPage)}
        </div>
      </div>`;

    const backBtn = root.querySelector('#fegBack');
    if (backBtn) backBtn.onclick = async () => {
      if (editing && !confirm('You have unsaved changes. Leave without saving?')) return;
      await onBack();
    };

    const editBtn = root.querySelector('#fegEdit');
    if (editBtn) editBtn.onclick = () => {
      editing = true;
      draftUnits = JSON.parse(JSON.stringify(row.units || []));
      paint();
    };

    const cancelBtn = root.querySelector('#fegCancel');
    if (cancelBtn) cancelBtn.onclick = () => {
      if (!confirm('Discard your changes?')) return;
      editing = false; draftUnits = null;
      paint();
    };

    const saveBtn = root.querySelector('#fegSave');
    if (saveBtn) saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      let ok = false;
      try{ ok = await saveUnits(); }
      catch(e){ alert('Simpan gagal: ' + (e && e.message ? e.message : e)); }
      saveBtn.disabled = false;
      if (!ok) return;
      editing = false; draftUnits = null;
      paint();
    };

    if (!editing) fegSyncFegDocs(row, () => paint());
    if (editing) wireFegUnitPickers(root, draftUnits, staffNames, vendorNames);

    if (editing){
      root.querySelectorAll('[data-fid="mfgDate"]').forEach(inp => {
        const ui = Number(inp.dataset.unit);
        inp.addEventListener('change', () => {
          const out = root.querySelector(`[data-feg-cyldue="${ui}"]`);
          if (out) out.value = fegCylinderDueFrom(inp.value);
        });
      });
    }

    const addBtn = root.querySelector('#fegAddUnit');
    if (addBtn) addBtn.onclick = () => {
      if (!Array.isArray(draftUnits)) draftUnits = JSON.parse(JSON.stringify(row.units || []));
      readDraftFromDom();
      if (draftUnits.length >= FEG_MAX_UNITS){ alert('Limit of ' + FEG_MAX_UNITS + ' units per group reached.'); return; }
      draftUnits.push(fegNewUnit());
      paint();
    };

    const fegDocGo = (delta) => {
      if (editing || fegDocBusy) return;
      const n = (row.units || []).length;
      if (n < 2) return;
      const per   = 2;
      const cur   = Math.min(Math.max(docUnitPage, 0), n - 1);
      const start = Math.floor(cur / per) * per;
      const next  = start + (delta > 0 ? per : -per);
      if (next < 0 || next >= n) return;
      docUnitPage = next;
      fegDocPageSave(row, row.units[next]);
      paint();
    };
    const docPrevBtn = root.querySelector('#fegDocPrev');
    if (docPrevBtn) docPrevBtn.onclick = () => fegDocGo(-1);
    const docNextBtn = root.querySelector('#fegDocNext');
    if (docNextBtn) docNextBtn.onclick = () => fegDocGo(1);

    root.querySelectorAll('[data-feg-dispose]').forEach(btn => {
      btn.onclick = async () => {
        const ui   = Number(btn.dataset.fegDispose);
        const unit = (row.units || [])[ui];
        if (!unit) return;
        const info = await openFegDisposeModal(row, unit);
        if (!info) return;
        btn.disabled = true;
        try{
          await fegDisposeUnit(row, unit, info);
          all[index] = row;
          paint();
        }catch(e){
          btn.disabled = false;
          alert('Dispose failed: ' + (e && e.message ? e.message : e));
        }
      };
    });

    root.querySelectorAll('[data-feg-restore]').forEach(btn => {
      btn.onclick = async () => {
        const ui   = Number(btn.dataset.fegRestore);
        const unit = (row.units || [])[ui];
        if (!unit) return;
        const ok = await confirmModal('Restore Extinguisher',
          'Unit <strong>' + escapeHtml(fegSerialLabel(unit) || '(no serial)') + '</strong> will be restored to active (disposal = No).',
          { confirmLabel:'Restore', tone:'warning' });
        if (!ok) return;
        btn.disabled = true;
        try{
          await fegRestoreUnit(row, unit);
          all[index] = row;
          paint();
        }catch(e){
          btn.disabled = false;
          alert('Restore failed: ' + (e && e.message ? e.message : e));
        }
      };
    });

    root.querySelectorAll('[data-feg-service]').forEach(btn => {
      btn.onclick = async () => {
        const ui   = Number(btn.dataset.fegService);
        const unit = (row.units || [])[ui];
        if (!unit) return;
        const info = await openFegServiceModal(row, unit, vendorNames);
        if (!info) return;
        btn.disabled = true;
        try{
          await fegStartService(row, unit, info);
          all[index] = row;
          paint();
        }catch(e){
          btn.disabled = false;
          alert('Service failed: ' + (e && e.message ? e.message : e));
        }
      };
    });

    root.querySelectorAll('[data-feg-cancel-service]').forEach(btn => {
      btn.onclick = async () => {
        const ui   = Number(btn.dataset.fegCancelService);
        const unit = (row.units || [])[ui];
        if (!unit) return;
        const ok = await confirmModal('Cancel Service',
          'Unit <strong>' + escapeHtml(fegSerialLabel(unit) || '(no serial)') + '</strong> will be removed from the service record. This cannot be undone.',
          { confirmLabel:'Cancel Service', tone:'warning' });
        if (!ok) return;
        btn.disabled = true;
        try{
          await fegCancelService(row, unit);
          all[index] = row;
          paint();
        }catch(e){
          btn.disabled = false;
          alert('Cancel Service failed: ' + (e && e.message ? e.message : e));
        }
      };
    });

    root.querySelectorAll('[data-unit-remove]').forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.unitRemove);
        readDraftFromDom();
        const u = (draftUnits || [])[i];
        if (!u) return;
        if (String(u.disposal || 'No') === 'Yes'){ alert('This unit is disposed. Restore it before removing.'); return; }
        if (!confirm('Remove Unit ' + (i + 1) + '?')) return;
        draftUnits.splice(i, 1);
        paint();
      };
    });

    const fegDocPanel = root.querySelector('#fegDocUpdatePanel');
    if (fegDocPanel){
      const refreshFegDocPanel = () => {
        const changes = fegDocChanges();
        if (!changes.length){
          fegDocPanel.innerHTML = '';
          fegDocPanel.dataset.rendered = '';
          fegDocRadioValue = '';
          if (saveBtn) saveBtn.disabled = false;
          return;
        }
        const sig = changes.map(c => c.ui + ':' + c.slotId).join(',');
        if (fegDocPanel.dataset.rendered === sig) return;
        fegDocPanel.dataset.rendered = sig;
        const head = changes.map(c => 'Unit ' + (c.ui + 1) + ' \u00b7 ' + fegDocSlotLabel(c.slotId)).join(', ');
        fegDocPanel.innerHTML = `
          <div class="pm-docupd">
            <div class="pm-docupd-head">Document update &mdash; <strong>${head}</strong></div>
            <label class="pm-docupd-opt">
              <input type="radio" name="fegDocUpdateMode" value="correction_only">
              <span><b>Correction Only</b><small>I am fixing a mistake. The existing document is still valid.</small></span>
            </label>
            <label class="pm-docupd-opt">
              <input type="radio" name="fegDocUpdateMode" value="document_renewal">
              <span><b>Document Renewal / Update</b><small>This information comes from a new or renewed document.</small></span>
            </label>
            <div class="pm-docupd-hint">You must choose one option before saving.</div>
          </div>`;
        fegDocPanel.querySelectorAll('input[name="fegDocUpdateMode"]').forEach(r => {
          r.addEventListener('change', () => { fegDocRadioValue = r.value; if (saveBtn) saveBtn.disabled = false; });
        });
        fegDocRadioValue = '';
        if (saveBtn) saveBtn.disabled = true;
      };
      const unitsBody = fegDocPanel.parentElement;
      unitsBody.addEventListener('input', refreshFegDocPanel);
      unitsBody.addEventListener('change', refreshFegDocPanel);
      refreshFegDocPanel();
    }

    if (!editing && fegPendingFocus){
      const fEl = root.querySelector(`.pm-doc-row[data-doc-unit="${fegPendingFocus.ui}"][data-slot="${fegPendingFocus.slotId}"]`);
      if (fEl){
        fEl.classList.add('is-flagged');
        setTimeout(() => fEl.classList.remove('is-flagged'), 3400);
        setTimeout(() => fEl.scrollIntoView({behavior:'smooth', block:'center'}), 120);
      }
      fegPendingFocus = null;
    }

    /* Kad 3 · Inspection Form (mod EDIT sahaja) */
    function repaintInspection(highlightUploadId){
      inspAll = Array.isArray(DATA_CACHE[FEG_INSPECTION_TABLE]) ? DATA_CACHE[FEG_INSPECTION_TABLE] : inspAll;
      paint();
      if (!highlightUploadId) return;
      const upBtn = root.querySelector(`[data-insp-action="upload"][data-insp-id="${highlightUploadId}"]`);
      if (!upBtn) return;
      upBtn.classList.add('is-flagged');
      setTimeout(() => upBtn.classList.remove('is-flagged'), 3400);
      setTimeout(() => upBtn.scrollIntoView({behavior:'smooth', block:'center'}), 120);
    }
    const inspFind = id => (inspAll || []).find(r => r && String(r.recordId || '') === String(id)) || null;

    if (editing){
      const inspAddBtn = root.querySelector('#fegInspAdd');
      if (inspAddBtn) inspAddBtn.onclick = async () => {
        const info = await openFegInspectionModal(row, null);
        if (!info) return;
        inspAddBtn.disabled = true;
        try{
          const rec = await fegInspectionAdd(row, info);
          repaintInspection(rec && rec.recordId);
        }catch(e){
          inspAddBtn.disabled = false;
          alert('Save failed: ' + (e && e.message ? e.message : e));
        }
      };

      root.querySelectorAll('[data-insp-edit]').forEach(el => {
        el.onclick = async () => {
          const rec = inspFind(el.dataset.inspEdit);
          if (!rec) return;
          const info = await openFegInspectionModal(row, rec);
          if (!info) return;
          try{
            await fegInspectionUpdate(rec.recordId, info);
            repaintInspection('');
          }catch(e){
            alert('Update failed: ' + (e && e.message ? e.message : e));
          }
        };
      });

      const inspDlBtn = root.querySelector('#fegInspDownloadForm');
      if (inspDlBtn) inspDlBtn.onclick = async () => {
        const oldTxt = inspDlBtn.textContent;
        inspDlBtn.disabled = true;
        inspDlBtn.textContent = 'Generating\u2026';
        try{ await downloadFegInspectionForm(row); }
        catch(e){ alert('Download failed: ' + (e && e.message ? e.message : e)); }
        finally{ inspDlBtn.disabled = false; inspDlBtn.textContent = oldTxt; }
      };

      root.querySelectorAll('[data-insp-action]').forEach(btn => {
        const rec = inspFind(btn.dataset.inspId);
        if (!rec) return;

        if (btn.dataset.inspAction === 'upload'){
          btn.onclick = () => {
            const inp = root.querySelector(`.feg-insp-file[data-insp-file="${rec.recordId}"]`);
            if (inp){ inp.value = ''; inp.click(); }
          };
        }

        if (btn.dataset.inspAction === 'download'){
          btn.onclick = async () => {
            try{ btn.disabled = true; await fegInspectionDownload(rec); }
            catch(e){ alert('Download failed: ' + (e && e.message ? e.message : e)); }
            btn.disabled = !fegInspectionFileMeta(rec).hasFile;
          };
        }

        if (btn.dataset.inspAction === 'delete'){
          btn.onclick = async () => {
            const ok = await confirmModal('Delete Inspection Record',
              'This record and its signed form (if any) will be <strong>permanently deleted</strong>. This cannot be undone.',
              { confirmLabel:'Delete', tone:'danger' });
            if (!ok) return;
            btn.disabled = true;
            try{
              await fegInspectionDelete(rec);
              repaintInspection('');
            }catch(e){
              btn.disabled = false;
              alert('Delete failed: ' + (e && e.message ? e.message : e));
            }
          };
        }
      });

      root.querySelectorAll('.feg-insp-file').forEach(inp => {
        inp.onchange = async () => {
          const rec  = inspFind(inp.dataset.inspFile);
          const file = inp.files && inp.files[0];
          if (!rec || !file) return;
          const upBtn = root.querySelector(`[data-insp-action="upload"][data-insp-id="${rec.recordId}"]`);
          if (upBtn){ upBtn.disabled = true; upBtn.textContent = 'Uploading\u2026'; }
          try{
            await fegInspectionUploadFile(row, rec, file);
            repaintInspection('');
          }catch(e){
            if (upBtn){ upBtn.disabled = false; upBtn.textContent = 'Upload'; }
            alert('Upload failed: ' + (e && e.message ? e.message : e));
          }
        };
      });
    }

    async function saveDocsAndPaint(){
      all[index] = row;
      await persist('feg');
      paint();
    }

    root.querySelectorAll('[data-doc-action]').forEach(btn => {
      const ui     = Number(btn.dataset.docUnit);
      const slotId = btn.dataset.slot;
      const unit   = (row.units || [])[ui];
      if (!unit) return;

      if (btn.dataset.docAction === 'upload'){
        btn.onclick = () => {
          const inp = root.querySelector(`.pm-doc-file[data-doc-unit="${ui}"][data-slot="${slotId}"]`);
          if (inp){ inp.value = ''; inp.click(); }
        };
      }

      if (btn.dataset.docAction === 'download'){
        btn.onclick = async () => {
          try{ btn.disabled = true; await fegDownloadDoc(unit, slotId); }
          catch(err){ alert('Download failed: ' + (err.message || err)); }
          finally{ btn.disabled = false; }
        };
      }

      if (btn.dataset.docAction === 'delete'){
        btn.onclick = async () => {
          if (!confirm('Delete the ' + fegDocSlotLabel(slotId) + ' file? This cannot be undone.')) return;
          try{
            btn.disabled = true;
            fegDocBusy = true;
            await fegDeleteDoc(unit, slotId);
            const docs = Object.assign({}, unit.docs || {});
            delete docs[slotId];
            unit.docs = docs;
            await saveDocsAndPaint();
          }catch(err){
            btn.disabled = false;
            alert('Delete failed: ' + (err.message || err));
          }finally{
            fegDocBusy = false;
          }
        };
      }
    });

    root.querySelectorAll('.pm-doc-file').forEach(inp => {
      inp.onchange = async () => {
        const ui     = Number(inp.dataset.docUnit);
        const slotId = inp.dataset.slot;
        const unit   = (row.units || [])[ui];
        const file   = inp.files && inp.files[0];
        if (!unit || !file) return;
        fegDocBusy = true;

        const btn = root.querySelector(`[data-doc-action="upload"][data-doc-unit="${ui}"][data-slot="${slotId}"]`);
        if (btn){ btn.disabled = true; btn.textContent = 'Uploading\u2026'; }
        try{
          const expField = FEG_DOC_EXPIRY_FIELD[slotId] || '';
          const expValue = expField ? (unit[expField] || '') : '';
          const doc      = await fegUploadDoc(row, unit, slotId, file, expValue);
          unit.docs = Object.assign({}, unit.docs || {}, { [slotId]: doc });
          await saveDocsAndPaint();
        }catch(err){
          if (btn){ btn.disabled = false; btn.textContent = 'Upload'; }
          alert('Upload failed: ' + (err.message || err));
        }finally{
          fegDocBusy = false;
        }
      };
    });
  }

  paint();
}

/* =========================================================================
   BAHAGIAN C — FEG Inspection + PDF + Service/Dispose modals
   ========================================================================= */

/* ============================================================
   FEG — Inspection record helpers
============================================================= */
function fegInspectionPath(companyId, assetId, recordId){
  return `${companyId}/feg/${assetId || 'unassigned'}/inspection/${recordId}`;
}
function fegInspectionAssetKey(row){
  return String((row && (row.assetId || row.assetRef)) || '');
}
function fegInspectionSortDesc(list){
  return (Array.isArray(list) ? list.slice() : []).sort((a,b) => {
    const da = String((a && a.inspectedOn) || '');
    const db = String((b && b.inspectedOn) || '');
    if (da !== db) return db.localeCompare(da);
    return String((b && b.createdAt) || '').localeCompare(String((a && a.createdAt) || ''));
  });
}
function fegInspectionForAsset(all, row){
  const key = fegInspectionAssetKey(row);
  return fegInspectionSortDesc((all || []).filter(r => r && String(r.assetId || '') === key));
}
function fegInspectionFileMeta(rec){
  const f = (rec && rec.file && typeof rec.file === 'object') ? rec.file : {};
  return { hasFile: !!(f.storagePath || f.fileName), file: f };
}
function fegInspectionTodayIso(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

async function fegInspectionPersist(mutate){
  const list = await getData(FEG_INSPECTION_TABLE);
  const arr  = Array.isArray(list) ? list : [];
  const out  = mutate(arr);
  DATA_CACHE[FEG_INSPECTION_TABLE] = arr;
  await persist(FEG_INSPECTION_TABLE);
  return out;
}

async function fegInspectionAdd(row, info){
  const at = new Date().toISOString();
  const rec = {
    recordId   : fegNewId('FI'),
    assetId    : fegInspectionAssetKey(row),
    assetRef   : String(row.assetRef || ''),
    assetType  : String(row.assetType || ''),
    branch     : String(row.branch || ''),
    inspectedOn: String((info && info.inspectedOn) || ''),
    inspector  : String((info && info.inspector) || ''),
    result     : String((info && info.result) || ''),
    findings   : String((info && info.findings) || ''),
    action     : String((info && info.action) || ''),
    file       : {},
    createdBy  : getSessionEmail() || '',
    createdAt  : at,
    updatedBy  : '',
    updatedAt  : ''
  };
  await fegInspectionPersist(arr => { arr.push(rec); });
  return rec;
}

async function fegInspectionUpdate(recordId, info){
  const at = new Date().toISOString();
  return await fegInspectionPersist(arr => {
    const rec = arr.find(r => r && String(r.recordId || '') === String(recordId));
    if (!rec) throw new Error('Record not found. Refresh and try again.');
    rec.inspectedOn = String((info && info.inspectedOn) || '');
    rec.inspector   = String((info && info.inspector) || '');
    rec.result      = String((info && info.result) || '');
    rec.findings    = String((info && info.findings) || '');
    rec.action      = String((info && info.action) || '');
    rec.updatedBy   = getSessionEmail() || '';
    rec.updatedAt   = at;
    return rec;
  });
}

async function fegInspectionUploadFile(row, record, file){
  const bad = await stValidateFile(file);
  if (bad) throw new Error(bad);

  const companyId = await SupabaseProvider.getCompanyId();
  const ctype     = stContentType(file);
  const path      = fegInspectionPath(companyId, fegInspectionAssetKey(row), record.recordId);

  const up = await FOCC_SUPABASE.storage
    .from(FEG_INSPECTION_BUCKET)
    .upload(path, file, { upsert: true, contentType: ctype, cacheControl: '3600' });
  if (up.error) throw up.error;

  const meta = {
    storagePath: path,
    fileName   : file.name || '',
    fileType   : ctype,
    fileSize   : file.size,
    uploadedAt : new Date().toISOString(),
    uploadedBy : getSessionEmail() || ''
  };
  await fegInspectionPersist(arr => {
    const rec = arr.find(r => r && String(r.recordId || '') === String(record.recordId));
    if (!rec) throw new Error('Record not found. Refresh and try again.');
    rec.file      = meta;
    rec.updatedBy = meta.uploadedBy;
    rec.updatedAt = meta.uploadedAt;
  });
  return meta;
}

async function fegInspectionDownload(record){
  const m = fegInspectionFileMeta(record);
  if (!m.hasFile) throw new Error('No file uploaded yet.');
  const res = await FOCC_SUPABASE.storage
    .from(FEG_INSPECTION_BUCKET)
    .createSignedUrl(m.file.storagePath, 60, m.file.fileName ? { download: m.file.fileName } : {});
  if (res.error) throw res.error;
  window.open(res.data.signedUrl, '_blank', 'noopener');
}

async function fegInspectionDelete(record){
  const m = fegInspectionFileMeta(record);
  if (m.hasFile && m.file.storagePath){
    const del = await FOCC_SUPABASE.storage.from(FEG_INSPECTION_BUCKET).remove([m.file.storagePath]);
    if (del.error) throw del.error;
  }
  await fegInspectionPersist(arr => {
    const i = arr.findIndex(r => r && String(r.recordId || '') === String(record.recordId));
    if (i >= 0) arr.splice(i, 1);
  });
  return true;
}

/* ============================================================
   FEG — Inspection PDF (checklist + summary approval)
============================================================= */
const FEG_INSPECTION_CHECKLIST = [
  'Extinguisher visible & accessible',
  'Location signage / marker clear',
  'Bracket / trolley secure',
  'Body: no dent / rust / leakage',
  'Safety pin present',
  'Tamper seal intact',
  'Pressure gauge in green zone *',
  'Hose & nozzle intact / not blocked',
  'Service tag & label legible / current',
  'Weight / contents normal **',
];

function fegPdfHeadMeta(doc, row, title1, title2, pageNo, totalPages){
  fegPdfText(doc, 'Company Name :', FEG_PDF_M, 18, 9.5, false);
  fegPdfFillRule(doc, FEG_PDF_M + 32, 19, FEG_PDF_M + 92, 19);

  fegPdfTextR(doc, title1, FEG_PDF_R, 15.5, 11, true);
  fegPdfTextR(doc, title2, FEG_PDF_R, 20.5, 11, true);
  fegPdfRule(doc, FEG_PDF_M, 24, FEG_PDF_R, 24, 0.6);

  fegPdfText(doc, 'Asset / Location :', FEG_PDF_M, 31, 9.5, false);
  fegPdfText(doc, String(row.assetRef || '-'), FEG_PDF_M + 31, 31, 9.5, true);
  fegPdfText(doc, 'Branch :', 122, 31, 9.5, false);
  fegPdfText(doc, String(row.branch || '-'), 138, 31, 9.5, true);

  fegPdfText(doc, 'Inspection Month :', FEG_PDF_M, 37.5, 9.5, false);
  fegPdfFillRule(doc, FEG_PDF_M + 33, 38.3, FEG_PDF_M + 73, 38.3);
  fegPdfTextR(doc, 'Page ' + pageNo + ' of ' + totalPages, FEG_PDF_R, 37.5, 9.5, false);

  return 44;
}

function fegPdfDetailRow(doc, y, l1, v1, l2, v2){
  const COL = 93, LAB = 33, VAL = COL - LAB - 3.5;
  const X1  = FEG_PDF_M, X2 = FEG_PDF_M + COL;
  const LH  = 4.6;

  fegPdfFont(doc, 9.5, false);
  const a = v1 ? doc.splitTextToSize(String(v1), VAL) : [''];
  const b = v2 ? doc.splitTextToSize(String(v2), VAL) : [''];
  const n = Math.max(a.length, b.length, 1);

  for (let i = 0; i < n; i++){
    const yy = y + i * LH;
    if (i === 0){
      fegPdfText(doc, l1, X1, yy, 9.5, false, FEG_PDF_GREY);
      fegPdfText(doc, ':', X1 + LAB, yy, 9.5, false, FEG_PDF_GREY);
      if (l2){
        fegPdfText(doc, l2, X2, yy, 9.5, false, FEG_PDF_GREY);
        fegPdfText(doc, ':', X2 + LAB, yy, 9.5, false, FEG_PDF_GREY);
      }
    }
    if (a[i]) fegPdfText(doc, a[i], X1 + LAB + 3, yy, 9.5, true);
    if (b[i]) fegPdfText(doc, b[i], X2 + LAB + 3, yy, 9.5, true);
  }
  return y + n * LH;
}

function fegPdfChecklistTable(doc, y){
  const W = [8, 78, 16, 16, 16, 52];
  const H = ['#', 'ITEM', 'PASS', 'FAIL', 'N/A', 'REMARKS'];
  const headH = 7, rowH = 8;

  const e = [FEG_PDF_M];
  let acc = FEG_PDF_M;
  W.forEach(w => { acc += w; e.push(acc); });

  fegPdfCell(doc, FEG_PDF_M, y, FEG_PDF_R - FEG_PDF_M, headH, true);
  H.forEach((h, i) => {
    if (i === 0)      fegPdfTextC(doc, h, (e[0] + e[1]) / 2, y + 4.8, 8, true, FEG_PDF_GREY);
    else if (i === 1) fegPdfText(doc, h, e[1] + 2, y + 4.8, 8, true, FEG_PDF_GREY);
    else              fegPdfTextC(doc, h, (e[i] + e[i + 1]) / 2, y + 4.8, 8, true, FEG_PDF_GREY);
    if (i > 0) fegPdfRule(doc, e[i], y, e[i], y + headH, 0.2);
  });

  let yy = y + headH;
  FEG_INSPECTION_CHECKLIST.forEach((t, i) => {
    fegPdfCell(doc, FEG_PDF_M, yy, FEG_PDF_R - FEG_PDF_M, rowH, false);
    for (let c = 1; c < e.length - 1; c++) fegPdfRule(doc, e[c], yy, e[c], yy + rowH, 0.2);

    fegPdfTextC(doc, String(i + 1), (e[0] + e[1]) / 2, yy + 5.3, 9, false);
    fegPdfText(doc, t, e[1] + 2, yy + 5.3, 9, false);
    for (let c = 2; c <= 4; c++){
      const cx = (e[c] + e[c + 1]) / 2;
      fegPdfBox(doc, cx - 1.7, yy + 2.2, 3.4);
    }
    yy += rowH;
  });
  return yy;
}

function fegPdfResultBlock(doc, y){
  const X = FEG_PDF_M;

  fegPdfText(doc, 'Overall :', X, y, 9.5, false);
  [['Pass', 32], ['Pass with remarks', 57], ['Fail', 103]].forEach(p => {
    fegPdfBox(doc, p[1], y - 3.1, 3.4);
    fegPdfText(doc, p[0], p[1] + 5, y, 9.5, false);
  });

  let yy = y + 9;
  fegPdfText(doc, 'Findings :', X, yy, 9.5, false);
  fegPdfFillRule(doc, X + 20, yy + 1, FEG_PDF_R, yy + 1);

  yy += 9;
  fegPdfText(doc, 'Action taken :', X, yy, 9.5, false);
  fegPdfFillRule(doc, X + 26, yy + 1, FEG_PDF_R, yy + 1);

  yy += 14;
  fegPdfText(doc, 'Inspected by', X, yy, 9.5, true);
  fegPdfText(doc, 'Name :', X + 26, yy, 9.5, false);
  fegPdfFillRule(doc, X + 38, yy + 1, X + 93, yy + 1);
  fegPdfText(doc, 'Signature :', X + 100, yy, 9.5, false);
  fegPdfFillRule(doc, X + 121, yy + 1, FEG_PDF_R, yy + 1);

  yy += 8;
  fegPdfText(doc, 'Date :', X + 26, yy, 9.5, false);
  fegPdfFillRule(doc, X + 38, yy + 1, X + 93, yy + 1);
  return yy;
}

function fegPdfWarn(doc, y, unit){
  const txt = 'CYLINDER REPLACEMENT ZONE — DO NOT SERVICE. REPLACE CYLINDER.';
  const sub = unit.cylinderDue ? 'Cylinder Test Due: ' + fmtDate(unit.cylinderDue) : '';
  const h   = sub ? 13 : 9;

  doc.setFillColor(255, 246, 214);
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.5);
  doc.rect(FEG_PDF_M, y, FEG_PDF_R - FEG_PDF_M, h, 'FD');

  fegPdfText(doc, txt, FEG_PDF_M + 3, y + 5.6, 9, true, [122, 86, 0]);
  if (sub) fegPdfText(doc, sub, FEG_PDF_M + 3, y + 10.8, 9, false, [122, 86, 0]);
  return y + h + 4;
}

function fegPdfSign(doc, x, y, w, title){
  fegPdfText(doc, title, x, y, 9, true);
  let yy = y + 6.5;
  ['Name', 'Sign', 'Date'].forEach(lab => {
    fegPdfText(doc, lab + ' :', x, yy, 9, false);
    fegPdfFillRule(doc, x + 14, yy + 1, x + w, yy + 1);
    yy += 7;
  });
  return yy;
}

function fegPdfUnitPage(doc, row, unit, idx, totalPages){
  let y = fegPdfHeadMeta(doc, row, 'FIRE EXTINGUISHER', 'MONTHLY INSPECTION FORM', idx + 1, totalPages);

  fegPdfText(doc, 'A · UNIT DETAILS', FEG_PDF_M, y, 9.5, true);
  y += 5.5;
  y = fegPdfDetailRow(doc, y, 'Unit No.',          'Unit ' + (idx + 1), 'Serial No.', fegSerialLabel(unit) || '');
  y = fegPdfDetailRow(doc, y, 'Driver / Incharge', String(unit.driver || ''), '', '');
  y = fegPdfDetailRow(doc, y, 'FEG Type',          String(unit.fegType || ''), 'Capacity', String(unit.capacity || ''));
  y = fegPdfDetailRow(doc, y, 'Manufacturing',     unit.mfgDate ? fmtDate(unit.mfgDate) : '', 'Service Due', unit.serviceDate ? fmtDate(unit.serviceDate) : '');
  y = fegPdfDetailRow(doc, y, 'Cylinder Test Due', unit.cylinderDue ? fmtDate(unit.cylinderDue) : '', 'Manual Status', String(unit.manualStatus || ''));
  y += 3;

  const cyFrom = fegCylinderReplaceFrom(unit.cylinderDue);
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  if (cyFrom && cyFrom <= today) y = fegPdfWarn(doc, y, unit);

  y += 3;
  fegPdfText(doc, 'B · MONTHLY CHECKLIST', FEG_PDF_M, y, 9.5, true);
  y += 4.5;
  y = fegPdfChecklistTable(doc, y);

  fegPdfText(doc, '* N/A for CO2 type (no gauge).   ** Weigh for CO2 (leaks are not visible).', FEG_PDF_M, y + 4, 8, false, FEG_PDF_GREY);
  y += 11;

  fegPdfText(doc, 'C · RESULT & SIGNATURE', FEG_PDF_M, y, 9.5, true);
  y += 7;
  fegPdfResultBlock(doc, y);
}

function fegPdfApprovalPage(doc, row, units, totalPages){
  const list = Array.isArray(units) ? units : [];
  let y = fegPdfHeadMeta(doc, row, 'FEG INSPECTION', 'SUMMARY & APPROVAL', totalPages, totalPages);

  fegPdfText(doc, 'A · UNIT SUMMARY', FEG_PDF_M, y, 9.5, true);
  y += 4.5;

  const H = ['UNIT', 'SERIAL', 'TYPE', 'CAPACITY', 'RESULT', 'REMARKS'];
  const W = [24, 50, 30, 24, 30, 28];
  const e = [FEG_PDF_M];
  let acc = FEG_PDF_M;
  W.forEach(w => { acc += w; e.push(acc); });
  const headH = 7, rowH = 7;

  fegPdfCell(doc, FEG_PDF_M, y, FEG_PDF_R - FEG_PDF_M, headH, true);
  H.forEach((h, i) => {
    fegPdfRule(doc, e[i], y, e[i], y + headH, 0.2);
    fegPdfTextC(doc, h, (e[i] + e[i + 1]) / 2, y + 4.8, 8, true, FEG_PDF_GREY);
  });
  y += headH;

  list.forEach((u, i) => {
    fegPdfCell(doc, FEG_PDF_M, y, FEG_PDF_R - FEG_PDF_M, rowH, false);
    for (let c = 1; c < e.length - 1; c++) fegPdfRule(doc, e[c], y, e[c], y + rowH, 0.2);
    const cells = ['Unit ' + (i + 1), fegSerialLabel(u) || '', String(u.fegType || ''), String(u.capacity || ''), '', ''];
    cells.forEach((v, c) => {
      if (v) fegPdfTextC(doc, v, (e[c] + e[c + 1]) / 2, y + 5, 9, false);
    });
    y += rowH;
  });
  y += 8;

  fegPdfText(doc, 'B · UNITS NOT INSPECTED (REASON)', FEG_PDF_M, y, 9.5, true);
  y += 6;
  fegPdfFillRule(doc, FEG_PDF_M, y, FEG_PDF_R, y);  y += 7;
  fegPdfFillRule(doc, FEG_PDF_M, y, FEG_PDF_R, y);  y += 11;

  fegPdfText(doc, 'C · OVERALL FINDINGS', FEG_PDF_M, y, 9.5, true);
  y += 6;
  fegPdfFillRule(doc, FEG_PDF_M, y, FEG_PDF_R, y);  y += 7;
  fegPdfFillRule(doc, FEG_PDF_M, y, FEG_PDF_R, y);  y += 14;

  fegPdfText(doc, 'D · APPROVAL', FEG_PDF_M, y, 9.5, true);
  y += 6;

  const half = 88, X2 = FEG_PDF_M + half + 10;
  fegPdfSign(doc, FEG_PDF_M, y, half, 'INSPECTED BY');
  fegPdfSign(doc, X2, y, half, 'VERIFIED BY (SAFETY OFFICER)');
  fegPdfSign(doc, FEG_PDF_M, y + 26, half, 'APPROVED BY (MANAGER)');
  fegPdfStamp(doc, X2, y + 22, half, 28);
}

function fegInspectionFormFilename(row){
  const asset = String((row && (row.assetRef || row.assetId)) || 'asset')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const d  = new Date();
  const ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  return `FEG-Inspection-${asset}-${ym}.pdf`;
}

function fegInspectionFormUnits(row){
  return (row.units || []).filter(u => u && !fegIsDisposed(u) && String(u.serialNo || '').trim());
}

async function downloadFegInspectionForm(row){
  if (!(window.jspdf && window.jspdf.jsPDF)){
    alert('PDF library failed to load. Check your internet connection and try again.');
    return;
  }
  const units = fegInspectionFormUnits(row);
  if (!units.length){
    alert('No units to inspect. (Draft units without a serial number and Disposed units are excluded.)');
    return;
  }
  try{
    const { jsPDF } = window.jspdf;
    const doc        = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const totalPages = units.length + 1;

    units.forEach((u, i) => {
      if (i > 0) doc.addPage('a4', 'portrait');
      fegPdfUnitPage(doc, row, u, i, totalPages);
    });

    doc.addPage('a4', 'portrait');
    fegPdfApprovalPage(doc, row, units, totalPages);

    doc.save(fegInspectionFormFilename(row));
  }catch(err){
    console.error('FEG inspection form PDF failed:', err);
    alert('Could not generate the PDF. Please try again.');
  }
}

/* ============================================================
   FEG — Inspection card (mod EDIT sahaja)
============================================================= */
function fegInspectionCardHtml(row, records){
  const list    = Array.isArray(records) ? records : [];
  const pending = list.filter(r => !fegInspectionFileMeta(r).hasFile).length;

  const rows = list.map(rec => {
    const m   = fegInspectionFileMeta(rec);
    const id  = escapeHtml(String(rec.recordId || ''));
    const top = [rec.inspectedOn ? fmtDate(rec.inspectedOn) : '', rec.inspector || '']
                  .filter(Boolean).map(escapeHtml).join(' &middot; ') || '(no date)';
    const sub = m.hasFile
      ? `<span class="feg-insp-sub">${escapeHtml(m.file.fileName || '')}${m.file.fileSize ? ' &middot; ' + Math.round(m.file.fileSize / 1024) + ' KB' : ''}</span>`
      : `<span class="feg-insp-sub is-warn">No file yet</span>`;
    const res = String(rec.result || '').trim();
    return `
      <div class="pm-doc-row${m.hasFile ? '' : ' is-pending'}" data-insp-row="${id}">
        <div class="pm-doc-name feg-insp-name" data-insp-edit="${id}" title="Click to edit details">
          <div>${top}</div>
          ${res ? `<div class="feg-insp-sub">${escapeHtml(res)}</div>` : ''}
          ${sub}
        </div>
        <button type="button" class="pm-doc-btn" data-insp-action="upload" data-insp-id="${id}">Upload</button>
        <button type="button" class="pm-doc-btn" data-insp-action="download" data-insp-id="${id}" ${m.hasFile ? '' : 'disabled'}>Download</button>
        <button type="button" class="pm-doc-btn is-del" data-insp-action="delete" data-insp-id="${id}">Delete</button>
        <input type="file" hidden class="feg-insp-file" data-insp-file="${id}" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png">
      </div>`;
  }).join('');

  return `
    <div class="section feg-insp-card" data-feg-insp="1">
      <div class="section-head">
        <h3>3 &middot; Inspection Form</h3>
        <div class="spacer"></div>
        ${pending ? `<span class="pm-doc-note is-warn">${pending} PENDING</span>` : ''}
        <span class="pm-doc-note">${list.length} RECORD${list.length === 1 ? '' : 'S'}</span>
        <button type="button" class="btn" id="fegInspDownloadForm">Download Inspection Form</button>
        <button type="button" class="btn" id="fegInspAdd">+ Add Inspection Record</button>
      </div>
      <div class="section-body">
        ${list.length
          ? `<div class="feg-insp-list pm-doc-list">${rows}</div>`
          : `<div class="settings-note" style="margin-top:0;">No inspection record yet &mdash; press <b>+ Add Inspection Record</b>, fill in the details, then upload the signed form.</div>`}
      </div>
    </div>`;
}

/* ============================================================
   FEG — Inspection modal
============================================================= */
function openFegInspectionModal(row, existing){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box     = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    const isEdit = !!existing;
    const rec    = existing || {};
    const opts   = FEG_INSPECTION_RESULTS.map(v =>
      `<option value="${escapeHtml(v)}"${String(rec.result || '') === v ? ' selected' : ''}>${escapeHtml(v)}</option>`).join('');

    box.innerHTML = `
      <h4>${isEdit ? 'Edit Inspection Record' : 'Add Inspection Record'}</h4>
      <div class="settings-summary-row" style="background:#f8fafa;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;">
        <div class="label" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">Asset</div>
        <div class="value" style="font-size:13px;color:var(--ink);margin-top:3px;">${escapeHtml(String(row.assetRef || '-'))}${row.branch ? ' &middot; ' + escapeHtml(String(row.branch)) : ''}</div>
      </div>
      <div class="formgrid">
        <div class="formfield"><label>Inspected On *</label>
          <input type="date" id="fegInspDate" value="${escapeHtml(String(rec.inspectedOn || fegInspectionTodayIso()))}"></div>
        <div class="formfield"><label>Inspector *</label>
          <input type="text" id="fegInspBy" placeholder="Name" value="${escapeHtml(String(rec.inspector || ''))}"></div>
        <div class="formfield"><label>Result</label>
          <select id="fegInspResult"><option value="">&mdash;</option>${opts}</select></div>
        <div class="formfield" style="grid-column:1/-1;"><label>Findings / Remarks</label>
          <input type="text" id="fegInspFind" placeholder="e.g. seal broken, gauge low" value="${escapeHtml(String(rec.findings || ''))}"></div>
        <div class="formfield" style="grid-column:1/-1;"><label>Action Taken</label>
          <input type="text" id="fegInspAction" placeholder="e.g. replaced seal" value="${escapeHtml(String(rec.action || ''))}"></div>
      </div>
      <div class="settings-note">${isEdit
        ? 'Details only &mdash; replacing the signed form is done with the <b>Upload</b> button on that row.'
        : 'After saving, the row appears at the top &mdash; press <b>Upload</b> on it to attach the signed form (PDF / JPG / PNG, max 5 MB).'}</div>
      <div class="modalfoot">
        <button class="btn" id="fegInspCancel">Cancel</button>
        <button class="btn primary" id="fegInspSave">${isEdit ? 'Save Changes' : 'Save'}</button>
      </div>`;

    overlay.classList.add('show');
    const finish = v => { overlay.classList.remove('show'); resolve(v); };
    box.querySelector('#fegInspCancel').addEventListener('click', () => finish(null));
    box.querySelector('#fegInspSave').addEventListener('click', () => {
      const date = String(box.querySelector('#fegInspDate').value || '').trim();
      const by   = String(box.querySelector('#fegInspBy').value || '').trim();
      if (!date){ alert('Inspected On is required.'); return; }
      if (!by){ alert('Inspector is required.'); return; }
      finish({
        inspectedOn: date,
        inspector  : by,
        result     : String(box.querySelector('#fegInspResult').value || ''),
        findings   : String(box.querySelector('#fegInspFind').value || '').trim(),
        action     : String(box.querySelector('#fegInspAction').value || '').trim()
      });
    });
  });
}

/* ============================================================
   FEG — Dispose modal
============================================================= */
function openFegDisposeModal(row, unit){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    const serial = fegSerialLabel(unit) || '(no serial)';
    const _t = new Date();
    const todayStr = _t.getFullYear() + '-' + String(_t.getMonth()+1).padStart(2,'0') + '-' + String(_t.getDate()).padStart(2,'0');
    box.innerHTML = `
      <h4>Dispose Extinguisher</h4>
      <div class="notice notice-warning" style="margin-bottom:14px;">
        This unit will be marked <strong>Disposed</strong>. It <strong>stays</strong> in the FEG List and keeps appearing on the FEG Disposal page.
      </div>
      <div class="settings-summary-row" style="background:#f8fafa;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;">
        <div class="label" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">Unit</div>
        <div class="value" style="font-size:13px;color:var(--ink);margin-top:3px;">${escapeHtml(row.assetRef || '-')} &middot; ${escapeHtml(serial)}</div>
      </div>
      <div class="formgrid">
        <div class="formfield"><label>Vendor who collected *</label>
          <input type="text" id="fegDisVendor" list="fegVendorList" autocomplete="off" placeholder="e.g. Fire Safety Services">
        </div>
        <div class="formfield"><label>Reason *</label>
          <select id="fegDisReason">${FEG_DISPOSAL_REASONS.map(r => `<option value="${r}">${r}</option>`).join('')}</select>
        </div>
        <div class="formfield" style="grid-column:1/-1;"><label>Remark (optional)</label>
          <input type="text" id="fegDisNote" placeholder="Short note">
        </div>
        <div class="formfield"><label>Date Disposed *</label>
          <input type="date" id="fegDisDate" value="${todayStr}">
        </div>
      </div>
      <div class="settings-note">Date Disposed is what appears on the FEG Disposal table. Your email and the time this record was saved are stored automatically.</div>
      <div class="modalfoot">
        <button class="btn" id="fegDisCancel">Cancel</button>
        <button class="btn danger" id="fegDisConfirm">Dispose</button>
      </div>`;
    overlay.classList.add('show');
    const finish = v => { overlay.classList.remove('show'); resolve(v); };
    box.querySelector('#fegDisCancel').addEventListener('click', () => finish(null));
    box.querySelector('#fegDisConfirm').addEventListener('click', () => {
      const vendor = String(box.querySelector('#fegDisVendor').value || '').trim();
      const reason = String(box.querySelector('#fegDisReason').value || '').trim();
      const note   = String(box.querySelector('#fegDisNote').value || '').trim();
      const date   = String(box.querySelector('#fegDisDate').value || '').trim();
      if (!vendor){ alert('Vendor who collected is required.'); return; }
      if (!reason){ alert('Reason is required.'); return; }
      if (!date){ alert('Date Disposed is required.'); return; }
      finish({ vendor: vendor, reason: reason, note: note, date: date });
    });
    const vEl = box.querySelector('#fegDisVendor');
    if (vEl) setTimeout(() => vEl.focus(), 60);
  });
}

/* ============================================================
   FEG — Service modal
============================================================= */
function openFegServiceModal(row, unit, vendorList){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    const serial = fegSerialLabel(unit) || '(no serial)';
    const vAll = (Array.isArray(vendorList) ? vendorList.slice() : []);
    const uv   = String((unit && unit.vendor) || '').trim();
    if (uv && !vAll.includes(uv)) vAll.push(uv);
    vAll.sort((a,b) => String(a).localeCompare(String(b)));
    box.innerHTML = `
      <h4>Send for Service</h4>
      <div class="notice notice-warning" style="margin-bottom:14px;">
        This unit will be marked <strong>In Service</strong>. It <strong>stays</strong> in the FEG List. Press <strong>Cancel Service</strong> on that row if you picked the wrong unit.
      </div>
      <div class="settings-summary-row" style="background:#f8fafa;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;">
        <div class="label" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">Unit</div>
        <div class="value" style="font-size:13px;color:var(--ink);margin-top:3px;">${escapeHtml(row.assetRef || '-')} &middot; ${escapeHtml(serial)}</div>
      </div>
      <div class="formgrid">
        <div class="formfield"><label>Vendor who collected *</label>
          <div class="combo-wrap">
            <input type="text" id="fegSvcVendor" autocomplete="off" placeholder="Type new or pick existing...">
            <div class="combo-panel" id="fegSvcVendorPanel"></div>
          </div>
        </div>
        <div class="formfield"><label>Reason *</label>
          <select id="fegSvcReason">${FEG_SERVICE_REASONS.map(r => `<option value="${r}">${r}</option>`).join('')}</select>
        </div>
        <div class="formfield" style="grid-column:1/-1;"><label>Remark (optional)</label>
          <input type="text" id="fegSvcNote" placeholder="Short note">
        </div>
      </div>
      <div class="settings-note">Service date &amp; time plus your email are recorded automatically. Next service due is set when you press Complete Service later.</div>
      <div class="modalfoot">
        <button class="btn" id="fegSvcCancel">Cancel</button>
        <button class="btn primary" id="fegSvcConfirm">Service</button>
      </div>`;
    overlay.classList.add('show');
    const finish = v => { overlay.classList.remove('show'); resolve(v); };
    box.querySelector('#fegSvcCancel').addEventListener('click', () => finish(null));

    const vInput = box.querySelector('#fegSvcVendor');
    const vPanel = box.querySelector('#fegSvcVendorPanel');
    const escV   = s => String(s == null ? '' : s).replace(/"/g, '&quot;');
    function vRender(){
      const cur  = String(vInput.value || '').trim();
      const term = cur.toLowerCase();
      const vis  = vAll.filter(v => !term || String(v).toLowerCase().includes(term));
      vPanel.innerHTML = vis.length
        ? vis.map(v => `<div class="combo-item${v === cur ? ' is-active' : ''}" data-value="${escV(v)}">
             <span class="combo-item-text">${escV(v)}</span>
             <button type="button" class="combo-del" data-del="${escV(v)}" title="Remove from list">&times;</button>
           </div>`).join('')
        : '<div class="combo-empty">Type a new vendor name&hellip;</div>';

      vPanel.querySelectorAll('.combo-item').forEach(rowEl => {
        const t = rowEl.querySelector('.combo-item-text');
        if (t) t.addEventListener('mousedown', e => {
          e.preventDefault(); e.stopPropagation();
          vInput.value = rowEl.dataset.value || '';
          vPanel.classList.remove('open');
        });
        const del = rowEl.querySelector('.combo-del');
        if (del) del.addEventListener('mousedown', async e => {
          e.preventDefault(); e.stopPropagation();
          const v = String(rowEl.dataset.value || '');
          const idx = vAll.findIndex(x => String(x) === v);
          if (idx >= 0) vAll.splice(idx, 1);
          if (String(vInput.value || '').trim() === v) vInput.value = '';
          try{ await saveOptionList('feg', 'vendor', vAll.slice()); }catch(err){}
          vRender();
        });
      });
    }
    vInput.addEventListener('focus', () => { vRender(); vPanel.classList.add('open'); });
    vInput.addEventListener('click', () => { vRender(); vPanel.classList.add('open'); });
    vInput.addEventListener('input', () => { vRender(); vPanel.classList.add('open'); });
    vInput.addEventListener('blur',  () => setTimeout(() => vPanel.classList.remove('open'), 120));
    vInput.addEventListener('keydown', e => { if (e.key === 'Escape') vPanel.classList.remove('open'); });

    box.querySelector('#fegSvcConfirm').addEventListener('click', async () => {
      const vendor = String(box.querySelector('#fegSvcVendor').value || '').trim();
      const reason = String(box.querySelector('#fegSvcReason').value || '').trim();
      const note   = String(box.querySelector('#fegSvcNote').value || '').trim();
      if (!vendor){ alert('Vendor who collected is required.'); return; }
      if (!reason){ alert('Reason is required.'); return; }
      if (!vAll.some(v => String(v).toLowerCase() === vendor.toLowerCase())){
        vAll.push(vendor);
        vAll.sort((a,b) => String(a).localeCompare(String(b)));
        try{ await saveOptionList('feg', 'vendor', vAll.slice()); }catch(e){}
      }
      finish({ vendor: vendor, reason: reason, remark: note });
    });
    const vEl = box.querySelector('#fegSvcVendor');
    if (vEl) setTimeout(() => vEl.focus(), 60);
  });
}

/* ============================================================
   FEG — Complete Service modal
============================================================= */
function openFegCompleteServiceModal(row, unit, rec){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    const serial = fegSerialLabel(unit) || '(no serial)';
    box.innerHTML = `
      <h4>Complete Service</h4>
      <div class="notice notice-warning" style="margin-bottom:14px;">
        This record becomes <strong>Completed</strong> and stays in Service History for audit. Next service due will be set to <strong>Date Received + 1 year</strong>.
      </div>
      <div class="settings-summary-row" style="background:#f8fafa;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;">
        <div class="label" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">Unit</div>
        <div class="value" style="font-size:13px;color:var(--ink);margin-top:3px;">${escapeHtml(row.assetRef || '-')} &middot; ${escapeHtml(serial)} &middot; ${escapeHtml((rec && rec.vendor) || '-')}</div>
      </div>
      <div class="formgrid">
        <div class="formfield"><label>Date Received *</label>
          <input type="date" id="fegCmpDate">
        </div>
        <div class="formfield"><label>Invoice No</label>
          <input type="text" id="fegCmpInvoice" autocomplete="off" placeholder="e.g. INV-00123">
        </div>
        <div class="formfield"><label>Price (RM)</label>
          <input type="number" id="fegCmpPrice" step="0.01" min="0" placeholder="0.00">
        </div>
      </div>
      <div class="settings-note">Your email and the completion time are recorded automatically.</div>
      <div class="modalfoot">
        <button class="btn" id="fegCmpCancel">Cancel</button>
        <button class="btn primary" id="fegCmpConfirm">Save</button>
      </div>`;
    overlay.classList.add('show');
    const finish = v => { overlay.classList.remove('show'); resolve(v); };
    box.querySelector('#fegCmpCancel').addEventListener('click', () => finish(null));
    box.querySelector('#fegCmpConfirm').addEventListener('click', () => {
      const receivedDate = String(box.querySelector('#fegCmpDate').value || '').trim();
      const invoiceNo    = String(box.querySelector('#fegCmpInvoice').value || '').trim();
      const price        = String(box.querySelector('#fegCmpPrice').value || '').trim();
      if (!receivedDate){ alert('Date Received is required.'); return; }
      finish({ receivedDate: receivedDate, invoiceNo: invoiceNo, price: price });
    });
    const dEl = box.querySelector('#fegCmpDate');
    if (dEl) setTimeout(() => dEl.focus(), 60);
  });
}