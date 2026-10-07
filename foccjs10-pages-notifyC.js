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