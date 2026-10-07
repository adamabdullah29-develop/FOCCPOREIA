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