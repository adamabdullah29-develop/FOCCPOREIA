/* =========================================================================
   FOCC — 08-pages-safety.js (BAHAGIAN B)
   Safety Equipment module: page, detail view, inspection, receiving, PDF.
   ========================================================================= */

/* ============================================================
   SAFETY EQUIPMENT — helpers
============================================================= */
function txt(v){ return escapeHtml(String(v == null ? '' : v)); }
function attr(v){ return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function sfTodayIso(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function sfAddMonths(iso, n){
  const d = new Date(String(iso || '').slice(0,10) + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + Number(n || 0));
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function sfAddYears(iso, n){
  const d = new Date(String(iso || '').slice(0,10) + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + Number(n || 0));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function sfDueBadge(dueIso, today){
  if (!dueIso) return '<span style="color:var(--muted)">&mdash;</span>';
  const due = new Date(dueIso + 'T00:00:00');
  if (isNaN(due.getTime())) return '<span style="color:var(--muted)">&mdash;</span>';
  const days = Math.round((due - today) / 86400000);
  if (days < 0)   return '<span class="cdx-countdown bad">Expired ' + Math.abs(days) + 'd ago</span>';
  if (days <= 30) return '<span class="cdx-countdown warn">' + days + ' Days Balance</span>';
  return '<span>' + fmtDate(dueIso) + '</span>';
}

function sfRowKey(row){ return row ? String(row.assetId || '') : ''; }
function sfRememberOpen(row){
  try{
    const v = row ? String(row.assetId || '') : '';
    if (v) sessionStorage.setItem(SF_OPEN_KEY, v);
    else sessionStorage.removeItem(SF_OPEN_KEY);
  }catch(e){}
}
function sfForgetOpen(){ try{ sessionStorage.removeItem(SF_OPEN_KEY); }catch(e){} }
function sfRecallOpenIndex(rows){
  if (!Array.isArray(rows) || !rows.length) return -1;
  let want = '';
  try{ want = sessionStorage.getItem(SF_OPEN_KEY) || ''; }catch(e){ return -1; }
  if (!want) return -1;
  return rows.findIndex(r => r && String(r.assetId || '') === want);
}

async function sfEnsureAssetIds(){
  const rows = await getData('safetyEquipment');
  if (!Array.isArray(rows) || !rows.length) return;
  let changed = false;
  rows.forEach(r => { if (r && !String(r.assetId || '').trim()){ r.assetId = fegNewId('SE'); changed = true; } });
  if (changed){ DATA_CACHE.safetyEquipment = rows; await persist('safetyEquipment'); }
}
function sfItemsFor(category){
  return String(category || '') === 'Staff' ? SAFETY_STAFF_ITEMS : SAFETY_TRUCK_ITEMS;
}

/* ============================================================
   SAFETY EQUIPMENT — files
============================================================= */
function sfDocPath(companyId, assetId, kind, recordId){
  return companyId + '/safety/' + (assetId || 'unassigned') + '/' + kind + '/' + recordId;
}
function sfFileMeta(rec){
  const f = (rec && rec.file && typeof rec.file === 'object') ? rec.file : {};
  return { hasFile: !!(f.storagePath || f.fileName), file: f };
}
function sfSortDesc(list){
  return (Array.isArray(list) ? list.slice() : []).sort((a,b) => {
    const da = String((a && (a.inspectedOn || a.dateReceived)) || '');
    const db = String((b && (b.inspectedOn || b.dateReceived)) || '');
    if (da !== db) return db.localeCompare(da);
    return String((b && b.createdAt) || '').localeCompare(String((a && a.createdAt) || ''));
  });
}
function sfRecordsForAsset(all, row){
  const key = sfRowKey(row);
  return sfSortDesc((all || []).filter(r => r && String(r.assetId || '') === key));
}

/* ============================================================
   SAFETY EQUIPMENT — saving records
============================================================= */
async function sfRecordPersist(tableKey, mutate){
  const list = await getData(tableKey);
  const arr  = Array.isArray(list) ? list : [];
  const out  = mutate(arr);
  DATA_CACHE[tableKey] = arr;
  await persist(tableKey);
  return out;
}
async function sfRecordAdd(tableKey, row, info){
  const at  = new Date().toISOString();
  const isR = tableKey === SF_RECEIVING_TABLE;
  const rec = {
    recordId : fegNewId(isR ? 'SR' : 'SI'),
    assetId  : sfRowKey(row),
    assetRef : String(row.asset || ''),
    category : String(row.category || ''),
    branch   : String(row.branch || ''),
    file     : {},
    createdBy: getSessionEmail() || '',
    createdAt: at,
    updatedBy: '',
    updatedAt: ''
  };
  if (isR){
    rec.dateReceived = String((info && info.dateReceived) || '');
    rec.receivedBy   = String((info && info.receivedBy) || '');
    rec.handedOverBy = String((info && info.handedOverBy) || '');
    rec.condition    = String((info && info.condition) || '');
    rec.notes        = String((info && info.notes) || '');
  } else {
    rec.inspectedOn = String((info && info.inspectedOn) || '');
    rec.inspector   = String((info && info.inspector) || '');
    rec.result      = String((info && info.result) || '');
    rec.findings    = String((info && info.findings) || '');
    rec.action      = String((info && info.action) || '');
  }
  await sfRecordPersist(tableKey, arr => { arr.push(rec); });
  return rec;
}
async function sfRecordUpdate(tableKey, recordId, info){
  const at  = new Date().toISOString();
  const isR = tableKey === SF_RECEIVING_TABLE;
  return await sfRecordPersist(tableKey, arr => {
    const rec = arr.find(r => r && String(r.recordId || '') === String(recordId));
    if (!rec) throw new Error('Record not found. Refresh and try again.');
    if (isR){
      rec.dateReceived = String((info && info.dateReceived) || '');
      rec.receivedBy   = String((info && info.receivedBy) || '');
      rec.handedOverBy = String((info && info.handedOverBy) || '');
      rec.condition    = String((info && info.condition) || '');
      rec.notes        = String((info && info.notes) || '');
    } else {
      rec.inspectedOn = String((info && info.inspectedOn) || '');
      rec.inspector   = String((info && info.inspector) || '');
      rec.result      = String((info && info.result) || '');
      rec.findings    = String((info && info.findings) || '');
      rec.action      = String((info && info.action) || '');
    }
    rec.updatedBy = getSessionEmail() || '';
    rec.updatedAt = at;
    return rec;
  });
}
async function sfRecordUploadFile(tableKey, row, record, file){
  const bad = await stValidateFile(file);
  if (bad) throw new Error(bad);

  const companyId = await SupabaseProvider.getCompanyId();
  const ctype     = stContentType(file);
  const kind      = tableKey === SF_RECEIVING_TABLE ? 'receiving' : 'inspection';
  const path      = sfDocPath(companyId, sfRowKey(row), kind, record.recordId);

  const up = await FOCC_SUPABASE.storage
    .from(PM_DOC_BUCKET)
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
  await sfRecordPersist(tableKey, arr => {
    const rec = arr.find(r => r && String(r.recordId || '') === String(record.recordId));
    if (!rec) throw new Error('Record not found. Refresh and try again.');
    rec.file      = meta;
    rec.updatedBy = meta.uploadedBy;
    rec.updatedAt = meta.uploadedAt;
  });
  return meta;
}
async function sfRecordDownload(record){
  const m = sfFileMeta(record);
  if (!m.hasFile) throw new Error('No file uploaded yet.');
  const res = await FOCC_SUPABASE.storage
    .from(PM_DOC_BUCKET)
    .createSignedUrl(m.file.storagePath, 60, m.file.fileName ? { download: m.file.fileName } : {});
  if (res.error) throw res.error;
  window.open(res.data.signedUrl, '_blank', 'noopener');
}
async function sfRecordDelete(tableKey, record){
  const m = sfFileMeta(record);
  if (m.hasFile && m.file.storagePath){
    const del = await FOCC_SUPABASE.storage.from(PM_DOC_BUCKET).remove([m.file.storagePath]);
    if (del.error) throw del.error;
  }
  await sfRecordPersist(tableKey, arr => {
    const i = arr.findIndex(r => r && String(r.recordId || '') === String(record.recordId));
    if (i >= 0) arr.splice(i, 1);
  });
  return true;
}

/* ============================================================
   SAFETY EQUIPMENT — modal 1: Inspection
============================================================= */
function openSafetyInspectionModal(row, existing){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box     = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    const isEdit = !!existing;
    const rec    = existing || {};
    const opts   = SF_INSPECTION_RESULTS.map(v =>
      '<option value="' + escapeHtml(v) + '"' + (String(rec.result || '') === v ? ' selected' : '') + '>' + escapeHtml(v) + '</option>').join('');

    box.innerHTML = `
      <h4>${isEdit ? 'Edit Inspection Record' : 'Add Inspection Record'}</h4>
      <div class="settings-summary-row" style="background:#f8fafa;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;">
        <div class="label" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">Asset / Staff</div>
        <div class="value" style="font-size:13px;color:var(--ink);margin-top:3px;">${escapeHtml(String(row.asset || '-'))}${row.branch ? ' &middot; ' + escapeHtml(String(row.branch)) : ''}</div>
      </div>
      <div class="formgrid">
        <div class="formfield"><label>Inspected On *</label>
          <input type="date" id="sfInspDate" value="${escapeHtml(String(rec.inspectedOn || sfTodayIso()))}"></div>
        <div class="formfield"><label>Inspector *</label>
          <input type="text" id="sfInspBy" placeholder="Name" value="${escapeHtml(String(rec.inspector || ''))}"></div>
        <div class="formfield"><label>Result</label>
          <select id="sfInspResult"><option value="">&mdash;</option>${opts}</select></div>
        <div class="formfield" style="grid-column:1/-1;"><label>Findings / Remarks</label>
          <input type="text" id="sfInspFind" placeholder="e.g. cone missing, vest torn" value="${escapeHtml(String(rec.findings || ''))}"></div>
        <div class="formfield" style="grid-column:1/-1;"><label>Action Taken</label>
          <input type="text" id="sfInspAction" placeholder="e.g. replaced cone" value="${escapeHtml(String(rec.action || ''))}"></div>
      </div>
      <div class="settings-note">${isEdit
        ? 'Details only &mdash; replace the form using the <b>Upload</b> button on that row.'
        : 'After saving, the row appears at the top &mdash; click <b>Upload</b> to attach the form (PDF / JPG / PNG, max 5 MB).'}</div>
      <div class="modalfoot">
        <button class="btn" id="sfInspCancel">Cancel</button>
        <button class="btn primary" id="sfInspSave">${isEdit ? 'Save Changes' : 'Save'}</button>
      </div>`;

    overlay.classList.add('show');
    const finish = v => { overlay.classList.remove('show'); resolve(v); };
    box.querySelector('#sfInspCancel').addEventListener('click', () => finish(null));
    box.querySelector('#sfInspSave').addEventListener('click', () => {
      const date = String(box.querySelector('#sfInspDate').value || '').trim();
      const by   = String(box.querySelector('#sfInspBy').value || '').trim();
      if (!date){ alert('Inspected On is required.'); return; }
      if (!by){ alert('Inspector is required.'); return; }
      finish({
        inspectedOn: date,
        inspector  : by,
        result     : String(box.querySelector('#sfInspResult').value || ''),
        findings   : String(box.querySelector('#sfInspFind').value || '').trim(),
        action     : String(box.querySelector('#sfInspAction').value || '').trim()
      });
    });
  });
}

/* ============================================================
   SAFETY EQUIPMENT — modal 2: Receiving
============================================================= */
function openSafetyReceivingModal(row, existing){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box     = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    const isEdit = !!existing;
    const rec    = existing || {};
    const conds  = SF_CONDITIONS.map(v =>
      '<option value="' + escapeHtml(v) + '"' + (String(rec.condition || '') === v ? ' selected' : '') + '>' + escapeHtml(v) + '</option>').join('');

    box.innerHTML = `
      <h4>${isEdit ? 'Edit Receiving Record' : 'Add Receiving Record'}</h4>
      <div class="settings-summary-row" style="background:#f8fafa;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;">
        <div class="label" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">Asset / Staff</div>
        <div class="value" style="font-size:13px;color:var(--ink);margin-top:3px;">${escapeHtml(String(row.asset || '-'))}${row.branch ? ' &middot; ' + escapeHtml(String(row.branch)) : ''}</div>
      </div>
      <div class="formgrid">
        <div class="formfield"><label>Date Received *</label>
          <input type="date" id="sfRecvDate" value="${escapeHtml(String(rec.dateReceived || sfTodayIso()))}"></div>
        <div class="formfield"><label>Received By *</label>
          <input type="text" id="sfRecvBy" placeholder="Name" value="${escapeHtml(String(rec.receivedBy || ''))}"></div>
        <div class="formfield"><label>Handed Over By *</label>
          <input type="text" id="sfRecvFrom" placeholder="Name" value="${escapeHtml(String(rec.handedOverBy || ''))}"></div>
        <div class="formfield"><label>Condition</label>
          <select id="sfRecvCond"><option value="">&mdash;</option>${conds}</select></div>
        <div class="formfield" style="grid-column:1/-1;"><label>Notes</label>
          <input type="text" id="sfRecvNotes" placeholder="e.g. 6 items received in good order" value="${escapeHtml(String(rec.notes || ''))}"></div>
      </div>
      <div class="settings-note">${isEdit
        ? 'Details only &mdash; replace the file using the <b>Upload</b> button on that row.'
        : 'After saving, the row appears at the top &mdash; click <b>Upload</b> to attach the receiving form (PDF / JPG / PNG, max 5 MB).'}</div>
      <div class="modalfoot">
        <button class="btn" id="sfRecvCancel">Cancel</button>
        <button class="btn primary" id="sfRecvSave">${isEdit ? 'Save Changes' : 'Save'}</button>
      </div>`;

    overlay.classList.add('show');
    const finish = v => { overlay.classList.remove('show'); resolve(v); };
    box.querySelector('#sfRecvCancel').addEventListener('click', () => finish(null));
    box.querySelector('#sfRecvSave').addEventListener('click', () => {
      const d    = String(box.querySelector('#sfRecvDate').value || '').trim();
      const by   = String(box.querySelector('#sfRecvBy').value || '').trim();
      const from = String(box.querySelector('#sfRecvFrom').value || '').trim();
      if (!d){ alert('Date Received is required.'); return; }
      if (!by){ alert('Received By is required.'); return; }
      if (!from){ alert('Handed Over By is required.'); return; }
      finish({
        dateReceived: d,
        receivedBy  : by,
        handedOverBy: from,
        condition   : String(box.querySelector('#sfRecvCond').value || ''),
        notes       : String(box.querySelector('#sfRecvNotes').value || '').trim()
      });
    });
  });
}

/* ============================================================
   SAFETY EQUIPMENT — record row (shared)
============================================================= */
function sfRecordRowsHtml(records, tableKey){
  const isR = tableKey === SF_RECEIVING_TABLE;
  return records.map(rec => {
    const m   = sfFileMeta(rec);
    const id  = escapeHtml(String(rec.recordId || ''));
    const top = (isR
        ? [rec.dateReceived ? fmtDate(rec.dateReceived) : '', rec.receivedBy || '']
        : [rec.inspectedOn ? fmtDate(rec.inspectedOn) : '', rec.inspector || '']
      ).filter(Boolean).map(escapeHtml).join(' &middot; ') || '(no date)';
    const mid = isR ? String(rec.condition || '').trim() : String(rec.result || '').trim();
    const sub = m.hasFile
      ? '<span class="sf-rec-sub">' + escapeHtml(m.file.fileName || '') + (m.file.fileSize ? ' &middot; ' + Math.round(m.file.fileSize / 1024) + ' KB' : '') + '</span>'
      : '<span class="sf-rec-sub is-warn">No file yet</span>';
    return `
      <div class="pm-doc-row${m.hasFile ? '' : ' is-pending'}" data-sf-row="${id}">
        <div class="pm-doc-name sf-rec-name" data-sf-edit="${id}" title="Click to edit details">
          <div>${top}</div>
          ${mid ? '<div class="sf-rec-sub">' + escapeHtml(mid) + '</div>' : ''}
          ${sub}
        </div>
        <button type="button" class="pm-doc-btn" data-sf-action="upload" data-sf-id="${id}">Upload</button>
        <button type="button" class="pm-doc-btn" data-sf-action="download" data-sf-id="${id}" ${m.hasFile ? '' : 'disabled'}>Download</button>
        <button type="button" class="pm-doc-btn is-del" data-sf-action="delete" data-sf-id="${id}">Delete</button>
        <input type="file" hidden class="sf-rec-file" data-sf-file="${id}" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png">
      </div>`;
  }).join('');
}

/* ============================================================
   SAFETY EQUIPMENT — Card 1: Group Info
============================================================= */
function sfInfoCardHtml(row){
  return `
    <div class="section sf-info-card">
      <div class="section-head"><h3>1 &middot; Group Info</h3></div>
      <div class="section-body">
        <div class="pm-detail-grid">
          <div class="pm-detail-row"><span class="pm-detail-lbl">Category</span><span class="pm-detail-val">${txt(row.category)}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Asset / Staff</span><span class="pm-detail-val">${txt(row.asset)}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Branch</span><span class="pm-detail-val">${txt(row.branch)}</span></div>
        </div>
        <div class="settings-note" style="margin-top:12px;">Category &amp; Asset are <b>locked</b> once the record is saved (keeps Truck / Staff items from mixing). Need to change it? Delete and add a new record.</div>
      </div>
    </div>`;
}

/* ============================================================
   SAFETY EQUIPMENT — Card 2: Equipment Items
============================================================= */
function sfFegNearestText(row){
  const map = [['cylinderDue','Cylinder Test'], ['serviceDate','Service']];
  let best = '', lbl = '';
  (row.units || []).forEach(u => {
    if (!u || String(u.disposal || 'No') === 'Yes' || !String(u.serialNo || '').trim()) return;
    map.forEach(p => {
      const v = String(u[p[0]] || '').trim();
      if (!v) return;
      if (!best || v < best){ best = v; lbl = p[1]; }
    });
  });
  return best ? ' &middot; next ' + lbl + ' ' + fmtDate(best) : '';
}
function sfFegCellHtml(row, fegRows){
  const key = String(row.asset || '').trim().toUpperCase();
  const hit = (fegRows || []).find(r => r && String(r.assetRef || '').trim().toUpperCase() === key);
  let text = 'No FEG record for ' + (row.asset || '-');
  let units = 0;
  if (hit){
    units = (hit.units || []).filter(u => u && String(u.disposal || 'No') !== 'Yes' && String(u.serialNo || '').trim()).length;
    text  = units ? (units + ' active unit' + (units === 1 ? '' : 's') + sfFegNearestText(hit)) : 'FEG record exists &mdash; no active units yet';
  }
  return '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
    '<span class="badge ' + (hit && units ? 'good' : 'warn') + '">' + txt(text) + '</span>' +
    '<button type="button" class="sf-feg-link" data-sf-open-feg="1">Open FEG &rarr;</button></div>';
}
function sfItemsCardHtml(row, editing, draft, fegRows){
  const category = String(row.category || 'Truck');
  const isTruck  = category !== 'Staff';
  const items    = sfItemsFor(category);
  const today    = new Date(); today.setHours(0,0,0,0);
  const valOf    = id => editing ? String((draft || {})[id] || '') : String(row[id] || '');

  const itemRows = items.map(it => {
    const val = valOf(it.id);
    const cell = editing
      ? '<input type="date" data-sf-item="' + it.id + '" value="' + attr(val) + '">'
      : (val ? '<span class="sf-item-val">' + txt(fmtDate(val)) + '</span>' : '<span class="sf-never">' + (isTruck ? 'Never inspected' : 'Not received yet') + '</span>');
    return `
      <div class="sf-item-row">
        <div class="sf-item-name"><span class="sf-item-dot"></span><span>${txt(it.label)}</span></div>
        <div class="sf-item-date">${cell}</div>
        <div class="sf-item-due">${sfDueBadge(val ? sfAddYears(val, 1) : '', today)}</div>
      </div>`;
  }).join('');

  const overall     = valOf('inspectionDate');
  const overallCell = editing
    ? '<input type="date" data-sf-item="inspectionDate" value="' + attr(overall) + '">'
    : (overall ? '<span class="sf-item-val">' + txt(fmtDate(overall)) + '</span>' : '<span class="sf-never">Not set</span>');
  const overallRow = isTruck ? `
      <div class="sf-item-row is-overall">
        <div class="sf-item-name"><span class="sf-item-dot is-overall"></span><span>Overall Inspection Date</span></div>
        <div class="sf-item-date">${overallCell}</div>
        <div class="sf-item-due">${sfDueBadge(overall ? sfAddYears(overall, 1) : '', today)}</div>
      </div>` : '';

  const fegRow = isTruck ? `
      <div class="sf-item-row is-feg">
        <div class="sf-item-name"><span class="sf-item-dot is-feg"></span>
          <div><span>Fire Extinguisher</span><span class="sf-item-sub">Managed in the FEG module &mdash; not here.</span></div>
        </div>
        <div class="sf-item-feg">${sfFegCellHtml(row, fegRows)}</div>
      </div>` : '';

  return `
    <div class="section sf-items-card">
      <div class="section-head">
        <h3>2 &middot; Equipment Items</h3>
        <div class="spacer"></div>
        <span class="pm-doc-note">${escapeHtml(category.toUpperCase())} &middot; ${items.length} ITEM${items.length === 1 ? '' : 'S'}</span>
      </div>
      <div class="section-body">
        <div class="sf-item-head"><span>Item</span><span>${isTruck ? 'Inspection Date' : 'Received Date'}</span><span>Next Due (+1 year)</span></div>
        <div class="sf-item-list">
          ${overallRow}
          ${itemRows}
          ${fegRow}
        </div>
        ${editing ? '' : '<div class="settings-note" style="margin-top:12px;">Item dates can be changed via <b>&#9998; Edit Details</b>.</div>'}
      </div>
    </div>`;
}

/* ============================================================
   SAFETY EQUIPMENT — Card 3: Inspection Form
============================================================= */
function sfInspectionCardHtml(row, records){
  const list    = Array.isArray(records) ? records : [];
  const pending = list.filter(r => !sfFileMeta(r).hasFile).length;
  const last    = list.length ? String(list[0].inspectedOn || '') : '';
  const nextDue = last ? sfAddMonths(last, 1) : '';
  const head    = list.length
    ? '<div class="settings-note" style="margin:0 0 8px;">Monthly audit' +
      (last ? ' &middot; last <b>' + escapeHtml(fmtDate(last)) + '</b>' : '') +
      (nextDue ? ' &middot; next due <b>' + escapeHtml(fmtDate(nextDue)) + '</b>' : '') + '</div>'
    : '';
  return `
    <div class="section sf-insp-card" data-sf-insp="1">
      <div class="section-head">
        <h3>3 &middot; Inspection Form</h3>
        <div class="spacer"></div>
        ${pending ? '<span class="pm-doc-note is-warn">' + pending + ' PENDING</span>' : ''}
        <span class="pm-doc-note">${list.length} RECORD${list.length === 1 ? '' : 'S'}</span>
        <button type="button" class="btn" id="sfInspAdd">+ Add Inspection Record</button>
      </div>
      <div class="section-body">
        ${head}
        ${list.length
          ? '<div class="sf-rec-list pm-doc-list">' + sfRecordRowsHtml(list, SF_INSPECTION_TABLE) + '</div>'
          : '<div class="settings-note" style="margin-top:0;">No inspection records yet &mdash; click <b>+ Add Inspection Record</b>, fill in the details, then click <b>Upload</b> on that row.</div>'}
      </div>
    </div>`;
}

/* ============================================================
   SAFETY EQUIPMENT — Card 4: Receiving Form
============================================================= */
function sfReceivingCardHtml(row, records){
  const list    = Array.isArray(records) ? records : [];
  const pending = list.filter(r => !sfFileMeta(r).hasFile).length;
  return `
    <div class="section sf-recv-card" data-sf-recv="1">
      <div class="section-head">
        <h3>${String(row.category || '') === 'Staff' ? '3' : '4'} &middot; Receiving Form</h3>
        <div class="spacer"></div>
        ${pending ? '<span class="pm-doc-note is-warn">' + pending + ' PENDING</span>' : ''}
        <span class="pm-doc-note">${list.length} RECORD${list.length === 1 ? '' : 'S'}</span>
        ${String(row.category || '') === 'Staff' ? '<button type="button" class="btn" id="sfRecvForm">Download Form</button>' : ''}
        <button type="button" class="btn" id="sfRecvAdd">+ Add Receiving Record</button>
      </div>
      <div class="section-body">
        ${list.length
          ? '<div class="sf-rec-list pm-doc-list">' + sfRecordRowsHtml(list, SF_RECEIVING_TABLE) + '</div>'
          : '<div class="settings-note" style="margin-top:0;">No receiving records yet &mdash; click <b>+ Add Receiving Record</b>, fill in the details, then click <b>Upload</b> on that row.</div>'}
      </div>
    </div>`;
}

/* ============================================================
   SAFETY EQUIPMENT — PDF: Receiving Form
============================================================= */
function sfReceivingFileName(row){
  const who = String(row.asset || 'Record').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
  return 'Receiving-' + who + '-' + sfTodayIso().replace(/-/g, '') + '.pdf';
}
function sfPdfItemsTable(doc, y, labels){
  const W = [8, 52, 10, 88, 28];
  const H = ['#', 'ITEM', 'QTY', 'CONDITION', 'NOTES'];
  const headH = 7, rowH = 10;

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

  const rows = (Array.isArray(labels) ? labels.slice(0, 5) : []);
  while (rows.length < 5) rows.push('');

  let yy = y + headH;
  rows.forEach((label, i) => {
    fegPdfCell(doc, FEG_PDF_M, yy, FEG_PDF_R - FEG_PDF_M, rowH, false);
    for (let c = 1; c < e.length - 1; c++) fegPdfRule(doc, e[c], yy, e[c], yy + rowH, 0.2);

    fegPdfTextC(doc, String(i + 1), (e[0] + e[1]) / 2, yy + 6.4, 8.5, false);

    if (label){
      fegPdfText(doc, String(label), e[1] + 2, yy + 6.4, 9, false);
      fegPdfTextC(doc, '1', (e[2] + e[3]) / 2, yy + 6.4, 9, false);

      [['Good', 2], ['Fair', 21], ['Replace Soon', 38], ['Damaged', 65]].forEach(o => {
        const bx = e[3] + o[1];
        fegPdfBox(doc, bx, yy + 4.6, 3.2);
        fegPdfText(doc, o[0], bx + 4.4, yy + 6.4, 7.5, false);
      });
    }
    yy += rowH;
  });

  return yy;
}
async function downloadSafetyReceivingForm(row){
  if (!(window.jspdf && window.jspdf.jsPDF)){
    alert('PDF library failed to load. Check your internet connection and try again.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const M = FEG_PDF_M, R = FEG_PDF_R;

  /* HEADER */
  fegPdfText(doc, 'Company Name :', M, 17, 9.5, false);
  fegPdfFillRule(doc, M + 32, 18, M + 92, 18);

  fegPdfTextR(doc, 'SAFETY EQUIPMENT', R, 15.5, 11, true);
  fegPdfTextR(doc, 'RECEIVING FORM',   R, 20.5, 11, true);

  fegPdfText(doc, 'Page 1 of 1', M, 20.5, 9.5, false);
  fegPdfText(doc, 'Generated ' + fmtDate(sfTodayIso()), M, 26.5, 9, false, FEG_PDF_GREY);
  fegPdfRule(doc, M, 30, R, 30, 0.6);

  fegPdfText(doc, 'Asset / Staff :', M, 38, 9.5, false);
  fegPdfText(doc, String(row.asset || '-'), M + 24, 38, 9.5, true);
  fegPdfText(doc, 'Branch :', 122, 38, 9.5, false);
  fegPdfText(doc, String(row.branch || '-'), 140, 38, 9.5, true);

  fegPdfText(doc, 'Category :', M, 44.5, 9.5, false);
  fegPdfText(doc, String(row.category || '-'), M + 24, 44.5, 9.5, true);
  fegPdfText(doc, 'Record Ref. :', 122, 44.5, 9.5, false);
  fegPdfText(doc, String(row.assetId || '-'), 145, 44.5, 9.5, true);

  /* A · ITEMS RECEIVED */
  let y = 54;
  fegPdfText(doc, 'A · ITEMS RECEIVED', M, y, 9.5, true);
  y += 5;
  y = sfPdfItemsTable(doc, y, sfItemsFor(row.category).map(i => i.label));

  /* B · RECEIVING DETAILS */
  y += 12;
  fegPdfText(doc, 'B · RECEIVING DETAILS', M, y, 9.5, true);
  y += 8;
  fegPdfText(doc, 'Date Received :', M, y, 9.5, false);
  fegPdfFillRule(doc, M + 30, y + 1, M + 66, y + 1);
  fegPdfText(doc, 'Received By :', M + 74, y, 9.5, false);
  fegPdfFillRule(doc, M + 101, y + 1, R, y + 1);

  y += 11;
  fegPdfText(doc, 'Handed Over By :', M, y, 9.5, false);
  fegPdfFillRule(doc, M + 34, y + 1, M + 120, y + 1);

  y += 11;
  fegPdfText(doc, 'Notes :', M, y, 9.5, false);
  fegPdfFillRule(doc, M + 18, y + 1, R, y + 1);
  fegPdfFillRule(doc, M + 18, y + 11, R, y + 11);

  /* C · SIGNATURE */
  y += 26;
  fegPdfText(doc, 'C · SIGNATURE', M, y, 9.5, true);
  y += 8;

  fegPdfText(doc, 'Received by', M, y, 9.5, true);
  fegPdfText(doc, 'Handed over by', M + 96, y, 9.5, true);

  let sy = y + 8;
  ['Name', 'Sign', 'Date'].forEach(lab => {
    fegPdfText(doc, lab + ' :', M, sy, 9.5, false);
    fegPdfFillRule(doc, M + 16, sy + 1, M + 86, sy + 1);
    fegPdfText(doc, lab + ' :', M + 96, sy, 9.5, false);
    fegPdfFillRule(doc, M + 112, sy + 1, R, sy + 1);
    sy += 9;
  });

  fegPdfStamp(doc, M + 112, sy + 3, R - (M + 112), 24);

  doc.save(sfReceivingFileName(row));
}

/* ============================================================
   SAFETY EQUIPMENT — Detail View
============================================================= */
async function renderSafetyDetailView(root, index, onBack, opts){
  opts = opts || {};
  const all = await getData('safetyEquipment');
  const row = all[index];
  if (!row){ if (onBack) await onBack(); return; }
  sfRememberOpen(row);

  let editing = !!opts.startEditing;
  let draft   = null;
  let inspAll = [], recvAll = [], fegRows = [];
  try{ inspAll = await getData(SF_INSPECTION_TABLE); }catch(e){ inspAll = []; }
  if (!Array.isArray(inspAll)) inspAll = [];
  try{ recvAll = await getData(SF_RECEIVING_TABLE); }catch(e){ recvAll = []; }
  if (!Array.isArray(recvAll)) recvAll = [];
  try{ fegRows = await getData('feg'); }catch(e){ fegRows = []; }
  if (!Array.isArray(fegRows)) fegRows = [];

  function beginDraft(){
    draft = {};
    ['inspectionDate'].concat(sfItemsFor(row.category).map(i => i.id)).forEach(k => { draft[k] = String(row[k] || ''); });
  }
  function readItemsFromDom(){
    if (!draft) return;
    root.querySelectorAll('[data-sf-item]').forEach(inp => {
      draft[inp.dataset.sfItem] = String(inp.value || '');
    });
  }
  async function reloadRecords(){
    try{ inspAll = await getData(SF_INSPECTION_TABLE); }catch(e){ inspAll = []; }
    if (!Array.isArray(inspAll)) inspAll = [];
    try{ recvAll = await getData(SF_RECEIVING_TABLE); }catch(e){ recvAll = []; }
    if (!Array.isArray(recvAll)) recvAll = [];
  }
  function paintRecords(){
    readItemsFromDom();
    const inspCard = root.querySelector('[data-sf-insp]');
    if (inspCard){
      const tmp = document.createElement('div');
      tmp.innerHTML = sfInspectionCardHtml(row, sfRecordsForAsset(inspAll, row));
      inspCard.replaceWith(tmp.firstElementChild);
    }
    const recvCard = root.querySelector('[data-sf-recv]');
    if (recvCard){
      const tmp = document.createElement('div');
      tmp.innerHTML = sfReceivingCardHtml(row, sfRecordsForAsset(recvAll, row));
      recvCard.replaceWith(tmp.firstElementChild);
    }
  }
  function flagUpload(recordId){
    const rowEl = root.querySelector('[data-sf-row="' + recordId + '"]');
    if (!rowEl) return;
    const btn = rowEl.querySelector('[data-sf-action="upload"]');
    if (btn){ btn.classList.add('is-flagged'); setTimeout(() => btn.classList.remove('is-flagged'), 3400); }
    setTimeout(() => { if (rowEl.scrollIntoView) rowEl.scrollIntoView({ behavior:'smooth', block:'center' }); }, 120);
  }
  function findRec(tableKey, id){
    const list = tableKey === SF_RECEIVING_TABLE ? recvAll : inspAll;
    return list.find(r => r && String(r.recordId || '') === String(id));
  }
  function keyOf(el){
    return el && el.closest('[data-sf-recv]') ? SF_RECEIVING_TABLE : SF_INSPECTION_TABLE;
  }

  function paint(){
    const isStaff = String(row.category || '') === 'Staff';
    root.innerHTML = `
      <div class="pm-detail-head">
        <button class="btn" id="sfBack">&#8592; Back</button>
        <div>
          <span class="truckchip">${txt(row.asset || '(No Name)')}</span>
          <span class="pm-detail-sub">${txt(row.category || '')}${row.branch ? ' &middot; ' + txt(row.branch) : ''}</span>
        </div>
        <div class="spacer"></div>
        ${editing
          ? '<button class="btn" id="sfCancel">Cancel</button><button class="btn primary" id="sfSave">Save Changes</button>'
          : '<button class="btn primary" id="sfEdit">&#9998; Edit Details</button>'}
      </div>
      <div class="pm-detail-card-grid safety-detail ${editing ? 'is-edit' : 'is-view'}${isStaff ? ' is-staff' : ''}">
        ${sfInfoCardHtml(row)}
        ${sfItemsCardHtml(row, editing, draft, fegRows)}
        ${editing && !isStaff ? sfInspectionCardHtml(row, sfRecordsForAsset(inspAll, row)) : ''}
        ${editing ? sfReceivingCardHtml(row, sfRecordsForAsset(recvAll, row)) : ''}
      </div>`;

    const back = root.querySelector('#sfBack');
    if (back) back.onclick = async () => {
      if (editing && !confirm('You have unsaved changes. Leave without saving?')) return;
      sfForgetOpen();
      await onBack();
    };

    const editBtn = root.querySelector('#sfEdit');
    if (editBtn) editBtn.onclick = () => { beginDraft(); editing = true; paint(); };

    const cancelBtn = root.querySelector('#sfCancel');
    if (cancelBtn) cancelBtn.onclick = () => {
      if (!confirm('Discard your changes?')) return;
      draft = null; editing = false; paint();
    };

    const saveBtn = root.querySelector('#sfSave');
    if (saveBtn) saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      try{
        readItemsFromDom();
        Object.keys(draft || {}).forEach(k => { row[k] = draft[k]; });
        all[index] = row;
        await persist('safetyEquipment');
        editing = false; draft = null;
        paint();
      }catch(e){
        saveBtn.disabled = false;
        alert('Save failed: ' + (e && e.message ? e.message : e));
      }
    };

    root.querySelectorAll('[data-sf-open-feg]').forEach(b => {
      b.onclick = () => { if (typeof reloadToRoute === 'function') reloadToRoute('feg'); };
    });

    const sfClick = async e => {
      const insAdd = e.target.closest('#sfInspAdd');
      if (insAdd){
        if (insAdd.disabled) return;
        const info = await openSafetyInspectionModal(row, null);
        if (!info) return;
        insAdd.disabled = true;
        try{
          const rec = await sfRecordAdd(SF_INSPECTION_TABLE, row, info);
          await reloadRecords(); paintRecords(); flagUpload(rec.recordId);
        }catch(err){ insAdd.disabled = false; alert('Save failed: ' + (err && err.message ? err.message : err)); }
        return;
      }

      const recvForm = e.target.closest('#sfRecvForm');
      if (recvForm){
        if (recvForm.disabled) return;
        const oldTxt = recvForm.textContent;
        recvForm.disabled = true; recvForm.textContent = 'Generating\u2026';
        try{ await downloadSafetyReceivingForm(row); }
        catch(err){ alert('Download failed: ' + (err && err.message ? err.message : err)); }
        finally{ recvForm.disabled = false; recvForm.textContent = oldTxt; }
        return;
      }

      const recvAdd = e.target.closest('#sfRecvAdd');
      if (recvAdd){
        if (recvAdd.disabled) return;
        const info = await openSafetyReceivingModal(row, null);
        if (!info) return;
        recvAdd.disabled = true;
        try{
          const rec = await sfRecordAdd(SF_RECEIVING_TABLE, row, info);
          await reloadRecords(); paintRecords(); flagUpload(rec.recordId);
        }catch(err){ recvAdd.disabled = false; alert('Save failed: ' + (err && err.message ? err.message : err)); }
        return;
      }

      const editEl = e.target.closest('[data-sf-edit]');
      if (editEl){
        const id  = String(editEl.dataset.sfEdit || '');
        const key = keyOf(editEl);
        const rec = findRec(key, id);
        if (!rec) return;
        const info = key === SF_RECEIVING_TABLE ? await openSafetyReceivingModal(row, rec) : await openSafetyInspectionModal(row, rec);
        if (!info) return;
        try{ await sfRecordUpdate(key, id, info); await reloadRecords(); paintRecords(); }
        catch(err){ alert('Save failed: ' + (err && err.message ? err.message : err)); }
        return;
      }

      const btn = e.target.closest('[data-sf-action]');
      if (!btn) return;
      const id  = String(btn.dataset.sfId || '');
      const key = keyOf(btn);
      const rec = findRec(key, id);
      if (!rec) return;

      if (btn.dataset.sfAction === 'upload'){
        const inp = root.querySelector('[data-sf-file="' + id + '"]');
        if (inp) inp.click();
        return;
      }
      if (btn.dataset.sfAction === 'download'){
        try{ btn.disabled = true; await sfRecordDownload(rec); }
        catch(err){ alert('Download failed: ' + (err && err.message ? err.message : err)); }
        btn.disabled = !sfFileMeta(rec).hasFile;
        return;
      }
      if (btn.dataset.sfAction === 'delete'){
        const ok = await confirmModal('Delete Record',
          'This record <strong>and its attached file</strong> will be permanently deleted (cannot be undone).',
          { confirmLabel:'Delete', tone:'danger' });
        if (!ok) return;
        btn.disabled = true;
        try{ await sfRecordDelete(key, rec); await reloadRecords(); paintRecords(); }
        catch(err){ btn.disabled = false; alert('Delete failed: ' + (err && err.message ? err.message : err)); }
      }
    };

    const sfChange = async e => {
      const inp = e.target.closest('[data-sf-file]');
      if (!inp) return;
      const file = inp.files && inp.files[0];
      if (!file) return;
      const id  = String(inp.dataset.sfFile || '');
      const key = keyOf(inp);
      const rec = findRec(key, id);
      inp.value = '';
      if (!rec) return;
      try{ await sfRecordUploadFile(key, row, rec, file); await reloadRecords(); paintRecords(); }
      catch(err){ alert('Upload failed: ' + (err && err.message ? err.message : err)); }
    };

    if (root.__sfClick)  root.removeEventListener('click',  root.__sfClick);
    if (root.__sfChange) root.removeEventListener('change', root.__sfChange);
    root.__sfClick  = sfClick;
    root.__sfChange = sfChange;
    root.addEventListener('click',  sfClick);
    root.addEventListener('change', sfChange);
  }

  if (editing) beginDraft();
  paint();
}

/* ============================================================
   SAFETY EQUIPMENT — Page (list)
============================================================= */
async function renderSafetyPage(){
  const root = document.createElement('div');

  async function showList(){
    sfForgetOpen();
    await sfEnsureAssetIds();
    const listWrap = await renderDataPage('safetyEquipment', {
      wrapperClass: 'opkpi-modern-page',
      filterFields: ['branch'],
      onAddRow: () => openAddRowModal('safetyEquipment', () => showList(), {
        completeLabel: 'Save &amp; Complete Details',
        onComplete: async () => {
          await sfEnsureAssetIds();
          const data = await getData('safetyEquipment');
          await renderSafetyDetailView(root, Math.max(0, data.length - 1), showList, { startEditing: true });
        },
      }),
      tableOptions: {
        linkColumnId: 'asset',
        onLinkClick: async index => { await renderSafetyDetailView(root, index, showList); },
        onEditRow:   async index => { await renderSafetyDetailView(root, index, showList, { startEditing: true }); },
      },
    });
    root.innerHTML = '';
    root.appendChild(listWrap);
  }

  await sfEnsureAssetIds();
  const openIdx = sfRecallOpenIndex(await getData('safetyEquipment'));
  if (openIdx >= 0) await renderSafetyDetailView(root, openIdx, showList);
  else await showList();

  return root;
}

/* ============================================================
   PDF PRIMITIVES (shared with FEG module)
============================================================= */
const FEG_PDF_M    = 12;
const FEG_PDF_R    = 198;
const FEG_PDF_INK  = [17, 17, 17];
const FEG_PDF_GREY = [110, 110, 110];
const FEG_PDF_LINE = [150, 150, 150];
const FEG_PDF_FILL = [242, 244, 246];

function fegPdfFont(doc, size, bold, color){
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size || 9.5);
  const c = color || FEG_PDF_INK;
  doc.setTextColor(c[0], c[1], c[2]);
}
function fegPdfText(doc, text, x, y, size, bold, color){
  fegPdfFont(doc, size, bold, color);
  doc.text(String(text == null ? '' : text), x, y);
}
function fegPdfTextC(doc, text, cx, y, size, bold, color){
  fegPdfFont(doc, size, bold, color);
  doc.text(String(text == null ? '' : text), cx, y, { align: 'center' });
}
function fegPdfTextR(doc, text, x, y, size, bold, color){
  fegPdfFont(doc, size, bold, color);
  doc.text(String(text == null ? '' : text), x, y, { align: 'right' });
}
function fegPdfRule(doc, x1, y1, x2, y2, w){
  doc.setDrawColor(FEG_PDF_LINE[0], FEG_PDF_LINE[1], FEG_PDF_LINE[2]);
  doc.setLineWidth(w || 0.2);
  doc.line(x1, y1, x2, y2);
}
function fegPdfFillRule(doc, x1, y1, x2, y2, w){
  doc.setDrawColor(138, 138, 138);
  doc.setLineWidth(w || 0.25);
  doc.line(x1, y1, x2, y2);
}
function fegPdfBox(doc, x, y, s){
  doc.setDrawColor(70, 70, 70);
  doc.setLineWidth(0.25);
  doc.rect(x, y, s || 3.4, s || 3.4);
}
function fegPdfCell(doc, x, y, w, h, fill){
  doc.setDrawColor(FEG_PDF_LINE[0], FEG_PDF_LINE[1], FEG_PDF_LINE[2]);
  doc.setLineWidth(0.2);
  if (fill){
    doc.setFillColor(FEG_PDF_FILL[0], FEG_PDF_FILL[1], FEG_PDF_FILL[2]);
    doc.rect(x, y, w, h, 'FD');
  } else {
    doc.rect(x, y, w, h, 'S');
  }
}
function fegPdfStamp(doc, x, y, w, h){
  doc.setDrawColor(140, 140, 140);
  doc.setLineWidth(0.25);
  doc.rect(x, y, w, h, 'S');
  fegPdfTextC(doc, 'COMPANY STAMP', x + w / 2, y + h / 2 + 1, 8.5, false, FEG_PDF_GREY);
}