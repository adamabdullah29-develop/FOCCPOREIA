/* =========================================================================
   FOCC — 07-pages-ops.js
   Overview (Main Menu) + Maintenance Dashboard.
   ========================================================================= */

/* ============================================================
   PAGE: OVERVIEW (Main Menu)
============================================================= */
async function renderOverview(){
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="menuhero">
      <div class="datepill">${new Date().getFullYear()}<br><b style="font-size:14px;color:#fff">LIVE CONSOLE</b></div>
      <div class="tag">POREIA TECHNOLOGIES &bull; FOCC</div>
      <h2>Fleet Operations Command Center</h2>
      <p>Real-time monitoring for operations, maintenance, compliance, safety and fleet performance. Powered by Poreia Technologies.</p>
    </div>
    <div class="groupcards">
      <div class="groupcard">
        <div class="gc-head" style="background:linear-gradient(135deg,#0f5c7a,#1aa39a);">
          <h3>Operation</h3>
          <div class="gc-sub">Trips, KPI, driver productivity &amp; mileage</div>
        </div>
        <div class="gc-links">
          <a class="gc-link" data-nav="tipperOpsDashboard"><span class="idx">1</span> Tipper Operations <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="containerOpsDashboard"><span class="idx">2</span> Container Operations <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="tankerOpsDashboard"><span class="idx">3</span> Tanker Operations <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="mileage"><span class="idx">4</span> Truck Mileage <span class="arrow">&rarr;</span></a>
        </div>
      </div>
      <div class="groupcard">
        <div class="gc-head" style="background:linear-gradient(135deg,#7a4a0f,#e6a339);">
          <h3>Maintenance</h3>
          <div class="gc-sub">Repairs, service history &amp; machinery</div>
        </div>
        <div class="gc-links">
          <a class="gc-link" data-nav="maintenanceDashboard"><span class="idx">1</span> Maintenance Dashboard <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="maintenanceLog"><span class="idx">2</span> Maintenance Log <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="machineryLog"><span class="idx">3</span> Machinery Log <span class="arrow">&rarr;</span></a>
        </div>
      </div>
      <div class="groupcard">
        <div class="gc-head" style="background:linear-gradient(135deg,#7a1f1f,#d1554a);">
          <h3>Compliance</h3>
          <div class="gc-sub">Documents, safety &amp; staff records</div>
        </div>
        <div class="gc-links">
          <a class="gc-link" data-nav="complianceDashboard"><span class="idx">1</span> Compliance Dashboard <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="speedingIdling"><span class="idx">2</span> Speeding &amp; Idling <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="misconduct"><span class="idx">3</span> Misconduct <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="safetyEquipment"><span class="idx">4</span> Safety Equipment <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="feg"><span class="idx">5</span> FEG <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="primeMover"><span class="idx">6</span> Prime Mover Details <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="trailer"><span class="idx">7</span> Trailer Details <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="staffDatabase"><span class="idx">8</span> Staff Database <span class="arrow">&rarr;</span></a>
        </div>
      </div>
    </div>
  `;
  wrap.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => goTo(el.dataset.nav));
  });
  return wrap;
}

/* ============================================================
   PAGE: MAINTENANCE DASHBOARD
============================================================= */
async function renderMaintenanceDashboard(){
  const mlog = await getData('maintenanceLog');
  const mach = await getData('machineryLog');

  const isIsoDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(`${v}T00:00:00`).getTime());
  const allDates = [...new Set(mlog.filter(r => isIsoDate(r.dateIn)).map(r => r.dateIn))].sort((a, b) => new Date(b) - new Date(a));

  function toDateKey(dateObj){
    return new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
  }
  let selectedDate = toDateKey(new Date());
  let monthCursor = new Date(`${selectedDate}T00:00:00`);
  let topTruckView = 'date';

  function fmtDateLong(dateKey){
    if (!dateKey) return '-';
    const d = new Date(`${dateKey}T00:00:00`);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});
  }

  function buildCalendar(dateKey, monthView){
    const monthDate = new Date(monthView.getFullYear(), monthView.getMonth(), 1);
    const monthName = monthDate.toLocaleDateString('en-GB', {month:'long', year:'numeric'});
    const startWeekday = (monthDate.getDay() + 6) % 7;
    const dateSet = new Set(allDates);
    const cells = [];
    for (let i = 0; i < 42; i++){
      const dayIndex = i - startWeekday + 1;
      const cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), dayIndex);
      const isCurrentMonth = cellDate.getMonth() === monthDate.getMonth();
      const key = toDateKey(cellDate);
      const isSelected = key === dateKey;
      const hasData = dateSet.has(key);
      const classes = ['day-cell'];
      if (!isCurrentMonth) classes.push('muted');
      if (hasData) classes.push('has-data');
      if (isSelected) classes.push('active');
      cells.push(`<button type="button" class="${classes.join(' ')}" data-date="${key}" ${!isCurrentMonth ? 'disabled' : ''}>${cellDate.getDate()}</button>`);
    }
    return `
      <div class="calendar-panel">
        <div class="calendar-header">
          <button type="button" class="cal-nav" data-nav="prev-month" aria-label="Previous month">&#8249;</button>
          <div class="month-name">${monthName}</div>
          <button type="button" class="cal-nav" data-nav="next-month" aria-label="Next month">&#8250;</button>
        </div>
        <div class="calendar-weekdays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
        <div class="calendar-grid">${cells.join('')}</div>
      </div>
    `;
  }

  function renderDashboard(dateKey){
    const totalRepairsLogged = mlog.length;
    const repairsByDate = mlog.filter(r => r.dateIn === dateKey).length;
    const totalCost = mlog.reduce((s,r)=>s+(Number(r.cost)||0),0) + mach.reduce((s,r)=>s+(Number(r.cost)||0),0);
    const maintVendors = new Set(mlog.map(r => (r.vendor||'').trim()).filter(Boolean));
    const machVendors = new Set(mach.map(r => (r.vendor||'').trim()).filter(Boolean));
    const allVendors = new Set([...maintVendors, ...machVendors]);

    const allCostRows = [...mlog, ...mach];
    const paidRows = allCostRows.filter(r => (r.paymentStatus||'').toLowerCase() === 'paid');
    const pendingRows = allCostRows.filter(r => (r.paymentStatus||'').toLowerCase() === 'pending');
    const paidAmount = paidRows.reduce((s,r)=>s+(Number(r.cost)||0),0);
    const pendingAmount = pendingRows.reduce((s,r)=>s+(Number(r.cost)||0),0);
    const totalPaymentAmount = paidAmount + pendingAmount;
    const paidPct = totalPaymentAmount > 0 ? Math.round((paidAmount/totalPaymentAmount)*100) : 0;

    const calendarHtml = buildCalendar(dateKey, monthCursor);

    const repairingOpts = {
      rowFilterFn: r => calcRepairStatus(r.dateOut) === 'Repairing',
      visibleColumnIds: ['truck','scenePlace','reason','action','dateIn','repairPlace','remark'],
    };
    const repairingRows = mlog.filter(r => calcRepairStatus(r.dateOut) === 'Repairing');

    const topTruckSourceRows = topTruckView === 'all' ? mlog : mlog.filter(r => r.dateIn === dateKey);
    const highestRepairs = {};
    topTruckSourceRows.forEach(r => {
      if (!r.truck) return;
      if (!highestRepairs[r.truck]) highestRepairs[r.truck] = {count:0, spending:0};
      highestRepairs[r.truck].count += 1;
      highestRepairs[r.truck].spending += (Number(r.cost) || 0);
    });
    const highestArr = Object.entries(highestRepairs)
      .sort((a,b) => b[1].count - a[1].count)
      .slice(0,5)
      .map(([truck, v]) => ({truck, value:v.count, spending:v.spending}));

    function summarizeEquipment(equipmentName){
      const rows = mach.filter(r => r.equipment === equipmentName);
      const repairDates = rows.map(r => r.repairDate).filter(Boolean).sort((a,b) => new Date(b) - new Date(a));
      const serviceDates = rows.map(r => r.serviceDate).filter(Boolean).sort((a,b) => new Date(b) - new Date(a));
      const latestRepair = repairDates[0] || '';
      const latestService = serviceDates[0] || '';
      const nextService = latestService ? calcNextService(latestService) : '';
      const mobDemobCount = rows.filter(r => r.mobDemobDate).length;
      const totalSpending = rows.reduce((s,r) => s + (Number(r.cost)||0), 0);
      return { latestRepair, latestService, nextService, mobDemobCount, totalSpending };
    }
    const wheelLoader = summarizeEquipment('Wheel Loader');
    const excavator = summarizeEquipment('Excavator');

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="dashboard-shell">
        ${calendarHtml}
        <div class="insight-panel">
          <div>
            <div class="mini-title">Selected date</div>
            <div class="selected-date">${fmtDateLong(dateKey)}</div>
          </div>
          <div class="insight-grid">
            <div class="mini-stat" style="--stat-accent:var(--teal)">
              <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M9 12h6"></path><path d="M9 16h6"></path></svg>Repair Logged</div>
              <div class="value">${FMT.num(totalRepairsLogged)}</div>
              <div class="meta">All records</div>
            </div>
            <div class="mini-stat" style="--stat-accent:var(--red)">
              <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l1.5-4h17L22 7"></path><path d="M4 7v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7"></path><path d="M4 7h16"></path><path d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6"></path></svg>Total Registered Vendor</div>
              <div class="value">${FMT.num(allVendors.size)}</div>
              <div class="meta">${maintVendors.size} Maintenance / ${machVendors.size} Machinery</div>
            </div>
            <div class="mini-stat" style="--stat-accent:var(--amber)">
              <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 3"></path><circle cx="12" cy="12" r="9"></circle></svg>Repair Logged By Date</div>
              <div class="value">${FMT.num(repairsByDate)}</div>
              <div class="meta">On this date</div>
            </div>
            <div class="mini-stat" style="--stat-accent:var(--navy-600)">
              <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>Total Cost</div>
              <div class="value">${FMT.money(totalCost)}</div>
              <div class="meta">Maintenance + Machinery</div>
            </div>
            <div class="mini-stat mini-stat-wide" style="--stat-accent:var(--teal)">
              <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>Payment Status</div>
              <div style="display:flex;gap:22px;margin-top:10px;flex-wrap:wrap;">
                <div style="flex:1;min-width:130px;">
                  <div style="font-size:10.5px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Paid</div>
                  <div style="font-family:var(--font-display);font-weight:800;font-size:19px;color:#1b8a4a;margin-top:2px;">${FMT.money(paidAmount)}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:2px;">${paidRows.length} record(s)</div>
                </div>
                <div style="width:1px;background:var(--line);"></div>
                <div style="flex:1;min-width:130px;">
                  <div style="font-size:10.5px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Pending</div>
                  <div style="font-family:var(--font-display);font-weight:800;font-size:19px;color:#9c6c1c;margin-top:2px;">${FMT.money(pendingAmount)}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:2px;">${pendingRows.length} record(s)</div>
                </div>
              </div>
              <div class="trip-bar" style="width:100%;height:6px;margin-top:12px;"><i style="width:${paidPct}%"></i></div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid2">
        <div class="section">
          <div class="section-head" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <h3>Top Trucks &mdash; Most Repairs</h3>
            <div class="op-toggle" role="tablist">
              <button type="button" class="op-toggle-btn${topTruckView === 'date' ? ' active' : ''}" data-top-truck-view="date">By Date</button>
              <button type="button" class="op-toggle-btn${topTruckView === 'all' ? ' active' : ''}" data-top-truck-view="all">All</button>
            </div>
          </div>
          <div class="section-body">${highestArr.length ? rankTableWithSpending(highestArr, 'Repairs') : '<p style="color:var(--muted);font-size:13px">No repeat repairs logged yet.</p>'}</div>
        </div>
        <div class="section">
          <div class="section-head"><h3>Machinery Status</h3></div>
          <div class="section-body grid2" style="gap:14px;">
            <div>
              <div style="font-family:var(--font-display);font-weight:700;font-size:14px;margin-bottom:6px;">Wheel Loader</div>
              <div style="font-size:12.5px;color:var(--muted);">Latest repair: <b style="color:var(--ink)">${fmtDate(wheelLoader.latestRepair)}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Latest service: <b style="color:var(--ink)">${fmtDate(wheelLoader.latestService)}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Next service: <b style="color:var(--ink)">${wheelLoader.nextService ? fmtDate(wheelLoader.nextService) : '-'}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Total Mob/Demob: <b style="color:var(--ink)">${wheelLoader.mobDemobCount > 0 ? wheelLoader.mobDemobCount : '-'}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Total spending: <b style="color:var(--ink)">${wheelLoader.totalSpending > 0 ? FMT.money(wheelLoader.totalSpending) : '-'}</b></div>
            </div>
            <div>
              <div style="font-family:var(--font-display);font-weight:700;font-size:14px;margin-bottom:6px;">Excavator</div>
              <div style="font-size:12.5px;color:var(--muted);">Latest repair: <b style="color:var(--ink)">${fmtDate(excavator.latestRepair)}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Latest service: <b style="color:var(--ink)">${fmtDate(excavator.latestService)}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Next service: <b style="color:var(--ink)">${excavator.nextService ? fmtDate(excavator.nextService) : '-'}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Total Mob/Demob: <b style="color:var(--ink)">${excavator.mobDemobCount > 0 ? excavator.mobDemobCount : '-'}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Total spending: <b style="color:var(--ink)">${excavator.totalSpending > 0 ? FMT.money(excavator.totalSpending) : '-'}</b></div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head"><h3>Maintenance Log &mdash; Currently Repairing</h3><span class="eyebrow">${repairingRows.length} truck(s)</span></div>
        <div class="section-body" id="mlogHost"></div>
      </div>
    `;

    const host = wrap.querySelector('#mlogHost');
    host.innerHTML = buildTableHTML('maintenanceLog', mlog, '', repairingOpts);
    wireTable(host, 'maintenanceLog', null, repairingOpts);

    wrap.querySelectorAll('.day-cell[data-date]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedDate = btn.dataset.date;
        monthCursor = new Date(`${selectedDate}T00:00:00`);
        const refreshed = renderDashboard(selectedDate);
        const parent = wrap.parentElement;
        if (parent) parent.replaceChild(refreshed, wrap);
      });
    });
    wrap.querySelectorAll('.cal-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.nav === 'next-month' ? 1 : -1;
        monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + dir, 1);
        const refreshed = renderDashboard(selectedDate);
        const parent = wrap.parentElement;
        if (parent) parent.replaceChild(refreshed, wrap);
      });
    });
    wrap.querySelectorAll('[data-top-truck-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        topTruckView = btn.dataset.topTruckView;
        const refreshed = renderDashboard(selectedDate);
        const parent = wrap.parentElement;
        if (parent) parent.replaceChild(refreshed, wrap);
      });
    });

    return wrap;
  }

  return renderDashboard(selectedDate);
}