/* =========================================================================
   FOCC — 13-boot.js  (GABUNGAN A + B)
   ROUTES, NAV_STRUCTURE, buildNav, goTo, initFOCC, theme, event listeners.

   PATCH v2 (2026-02):
   - auth listener: guard guna `event|session` (bukan event sahaja)
     supaya TOKEN_REFRESHED → SIGNED_OUT → TOKEN_REFRESHED semua diproses

   PATCH v3 (2026-02):
   - retry sampai SDK ready — CDN script (supabase-js) kadang load
     LEPAS 13-boot.js jalan.

   PATCH v4 (2026-10):
   - SIGNED_OUT grace period 3s — SDK init race buang session semasa
     page refresh. Listener abaikan SIGNED_OUT dalam grace period
     kalau FOCC_SESSION_KEY masih ada dalam localStorage.
   =========================================================================
   Bahagian A — ROUTES + NAV_STRUCTURE
   Bahagian B — buildNav, goTo, initFOCC, theme, event listeners
   ========================================================================= */

/* =========================================================================
   BAHAGIAN A — ROUTES + NAV_STRUCTURE
   ========================================================================= */

/* ============================================================
   ROUTES — peta semua page
============================================================= */
const ROUTES = {
  overview:            { title:'Main Menu', crumb:'Overview', render: renderOverview },
  mileage:             { title:'Truck Mileage', crumb:'Operation', render: () => renderDataPage('mileage') },

  maintenanceDashboard:{ title:'Maintenance Dashboard', crumb:'Maintenance', render: renderMaintenanceDashboard },
  maintenanceLog:      { title:'Maintenance Log', crumb:'Maintenance', render: () => renderDataPage('maintenanceLog') },
  machineryLog:        { title:'Machinery Log', crumb:'Maintenance', render: () => renderDataPage('machineryLog') },

  complianceDashboard: { title:'Compliance Dashboard', crumb:'Compliance', render: renderComplianceDashboard },
  speedingIdling:      { title:'Speeding & Idling', crumb:'Compliance', render: () => renderDataPage('speedingIdling', {
    wrapperClass: 'opkpi-modern-page',
    filterFields: ['branch'],
  })},

  misconduct:          { title:'Misconduct', crumb:'Compliance', render: renderMisconductPage },
  safetyEquipment:     { title:'Safety Equipment', crumb:'Compliance', render: renderSafetyPage },

  feg: {
    title:'FEG',
    crumb:'Compliance',
    render: renderFegPage,
  },
  fegDisposal: {
    title:'FEG Disposal',
    crumb:'Compliance',
    render: renderFegDisposalPage,
  },
  fegServiceHistory: {
    title:'Service History',
    crumb:'Compliance',
    render: renderFegServiceHistoryPage,
  },
    /* ---- Depot Module (Phase 2) ---- */
  depotOverview: {
    title: 'Depot Overview',
    crumb: 'Depot',
    render: renderDepotOverview,
  },
  depotLayout: {
    title: 'Depot Layout',
    crumb: 'Depot',
    render: renderDepotLayout,
  },
  primeMover:          { title:'Prime Mover Details', crumb:'Compliance', render: renderPrimeMoverPage },

  trailer:             { title:'Trailer Details', crumb:'Compliance', render: renderTrailerPage },

  staffDatabase:       { title:'Staff Database', crumb:'Compliance', render: renderStaffPage },

  whatsappGroups: { title:'WhatsApp Groups', crumb:'Notification', render: () => renderDataPage('whatsappGroups', {
    wrapperClass: 'opkpi-modern-page',
    filterFields: ['branch', 'status'],
  }) },
  notificationContact: { title:'Notification Contact', crumb:'Notification', render: () => renderDataPage('notificationContact', {
    wrapperClass: 'opkpi-modern-page',
    filterFields: ['status'],
  }) },
  notificationHistory: {
    title:'Notification History',
    crumb:'Notification',
    render: () => renderDataPage('notificationHistory', {
      readOnly: true,
      wrapperClass: 'opkpi-modern-page',
      filterFields: ['module', 'status'],
      tableOptions: {
        showEditButton: false,
        showDeleteButton: hasAllRoutesAccess(),
        visibleColumnIds: ['date','time','module','asset','recipient','phone','sentBy','status'],
      },
    }),
  },

  settings:            { title:'Settings', crumb:'Settings', render: renderSettingsPage },
  releaseManager:      { title:'Release Manager', crumb:'Settings', render: renderReleaseManagerPage },
  userManager:         { title:'User Manager', crumb:'Settings', render: renderUserManagerPage },
  companyManager:      { title:'Company Manager', crumb:'Settings', render: renderCompanyManagerPage },
  systemHealth:        { title:'System Health', crumb:'Administration', render: renderSystemHealthPage },

  /* ---- New module skeletons (registered, existing entries above untouched) ---- */
  tipperOpsDashboard:            { title:'Tipper Dashboard',    crumb:'Tipper Operations',        render: () => renderModuleSkeleton('tipperOpsDashboard') },
  containerOpsDashboard:         { title:'Container Dashboard', crumb:'Container Operations',     render: () => renderModuleSkeleton('containerOpsDashboard') },
  tankerOpsDashboard:            { title:'Tanker Dashboard',    crumb:'Tanker Operations',        render: () => renderModuleSkeleton('tankerOpsDashboard') },
  logisticsDistributionDashboard:{ title:'Logistics Dashboard', crumb:'Logistics & Distribution', render: () => renderModuleSkeleton('logisticsDistributionDashboard') },
  orderPlanning:                 { title:'Order Planning',      crumb:'Logistics & Distribution', render: () => renderModuleSkeleton('orderPlanning') },
  routePlanning:                 { title:'Route Planning',      crumb:'Logistics & Distribution', render: () => renderModuleSkeleton('routePlanning') },
  deliveryPlanning:              { title:'Delivery Planning',   crumb:'Logistics & Distribution', render: () => renderModuleSkeleton('deliveryPlanning') },
  podManagement:                 { title:'POD Management',      crumb:'Logistics & Distribution', render: () => renderModuleSkeleton('podManagement') },
  jisa:                          { title:'JISA',                crumb:'Audit & Risk',              render: () => renderModuleSkeleton('jisa') },
  hirarc:                        { title:'HIRARC Register',     crumb:'Audit & Risk',              render: renderHirarcRegisterPage },

  apadKnowledgeCenter: {
    title:'APAD Documents',
    crumb:'Knowledge Center',
    render: () => renderDataPage('apadDocuments', { wrapperClass: 'opkpi-modern-page' })
  },

  invoiceManagement:             { title:'Invoice Management',  crumb:'Finance & Cost Control',   render: () => renderModuleSkeleton('invoiceManagement') },
  vendorManagement:              { title:'Vendor Management',   crumb:'Finance & Cost Control',   render: () => renderModuleSkeleton('vendorManagement') },
  pettyCash:                     { title:'Petty Cash',          crumb:'Finance & Cost Control',   render: () => renderModuleSkeleton('pettyCash') },

  tipperOperationKPI: {
    title:'Tipper Operation KPI',
    crumb:'Tipper Operations',
    render: () => renderDataPage('operationKPI', { wrapperClass: 'opkpi-modern-page' })
  },

  tipperDriverKPI: {
    title:'Tipper Driver KPI',
    crumb:'Tipper Operations',
    render: () => renderModuleSkeleton('tipperDriverKPI')
  },

  containerOperationKPI: {
    title:'Container Operation KPI',
    crumb:'Container Operations',
    render: () => renderDataPage('containerOperationKPI', { wrapperClass: 'opkpi-modern-page' })
  },

  containerDriverKPI: {
    title:'Container Driver KPI',
    crumb:'Container Operations',
    render: () => renderModuleSkeleton('containerDriverKPI')
  },

  tankerOperationKPI: {
    title:'Tanker Operation KPI',
    crumb:'Tanker Operations',
    render: () => renderModuleSkeleton('tankerOperationKPI')
  },

  tankerDriverKPI: {
    title:'Tanker Driver KPI',
    crumb:'Tanker Operations',
    render: () => renderModuleSkeleton('tankerDriverKPI')
  },
};

/* ============================================================
   NAV_STRUCTURE — sidebar
============================================================= */
const NAV_STRUCTURE = [
  { key:'overview', label:'Main Menu', standalone:true, dot:'var(--teal)' },

  { group:'Operations', dot:'#1aa39a', subgroups:[
    { label:'Tipper Operations', items:[
      {key:'tipperOpsDashboard', label:'Dashboard'},
      {key:'tipperOperationKPI', label:'Operation KPI'},
      {key:'tipperDriverKPI', label:'Driver KPI'},
    ]},
    { label:'Container Operations', items:[
      {key:'containerOpsDashboard', label:'Dashboard'},
      {key:'containerOperationKPI', label:'Operation KPI'},
      {key:'containerDriverKPI', label:'Driver KPI'},
    ]},
    { label:'Tanker Operations', items:[
      {key:'tankerOpsDashboard', label:'Dashboard'},
      {key:'tankerOperationKPI', label:'Operation KPI'},
      {key:'tankerDriverKPI', label:'Driver KPI'},
    ]},
    { label:'Logistics & Distribution', items:[
      {key:'logisticsDistributionDashboard', label:'Dashboard'},
      {key:'orderPlanning', label:'Order Planning'},
      {key:'routePlanning', label:'Route Planning'},
      {key:'deliveryPlanning', label:'Delivery Planning'},
      {key:'podManagement', label:'POD Management'},
    ]},
  ]},

  { group:'Maintenance', dot:'#e6a339', items:['maintenanceDashboard','maintenanceLog','machineryLog','mileage'] },

  { group:'Safety & Compliance', dot:'#d1554a', items:[
    {key:'complianceDashboard', label:'Compliance Dashboard'},
  ], subgroups:[
    { label:'Audit & Risk', items:[
      'jisa', 'hirarc',
    ]},
    { label:'Staff & Discipline', items:[
      'misconduct',
      {key:'speedingIdling', label:'Speeding'},
      {key:'staffDatabase',  label:'Staff Database'},
    ]},
    { label:'Vehicle Compliance', items:[
      {key:'primeMover', label:'Prime Mover'},
      {key:'trailer',    label:'Trailer'},
    ]},
    { label:'Fire Safety', items:[
      {key:'feg',               label:'FEG'},
      {key:'fegDisposal',       label:'FEG Disposal'},
      {key:'fegServiceHistory', label:'FEG Service History'},
    ]},
    { label:'Safety Equipment', items:[
      {key:'safetyEquipment', label:'Safety Equipment'},
    ]},
    { label:'Knowledge Center', items:[
      {key:'apadKnowledgeCenter', label:'APAD'},
    ]},
  ]},

    { group:'Depot Operations', dot:'#1aa39a', items:[
    {key:'depotOverview', label:'Depot Overview'},
    {key:'depotLayout',   label:'Depot Layout'},
  ]},

  { group:'Finance & Cost Control', dot:'#8a5fd1', items:[
    'invoiceManagement', 'vendorManagement', 'pettyCash',
  ]},

  { group:'Communication', dot:'#4f7fd1', items:[
    {key:'whatsappGroups', label:'WhatsApp Groups'},
    {key:'notificationContact', label:'Notification'},
    'notificationHistory',
  ]},

  { group:'Administration', dot:'#7f97ab', items:[
    'settings',
    {key:'releaseManager', label:'Release Manager'},
    'userManager', 'companyManager',
    {key:'systemHealth', label:'System Health'},
  ]},
];

/* =========================================================================
   BAHAGIAN B — buildNav, goTo, initFOCC, theme, event listeners
   ========================================================================= */

/* ============================================================
   SIDEBAR NAV
============================================================= */
function reloadToRoute(routeKey){
  try {
    const nw = document.getElementById('navwrap');
    if (nw) sessionStorage.setItem('focc-nav-scroll', String(nw.scrollTop || 0));
  } catch(e){}
  try { history.replaceState(null, '', '#/' + routeKey); }
  catch(e){ location.hash = '#/' + routeKey; }
  goTo(routeKey);
}

function buildNavItemEl(item){
  const routeKey = navItemKey(item);

  const a = document.createElement('a');
  a.className = 'navitem';
  a.dataset.route = routeKey;
  a.textContent = navItemLabel(item);

  a.addEventListener('click', () => reloadToRoute(routeKey));

  return a;
}

function buildNav(){
  const navwrap = document.getElementById('navwrap');
  navwrap.innerHTML = '';

  NAV_STRUCTURE.forEach(entry => {

    if (entry.standalone){
      if (!userCanAccess(entry.key)) return;

      const a = document.createElement('a');
      a.className = 'navitem active';
      a.textContent = entry.label;
      a.style.marginLeft = '2px';
      a.style.fontFamily = 'var(--font-display)';
      a.style.fontWeight = '700';
      a.style.fontSize = '14.5px';
      a.dataset.route = entry.key;

      a.addEventListener('click', () => reloadToRoute(entry.key));

      navwrap.appendChild(a);
      return;
    }

    if (entry.subgroups || entry.items){

      const visibleItems = (entry.items || [])
        .filter(it => userCanAccess(navItemKey(it)));

      const visibleSubgroups = (entry.subgroups || [])
        .map(sg => ({
          label: sg.label,
          items: sg.items.filter(it => userCanAccess(navItemKey(it)))
        }))
        .filter(sg => sg.items.length > 0);

      if (visibleItems.length === 0 && visibleSubgroups.length === 0) return;

      const group = document.createElement('div');
      group.className = 'navgroup open';

      group.innerHTML = `
        <div class="navgroup-head">
          <span class="dot" style="background:${entry.dot}"></span>
          ${entry.group}
          <span class="chev">›</span>
        </div>
        <div class="navlist"></div>
      `;

      const head = group.querySelector('.navgroup-head');
      head.addEventListener('click', () => group.classList.toggle('open'));

      const list = group.querySelector('.navlist');

      visibleItems.forEach(it => list.appendChild(buildNavItemEl(it)));

      visibleSubgroups.forEach(sg => {
        const sub = document.createElement('div');
        sub.className = 'navsubgroup';

        sub.innerHTML = `
          <div class="navsubgroup-head">
            <span class="subdot"></span>
            ${sg.label}
            <span class="chev">›</span>
          </div>
          <div class="navsublist"></div>
        `;

        const subHead = sub.querySelector('.navsubgroup-head');
        subHead.addEventListener('click', (e) => {
          e.stopPropagation();
          sub.classList.toggle('open');
        });

        const subList = sub.querySelector('.navsublist');
        sg.items.forEach(it => {
          subList.appendChild(buildNavItemEl(it));
        });

        list.appendChild(sub);
      });

      navwrap.appendChild(group);
      return;
    }

    const visibleItems = entry.items.filter(
      it => userCanAccess(navItemKey(it))
    );

    if (visibleItems.length === 0) return;

    const group = document.createElement('div');
    group.className = 'navgroup open';

    group.innerHTML = `
      <div class="navgroup-head">
        <span class="dot" style="background:${entry.dot}"></span>
        ${entry.group}
        <span class="chev">›</span>
      </div>
      <div class="navlist"></div>
    `;

    const head = group.querySelector('.navgroup-head');
    head.addEventListener('click', () => {
      group.classList.toggle('open');
    });
    const list = group.querySelector('.navlist');
    visibleItems.forEach(it => {
      list.appendChild(buildNavItemEl(it));
    });
    navwrap.appendChild(group);
  });

  try{
    const y = Number(sessionStorage.getItem('focc-nav-scroll') || 0);
    if (y > 0){
      const apply = () => { try{ navwrap.scrollTop = y; }catch(e){} };
      requestAnimationFrame(() => { apply(); requestAnimationFrame(apply); });
    }
  }catch(e){}
}

function setActiveNav(routeKey){
  document.querySelectorAll('.navitem').forEach(el => {
    el.classList.toggle('active', el.dataset.route === routeKey);
  });
}

function openNavToActive(){
  const navwrap = document.getElementById('navwrap');
  if (!navwrap) return;
  const active = navwrap.querySelector('.navitem.active');
  navwrap.querySelectorAll('.navgroup').forEach(g => {
    g.classList.toggle('open', !!active && g.contains(active));
  });
  navwrap.querySelectorAll('.navsubgroup').forEach(s => {
    s.classList.toggle('open', !!active && s.contains(active));
  });
}

/* ============================================================
   ROUTER
============================================================= */
async function goTo(routeKey, opts){
  const silent = !!(opts && opts.silent);
  const savedScroll = silent ? foccCaptureScroll() : null;

  if (!userCanAccess(routeKey)){
    alert('Access Denied');
    return;
  }
  currentRoute = routeKey;
  if (routeKey !== 'primeMover') pmForgetOpen();
  const route = ROUTES[routeKey];
  document.getElementById('pagetitle').textContent = route.title;
  document.getElementById('crumb').textContent = route.crumb;
  setActiveNav(routeKey);
  if (!silent) openNavToActive();
  try{ localStorage.setItem(FOCC_ROUTE_KEY, routeKey); }catch(e){}
  try{ history.replaceState(null, '', '#/' + routeKey); }
  catch(e){}
  const content = document.getElementById('content');
  if (!silent) content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted);font-family:var(--font-mono);font-size:12.5px;">Loading&hellip;</div>`;
  try {
    const node = await route.render();
    content.innerHTML = '';
    content.appendChild(node);
  } catch (err){
    console.error('Failed to render page:', routeKey, err);
    content.innerHTML = `
      <div style="padding:32px;text-align:center;">
        <div style="font-size:32px;margin-bottom:10px;">&#9888;</div>
        <div style="font-family:var(--font-display);font-weight:700;font-size:16px;color:var(--navy-900);margin-bottom:6px;">This page couldn't load</div>
        <div style="color:var(--muted);font-size:13px;max-width:420px;margin:0 auto 16px;">Something in the data looks off (often an unrecognised date value from an import). Try again, or check recently imported rows.</div>
        <button class="btn primary" id="retryLoadBtn">Retry</button>
      </div>
    `;
    const retryBtn = document.getElementById('retryLoadBtn');
    if (retryBtn) retryBtn.addEventListener('click', () => goTo(routeKey));
  }
  if (FOCC_ADMIN_LIVE_ROUTES.has(routeKey)) foccAdminLiveStart(routeKey);
  else foccAdminLiveStop();
  bugBadgeRefresh();
  if (window.innerWidth <= 900){
    document.getElementById('sidebar').classList.remove('show');
  }
  if (silent) foccRestoreScroll(savedScroll);
  else window.scrollTo(0,0);
}

/* ============================================================
   CLOCK
============================================================= */
function tickClock(){
  const el = document.getElementById('liveclock');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {weekday:'short', day:'2-digit', month:'short', year:'numeric'});
  const timeStr = now.toLocaleTimeString('en-GB');
  el.innerHTML = `${dateStr}<br><b>${timeStr}</b>`;
}

/* ============================================================
   MOBILE MENU TOGGLE
============================================================= */
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('show');
});

/* ============================================================
   DESKTOP AUTO-HIDE SIDEBAR
============================================================= */
(function(){
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  const zone = document.createElement('div');
  zone.id = 'sbHoverZone';
  document.body.appendChild(zone);
  const mq = window.matchMedia('(min-width:901px)');
  let hideTimer = null;
  function openSidebar(){
    clearTimeout(hideTimer);
    document.body.classList.remove('sb-hidden');
  }
  function scheduleHide(){
    if (!mq.matches) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function(){ document.body.classList.add('sb-hidden'); }, 160);
  }
  function applyMode(){
    clearTimeout(hideTimer);
    if (mq.matches) document.body.classList.add('sb-hidden');
    else document.body.classList.remove('sb-hidden');
  }
  if (mq.addEventListener) mq.addEventListener('change', applyMode);
  else if (mq.addListener) mq.addListener(applyMode);
  sb.addEventListener('mouseenter', openSidebar);
  sb.addEventListener('mouseleave', scheduleHide);
  zone.addEventListener('mouseenter', openSidebar);
  applyMode();
})();

/* ============================================================
   THEME TOGGLE (light / dark)
============================================================= */
(function(){
  const STORE_KEY = 'focc.theme';
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');

  function isPublicScreen(){
    const lp = document.getElementById('foccLandingPage');
    const lg = document.getElementById('foccLoginScreen');
    if (lg && lg.style.display !== 'none') return true;
    if (lp && lp.classList.contains('show')) return true;
    return false;
  }

  function applyTheme(dark){
    const active = dark && !isPublicScreen();
    root.classList.toggle('theme-dark', active);
    if (btn){
      btn.title = active ? 'Light mode' : 'Dark mode';
      btn.setAttribute('aria-label', btn.title);
    }
    return active;
  }

  let saved = 'light';
  try{ saved = localStorage.getItem(STORE_KEY) || 'light'; }catch(e){}

  applyTheme(false);

  if (btn){
    btn.addEventListener('click', () => {
      const dark = !root.classList.contains('theme-dark');
      applyTheme(dark);
      try{ localStorage.setItem(STORE_KEY, dark ? 'dark' : 'light'); }catch(e){}
    });
  }

  window.__foccApplySavedTheme = function(){ applyTheme(saved === 'dark'); };
  window.__foccForceLight = function(){ applyTheme(false); };
})();

/* ============================================================
   INIT FOCC
============================================================= */
async function initFOCC(){
  buildNav();
  tickClock();
  setInterval(tickClock, 1000);
  const sidebarYearEl = document.getElementById('sidebarYear');
  if (sidebarYearEl) sidebarYearEl.innerHTML = `${new Date().getFullYear()} &middot; Live Console`;

  let startRoute = 'overview';
  try{
    const hashRoute = foccRouteFromHash();
    const savedRoute = localStorage.getItem(FOCC_ROUTE_KEY);
    if (hashRoute && ROUTES[hashRoute] && userCanAccess(hashRoute)){
      startRoute = hashRoute;
    } else if (savedRoute && ROUTES[savedRoute] && userCanAccess(savedRoute)){
      startRoute = savedRoute;
    } else {
      startRoute = getFirstAllowedRoute() || 'overview';
    }
  }catch(e){}

  await goTo(startRoute);

  setTimeout(() => { checkAutoBackup(); }, 30000);
}

/* ============================================================
   KICKOFF — foccAutoLogin() dipanggil di 04-auth.js
   Fail ini hanya mendefinisikan fungsi; auth file yang start app.
============================================================= */
/* ============================================================
   FOCC AUTH STATE LISTENER
   Reaktif bila Supabase SDK ready / token berubah.

   PATCH v2: guard guna `event|session`.
   PATCH v3: retry sampai SDK ready.
   PATCH v4: grace period 3s untuk SIGNED_OUT.
   PATCH v5 (2026-10): kesan "SDK loaded tapi .auth tak ready" —
     berlaku bila Tracking Prevention block storage (Edge/Safari)
     atau CDN partial load. Retry sampai .auth.onAuthStateChange
     betul-betul wujud (max 30 saat), dan fallback ke auto-login
     dari localStorage kalau SDK tetap fail.
============================================================= */
(function(){
  let lastKey = '';
  let listenerRegistered = false;

  const BOOT_TIME = Date.now();
  const SIGNED_OUT_GRACE_MS = 3000;

  function isSupabaseAuthReady(){
    if (!window.FOCC_SUPABASE) return false;
    if (typeof FOCC_SUPABASE.auth !== 'object' || !FOCC_SUPABASE.auth) return false;
    if (typeof FOCC_SUPABASE.auth.onAuthStateChange !== 'function') return false;
    return true;
  }

  function tryRecreateClient(){
    // Cuba createClient semula kalau FOCC_SUPABASE wujud tapi .auth tak ready
    try{
      if (window.supabase && typeof window.supabase.createClient === 'function'){
        // Guna URL & KEY dari 02-storage.js
        const url = (typeof FOCC_SUPABASE_URL !== 'undefined') ? FOCC_SUPABASE_URL : null;
        const key = (typeof FOCC_SUPABASE_KEY !== 'undefined') ? FOCC_SUPABASE_KEY : null;
        if (url && key){
          const fresh = window.supabase.createClient(url, key);
          if (fresh && fresh.auth && typeof fresh.auth.onAuthStateChange === 'function'){
            FOCC_SUPABASE = fresh;
            console.log('[FOCC] Supabase client recreated successfully');
            return true;
          }
        }
      }
    }catch(e){
      console.warn('[FOCC] recreate client failed:', e);
    }
    return false;
  }

  function attachAuthListener(){
    if (listenerRegistered) return true;

    // Kalau FOCC_SUPABASE wujud tapi .auth tak ready → cuba recreate
    if (window.FOCC_SUPABASE && !isSupabaseAuthReady()){
      if (!tryRecreateClient()){
        return false;
      }
    }

    if (!isSupabaseAuthReady()){
      return false;
    }

    try{
      FOCC_SUPABASE.auth.onAuthStateChange((event, session) => {
        const key = event + '|' + (session ? 'yes' : 'no');
        console.log('[FOCC] auth event:', event, '| session:', session ? 'YES' : 'NO', '| key:', key, '| booted:', foccBooted);

        if (key === lastKey){ return; }
        lastKey = key;

        if (event === 'SIGNED_OUT'){
          const elapsed = Date.now() - BOOT_TIME;
          const hasLocal = !!localStorage.getItem(FOCC_SESSION_KEY);
          if (elapsed < SIGNED_OUT_GRACE_MS && hasLocal){
            console.warn('[FOCC] SIGNED_OUT dalam grace period — abaikan (SDK init race). Elapsed:', elapsed, 'ms');
            return;
          }

          try{ localStorage.removeItem(FOCC_SESSION_KEY); }catch(e){}
          if (foccBooted){
            foccBooted = false;
            try{ clearTenantRuntimeState(); }catch(e){}
            try{ bugBadgeStop(); }catch(e){}
          }
          foccShowPublicScreen();
          return;
        }

        if (session && !foccBooted){
          const hasLocal = !!localStorage.getItem(FOCC_SESSION_KEY);
          if (hasLocal){
            console.log('[FOCC] auth ready (' + event + ') — trigger auto-login');
            foccAutoLogin();
          }
        }
      });

      listenerRegistered = true;
      console.log('[FOCC] auth listener attached');
      return true;
    }catch(e){
      console.error('[FOCC] attachAuthListener throw:', e);
      return false;
    }
  }

  // Cuba sekarang
  if (attachAuthListener()) return;

  // Belum ready — poll setiap 200ms sampai 30 saat
  console.warn('[FOCC] auth listener: SDK not ready — polling...');
  let tries = 0;
  const MAX_TRIES = 150;  // 150 × 200ms = 30 saat
  const timer = setInterval(() => {
    tries++;
    if (attachAuthListener() || tries >= MAX_TRIES){
      clearInterval(timer);
      if (tries >= MAX_TRIES && !listenerRegistered){
        console.error('[FOCC] auth listener: SDK gagal dimuat selepas 30 saat — fallback ke auto-login');

        // ⬇️ FALLBACK: kalau SDK betul-betul tak load, tapi ada session
        //    dalam localStorage, cuba auto-login terus. User tak sepatutnya
        //    terkeluar ke login hanya sebab SDK tak load (Edge Tracking
        //    Prevention, network block, CDN down).
        try{
          const raw = localStorage.getItem(FOCC_SESSION_KEY);
          if (raw){
            console.log('[FOCC] fallback: FOCC_SESSION_KEY present — panggil foccAutoLogin tanpa SDK');
            foccAutoLogin();
          } else {
            console.log('[FOCC] fallback: tiada session — tunjuk login screen');
            foccShowPublicScreen();
          }
        }catch(e){
          console.error('[FOCC] fallback throw:', e);
        }
      }
    }
  }, 200);

  // Kickoff auto-login juga
  if (window.FOCC_SUPABASE){
    setTimeout(() => {
      if (!foccBooted){
        console.log('[FOCC] kickoff auto-login (via boot)');
        foccAutoLogin();
      }
    }, 50);
  } else {
    const kickTimer = setInterval(() => {
      if (window.FOCC_SUPABASE){
        clearInterval(kickTimer);
        setTimeout(() => {
          if (!foccBooted){
            console.log('[FOCC] kickoff auto-login (after SDK ready)');
            foccAutoLogin();
          }
        }, 50);
      }
    }, 100);
  }
})();