/* =========================================================================
   FOCC — 09-pages-fleet.js  (GABUNGAN A + B + C)
   Prime Mover, Trailer, Staff Database, HIRARC.
   =========================================================================
   Bahagian A — Prime Mover
   Bahagian B — Trailer
   Bahagian C — Staff Database + HIRARC
   ========================================================================= */

/* =========================================================================
   BAHAGIAN A — PRIME MOVER
   ========================================================================= */

/* ============================================================
   PM — Detail sections definition
============================================================= */
const PM_DETAIL_SECTIONS = [
  { title:'1 · Vehicle Identity', fields:[
    {id:'lorry', label:'Truck No.', type:'text'},
    {id:'branch', label:'Branch', type:'text'},
    {id:'chassisNo', label:'Chassis No.', type:'text'},
    {id:'make', label:'Manufacturer', type:'text'},
    {id:'model', label:'Model', type:'text'},
    {id:'registerYear', label:'Register Year', type:'text'},
    {id:'goodsType', label:'Goods Type', type:'text'},
  ]},
  { title:'2 · Specification', fields:[
    {id:'bdm', label:'BDM (kg)', type:'number'},
    {id:'tankInfo', label:'Tank Info', type:'text'},
    {id:'electricalSystem', label:'Electrical System', type:'text'},
    {id:'deviceType', label:'Device Type', type:'text'},
  ]},
  { title:'3 · Cards & Identification', fields:[
    {id:'tngNo', label:'TnG No.', type:'text'},
    {id:'fleetCardNo', label:'Fleet Card No.', type:'text'},
    {id:'rfidNo', label:'RFID No.', type:'text'},
  ]},
  { title:'4 · Compliance Documents', fields:[
    {id:'roadtaxNo', label:'Roadtax No.', type:'text'},
    {id:'roadtax', label:'Roadtax Expiry Date', type:'date'},
    {id:'singaporeRoadtaxNo', label:'Singapore Roadtax No.', type:'text'},
    {id:'singaporeRoadtaxExpiry', label:'Singapore Roadtax Expiry Date', type:'date'},
    {id:'puspakomNo', label:'Puspakom No.', type:'text'},
    {id:'puspakom', label:'Puspakom Expiry Date', type:'date'},
    {id:'insuranceNo', label:'Insurance No.', type:'text'},
    {id:'insurance', label:'Insurance Expiry Date', type:'date'},
    {id:'insuranceSumAssured', label:'Insurance Sum Assured (RM)', type:'money'},
  ]},
  { title:'5 · PMA & Notes', fields:[
    {id:'pmaOwner', label:'PMA Owner', type:'text'},
    {id:'pmaNo', label:'PMA No.', type:'text'},
    {id:'pmaCategory', label:'PMA Category', type:'text'},
    {id:'pmaExpiry', label:'PMA Expiry Date', type:'date'},
    {id:'remark', label:'Remark', type:'textarea'},
  ]},
];

/* ============================================================
   PM — Storage path + asset ID
============================================================= */
async function pmEnsureAssetIds(){
  const rows = await getData('primeMover');
  if (!Array.isArray(rows) || !rows.length) return;
  let changed = false;
  rows.forEach(r => { if (r && !r.assetId){ r.assetId = pmNewId(); changed = true; } });
  if (changed) await persist('primeMover');
}

function pmStoragePath(companyId, row, slotId){
  const asset = (row && row.assetId) ? row.assetId : 'unassigned';
  return `${companyId}/prime-mover/${asset}/${slotId}`;
}

async function pmReadHead(file){
  const blob = file.slice(0, 5);
  if (blob.text) return await blob.text();
  return await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload  = () => res(String(fr.result || ''));
    fr.onerror = () => rej(new Error('Could not read the file.'));
    fr.readAsText(blob);
  });
}

async function pmValidatePdf(file){
  if (!file) return 'No file selected.';
  if (!/\.pdf$/i.test(String(file.name || ''))) return 'Only PDF files are allowed.';
  if (file.size < 1) return 'The file is empty.';
  if (file.size > PM_DOC_MAX_BYTES) return 'File is larger than 5 MB.';
  let head = '';
  try{ head = await pmReadHead(file); }catch(e){ return 'Could not read the file.'; }
  if (head !== '%PDF-') return 'This file is not a valid PDF.';
  return '';
}

async function pmUploadDoc(row, slotId, file, expiryValue){
  const bad = await pmValidatePdf(file);
  if (bad) throw new Error(bad);

  const companyId = await SupabaseProvider.getCompanyId();
  const path      = pmStoragePath(companyId, row, slotId);
  const prevDoc   = (row && row.docs && row.docs[slotId]) || {};
  const prevPath  = prevDoc.storagePath || '';

  if (prevPath && prevPath !== path){
    try{ await FOCC_SUPABASE.storage.from(PM_DOC_BUCKET).remove([prevPath]); }catch(e){}
  }

  const up = await FOCC_SUPABASE.storage
    .from(PM_DOC_BUCKET)
    .upload(path, file, { upsert: true, contentType: 'application/pdf', cacheControl: '3600' });
  if (up.error) throw up.error;

  return {
    storagePath: path,
    fileName:    file.name,
    fileType:    'application/pdf',
    fileSize:    file.size,
    uploadedAt:  new Date().toISOString(),
    uploadedBy:  getSessionEmail() || '',
    validUntil:  expiryValue || '',
    status:      'current',
    updateMode:  prevDoc.updateMode || '',
  };
}

async function pmOpenDoc(row, slotId){
  const m = pmDocMeta(row, slotId);
  if (!m.hasFile || !m.doc.storagePath) throw new Error('No file uploaded yet.');
  const res = await FOCC_SUPABASE.storage
    .from(PM_DOC_BUCKET)
    .createSignedUrl(m.doc.storagePath, 60, m.doc.fileName ? { download: m.doc.fileName } : {});
  if (res.error) throw res.error;
  window.open(res.data.signedUrl, '_blank', 'noopener');
}

async function pmDeleteDoc(row, slotId){
  const m = pmDocMeta(row, slotId);
  if (m.doc.storagePath){
    const del = await FOCC_SUPABASE.storage.from(PM_DOC_BUCKET).remove([m.doc.storagePath]);
    if (del.error) throw del.error;
  }
  return true;
}

/* ============================================================
   PM — Display helpers
============================================================= */
function pmDisplayValue(field, row){
  const raw = row ? row[field.id] : '';
  if (raw === '' || raw === null || raw === undefined) return '-';
  if (field.type === 'date')  return fmtDate(raw);
  if (field.type === 'money') return FMT.money(raw);
  if (field.type === 'number') return FMT.num(raw);
  return String(raw);
}

/* ============================================================
   PM — Card 7: Documents
============================================================= */
function pmDocumentsCardHtml(truck){
  const pendingCount  = PM_DOCUMENT_SLOTS.reduce((n, s) => n + (pmDocMeta(truck, s.id).pending ? 1 : 0), 0);
  const uploadedCount = PM_DOCUMENT_SLOTS.reduce((n, s) => n + (pmDocMeta(truck, s.id).hasFile ? 1 : 0), 0);
  return `
    <div class="section">
      <div class="section-head">
        <h3>7 · Documents</h3>
        <div class="spacer"></div>
        ${pendingCount ? `<span class="pm-doc-note is-warn">${pendingCount} PENDING UPLOAD</span>` : ''}
        <span class="pm-doc-note">${uploadedCount}/${PM_DOCUMENT_SLOTS.length} UPLOADED</span>
        <span class="pm-doc-note">PDF &middot; MAX 5 MB</span>
      </div>
      <div class="section-body">
        <div class="pm-doc-list">
          ${PM_DOCUMENT_SLOTS.map(slot => {
            const m = pmDocMeta(truck, slot.id);
            const when = (m.hasFile && m.doc.uploadedAt) ? fmtDate(m.doc.uploadedAt) : '-';
            const rowCls = m.pending ? ' is-pending' : '';
            const stateCls = m.status === 'current' ? ' is-on' : (m.pending ? ' is-warn' : '');
            const stateTxt = m.status === 'current' ? 'Uploaded'
                           : m.pending ? 'Pending upload'
                           : 'Not uploaded';
            const byLine = m.hasFile
              ? `<span class="pm-doc-date">${escapeHtml(m.doc.uploadedBy || '')}${m.doc.uploadedBy && m.doc.fileSize ? ' &middot; ' : ''}${m.doc.fileSize ? Math.round(m.doc.fileSize / 1024) + ' KB' : ''}</span>`
              : '';
            const declared = (m.pending && m.doc.pendingSince)
              ? `<span class="pm-doc-date">Renewal declared: ${escapeHtml(fmtDate(m.doc.pendingSince))}</span>` : '';
            return `
              <div class="pm-doc-row${rowCls}" data-slot="${slot.id}">
                <div class="pm-doc-name">${escapeHtml(slot.label)}</div>
                <button type="button" class="pm-doc-btn" data-doc-action="upload" data-slot="${slot.id}">Upload</button>
                <button type="button" class="pm-doc-btn" data-doc-action="download" data-slot="${slot.id}" ${m.hasFile ? '' : 'disabled'}>Download</button>
                <button type="button" class="pm-doc-btn is-del" data-doc-action="delete" data-slot="${slot.id}" ${m.hasFile ? '' : 'disabled'}>Delete</button>
                <div class="pm-doc-meta">
                  <span class="pm-doc-state${stateCls}">
                    <input type="checkbox" disabled ${m.status === 'current' ? 'checked' : ''}>
                    ${stateTxt}
                  </span>
                  <span class="pm-doc-date">Upload date: ${escapeHtml(String(when))}</span>
                  ${byLine}
                  ${declared}
                </div>
                <input type="file" class="pm-doc-file" data-slot="${slot.id}" accept="application/pdf,.pdf" hidden>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

/* ============================================================
   PM — Card 6: Assigned Trailers
============================================================= */
function pmAssignedTrailersCardHtml(truck, editing, tlRows, taken){
  const assigned = Array.isArray(truck.assignedTrailers) ? truck.assignedTrailers.map(String) : [];
  const rows = (tlRows || []).filter(t => t && (t.assetId || t.lorry));

  if (!rows.length){
    return `
      <div class="section">
        <div class="section-head"><h3>6 · Assigned Trailers</h3></div>
        <div class="section-body">
          <div class="settings-note" style="margin-top:0;">No trailer records yet. Add them in the Trailer page first.</div>
        </div>
      </div>`;
  }

  if (editing){
    return `
      <div class="section">
        <div class="section-head">
          <h3>6 · Assigned Trailers</h3>
          <div class="spacer"></div>
          <span class="pm-doc-note">${assigned.length} SELECTED</span>
        </div>
        <div class="section-body">
          <div class="pm-tl-pick">
            ${rows.map(t => {
              const asset = String(t.assetId || '');
              const on = assigned.includes(asset);
              const heldBy = (!on && taken && taken.get(asset)) ? String(taken.get(asset)) : '';
              const sub = [t.type, t.branch].filter(Boolean).map(String).join(' &middot; ');
              const subTxt = heldBy ? `Assigned to ${heldBy} — release it there first` : sub;
              return `<label class="pm-tl-pick-row${heldBy ? ' is-locked' : ''}">
                <input type="checkbox" data-tl-pick="${escapeHtml(asset)}" ${on ? 'checked' : ''} ${heldBy ? 'disabled' : ''}>
                <span><b>${escapeHtml(String(t.lorry || '(No Trailer No.)'))}</b><small>${escapeHtml(subTxt)}</small></span>
              </label>`;
            }).join('')}
          </div>
          <div class="settings-note">Trailer yang ditanda akan tunjuk <b>Assigned Prime Mover</b> secara automatik di page Trailer.</div>
        </div>
      </div>`;
  }

  const list = rows.filter(t => assigned.includes(String(t.assetId || '')));
  return `
    <div class="section">
      <div class="section-head">
        <h3>6 · Assigned Trailers</h3>
        <div class="spacer"></div>
        <span class="pm-doc-note">${list.length} ASSIGNED</span>
      </div>
      <div class="section-body">
        ${list.length
          ? `<div class="pm-tl-chips">${list.map(t => `<span class="pm-tl-chip">${escapeHtml(String(t.lorry || ''))}</span>`).join('')}</div>`
          : `<div class="settings-note" style="margin-top:0;">No trailer assigned to this prime mover yet.</div>`}
      </div>
    </div>`;
}

/* ============================================================
   PM — Open key (session persistence)
============================================================= */
function pmRememberOpen(row){
  try{
    const v = row ? String(row.assetId || row.lorry || '') : '';
    if (v) sessionStorage.setItem(PM_OPEN_KEY, v);
    else sessionStorage.removeItem(PM_OPEN_KEY);
  }catch(e){}
}
function pmForgetOpen(){
  try{ sessionStorage.removeItem(PM_OPEN_KEY); }catch(e){}
}
function pmRecallOpenIndex(rows){
  if (!Array.isArray(rows) || !rows.length) return -1;
  let want = '';
  try{ want = sessionStorage.getItem(PM_OPEN_KEY) || ''; }catch(e){ return -1; }
  if (!want) return -1;
  return rows.findIndex(r => r && (String(r.assetId || '') === want || String(r.lorry || '') === want));
}

/* ============================================================
   PM — Detail View
============================================================= */
async function renderPrimeMoverDetailView(root, index, onBack, opts){
  const all = await getData('primeMover');
  let truck = all[index];
  if (!truck){ await onBack(); return; }
  pmRememberOpen(truck);

  let tlRows = [];
  try{ if (typeof tlEnsureAssetIds === 'function') await tlEnsureAssetIds(); }catch(e){}
  try{ tlRows = await getData('trailer'); }catch(e){ tlRows = []; }
  if (!Array.isArray(tlRows)) tlRows = [];

  function tlTakenByOthers(){
    const taken = new Map();
    const myAsset = String(truck.assetId || '');
    const myLorry = String(truck.lorry || '');
    (all || []).forEach(pm => {
      if (!pm) return;
      const sameRow = myAsset
        ? String(pm.assetId || '') === myAsset
        : String(pm.lorry || '') === myLorry;
      if (sameRow) return;
      const list = Array.isArray(pm.assignedTrailers) ? pm.assignedTrailers : [];
      list.forEach(a => { const k = String(a || ''); if (k) taken.set(k, String(pm.lorry || '(no truck)')); });
    });
    return taken;
  }

  let editing = false;
  let pmDocRadioValue = '';
  let pendingFocusSlots = null;

  function readOnlyHtml(){
    return `
      <div class="pm-detail-card-grid">
        ${PM_DETAIL_SECTIONS.map(sec => `
          <div class="section">
            <div class="section-head"><h3>${escapeHtml(sec.title)}</h3></div>
            <div class="section-body">
              <div class="pm-detail-grid">
                ${sec.fields.map(f => `
                  <div class="pm-detail-row">
                    <span class="pm-detail-lbl">${escapeHtml(f.label)}</span>
                    <span class="pm-detail-val">${escapeHtml(pmDisplayValue(f, truck))}</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>`).join('')}
        ${pmAssignedTrailersCardHtml(truck, false, tlRows)}
        ${pmDocumentsCardHtml(truck)}
      </div>`;
  }

  function editHtml(){
    return `
      <div class="pm-detail-card-grid">
        ${PM_DETAIL_SECTIONS.map(sec => `
          <div class="section">
            <div class="section-head"><h3>${escapeHtml(sec.title)}</h3></div>
            <div class="section-body">
              <div class="formgrid">
                ${sec.fields.map(f => {
                  const v = (truck[f.id] === undefined || truck[f.id] === null) ? '' : truck[f.id];
                  const safe = escapeHtml(String(v));
                  if (f.type === 'textarea') return `<div class="formfield full"><label>${escapeHtml(f.label)}</label><textarea data-col="${f.id}" rows="3">${safe}</textarea></div>`;
                  if (f.type === 'date')  return `<div class="formfield"><label>${escapeHtml(f.label)}</label><input data-col="${f.id}" type="date" value="${safe}"></div>`;
                  if (f.type === 'number' || f.type === 'money') return `<div class="formfield"><label>${escapeHtml(f.label)}</label><input data-col="${f.id}" type="number" step="any" value="${safe}"></div>`;
                  return `<div class="formfield"><label>${escapeHtml(f.label)}</label><input data-col="${f.id}" type="text" value="${safe}"></div>`;
                }).join('')}
              </div>
            </div>
          </div>`).join('')}
        ${pmAssignedTrailersCardHtml(truck, true, tlRows, tlTakenByOthers())}
        ${pmDocumentsCardHtml(truck)}
      </div>`;
  }

  function paint(){
    root.innerHTML = `
      <div class="pm-detail-head">
        <button class="btn" id="pmBack">&#8592; Back</button>
        <div>
          <span class="truckchip">${escapeHtml(truck.lorry || '(No Truck)')}</span>
          <span class="pm-detail-sub">${escapeHtml(truck.branch || '')}</span>
        </div>
        <div class="spacer"></div>
        ${editing
          ? `<button class="btn" id="pmCancel">Cancel</button>
             <button class="btn primary" id="pmSave">Save Changes</button>`
          : `<button class="btn primary" id="pmEdit">&#9998; Edit Details</button>`}
      </div>
      <div id="pmBody">${editing ? editHtml() + '<div id="pmDocUpdatePanel"></div>' : readOnlyHtml()}</div>
    `;

    const backBtn = root.querySelector('#pmBack');
    if (backBtn) backBtn.onclick = async () => {
      if (editing){
        if (!confirm('You have unsaved changes. Leave without saving?')) return;
      }
      await onBack();
    };

    const editBtn = root.querySelector('#pmEdit');
    if (editBtn) editBtn.onclick = () => { editing = true; paint(); };

    const cancelBtn = root.querySelector('#pmCancel');
    if (cancelBtn) cancelBtn.onclick = () => {
      if (!confirm('Discard your changes?')) return;
      editing = false;
      paint();
    };

    const saveBtn = root.querySelector('#pmSave');
    if (saveBtn) saveBtn.onclick = async () => {
      const data = await getData('primeMover');
      const prev = data[index] || {};
      const next = Object.assign({}, prev);
      if (!next.docs || typeof next.docs !== 'object' || Array.isArray(next.docs)) next.docs = {};
      PM_DETAIL_SECTIONS.forEach(sec => sec.fields.forEach(f => {
        const el = root.querySelector(`[data-col="${f.id}"]`);
        if (!el) return;
        let v = el.value;
        if ((f.type === 'number' || f.type === 'money') && v !== '') v = parseFloat(v);
        next[f.id] = v;
      }));
      const docSlots = pmDocSlotsChanged(prev, next);
      if (docSlots.length){
        if (!pmDocRadioValue){
          alert('Please choose Correction Only or Document Renewal / Update.');
          return;
        }
        next.docs = pmApplyDocUpdateMode(next.docs, docSlots, pmDocRadioValue);
        pendingFocusSlots = docSlots;
      }
      const picks = root.querySelectorAll('[data-tl-pick]');
      if (picks.length){
        next.assignedTrailers = Array.from(picks)
          .filter(el => el.checked && !el.disabled)
          .map(el => String(el.dataset.tlPick || ''))
          .filter(Boolean);
      } else if (!Array.isArray(next.assignedTrailers)){
        next.assignedTrailers = [];
      }

      let pool = await getData('primeMover');
      try{ pool = await SupabaseProvider.loadTable('primeMover'); }catch(e){}
      const clash = [];
      (pool || []).forEach(pm => {
        if (!pm) return;
        const sameRow = next.assetId
          ? String(pm.assetId || '') === String(next.assetId)
          : String(pm.lorry || '') === String(next.lorry || '');
        if (sameRow) return;
        const own = Array.isArray(pm.assignedTrailers) ? pm.assignedTrailers.map(String) : [];
        own.forEach(a => {
          if (a && next.assignedTrailers.includes(a)){
            const tl = (tlRows || []).find(t => String(t.assetId || '') === a);
            clash.push((tl && tl.lorry ? String(tl.lorry) : a) + '  (sekarang di: ' + String(pm.lorry || '?') + ')');
          }
        });
      });
      if (clash.length){
        alert('Trailer ini sudah di-assign pada prime mover lain:\n\n' + clash.join('\n') +
              '\n\nBuang tick di lori itu dahulu, kemudian save semula.');
        return;
      }

      data[index] = next;
      all[index] = next;
      await persist('primeMover');
      if (typeof syncTrailerPrimeMover === 'function') await syncTrailerPrimeMover();
      truck = next;
      editing = false;
      pmDocRadioValue = '';
      paint();
    };

    if (editing && saveBtn){
      const docPanel = root.querySelector('#pmDocUpdatePanel');
      const snapshot = {};
      Object.keys(PM_DOC_FIELD_MAP).forEach(f => { snapshot[f] = (truck[f] == null) ? '' : String(truck[f]); });

      function readDocInputs(){
        const out = {};
        Object.keys(PM_DOC_FIELD_MAP).forEach(f => {
          const el = root.querySelector(`[data-col="${f}"]`);
          out[f] = el ? String(el.value || '') : '';
        });
        return out;
      }

      const refreshDocPanel = () => {
        const slots = pmDocSlotsChanged(snapshot, readDocInputs());
        if (!slots.length){
          docPanel.innerHTML = '';
          docPanel.dataset.rendered = '';
          pmDocRadioValue = '';
          saveBtn.disabled = false;
          return;
        }
        if (docPanel.dataset.rendered !== slots.join(',')){
          docPanel.dataset.rendered = slots.join(',');
          docPanel.innerHTML = `
            <div class="pm-docupd">
              <div class="pm-docupd-head">Document update &mdash; <strong>${slots.map(pmDocSlotLabel).join(', ')}</strong></div>
              <label class="pm-docupd-opt">
                <input type="radio" name="pmDocUpdateMode" value="correction_only">
                <span><b>Correction Only</b><small>I am fixing a mistake. The existing document is still valid.</small></span>
              </label>
              <label class="pm-docupd-opt">
                <input type="radio" name="pmDocUpdateMode" value="document_renewal">
                <span><b>Document Renewal / Update</b><small>This information comes from a new or renewed document.</small></span>
              </label>
              <div class="pm-docupd-hint">You must choose one option before saving.</div>
            </div>`;
          docPanel.querySelectorAll('input[name="pmDocUpdateMode"]').forEach(r => {
            r.addEventListener('change', () => { pmDocRadioValue = r.value; saveBtn.disabled = false; });
          });
          pmDocRadioValue = '';
          saveBtn.disabled = true;
        }
      };

      const editBody = root.querySelector('#pmBody');
      if (editBody){
        editBody.addEventListener('input', refreshDocPanel);
        editBody.addEventListener('change', refreshDocPanel);
      }
      refreshDocPanel();
    }

    const focusSlots = (opts && Array.isArray(opts.focusSlots) && opts.focusSlots.length) ? opts.focusSlots : pendingFocusSlots;
    if (!editing && Array.isArray(focusSlots) && focusSlots.length){
      const bodyEl = root.querySelector('#pmBody');
      if (bodyEl){
        const first = bodyEl.querySelector(`.pm-doc-row[data-slot="${focusSlots[0]}"]`);
        focusSlots.forEach(slotId => {
          const rowEl = bodyEl.querySelector(`.pm-doc-row[data-slot="${slotId}"]`);
          if (rowEl){
            rowEl.classList.add('is-flagged');
            setTimeout(() => rowEl.classList.remove('is-flagged'), 3400);
          }
        });
        if (first) setTimeout(() => first.scrollIntoView({behavior:'smooth', block:'center'}), 120);
      }
      if (opts) opts.focusSlots = null;
      pendingFocusSlots = null;
    }

    const docBtns = root.querySelectorAll('#pmBody [data-doc-action]');
    if (docBtns.length){
      if (editing){
        docBtns.forEach(b => { b.disabled = true; });
      } else {
        const saveDocs = async (nextDocs) => {
          const data = await getData('primeMover');
          const next = Object.assign({}, data[index], { docs: nextDocs });
          data[index] = next;
          await persist('primeMover');
          truck = next;
          paint();
        };

        docBtns.forEach(btn => {
          const slotId = btn.dataset.slot;
          const action = btn.dataset.docAction;

          if (action === 'upload'){
            btn.onclick = () => {
              const inp = root.querySelector(`.pm-doc-file[data-slot="${slotId}"]`);
              if (inp){ inp.value = ''; inp.click(); }
            };
          }

          if (action === 'download'){
            btn.onclick = async () => {
              try{ btn.disabled = true; await pmOpenDoc(truck, slotId); }
              catch(err){ alert('Download failed: ' + (err.message || err)); }
              finally{ btn.disabled = false; }
            };
          }

          if (action === 'delete'){
            btn.onclick = async () => {
              if (!confirm(`Delete the ${pmDocSlotLabel(slotId)} file? This cannot be undone.`)) return;
              try{
                btn.disabled = true;
                await pmDeleteDoc(truck, slotId);
                const docs = Object.assign({}, truck.docs || {});
                delete docs[slotId];
                await saveDocs(docs);
              }catch(err){
                btn.disabled = false;
                alert('Delete failed: ' + (err.message || err));
              }
            };
          }
        });

        root.querySelectorAll('.pm-doc-file').forEach(inp => {
          inp.onchange = async () => {
            const slotId = inp.dataset.slot;
            const file   = inp.files && inp.files[0];
            if (!file) return;
            const btn = root.querySelector(`[data-doc-action="upload"][data-slot="${slotId}"]`);
            if (btn){ btn.disabled = true; btn.textContent = 'Uploading\u2026'; }
            try{
              const expField  = PM_DOC_EXPIRY_FIELD[slotId] || '';
              const expValue  = expField ? (truck[expField] || '') : '';
              const doc       = await pmUploadDoc(truck, slotId, file, expValue);
              const docs      = Object.assign({}, truck.docs || {}, { [slotId]: doc });
              await saveDocs(docs);
            }catch(err){
              if (btn){ btn.disabled = false; btn.textContent = 'Upload'; }
              alert('Upload failed: ' + (err.message || err));
            }
          };
        });
      }
    }
  }

  paint();
}

/* ============================================================
   PM — Page Controller
============================================================= */
async function renderPrimeMoverPage(){
  const root = document.createElement('div');

  async function showList(){
    pmForgetOpen();
    await pmEnsureAssetIds();
    const listWrap = await renderDataPage('primeMover', {
      wrapperClass: 'opkpi-modern-page',
      filterFields: ['branch'],
      showComplianceAlertButton: true,
      onComplianceAlert: () => openComplianceAlertModal('primeMover'),
      onAddRow: () => openAddRowModal('primeMover', () => showList(), {
        completeLabel: 'Save &amp; Complete Details',
        onComplete: async () => { await pmEnsureAssetIds(); await renderPrimeMoverDetailView(root, 0, showList); },
      }),
      exportColumns: TABLES.primeMover.columns.concat([
        {id:'chassisNo', label:'Chassis No.'},
        {id:'make', label:'Manufacturer'},
        {id:'model', label:'Model'},
        {id:'goodsType', label:'Goods Type'},
        {id:'tankInfo', label:'Tank Info'},
        {id:'electricalSystem', label:'Electrical System'},
        {id:'deviceType', label:'Device Type'},
        {id:'tngNo', label:'TnG No.'},
        {id:'fleetCardNo', label:'Fleet Card No.'},
      ]),
      tableOptions: {
        linkColumnId: 'lorry',
        onLinkClick: async index => { await renderPrimeMoverDetailView(root, index, showList); },
        onEditRow: async index => {
          await openEditRowModal('primeMover', index, null, {
            onAfterSaveEdit: async info => {
              if (info && info.mode === 'document_renewal' && info.slots && info.slots.length){
                const all = await getData('primeMover');
                const i = all.findIndex(r => r.lorry === info.lorry);
                await renderPrimeMoverDetailView(root, i < 0 ? index : i, showList, { focusSlots: info.slots });
              } else {
                await showList();
              }
            },
          });
        },
      },
    });
    root.innerHTML = '';
    root.appendChild(listWrap);
  }

  await pmEnsureAssetIds();
  const pmOpenIdx = pmRecallOpenIndex(await getData('primeMover'));
  if (pmOpenIdx >= 0){
    await renderPrimeMoverDetailView(root, pmOpenIdx, showList);
  } else {
    await showList();
  }
  return root;
}

/* =========================================================================
   BAHAGIAN B — TRAILER
   ========================================================================= */

/* ============================================================
   TL — Detail sections definition
============================================================= */
const TL_DETAIL_SECTIONS = [
  { title:'1 · Trailer Identity', fields:[
    {id:'lorry', label:'Trailer No.', type:'text'},
    {id:'branch', label:'Branch', type:'text'},
    {id:'chassisNo', label:'Chassis No.', type:'text'},
    {id:'make', label:'Manufacturer', type:'text'},
    {id:'model', label:'Model', type:'text'},
    {id:'type', label:'Trailer Type', type:'text'},
    {id:'registerYear', label:'Register Year', type:'text'},
  ]},
  { title:'2 · Specification', fields:[
    {id:'bdm', label:'BDM (kg)', type:'number'},
    {id:'goodsType', label:'Goods Type', type:'text'},
    {id:'capacity', label:'Capacity', type:'text'},
  ]},
  { title:'3 · Compliance Documents', fields:[
    {id:'roadtaxNo', label:'Roadtax No.', type:'text'},
    {id:'roadtaxExpiry', label:'Roadtax Expiry Date', type:'date'},
    {id:'singaporeRoadtaxNo', label:'Singapore Roadtax No.', type:'text'},
    {id:'singaporeRoadtaxExpiry', label:'Singapore Roadtax Expiry Date', type:'date'},
    {id:'puspakomNo', label:'Puspakom No.', type:'text'},
    {id:'puspakomExpiry', label:'Puspakom Expiry Date', type:'date'},
    {id:'insuranceNo', label:'Insurance No.', type:'text'},
    {id:'insuranceExpiry', label:'Insurance Expiry Date', type:'date'},
    {id:'insuranceSumAssured', label:'Insurance Sum Assured (RM)', type:'money'},
  ]},
  { title:'4 · PMA & Notes', fields:[
    {id:'pmaOwner', label:'PMA Owner', type:'text'},
    {id:'pmaNo', label:'PMA No.', type:'text'},
    {id:'pmaCategory', label:'PMA Category', type:'text'},
    {id:'pmaExpiry', label:'PMA Expiry Date', type:'date'},
    {id:'remark', label:'Remark', type:'textarea'},
  ]},
];

/* ============================================================
   TL — Asset ID
============================================================= */
async function tlEnsureAssetIds(){
  const rows = await getData('trailer');
  if (!Array.isArray(rows) || !rows.length) return;
  let changed = false;
  rows.forEach(r => { if (r && !r.assetId){ r.assetId = pmNewId(); changed = true; } });
  if (changed) await persist('trailer');
}

function tlStoragePath(companyId, row, slotId){
  const asset = (row && row.assetId) ? row.assetId : 'unassigned';
  return `${companyId}/trailer/${asset}/${slotId}`;
}

async function tlUploadDoc(row, slotId, file, expiryValue){
  const bad = await pmValidatePdf(file);
  if (bad) throw new Error(bad);

  const companyId = await SupabaseProvider.getCompanyId();
  const path      = tlStoragePath(companyId, row, slotId);
  const prevDoc   = (row && row.docs && row.docs[slotId]) || {};
  const prevPath  = prevDoc.storagePath || '';

  if (prevPath && prevPath !== path){
    try{ await FOCC_SUPABASE.storage.from(TL_DOC_BUCKET).remove([prevPath]); }catch(e){}
  }

  const up = await FOCC_SUPABASE.storage
    .from(TL_DOC_BUCKET)
    .upload(path, file, { upsert: true, contentType: 'application/pdf', cacheControl: '3600' });
  if (up.error) throw up.error;

  return {
    storagePath: path,
    fileName:    file.name,
    fileType:    'application/pdf',
    fileSize:    file.size,
    uploadedAt:  new Date().toISOString(),
    uploadedBy:  getSessionEmail() || '',
    validUntil:  expiryValue || '',
    status:      'current',
    updateMode:  prevDoc.updateMode || '',
  };
}

async function tlOpenDoc(row, slotId){
  const m = pmDocMeta(row, slotId);
  if (!m.hasFile || !m.doc.storagePath) throw new Error('No file uploaded yet.');
  const res = await FOCC_SUPABASE.storage
    .from(TL_DOC_BUCKET)
    .createSignedUrl(m.doc.storagePath, 60, m.doc.fileName ? { download: m.doc.fileName } : {});
  if (res.error) throw res.error;
  window.open(res.data.signedUrl, '_blank', 'noopener');
}

async function tlDeleteDoc(row, slotId){
  const m = pmDocMeta(row, slotId);
  if (m.doc.storagePath){
    const del = await FOCC_SUPABASE.storage.from(TL_DOC_BUCKET).remove([m.doc.storagePath]);
    if (del.error) throw del.error;
  }
  return true;
}

/* ============================================================
   TL — Card 5: Documents
============================================================= */
function tlDocumentsCardHtml(row){
  const pendingCount  = TL_DOCUMENT_SLOTS.reduce((n, s) => n + (pmDocMeta(row, s.id).pending ? 1 : 0), 0);
  const uploadedCount = TL_DOCUMENT_SLOTS.reduce((n, s) => n + (pmDocMeta(row, s.id).hasFile ? 1 : 0), 0);
  return `
    <div class="section">
      <div class="section-head">
        <h3>5 · Documents</h3>
        <div class="spacer"></div>
        ${pendingCount ? `<span class="pm-doc-note is-warn">${pendingCount} PENDING UPLOAD</span>` : ''}
        <span class="pm-doc-note">${uploadedCount}/${TL_DOCUMENT_SLOTS.length} UPLOADED</span>
        <span class="pm-doc-note">PDF &middot; MAX 5 MB</span>
      </div>
      <div class="section-body">
        <div class="pm-doc-list">
          ${TL_DOCUMENT_SLOTS.map(slot => {
            const m = pmDocMeta(row, slot.id);
            const when = (m.hasFile && m.doc.uploadedAt) ? fmtDate(m.doc.uploadedAt) : '-';
            const rowCls = m.pending ? ' is-pending' : '';
            const stateCls = m.status === 'current' ? ' is-on' : (m.pending ? ' is-warn' : '');
            const stateTxt = m.status === 'current' ? 'Uploaded'
                           : m.pending ? 'Pending upload'
                           : 'Not uploaded';
            const byLine = m.hasFile
              ? `<span class="pm-doc-date">${escapeHtml(m.doc.uploadedBy || '')}${m.doc.uploadedBy && m.doc.fileSize ? ' &middot; ' : ''}${m.doc.fileSize ? Math.round(m.doc.fileSize / 1024) + ' KB' : ''}</span>`
              : '';
            const declared = (m.pending && m.doc.pendingSince)
              ? `<span class="pm-doc-date">Renewal declared: ${escapeHtml(fmtDate(m.doc.pendingSince))}</span>` : '';
            return `
              <div class="pm-doc-row${rowCls}" data-slot="${slot.id}">
                <div class="pm-doc-name">${escapeHtml(slot.label)}</div>
                <button type="button" class="pm-doc-btn" data-doc-action="upload" data-slot="${slot.id}">Upload</button>
                <button type="button" class="pm-doc-btn" data-doc-action="download" data-slot="${slot.id}" ${m.hasFile ? '' : 'disabled'}>Download</button>
                <button type="button" class="pm-doc-btn is-del" data-doc-action="delete" data-slot="${slot.id}" ${m.hasFile ? '' : 'disabled'}>Delete</button>
                <div class="pm-doc-meta">
                  <span class="pm-doc-state${stateCls}">
                    <input type="checkbox" disabled ${m.status === 'current' ? 'checked' : ''}>
                    ${stateTxt}
                  </span>
                  <span class="pm-doc-date">Upload date: ${escapeHtml(String(when))}</span>
                  ${byLine}
                  ${declared}
                </div>
                <input type="file" class="pm-doc-file" data-slot="${slot.id}" accept="application/pdf,.pdf" hidden>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

/* ============================================================
   TL — Sync Assigned Prime Mover (auto from Prime Mover page)
============================================================= */
async function syncTrailerPrimeMover(){
  const pmRows = await getData('primeMover');
  const tlRows = await getData('trailer');
  if (!Array.isArray(pmRows) || !Array.isArray(tlRows)) return;

  const map = new Map();
  pmRows.forEach(pm => {
    const list = Array.isArray(pm.assignedTrailers) ? pm.assignedTrailers : [];
    list.forEach(asset => {
      const a = String(asset || '');
      if (a) map.set(a, String(pm.lorry || ''));
    });
  });

  let changed = false;
  tlRows.forEach(tl => {
    const want = map.get(String(tl.assetId || '')) || '';
    if (String(tl.assignedPrimeMover || '') !== want){ tl.assignedPrimeMover = want; changed = true; }
  });
  if (changed) await persist('trailer');
}

/* ============================================================
   TL — Open key (session persistence)
============================================================= */
function tlRememberOpen(row){
  try{
    const v = row ? String(row.assetId || row.lorry || '') : '';
    if (v) sessionStorage.setItem(TL_OPEN_KEY, v);
    else sessionStorage.removeItem(TL_OPEN_KEY);
  }catch(e){}
}
function tlForgetOpen(){
  try{ sessionStorage.removeItem(TL_OPEN_KEY); }catch(e){}
}
function tlRecallOpenIndex(rows){
  if (!Array.isArray(rows) || !rows.length) return -1;
  let want = '';
  try{ want = sessionStorage.getItem(TL_OPEN_KEY) || ''; }catch(e){ return -1; }
  if (!want) return -1;
  return rows.findIndex(r => r && (String(r.assetId || '') === want || String(r.lorry || '') === want));
}

/* ============================================================
   TL — Detail View
============================================================= */
async function renderTrailerDetailView(root, index, onBack, opts){
  const all = await getData('trailer');
  let row = all[index];
  if (!row){ await onBack(); return; }
  tlRememberOpen(row);

  let editing = false;
  let tlDocRadioValue = '';
  let pendingFocusSlots = null;

  function readOnlyHtml(){
    return `
      <div class="pm-detail-card-grid">
        ${TL_DETAIL_SECTIONS.map(sec => `
          <div class="section">
            <div class="section-head"><h3>${escapeHtml(sec.title)}</h3></div>
            <div class="section-body">
              <div class="pm-detail-grid">
                ${sec.fields.map(f => `
                  <div class="pm-detail-row">
                    <span class="pm-detail-lbl">${escapeHtml(f.label)}</span>
                    <span class="pm-detail-val">${escapeHtml(pmDisplayValue(f, row))}</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>`).join('')}
        ${tlDocumentsCardHtml(row)}
      </div>`;
  }

  function editHtml(){
    return `
      <div class="pm-detail-card-grid">
        ${TL_DETAIL_SECTIONS.map(sec => `
          <div class="section">
            <div class="section-head"><h3>${escapeHtml(sec.title)}</h3></div>
            <div class="section-body">
              <div class="formgrid">
                ${sec.fields.map(f => {
                  const v = (row[f.id] === undefined || row[f.id] === null) ? '' : row[f.id];
                  const safe = escapeHtml(String(v));
                  if (f.type === 'textarea') return `<div class="formfield full"><label>${escapeHtml(f.label)}</label><textarea data-col="${f.id}" rows="3">${safe}</textarea></div>`;
                  if (f.type === 'date')  return `<div class="formfield"><label>${escapeHtml(f.label)}</label><input data-col="${f.id}" type="date" value="${safe}"></div>`;
                  if (f.type === 'number' || f.type === 'money') return `<div class="formfield"><label>${escapeHtml(f.label)}</label><input data-col="${f.id}" type="number" step="any" value="${safe}"></div>`;
                  return `<div class="formfield"><label>${escapeHtml(f.label)}</label><input data-col="${f.id}" type="text" value="${safe}"></div>`;
                }).join('')}
              </div>
            </div>
          </div>`).join('')}
        ${tlDocumentsCardHtml(row)}
      </div>`;
  }

  function paint(){
    const pmName = String(row.assignedPrimeMover || '');
    root.innerHTML = `
      <div class="pm-detail-head">
        <button class="btn" id="tlBack">&#8592; Back</button>
        <div>
          <span class="truckchip">${escapeHtml(row.lorry || '(No Trailer)')}</span>
          <span class="pm-detail-sub">${escapeHtml(row.branch || '')}${pmName ? ' &middot; Prime Mover: ' + escapeHtml(pmName) : ' &middot; No prime mover assigned'}</span>
        </div>
        <div class="spacer"></div>
        ${editing
          ? `<button class="btn" id="tlCancel">Cancel</button>
             <button class="btn primary" id="tlSave">Save Changes</button>`
          : `<button class="btn primary" id="tlEdit">&#9998; Edit Details</button>`}
      </div>
      <div id="tlBody">${editing ? editHtml() + '<div id="tlDocUpdatePanel"></div>' : readOnlyHtml()}</div>
    `;

    const backBtn = root.querySelector('#tlBack');
    if (backBtn) backBtn.onclick = async () => {
      if (editing){
        if (!confirm('You have unsaved changes. Leave without saving?')) return;
      }
      await onBack();
    };

    const editBtn = root.querySelector('#tlEdit');
    if (editBtn) editBtn.onclick = () => { editing = true; paint(); };

    const cancelBtn = root.querySelector('#tlCancel');
    if (cancelBtn) cancelBtn.onclick = () => {
      if (!confirm('Discard your changes?')) return;
      editing = false;
      paint();
    };

    const saveBtn = root.querySelector('#tlSave');
    if (saveBtn) saveBtn.onclick = async () => {
      const data = await getData('trailer');
      const prev = data[index] || {};
      const next = Object.assign({}, prev);
      if (!next.docs || typeof next.docs !== 'object' || Array.isArray(next.docs)) next.docs = {};
      TL_DETAIL_SECTIONS.forEach(sec => sec.fields.forEach(f => {
        const el = root.querySelector(`[data-col="${f.id}"]`);
        if (!el) return;
        let v = el.value;
        if ((f.type === 'number' || f.type === 'money') && v !== '') v = parseFloat(v);
        next[f.id] = v;
      }));

      const docSlots = tlDocSlotsChanged(prev, next);
      if (docSlots.length){
        if (!tlDocRadioValue){
          alert('Please choose Correction Only or Document Renewal / Update.');
          return;
        }
        next.docs = pmApplyDocUpdateMode(next.docs, docSlots, tlDocRadioValue);
        pendingFocusSlots = docSlots;
      }
      data[index] = next;
      await persist('trailer');
      row = next;
      editing = false;
      tlDocRadioValue = '';
      paint();
    };

    if (editing && saveBtn){
      const docPanel = root.querySelector('#tlDocUpdatePanel');
      const snapshot = {};
      Object.keys(TL_DOC_FIELD_MAP).forEach(f => { snapshot[f] = (row[f] == null) ? '' : String(row[f]); });

      function readDocInputs(){
        const out = {};
        Object.keys(TL_DOC_FIELD_MAP).forEach(f => {
          const el = root.querySelector(`[data-col="${f}"]`);
          out[f] = el ? String(el.value || '') : '';
        });
        return out;
      }

      const refreshDocPanel = () => {
        const slots = tlDocSlotsChanged(snapshot, readDocInputs());
        if (!slots.length){
          docPanel.innerHTML = '';
          docPanel.dataset.rendered = '';
          tlDocRadioValue = '';
          saveBtn.disabled = false;
          return;
        }
        if (docPanel.dataset.rendered !== slots.join(',')){
          docPanel.dataset.rendered = slots.join(',');
          docPanel.innerHTML = `
            <div class="pm-docupd">
              <div class="pm-docupd-head">Document update &mdash; <strong>${slots.map(tlDocSlotLabel).join(', ')}</strong></div>
              <label class="pm-docupd-opt">
                <input type="radio" name="tlDocUpdateMode" value="correction_only">
                <span><b>Correction Only</b><small>I am fixing a mistake. The existing document is still valid.</small></span>
              </label>
              <label class="pm-docupd-opt">
                <input type="radio" name="tlDocUpdateMode" value="document_renewal">
                <span><b>Document Renewal / Update</b><small>This information comes from a new or renewed document.</small></span>
              </label>
              <div class="pm-docupd-hint">You must choose one option before saving.</div>
            </div>`;
          docPanel.querySelectorAll('input[name="tlDocUpdateMode"]').forEach(r => {
            r.addEventListener('change', () => { tlDocRadioValue = r.value; saveBtn.disabled = false; });
          });
          tlDocRadioValue = '';
          saveBtn.disabled = true;
        }
      };

      const editBody = root.querySelector('#tlBody');
      if (editBody){
        editBody.addEventListener('input', refreshDocPanel);
        editBody.addEventListener('change', refreshDocPanel);
      }
      refreshDocPanel();
    }

    const focusSlots = (opts && Array.isArray(opts.focusSlots) && opts.focusSlots.length) ? opts.focusSlots : pendingFocusSlots;
    if (!editing && Array.isArray(focusSlots) && focusSlots.length){
      const bodyEl = root.querySelector('#tlBody');
      if (bodyEl){
        const first = bodyEl.querySelector(`.pm-doc-row[data-slot="${focusSlots[0]}"]`);
        focusSlots.forEach(slotId => {
          const rowEl = bodyEl.querySelector(`.pm-doc-row[data-slot="${slotId}"]`);
          if (rowEl){
            rowEl.classList.add('is-flagged');
            setTimeout(() => rowEl.classList.remove('is-flagged'), 3400);
          }
        });
        if (first) setTimeout(() => first.scrollIntoView({behavior:'smooth', block:'center'}), 120);
      }
      if (opts) opts.focusSlots = null;
      pendingFocusSlots = null;
    }

    const docBtns = root.querySelectorAll('#tlBody [data-doc-action]');
    if (docBtns.length){
      if (editing){
        docBtns.forEach(b => { b.disabled = true; });
      } else {
        const saveDocs = async (nextDocs) => {
          const data = await getData('trailer');
          const next = Object.assign({}, data[index], { docs: nextDocs });
          data[index] = next;
          await persist('trailer');
          row = next;
          paint();
        };

        docBtns.forEach(btn => {
          const slotId = btn.dataset.slot;
          const action = btn.dataset.docAction;

          if (action === 'upload'){
            btn.onclick = () => {
              const inp = root.querySelector(`.pm-doc-file[data-slot="${slotId}"]`);
              if (inp){ inp.value = ''; inp.click(); }
            };
          }

          if (action === 'download'){
            btn.onclick = async () => {
              try{ btn.disabled = true; await tlOpenDoc(row, slotId); }
              catch(err){ alert('Download failed: ' + (err.message || err)); }
              finally{ btn.disabled = false; }
            };
          }

          if (action === 'delete'){
            btn.onclick = async () => {
              if (!confirm(`Delete the ${tlDocSlotLabel(slotId)} file? This cannot be undone.`)) return;
              try{
                btn.disabled = true;
                await tlDeleteDoc(row, slotId);
                const docs = Object.assign({}, row.docs || {});
                delete docs[slotId];
                await saveDocs(docs);
              }catch(err){
                btn.disabled = false;
                alert('Delete failed: ' + (err.message || err));
              }
            };
          }
        });

        root.querySelectorAll('.pm-doc-file').forEach(inp => {
          inp.onchange = async () => {
            const slotId = inp.dataset.slot;
            const file   = inp.files && inp.files[0];
            if (!file) return;
            const btn = root.querySelector(`[data-doc-action="upload"][data-slot="${slotId}"]`);
            if (btn){ btn.disabled = true; btn.textContent = 'Uploading\u2026'; }
            try{
              const expField  = TL_DOC_EXPIRY_FIELD[slotId] || '';
              const expValue  = expField ? (row[expField] || '') : '';
              const doc       = await tlUploadDoc(row, slotId, file, expValue);
              const docs      = Object.assign({}, row.docs || {}, { [slotId]: doc });
              await saveDocs(docs);
            }catch(err){
              if (btn){ btn.disabled = false; btn.textContent = 'Upload'; }
              alert('Upload failed: ' + (err.message || err));
            }
          };
        });
      }
    }
  }

  paint();
}

/* ============================================================
   TL — Page Controller
============================================================= */
async function renderTrailerPage(){
  const root = document.createElement('div');

  async function showList(){
    tlForgetOpen();
    await tlEnsureAssetIds();
    await syncTrailerPrimeMover();
    const listWrap = await renderDataPage('trailer', {
      wrapperClass: 'opkpi-modern-page',
      filterFields: ['branch'],
      showComplianceAlertButton: true,
      onComplianceAlert: () => openComplianceAlertModal('trailer'),
      onAddRow: () => openAddRowModal('trailer', () => showList(), {
        completeLabel: 'Save &amp; Complete Details',
        onComplete: async () => { await renderTrailerDetailView(root, 0, showList); },
      }),
      exportColumns: TABLES.trailer.columns.concat([
        {id:'chassisNo', label:'Chassis No.'},
        {id:'make', label:'Manufacturer'},
        {id:'model', label:'Model'},
        {id:'goodsType', label:'Goods Type'},
        {id:'capacity', label:'Capacity'},
      ]),
      tableOptions: {
        linkColumnId: 'lorry',
        onLinkClick: async index => { await renderTrailerDetailView(root, index, showList); },
        onEditRow: async index => {
          await openEditRowModal('trailer', index, null, {
            onAfterSaveEdit: async info => {
              if (info && info.mode === 'document_renewal' && info.slots && info.slots.length){
                await syncTrailerPrimeMover();
                const all = await getData('trailer');
                const i = all.findIndex(r => r.lorry === info.lorry);
                await renderTrailerDetailView(root, i < 0 ? index : i, showList, { focusSlots: info.slots });
              } else {
                await showList();
              }
            },
          });
        },
      },
    });
    root.innerHTML = '';
    root.appendChild(listWrap);
  }

  await tlEnsureAssetIds();
  await syncTrailerPrimeMover();
  const tlOpenIdx = tlRecallOpenIndex(await getData('trailer'));
  if (tlOpenIdx >= 0){
    await renderTrailerDetailView(root, tlOpenIdx, showList);
  } else {
    await showList();
  }
  return root;
}

/* =========================================================================
   BAHAGIAN C — STAFF DATABASE + HIRARC
   ========================================================================= */

/* =========================================================================
   STAFF DATABASE
   ========================================================================= */

const STAFF_DETAIL_SECTIONS = [
  { title:'1 · Personal Details', fields:[
    {id:'staffName',   label:'Staff Name',    type:'text'},
    {id:'icNumber',    label:'IC Number',     type:'ic'},
    {id:'dateOfBirth', label:'Date of Birth', type:'date'},
    {id:'age',         label:'Age',           type:'computed'},
    {id:'nationality', label:'Nationality',   type:'text'},
  ]},
  { title:'2 · Employment', fields:[
    {id:'employeeId',       label:'Employee ID',      type:'text'},
    {id:'designation',      label:'Designation',      type:'text'},
    {id:'branch',           label:'Branch',           type:'text'},
    {id:'dateHired',        label:'Date Hired',       type:'date'},
    {id:'tenure',           label:'Tenure',           type:'computed'},
    {id:'employmentType',   label:'Employment Type',  type:'select'},
    {id:'employmentStatus', label:'Employee Status',  type:'computed'},
    {id:'resignationDate',  label:'Resignation Date', type:'date'},
  ]},
  { title:'3 · Contact', fields:[
    {id:'phone',         label:'Phone Number',   type:'text'},
    {id:'whatsapp',      label:'WhatsApp',       type:'computed'},
    {id:'personalEmail', label:'Personal Email', type:'text'},
    {id:'workEmail',     label:'Work Email',     type:'text'},
    {id:'address',       label:'Address',        type:'textarea'},
  ]},
  { title:'4 · Driving & Travel Documents', fields:[
    {id:'licenseNumber',  label:'License Number',  type:'text'},
    {id:'licenseExpiry',  label:'License Expiry',  type:'date'},
    {id:'gdlNumber',      label:'GDL Number',      type:'text'},
    {id:'gdlExpiry',      label:'GDL Expiry',      type:'date'},
    {id:'passportNo',     label:'Passport No.',    type:'text'},
    {id:'passportExpiry', label:'Passport Expiry', type:'date'},
  ]},
  { title:'5 · Tests & Medical', fields:[
    {id:'drugTest',      label:'Drug Test',      type:'date'},
    {id:'alcoholTest',   label:'Alcohol Test',   type:'date'},
    {id:'medicalStatus', label:'Medical Test',   type:'date'},
  ]},
];

const ST_DETAIL_READONLY = ['whatsapp','tenure','age','employmentStatus'];

const ST_NATIONALITY_LIST = COMBO_DEFAULT_OPTIONS.staffDatabase.nationality;

const ST_VISIBLE_COLUMNS = [
  'staffName','designation','employeeId','branch','workEmail','whatsapp','icNumber',
  'tenure','age','licenseExpiry','gdlExpiry','drugTest','alcoholTest',
  'medicalStatus','passportExpiry','employmentType','employmentStatus',
];

/* ============================================================
   ST — Asset ID + legacy split + storage path
============================================================= */
async function stEnsureAssetIds(){
  const rows = await getData('staffDatabase');
  if (!Array.isArray(rows) || !rows.length) return;
  let changed = false;
  rows.forEach(r => {
    if (!r) return;
    if (!r.assetId){ r.assetId = pmNewId(); changed = true; }
    if (!r.emailSplitDone && r.email){
      if (!r.personalEmail) r.personalEmail = r.email;
      r.emailSplitDone = true;
      changed = true;
    }
  });
  if (changed) await persist('staffDatabase');
}

function stStoragePath(companyId, row, slotId){
  const asset = (row && row.assetId) ? row.assetId : 'unassigned';
  return `${companyId}/staff/${asset}/${slotId}`;
}

async function stReadBytes(file, n){
  const buf = await file.slice(0, n).arrayBuffer();
  return new Uint8Array(buf);
}
function stStartsWith(bytes, sig){
  if (bytes.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (bytes[i] !== sig[i]) return false;
  return true;
}

async function stValidateFile(file){
  if (!file) return 'No file selected.';
  if (file.size < 1) return 'The file is empty.';
  if (file.size > ST_DOC_MAX_BYTES) return 'File is larger than 5 MB.';
  if (!/\.(pdf|jpe?g|png)$/i.test(String(file.name || ''))) return 'Only PDF, JPG or PNG files are allowed.';
  const t = String(file.type || '').toLowerCase();
  if (t && t !== 'application/pdf' && t !== 'image/jpeg' && t !== 'image/png') return 'Only PDF, JPG or PNG files are allowed.';

  let head;
  try{ head = await stReadBytes(file, 8); }catch(e){ return 'Could not read the file.'; }
  const isPdf = stStartsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2D]);
  const isJpg = stStartsWith(head, [0xFF, 0xD8, 0xFF]);
  const isPng = stStartsWith(head, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (!isPdf && !isJpg && !isPng) return 'This file is not a valid PDF, JPG or PNG.';
  return '';
}

function stContentType(file){
  const t = String(file.type || '').toLowerCase();
  if (t === 'application/pdf' || t === 'image/jpeg' || t === 'image/png') return t;
  const n = String(file.name || '').toLowerCase();
  if (/\.png$/.test(n)) return 'image/png';
  if (/\.jpe?g$/.test(n)) return 'image/jpeg';
  return 'application/pdf';
}

async function stUploadDoc(row, slotId, file, expiryValue){
  const bad = await stValidateFile(file);
  if (bad) throw new Error(bad);

  const companyId = await SupabaseProvider.getCompanyId();
  const path      = stStoragePath(companyId, row, slotId);
  const prevDoc   = (row && row.docs && row.docs[slotId]) || {};
  const prevPath  = prevDoc.storagePath || '';
  const ctype     = stContentType(file);

  if (prevPath && prevPath !== path){
    try{ await FOCC_SUPABASE.storage.from(PM_DOC_BUCKET).remove([prevPath]); }catch(e){}
  }

  const up = await FOCC_SUPABASE.storage
    .from(PM_DOC_BUCKET)
    .upload(path, file, { upsert: true, contentType: ctype, cacheControl: '3600' });
  if (up.error) throw up.error;

  return {
    storagePath: path,
    fileName:    file.name,
    fileType:    ctype,
    fileSize:    file.size,
    uploadedAt:  new Date().toISOString(),
    uploadedBy:  getSessionEmail() || '',
    validUntil:  expiryValue || '',
    status:      'current',
    updateMode:  prevDoc.updateMode || '',
  };
}

/* ============================================================
   ST — Documents card
============================================================= */
function stDocumentsCardHtml(row){
  const pendingCount  = ST_DOCUMENT_SLOTS.reduce((n, s) => n + (pmDocMeta(row, s.id).pending ? 1 : 0), 0);
  const uploadedCount = ST_DOCUMENT_SLOTS.reduce((n, s) => n + (pmDocMeta(row, s.id).hasFile ? 1 : 0), 0);
  return `
    <div class="section">
      <div class="section-head">
        <h3>Documents</h3>
        <div class="spacer"></div>
        ${pendingCount ? `<span class="pm-doc-note is-warn">${pendingCount} PENDING UPLOAD</span>` : ''}
        <span class="pm-doc-note">${uploadedCount}/${ST_DOCUMENT_SLOTS.length} UPLOADED</span>
        <span class="pm-doc-note">PDF &middot; JPG &middot; PNG &middot; MAX 5 MB</span>
      </div>
      <div class="section-body">
        <div class="pm-doc-list">
          ${ST_DOCUMENT_SLOTS.map(slot => {
            const m = pmDocMeta(row, slot.id);
            const when = (m.hasFile && m.doc.uploadedAt) ? fmtDate(m.doc.uploadedAt) : '-';
            const rowCls = m.pending ? ' is-pending' : '';
            const stateCls = m.status === 'current' ? ' is-on' : (m.pending ? ' is-warn' : '');
            const stateTxt = m.status === 'current' ? 'Uploaded'
                           : m.pending ? 'Pending upload'
                           : 'Not uploaded';
            const byLine = m.hasFile
              ? `<span class="pm-doc-date">${escapeHtml(m.doc.uploadedBy || '')}${m.doc.uploadedBy && m.doc.fileSize ? ' &middot; ' : ''}${m.doc.fileSize ? Math.round(m.doc.fileSize / 1024) + ' KB' : ''}</span>`
              : '';
            const declared = (m.pending && m.doc.pendingSince)
              ? `<span class="pm-doc-date">Renewal declared: ${escapeHtml(fmtDate(m.doc.pendingSince))}</span>` : '';
            return `
              <div class="pm-doc-row${rowCls}" data-slot="${slot.id}">
                <div class="pm-doc-name">${escapeHtml(slot.label)}</div>
                <button type="button" class="pm-doc-btn" data-doc-action="upload" data-slot="${slot.id}">Upload</button>
                <button type="button" class="pm-doc-btn" data-doc-action="download" data-slot="${slot.id}" ${m.hasFile ? '' : 'disabled'}>Download</button>
                <button type="button" class="pm-doc-btn is-del" data-doc-action="delete" data-slot="${slot.id}" ${m.hasFile ? '' : 'disabled'}>Delete</button>
                <div class="pm-doc-meta">
                  <span class="pm-doc-state${stateCls}">
                    <input type="checkbox" disabled ${m.status === 'current' ? 'checked' : ''}>
                    ${stateTxt}
                  </span>
                  <span class="pm-doc-date">Upload date: ${escapeHtml(String(when))}</span>
                  ${byLine}
                  ${declared}
                </div>
                <input type="file" class="pm-doc-file st-doc-file" data-slot="${slot.id}" accept="${ST_ACCEPT_ATTR}" hidden>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

/* ============================================================
   ST — Open key (session persistence)
============================================================= */
function stRememberOpen(row){
  try{
    const v = row ? String(row.assetId || row.employeeId || row.staffName || '') : '';
    if (v) sessionStorage.setItem(ST_OPEN_KEY, v);
    else sessionStorage.removeItem(ST_OPEN_KEY);
  }catch(e){}
}
function stForgetOpen(){ try{ sessionStorage.removeItem(ST_OPEN_KEY); }catch(e){} }
function stRecallOpenIndex(rows){
  if (!Array.isArray(rows) || !rows.length) return -1;
  let want = '';
  try{ want = sessionStorage.getItem(ST_OPEN_KEY) || ''; }catch(e){ return -1; }
  if (!want) return -1;
  return rows.findIndex(r => r && (
    String(r.assetId || '') === want ||
    String(r.employeeId || '') === want ||
    String(r.staffName || '') === want));
}

/* ============================================================
   ST — Detail View
============================================================= */
async function renderStaffDetailView(root, index, onBack, opts){
  opts = opts || {};
  const all = await getData('staffDatabase');
  let row = all[index];
  if (!row){ await onBack(); return; }
  stRememberOpen(row);

  let editing = !!opts.startEditing;
  let stDocRadioValue = '';
  let pendingFocusSlots = null;

  function staffCellHtml(f){
    const col = (TABLES.staffDatabase.columns.find(c => c.id === f.id)) || f;
    const raw = row[f.id];
    if (col.type === 'computed-whatsapp') return cellDisplay(col, raw, row) || '-';
    if (String(col.type || '').indexOf('computed-') === 0){
      const html = cellDisplay(col, raw, row) || '-';
      return /^\s*</.test(String(html)) ? String(html) : escapeHtml(html);
    }
    if (col.type === 'date') return escapeHtml(fmtDate(raw) || '-');
    if (col.id === 'passportExpiry' && !raw) return '<span style="color:var(--muted)">-</span>';
    return escapeHtml(raw == null || raw === '' ? '-' : String(raw));
  }

  function readOnlyHtml(){
    return `
      <div class="pm-detail-card-grid">
        ${STAFF_DETAIL_SECTIONS.map(sec => `
          <div class="section">
            <div class="section-head"><h3>${escapeHtml(sec.title)}</h3></div>
            <div class="section-body">
              <div class="pm-detail-grid">
                ${sec.fields.map(f => `
                  <div class="pm-detail-row">
                    <span class="pm-detail-lbl">${escapeHtml(f.label)}</span>
                    <span class="pm-detail-val">${staffCellHtml(f)}</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>`).join('')}
        ${stDocumentsCardHtml(row)}
      </div>`;
  }

  function editHtml(){
    return `
      <div class="pm-detail-card-grid">
        ${STAFF_DETAIL_SECTIONS.map(sec => `
          <div class="section">
            <div class="section-head"><h3>${escapeHtml(sec.title)}</h3></div>
            <div class="section-body">
              <div class="formgrid">
                ${sec.fields.map(f => {
                  const col = (TABLES.staffDatabase.columns.find(c => c.id === f.id)) || f;
                  const lbl = escapeHtml(f.label);
                  if (ST_DETAIL_READONLY.includes(f.id)){
                    return `<div class="formfield"><label>${lbl} <span class="pm-doc-date">(auto)</span></label><div style="padding:7px 0;color:var(--ink);font-weight:600">${staffCellHtml(f)}</div></div>`;
                  }
                  const v = (row[f.id] === undefined || row[f.id] === null) ? '' : row[f.id];
                  const safe = escapeHtml(String(v));
                  if (f.id === 'nationality') return buildComboField({ id:'nationality', label:f.label });
                  if (f.id === 'employmentType') return buildFixedPickerField({ id:'employmentType', label:f.label, type:'select', options: col.options || [] });
                  if (f.type === 'textarea') return `<div class="formfield full"><label>${lbl}</label><textarea data-col="${f.id}" rows="3">${safe}</textarea></div>`;
                  if (f.type === 'date')     return `<div class="formfield"><label>${lbl}</label><input data-col="${f.id}" type="date" value="${safe}"></div>`;
                  return `<div class="formfield"><label>${lbl}</label><input data-col="${f.id}" type="text" value="${safe}"></div>`;
                }).join('')}
              </div>
            </div>
          </div>`).join('')}
        ${stDocumentsCardHtml(row)}
      </div>`;
  }

  async function saveDocs(docs){
    const data = await getData('staffDatabase');
    const next = Object.assign({}, data[index] || {}, { docs: docs });
    data[index] = next;
    await persist('staffDatabase');
    row = next;
    paint();
  }

  function paint(){
    root.innerHTML = `
      <div class="pm-detail-head">
        <button class="btn" id="stBack">&#8592; Back</button>
        <div>
          <span class="truckchip">${escapeHtml(row.staffName || '(No Staff Name)')}</span>
          <span class="pm-detail-sub">${escapeHtml(row.designation || '')}${row.branch ? ' &middot; ' + escapeHtml(row.branch) : ''}</span>
        </div>
        <div class="spacer"></div>
        ${editing
          ? `<button class="btn" id="stCancel">Cancel</button>
             <button class="btn primary" id="stSave">Save Changes</button>`
          : `<button class="btn primary" id="stEdit">&#9998; Edit Details</button>`}
      </div>
      <div id="stBody">${editing ? editHtml() + '<div id="stDocUpdatePanel"></div>' : readOnlyHtml()}</div>`;

    const backBtn = root.querySelector('#stBack');
    if (backBtn) backBtn.onclick = async () => {
      if (editing && !confirm('You have unsaved changes. Leave without saving?')) return;
      await onBack();
    };

    const editBtn = root.querySelector('#stEdit');
    if (editBtn) editBtn.onclick = () => { editing = true; paint(); };

    const cancelBtn = root.querySelector('#stCancel');
    if (cancelBtn) cancelBtn.onclick = () => {
      if (!confirm('Discard your changes?')) return;
      editing = false; paint();
    };

    const saveBtn = root.querySelector('#stSave');
    if (saveBtn) saveBtn.onclick = async () => {
      const data = await getData('staffDatabase');
      const prev = data[index] || {};
      const next = Object.assign({}, prev);
      if (!next.docs || typeof next.docs !== 'object' || Array.isArray(next.docs)) next.docs = {};
      STAFF_DETAIL_SECTIONS.forEach(sec => sec.fields.forEach(f => {
        if (ST_DETAIL_READONLY.includes(f.id)) return;
        const el = root.querySelector(`[data-col="${f.id}"]`);
        if (!el) return;
        next[f.id] = String(el.value || '');
      }));
      const slots = stDocSlotsChanged(prev, next);
      if (slots.length){
        if (!stDocRadioValue){
          alert('Please choose Correction Only or Document Renewal / Update.');
          return;
        }
        next.docs = pmApplyDocUpdateMode(next.docs, slots, stDocRadioValue);
        pendingFocusSlots = slots;
      }
      data[index] = next;
      await persist('staffDatabase');
      row = next; editing = false; stDocRadioValue = '';
      paint();
    };

    if (editing){
      (async () => {
        try{
          const natEl = root.querySelector('[data-col="nationality"]');
          if (natEl) natEl.value = row.nationality || '';
          const etEl  = root.querySelector('[data-col="employmentType"]');
          if (etEl)  etEl.value  = row.employmentType || '';
          await wireComboFields(root, 'staffDatabase', TABLES.staffDatabase);
          wireFixedPickerFields(root, 'staffDatabase', TABLES.staffDatabase);
          if (natEl) natEl.value = row.nationality || '';
          if (etEl)  etEl.value  = row.employmentType || '';
        }catch(e){ console.error('staff form picker wiring failed', e); }
      })();
    }

    if (editing && saveBtn){
      const panel = root.querySelector('#stDocUpdatePanel');
      const snapshot = {};
      Object.keys(ST_DOC_FIELD_MAP).forEach(f => { snapshot[f] = (row[f] == null) ? '' : String(row[f]); });
      const readInputs = () => {
        const out = {};
        Object.keys(ST_DOC_FIELD_MAP).forEach(f => {
          const el = root.querySelector(`[data-col="${f}"]`);
          out[f] = el ? String(el.value || '') : '';
        });
        return out;
      };
      const refreshPanel = () => {
        const slots = stDocSlotsChanged(snapshot, readInputs());
        if (!slots.length){
          panel.innerHTML = '';
          panel.dataset.rendered = '';
          stDocRadioValue = '';
          saveBtn.disabled = false;
          return;
        }
        if (panel.dataset.rendered !== slots.join(',')){
          panel.dataset.rendered = slots.join(',');
          panel.innerHTML = `
            <div class="pm-docupd">
              <div class="pm-docupd-head">Document update &mdash; <strong>${slots.map(stDocSlotLabel).join(', ')}</strong></div>
              <label class="pm-docupd-opt">
                <input type="radio" name="stDocUpdateMode" value="correction_only">
                <span><b>Correction Only</b><small>I am fixing a mistake. The existing document is still valid.</small></span>
              </label>
              <label class="pm-docupd-opt">
                <input type="radio" name="stDocUpdateMode" value="document_renewal">
                <span><b>Document Renewal / Update</b><small>A new document replaces the old one.</small></span>
              </label>
            </div>`;
          panel.querySelectorAll('input[name="stDocUpdateMode"]').forEach(r => {
            r.onchange = () => { stDocRadioValue = r.value; saveBtn.disabled = false; };
          });
          saveBtn.disabled = true;
        }
      };

      root.querySelectorAll('#stBody [data-col]').forEach(el => el.addEventListener('input', refreshPanel));
      refreshPanel();
    }

    const focusSlots = (opts && Array.isArray(opts.focusSlots) && opts.focusSlots.length) ? opts.focusSlots : pendingFocusSlots;
    if (!editing && Array.isArray(focusSlots) && focusSlots.length){
      const bodyEl = root.querySelector('#stBody');
      if (bodyEl){
        const first = bodyEl.querySelector(`.pm-doc-row[data-slot="${focusSlots[0]}"]`);
        focusSlots.forEach(slotId => {
          const rowEl = bodyEl.querySelector(`.pm-doc-row[data-slot="${slotId}"]`);
          if (rowEl){
            rowEl.classList.add('is-flagged');
            setTimeout(() => rowEl.classList.remove('is-flagged'), 3400);
          }
        });
        if (first) setTimeout(() => first.scrollIntoView({behavior:'smooth', block:'center'}), 120);
      }
      if (opts) opts.focusSlots = null;
      pendingFocusSlots = null;
    }

    const docBtns = root.querySelectorAll('#stBody [data-doc-action]');
    if (docBtns.length){
      if (editing){
        docBtns.forEach(b => { b.disabled = true; });
      } else {
        docBtns.forEach(btn => {
          const slotId = btn.dataset.slot;
          const action = btn.dataset.docAction;

          if (action === 'upload'){
            btn.onclick = () => {
              const inp = root.querySelector(`.st-doc-file[data-slot="${slotId}"]`);
              if (inp){ inp.value = ''; inp.click(); }
            };
          }
          if (action === 'download'){
            btn.onclick = async () => {
              btn.disabled = true;
              try{ await pmOpenDoc(row, slotId); }
              catch(err){ alert('Download failed: ' + (err.message || err)); }
              finally{ btn.disabled = false; }
            };
          }
          if (action === 'delete'){
            btn.onclick = async () => {
              if (!confirm('Delete this file? The record stays — only the document file is removed.')) return;
              btn.disabled = true;
              try{
                await pmDeleteDoc(row, slotId);
                const docs = Object.assign({}, row.docs || {});
                delete docs[slotId];
                await saveDocs(docs);
              }catch(err){
                btn.disabled = false;
                alert('Delete failed: ' + (err.message || err));
              }
            };
          }
        });

        root.querySelectorAll('.st-doc-file').forEach(inp => {
          inp.onchange = async () => {
            const slotId = inp.dataset.slot;
            const file   = inp.files && inp.files[0];
            if (!file) return;
            const btn = root.querySelector(`[data-doc-action="upload"][data-slot="${slotId}"]`);
            if (btn){ btn.disabled = true; btn.textContent = 'Uploading\u2026'; }
            try{
              const expField = ST_DOC_EXPIRY_FIELD[slotId] || '';
              const expValue = expField ? (row[expField] || '') : '';
              const doc = await stUploadDoc(row, slotId, file, expValue);
              const docs = Object.assign({}, row.docs || {}, { [slotId]: doc });
              await saveDocs(docs);
            }catch(err){
              if (btn){ btn.disabled = false; btn.textContent = 'Upload'; }
              alert('Upload failed: ' + (err.message || err));
            }
          };
        });
      }
    }
  }

  paint();
}

/* ============================================================
   ST — Page Controller
============================================================= */
async function renderStaffPage(){
  const root = document.createElement('div');

  async function showList(){
    stForgetOpen();
    await stEnsureAssetIds();
    const listWrap = await renderDataPage('staffDatabase', {
      wrapperClass: 'opkpi-modern-page',
      filterFields: ['branch'],
      showComplianceAlertButton: true,
      onComplianceAlert: () => openComplianceAlertModal('staffDatabase'),
      onAddRow: () => openAddRowModal('staffDatabase', () => showList(), {
        completeLabel: 'Save &amp; Complete Details',
        onComplete: async () => {
          await stEnsureAssetIds();
          const data = await getData('staffDatabase');
          await renderStaffDetailView(root, Math.max(0, data.length - 1), showList);
        },
      }),
      tableOptions: {
        visibleColumnIds: ST_VISIBLE_COLUMNS,
        linkColumnId: 'staffName',
        onLinkClick: async index => { await renderStaffDetailView(root, index, showList); },
        onEditRow: async index => {
          await openEditRowModal('staffDatabase', index, null, {
            onAfterSaveEdit: async info => {
              if (info && info.mode === 'document_renewal' && info.slots && info.slots.length){
                const all = await getData('staffDatabase');
                const want = String(info.assetId || '');
                const i = want ? all.findIndex(r => String(r.assetId || '') === want) : -1;
                await renderStaffDetailView(root, i < 0 ? index : i, showList, { focusSlots: info.slots });
              } else {
                await showList();
              }
            },
          });
        },
      },
    });
    root.innerHTML = '';
    root.appendChild(listWrap);
  }

  await stEnsureAssetIds();
  const openIdx = stRecallOpenIndex(await getData('staffDatabase'));
  if (openIdx >= 0) await renderStaffDetailView(root, openIdx, showList);
  else await showList();
  return root;
}

/* =========================================================================
   HIRARC MODULE
   ========================================================================= */

const HIRARC_MODAL_LABELS = {
  refNo: 'Reference Number',
  department: 'Department',
  process: 'Process',
  location: 'Process / Activity Location',
  originalDate: 'Original Assessment Date',
  lastReviewDate: 'Last Review Date',
  nextReviewDate: 'Next Review Date',
  raLeader: 'RA Leader',
  raMember1: 'RA Member 1',
  raMember2: 'RA Member 2',
  raMember3: 'RA Member 3',
  approvedBy: 'Approved By',
};

async function generateHirarcRefNo(){
  const rows = await getData('HIRARC_MASTER');
  let maxNum = 0;
  rows.forEach(r => {
    const m = /^HIRARC-(\d+)$/.exec(String(r.refNo || '').trim());
    if (m){ const n = parseInt(m[1], 10); if (n > maxNum) maxNum = n; }
  });
  return `HIRARC-${String(maxNum + 1).padStart(4, '0')}`;
}

async function openNewHirarcModal(onDone){
  const def = TABLES.HIRARC_MASTER;
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  const refNo = await generateHirarcRefNo();

  let fields = `<div class="formfield"><label>${HIRARC_MODAL_LABELS.refNo}</label><input data-col="refNo" type="text" value="${escapeHtml(refNo)}" readonly></div>`;
  def.columns.forEach(c => {
    if (c.id === 'refNo' || c.id === 'status') return;
    const label = HIRARC_MODAL_LABELS[c.id] || c.label;
    if (c.type === 'date'){
      fields += `<div class="formfield"><label>${label}</label><input data-col="${c.id}" type="date"></div>`;
    } else {
      fields += `<div class="formfield"><label>${label}</label><input data-col="${c.id}" type="text"></div>`;
    }
  });

  box.innerHTML = `
    <h4>New HIRARC Assessment</h4>
    <div class="formgrid">${fields}</div>
    <div class="modalfoot">
      <button class="btn" id="cancelModal">Cancel</button>
      <button class="btn primary" id="saveModal">Save Assessment</button>
    </div>
  `;
  overlay.classList.add('show');

  box.querySelector('#cancelModal').onclick = () => overlay.classList.remove('show');
  box.querySelector('#saveModal').onclick = async () => {
    const record = {refNo, status:'Open'};
    def.columns.forEach(c => {
      if (c.id === 'refNo' || c.id === 'status') return;
      const field = box.querySelector(`[data-col="${c.id}"]`);
      record[c.id] = field ? field.value : '';
    });
    const currentRows = await getData('HIRARC_MASTER');
    currentRows.unshift(record);
    await persist('HIRARC_MASTER');
    overlay.classList.remove('show');
    if (onDone) await onDone();
  };
}

function hirarcNum(v){
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function hirarcRpnStyle(rpn){
  if (!rpn) return '';
  let bg, fg;
  if (rpn <= 3){ bg = '#92d050'; fg = '#000'; }
  else if (rpn <= 7){ bg = '#ffc000'; fg = '#000'; }
  else if (rpn <= 14){ bg = '#ff8c00'; fg = '#000'; }
  else { bg = '#c00000'; fg = '#000'; }
  return `background:${bg};color:${fg};font-weight:700;text-align:center;`;
}

const HIRARC_HAZARD_INPUT_STYLE = 'width:100%;min-width:110px;box-sizing:border-box;border:1px solid var(--line);border-radius:6px;padding:6px 8px;font:inherit;color:var(--ink);';
const HIRARC_HAZARD_NUM_STYLE = 'width:56px;min-width:56px;box-sizing:border-box;border:1px solid var(--line);border-radius:6px;padding:6px 6px;font:inherit;color:var(--ink);text-align:center;';
const HIRARC_HAZARD_POINT_STYLE = 'width:100%;min-width:110px;min-height:64px;box-sizing:border-box;border:1px solid var(--line);border-radius:6px;padding:6px 8px;font:inherit;color:var(--ink);resize:vertical;white-space:pre-wrap;';

function hirarcHazardRowHTML(h, idx){
  const rpn = hirarcNum(h.s) * hirarcNum(h.l);
  const rpn2 = hirarcNum(h.s2) * hirarcNum(h.l2);
  const t = (id, val) => `<input data-hidx="${idx}" data-hf="${id}" type="text" value="${escapeHtml(val ?? '')}" style="${HIRARC_HAZARD_INPUT_STYLE}">`;
  const n = (id, val) => `<input data-hidx="${idx}" data-hf="${id}" type="number" step="any" value="${escapeHtml(val ?? '')}" style="${HIRARC_HAZARD_NUM_STYLE}">`;
  const p = (id, val) => `<textarea data-hidx="${idx}" data-hf="${id}" class="hirarc-point-field" style="${HIRARC_HAZARD_POINT_STYLE}">${escapeHtml(val ?? '')}</textarea>`;
  return `<tr data-hidx="${idx}">
    <td>${idx + 1}</td>
    <td>${t('workActivity', h.workActivity)}</td>
    <td>${t('hazard', h.hazard)}</td>
    <td>${p('possibleInjury', h.possibleInjury)}</td>
    <td>${p('existingControls', h.existingControls)}</td>
    <td>${n('s', h.s)}</td>
    <td>${n('l', h.l)}</td>
    <td class="hirarc-rpn" data-rpn-for="${idx}" style="${hirarcRpnStyle(rpn)}">${rpn}</td>
    <td>${p('additionalControls', h.additionalControls)}</td>
    <td>${n('s2', h.s2)}</td>
    <td>${n('l2', h.l2)}</td>
    <td class="hirarc-rpn2" data-rpn2-for="${idx}" style="${hirarcRpnStyle(rpn2)}">${rpn2}</td>
    <td>${p('implementationPerson', h.implementationPerson)}</td>
    <td>${p('remarks', h.remarks)}</td>
    <td><button class="btn danger hirarc-hazard-del" data-hidx="${idx}">Delete</button></td>
  </tr>`;
}

async function renderHirarcEditorView(root, master, onBack){
  const allHazards = await getData('HIRARC_HAZARDS');
  let currentHazards = allHazards.filter(h => h.parentRefNo === master.refNo).map(h => ({...h}));

  root.innerHTML = `
    <div class="section">
      <div class="section-head">
        <h3>HIRARC ASSESSMENT EDITOR</h3>
        <div class="spacer"></div>
        <span class="savechip" id="hirarcEditorSavechip">&#10003; saved</span>
      </div>
      <div class="section-body">
        <div class="formgrid">
          <div class="formfield"><label>Reference Number</label><input id="hirarcEdRefNo" type="text" value="${escapeHtml(master.refNo)}" readonly></div>
          <div class="formfield"><label>Department</label><input id="hirarcEdDepartment" type="text" value="${escapeHtml(master.department)}"></div>
          <div class="formfield"><label>Process</label><input id="hirarcEdProcess" type="text" value="${escapeHtml(master.process)}"></div>
          <div class="formfield"><label>Location</label><input id="hirarcEdLocation" type="text" value="${escapeHtml(master.location)}"></div>
          <div class="formfield"><label>RA Leader</label><input id="hirarcEdRaLeader" type="text" value="${escapeHtml(master.raLeader)}"></div>
          <div class="formfield"><label>Approved By</label><input id="hirarcEdApprovedBy" type="text" value="${escapeHtml(master.approvedBy)}"></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button class="btn" id="hirarcBackBtn">Back To Register</button>
          <button class="btn primary" id="hirarcSaveHazardsBtn">Save Hazards</button>
        </div>
      </div>
    </div>

    <div class="section" style="margin-top:20px;">
      <div class="section-head">
        <span class="eyebrow">HAZARD ASSESSMENT</span>
        <span class="badge" style="margin-left:10px;font-weight:600;">Reference No: ${escapeHtml(master.refNo)}</span>
        <div class="spacer"></div>
        <button class="btn primary" id="hirarcAddHazardBtn">+ Add Hazard</button>
      </div>
      <div class="section-body">
        <div class="tablewrap">
          <table class="datatable">
            <thead><tr>
              <th>No.</th><th>Work Activity</th><th>Hazard</th><th>Possible Injury / Ill Health</th><th>Existing Risk Controls</th>
              <th>S</th><th>L</th><th>RPN</th><th>Additional Controls</th><th>S</th><th>L</th><th>RPN</th>
              <th>Implementation Person</th><th>Remarks</th><th>Action</th>
            </tr></thead>
            <tbody id="hirarcHazardTbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const tbody = root.querySelector('#hirarcHazardTbody');
  function renderRows(){
    tbody.innerHTML = currentHazards.map((h, idx) => hirarcHazardRowHTML(h, idx)).join('');
  }
  renderRows();

  tbody.addEventListener('input', (e) => {
    const el = e.target.closest('[data-hf]');
    if (!el) return;
    const idx = parseInt(el.dataset.hidx, 10);
    const field = el.dataset.hf;
    if (!currentHazards[idx]) return;
    currentHazards[idx][field] = el.value;
    if (field === 's' || field === 'l'){
      const cell = tbody.querySelector(`[data-rpn-for="${idx}"]`);
      if (cell){
        const rpn = hirarcNum(currentHazards[idx].s) * hirarcNum(currentHazards[idx].l);
        cell.textContent = rpn;
        cell.setAttribute('style', hirarcRpnStyle(rpn));
      }
    }
    if (field === 's2' || field === 'l2'){
      const cell = tbody.querySelector(`[data-rpn2-for="${idx}"]`);
      if (cell){
        const rpn2 = hirarcNum(currentHazards[idx].s2) * hirarcNum(currentHazards[idx].l2);
        cell.textContent = rpn2;
        cell.setAttribute('style', hirarcRpnStyle(rpn2));
      }
    }
  });

  tbody.addEventListener('keydown', (e) => {
    const el = e.target.closest('.hirarc-point-field');
    if (!el) return;
    if (e.key === 'Enter'){
      e.preventDefault();
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const insert = '\n• ';
      el.value = el.value.substring(0, start) + insert + el.value.substring(end);
      const pos = start + insert.length;
      el.selectionStart = el.selectionEnd = pos;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  tbody.addEventListener('focusin', (e) => {
    const el = e.target.closest('.hirarc-point-field');
    if (!el) return;
    if (el.value === ''){
      el.value = '• ';
      el.selectionStart = el.selectionEnd = el.value.length;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  tbody.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.hirarc-hazard-del');
    if (!delBtn) return;
    const idx = parseInt(delBtn.dataset.hidx, 10);
    if (!confirm('Delete this hazard row?')) return;
    currentHazards.splice(idx, 1);
    renderRows();
  });

  root.querySelector('#hirarcAddHazardBtn').addEventListener('click', () => {
    currentHazards.push({workActivity:'', hazard:'', possibleInjury:'', existingControls:'', s:'', l:'', additionalControls:'', s2:'', l2:'', implementationPerson:'', remarks:''});
    renderRows();
  });

  root.querySelector('#hirarcBackBtn').addEventListener('click', () => onBack());

  root.querySelector('#hirarcSaveHazardsBtn').addEventListener('click', async () => {
    const saveBtn = root.querySelector('#hirarcSaveHazardsBtn');
    saveBtn.disabled = true;
    try {
      const masterRows = await getData('HIRARC_MASTER');
      const mi = masterRows.findIndex(r => r.refNo === master.refNo);
      if (mi > -1){
        masterRows[mi] = {
          ...masterRows[mi],
          department: root.querySelector('#hirarcEdDepartment').value,
          process: root.querySelector('#hirarcEdProcess').value,
          location: root.querySelector('#hirarcEdLocation').value,
          raLeader: root.querySelector('#hirarcEdRaLeader').value,
          approvedBy: root.querySelector('#hirarcEdApprovedBy').value,
        };
        await persist('HIRARC_MASTER');
        Object.assign(master, masterRows[mi]);
      }

      const hazardRows = await getData('HIRARC_HAZARDS');
      const others = hazardRows.filter(h => h.parentRefNo !== master.refNo);
      const saved = currentHazards.map(h => ({
        parentRefNo: master.refNo,
        workActivity: h.workActivity || '',
        hazard: h.hazard || '',
        possibleInjury: h.possibleInjury || '',
        existingControls: h.existingControls || '',
        s: h.s || '',
        l: h.l || '',
        rpn: hirarcNum(h.s) * hirarcNum(h.l),
        additionalControls: h.additionalControls || '',
        s2: h.s2 || '',
        l2: h.l2 || '',
        rpn2: hirarcNum(h.s2) * hirarcNum(h.l2),
        implementationPerson: h.implementationPerson || '',
        remarks: h.remarks || '',
      }));
      DATA_CACHE.HIRARC_HAZARDS = others.concat(saved);
      await persist('HIRARC_HAZARDS');
      flashSaved();
      const chip = root.querySelector('#hirarcEditorSavechip');
      if (chip){ chip.classList.add('show'); setTimeout(() => chip.classList.remove('show'), 1200); }
      alert(`Saved successfully.\n\nReference No: ${master.refNo}\n${currentHazards.length} hazard row(s) written to Google Sheet.`);
    } catch (err) {
      console.error('Save Hazards failed:', err);
    } finally {
      saveBtn.disabled = false;
    }
  });
}

/* ============================================================
   HIRARC — PDF export
============================================================= */
const HIRARC_PDF_COLORS = {
  yellow: '#fff2a8',
  tan: '#d9d3ac',
  pink: '#f4dcdc',
  headCyan: '#dcefef',
  border: '#8a8a8a',
};

function hirarcPdfMultiline(text){
  const lines = String(text ?? '').split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return '';
  return lines.map(l => `<div>${escapeHtml(l)}</div>`).join('');
}

function hirarcPdfHazardRowHtml(h, idx){
  const rpn = hirarcNum(h.s) * hirarcNum(h.l);
  const rpn2 = hirarcNum(h.s2) * hirarcNum(h.l2);
  const cellStyle = 'border:1px solid ' + HIRARC_PDF_COLORS.border + ';padding:6px 8px;vertical-align:top;font-size:11px;line-height:1.4;';
  const tightStyle = cellStyle + 'width:1%;white-space:nowrap;';
  const numStyle = tightStyle + 'text-align:center;';
  const wrapStyle = cellStyle + 'white-space:normal;word-break:break-word;';
  const rpnStyle = (v) => numStyle + 'font-weight:700;' + hirarcRpnStyle(v);
  return `<tr>
    <td style="${numStyle}">${idx + 1}</td>
    <td style="${tightStyle}">${escapeHtml(h.workActivity || '')}</td>
    <td style="${tightStyle}">${escapeHtml(h.hazard || '')}</td>
    <td style="${wrapStyle}">${hirarcPdfMultiline(h.possibleInjury)}</td>
    <td style="${wrapStyle}">${hirarcPdfMultiline(h.existingControls)}</td>
    <td style="${numStyle}">${escapeHtml(h.s ?? '')}</td>
    <td style="${numStyle}">${escapeHtml(h.l ?? '')}</td>
    <td style="${rpnStyle(rpn)}">${rpn}</td>
    <td style="${wrapStyle}">${hirarcPdfMultiline(h.additionalControls)}</td>
    <td style="${numStyle}">${escapeHtml(h.s2 ?? '')}</td>
    <td style="${numStyle}">${escapeHtml(h.l2 ?? '')}</td>
    <td style="${rpnStyle(rpn2)}">${rpn2}</td>
    <td style="${wrapStyle}">${hirarcPdfMultiline(h.implementationPerson)}</td>
    <td style="${wrapStyle}">${hirarcPdfMultiline(h.remarks)}</td>
  </tr>`;
}

function hirarcPdfHeaderHtml(master){
  const b = HIRARC_PDF_COLORS.border;
  const yellowCell = `background:${HIRARC_PDF_COLORS.yellow};border:1px solid ${b};padding:8px 10px;font-size:12px;`;
  const plainCell = `border:1px solid ${b};padding:8px 10px;font-size:12px;`;
  const blankCell = `border:1px solid ${b};padding:14px 10px;font-size:12px;`;
  const label = (t) => `<b>${t}</b>`;
  return `
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:12px;">
    <colgroup><col style="width:30%"><col style="width:26%"><col style="width:30%"><col style="width:14%"></colgroup>
    <tr>
      <td style="${yellowCell}">${label('Department:')} ${escapeHtml(master.department || '')}</td>
      <td style="${plainCell}">${label('RA Leader:')} ${escapeHtml(master.raLeader || '')}</td>
      <td style="${plainCell}"><u><b>Approved by</b></u></td>
      <td rowspan="6" style="${plainCell}text-align:center;vertical-align:middle;">
        <u><b>Reference Number</b></u><br><br>
        <span style="font-size:14px;font-weight:700;">${escapeHtml(master.refNo || '')}</span>
      </td>
    </tr>
    <tr>
      <td style="${yellowCell}">${label('Process:')} ${escapeHtml(master.process || '')}</td>
      <td style="${plainCell}">${label('RA Member 1:')} ${escapeHtml(master.raMember1 || '')}</td>
      <td style="${blankCell}">&nbsp;</td>
    </tr>
    <tr>
      <td style="${yellowCell}">${label('Process/Activity Location:')} ${escapeHtml(master.location || '')}</td>
      <td style="${plainCell}">${label('RA Member 2:')} ${escapeHtml(master.raMember2 || '')}</td>
      <td style="${plainCell}">${label('Signature:')}</td>
    </tr>
    <tr>
      <td style="${yellowCell}">${label('Original Assessment date:')} ${escapeHtml(fmtDate(master.originalDate) || '')}</td>
      <td style="${plainCell}">${label('RA Member 3:')} ${escapeHtml(master.raMember3 || '')}</td>
      <td style="${plainCell}">${label('Name:')} ${escapeHtml(master.approvedBy || '')}</td>
    </tr>
    <tr>
      <td style="${yellowCell}">${label('Last review date:')} ${escapeHtml(fmtDate(master.lastReviewDate) || '')}</td>
      <td style="${plainCell}">&nbsp;</td>
      <td style="${plainCell}">${label('Designation:')}</td>
    </tr>
    <tr>
      <td style="${yellowCell}">${label('Next review date:')} ${escapeHtml(fmtDate(master.nextReviewDate) || '')}</td>
      <td style="${plainCell}">&nbsp;</td>
      <td style="${plainCell}">${label('Date:')}</td>
    </tr>
  </table>`;
}

function buildHirarcPdfDocumentHtml(master, hazards){
  const b = HIRARC_PDF_COLORS.border;
  const groupHeadStyle = `border:1px solid ${b};padding:8px;font-size:12px;font-weight:700;text-align:center;`;
  const tightHeadStyle = `border:1px solid ${b};padding:6px 10px;font-size:10.5px;font-weight:700;text-align:center;white-space:nowrap;width:1%;`;
  const wrapHeadStyle = `border:1px solid ${b};padding:6px 10px;font-size:10.5px;font-weight:700;text-align:center;`;
  return `
  <div style="width:1650px;padding:24px;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#111;box-sizing:border-box;">
    <h2 style="margin:0 0 12px;font-size:18px;">HIRARC Assessment — ${escapeHtml(master.refNo || '')}</h2>
    ${hirarcPdfHeaderHtml(master)}
    <table style="width:100%;border-collapse:collapse;table-layout:auto;">
      <thead>
        <tr>
          <td colspan="4" style="${groupHeadStyle}background:${HIRARC_PDF_COLORS.headCyan};">HAZARD IDENTIFICATION</td>
          <td colspan="4" style="${groupHeadStyle}background:${HIRARC_PDF_COLORS.tan};">RISK EVALUATION</td>
          <td colspan="6" style="${groupHeadStyle}background:${HIRARC_PDF_COLORS.pink};">RISK CONTROL</td>
        </tr>
        <tr>
          <td style="${tightHeadStyle}">No</td>
          <td style="${tightHeadStyle}">Work Activity</td>
          <td style="${tightHeadStyle}">Hazard</td>
          <td style="${wrapHeadStyle}">Possible injury/ill-health</td>
          <td style="${wrapHeadStyle}background:${HIRARC_PDF_COLORS.tan};">Existing risk controls</td>
          <td style="${tightHeadStyle}background:${HIRARC_PDF_COLORS.tan};">S</td>
          <td style="${tightHeadStyle}background:${HIRARC_PDF_COLORS.tan};">L</td>
          <td style="${tightHeadStyle}background:${HIRARC_PDF_COLORS.tan};">RPN</td>
          <td style="${wrapHeadStyle}background:${HIRARC_PDF_COLORS.pink};">Additional Controls</td>
          <td style="${tightHeadStyle}background:${HIRARC_PDF_COLORS.pink};">S</td>
          <td style="${tightHeadStyle}background:${HIRARC_PDF_COLORS.pink};">L</td>
          <td style="${tightHeadStyle}background:${HIRARC_PDF_COLORS.pink};">RPN</td>
          <td style="${wrapHeadStyle}background:${HIRARC_PDF_COLORS.pink};">Implementation Person</td>
          <td style="${wrapHeadStyle}background:${HIRARC_PDF_COLORS.pink};">Remarks</td>
        </tr>
      </thead>
      <tbody>
        ${hazards.length ? hazards.map((h, i) => hirarcPdfHazardRowHtml(h, i)).join('') : `<tr><td colspan="14" style="border:1px solid ${b};padding:14px;text-align:center;font-size:11px;color:#666;">No hazard rows recorded for this assessment.</td></tr>`}
      </tbody>
    </table>
  </div>`;
}

async function downloadHirarcPdf(refNo){
  if (typeof html2pdf === 'undefined'){
    alert('PDF library failed to load. Check your internet connection and try again.');
    return;
  }
  const [masterRows, hazardRows] = await Promise.all([getData('HIRARC_MASTER'), getData('HIRARC_HAZARDS')]);
  const master = masterRows.find(r => r.refNo === refNo);
  if (!master){ alert('Assessment not found: ' + refNo); return; }
  const hazards = hazardRows.filter(h => h.parentRefNo === refNo);

  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-99999px;top:0;z-index:-1;';
  holder.innerHTML = buildHirarcPdfDocumentHtml(master, hazards);
  document.body.appendChild(holder);
  const target = holder.firstElementChild;

  try {
    await html2pdf().set({
      margin: 0,
      filename: `${refNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: target.scrollWidth },
      jsPDF: { unit: 'px', format: [target.scrollWidth, target.scrollHeight], orientation: 'landscape' },
      pagebreak: { mode: ['avoid-all'] },
    }).from(target).save();
  } catch (err){
    console.error('HIRARC PDF export failed:', err);
    alert('Could not generate the PDF. Please try again.');
  } finally {
    holder.remove();
  }
}

const HIRARC_PDF_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="currentColor" opacity="0.15"/><path d="M14 2v5h5" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.4" fill="none"/><text x="12" y="17.5" font-size="7.5" font-weight="700" text-anchor="middle" fill="currentColor">PDF</text></svg>`;

async function renderHirarcRegisterPage(){
  const root = document.createElement('div');

  async function showList(){
    const listWrap = await renderDataPage('HIRARC_MASTER', {
      wrapperClass: 'opkpi-modern-page',
      onAddRow: () => openNewHirarcModal(showList),
      tableOptions: {
        visibleColumnIds: ['refNo','department','process','location','raLeader','nextReviewDate','status'],
        onEditRow: async index => {
          const rows = await getData('HIRARC_MASTER');
          const master = rows[index];
          if (!master) return;
          await renderHirarcEditorView(root, master, showList);
        },
        extraRowAction: { title: 'Download PDF', icon: HIRARC_PDF_ICON },
        onExtraRowAction: async index => {
          const rows = await getData('HIRARC_MASTER');
          const master = rows[index];
          if (!master) return;
          await downloadHirarcPdf(master.refNo);
        },
      },
    });
    const addBtn = listWrap.querySelector('#addRowBtn');
    if (addBtn) addBtn.textContent = '+ New Assessment';
    const search = listWrap.querySelector('.searchbox');
    if (search) search.placeholder = 'Search HIRARC register...';
    ['#importBtn', '#undoBtn', '#importFile', '#exportBtn'].forEach(sel => {
      const el = listWrap.querySelector(sel);
      if (el) el.style.display = 'none';
    });

    root.innerHTML = '';
    root.appendChild(listWrap);
  }

  await showList();
  return root;
}