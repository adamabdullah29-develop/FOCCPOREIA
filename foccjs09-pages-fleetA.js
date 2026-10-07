/* =========================================================================
   FOCC — 09-pages-fleet.js
   Prime Mover, Trailer, Staff Database, HIRARC.
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