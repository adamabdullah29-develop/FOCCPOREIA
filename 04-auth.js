/* =========================================================================
   FOCC — 04-auth.js
   Login Supabase, session 24-jam, auto-login, logout,
   landing page controls, legal pages toggle.

   PATCH v2 (2026-02):
   - Guard foccAutoLoginRunning → elak double-init
   - Bezakan session-invalid (logout) vs network hiccup (fallback)
   - Buang foccShowLogin() berulang dalam logoutFOCC()

   PATCH v3 (2026-10):
   - Regex isSessionInvalid lebih ketat.
   - MAX_TRIES naik 5 → 8, delay 500ms → 400ms.

   PATCH v4 (2026-10):
   - SKIP syncProviderFromSession() bila SDK tak ready.
     Punca: syncProviderFromSession guna FOCC_SUPABASE → hang bila
     SDK tak ready (Tracking Prevention block). User tunggu 30s.
     Session data dalam localStorage SUDAH CUKUP untuk showApp().
   ========================================================================= */

/* ============================================================
   AUTO-LOGIN GUARD — elak dua panggilan serentak
============================================================= */
let foccAutoLoginRunning = false;

/* ============================================================
   LOGIN SCREEN HELPERS
============================================================= */
function foccShowLogin(message, isError){
  if (window.__foccForceLight) window.__foccForceLight();
  document.getElementById('app').style.display = 'none';
  document.getElementById('foccLoginScreen').style.display = 'flex';
  const msgEl = document.getElementById('foccLoginMsg');
  if (msgEl){
    msgEl.textContent = message || '';
    msgEl.className = 'focc-login-msg' + (isError ? ' err' : (message ? ' ok' : ''));
  }
}

function foccSetLoginBtnLoading(isLoading){
  const label = document.getElementById('foccLoginBtnLabel');
  const icon = document.getElementById('foccLoginBtnIcon');
  if (!label || !icon) return;
  if (isLoading){
    label.textContent = 'Signing in\u2026';
    icon.outerHTML = '<span class="focc-btn-spinner" id="foccLoginBtnIcon"></span>';
  } else {
    label.textContent = 'Sign In';
    const spinner = document.getElementById('foccLoginBtnIcon');
    if (spinner) spinner.outerHTML = '<svg id="foccLoginBtnIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
  }
}

function foccShowApp(session){
  document.getElementById('foccLoginScreen').style.display = 'none';
  document.getElementById('app').style.display = '';
  if (window.__foccApplySavedTheme) window.__foccApplySavedTheme();
  const badge = document.getElementById('foccUserBadge');

  if (badge){
    badge.innerHTML = `
      Company: ${session.company || '-'}<br>
      Company ID: ${session.companyId || '-'}<br>
      Email: ${session.email || '-'}<br>
      Expiry: ${session.expiryDate || '-'}
    `;
  }

  if (!foccBooted){
    foccBooted = true;
    // ✅ FIX: catch error supaya initFOCC tak senyap gagal
    initFOCC().catch(err => {
      console.error('initFOCC failed:', err);
      // Jangan redirect ke login — tunjuk error saja
      const content = document.getElementById('content');
      if (content){
        content.innerHTML = `
          <div style="padding:40px;text-align:center;">
            <div style="font-size:32px;margin-bottom:10px;">&#9888;</div>
            <div style="font-family:var(--font-display);font-weight:700;font-size:16px;color:var(--navy-900);margin-bottom:6px;">Init failed</div>
            <div style="color:var(--muted);font-size:13px;max-width:420px;margin:0 auto 16px;">${escapeHtml(String(err && err.message || err))}</div>
            <button class="btn primary" onclick="location.reload()">Reload</button>
          </div>
        `;
      }
    });
    bugBadgeStart();
  }

  if (window.foccMascot && window.foccMascot.startLogin) window.foccMascot.startLogin(session);

  console.log(
    'User Version:',
    session.version,
    'Current Version:',
    FOCC_VERSION
  );

  if (FOCC_VERSION && session.version !== FOCC_VERSION){
    getSystemUpdates()
      .then(updates => {
        console.log('SYSTEM UPDATES:', updates);

        const latestUpdates = updates.filter(
          x => x.version === FOCC_VERSION
        );

        const message = latestUpdates
          .map(x => `✅ ${x.title}\n${x.description}`)
          .join('\n\n');

        alert(
          `✨ WHAT'S NEW\n\nVersion ${FOCC_VERSION}\n\n${message}`
        );

        updateUserVersion(session.email)
          .then(result => {
            console.log('VERSION UPDATED:', result);
          });
      });
  }
}

/* ============================================================
   LOGIN — email + password
============================================================= */
async function loginFOCC(){
  const emailInput = document.getElementById('foccEmailInput');
  const passInput  = document.getElementById('foccPasswordInput');
  const btn = document.getElementById('foccLoginBtn');

  const email    = (emailInput.value || '').trim();
  const password = (passInput.value || '');

  if (!email){
    foccShowLogin('Please enter your email.', true);
    return;
  }
  if (!password){
    foccShowLogin('Please enter your password.', true);
    return;
  }
  if (!FOCC_SUPABASE){
    foccShowLogin('Login service unavailable. Please try again.', true);
    return;
  }

  btn.disabled = true;
  foccSetLoginBtnLoading(true);
  foccShowLogin('Checking access\u2026', false);

  try{
    /* 1) Sahkan email + password dengan Supabase Auth */
    const authRes = await FOCC_SUPABASE.auth.signInWithPassword({ email, password });

    if (authRes.error || !authRes.data || !authRes.data.user){
      localStorage.removeItem(FOCC_SESSION_KEY);
      foccShowLogin('Incorrect email or password.', true);
      return;
    }

    /* 2) Baca profile (company, role, routes, expiry) */
    const profRes = await FOCC_SUPABASE
      .from('profiles')
      .select('*')
      .eq('id', authRes.data.user.id)
      .single();

    const profile = profRes.data;

    if (profRes.error || !profile){
      await FOCC_SUPABASE.auth.signOut();
      localStorage.removeItem(FOCC_SESSION_KEY);
      foccShowLogin('Profile not found. Contact your administrator.', true);
      return;
    }

    /* 3) Status akaun */
    if (String(profile.status || '') !== 'Active'){
      await FOCC_SUPABASE.auth.signOut();
      localStorage.removeItem(FOCC_SESSION_KEY);
      foccShowLogin('Account Suspended', true);
      return;
    }

    /* 4) Status + sheet/script URL company (sumber: Supabase companies) */
    const creds = await fetchCompanySheetCreds(profile.company_id);

    if (creds.status !== 'Active'){
      await FOCC_SUPABASE.auth.signOut();
      localStorage.removeItem(FOCC_SESSION_KEY);
      foccShowLogin('Company Suspended', true);
      return;
    }

    /* 5) Tarikh luput */
    if (profile.expiry_date){
      const today = new Date(); today.setHours(0,0,0,0);
      const expiry = new Date(profile.expiry_date); expiry.setHours(0,0,0,0);
      if (!isNaN(expiry.getTime()) && today > expiry){
        await FOCC_SUPABASE.auth.signOut();
        localStorage.removeItem(FOCC_SESSION_KEY);
        foccShowLogin('Subscription Expired', true);
        return;
      }
    }

    /* 6) Version semasa (Supabase) — kalau gagal, JANGAN block login */
    try{
      const versionInfo = await getCurrentVersion();
      FOCC_VERSION = (versionInfo && versionInfo.currentVersion) || profile.version || '';
    }catch(e){
      FOCC_VERSION = profile.version || '';
    }

    /* 7) Bina session — BENTUK SAMA macam dulu */
    const routes =
      String(profile.allowed_routes || '').trim() === 'ALL'
        ? ['ALL']
        : String(profile.allowed_routes || '')
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);

    const session = {
      email:          profile.email || email,
      company:        profile.company || '',
      companyId:      profile.company_id || '',
      googleSheetId:  creds.googleSheetId || '',
      appsScriptUrl:  creds.appsScriptUrl || '',
      role:           profile.role || '',
      routes:         routes,
      expiryDate:     profile.expiry_date || '',
      version:        profile.version || '',
      loginTimestamp: Date.now()
    };

    localStorage.setItem(FOCC_SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(FOCC_ROUTE_KEY);
    await syncProviderFromSession(session);
    foccShowApp(session);

  } catch(err){
    console.error('loginFOCC error:', err);
    foccShowLogin('Unable to verify access. Please try again.', true);
  } finally {
    btn.disabled = false;
    foccSetLoginBtnLoading(false);
  }
}

/* ============================================================
   LOGOUT
============================================================= */
async function logoutFOCC(){
  foccBooted = false;
  try{ history.replaceState(null, '', '#/login'); }catch(e){}
  try{
    const emailEl = document.getElementById('foccEmailInput');
    if (emailEl) emailEl.value = '';
    const passEl = document.getElementById('foccPasswordInput');
    if (passEl) passEl.value = '';
  }catch(e){}

  try{ bugBadgeStop(); }catch(e){ console.error('logout: bugBadgeStop failed', e); }
  try{ clearTenantRuntimeState(); }catch(e){ console.error('logout: clearTenantRuntimeState failed', e); }

  try{ localStorage.removeItem(FOCC_SESSION_KEY); }catch(e){}
  try{ localStorage.removeItem('focc-supabase-auth-token'); }catch(e){}
  try{ if (FOCC_SUPABASE) await FOCC_SUPABASE.auth.signOut(); }catch(e){}

  // Satu panggilan sahaja — tunjuk login screen di akhir
  try{ foccShowLogin('', false); }catch(e){}
}

/* ============================================================
   LANDING PAGE CONTROLS
============================================================= */
function foccGoToLogin(){
  document.getElementById('foccLandingPage').classList.remove('show');
  document.getElementById('foccLoginScreen').style.display = 'flex';
  try{ history.replaceState(null, '', '#/login'); }catch(e){}
}

function foccShowLanding(){
  if (window.__foccForceLight) window.__foccForceLight();
  document.getElementById('foccLandingPage').classList.add('show');
  document.getElementById('foccLoginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  try{ if (location.hash) history.replaceState(null, '', location.pathname + location.search); }catch(e){}
}

function foccShowPublicScreen(){
  pmForgetOpen();
  const h = foccRouteFromHash();
  if ((h && ROUTES[h]) || h === 'login'){ foccShowLogin('', false); return; }
  foccShowLanding();
}

/* ============================================================
   AUTO LOGIN — session 24 jam

   PATCH v3: guard + retry 8x @ 400ms + regex ketat + log.
   PATCH v4: skip syncProviderFromSession bila SDK tak ready.
============================================================= */
async function foccAutoLogin(){
  // ── Guard: elak dua panggilan serentak ──
  if (foccAutoLoginRunning){
    console.log('[FOCC] autoLogin: already running — skip');
    return;
  }
  foccAutoLoginRunning = true;

  try {
    console.log('[FOCC] autoLogin: start');

    const raw = localStorage.getItem(FOCC_SESSION_KEY);
    console.log('[FOCC] autoLogin: FOCC_SESSION_KEY present:', !!raw);
    console.log('[FOCC] autoLogin: FOCC_SUPABASE ready:', !!FOCC_SUPABASE);

    if (!raw){
      console.log('[FOCC] autoLogin: no session → login screen');
      foccShowPublicScreen();
      return;
    }

    let session;
    try{ session = JSON.parse(raw); } catch(e){ session = null; }
    if (!session || !session.email || !session.loginTimestamp){
      console.log('[FOCC] autoLogin: invalid session → clear + login');
      localStorage.removeItem(FOCC_SESSION_KEY);
      foccShowPublicScreen();
      return;
    }

    const ageMs = Date.now() - session.loginTimestamp;
    const ageHours = (ageMs / 3600000).toFixed(1);
    console.log('[FOCC] autoLogin: session age', ageHours, 'hours');

    if (!(ageMs >= 0) || ageMs > FOCC_SESSION_MAX_AGE_MS){
      console.log('[FOCC] autoLogin: session expired → login');
      localStorage.removeItem(FOCC_SESSION_KEY);
      try{ if (FOCC_SUPABASE) await FOCC_SUPABASE.auth.signOut(); }catch(e){}
      foccShowPublicScreen();
      return;
    }

    /* ── PATCH v4: Kesan SDK tak ready ──
       Kalau FOCC_SUPABASE tak wujud atau .auth tak ready, JANGAN cuba
       getSession atau syncProviderFromSession (dua-dua akan hang).
       Terus showApp() dengan session data dari localStorage — itu sahaja
       yang user perlukan untuk mula guna sistem. */
    const sdkReady = !!(
      window.FOCC_SUPABASE &&
      FOCC_SUPABASE.auth &&
      typeof FOCC_SUPABASE.auth.getSession === 'function'
    );

    if (!sdkReady){
      console.warn('[FOCC] autoLogin: SDK not ready — showApp terus (skip syncProvider)');
      foccShowApp(session);
      return;
    }

    /* Retry getSession sampai 8 kali dengan delay 400ms
       (total 3.2s) — Supabase SDK kadang belum ready bila refresh */
    let authUser = null;
    let lastErr = null;
    let sessionError = null;
    const MAX_TRIES = 8;

    for (let attempt = 0; attempt < MAX_TRIES; attempt++){
      try{
        if (FOCC_SUPABASE){
          const sessRes = await FOCC_SUPABASE.auth.getSession();
          if (sessRes && sessRes.error) sessionError = sessRes.error;
          authUser = (sessRes && sessRes.data && sessRes.data.session)
            ? sessRes.data.session.user
            : null;
          if (authUser){
            console.log('[FOCC] autoLogin: auth OK (attempt', attempt + 1, ')');
            break;
          }
        }
      }catch(e){
        lastErr = e;
        console.warn('[FOCC] getSession attempt', attempt + 1, 'failed:', e);
      }
      // Delay sebelum retry
      if (attempt < MAX_TRIES - 1){
        await new Promise(r => setTimeout(r, 400));
      }
    }

    /* Kalau tiada authUser selepas retry:
       - Regex KETAT: hanya match refresh/token/jwt/session mati.
       - Kalau SDK beri ERROR JELAS → logout betul
       - Kalau cuma network hiccup → fallback (showApp)
    */
    if (!authUser){
      const errMsg = String((sessionError && sessionError.message) || (lastErr && lastErr.message) || '');

      const isSessionInvalid =
        !!sessionError &&
        /refresh[_ ]token|token[_ ]expired|token[_ ]revoked|jwt[_ ]expired|session[_ ]not[_ ]found|session[_ ]missing/i.test(errMsg);

      console.log('[FOCC] autoLogin: no auth user. errMsg:', errMsg);
      console.log('[FOCC] autoLogin: isSessionInvalid:', isSessionInvalid);

      if (isSessionInvalid){
        console.warn('[FOCC] autoLogin: session invalid — logout:', errMsg);
        localStorage.removeItem(FOCC_SESSION_KEY);
        try{ await FOCC_SUPABASE.auth.signOut(); }catch(e){}
        foccShowPublicScreen();
        return;
      }

      console.warn('[FOCC] autoLogin: no auth user after', MAX_TRIES, 'tries — fallback (showApp terus)');
      console.warn('[FOCC] lastErr:', lastErr, '| sessionError:', sessionError);
      foccShowApp(session);
      return;
    }

    const emailInput = document.getElementById('foccEmailInput');
    if (emailInput) emailInput.value = session.email;

    try {
      await syncProviderFromSession(session);
    } catch(e){
      console.warn('syncProviderFromSession failed (non-fatal):', e);
    }
    foccShowApp(session);

    /* Refresh profile dalam background — JANGAN redirect login kalau gagal. */
    try{
      const profRes = await FOCC_SUPABASE
        .from('profiles').select('*').eq('id', authUser.id).single();

      const profile = profRes.data;

      if (!profile){
        console.warn('Profile refresh returned null — keeping cached session');
        return;
      }

      let allowed = String(profile.status || '') === 'Active';

      let creds = { googleSheetId: '', appsScriptUrl: '', status: 'Active' };
      if (allowed && profile.company_id){
        try {
          creds = await fetchCompanySheetCreds(profile.company_id);
          if (creds.status !== 'Active') allowed = false;
        } catch(e){
          console.warn('fetchCompanySheetCreds failed — keeping cached session:', e);
        }
      }

      if (allowed && profile.expiry_date){
        const today = new Date(); today.setHours(0,0,0,0);
        const expiry = new Date(profile.expiry_date); expiry.setHours(0,0,0,0);
        if (!isNaN(expiry.getTime()) && today > expiry) allowed = false;
      }

      if (allowed){
        const routes =
          String(profile.allowed_routes || '').trim() === 'ALL'
            ? ['ALL']
            : String(profile.allowed_routes || '')
                .split(',').map(v => v.trim()).filter(Boolean);

        const refreshed = {
          email:          profile.email || session.email,
          company:        profile.company || '',
          companyId:      profile.company_id || '',
          googleSheetId:  creds.googleSheetId || '',
          appsScriptUrl:  creds.appsScriptUrl || '',
          role:           profile.role || '',
          routes:         routes,
          expiryDate:     profile.expiry_date || '',
          version:        profile.version || '',
          loginTimestamp: session.loginTimestamp
        };

        localStorage.setItem(FOCC_SESSION_KEY, JSON.stringify(refreshed));
        await syncProviderFromSession(refreshed);

        const badge = document.getElementById('foccUserBadge');
        if (badge){
          badge.innerHTML = `
            Company: ${refreshed.company || '-'}<br>
            Company ID: ${refreshed.companyId || '-'}<br>
            Email: ${refreshed.email || '-'}<br>
            Expiry: ${refreshed.expiryDate || '-'}
          `;
        }
      } else {
        console.warn('Session invalidated by profile check — logging out');
        localStorage.removeItem(FOCC_SESSION_KEY);
        foccBooted = false;
        try{ await FOCC_SUPABASE.auth.signOut(); }catch(e){}
        foccShowPublicScreen();
      }
    } catch(err){
      console.warn('Profile refresh network error — keeping cached session:', err);
    }
  } finally {
    foccAutoLoginRunning = false;
  }
}

/* ============================================================
   EVENT LISTENERS — Enter key dalam login form
============================================================= */
const foccEmailEl = document.getElementById('foccEmailInput');
if (foccEmailEl) foccEmailEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginFOCC();
});
const foccPassEl = document.getElementById('foccPasswordInput');
if (foccPassEl) foccPassEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginFOCC();
});

const foccAsideYearEl = document.getElementById('foccAsideYear');
if (foccAsideYearEl) foccAsideYearEl.innerHTML = `&copy; ${new Date().getFullYear()} Fleet Operations`;

/* ============================================================
   LANDING PAGE — Smooth scroll, hamburger, scroll effect
============================================================= */
document.querySelectorAll('.focc-lp-nav-links a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    e.preventDefault();
    const target=document.querySelector(a.getAttribute('href'));
    if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
    document.getElementById('foccLpNavLinks').classList.remove('open');
  });
});

const lpHamburger=document.getElementById('foccLpHamburger');
if(lpHamburger) lpHamburger.addEventListener('click',()=>{
  document.getElementById('foccLpNavLinks').classList.toggle('open');
});

const lpNav=document.getElementById('foccLpNav');
if(lpNav) window.addEventListener('scroll',()=>{
  lpNav.classList.toggle('scrolled',window.scrollY>40);
},{passive:true});

/* ============================================================
   LEGAL PAGES — overlay + footer links + language toggle
============================================================= */
(function(){
  const page = document.getElementById('foccLegalPage');
  if (!page) return;
  const closeBtn = document.getElementById('foccLegalClose');
  function showDoc(id){
    const docs = page.querySelectorAll('.focc-legal-doc');
    let found = false;
    docs.forEach(function(d){
      const on = d.getAttribute('data-doc') === id;
      d.hidden = !on;
      if (on) found = true;
    });
    if (!found) return;
    page.classList.add('show');
    page.setAttribute('aria-hidden','false');
    page.scrollTop = 0;
    try{ history.replaceState(null, '', '#legal/' + id); }catch(e){}
  }
  function closeLegal(){
    page.classList.remove('show');
    page.setAttribute('aria-hidden','true');
    try{ history.replaceState(null, '', '#/'); }catch(e){}
  }
  document.addEventListener('click', function(ev){
    const t = ev.target.closest('.focc-legal-link');
    if (!t) return;
    ev.preventDefault();
    showDoc(t.getAttribute('data-doc'));
  });
  if (closeBtn) closeBtn.addEventListener('click', closeLegal);
  document.addEventListener('keydown', function(ev){
    if (ev.key === 'Escape' && page.classList.contains('show')) closeLegal();
  });
  if (location.hash.indexOf('#legal/') === 0){
    showDoc(location.hash.replace('#legal/',''));
  }
  page.addEventListener('click', function(ev){
    const b = ev.target.closest('.focc-legal-lang button');
    if (!b) return;
    const doc = b.closest('.focc-legal-doc');
    const lang = b.getAttribute('data-lang');
    doc.querySelectorAll('.focc-legal-lang button').forEach(function(x){
      x.classList.toggle('on', x.getAttribute('data-lang') === lang);
    });
    doc.querySelectorAll('.focc-legal-body[data-body]').forEach(function(body){
      body.hidden = body.getAttribute('data-body') !== lang;
    });
  });
})();

/* ============================================================
   BUG REPORT MODAL + BADGE
============================================================= */

function bugNewRequestId(){
  const rnd = (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
  return 'bug-' + rnd;
}

function bugReportSession(){
  try{ return JSON.parse(localStorage.getItem(FOCC_SESSION_KEY) || 'null'); }catch(e){ return null; }
}

function bugReportPageList(){
  return Object.keys(ROUTES)
    .filter(k => userCanAccess(k))
    .map(k => ({ key: k, title: (ROUTES[k] && ROUTES[k].title) || k }));
}

function openBugReportModal(){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    const session = bugReportSession() || {};
    const pages = bugReportPageList();
    const currentTitle = (ROUTES[currentRoute] && ROUTES[currentRoute].title) || currentRoute;
    const requestId = bugNewRequestId();

    box.classList.remove('opkpi-modal');
    box.classList.remove('user-modal');
    box.classList.add('bugreport-modal');
    box.innerHTML = `
      <h4>Report a Problem</h4>
      <div class="notice notice-info" style="margin-bottom:14px;">Tell us what went wrong. Your report goes straight to the support team.</div>
      <div class="formgrid">
        <div class="formfield full">
          <label>What went wrong? *</label>
          <input type="text" id="bugTitle" maxlength="120" placeholder="Short summary, e.g. Filter resets after refresh">
        </div>
        <div class="formfield">
          <label>Page / Module *</label>
          <div class="fpick" data-fp="bugPage">
            <input type="text" id="bugPage" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select page..." value="">
            <span class="fpick-caret"></span>
            <div class="combo-panel fpick-panel" data-fp-panel="bugPage" style="max-height:232px;"></div>
          </div>
        </div>
        <div class="formfield">
          <label>Severity *</label>
          <div class="fpick" data-fp="bugSeverity">
            <input type="text" id="bugSeverity" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select..." value="Medium">
            <span class="fpick-caret"></span>
            <div class="combo-panel fpick-panel" data-fp-panel="bugSeverity"></div>
          </div>
        </div>
        <div class="formfield full">
          <label>What happened? *</label>
          <textarea id="bugDescription" rows="4" maxlength="3000" placeholder="Describe the problem and what you expected instead."></textarea>
        </div>
        <div class="formfield full">
          <label>Steps to reproduce (optional)</label>
          <textarea id="bugSteps" rows="3" maxlength="2000" placeholder="1. Go to...  2. Click...  3. See..."></textarea>
        </div>
      </div>
      <div class="bugcontext">
        Sent automatically: <strong>${escapeHtml(session.email || '')}</strong>${session.company ? ' &middot; ' + escapeHtml(session.company) : ''} &middot; ${escapeHtml(currentTitle)}
      </div>
      <div class="settings-note" id="bugFormNote" style="display:none;"></div>
      <div class="modalfoot">
        <button class="btn" id="bugCancel">Cancel</button>
        <button class="btn primary" id="bugSubmit">Send Report</button>
      </div>
    `;
    overlay.classList.add('show');
    wireBugPagePicker(box, pages, currentRoute);
    wireFixedPicker(box, {
      field:'[data-fp="bugSeverity"]', input:'#bugSeverity',
      panel:'[data-fp-panel="bugSeverity"]', values: BUG_SEVERITY_OPTIONS, current: 'Medium'
    });

    const noteEl = box.querySelector('#bugFormNote');
    const submitBtn = box.querySelector('#bugSubmit');
    function showNote(text, isError){
      noteEl.style.display = 'block';
      noteEl.style.color = isError ? 'var(--red)' : 'var(--green)';
      noteEl.textContent = text;
    }
    function close(result){
      overlay.classList.remove('show');
      box.classList.remove('bugreport-modal');
      resolve(result);
    }

    box.querySelector('#bugCancel').addEventListener('click', () => close(false));

    submitBtn.addEventListener('click', async () => {
      const title = box.querySelector('#bugTitle').value.trim();
      const description = box.querySelector('#bugDescription').value.trim();
      const steps = box.querySelector('#bugSteps').value.trim();
      const pageSel = box.querySelector('#bugPage');
      const pageKey = pageSel.dataset.key || pageSel.value;
      const pageTitle = pageSel.dataset.title || pageKey;
      const severity = box.querySelector('#bugSeverity').value;

      if (title.length < 3){ showNote('Please summarise the problem in the title (at least 3 characters).', true); return; }
      if (description.length < 5){ showNote('Please tell us what happened.', true); return; }

      noteEl.style.display = 'none';
      submitBtn.disabled = true;
      const label = submitBtn.textContent;
      submitBtn.textContent = 'Sending…';

      try{
        await adminInvoke('create_bug_report', {
          requestId: requestId,
          title: title,
          description: description,
          steps: steps,
          pageKey: pageKey,
          pageTitle: pageTitle,
          severity: severity,
          appVersion: FOCC_VERSION || '',
          userAgent: navigator.userAgent || '',
        });
        box.innerHTML = `
          <h4>Report Sent</h4>
          <div class="notice notice-success" style="margin-bottom:14px;">
            Thanks — <strong>${escapeHtml(title)}</strong> has been sent to the support team.
          </div>
          <div class="modalfoot"><button class="btn primary" id="bugDone">Close</button></div>
        `;
        bugBadgeRefresh();
        box.querySelector('#bugDone').addEventListener('click', () => close(true));
      }catch(err){
        showNote('Not submitted — ' + String((err && err.message) || err), true);
        submitBtn.disabled = false;
        submitBtn.textContent = label;
      }
    });
  });
}

function bugStatusBadge(status){
  const s = String(status || 'New');
  const cls = s === 'Fixed' ? 'good' : s === 'Rejected' ? 'bad' : s === 'On Repairing' ? 'warn' : s === 'Ready for Release' ? 'ready' : 'neutral';
  return `<span class="badge ${cls}">${escapeHtml(s)}</span>`;
}

function bugWhen(iso){
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).slice(0, 16).replace('T', ' ');
  return d.toLocaleString(undefined, { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}

function renderBugReportsTable(list){
  if (!list.length) return `<div class="settings-note" style="margin-top:0;">No bug reports yet.</div>`;
  return `<div class="tablewrap admin-rows-5">
    <table class="kpi-bucket-table" style="width:100%;">
      <thead><tr>
        <th>Ref</th><th>Reported</th><th>By</th><th>Page</th>
        <th>Severity</th><th>Title</th><th>Status</th>
        <th style="width:74px;text-align:right;">Actions</th>
      </tr></thead>
      <tbody>
        ${list.map(b => `
          <tr>
            <td class="date-cell">#${b.bugId}</td>
            <td style="white-space:nowrap;">${escapeHtml(bugWhen(b.createdAt))}</td>
            <td>${escapeHtml(b.reporterEmail || '-')}<br><span style="font-size:11px;color:var(--muted);">${escapeHtml(b.reporterCompany || '')}</span></td>
            <td>${escapeHtml(b.pageTitle || b.pageKey || '-')}</td>
            <td>${escapeHtml(b.severity || '-')}</td>
            <td class="reason-cell" style="white-space:normal;max-width:200px;"><span class="clamp-1line">${escapeHtml(b.title || '-')}</span></td>
            <td>${bugStatusBadge(b.status)}</td>
            <td style="text-align:right;">
              <button class="btn" data-bug-id="${b.bugId}" style="padding:6px 10px;font-size:12px;">View</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;
}

function openBugDetailModal(bug){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    let changed = false;
    let prepareFix = null;

    const statusList = ['New', 'On Repairing', 'Ready for Release', 'Rejected'].indexOf(bug.status) >= 0
      ? ['New', 'On Repairing', 'Ready for Release', 'Rejected']
      : ['New', 'On Repairing', 'Ready for Release', 'Rejected', bug.status];

    box.classList.remove('user-modal');
    box.classList.remove('opkpi-modal');
    box.classList.add('bugreport-modal');
    box.innerHTML = `
      <h4>Bug Report #${bug.bugId}</h4>
      <div class="bugmeta">
        <div><span>Status</span><strong>${bugStatusBadge(bug.status)}</strong></div>
        <div><span>Severity</span><strong>${escapeHtml(bug.severity)}</strong></div>
        <div><span>Reported</span><strong>${escapeHtml(bugWhen(bug.createdAt))}</strong></div>
        <div><span>Reported by</span><strong>${escapeHtml(bug.reporterEmail)}</strong></div>
        <div><span>Company</span><strong>${escapeHtml(bug.reporterCompany || '-')}</strong></div>
        <div><span>Page</span><strong>${escapeHtml(bug.pageTitle || bug.pageKey || '-')}</strong></div>
        <div><span>Last updated</span><strong>${escapeHtml(bugWhen(bug.updatedAt))}${bug.updatedBy ? ' by ' + escapeHtml(bug.updatedBy) : ''}</strong></div>
        <div><span>Fixed in</span><strong>${escapeHtml(bug.fixedVersion || '-')}</strong></div>
      </div>
      <div class="bugblock"><label>What went wrong</label><p>${escapeHtml(bug.title)}</p></div>
      <div class="bugblock"><label>What happened</label><p>${escapeHtml(bug.description)}</p></div>
      ${bug.steps ? `<div class="bugblock"><label>Steps to reproduce</label><p>${escapeHtml(bug.steps)}</p></div>` : ''}
      <div class="bugblock"><label>Technical</label><p>App version ${escapeHtml(bug.appVersion || '-')}<br>${escapeHtml(bug.userAgent || '-')}</p></div>

      <div class="settings-grid" style="margin-top:14px;">
        <div class="formfield">
          <label>Set status</label>
          <div class="fpick" data-fp="bugStatusSelect">
            <input type="text" id="bugStatusSelect" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select..." value="${escapeHtml(bug.status || '')}">
            <span class="fpick-caret"></span>
            <div class="combo-panel fpick-panel" data-fp-panel="bugStatusSelect" style="top:auto;bottom:calc(100% + 6px);"></div>
          </div>
        </div>
        <div class="formfield">
          <label>Note (optional)</label>
          <input type="text" id="bugStatusNote" maxlength="200" value="${escapeHtml(bug.statusNote || '')}" placeholder="e.g. Duplicate of #4">
        </div>
      </div>
      <div class="settings-note" id="bugDetailNote" style="display:none;"></div>
      <div class="modalfoot">
        <button class="btn" id="bugDetailClose">Close</button>
        <button class="btn" id="bugStatusSave">Save Status</button>
        ${bug.status === 'Fixed'
          ? `<button class="btn" disabled>Already fixed${bug.fixedVersion ? ' in ' + escapeHtml(bug.fixedVersion) : ''}</button>`
          : `<button class="btn primary" id="bugPrepareFix">Prepare Fix Release</button>`}
      </div>
    `;
    overlay.classList.add('show');
    wireFixedPicker(box, {
      field:'[data-fp="bugStatusSelect"]', input:'#bugStatusSelect',
      panel:'[data-fp-panel="bugStatusSelect"]', values: statusList, current: bug.status
    });

    const noteEl = box.querySelector('#bugDetailNote');
    function finish(){
      overlay.classList.remove('show');
      box.classList.remove('bugreport-modal');
      resolve({ changed: changed, prepareFix: prepareFix });
    }

    box.querySelector('#bugDetailClose').addEventListener('click', finish);

    box.querySelector('#bugStatusSave').addEventListener('click', async () => {
      const status = box.querySelector('#bugStatusSelect').value;
      const note = box.querySelector('#bugStatusNote').value.trim();
      if (status === bug.status && note === (bug.statusNote || '')){ finish(); return; }

      const btn = box.querySelector('#bugStatusSave');
      btn.disabled = true; btn.textContent = 'Saving…';
      try{
        await adminInvoke('set_bug_status', {
          bugId: bug.bugId,
          status: status,
          note: note,
          expectedUpdatedAt: bug.updatedAt,
        });
        changed = true;
        finish();
      }catch(err){
        btn.disabled = false; btn.textContent = 'Save Status';
        noteEl.style.display = 'block';
        noteEl.style.color = 'var(--red)';
        noteEl.textContent = String((err && err.message) || err);
      }
    });

    const prepBtn = box.querySelector('#bugPrepareFix');
    if (prepBtn) prepBtn.addEventListener('click', async () => {
      prepBtn.disabled = true; prepBtn.textContent = 'Preparing…';
      try{
        if (bug.status !== 'Ready for Release'){
          await adminInvoke('set_bug_status', {
            bugId: bug.bugId,
            status: 'Ready for Release',
            note: bug.statusNote || '',
            expectedUpdatedAt: bug.updatedAt,
          });
          changed = true;
        }
        prepareFix = bug;
        finish();
      }catch(err){
        prepBtn.disabled = false; prepBtn.textContent = 'Prepare Fix Release';
        noteEl.style.display = 'block';
        noteEl.style.color = 'var(--red)';
        noteEl.textContent = String((err && err.message) || err);
      }
    });
  });
}

/* ============================================================
   BUG BADGE (dot merah pada "!")
============================================================= */
function bugBadgeRender(count){
  const dot = document.getElementById('bugDot');
  const btn = document.getElementById('bugReportToggle');
  if (!dot || !btn) return;
  const n = Number(count) || 0;
  if (!n){
    dot.hidden = true;
    btn.classList.remove('has-new-bugs');
    btn.title = 'Report a problem';
    btn.setAttribute('aria-label', 'Report a problem');
    return;
  }
  dot.hidden = false;
  btn.classList.add('has-new-bugs');
  const label = n + ' new bug report' + (n === 1 ? '' : 's');
  btn.title = 'Report a problem — ' + label;
  btn.setAttribute('aria-label', 'Report a problem — ' + label);
}

async function bugBadgeRefresh(){
  if (!isSuperAdmin()){ bugBadgeRender(0); return; }
  if (document.hidden) return;
  try{
    const res = await adminInvoke('list_bug_reports');
    const list = (res && res.data) || [];
    bugBadgeRender(list.filter(b => b.status === 'New').length);
  }catch(err){
    console.warn('Bug badge refresh failed:', err);
  }
}

function bugBadgeStart(){
  bugBadgeRefresh();
  if (bugBadgeTimer) clearInterval(bugBadgeTimer);
  bugBadgeTimer = setInterval(bugBadgeRefresh, BUG_BADGE_POLL_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) bugBadgeRefresh(); });
  window.addEventListener('focus', bugBadgeRefresh);
}

function bugBadgeStop(){
  if (bugBadgeTimer){ clearInterval(bugBadgeTimer); bugBadgeTimer = null; }
  bugBadgeRender(0);
}

/* Butang "!" (sebelah butang dark mode) */
(function(){
  const btn = document.getElementById('bugReportToggle');
  if (!btn) return;
  btn.addEventListener('click', () => { openBugReportModal(); });
})();