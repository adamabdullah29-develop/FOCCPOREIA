/* =========================================================================
   FOCC — 12-mascot.js
   Burung hantu penggalak semangat (vanilla, tiada React).
   - Pandang ikut cursor (9 arah) + reaksi bila ditekan
   - Idle 8 minit → tegur user dengan ayat semangat
   - Auto ikut tema (light/dark) sebab bubble guna CSS variable
   - SuperAdmin sahaja (development)
   ========================================================================= */
(function(){
  const wrap   = document.getElementById('foccMascot');
  const btn    = document.getElementById('foccMascotBtn');
  const dirLay = document.getElementById('foccMascotDir');
  const rctLay = document.getElementById('foccMascotReact');
  const bubble = document.getElementById('foccMascotBubble');
  const textEl = document.getElementById('foccMascotText');
  const hideBtn= document.getElementById('foccMascotHide');
  if (!wrap || !btn || !dirLay || !rctLay || !bubble || !textEl) return;

  /* Guna sessionStorage (bukan localStorage) supaya pilihan "sembunyi"
     hidup untuk sesi ini sahaja — hilang bila tab ditutup / login baharu. */
  const HIDE_KEY        = 'focc.mascot.hidden';
  const LOGIN_STAMP_KEY = 'focc.mascot.loginStamp';
  const GREET_KEY       = 'focc.mascot.greeted';

  /* Ayat klik (semangat) */
  const CLICK_LINES = [
    "Be Intelligent Person \u2014 Don't Give Up!",
    "Keep Going \u2014 You're Doing Great!",
    "Small Steps, Big Progress.",
    "Stay Focused. You've Got This.",
    "Every Problem Has a Solution.",
    "Think Smart. Move Forward.",
    "Don't Stop Until You're Proud.",
    "Your Effort Matters."
  ];
  /* Ayat idle (lembut — user mungkin penat, bukan sengaja) */
  const IDLE_LINES = [
    "One Task at a Time. You're Fine.",
    "Breathe. Then Continue Strong."
  ];

  /* Sprite sheet 3x3 (row-major) */
  const DIR = { UP_LEFT:0, UP:1, UP_RIGHT:2, LEFT:3, CENTER:4, RIGHT:5, DOWN_LEFT:6, DOWN:7, DOWN_RIGHT:8 };
  const ANGLE_TO_DIR = [ DIR.RIGHT, DIR.DOWN_RIGHT, DIR.DOWN, DIR.DOWN_LEFT, DIR.LEFT, DIR.UP_LEFT, DIR.UP, DIR.UP_RIGHT ];
  const R_HEART = 1, R_SPARKLE = 2, R_SURPRISED = 3, R_WINK = 4, R_DELIGHTED = 8;
  const CLICK_REACTIONS = [ R_HEART, R_SPARKLE, R_DELIGHTED, R_WINK ];

  const DEAD_ZONE     = 70;                 /* px — dekat sini kepala settle ke tengah  */
  const IDLE_FIRST_MS = 8  * 60 * 1000;     /* nudge pertama: 8 minit                    */
  const IDLE_REPEAT_MS= 12 * 60 * 1000;     /* nudge seterusnya: setiap 12 minit         */

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canTrack     = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  let dirIndex = DIR.CENTER;
  let pendingX = null, pendingY = null, rafId = null;
  let bubbleTimer = null, reactTimer = null, idleTimer = null;
  let bubbleOn = false, lastLine = '';

  /* index 0..8 -> posisi dalam grid 3x3 */
  function setCell(layer, index){
    layer.style.backgroundPosition = ((index % 3) * 50) + '% ' + (Math.floor(index / 3) * 50) + '%';
  }
  function setDirection(i){
    if (i === dirIndex) return;
    dirIndex = i;
    setCell(dirLay, i);
  }
  function playReaction(i, ms){
    setCell(rctLay, i);
    rctLay.classList.add('is-on');
    clearTimeout(reactTimer);
    reactTimer = setTimeout(function(){ rctLay.classList.remove('is-on'); }, ms || 900);
  }
  function pickLine(pool){
    if (pool.length === 1) return pool[0];
    let line = pool[Math.floor(Math.random() * pool.length)];
    if (line === lastLine) line = pool[(pool.indexOf(line) + 1) % pool.length];
    lastLine = line;
    return line;
  }
  function showBubble(pool){
    textEl.textContent = pickLine(pool);
    bubble.classList.add('show');
    bubbleOn = true;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hideBubble, 4000);
  }
  function hideBubble(){
    clearTimeout(bubbleTimer);
    bubble.classList.remove('show');
    bubbleOn = false;
  }

  /* ---- sorok / tunjuk ikut pilihan user ---- */
  function applyVisibility(){
    /* Maskot = untuk team Poreia (SuperAdmin) SAHAJA semasa development.
       User/customer biasa tidak pernah nampak dia. */
    if (typeof isSuperAdmin !== 'function' || !isSuperAdmin()){ wrap.hidden = true; return; }
    let hidden = false;
    try{ hidden = sessionStorage.getItem(HIDE_KEY) === '1'; }catch(e){}
    wrap.hidden = hidden;
  }

  /* ---- pandang ikut cursor (viewport-based → scroll tak pecahkan) ---- */
  function updateGaze(){
    rafId = null;
    if (pendingX === null) return;
    const r  = btn.getBoundingClientRect();
    const dx = pendingX - (r.left + r.width  / 2);
    const dy = pendingY - (r.top  + r.height / 2);
    if (Math.sqrt(dx * dx + dy * dy) < DEAD_ZONE){ setDirection(DIR.CENTER); return; }
    const deg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    setDirection(ANGLE_TO_DIR[Math.round(deg / 45) % 8]);
  }
  if (canTrack){
    window.addEventListener('pointermove', function(e){
      pendingX = e.clientX; pendingY = e.clientY;
      if (rafId === null) rafId = requestAnimationFrame(updateGaze);
    }, { passive:true });
  }

  /* ---- klik maskot ---- */
  btn.addEventListener('click', function(e){
    e.stopPropagation();
    armIdle(IDLE_FIRST_MS);
    if (bubbleOn){ hideBubble(); return; }
    playReaction(CLICK_REACTIONS[Math.floor(Math.random() * CLICK_REACTIONS.length)]);
    showBubble(CLICK_LINES);
  });
  btn.addEventListener('mouseenter', function(){
    if (!bubbleOn) playReaction(R_WINK, 620);
  });

  /* ---- tutup bubble: klik luar / Escape ---- */
  document.addEventListener('click', function(e){
    if (bubbleOn && !wrap.contains(e.target)) hideBubble();
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') hideBubble();
  });

  /* ---- butang x (sembunyi selama-lamanya) ---- */
  if (hideBtn){
    hideBtn.addEventListener('click', function(e){
      e.stopPropagation();
      try{ sessionStorage.setItem(HIDE_KEY, '1'); }catch(err){}
      hideBubble();
      wrap.hidden = true;
    });
  }

  /* ---- idle trigger (anti-mengantuk) ---- */
  function armIdle(ms){
    clearTimeout(idleTimer);
    idleTimer = setTimeout(fireIdle, ms);
  }
  function fireIdle(){
    const app = document.getElementById('app');
    const visible = app && app.style.display !== 'none' && !wrap.hidden;
    if (visible){
      playReaction(R_SURPRISED, 1200);
      showBubble(IDLE_LINES);
      armIdle(IDLE_REPEAT_MS);
    } else {
      armIdle(IDLE_FIRST_MS);
    }
  }
  ['pointerdown','pointermove','keydown','wheel','touchstart'].forEach(function(ev){
    window.addEventListener(ev, function(){ armIdle(IDLE_FIRST_MS); }, { passive:true });
  });

  /* ---- ucapan selamat kembali ---- */
  function nameFromEmail(email){
    let s = String(email || '').trim().toLowerCase();
    if (!s) return '';
    s = s.split('@')[0];
    s = s.split('+')[0];
    s = s.split(/[._\-]/)[0];
    s = s.replace(/[^a-z0-9]/g, '');
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function greetingFor(name){
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : (h < 18 ? 'Good afternoon' : 'Good evening');
    return part + (name ? ', ' + name : '') + '!';
  }
  function showWelcome(name){
    playReaction(R_HEART, 1400);
    textEl.textContent = greetingFor(name);
    bubble.classList.add('show');
    bubbleOn = true;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hideBubble, 5000);
    armIdle(IDLE_FIRST_MS);
  }

  /* ---- boot ---- */
  applyVisibility();
  setCell(dirLay, DIR.CENTER);
  setCell(rctLay, R_SPARKLE);
  if (!reduceMotion) wrap.classList.add('is-animated');
  armIdle(IDLE_FIRST_MS);

  /* ---- API untuk login (dipanggil dari foccShowApp) ---- */
  window.foccMascot = {
    startLogin: function(session){
      /* SuperAdmin sahaja (development) — customer biasa, sembunyi terus. */
      const allowed = (typeof isSuperAdmin === 'function') ? isSuperAdmin() : false;
      if (!allowed){ wrap.hidden = true; hideBubble(); return; }
      const stamp = String((session && session.loginTimestamp) || 0);
      let isNewLogin = true;
      try{
        isNewLogin = sessionStorage.getItem(LOGIN_STAMP_KEY) !== stamp;
        sessionStorage.setItem(LOGIN_STAMP_KEY, stamp);
      }catch(e){}

      if (isNewLogin){
        /* Login baharu → buang pilihan sembunyi, maskot balik. */
        try{ sessionStorage.removeItem(HIDE_KEY); }catch(e){}
        wrap.hidden = false;
      }

      /* Ucapan: SEKALI sahaja per sesi login (refresh tak ulang). */
      let greeted = false;
      try{ greeted = sessionStorage.getItem(GREET_KEY) === stamp; }catch(e){}
      if (!wrap.hidden && !greeted){
        try{ sessionStorage.setItem(GREET_KEY, stamp); }catch(e){}
        setTimeout(function(){ showWelcome(nameFromEmail(session && session.email)); }, 700);
      }
    }
  };
})();