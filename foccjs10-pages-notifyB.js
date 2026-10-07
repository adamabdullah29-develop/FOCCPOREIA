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