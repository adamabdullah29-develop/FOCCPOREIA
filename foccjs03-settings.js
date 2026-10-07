/* =========================================================================
   FOCC — 03-settings.js
   Settings config, backup/restore engine, Google Sheet provider,
   admin API (admin-provision Edge Function), mascot support.
   ========================================================================= */

/* ============================================================
   FOCC BACKUP API — endpoint tetap untuk Backup Email
============================================================= */
const FOCC_BACKUP_API =
'https://script.google.com/macros/s/AKfycbzpTzLhYTv4QY6JyUerfEjO1nXzp4fBAJKtR42Mi7Y2eF7TTVmgHg1oeLxMitxaq126wA/exec';

/* ============================================================
   SETTINGS CONFIG — load/save
============================================================= */
async function loadSettingsKey(key, fallback){
  try{
    if (window.storage && typeof window.storage.get === 'function'){
      const res = await window.storage.get(key, false);
      if (res && res.value) return JSON.parse(res.value);
    }
    if (typeof localStorage !== 'undefined'){
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  }catch(e){ /* not found yet */ }
  return fallback;
}

async function saveSettingsKey(key, value){
  try{
    if (window.storage && typeof window.storage.set === 'function'){
      await window.storage.set(key, JSON.stringify(value), false);
    } else if (typeof localStorage !== 'undefined'){
      localStorage.setItem(key, JSON.stringify(value));
    }
  }catch(e){ console.error('settings save failed', e); }
}

function defaultSettingsConfig(){
  return { companyName:'', googleSheetId:'', appsScriptUrl:'', provider:'local', providerByTable:{}, connectionStatus:'not_configured', backupMode:'auto', backupEmails:[] };
}

async function getSettingsConfig(){
  const cfg = await loadSettingsKey(SETTINGS_CONFIG_KEY, null);
  return cfg ? {...defaultSettingsConfig(), ...cfg} : defaultSettingsConfig();
}

async function saveSettingsConfig(cfg){
  await saveSettingsKey(SETTINGS_CONFIG_KEY, cfg);
}

/* ============================================================
   BACKUP HISTORY
============================================================= */
async function getBackupHistory(){
  return await loadSettingsKey(BACKUP_META_KEY, []);
}

async function addBackupHistoryEntry(entry){
  const list = await getBackupHistory();
  list.unshift(entry);
  if (list.length > MAX_BACKUP_HISTORY) list.length = MAX_BACKUP_HISTORY;
  await saveSettingsKey(BACKUP_META_KEY, list);
  return list;
}

async function deleteBackupHistoryEntry(isoDate, fileName){
  const list = await getBackupHistory();
  const next = list.filter(h => !(h.isoDate === isoDate && h.fileName === fileName));
  await saveSettingsKey(BACKUP_META_KEY, next);
  return next;
}

async function clearBackupHistory(){
  await saveSettingsKey(BACKUP_META_KEY, []);
  return [];
}

/* ============================================================
   CONNECTION STATUS HELPERS
============================================================= */
function isValidSheetIdFormat(id){
  return /^[a-zA-Z0-9_-]{20,}$/.test(String(id || '').trim());
}

function isValidAppsScriptUrlFormat(url){
  return /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(String(url || '').trim());
}

function computeConnectionStatus(cfg){
  const idOk = isValidSheetIdFormat(cfg.googleSheetId);
  const urlOk = isValidAppsScriptUrlFormat(cfg.appsScriptUrl);
  if (!idOk || !urlOk) return 'not_configured';
  return 'configured';
}

function settingsStatusBadgeHtml(status){
  const map = {
    not_configured: {cls:'neutral', label:'Not Configured'},
    configured:     {cls:'warn',    label:'Configured'},
    connected:      {cls:'good',    label:'Connected'},
    sync_active:    {cls:'sync',    label:'Sync Active'},
  };
  const s = map[status] || map.not_configured;
  return `<span class="badge ${s.cls}">${s.label}</span>`;
}

/* ============================================================
   SYNC PROVIDER FROM SESSION (Fasa 4 fix)
============================================================= */
async function syncProviderFromSession(session){
  try{
    clearTenantRuntimeState();
    startFOCCRealtime();

    const idOk = isValidSheetIdFormat(session && session.googleSheetId);
    const urlOk = isValidAppsScriptUrlFormat(session && session.appsScriptUrl);
    if (!idOk || !urlOk) return;

    const cfg = await getSettingsConfig();
    if (cfg.provider === 'sheet') return;

    const nextCfg = {
      ...cfg,
      provider: 'sheet',
      connectionStatus: computeConnectionStatus({googleSheetId: session.googleSheetId, appsScriptUrl: session.appsScriptUrl}),
    };
    await saveSettingsConfig(nextCfg);
  }catch(e){
    console.error('syncProviderFromSession failed', e);
  }
}

/* ============================================================
   GOOGLE SHEET PROVIDER
============================================================= */
function buildAppsScriptUrl(cfg, params){
  const url = new URL(String(cfg.appsScriptUrl || '').trim());
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

function getCurrentSessionAppsScriptUrl(){
  try{
    const session = JSON.parse(localStorage.getItem(FOCC_SESSION_KEY));
    return session?.appsScriptUrl || '';
  }catch(e){
    return '';
  }
}

function resolveActiveScriptUrl(cfg){
  const fromSession = getCurrentSessionAppsScriptUrl();
  if (fromSession) return fromSession;
  try{
    const sess = JSON.parse(localStorage.getItem(FOCC_SESSION_KEY) || 'null');
    if (sess && sess.companyId) return '';
  }catch(e){}
  return (cfg && cfg.appsScriptUrl) || '';
}

async function appsScriptGet(cfg, params){
  const activeUrl = resolveActiveScriptUrl(cfg);
  if (!activeUrl) throw new Error('The Google Sheet data source for this company has not been configured.');
  let res;
  try{
    res = await fetch(buildAppsScriptUrl({...cfg, appsScriptUrl: activeUrl}, params), {method:'GET'});
  }catch(e){
    throw new Error('Could not reach the Apps Script URL (network error or invalid URL).');
  }
  if (!res.ok) throw new Error(`Apps Script request failed (HTTP ${res.status}).`);
  let json;
  try{ json = await res.json(); }catch(e){ throw new Error('Apps Script did not return valid JSON.'); }
  if (json && json.success === false) throw new Error(json.error || 'Apps Script reported an error.');
  return json;
}

async function appsScriptPost(cfg, params, body){
  const activeUrl = resolveActiveScriptUrl(cfg);
  if (!activeUrl) throw new Error('The Google Sheet data source for this company has not been configured.');
  let res;
  try{
    res = await fetch(buildAppsScriptUrl({...cfg, appsScriptUrl: activeUrl}, params), {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify(body),
    });
  }catch(e){
    throw new Error('Could not reach the Apps Script URL (network error or invalid URL).');
  }
  if (!res.ok) throw new Error(`Apps Script request failed (HTTP ${res.status}).`);
  let json;
  try{ json = await res.json(); }catch(e){ throw new Error('Apps Script did not return valid JSON.'); }
  if (json && json.success === false) throw new Error(json.error || 'Apps Script reported an error.');
  return json;
}

function getCurrentSessionSheetId(){
  try{
    const session = JSON.parse(localStorage.getItem(FOCC_SESSION_KEY));
    return session?.googleSheetId || '';
  }catch(e){
    return '';
  }
}

async function pingGoogleSheet(cfg){
  return await appsScriptGet(cfg, {action:'ping', sheetId: getCurrentSessionSheetId()});
}

const GoogleSheetProvider = {
  name: 'sheet',
  async loadTable(tableKey){
    const cfg = await getSettingsConfig();
    const json = await appsScriptGet(cfg, {action:'loadTable', table: tableKey, sheetId: getCurrentSessionSheetId()});
    const rows = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
    if (json && typeof json.version !== 'undefined') DATA_VERSION[tableKey] = json.version;
    await markSyncActive();
    return rows;
  },
  async saveTable(tableKey, rows){
    const cfg = await getSettingsConfig();
    const json = await appsScriptPost(cfg, {action:'saveTable'}, {table: tableKey, sheetId: getCurrentSessionSheetId(), data: rows, version: DATA_VERSION[tableKey] || 1});
    if (json && typeof json.version !== 'undefined') DATA_VERSION[tableKey] = json.version;
    await markSyncActive();
    return true;
  },
};

/* ============================================================
   BACKUP / RESTORE
============================================================= */
function pad2(n){ return String(n).padStart(2,'0'); }

function buildBackupFileName(prefix, d){
  d = d || new Date();
  const y = d.getFullYear(), mo = pad2(d.getMonth()+1), da = pad2(d.getDate());
  const h = pad2(d.getHours()), mi = pad2(d.getMinutes()), s = pad2(d.getSeconds());
  return `${prefix}_${y}${mo}${da}_${h}${mi}${s}`;
}

async function buildBackupPayload(tableKeys){
  const keys = Array.isArray(tableKeys)
    ? tableKeys
    : Object.keys(TABLES);

  const tables = {};

  for (const tableKey of keys){
    tables[tableKey] = await getData(tableKey);
  }

  return {
    app:'FOMS',
    version:APP_VERSION,
    generatedAt:new Date().toISOString(),
    tables
  };
}

const BACKUP_ROUTE_TABLE_MAP = {
  operationKPI: ['operationKPI'],
  driverKPI: ['driverKPI'],
};

function getAuthorizedBackupTableKeys(){
  const allTableKeys = Object.keys(TABLES);

  if (hasAllRoutesAccess()){
    return allTableKeys;
  }

  return allTableKeys.filter(tableKey => {
    const routeKeys = BACKUP_ROUTE_TABLE_MAP[tableKey] || [tableKey];
    return routeKeys.some(routeKey => userCanAccess(routeKey));
  });
}

function downloadJSON(obj, filename){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json;charset=utf-8;'});
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildBackupWorkbookBlob(payload){
  if (typeof XLSX === 'undefined') throw new Error('Excel export library (SheetJS) failed to load.');
  const wb = XLSX.utils.book_new();
  const tableKeys = Object.keys(payload.tables || {});
  if (!tableKeys.length){
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No data']]), 'Empty');
  }
  for (const tableKey of tableKeys){
    const rows = Array.isArray(payload.tables[tableKey]) ? payload.tables[tableKey] : [];
    const ws = rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([['No records']]);
    const sheetName = String(tableKey).slice(0, 31) || 'Sheet';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  const wbArray = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  return new Blob([wbArray], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

function blobToBase64(blob){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('Could not read file for email attachment.'));
    reader.readAsDataURL(blob);
  });
}

function backupMetaEntry({fileName, trigger, status, note}){
  const now = new Date();
  return {
    date: now.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}),
    time: now.toLocaleTimeString('en-GB'),
    fileName,
    trigger,
    user: 'System',
    status,
    note: note || '',
    isoDate: now.toISOString(),
  };
}

async function sendBackupEmailIfConfigured({trigger, generatedAt, jsonBlob, jsonFileName, xlsxBlob, xlsxFileName}){
  const cfg = await getSettingsConfig();
  const recipients = Array.isArray(cfg.backupEmails) ? cfg.backupEmails : [];
  if (!recipients.length) return {sent:false, reason:'no_recipients'};
  if (!FOCC_BACKUP_API || FOCC_BACKUP_API === 'CURRENT_APPS_SCRIPT_URL') return {sent:false, reason:'backup_api_not_configured'};
  try{
    const [jsonBase64, xlsxBase64] = await Promise.all([blobToBase64(jsonBlob), blobToBase64(xlsxBlob)]);
    const when = new Date(generatedAt).toLocaleString('en-GB');
    const body = [
      'Attached are the latest FOCC backup files.',
      '',
      `Backup Type: ${trigger === 'Auto' ? 'Auto' : 'Manual'}`,
      `Generated: ${when}`,
      '',
      'Files:',
      '- JSON Backup',
      '- Excel Backup',
    ].join('\n');
    const url = new URL(FOCC_BACKUP_API);
    url.searchParams.set('action', 'sendBackupEmail');
    let res;
    try{
      res = await fetch(url.toString(), {
        method: 'POST',
        headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify({
          recipients,
          subject: 'FOCC Backup Report',
          body,
          trigger,
          generatedAt,
          attachments: [
            {filename: jsonFileName, mimeType:'application/json', base64: jsonBase64},
            {filename: xlsxFileName, mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', base64: xlsxBase64},
          ],
        }),
      });
    }catch(networkErr){
      throw new Error('Could not reach the Backup Email service (network error or invalid FOCC_BACKUP_API URL).');
    }
    if (!res.ok) throw new Error(`Backup Email service request failed (HTTP ${res.status}).`);
    let json;
    try{ json = await res.json(); }catch(parseErr){ throw new Error('Backup Email service did not return valid JSON.'); }
    if (json && json.success === false) throw new Error(json.error || 'Backup Email service reported an error.');
    return {sent:true, recipients: recipients.length};
  }catch(e){
    console.error('Backup email failed', e);
    return {sent:false, reason:'error', message:String(e && e.message || e)};
  }
}

async function runBackup(trigger){
  const fileNameBase = buildBackupFileName('FOMS_Backup');
  const fileName = `${fileNameBase}.json`;
  const xlsxFileName = `${fileNameBase}.xlsx`;
  try{
    const tableKeys =
      trigger === 'Manual'
        ? getAuthorizedBackupTableKeys()
        : undefined;

    const payload = await buildBackupPayload(tableKeys);
    const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json;charset=utf-8;'});
    if (trigger === 'Manual') downloadBlob(jsonBlob, fileName);

    let xlsxBlob = null;
    let xlsxNote = '';
    try{
      xlsxBlob = buildBackupWorkbookBlob(payload);
      if (trigger === 'Manual') downloadBlob(xlsxBlob, xlsxFileName);
    }catch(xe){
      console.error('Excel backup generation failed', xe);
      xlsxNote = `Excel export failed: ${String(xe && xe.message || xe)}`;
    }

    let emailNote = '';
    if (xlsxBlob){
      const emailResult = await sendBackupEmailIfConfigured({
        trigger, generatedAt: payload.generatedAt, jsonBlob, jsonFileName: fileName, xlsxBlob, xlsxFileName,
      });
      if (emailResult.sent) emailNote = `Emailed to ${emailResult.recipients} recipient(s).`;
      else if (emailResult.reason === 'error') emailNote = `Email not sent: ${emailResult.message}`;
    }

    const note = [xlsxNote, emailNote].filter(Boolean).join(' ');
    const entry = backupMetaEntry({fileName, trigger, status:'Success', note});
    entry.xlsxFileName = xlsxBlob ? xlsxFileName : '';
    await addBackupHistoryEntry(entry);
    return entry;
  }catch(e){
    console.error('Backup failed', e);
    const entry = backupMetaEntry({fileName, trigger, status:'Failed', note:String(e && e.message || e)});
    await addBackupHistoryEntry(entry);
    return entry;
  }
}

async function runSafetyBackup(){
  const fileNameBase = buildBackupFileName('FOMS_SafetyBackup');
  const fileName = `${fileNameBase}.json`;
  const payload = await buildBackupPayload();
  await saveSettingsKey(SAFETY_BACKUP_KEY, {fileName, payload, savedAt:new Date().toISOString()});
  const entry = backupMetaEntry({fileName, trigger:'Auto', status:'Success', note:'Pre-restore safety backup'});
  await addBackupHistoryEntry(entry);
  return entry;
}

async function restoreFromBackupPayload(payload){
  if (!payload || typeof payload.tables !== 'object') throw new Error('This file does not look like a FOMS backup.');
  const restoredKeys = [];
  for (const tableKey of Object.keys(payload.tables)){
    if (!TABLES[tableKey]) continue;
    const rows = Array.isArray(payload.tables[tableKey]) ? payload.tables[tableKey] : [];
    DATA_CACHE[tableKey] = rows;
    const provider = await getActiveProviderAsync(tableKey);
    await provider.saveTable(tableKey, rows);
    restoredKeys.push(tableKey);
  }
  return restoredKeys;
}

/* ============================================================
   AUTO BACKUP (every Saturday)
============================================================= */
function getISOWeekKey(d){
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}

function nextSaturday(from){
  const d = new Date(from);
  const diff = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

async function checkAutoBackup(){
  try{
    const cfg = await getSettingsConfig();
    if (cfg.backupMode === 'manual') return;
    const now = new Date();
    if (now.getDay() !== 6) return;
    const history = await getBackupHistory();
    const lastAuto = history.find(h => h.trigger === 'Auto' && h.status === 'Success' && !/safety backup/i.test(h.note||''));
    const thisWeek = getISOWeekKey(now);
    if (lastAuto && getISOWeekKey(new Date(lastAuto.isoDate)) === thisWeek) return;
    await runBackup('Auto');
  }catch(e){ console.error('Auto backup check failed', e); }
}

/* ============================================================
   RESTORE MODAL
============================================================= */
function openRestoreModal(onDone){
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.classList.remove('opkpi-modal');
  box.innerHTML = `
    <h4>&#9888; Restore Backup</h4>
    <div class="notice notice-warning" style="margin-bottom:14px;">
      <strong>WARNING</strong> — Current data will be replaced by the contents of the backup file you select.
      A temporary safety backup of your current data will be saved automatically before restoring.
      Are you sure?
    </div>
    <div class="formfield full">
      <label>Backup File (.json)</label>
      <input type="file" id="restoreFileInput" accept=".json">
    </div>
    <div id="restoreMsg" class="settings-note"></div>
    <div class="modalfoot">
      <button class="btn" id="cancelModal">Cancel</button>
      <button class="btn danger" id="confirmRestoreBtn">Restore</button>
    </div>
  `;
  overlay.classList.add('show');
  const close = () => overlay.classList.remove('show');
  box.querySelector('#cancelModal').addEventListener('click', close);
  box.querySelector('#confirmRestoreBtn').addEventListener('click', async () => {
    const fileInput = box.querySelector('#restoreFileInput');
    const msg = box.querySelector('#restoreMsg');
    const file = fileInput.files && fileInput.files[0];
    if (!file){ msg.textContent = 'Please choose a backup file first.'; msg.style.color = 'var(--red)'; return; }
    try{
      msg.style.color = 'var(--muted)';
      msg.textContent = 'Creating safety backup…';
      await runSafetyBackup();
      msg.textContent = 'Reading backup file…';
      const text = await file.text();
      const payload = JSON.parse(text);
      msg.textContent = 'Restoring data…';
      const restoredKeys = await restoreFromBackupPayload(payload);
      await addBackupHistoryEntry(backupMetaEntry({fileName:file.name, trigger:'Manual', status:'Success', note:`Restored ${restoredKeys.length} table(s)`}));
      close();
      if (onDone) await onDone({ok:true, restoredKeys});
    }catch(e){
      console.error('Restore failed', e);
      msg.style.color = 'var(--red)';
      msg.textContent = `Restore failed: ${e && e.message ? e.message : e}`;
      await addBackupHistoryEntry(backupMetaEntry({fileName:file.name, trigger:'Manual', status:'Failed', note:String(e && e.message || e)}));
    }
  });
}

/* ============================================================
   CONFIRM MODAL
============================================================= */
function confirmModal(title, message, {confirmLabel='Yes', cancelLabel='No', tone='warning'} = {}){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    box.innerHTML = `
      <h4>${title}</h4>
      <div class="notice notice-${tone}" style="margin-bottom:14px;">${message}</div>
      <div class="modalfoot">
        <button class="btn" id="confirmModalNo">${cancelLabel}</button>
        <button class="btn ${tone === 'danger' ? 'danger' : 'primary'}" id="confirmModalYes">${confirmLabel}</button>
      </div>
    `;
    overlay.classList.add('show');
    const finish = (result) => { overlay.classList.remove('show'); resolve(result); };
    box.querySelector('#confirmModalNo').addEventListener('click', () => finish(false));
    box.querySelector('#confirmModalYes').addEventListener('click', () => finish(true));
  });
}

/* ============================================================
   BACKUP HISTORY MODALS
============================================================= */
function openDeleteHistoryRowModal(fileName){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    box.innerHTML = `
      <h4>Delete Backup History Entry</h4>
      <div class="notice notice-danger" style="margin-bottom:14px;">
        This will permanently remove the log entry below from Backup History. The backup file itself, if already downloaded, is not affected.
      </div>
      <div class="settings-summary-row" style="background:#f8fafa;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:4px;">
        <div class="label" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">File</div>
        <div class="value mono" style="font-family:var(--font-mono);font-size:13px;color:var(--ink);margin-top:3px;word-break:break-all;">${escapeHtml(fileName)}</div>
      </div>
      <div class="modalfoot">
        <button class="btn" id="deleteRowCancel">Cancel</button>
        <button class="btn danger" id="deleteRowConfirm">Delete</button>
      </div>
    `;
    overlay.classList.add('show');
    const finish = (result) => { overlay.classList.remove('show'); resolve(result); };
    box.querySelector('#deleteRowCancel').addEventListener('click', () => finish(false));
    box.querySelector('#deleteRowConfirm').addEventListener('click', () => finish(true));
  });
}

function openDeleteAllHistoryModal(entryCount){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    box.innerHTML = `
      <h4>&#9888; Delete All Backup History</h4>
      <div class="notice notice-danger" style="margin-bottom:14px;">
        <strong>WARNING</strong> — This will permanently delete all ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'} in the Backup History log. Only the history log is affected — backup files you have already downloaded remain unchanged on disk and are not deleted by this action. This cannot be undone.
      </div>
      <div class="modalfoot">
        <button class="btn" id="deleteAllCancel">Cancel</button>
        <button class="btn danger" id="deleteAllConfirm">Delete All</button>
      </div>
    `;
    overlay.classList.add('show');
    const finish = (result) => { overlay.classList.remove('show'); resolve(result); };
    box.querySelector('#deleteAllCancel').addEventListener('click', () => finish(false));
    box.querySelector('#deleteAllConfirm').addEventListener('click', () => finish(true));
  });
}

/* ============================================================
   ADMIN PROVISION (Edge Function)
============================================================= */
async function adminInvoke(action, payload){
  const { data, error } = await FOCC_SUPABASE.functions.invoke('admin-provision', {
    body: Object.assign({ action: action }, payload || {}),
  });
  if (error){
    let msg = error.message || 'Admin error.';
    try{
      if (error.context && typeof error.context.json === 'function'){
        const j = await error.context.json();
        if (j && j.error) msg = j.error;
      }
    }catch(_e){}
    throw new Error(msg);
  }
  if (data && data.success === false) throw new Error(data.error || 'Admin error.');
  return data || {};
}

/* ============================================================
   USER MANAGER API
============================================================= */
async function fetchFoccUsers(){
  const res = await adminInvoke('list_users');
  return (res.data || []).map(normalizeFoccUser);
}
async function foccAddUser(payload){
  const res = await adminInvoke('create_user', payload);
  if (res && res.tempPassword){
    alert(
      'User created: ' + ((payload && payload.email) || '') + '\n\n' +
      'Temporary password: ' + res.tempPassword + '\n\n' +
      'Save this and pass it to the user. They can change it after signing in.'
    );
  }
  return res;
}
async function foccUpdateUser(originalEmail, payload){
  return adminInvoke('update_user', Object.assign({}, payload || {}, { originalEmail: originalEmail }));
}
async function foccDeleteUser(email){
  return adminInvoke('delete_user', { email: email });
}
async function foccSetUserStatus(email, status){
  return adminInvoke('set_user_status', { email: email, status: status });
}
async function foccResetUserVersion(email){
  return adminInvoke('reset_version', { email: email });
}

function normalizeFoccUser(r){
  let routes = r.routes ?? r.Routes ?? r.AllowedRoutes ?? r.allowedRoutes ?? [];
  if (typeof routes === 'string') routes = routes.split(',').map(s => s.trim()).filter(Boolean);
  if (!Array.isArray(routes)) routes = [];
  let expiryDate = r.expiryDate ?? r.ExpiryDate ?? r.expiry ?? '';
  if (typeof expiryDate === 'string'){
    const m = expiryDate.match(/^\d{4}-\d{2}-\d{2}/);
    expiryDate = m ? m[0] : expiryDate;
  }
  return {
    email: r.email ?? r.Email ?? '',
    company: r.company ?? r.Company ?? '',
    role: r.role ?? r.Role ?? '',
    status: r.status ?? r.Status ?? 'Active',
    companyId: r.companyId ?? r.CompanyID ?? '',
    expiryDate,
    version: r.version ?? r.Version ?? '',
    routes,
    googleSheetId: r.googleSheetId ?? r.GoogleSheetId ?? '',
    appsScriptUrl: r.appsScriptUrl ?? r.AppsScriptUrl ?? '',
  };
}

function generateTempPassword(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const buf = new Uint32Array(12);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < 12; i++) s += chars[buf[i] % chars.length];
  return s + '@1';
}

function showNewPasswordModal(email, password){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    box.classList.remove('user-modal');
    box.innerHTML = `
      <h4>New Password</h4>
      <div class="notice notice-info" style="margin-bottom:14px;">
        Password for <strong>${escapeHtml(email)}</strong>. The old password <strong>no longer works</strong>.
      </div>
      <div style="display:flex;align-items:center;gap:10px;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:12px 14px;">
        <span id="newPassValue" style="flex:1;font-family:var(--font-mono);font-size:17px;font-weight:700;letter-spacing:.5px;word-break:break-all;">${escapeHtml(password)}</span>
        <button class="btn primary" id="newPassCopy" style="flex:none;">Copy</button>
      </div>
      <div class="notice notice-danger" style="margin-top:12px;">
        ⚠️ Copy &amp; send it now. This password cannot be viewed again after this popup is closed.
      </div>
      <div class="modalfoot">
        <button class="btn" id="newPassClose">Close</button>
      </div>
    `;
    overlay.classList.add('show');

    const copyBtn = box.querySelector('#newPassCopy');
    const passSpan = box.querySelector('#newPassValue');

    copyBtn.addEventListener('click', async () => {
      try{
        await navigator.clipboard.writeText(password);
        copyBtn.textContent = '✅ Copied';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1600);
      }catch(e){
        const r = document.createRange();
        r.selectNodeContents(passSpan);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        copyBtn.textContent = 'Press Ctrl+C';
      }
    });

    box.querySelector('#newPassClose').addEventListener('click', () => {
      overlay.classList.remove('show');
      resolve(true);
    });
  });
}

/* ============================================================
   COMPANY MANAGER API
============================================================= */
async function fetchFoccCompanies(){
  const res = await adminInvoke('list_companies');
  return (res.data || []).map(normalizeFoccCompany);
}
async function foccAddCompany(payload){
  return adminInvoke('create_company', payload);
}
async function foccUpdateCompany(originalCompany, payload){
  return adminInvoke('update_company', Object.assign({}, payload || {}, { originalCompany: originalCompany }));
}
async function foccDeleteCompany(company){
  return adminInvoke('delete_company', { company: company });
}

function normalizeFoccCompany(r){
  return {
    company: r.company ?? r.Company ?? '',
    googleSheetId: r.googleSheetId ?? r.GoogleSheetID ?? r.GoogleSheetId ?? '',
    appsScriptUrl: r.appsScriptUrl ?? r.AppsScriptURL ?? r.AppsScriptUrl ?? '',
    status: r.status ?? r.Status ?? 'Active',
    companyId: r.companyId ?? r.CompanyID ?? '',
  };
}

/* ============================================================
   RELEASE MANAGER API
============================================================= */
async function getCurrentVersion(){
  const res = await adminInvoke('list_releases');
  const rows = res.data || [];
  return { currentVersion: rows.length ? rows[0].version : '' };
}

async function getSystemUpdates(){
  const res = await adminInvoke('list_releases');
  return (res.data || []).map(function(r){
    return { version: r.version, title: r.title, description: r.description };
  });
}

async function updateUserVersion(){
  const me = await FOCC_SUPABASE.auth.getUser();
  if (!me || me.error || !me.data || !me.data.user) return { success: false };
  const { error } = await FOCC_SUPABASE
    .from('profiles')
    .update({ version: FOCC_VERSION })
    .eq('id', me.data.user.id);
  if (error) throw error;
  return { success: true };
}

async function fetchSystemUpdates(){
  const res = await adminInvoke('list_releases');
  return (res.data || []).map(normalizeSystemUpdateRow);
}

function normalizeSystemUpdateRow(r){
  return {
    releaseId: r.releaseId ?? r.release_id ?? null,
    version: r.version ?? r.Version ?? '',
    releaseDate: r.releaseDate ?? r.ReleaseDate ?? r.date ?? r.Date ?? '',
    type: r.type ?? r.Type ?? '',
    title: r.title ?? r.Title ?? '',
    description: r.description ?? r.Description ?? '',
  };
}

/* ============================================================
   USER PERMISSION CHECKS
============================================================= */
function userCanAccess(routeKey){
  if (routeKey === 'releaseManager' || routeKey === 'userManager' || routeKey === 'companyManager' || routeKey === 'systemHealth') return isSuperAdmin();
  let session;
  try{
    session = JSON.parse(localStorage.getItem(FOCC_SESSION_KEY));
  }catch(e){
    session = null;
  }
  const routes = (session && Array.isArray(session.routes)) ? session.routes : [];
  if (routes.includes('ALL')) return true;
  return routes.includes(routeKey);
}

function hasAllRoutesAccess(){
  let session;
  try{
    session = JSON.parse(localStorage.getItem(FOCC_SESSION_KEY));
  }catch(e){
    session = null;
  }
  return !!(session && Array.isArray(session.routes) && session.routes.includes('ALL'));
}

function isSuperAdmin(){
  let session;
  try{
    session = JSON.parse(localStorage.getItem(FOCC_SESSION_KEY));
  }catch(e){
    session = null;
  }
  return !!(session && session.role === 'SuperAdmin');
}

function getFirstAllowedRoute(){
  if (userCanAccess('overview')) return 'overview';
  for (const entry of NAV_STRUCTURE){
    if (entry.standalone){
      if (ROUTES[entry.key] && userCanAccess(entry.key)) return entry.key;
      continue;
    }
    const itemLists = entry.subgroups ? entry.subgroups.map(sg => sg.items) : [entry.items];
    for (const items of itemLists){
      for (const it of items){
        const key = (typeof it === 'string') ? it : it.key;
        if (ROUTES[key] && userCanAccess(key)) return key;
      }
    }
  }
  return null;
}

function navItemKey(item){
  return (typeof item === 'string') ? item : item.key;
}

function navItemLabel(item){
  return (typeof item === 'string')
    ? (ROUTES[item] && ROUTES[item].title)
    : item.label;
}

/* ============================================================
   ADMIN LIVE POLLING
============================================================= */
async function foccAdminLiveTick(){
  if (document.hidden) return;
  if (!FOCC_ADMIN_LIVE_ROUTE || currentRoute !== FOCC_ADMIN_LIVE_ROUTE) return;
  if (foccRealtimeModalOpen()) return;
  if (FOCC_ADMIN_LIVE_BUSY) return;
  if (typeof FOCC_ADMIN_LIVE_REFRESH !== 'function') return;

  FOCC_ADMIN_LIVE_BUSY = true;
  FOCC_ADMIN_LIVE_LAST = Date.now();
  try{ await FOCC_ADMIN_LIVE_REFRESH(); }
  catch(err){ console.warn('Admin live refresh gagal:', err); }
  finally{ FOCC_ADMIN_LIVE_BUSY = false; }
}

function foccAdminLiveFocusTick(){
  if (document.hidden) return;
  if (Date.now() - FOCC_ADMIN_LIVE_LAST < FOCC_ADMIN_LIVE_FOCUS_GAP_MS) return;
  foccAdminLiveTick();
}

function foccAdminLiveStart(routeKey){
  if (!isSuperAdmin() || !FOCC_ADMIN_LIVE_ROUTES.has(routeKey) || typeof FOCC_ADMIN_LIVE_REFRESH !== 'function'){
    foccAdminLiveStop();
    return;
  }
  if (FOCC_ADMIN_LIVE_TIMER && FOCC_ADMIN_LIVE_ROUTE === routeKey) return;

  if (FOCC_ADMIN_LIVE_TIMER) clearInterval(FOCC_ADMIN_LIVE_TIMER);
  FOCC_ADMIN_LIVE_TIMER = null;
  FOCC_ADMIN_LIVE_ROUTE = routeKey;
  FOCC_ADMIN_LIVE_BUSY = false;

  document.removeEventListener('visibilitychange', foccAdminLiveFocusTick);
  window.removeEventListener('focus', foccAdminLiveFocusTick);
  document.addEventListener('visibilitychange', foccAdminLiveFocusTick);
  window.addEventListener('focus', foccAdminLiveFocusTick);

  FOCC_ADMIN_LIVE_TIMER = setInterval(foccAdminLiveTick, FOCC_ADMIN_LIVE_MS);
}

function foccAdminLiveStop(){
  if (FOCC_ADMIN_LIVE_TIMER){ clearInterval(FOCC_ADMIN_LIVE_TIMER); FOCC_ADMIN_LIVE_TIMER = null; }
  document.removeEventListener('visibilitychange', foccAdminLiveFocusTick);
  window.removeEventListener('focus', foccAdminLiveFocusTick);
  FOCC_ADMIN_LIVE_ROUTE = '';
  FOCC_ADMIN_LIVE_REFRESH = null;
  FOCC_ADMIN_LIVE_BUSY = false;
  FOCC_ADMIN_LIVE_LAST = 0;
}

/* ============================================================
   GET SESSION EMAIL (untuk Notification History Sent By)
============================================================= */
function getSessionEmail(){
  try{
    const session = JSON.parse(localStorage.getItem(FOCC_SESSION_KEY));
    return (session && session.email) || '';
  }catch(e){
    return '';
  }
}