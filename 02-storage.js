/* =========================================================================
   FOCC — 02-storage.js
   Data layer: Supabase client, provider routing, loadTableData/saveTableData,
   getData/persist, realtime sync, dan Supabase provider.
   ========================================================================= */

/* ============================================================
   SUPABASE CLIENT (Fasa 1) — login email + password
   Publishable key SELAMAT ada dalam HTML (ia dilindungi oleh RLS).
   JANGAN letak secret key (sb_secret_...) di sini.
============================================================= */
const FOCC_SUPABASE_URL = 'https://hdorjlkwfldykmjhbctc.supabase.co';
const FOCC_SUPABASE_KEY = 'sb_publishable_h-FiqjHNYbz2sz4u_ESCjA_5jfF07mQ';

let FOCC_SUPABASE = null;
try {
  FOCC_SUPABASE = window.supabase.createClient(FOCC_SUPABASE_URL, FOCC_SUPABASE_KEY);
} catch (e) {
  console.error('Supabase client gagal dimuat:', e);
}

/* ============================================================
   LOAD/SAVE TABLE DATA — fallback ke localStorage atau window.storage
============================================================= */
async function loadTableData(tableKey){
  const def = TABLES[tableKey];
  const normalizeFegDates = rows => tableKey === 'feg'
    ? rows.map(row => {
        const clean = {...row};
        ['cylinder', 'service'].forEach(field => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(String(clean[field] || ''))) clean[field] = '';
        });
        return clean;
      })
    : rows;
  try{
    if (window.storage && typeof window.storage.get === 'function'){
      const res = await window.storage.get(def.storageKey, false);
      if (res && res.value){
        return normalizeFegDates(JSON.parse(res.value));
      }
    }
    if (typeof localStorage !== 'undefined'){
      const raw = localStorage.getItem(def.storageKey);
      if (raw) return normalizeFegDates(JSON.parse(raw));
    }
  }catch(e){ /* not found yet */ }
  return normalizeFegDates(def.seed.map(r => ({...r})));
}

async function saveTableData(tableKey, data){
  const def = TABLES[tableKey];
  try{
    if (window.storage && typeof window.storage.set === 'function'){
      await window.storage.set(def.storageKey, JSON.stringify(data), false);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(def.storageKey, JSON.stringify(data));
    }
    flashSaved();
  }catch(e){
    console.error('save failed', e);
  }
}

/* ============================================================
   PROVIDER ABSTRACTION — LOCAL STORAGE
============================================================= */
const LocalStorageProvider = {
  name: 'local',
  async loadTable(tableKey){ return await loadTableData(tableKey); },
  async saveTable(tableKey, rows){ await saveTableData(tableKey, rows); },
};

/* ============================================================
   SUPABASE PROVIDER (Fasa 2)
   Kontrak SAMA macam GoogleSheetProvider: loadTable pulangkan SELURUH
   array, saveTable ganti SELURUH array. Bezanya: semuanya melalui RLS,
   jadi setiap company hanya nampak & boleh tulis data dia sendiri.
============================================================= */
const SupabaseProvider = {
  name: 'supabase',

  async getCompanyId(){
    const authRes = await FOCC_SUPABASE.auth.getUser();
    if (authRes.error || !authRes.data || !authRes.data.user){
      throw new Error('No Supabase session. Please sign in again.');
    }
    const profRes = await FOCC_SUPABASE
      .from('profiles')
      .select('company_id')
      .eq('id', authRes.data.user.id)
      .single();
    if (profRes.error) throw profRes.error;
    if (!profRes.data || !profRes.data.company_id){
      throw new Error('Profile has no company_id. Contact your administrator.');
    }
    return profRes.data.company_id;
  },

  async loadTable(tableKey){
    const companyId = await this.getCompanyId();

    const { data, error } = await FOCC_SUPABASE
      .from('tenant_tables')
      .select('payload, version')
      .eq('company_id', companyId)
      .eq('table_key', tableKey)
      .maybeSingle();

    if (error) throw error;

    if (!data){
      DATA_VERSION[tableKey] = 1;
      return [];
    }

    DATA_VERSION[tableKey] = Number(data.version || 1);
    return Array.isArray(data.payload) ? data.payload : [];
  },

  async saveTable(tableKey, rows){
    const companyId = await this.getCompanyId();
    const expectedVersion = Number(DATA_VERSION[tableKey] || 1);

    const readRes = await FOCC_SUPABASE
      .from('tenant_tables')
      .select('version')
      .eq('company_id', companyId)
      .eq('table_key', tableKey)
      .maybeSingle();

    if (readRes.error) throw readRes.error;

    if (!readRes.data){
      const insRes = await FOCC_SUPABASE
        .from('tenant_tables')
        .insert({ company_id: companyId, table_key: tableKey, payload: rows, version: 1 });
      if (insRes.error) throw insRes.error;
      DATA_VERSION[tableKey] = 1;
      return true;
    }

    const currentVersion = Number(readRes.data.version) || 1;

    if (currentVersion !== expectedVersion){
      throw new Error('Version conflict: this data was changed by another user. Reload the page and try again.');
    }

    const nextVersion = currentVersion + 1;

    const updRes = await FOCC_SUPABASE
      .from('tenant_tables')
      .update({
        payload: rows,
        version: nextVersion,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('table_key', tableKey)
      .eq('version', currentVersion)
      .select('version')
      .maybeSingle();

    if (updRes.error) throw updRes.error;

    if (!updRes.data){
      throw new Error('Version conflict: this data was changed by another user. Reload the page and try again.');
    }

    DATA_VERSION[tableKey] = nextVersion;
    return true;
  },
};

/* ============================================================
   PROVIDER ROUTING (Fasa 2b)
   Sumber kebenaran = lajur companies.supabase_tables di Supabase,
   BUKAN localStorage. Jadi SEMUA user & device company sama dapat
   routing yang sama. Local providerByTable kekal sebagai override
   sementara (ujian / rollback kecemasan).
============================================================= */
function resetServerSupabaseTablesCache(){
  FOCC_SERVER_SUPABASE_TABLES = null;
  FOCC_SERVER_SUPABASE_TABLES_PROMISE = null;
}

async function getServerSupabaseTables(){
  if (FOCC_SERVER_SUPABASE_TABLES !== null) return FOCC_SERVER_SUPABASE_TABLES;
  if (FOCC_SERVER_SUPABASE_TABLES_PROMISE) return FOCC_SERVER_SUPABASE_TABLES_PROMISE;

  const promise = (async () => {
    let result = new Set();
    try{
      const sessRes = await FOCC_SUPABASE.auth.getSession();
      if (sessRes && sessRes.data && sessRes.data.session){
        const myCompanyId = await SupabaseProvider.getCompanyId();
        const res = await FOCC_SUPABASE
          .from('companies')
          .select('supabase_tables')
          .eq('company_id', myCompanyId)
          .maybeSingle();

        if (!res.error && res.data){
          result = new Set(
            String(res.data.supabase_tables || '')
              .split(',')
              .map(x => x.trim())
              .filter(x => x && TABLES[x])
          );
        } else if (res.error){
          console.warn('Server table routing unavailable:', res.error.message);
        }
      }
    }catch(err){
      console.warn('Server table routing failed; guna provider biasa:', err);
    }
    FOCC_SERVER_SUPABASE_TABLES = result;
    return result;
  })();

  FOCC_SERVER_SUPABASE_TABLES_PROMISE = promise;
  try{
    return await promise;
  }finally{
    if (FOCC_SERVER_SUPABASE_TABLES_PROMISE === promise){
      FOCC_SERVER_SUPABASE_TABLES_PROMISE = null;
    }
  }
}

function resolveProviderName(cfg, tableKey, serverTables){
  if (FOCC_SUPABASE_ONLY) return 'supabase';

  const localMap = (cfg && cfg.providerByTable) || {};

  if (tableKey && localMap[tableKey]) return String(localMap[tableKey]);

  if (tableKey && SUPABASE_NATIVE_TABLES.has(tableKey)) return 'supabase';

  if (serverTables && serverTables.has(tableKey)) return 'supabase';

  return (cfg && cfg.provider) || 'local';
}

function providerByName(name){
  if (name === 'sheet')    return GoogleSheetProvider;
  if (name === 'supabase') return SupabaseProvider;
  return LocalStorageProvider;
}

function getActiveProvider(cfg, tableKey, serverTables){
  return providerByName(resolveProviderName(cfg, tableKey, serverTables));
}

async function getActiveProviderAsync(tableKey){
  const cfg = await getSettingsConfig();
  const serverTables = await getServerSupabaseTables();
  return getActiveProvider(cfg, tableKey, serverTables);
}

async function setTableProvider(tableKey, providerName){
  const cfg = await getSettingsConfig();
  const map = Object.assign({}, cfg.providerByTable || {});
  if (providerName) map[tableKey] = String(providerName);
  else delete map[tableKey];
  await saveSettingsConfig(Object.assign({}, cfg, { providerByTable: map }));
  console.log('providerByTable =', map);
  return map;
}

/* ============================================================
   getData / persist — provider-routed
============================================================= */
async function getData(tableKey){
  if (!(tableKey in DATA_CACHE)){
    const provider = await getActiveProviderAsync(tableKey);
    DATA_CACHE[tableKey] = await provider.loadTable(tableKey);
  }
  return DATA_CACHE[tableKey];
}

async function persist(tableKey){
  const provider = await getActiveProviderAsync(tableKey);
  foccRealtimeMute(tableKey);
  try{
    await provider.saveTable(tableKey, DATA_CACHE[tableKey]);
  }catch(err){
    alert('Save failed: ' + (err && err.message ? err.message : err));
    throw err;
  }
}

async function markSyncActive(){
  const cfg = await getSettingsConfig();
  if (cfg.provider === 'sheet' && cfg.connectionStatus !== 'sync_active'){
    await saveSettingsConfig({...cfg, connectionStatus:'sync_active'});
  }
}

/* ============================================================
   REALTIME SYNC — tenant_tables sahaja
============================================================= */
function foccRealtimeMute(tableKey){
  if (tableKey) FOCC_RT_MUTE[tableKey] = Date.now() + 8000;
}

async function foccRealtimeIsSupabase(tableKey){
  try{
    const provider = await getActiveProviderAsync(tableKey);
    if (provider === SupabaseProvider) return true;
    return String((provider && provider.name) || '') === 'supabase';
  }catch(e){ return false; }
}

function foccRealtimeModalOpen(){
  const ov = document.getElementById('modalOverlay');
  return !!(ov && ov.classList.contains('show'));
}

function foccDetailEditOpen(){
  return !!document.querySelector(
    '#pmSave, #tlSave, #stSave, #fegSave, #fegDocUpdatePanel, #pmDocUpdatePanel, #tlDocUpdatePanel, #stDocUpdatePanel'
  );
}

function foccRealtimeScheduleRefresh(tableKey, delay){
  clearTimeout(FOCC_RT_PULL_TIMERS[tableKey]);
  FOCC_RT_PULL_TIMERS[tableKey] = setTimeout(async () => {
    delete FOCC_RT_PULL_TIMERS[tableKey];
    try{ await foccRealtimePull(tableKey); }
    catch(e){ console.error('realtime pull failed', tableKey, e); }
  }, Math.max(0, delay || 0));
}

async function foccRealtimePull(tableKey){
  const versionBefore = Number(DATA_VERSION[tableKey] || 0);

  const rows = await SupabaseProvider.loadTable(tableKey);
  DATA_CACHE[tableKey] = rows;
  let changed = true;
  try{
    const companyId = await SupabaseProvider.getCompanyId();
    const res = await FOCC_SUPABASE.from('tenant_tables')
      .select('version').eq('company_id', companyId).eq('table_key', tableKey).maybeSingle();
    const fresh = (res && res.data) ? Number(res.data.version) : versionBefore;
    DATA_VERSION[tableKey] = fresh || versionBefore;
    changed = (fresh !== versionBefore);
  }catch(e){ /* anggap berubah */ }

  const drawRoute = (currentRoute === tableKey)
    ? tableKey
    : ((FOCC_RT_DERIVED_ROUTES[tableKey] || []).includes(currentRoute) ? currentRoute : null);

  if (changed && !foccRealtimeModalOpen() && !foccDetailEditOpen() && drawRoute){
    goTo(drawRoute, { silent: true });
  }
}

async function foccRealtimeOnChange(payload){
  const row = payload && payload.new;
  if (!row || !row.table_key) return;

  const key = row.table_key;
  if (!(await foccRealtimeIsSupabase(key))) return;

  const incoming = Number(row.version || 0);
  const current  = Number(DATA_VERSION[key] || 0);
  if (incoming <= current) return;
  const muteUntil = FOCC_RT_MUTE[key] || 0;
  if (Date.now() < muteUntil){
    foccRealtimeScheduleRefresh(key, muteUntil - Date.now() + 100);
    return;
  }

  foccRealtimeScheduleRefresh(key, 400);
}

function foccRealtimeBugChange(){
  bugBadgeRefresh();
  if (typeof window.FOCC_REFRESH_BUGS === 'function' && !foccRealtimeModalOpen()){
    try{ window.FOCC_REFRESH_BUGS().catch(() => {}); }catch(e){}
  }
}

async function startFOCCRealtime(){
  const task = FOCC_RT_QUEUE.then(async () => {
    let companyId = '';
    try{
      companyId = await SupabaseProvider.getCompanyId();
    }catch(e){
      companyId = '';
    }

    if (!companyId){
      if (FOCC_RT_TRIES < 5 && !FOCC_RT_REJOIN_TIMER){
        FOCC_RT_TRIES += 1;
        FOCC_RT_REJOIN_TIMER = setTimeout(() => {
          FOCC_RT_REJOIN_TIMER = null;
          startFOCCRealtime();
        }, 3000);
      }
      return;
    }
    FOCC_RT_TRIES = 0;

    if (FOCC_RT_CHANNEL && FOCC_RT_COMPANY === companyId) return;

    const oldChannel = FOCC_RT_CHANNEL;
    FOCC_RT_CHANNEL = null;
    FOCC_RT_COMPANY = '';

    if (oldChannel){
      try{
        await FOCC_SUPABASE.removeChannel(oldChannel);
      }catch(e){
        console.warn('Realtime channel cleanup failed:', e);
      }
    }

    const channel = FOCC_SUPABASE
      .channel('focc-tenant:' + companyId)
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'tenant_tables', filter: 'company_id=eq.' + companyId },
          foccRealtimeOnChange)
      .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'tenant_tables', filter: 'company_id=eq.' + companyId },
          foccRealtimeOnChange)
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'bug_reports' },
          foccRealtimeBugChange)
      .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'bug_reports' },
          foccRealtimeBugChange);

    FOCC_RT_COMPANY = companyId;
    FOCC_RT_CHANNEL = channel;

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'){
        if (FOCC_RT_CHANNEL !== channel) return;
        if (FOCC_RT_REJOIN_TIMER) return;
        FOCC_RT_REJOIN_TIMER = setTimeout(() => {
          FOCC_RT_REJOIN_TIMER = null;
          startFOCCRealtime();
        }, 3000);
      }
    });

    if (!window.__foccRtFocusWired){
      window.__foccRtFocusWired = true;
      document.addEventListener('visibilitychange', async () => {
        if (document.hidden) return;

        if (!FOCC_RT_CHANNEL){
          await startFOCCRealtime();
          return;
        }

        const key = currentRoute;
        if (!key || !TABLES[key]) return;
        if (!(await foccRealtimeIsSupabase(key)) || foccRealtimeModalOpen()) return;
        try{ await foccRealtimePull(key); }catch(e){}
      });
    }
  });

  FOCC_RT_QUEUE = task.catch(() => {});
  return task;
}

async function stopFOCCRealtime(){
  try{
    if (FOCC_RT_REJOIN_TIMER){ clearTimeout(FOCC_RT_REJOIN_TIMER); FOCC_RT_REJOIN_TIMER = null; }
    Object.keys(FOCC_RT_PULL_TIMERS || {}).forEach(k => {
      clearTimeout(FOCC_RT_PULL_TIMERS[k]);
      delete FOCC_RT_PULL_TIMERS[k];
    });

    const ch = FOCC_RT_CHANNEL;
    FOCC_RT_CHANNEL = null;
    FOCC_RT_COMPANY = '';
    FOCC_RT_TRIES   = 0;

    if (ch){
      try{ await FOCC_SUPABASE.removeChannel(ch); }
      catch(e){ console.warn('stopFOCCRealtime: removeChannel failed', e); }
    }
  }catch(e){ console.warn('stopFOCCRealtime failed', e); }
}

function clearTenantRuntimeState(){
  Object.keys(DATA_CACHE).forEach(k => delete DATA_CACHE[k]);
  Object.keys(DATA_VERSION).forEach(k => delete DATA_VERSION[k]);
  if (window.IMPORT_BACKUPS){
    Object.keys(window.IMPORT_BACKUPS).forEach(k => delete window.IMPORT_BACKUPS[k]);
  }
  resetServerSupabaseTablesCache();
  stopFOCCRealtime();
  foccAdminLiveStop();
}

/* Watchdog: pastikan channel realtime sentiasa wujud selagi user login.
   Menutup semua jalan "channel tak lahir masa page load" */
window.__foccRtWatchdog = setInterval(async () => {
  try{
    if (FOCC_RT_CHANNEL) return;

    const sess = await FOCC_SUPABASE.auth.getSession();
    if (!sess || !sess.data || !sess.data.session) return;

    await startFOCCRealtime();
    if (FOCC_RT_CHANNEL) console.info('Realtime channel started (watchdog).');
  }catch(e){}
}, 5000);

/* ============================================================
   FASA 5 — SUMBER TUNGGAL untuk Sheet ID + Apps Script URL
============================================================= */
async function fetchCompanySheetCreds(companyId){
  const empty = { googleSheetId: '', appsScriptUrl: '', status: 'Active' };
  if (!companyId) return empty;
  try{
    const res = await FOCC_SUPABASE
      .from('companies')
      .select('status, google_sheet_id, apps_script_url')
      .eq('company_id', companyId)
      .maybeSingle();
    if (!res.data) return empty;
    return {
      googleSheetId: res.data.google_sheet_id || '',
      appsScriptUrl: res.data.apps_script_url || '',
      status: res.data.status || 'Active'
    };
  }catch(e){
    console.warn('fetchCompanySheetCreds failed:', e);
    return empty;
  }
}