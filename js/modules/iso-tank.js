/* =========================================================================
   FOCC ISO TANK DEPOT — Fasa 2 (blok lengkap, self-contained)
   =========================================================================
   Blok ini GANTIKAN Fasa 1. Ia daftar:
     · 13 TABLES
     · 12 ROUTES (4 guna renderer sebenar, 8 placeholder)
     · 1 NAV_ENTRY → push ke NAV_STRUCTURE
     · 13 tableKey → add ke SUPABASE_NATIVE_TABLES
   =========================================================================
   Semua additive. Tiada kod lama dipadam, tiada table Supabase baharu.
   ========================================================================= */

(function(){
  'use strict';

  /* =====================================================================
     SEKSYEN 1 — CONSTANTS & HELPERS
     ===================================================================== */
    /* Normalize slot format: "A-1" / "A1" / "a-05" → "A-01" (uppercase, pad 2-digit) */
  window.isoNormSlot = function(s){
    const raw = String(s || '').trim().toUpperCase();
    const m = /^([A-Z])-?0*(\d+)$/.exec(raw);
    if (!m) return raw;
    return m[1] + '-' + String(parseInt(m[2], 10)).padStart(2, '0');
  };

  const ISO_STATUS_COLORS = {
    'Available':'#3f9a6e','In Yard':'#1aa39a','On Trip':'#4f7fd1','In Use':'#8a5fd1',
    'Maintenance':'#e6a339','Out of Service':'#d1554a',
    'Not Scheduled':'#6b7c8d','Scheduled':'#4f7fd1','Passed':'#3f9a6e',
    'Failed':'#d1554a','Follow-up Required':'#e6a339',
    'Valid':'#3f9a6e','Due Soon':'#e6a339','Expired':'#d1554a',
    'Pending Verification':'#4f7fd1','Not Available':'#6b7c8d',
    'Open':'#d1554a','Acknowledged':'#e6a339','In Progress':'#4f7fd1',
    'Escalated':'#8a5fd1','Resolved':'#3f9a6e',
    'Critical':'#d1554a','High':'#e6a339','Medium':'#4f7fd1','Informational':'#6b7c8d',
  };

  const ISO_BLOCK_COLORS = ['#1aa39a','#e6a339','#8a5fd1','#4f7fd1','#d1554a','#3f9a6e'];
  const ISO_OPEN_KEY = 'focc-iso-tank-open';

  function isoNewIdLocal(prefix){
    const p = String(prefix || 'ISO').toUpperCase();
    try{ if (window.crypto && crypto.randomUUID) return p + '-' + crypto.randomUUID(); }catch(e){}
    return p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
  }

  function isoStatusBadge(status){
    const s = String(status || '').trim();
    if (!s) return '<span class="badge neutral">&mdash;</span>';
    const c = ISO_STATUS_COLORS[s] || '#6b7c8d';
    return `<span class="badge" style="background:${c}1a;color:${c};border:1px solid ${c}33;">${escapeHtml(s)}</span>`;
  }

  function isoDaysInYard(row){
    if (!row || !row.lastActivityAt) return 0;
    const d = new Date(String(row.lastActivityAt).slice(0,10) + 'T00:00:00');
    if (isNaN(d.getTime())) return 0;
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.floor((today - d) / 86400000);
    return diff >= 0 ? diff : 0;
  }

  function isoTankDisplay(tank){
    if (!tank) return '(No Tank)';
    return String(tank.tankNumber || tank.tankId || tank.assetId || '(unnamed)');
  }

  function isoStatCard(label, value, sub){
    return `<div class="mini-stat">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(String(value == null ? '—' : value))}</div>
      ${sub ? `<div class="meta">${escapeHtml(String(sub))}</div>` : ''}
    </div>`;
  }

  function isoEmptyState(title, sub){
    return `<div class="cdx-empty">
      <div style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink);">${escapeHtml(title)}</div>
      <div style="font-size:12.5px;line-height:1.5;max-width:380px;text-align:center;">${escapeHtml(sub)}</div>
    </div>`;
  }

  function isoSkeletonRenderer(moduleKey, cfg){
    cfg = cfg || {};
    return function(){
      const kpis = cfg.kpis || [
        { label:'Total Tanks', note:'Registered' },
        { label:'In Yard',     note:'Currently stored' },
        { label:'On Trip',     note:'Out for delivery' },
        { label:'Attention',   note:'Needs action' },
      ];
      const wrap = document.createElement('div');
      wrap.className = 'skel-page';
      wrap.innerHTML = `
        <div class="skel-intro">
          <div class="skel-intro-text">
            <div class="skel-crumbs">
              <span>ISO Tank Depot</span><span class="sep">/</span>
              <span class="current">${escapeHtml(cfg.title || moduleKey)}</span>
            </div>
            <p>${escapeHtml(cfg.description || 'ISO Tank module — Phase 2 placeholder. Full renderer dalam Phase 3/4/5.')}</p>
          </div>
          <span class="skel-badge">Phase 2 &middot; Placeholder</span>
        </div>
        <div class="kpirow">
          ${kpis.map(k => kpiCard({ label:k.label, value:'&mdash;', note:k.note })).join('')}
        </div>
        <div class="section">
          <div class="section-head"><h3>Filters</h3><span class="spacer"></span></div>
          <div class="section-body">
            <div class="skel-filterbar">
              <input class="searchbox" type="text" placeholder="Search..." disabled>
              <select class="skel-select" disabled><option>All Statuses</option></select>
              <button class="btn" disabled>Apply Filters</button>
            </div>
          </div>
        </div>
        <div class="section">
          <div class="section-head"><h3>Records</h3><span class="eyebrow">0 records</span></div>
          <div class="section-body">
            <div class="skel-empty">
              <div class="skel-empty-title">Placeholder page</div>
              <div class="skel-empty-sub">Data table sebenar akan di-wire dalam Phase 3.</div>
            </div>
          </div>
        </div>
      `;
      return wrap;
    };
  }

  async function isoEnsureAssetIds(){
    const rows = await getData('isoTanks');
    if (!Array.isArray(rows) || !rows.length) return;
    let changed = false;
    const today = new Date().toISOString().slice(0,10);
    const who = (typeof getSessionEmail === 'function') ? (getSessionEmail() || '') : '';
    rows.forEach(r => {
      if (!r) return;
      if (!r.assetId){
        r.assetId = isoNewIdLocal('TANK');
        r.tankId = r.tankId || r.assetId;
        r.createdAt = r.createdAt || today;
        r.createdBy = r.createdBy || who;
        r.updatedAt = r.updatedAt || r.createdAt;
        r.updatedBy = r.updatedBy || r.createdBy;
        r.lastActivityAt = r.lastActivityAt || r.createdAt;
        r.archived = r.archived || 'No';
        changed = true;
      }
      if (!r.tankId){ r.tankId = r.assetId; changed = true; }
      if (!r.archived){ r.archived = 'No'; changed = true; }
    });
    if (changed){ DATA_CACHE.isoTanks = rows; await persist('isoTanks'); }
  }

  function isoRememberOpen(row){
    try{
      const v = row ? String(row.tankId || row.assetId || '') : '';
      if (v) sessionStorage.setItem(ISO_OPEN_KEY, v); else sessionStorage.removeItem(ISO_OPEN_KEY);
    }catch(e){}
  }
  function isoForgetOpen(){ try{ sessionStorage.removeItem(ISO_OPEN_KEY); }catch(e){} }
  function isoRecallOpenIndex(rows){
    if (!Array.isArray(rows) || !rows.length) return -1;
    let want = '';
    try{ want = sessionStorage.getItem(ISO_OPEN_KEY) || ''; }catch(e){ return -1; }
    if (!want) return -1;
    return rows.findIndex(r => r && (String(r.tankId || '') === want || String(r.assetId || '') === want));
  }

  /* =====================================================================
     SEKSYEN 2 — DAFTAR 13 TABLES
     ===================================================================== */

  TABLES.isoTanks = {
    label: 'ISO Tank Registry',
    storageKey: 'kor-iso-tanks',
    columns: [
      { id:'tankNumber',         label:'Tank Number',          type:'text' },
      { id:'owner',              label:'Owner',                type:'text' },
      { id:'customer',           label:'Customer',             type:'text' },
      { id:'tankType',           label:'Tank Type',            type:'text' },
      { id:'equipmentType',      label:'Equipment Type',       type:'text' },
      { id:'capacity',           label:'Capacity',             type:'number' },
      { id:'capacityUnit',       label:'Capacity Unit',        type:'select', options:['L','m³','kg'] },
      { id:'tareWeight',         label:'Tare Weight',          type:'number' },
      { id:'tareWeightUnit',     label:'Tare Weight Unit',     type:'select', options:['kg','lb'] },
      { id:'maxGrossWeight',     label:'Max Gross Weight',     type:'number' },
      { id:'maxGrossWeightUnit', label:'Max Gross Weight Unit',type:'select', options:['kg','lb'] },
      { id:'operationalStatus',  label:'Operational Status',   type:'select', options:['Available','In Yard','On Trip','In Use','Maintenance','Out of Service'] },
      { id:'currentLocation',    label:'Current Location',     type:'text' },
      { id:'blockName',          label:'Block',                type:'text' },
      { id:'slotNo',             label:'Slot',                 type:'text' },
      { id:'inspectionStatus',   label:'Inspection Status',    type:'select', options:['Not Scheduled','Scheduled','Passed','Failed','Follow-up Required'] },
      { id:'certificateStatus',  label:'Certificate Status',   type:'select', options:['Valid','Due Soon','Expired','Pending Verification','Not Available'] },
      { id:'archived',           label:'Archived',             type:'select', options:['No','Yes'] },
    ],
    seed: [],
  };

  TABLES.isoTankMovements = {
    label: 'ISO Tank Movements',
    storageKey: 'kor-iso-tank-movements',
    columns: [
      { id:'movementId',    label:'Movement ID',    type:'text' },
      { id:'tankId',        label:'Tank ID',        type:'text' },
      { id:'tankNumber',    label:'Tank Number',    type:'text' },
      { id:'action',        label:'Action',         type:'select', options:['Gate In','Gate Out','Slot Move','Trip Start','Trip End','Status Change','Cleaning Start','Cleaning Complete','Maintenance Start','Maintenance Complete','Inspection','Certificate Upload'] },
      { id:'fromLocation',  label:'From Location',  type:'text' },
      { id:'toLocation',    label:'To Location',    type:'text' },
      { id:'referenceType', label:'Reference Type', type:'text' },
      { id:'referenceId',   label:'Reference ID',   type:'text' },
      { id:'notes',         label:'Notes',          type:'text' },
      { id:'actor',         label:'Actor',          type:'text' },
      { id:'at',            label:'At',             type:'date' },
    ],
    seed: [],
  };

  TABLES.isoGateEvents = {
    label: 'ISO Gate Events',
    storageKey: 'kor-iso-gate-events',
    columns: [
      { id:'gateEventId',      label:'Gate Event ID',     type:'text' },
      { id:'tankId',           label:'Tank ID',           type:'text' },
      { id:'tankNumber',       label:'Tank Number',       type:'text' },
      { id:'direction',        label:'Direction',         type:'select', options:['In','Out'] },
      { id:'eventDate',        label:'Event Date',        type:'date' },
      { id:'eventTime',        label:'Event Time',        type:'time' },
      { id:'truckReg',         label:'Truck Reg',         type:'text' },
      { id:'driver',           label:'Driver',            type:'text' },
      { id:'customer',         label:'Customer',          type:'text' },
      { id:'owner',            label:'Owner',             type:'text' },
      { id:'arrivalCondition', label:'Arrival Condition', type:'text' },
      { id:'doReference',      label:'DO Reference',      type:'text' },
      { id:'yardSlot',         label:'Yard Slot',         type:'text' },
      { id:'linkedTripId',     label:'Linked Trip ID',    type:'text' },
      { id:'actor',            label:'Actor',             type:'text' },
      { id:'at',               label:'At',                type:'date' },
    ],
    seed: [],
  };

  TABLES.isoYardLayout = {
    label: 'ISO Yard Layout',
    storageKey: 'kor-iso-yard-layout',
    columns: [
      { id:'layoutId',  label:'Layout ID',  type:'text' },
      { id:'depotName', label:'Depot Name', type:'text' },
      { id:'blocks',    label:'Blocks',     type:'text' },
    ],
    seed: [],
  };

  TABLES.isoCustomers = {
    label: 'ISO Customers',
    storageKey: 'kor-iso-customers',
    columns: [
      { id:'customerId',     label:'Customer ID',      type:'text' },
      { id:'companyName',    label:'Company Name',     type:'text' },
      { id:'businessRegNo',  label:'Business Reg No.', type:'text' },
      { id:'contactPerson',  label:'Contact Person',   type:'text' },
      { id:'email',          label:'Email',            type:'text' },
      { id:'phone',          label:'Phone',            type:'text' },
      { id:'address',        label:'Address',          type:'text' },
      { id:'status',         label:'Status',           type:'select', options:['Active','Inactive','Suspended'] },
      { id:'remarks',        label:'Remarks',          type:'text' },
    ],
    seed: [],
  };

  TABLES.isoJobs = {
    label: 'ISO Jobs',
    storageKey: 'kor-iso-jobs',
    columns: [
      { id:'jobId',          label:'Job ID',         type:'text' },
      { id:'customerId',     label:'Customer ID',    type:'text' },
      { id:'customer',       label:'Customer',       type:'text' },
      { id:'serviceType',    label:'Service Type',   type:'select', options:['Haulage','Cleaning','Maintenance','Inspection','Storage','Other'] },
      { id:'tankId',         label:'Tank ID',        type:'text' },
      { id:'tankNumber',     label:'Tank Number',    type:'text' },
      { id:'pickupLocation', label:'Pickup',         type:'text' },
      { id:'destination',    label:'Destination',    type:'text' },
      { id:'instructions',   label:'Instructions',   type:'text' },
      { id:'plannedStart',   label:'Planned Start',  type:'date' },
      { id:'plannedEnd',     label:'Planned End',    type:'date' },
      { id:'status',         label:'Status',         type:'select', options:['New','Scheduled','In Progress','Completed','Cancelled','On Hold'] },
      { id:'linkedTripId',   label:'Linked Trip ID', type:'text' },
      { id:'remarks',        label:'Remarks',        type:'text' },
    ],
    seed: [],
  };

  TABLES.isoTrips = {
    label: 'ISO Trips',
    storageKey: 'kor-iso-trips',
    columns: [
      { id:'tripId',           label:'Trip ID',           type:'text' },
      { id:'customer',         label:'Customer',          type:'text' },
      { id:'jobRef',           label:'Job Reference',     type:'text' },
      { id:'tankId',           label:'Tank ID',           type:'text' },
      { id:'tankNumber',       label:'Tank Number',       type:'text' },
      { id:'truckReg',         label:'Truck Reg',         type:'text' },
      { id:'driver',           label:'Driver',            type:'text' },
      { id:'pickupLocation',   label:'Pickup',            type:'text' },
      { id:'destination',      label:'Destination',       type:'text' },
      { id:'plannedDeparture', label:'Planned Departure', type:'date' },
      { id:'eta',              label:'ETA',               type:'date' },
      { id:'actualDeparture',  label:'Actual Departure',  type:'date' },
      { id:'actualArrival',    label:'Actual Arrival',    type:'date' },
      { id:'instructions',     label:'Instructions',      type:'text' },
      { id:'status',           label:'Status',            type:'select', options:['Planned','Assigned','Dispatched','In Transit','Arrived','Completed','Cancelled','Exception','Delayed'] },
      { id:'remarks',          label:'Remarks',           type:'text' },
    ],
    seed: [],
  };

  TABLES.isoCleaningJobs = {
    label: 'ISO Cleaning Jobs',
    storageKey: 'kor-iso-cleaning-jobs',
    columns: [
      { id:'cleaningId',      label:'Cleaning ID',         type:'text' },
      { id:'tankId',          label:'Tank ID',             type:'text' },
      { id:'tankNumber',      label:'Tank Number',         type:'text' },
      { id:'customer',        label:'Customer',            type:'text' },
      { id:'jobRef',          label:'Job Reference',       type:'text' },
      { id:'previousCargo',   label:'Previous Cargo',      type:'text' },
      { id:'instructions',    label:'Instructions',        type:'text' },
      { id:'scope',           label:'Cleaning Scope',      type:'text' },
      { id:'vendor',          label:'Vendor / Team',       type:'text' },
      { id:'plannedStart',    label:'Planned Start',       type:'date' },
      { id:'plannedComplete', label:'Planned Complete',    type:'date' },
      { id:'actualStart',     label:'Actual Start',        type:'date' },
      { id:'actualComplete',  label:'Actual Complete',     type:'date' },
      { id:'cost',            label:'Cost (RM)',           type:'money' },
      { id:'status',          label:'Status',              type:'select', options:['Pending','Scheduled','In Progress','Awaiting Verification','Completed','Rejected','Re-clean Required'] },
      { id:'verifiedBy',      label:'Verified By',         type:'text' },
      { id:'verifiedAt',      label:'Verified At',         type:'date' },
      { id:'remarks',         label:'Remarks',             type:'text' },
    ],
    seed: [],
  };

  TABLES.isoMaintenanceOrders = {
    label: 'ISO Maintenance Orders',
    storageKey: 'kor-iso-maintenance-orders',
    columns: [
      { id:'workOrderId',   label:'Work Order ID',   type:'text' },
      { id:'tankId',        label:'Tank ID',         type:'text' },
      { id:'tankNumber',    label:'Tank Number',     type:'text' },
      { id:'issueCategory', label:'Issue Category',  type:'select', options:['Structural','Valve','Gasket','Frame','Coating','Other'] },
      { id:'description',   label:'Description',     type:'text' },
      { id:'priority',      label:'Priority',        type:'select', options:['Low','Medium','High','Critical'] },
      { id:'assignedTo',    label:'Assigned To',     type:'text' },
      { id:'reportedDate',  label:'Reported Date',   type:'date' },
      { id:'startDate',     label:'Start Date',      type:'date' },
      { id:'completedDate', label:'Completed Date',  type:'date' },
      { id:'cost',          label:'Cost (RM)',       type:'money' },
      { id:'status',        label:'Status',          type:'select', options:['Open','Under Repair','Awaiting Parts','Awaiting Inspection','Completed','Closed'] },
      { id:'remarks',       label:'Remarks',         type:'text' },
    ],
    seed: [],
  };

  TABLES.isoInspections = {
    label: 'ISO Inspections',
    storageKey: 'kor-iso-inspections',
    columns: [
      { id:'inspectionId',      label:'Inspection ID',      type:'text' },
      { id:'tankId',            label:'Tank ID',            type:'text' },
      { id:'tankNumber',        label:'Tank Number',        type:'text' },
      { id:'inspectionType',    label:'Inspection Type',    type:'text' },
      { id:'scheduledDate',     label:'Scheduled Date',     type:'date' },
      { id:'actualDate',        label:'Actual Date',        type:'date' },
      { id:'inspector',         label:'Inspector',          type:'text' },
      { id:'checklistRef',      label:'Checklist Ref',      type:'text' },
      { id:'result',            label:'Result',             type:'select', options:['Pending','Passed','Failed','Follow-up Required'] },
      { id:'findings',          label:'Findings',           type:'text' },
      { id:'correctiveActions', label:'Corrective Actions', type:'text' },
      { id:'followUpDate',      label:'Follow-up Date',     type:'date' },
      { id:'status',            label:'Status',             type:'select', options:['Scheduled','In Progress','Passed','Failed','Follow-up Required'] },
    ],
    seed: [],
  };

  TABLES.isoCertificates = {
    label: 'ISO Certificates',
    storageKey: 'kor-iso-certificates',
    columns: [
      { id:'certificateId',      label:'Certificate ID',      type:'text' },
      { id:'tankId',             label:'Tank ID',             type:'text' },
      { id:'tankNumber',         label:'Tank Number',         type:'text' },
      { id:'certificateType',    label:'Certificate Type',    type:'text' },
      { id:'documentRef',        label:'Document Ref',        type:'text' },
      { id:'issueDate',          label:'Issue Date',          type:'date' },
      { id:'expiryDate',         label:'Expiry Date',         type:'date' },
      { id:'issuer',             label:'Issuing Organization',type:'text' },
      { id:'verificationStatus', label:'Verification Status', type:'select', options:['Pending Verification','Verified','Rejected'] },
      { id:'reminderStatus',     label:'Reminder Status',     type:'select', options:['Valid','Due Soon','Expired','Not Available'] },
    ],
    seed: [],
  };

  TABLES.isoAlerts = {
    label: 'ISO Alerts',
    storageKey: 'kor-iso-alerts',
    columns: [
      { id:'alertId',          label:'Alert ID',         type:'text' },
      { id:'issueCategory',    label:'Issue Category',   type:'select', options:['Certificate Expired','Certificate Due Soon','Inspection Overdue','Inspection Failed','Cleaning Overdue','Long Yard Stay','Trip Delayed','Trip Not Closed','Damage Reported','Document Missing','Yard Location Mismatch','Work Order Pending','Other'] },
      { id:'linkedEntityType', label:'Linked Entity',    type:'text' },
      { id:'linkedEntityId',   label:'Linked Entity ID', type:'text' },
      { id:'linkedEntityRef',  label:'Linked Ref',       type:'text' },
      { id:'detectedDate',     label:'Detected Date',    type:'date' },
      { id:'priority',         label:'Priority',         type:'select', options:['Critical','High','Medium','Informational'] },
      { id:'assignedTo',       label:'Assigned To',      type:'text' },
      { id:'status',           label:'Status',           type:'select', options:['Open','Acknowledged','In Progress','Escalated','Resolved'] },
      { id:'remarks',          label:'Remarks',          type:'text' },
      { id:'resolvedBy',       label:'Resolved By',      type:'text' },
      { id:'resolvedAt',       label:'Resolved At',      type:'date' },
    ],
    seed: [],
  };

  TABLES.isoAuditEvents = {
    label: 'ISO Audit Events',
    storageKey: 'kor-iso-audit-events',
    columns: [
      { id:'auditId',      label:'Audit ID',     type:'text' },
      { id:'actor',        label:'Actor',        type:'text' },
      { id:'actionType',   label:'Action Type',  type:'text' },
      { id:'entityType',   label:'Entity Type',  type:'text' },
      { id:'entityId',     label:'Entity ID',    type:'text' },
      { id:'timestamp',    label:'Timestamp',    type:'date' },
      { id:'beforeValues', label:'Before',       type:'text' },
      { id:'afterValues',  label:'After',        type:'text' },
      { id:'referenceId',  label:'Reference ID', type:'text' },
    ],
    seed: [],
  };

  /* =====================================================================
     SEKSYEN 3 — RENDERER SEBENAR (4 pages)
     ===================================================================== */

  /* ---------- 3A. DASHBOARD ---------- */
  async function renderIsoDashboard(){
    const wrap = document.createElement('div');
    const [tanks, trips, alerts] = await Promise.all([
      getData('isoTanks').catch(() => []),
      getData('isoTrips').catch(() => []),
      getData('isoAlerts').catch(() => []),
    ]);
    const activeTanks = (tanks || []).filter(t => t && t.archived !== 'Yes');
    const total = activeTanks.length;
    const inYard = activeTanks.filter(t => ['In Yard','Available'].includes(String(t.operationalStatus || ''))).length;
    const onTrip = activeTanks.filter(t => String(t.operationalStatus || '') === 'On Trip').length;
    const attentionTanks = activeTanks.filter(t =>
      ['Expired','Due Soon'].includes(String(t.certificateStatus || '')) ||
      ['Failed','Follow-up Required'].includes(String(t.inspectionStatus || ''))
    ).length;
    const openAlerts = (alerts || []).filter(a => a && String(a.status || '') !== 'Resolved').length;

    const tripByStatus = {};
    (trips || []).forEach(t => { const s = String(t.status || 'Unknown'); tripByStatus[s] = (tripByStatus[s] || 0) + 1; });

    const byBlock = {};
    activeTanks.forEach(t => { const b = String(t.blockName || '(unassigned)'); byBlock[b] = (byBlock[b] || 0) + 1; });

    const movements = await getData('isoTankMovements').catch(() => []);
    const recent = (movements || []).slice().sort((a,b) => String(b.at || '').localeCompare(String(a.at || ''))).slice(0, 8);

    wrap.innerHTML = `
      <div class="cdx-statgrid" style="margin-bottom:18px;">
        ${isoStatCard('Total ISO Tanks', total, 'Registered (not archived)')}
        ${isoStatCard('In Yard', inYard, 'Physically present')}
        ${isoStatCard('On Trip', onTrip, 'Currently dispatched')}
        ${isoStatCard('Attention', attentionTanks + openAlerts, attentionTanks + ' tank issues · ' + openAlerts + ' open alerts')}
      </div>

      <div class="cdx-grid2">
        <div class="section">
          <div class="section-head"><h3>Yard Summary</h3><span class="eyebrow">${Object.keys(byBlock).length} block${Object.keys(byBlock).length === 1 ? '' : 's'}</span></div>
          <div class="section-body">
            ${Object.keys(byBlock).length
              ? `<div class="tablewrap"><table class="cdx-table"><thead><tr><th>Block</th><th>Tanks</th></tr></thead><tbody>
                  ${Object.entries(byBlock).map(([b,c]) => `<tr><td>${escapeHtml(b)}</td><td>${c}</td></tr>`).join('')}
                </tbody></table></div>`
              : isoEmptyState('No yard data yet', 'Assign tanks to blocks in Yard Layout.')}
          </div>
        </div>

        <div class="section">
          <div class="section-head"><h3>Haulage Summary</h3><span class="eyebrow">${(trips||[]).length} trip${(trips||[]).length === 1 ? '' : 's'}</span></div>
          <div class="section-body">
            ${Object.keys(tripByStatus).length
              ? `<div class="tablewrap"><table class="cdx-table"><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>
                  ${Object.entries(tripByStatus).map(([s,c]) => `<tr><td>${escapeHtml(s)}</td><td>${c}</td></tr>`).join('')}
                </tbody></table></div>`
              : isoEmptyState('No trips yet', 'Trips created in Dispatch Board will show here.')}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head"><h3>Recent Activity</h3></div>
        <div class="section-body">
          ${recent.length
            ? `<div class="tablewrap"><table class="cdx-table"><thead><tr><th>When</th><th>Tank</th><th>Action</th><th>From</th><th>To</th><th>By</th></tr></thead><tbody>
                ${recent.map(m => `<tr>
                  <td>${escapeHtml(m.at ? fmtDate(String(m.at).slice(0,10)) : '—')}</td>
                  <td>${escapeHtml(m.tankNumber || m.tankId || '—')}</td>
                  <td>${escapeHtml(m.action || '—')}</td>
                  <td>${escapeHtml(m.fromLocation || '—')}</td>
                  <td>${escapeHtml(m.toLocation || '—')}</td>
                  <td>${escapeHtml(m.actor || '—')}</td>
                </tr>`).join('')}
              </tbody></table></div>`
            : isoEmptyState('No activity yet', 'Gate events, slot moves and trip updates will appear here.')}
        </div>
      </div>

      ${openAlerts > 0 ? `
      <div class="section">
        <div class="section-head"><h3>Action Required</h3><span class="eyebrow">${openAlerts} open alert${openAlerts === 1 ? '' : 's'}</span></div>
        <div class="section-body">
          <div class="tablewrap"><table class="cdx-table"><thead><tr><th>Priority</th><th>Category</th><th>Entity</th><th>Detected</th><th>Status</th></tr></thead><tbody>
            ${(alerts || []).filter(a => a && String(a.status || '') !== 'Resolved').slice(0,10).map(a => `<tr>
              <td>${isoStatusBadge(a.priority)}</td>
              <td>${escapeHtml(a.issueCategory || '—')}</td>
              <td>${escapeHtml(a.linkedEntityRef || a.linkedEntityId || '—')}</td>
              <td>${escapeHtml(a.detectedDate ? fmtDate(a.detectedDate) : '—')}</td>
              <td>${isoStatusBadge(a.status)}</td>
            </tr>`).join('')}
          </tbody></table></div>
        </div>
      </div>` : ''}
    `;
    return wrap;
  }

  /* ---------- 3B. REGISTRY + PASSPORT ---------- */
  async function renderIsoRegistry(){
    const root = document.createElement('div');
    async function showList(){
      isoForgetOpen();
      await isoEnsureAssetIds();
      const listWrap = await renderDataPage('isoTanks', {
        wrapperClass: 'opkpi-modern-page',
        filterFields: ['operationalStatus','certificateStatus'],
        onAddRow: () => openAddRowModal('isoTanks', async () => { await isoEnsureAssetIds(); await showList(); }, {
          completeLabel: 'Save &amp; Open Passport',
          onComplete: async () => { await isoEnsureAssetIds(); await renderIsoPassportDetail(root, 0, showList); },
        }),
        tableOptions: {
          linkColumnId: 'tankNumber',
          visibleColumnIds: [
            'tankNumber','owner','customer','tankType','capacity','capacityUnit',
            'operationalStatus','currentLocation','blockName','slotNo',
            'inspectionStatus','certificateStatus'
          ],
          onLinkClick: async index => { await renderIsoPassportDetail(root, index, showList); },
          onEditRow: async index => { await openEditRowModal('isoTanks', index, async () => { await showList(); }); },
        },
      });
      ['#importBtn','#undoBtn','#importFile'].forEach(sel => {
        const el = listWrap.querySelector(sel); if (el) el.style.display = 'none';
      });
      root.innerHTML = '';
      root.appendChild(listWrap);
    }
    await isoEnsureAssetIds();
    const openIdx = isoRecallOpenIndex(await getData('isoTanks'));
    if (openIdx >= 0) await renderIsoPassportDetail(root, openIdx, showList);
    else await showList();
    return root;
  }

  function isoOverviewPanel(tank){
    const fields = [
      ['Tank Number',tank.tankNumber],['Tank Type',tank.tankType],['Equipment Type',tank.equipmentType],
      ['Owner',tank.owner],['Customer',tank.customer],
      ['Capacity', tank.capacity ? `${tank.capacity} ${tank.capacityUnit || ''}`.trim() : ''],
      ['Tare Weight', tank.tareWeight ? `${tank.tareWeight} ${tank.tareWeightUnit || ''}`.trim() : ''],
      ['Max Gross Weight', tank.maxGrossWeight ? `${tank.maxGrossWeight} ${tank.maxGrossWeightUnit || ''}`.trim() : ''],
      ['Current Location',tank.currentLocation],['Block',tank.blockName],['Slot',tank.slotNo],
      ['Inspection Status',tank.inspectionStatus],['Certificate Status',tank.certificateStatus],
      ['Last Activity', tank.lastActivityAt ? fmtDate(tank.lastActivityAt) : ''],
      ['Created', tank.createdAt ? `${fmtDate(tank.createdAt)}${tank.createdBy ? ' · ' + tank.createdBy : ''}` : ''],
      ['Last Updated', tank.updatedAt ? `${fmtDate(tank.updatedAt)}${tank.updatedBy ? ' · ' + tank.updatedBy : ''}` : ''],
    ];
    return `<div class="section">
      <div class="section-head"><h3>Equipment Specifications</h3></div>
      <div class="section-body">
        <div class="pm-detail-grid">
          ${fields.map(([l,v]) => `<div class="pm-detail-row"><span class="pm-detail-lbl">${escapeHtml(l)}</span><span class="pm-detail-val">${escapeHtml(String(v || '—'))}</span></div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function isoTablePanel(title, rows, colSpec, emptyMsg){
    if (!rows || !rows.length){
      return `<div class="section"><div class="section-head"><h3>${escapeHtml(title)}</h3></div>
        <div class="section-body">${isoEmptyState('No records yet', emptyMsg || 'Records will appear here once activity is logged.')}</div></div>`;
    }
    return `<div class="section">
      <div class="section-head"><h3>${escapeHtml(title)}</h3><span class="eyebrow">${rows.length} record${rows.length === 1 ? '' : 's'}</span></div>
      <div class="section-body">
        <div class="tablewrap"><table class="cdx-table">
          <thead><tr>${colSpec.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(r => `<tr>${colSpec.map(c => {
              const v = r[c.id];
              let out;
              if (c.type === 'date') out = v ? fmtDate(v) : '—';
              else if (c.type === 'status') out = isoStatusBadge(v);
              else out = v ? escapeHtml(String(v)) : '—';
              return `<td>${out}</td>`;
            }).join('')}</tr>`).join('')}
          </tbody>
        </table></div>
      </div>
    </div>`;
  }

  async function renderIsoPassportDetail(root, index, onBack){
    const tanks = await getData('isoTanks');
    const tank = tanks[index];
    if (!tank){ await onBack(); return; }
    isoRememberOpen(tank);

    const [movements, cleaning, inspections, certificates, maintenance, audits] = await Promise.all([
      getData('isoTankMovements').catch(() => []),
      getData('isoCleaningJobs').catch(() => []),
      getData('isoInspections').catch(() => []),
      getData('isoCertificates').catch(() => []),
      getData('isoMaintenanceOrders').catch(() => []),
      getData('isoAuditEvents').catch(() => []),
    ]);
    const byTank = arr => (arr || []).filter(r => r && String(r.tankId || '') === String(tank.tankId || ''));
    const sortDesc = (arr, k) => arr.slice().sort((a,b) => String(b[k] || '').localeCompare(String(a[k] || '')));

    const myMovements = sortDesc(byTank(movements), 'at');
    const myCleaning = sortDesc(byTank(cleaning), 'plannedStart');
    const myInspections = sortDesc(byTank(inspections), 'scheduledDate');
    const myCertificates = sortDesc(byTank(certificates), 'issueDate');
    const myMaintenance = sortDesc(byTank(maintenance), 'reportedDate');
    const myAudits = sortDesc((audits || []).filter(r => r && String(r.entityId || '') === String(tank.tankId || '')), 'timestamp');

    let activeTab = 'overview';

    function paint(){
      const days = isoDaysInYard(tank);
      const loc = [tank.blockName, tank.slotNo].filter(Boolean).join(' · ') || '—';
      root.innerHTML = `
        <div class="pm-detail-head">
          <button class="btn" id="isoBack">&#8592; Back</button>
          <div>
            <span class="truckchip">${escapeHtml(isoTankDisplay(tank))}</span>
            <span class="pm-detail-sub">${escapeHtml(tank.tankType || '')}${tank.owner ? ' · ' + escapeHtml(tank.owner) : ''}</span>
          </div>
          <div class="spacer"></div>
          ${isoStatusBadge(tank.operationalStatus)}
          <button class="btn primary" id="isoEdit" style="margin-left:10px;">&#9998; Edit Details</button>
        </div>

        <div class="cdx-statgrid" style="margin-bottom:18px;">
          ${isoStatCard('Owner', tank.owner || '—', '')}
          ${isoStatCard('Customer', tank.customer || '—', '')}
          ${isoStatCard('Location', loc, days > 0 ? days + ' day' + (days === 1 ? '' : 's') + ' in yard' : '')}
          ${isoStatCard('Inspection', tank.inspectionStatus || '—', '')}
          ${isoStatCard('Certificate', tank.certificateStatus || '—', '')}
        </div>

        <div class="cdx-tabs">
          ${[['overview','Overview',null],['movements','Movements',myMovements.length],['cleaning','Cleaning',myCleaning.length],['inspection','Inspection',myInspections.length],['certificates','Certificates',myCertificates.length],['maintenance','Maintenance',myMaintenance.length],['activity','Activity',myAudits.length]]
            .map(([k,lbl,n]) => `<button class="cdx-tab${activeTab === k ? ' active' : ''}" data-tab="${k}">${escapeHtml(lbl)}${n != null ? ` <span class="count">${n}</span>` : ''}</button>`).join('')}
        </div>

        <div class="cdx-panel${activeTab === 'overview' ? ' active' : ''}" data-panel="overview">${isoOverviewPanel(tank)}</div>
        <div class="cdx-panel${activeTab === 'movements' ? ' active' : ''}" data-panel="movements">
          ${isoTablePanel('Movement History', myMovements, [
            {id:'at',label:'Date',type:'date'},{id:'action',label:'Action'},{id:'fromLocation',label:'From'},
            {id:'toLocation',label:'To'},{id:'referenceId',label:'Reference'},{id:'actor',label:'By'},{id:'notes',label:'Notes'},
          ], 'Gate events, slot moves, and trip links will appear here.')}
        </div>
        <div class="cdx-panel${activeTab === 'cleaning' ? ' active' : ''}" data-panel="cleaning">
          ${isoTablePanel('Cleaning Jobs', myCleaning, [
            {id:'plannedStart',label:'Planned',type:'date'},{id:'actualComplete',label:'Completed',type:'date'},
            {id:'vendor',label:'Vendor'},{id:'status',label:'Status',type:'status'},{id:'cost',label:'Cost (RM)'},
          ], 'Cleaning work orders for this tank will appear here.')}
        </div>
        <div class="cdx-panel${activeTab === 'inspection' ? ' active' : ''}" data-panel="inspection">
          ${isoTablePanel('Inspections', myInspections, [
            {id:'scheduledDate',label:'Scheduled',type:'date'},{id:'actualDate',label:'Actual',type:'date'},
            {id:'inspectionType',label:'Type'},{id:'inspector',label:'Inspector'},
            {id:'status',label:'Status',type:'status'},{id:'findings',label:'Findings'},
          ], 'Inspection records for this tank will appear here.')}
        </div>
        <div class="cdx-panel${activeTab === 'certificates' ? ' active' : ''}" data-panel="certificates">
          ${isoTablePanel('Certificates', myCertificates, [
            {id:'certificateType',label:'Type'},{id:'documentRef',label:'Ref'},
            {id:'issueDate',label:'Issued',type:'date'},{id:'expiryDate',label:'Expires',type:'date'},
            {id:'issuer',label:'Issuer'},{id:'reminderStatus',label:'Status',type:'status'},
          ], 'Uploaded certificates for this tank will appear here.')}
        </div>
        <div class="cdx-panel${activeTab === 'maintenance' ? ' active' : ''}" data-panel="maintenance">
          ${isoTablePanel('Maintenance & Repair', myMaintenance, [
            {id:'reportedDate',label:'Reported',type:'date'},{id:'issueCategory',label:'Category'},
            {id:'description',label:'Description'},{id:'priority',label:'Priority'},
            {id:'status',label:'Status',type:'status'},{id:'cost',label:'Cost (RM)'},
          ], 'Repair work orders for this tank will appear here.')}
        </div>
        <div class="cdx-panel${activeTab === 'activity' ? ' active' : ''}" data-panel="activity">
          ${isoTablePanel('Activity Timeline', myAudits, [
            {id:'timestamp',label:'When',type:'date'},{id:'actor',label:'Who'},{id:'actionType',label:'Action'},
            {id:'entityType',label:'Entity'},{id:'referenceId',label:'Reference'},
          ], 'Audit trail for this tank will appear here.')}
        </div>
      `;

      root.querySelector('#isoBack').onclick = async () => { isoForgetOpen(); await onBack(); };
      root.querySelector('#isoEdit').onclick = async () => {
        const data = await getData('isoTanks');
        const i = data.findIndex(r => r && String(r.tankId || '') === String(tank.tankId || ''));
        await openEditRowModal('isoTanks', i < 0 ? index : i, async () => {
          const fresh = await getData('isoTanks');
          const f = fresh[i < 0 ? index : i];
          if (f) Object.assign(tank, f);
          paint();
        });
      };
      root.querySelectorAll('[data-tab]').forEach(btn => {
        btn.onclick = () => {
          activeTab = btn.dataset.tab;
          root.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
          root.querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('active', p.dataset.panel === activeTab));
        };
      });
    }
    paint();
  }

  async function renderIsoPassport(){ return await renderIsoRegistry(); }

  /* ---------- 3C. YARD ---------- */
  async function isoLoadYardLayout(){
    const rows = await getData('isoYardLayout').catch(() => []);
    if (Array.isArray(rows) && rows.length) return rows[0];
    return { layoutId:'iso-layout-default', depotName:'ISO Tank Yard', blocks:[] };
  }
  async function isoSaveYardLayout(layout){
    DATA_CACHE.isoYardLayout = [layout];
    await persist('isoYardLayout');
  }
  function isoSlotNo(rowLetter, col){
    return rowLetter + '-' + String(col).padStart(2, '0');
  }

  async function renderIsoYard(){
    const wrap = document.createElement('div');
    let layout = await isoLoadYardLayout();
    let activeBlockId = layout.blocks && layout.blocks[0] ? layout.blocks[0].blockId : '';

    async function paint(){
      const tanks = (await getData('isoTanks').catch(() => [])).filter(t => t && t.archived !== 'Yes');
      const blocks = (layout.blocks || []).slice().sort((a,b) => (a.order || 0) - (b.order || 0));
      if (blocks.length && !blocks.find(b => b.blockId === activeBlockId)) activeBlockId = blocks[0].blockId;

      wrap.innerHTML = `
        <div class="section">
          <div class="section-head">
            <h3>ISO Tank Yard</h3>
            <span class="eyebrow">${blocks.length} block${blocks.length === 1 ? '' : 's'} · ${tanks.length} tank${tanks.length === 1 ? '' : 's'}</span>
            <div class="spacer"></div>
            <button class="btn primary" id="isoYardAddBlock">+ Add Block</button>
          </div>
          <div class="section-body">
            ${blocks.length ? `
              <div class="depot-tabs">
                ${blocks.map(b => {
                  const isActive = b.blockId === activeBlockId;
                  const used = tanks.filter(t => String(t.blockName || '').toUpperCase() === String(b.name || '').toUpperCase()).length;
                  const cap = (b.cols || 0) * (b.rows || 0);
                  return `<button class="depot-tab${isActive ? ' is-active' : ''}" data-block-id="${b.blockId}">
                    <span class="depot-tab-color" style="background:${b.color || '#1aa39a'};"></span>
                    <span class="depot-tab-name">Block ${escapeHtml(b.name || '?')}</span>
                    <span class="depot-tab-count">${used}/${cap}</span>
                    ${isActive ? `<span class="iso-blk-edit" data-blk-edit="${b.blockId}" title="Rename / Delete Block" style="margin-left:8px;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,.15);cursor:pointer;font-size:11px;">✎</span>` : ''}
                  </button>`;
                }).join('')}
              </div>
              <div style="margin-top:16px;" id="isoYardGridHost"></div>
            ` : isoEmptyState('No blocks configured yet', 'Press "+ Add Block" to define your first yard block (rows × columns).')}
          </div>
        </div>
      `;

      const addBlockBtn = wrap.querySelector('#isoYardAddBlock');
      if (addBlockBtn) addBlockBtn.onclick = () => openIsoBlockEditor(null, layout, async () => { await paint(); });

      wrap.querySelectorAll('.depot-tab').forEach(tab => {
        tab.onclick = async () => { activeBlockId = tab.dataset.blockId; await paint(); };
      });
            wrap.querySelectorAll('[data-blk-edit]').forEach(el => {
        el.onclick = (e) => {
          e.stopPropagation();
          const b = blocks.find(x => x.blockId === el.dataset.blkEdit);
          if (!b) return;
          openIsoBlockEditor(b, layout, async () => { await paint(); });
        };
      });

      const host = wrap.querySelector('#isoYardGridHost');
      if (host && blocks.length){
        const block = blocks.find(b => b.blockId === activeBlockId);
        if (block) host.innerHTML = isoRenderYardGrid(block, tanks);
        isoWireYardGrid(host, block, tanks, layout, paint);
      }
    }

    await paint();
    return wrap;
  }

  function isoRenderYardGrid(block, tanks){
    const cols = Number(block.cols) || 6;
    const rows = Number(block.rows) || 6;
    const blockName = String(block.name || '').toUpperCase();
    const tanksInBlock = tanks.filter(t => String(t.blockName || '').toUpperCase() === blockName);
    const headerCols = Array.from({ length: cols }, (_, i) => `<div class="depot-grid-col-header">${String(i + 1).padStart(2,'0')}</div>`).join('');
    const gridRows = [];
    for (let r = 1; r <= rows; r++){
      const rowLetter = String.fromCharCode(64 + r);
      const cells = [];
      for (let c = 1; c <= cols; c++){
        const slotNo = isoSlotNo(rowLetter, c);
        const tank = tanksInBlock.find(t => window.isoNormSlot(t.slotNo) === slotNo);
        if (tank){
          const sc = ISO_STATUS_COLORS[String(tank.operationalStatus || '')] || '#1aa39a';
          cells.push(`<div class="depot-slot is-occupied" data-slot="${slotNo}" data-tank-id="${escapeHtml(tank.tankId || '')}" title="${escapeHtml(isoTankDisplay(tank))}">
            <div class="depot-slot-no">${slotNo}</div>
            <div class="depot-slot-body">
              <span class="depot-slot-dot" style="background:${sc};"></span>
              <span class="depot-slot-no-container">${escapeHtml(String(tank.tankNumber || tank.tankId || '').slice(0,16))}</span>
            </div>
            <div class="depot-slot-status" style="color:${sc};">${escapeHtml(String(tank.operationalStatus || ''))}</div>
          </div>`);
        } else {
          cells.push(`<div class="depot-slot is-empty" data-slot="${slotNo}" title="Empty — click to assign tank">
            <div class="depot-slot-no">${slotNo}</div>
            <div class="depot-slot-empty">+</div>
          </div>`);
        }
      }
      gridRows.push(`<div class="depot-grid-row"><div class="depot-grid-row-header">${rowLetter}</div>${cells.join('')}</div>`);
    }
    return `<div class="depot-grid-wrap">
      <div class="depot-grid-inner" style="--grid-cols:${cols};--stack-limit:1;">
        <div class="depot-grid-header-row"><div class="depot-grid-row-header is-corner"></div>${headerCols}</div>
        ${gridRows.join('')}
      </div>
    </div>
    <div class="depot-legend">
      <span class="depot-legend-item"><span class="depot-legend-dot" style="background:#3f9a6e;"></span> Available</span>
      <span class="depot-legend-item"><span class="depot-legend-dot" style="background:#4f7fd1;"></span> On Trip</span>
      <span class="depot-legend-item"><span class="depot-legend-dot" style="background:#e6a339;"></span> Maintenance</span>
      <span class="depot-legend-item"><span class="depot-legend-dot is-empty"></span> Empty slot</span>
    </div>`;
  }

  function isoWireYardGrid(host, block, tanks, layout, repaint){
    host.querySelectorAll('.depot-slot.is-occupied').forEach(el => {
      el.onclick = async () => {
        const tankId = el.dataset.tankId;
        const all = await getData('isoTanks');
        const idx = all.findIndex(t => t && String(t.tankId || '') === String(tankId));
        if (idx < 0) return;
        openIsoTankQuickView(all[idx]);
      };
    });
    host.querySelectorAll('.depot-slot.is-empty').forEach(el => {
      el.onclick = () => openIsoAssignTankModal(block, el.dataset.slot, tanks, layout, repaint);
    });
  }

  function openIsoTankQuickView(tank){
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal','user-modal','bugreport-modal');
    box.innerHTML = `
      <h4>${escapeHtml(isoTankDisplay(tank))}</h4>
      <div class="pm-detail-grid">
        <div class="pm-detail-row"><span class="pm-detail-lbl">Status</span><span class="pm-detail-val">${isoStatusBadge(tank.operationalStatus)}</span></div>
        <div class="pm-detail-row"><span class="pm-detail-lbl">Owner</span><span class="pm-detail-val">${escapeHtml(tank.owner || '—')}</span></div>
        <div class="pm-detail-row"><span class="pm-detail-lbl">Customer</span><span class="pm-detail-val">${escapeHtml(tank.customer || '—')}</span></div>
        <div class="pm-detail-row"><span class="pm-detail-lbl">Location</span><span class="pm-detail-val">${escapeHtml([tank.blockName, tank.slotNo].filter(Boolean).join(' · ') || '—')}</span></div>
      </div>
      <div class="modalfoot">
        <button class="btn" id="isoQuickClose">Close</button>
        <button class="btn primary" id="isoQuickOpen">Open Passport</button>
      </div>`;
    overlay.classList.add('show');
    box.querySelector('#isoQuickClose').onclick = () => overlay.classList.remove('show');
    box.querySelector('#isoQuickOpen').onclick = () => {
      overlay.classList.remove('show');
      isoRememberOpen(tank);
      reloadToRoute('isoTankRegistry');
    };
  }

  function openIsoAssignTankModal(block, slotNo, tanks, layout, onDone){
    const blockName = String(block.name || '').toUpperCase();
    const candidates = tanks.filter(t =>
      String(t.archived || 'No') !== 'Yes' &&
      ['Available','In Yard'].includes(String(t.operationalStatus || '')) &&
      !String(t.blockName || '').trim()
    );
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal','user-modal','bugreport-modal');
    box.innerHTML = `
      <h4>Assign Tank to Slot</h4>
      <div class="notice notice-info" style="margin-bottom:14px;">
        Block <strong>${escapeHtml(block.name || '?')}</strong> · Slot <strong>${escapeHtml(slotNo)}</strong>
      </div>
      ${candidates.length ? `
        <div class="formfield full">
          <label>Choose Tank *</label>
          <select id="isoAssignTank" class="searchbox" style="max-width:none;">
            <option value="">— Select —</option>
            ${candidates.map(t => `<option value="${escapeHtml(t.tankId || t.assetId || '')}">${escapeHtml(isoTankDisplay(t))}${t.owner ? ' · ' + escapeHtml(t.owner) : ''}</option>`).join('')}
          </select>
        </div>
      ` : `<div class="notice notice-warning">No available tanks to assign. All tanks are either already in yard, on trip, or out of service.</div>`}
      <div class="modalfoot">
        <button class="btn" id="isoAssignCancel">Cancel</button>
        <button class="btn primary" id="isoAssignConfirm" ${candidates.length ? '' : 'disabled'}>Assign</button>
      </div>`;
    overlay.classList.add('show');
    box.querySelector('#isoAssignCancel').onclick = () => overlay.classList.remove('show');
    box.querySelector('#isoAssignConfirm').onclick = async () => {
      const sel = box.querySelector('#isoAssignTank');
      if (!sel) return;
      const tankId = String(sel.value || '').trim();
      if (!tankId){ alert('Choose a tank first.'); return; }
      const all = await getData('isoTanks');
      const idx = all.findIndex(t => t && String(t.tankId || '') === tankId);
      if (idx < 0) return;
      const today = new Date().toISOString().slice(0,10);
      const who = (typeof getSessionEmail === 'function') ? (getSessionEmail() || '') : '';
      all[idx] = Object.assign({}, all[idx], {
        blockName: blockName, slotNo: slotNo,
        currentLocation: 'Block ' + blockName,
        operationalStatus: 'In Yard',
        lastActivityAt: today, updatedAt: today, updatedBy: who,
      });
      DATA_CACHE.isoTanks = all;
      await persist('isoTanks');
      overlay.classList.remove('show');
      if (onDone) await onDone();
    };
  }

  function openIsoBlockEditor(existing, layout, onDone){
    const isEdit = !!existing;
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    const color = existing ? (existing.color || ISO_BLOCK_COLORS[0]) : ISO_BLOCK_COLORS[(layout.blocks || []).length % ISO_BLOCK_COLORS.length];
    let chosenColor = color;
    box.classList.remove('opkpi-modal','user-modal','bugreport-modal');
    box.innerHTML = `
      <h4>${isEdit ? 'Edit Block' : 'Add Block'}</h4>
      <div class="formgrid">
        <div class="formfield"><label>Block Name *</label>
          <input type="text" id="isoBlkName" maxlength="6" value="${existing ? escapeHtml(existing.name || '') : ''}" placeholder="e.g. A" style="text-transform:uppercase;">
        </div>
        <div class="formfield"><label>Columns *</label>
          <input type="number" id="isoBlkCols" min="1" max="30" step="1" value="${existing ? (existing.cols || 6) : 6}">
        </div>
        <div class="formfield"><label>Rows *</label>
          <input type="number" id="isoBlkRows" min="1" max="30" step="1" value="${existing ? (existing.rows || 6) : 6}">
        </div>
        <div class="formfield full"><label>Color</label>
          <div class="depot-color-picker">
            ${ISO_BLOCK_COLORS.map(c => `<div class="depot-color-swatch${c === color ? ' is-active' : ''}" data-color="${c}" style="background:${c};"></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="settings-note" id="isoBlkError" style="color:var(--red);display:none;"></div>
      <div class="modalfoot">
        ${isEdit ? `<button class="btn danger" id="isoBlkDelete" style="margin-right:auto;">Delete Block</button>` : ''}
        <button class="btn" id="isoBlkCancel">Cancel</button>
        <button class="btn primary" id="isoBlkSave">${isEdit ? 'Save Changes' : 'Add Block'}</button>
      </div>`;
    overlay.classList.add('show');
    box.querySelectorAll('.depot-color-swatch').forEach(sw => {
      sw.onclick = () => {
        box.querySelectorAll('.depot-color-swatch').forEach(x => x.classList.remove('is-active'));
        sw.classList.add('is-active');
        chosenColor = sw.dataset.color;
      };
    });
    box.querySelector('#isoBlkCancel').onclick = () => overlay.classList.remove('show');
    const delBtn = box.querySelector('#isoBlkDelete');
    if (delBtn) delBtn.onclick = async () => {
      if (!confirm('Delete this block? Tanks in it will lose their location.')) return;
      layout.blocks = (layout.blocks || []).filter(b => b.blockId !== existing.blockId);
      await isoSaveYardLayout(layout);
      overlay.classList.remove('show');
      if (onDone) await onDone();
    };
    box.querySelector('#isoBlkSave').onclick = async () => {
      const errEl = box.querySelector('#isoBlkError');
      const name = String(box.querySelector('#isoBlkName').value || '').trim().toUpperCase();
      const cols = parseInt(box.querySelector('#isoBlkCols').value, 10);
      const rows = parseInt(box.querySelector('#isoBlkRows').value, 10);
      if (!name){ errEl.style.display='block'; errEl.textContent='Block name required.'; return; }
      if (!(cols >= 1 && cols <= 30)){ errEl.style.display='block'; errEl.textContent='Columns 1–30.'; return; }
      if (!(rows >= 1 && rows <= 30)){ errEl.style.display='block'; errEl.textContent='Rows 1–30.'; return; }
      const dup = (layout.blocks || []).some(b => String(b.name || '').toUpperCase() === name && (!isEdit || b.blockId !== existing.blockId));
      if (dup){ errEl.style.display='block'; errEl.textContent='Block name already used.'; return; }
      layout.blocks = layout.blocks || [];
      if (isEdit){
        const i = layout.blocks.findIndex(b => b.blockId === existing.blockId);
        if (i >= 0) layout.blocks[i] = { ...layout.blocks[i], name, cols, rows, color: chosenColor };
      } else {
        const maxOrder = layout.blocks.reduce((m,b) => Math.max(m, b.order || 0), 0);
        layout.blocks.push({
          blockId: 'isoblk-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
          name, cols, rows, color: chosenColor, order: maxOrder + 1,
        });
      }
      await isoSaveYardLayout(layout);
      overlay.classList.remove('show');
      if (onDone) await onDone();
    };
  }

  /* =====================================================================
     SEKSYEN 4 — DAFTAR 12 ROUTES (4 sebenar + 8 placeholder)
     ===================================================================== */

  ROUTES.isoTankDashboard   = { title:'ISO Tank Dashboard',        crumb:'ISO Tank', render: renderIsoDashboard };
  ROUTES.isoTankRegistry    = { title:'ISO Tank Registry',         crumb:'ISO Tank', render: renderIsoRegistry  };
  ROUTES.isoTankPassport    = { title:'ISO Tank Digital Passport', crumb:'ISO Tank', render: renderIsoPassport  };
  ROUTES.isoTankYard        = { title:'Yard Layout & Inventory',   crumb:'ISO Tank', render: renderIsoYard      };

  ROUTES.isoTankDispatch    = { title:'Haulage Dispatch Board',    crumb:'ISO Tank', render: isoSkeletonRenderer('isoTankDispatch', {
    title:'Haulage Dispatch Board',
    description:'Manage assignments dan track trips melibatkan ISO tank, trucks dan drivers.',
    kpis:[{label:'Planned',note:'Awaiting assignment'},{label:'Assigned',note:'Ready to dispatch'},{label:'In Transit',note:'Currently moving'},{label:'Completed',note:'This week'}],
  })};
  ROUTES.isoTankGate        = { title:'Gate In / Gate Out',        crumb:'ISO Tank', render: isoSkeletonRenderer('isoTankGate', {
    title:'Gate In / Gate Out',
    description:'Rekod physical entry dan departure tank. Setiap gate event update location ISO tank secara konsisten.',
    kpis:[{label:'Gate In Today',note:'Received'},{label:'Gate Out Today',note:'Dispatched'},{label:'Pending Check',note:'Awaiting'},{label:'This Week',note:'Total movements'}],
  })};
  ROUTES.isoTankCleaning    = { title:'Cleaning Management',       crumb:'ISO Tank', render: isoSkeletonRenderer('isoTankCleaning', {
    title:'Cleaning Management',
    description:'Track cleaning requests, work progress, evidence dan completion verification.',
    kpis:[{label:'Pending',note:'Awaiting schedule'},{label:'In Progress',note:'Currently cleaning'},{label:'Awaiting Verification',note:'Submitted'},{label:'Completed',note:'This week'}],
  })};
  ROUTES.isoTankMaintenance = { title:'Maintenance & Repair',      crumb:'ISO Tank', render: isoSkeletonRenderer('isoTankMaintenance', {
    title:'Maintenance & Repair',
    description:'Damage reports, maintenance requests, repair work dan downtime tracking.',
    kpis:[{label:'Open Work Orders',note:'Awaiting action'},{label:'Under Repair',note:'In workshop'},{label:'Awaiting Parts',note:'Blocked'},{label:'Completed',note:'This month'}],
  })};
  ROUTES.isoTankInspection  = { title:'Inspection & Certificate',  crumb:'ISO Tank', render: isoSkeletonRenderer('isoTankInspection', {
    title:'Inspection & Certificate Control',
    description:'Track tank inspections, follow-up actions dan certificates. Inspection dan certificates ialah entiti berasingan.',
    kpis:[{label:'Inspections Due',note:'Upcoming'},{label:'Failed Inspections',note:'Require follow-up'},{label:'Certificates Due',note:'Within 30 days'},{label:'Expired',note:'Action required'}],
  })};
  ROUTES.isoTankAlerts      = { title:'Exception & Alert Centre',  crumb:'ISO Tank', render: isoSkeletonRenderer('isoTankAlerts', {
    title:'Exception & Alert Centre',
    description:'Collect dan manage operational issues across all ISO tank modules.',
    kpis:[{label:'Critical',note:'Immediate action'},{label:'High',note:'Priority'},{label:'Medium',note:'Monitor'},{label:'Informational',note:'FYI only'}],
  })};
  ROUTES.isoTankCustomers   = { title:'Customer & Job Management', crumb:'ISO Tank', render: isoSkeletonRenderer('isoTankCustomers', {
    title:'Customer & Job Management',
    description:'Manage customer information dan operational jobs melibatkan tanks, cleaning dan haulage.',
    kpis:[{label:'Total Customers',note:'Registered'},{label:'Active',note:'Engaged'},{label:'Open Jobs',note:'In progress'},{label:'This Month',note:'Jobs created'}],
  })};
  ROUTES.isoTankReports     = { title:'Reports & Analytics',       crumb:'ISO Tank', render: isoSkeletonRenderer('isoTankReports', {
    title:'Reports & Analytics',
    description:'Operational dan management reporting. Export PDF, Excel, print-friendly views.',
    kpis:[{label:'Total Tanks',note:'All time'},{label:'Yard Occupancy',note:'Average'},{label:'Trips Completed',note:'This month'},{label:'Avg Days in Yard',note:'Rolling 30 days'}],
  })};

  /* =====================================================================
     SEKSYEN 5 — NAV_ENTRY → push ke NAV_STRUCTURE
     ===================================================================== */

  NAV_STRUCTURE.push({
    group: 'ISO Tank Depot',
    dot: '#1aa39a',
    items: [
      { key:'isoTankDashboard',   label:'Dashboard' },
      { key:'isoTankRegistry',    label:'Tank Registry' },
      { key:'isoTankPassport',    label:'Digital Passport' },
      { key:'isoTankYard',        label:'Yard Layout' },
      { key:'isoTankDispatch',    label:'Dispatch Board' },
      { key:'isoTankGate',        label:'Gate In / Out' },
      { key:'isoTankCleaning',    label:'Cleaning' },
      { key:'isoTankMaintenance', label:'Maintenance' },
      { key:'isoTankInspection',  label:'Inspection & Cert' },
      { key:'isoTankAlerts',      label:'Alerts' },
      { key:'isoTankCustomers',   label:'Customers & Jobs' },
      { key:'isoTankReports',     label:'Reports' },
    ],
  });

  /* =====================================================================
     SEKSYEN 6 — 13 tableKey → SUPABASE_NATIVE_TABLES
     ===================================================================== */

  [
    'isoTanks','isoTankMovements','isoGateEvents','isoYardLayout',
    'isoCustomers','isoJobs','isoTrips','isoCleaningJobs',
    'isoMaintenanceOrders','isoInspections','isoCertificates',
    'isoAlerts','isoAuditEvents'
  ].forEach(k => SUPABASE_NATIVE_TABLES.add(k));

  /* =====================================================================
     LOG
     ===================================================================== */

  console.log('[ISO Tank] Fasa 2 registered: 13 tables, 12 routes, 1 nav group, 13 supabase keys');

})();

/* =========================================================================
   FOCC ISO TANK DEPOT — Fasa 3
   =========================================================================
   Operational Movement:
     · isoTankCustomers   — Customer & Job Management
     · isoTankGate        — Gate In / Gate Out
     · isoTankDispatch    — Haulage Dispatch Board
   =========================================================================
   Ganti 3 route placeholder Fasa 2 dengan renderer sebenar.
   Self-contained — tak bergantung pada Fasa 2 internals.

   Prinsip:
   · Atomic-ish: persist isoTanks dulu (kritikal), history table best-effort.
   · Validated status transitions untuk trips (Planned→Assigned→...→Completed).
   · Tiada auto-update tank dari Dispatch bila status tukar — explicit.
   ========================================================================= */

(function(){
  'use strict';

  /* ---------------------------------------------------------------------
     HELPERS
     --------------------------------------------------------------------- */

  function isoId(prefix){
    const p = String(prefix || 'ISO').toUpperCase();
    try{ if (window.crypto && crypto.randomUUID) return p + '-' + crypto.randomUUID(); }catch(e){}
    return p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
  }

  function isoToday(){ return new Date().toISOString().slice(0,10); }
  function isoNow(){ return new Date().toISOString().slice(0,16).replace('T',' '); }

  function isoStatusBadge(status){
    const s = String(status || '').trim();
    if (!s) return '<span class="badge neutral">&mdash;</span>';
    return badgeFor(s);   // guna global badgeFor() sedia ada
  }

  function isoDatalist(id, items){
    return `<datalist id="${id}">${(items || []).map(v => `<option value="${escapeHtml(String(v))}"></option>`).join('')}</datalist>`;
  }

  function isoActor(){
    return (typeof getSessionEmail === 'function') ? (getSessionEmail() || '') : '';
  }

  /* Best-effort atomic-ish persist.
     Persist isoTanks DULU (kritikal). Kalau berjaya, baru history table.
     Kalau history gagal, log warning — jangan block user (tank status dah betul). */
  async function isoSaveTankWithHistory(tankId, patchTank, historyTable, historyRow){
    const tanks = await getData('isoTanks');
    const i = tanks.findIndex(t => t && String(t.tankId || '') === String(tankId));
    if (i < 0) throw new Error('Tank not found.');

    const today = isoToday();
    const who = isoActor();
    tanks[i] = Object.assign({}, tanks[i], patchTank, {
      lastActivityAt: today,
      updatedAt: today,
      updatedBy: who,
    });
    DATA_CACHE.isoTanks = tanks;
    await persist('isoTanks');   // ← kalau ni gagal, throw ke caller

    // Best-effort history
    try{
      const list = await getData(historyTable);
      list.push(historyRow);
      DATA_CACHE[historyTable] = list;
      await persist(historyTable);
    }catch(e){
      console.warn('[ISO Tank] history append failed (' + historyTable + '):', e);
    }
  }

  function isoHistoryRowMovements(tank, action, fromLoc, toLoc, refType, refId, notes){
    return {
      movementId: isoId('MOV'),
      tankId: tank.tankId || '',
      tankNumber: tank.tankNumber || '',
      action: action,
      fromLocation: fromLoc || '',
      toLocation: toLoc || '',
      referenceType: refType || '',
      referenceId: refId || '',
      notes: notes || '',
      actor: isoActor(),
      at: isoNow(),
    };
  }

  /* =====================================================================
     PAGE 11 — CUSTOMER & JOB MANAGEMENT
     Dua tab: Customers | Jobs. Guna renderDataPage sedia ada.
     ===================================================================== */

  async function renderIsoCustomers(){
    const wrap = document.createElement('div');
    let activeTab = 'customers';
    let customersCache = [];
    let jobsCache = [];

    async function loadData(){
      const [c, j] = await Promise.all([
        getData('isoCustomers').catch(() => []),
        getData('isoJobs').catch(() => []),
      ]);
      customersCache = c || [];
      jobsCache = j || [];
    }

    function tabBar(){
      return `<div class="cdx-tabs" style="margin-bottom:14px;">
        <button class="cdx-tab${activeTab === 'customers' ? ' active' : ''}" data-iso-tab="customers">Customers <span class="count">${customersCache.length}</span></button>
        <button class="cdx-tab${activeTab === 'jobs' ? ' active' : ''}" data-iso-tab="jobs">Jobs <span class="count">${jobsCache.length}</span></button>
      </div>`;
    }

    async function paint(){
      await loadData();
      wrap.innerHTML = `
        <div class="skel-intro">
          <div class="skel-intro-text">
            <div class="skel-crumbs"><span>ISO Tank</span><span class="sep">/</span><span class="current">Customer & Job Management</span></div>
            <p>Manage customer records dan operational jobs — haulage, cleaning, maintenance, inspection, storage.</p>
          </div>
        </div>
        ${tabBar()}
        <div id="isoCustHost"></div>
      `;
      wrap.querySelectorAll('[data-iso-tab]').forEach(btn => {
        btn.onclick = () => { activeTab = btn.dataset.isoTab; paint(); };
      });

      const host = wrap.querySelector('#isoCustHost');
      if (activeTab === 'customers'){
        const listWrap = await renderDataPage('isoCustomers', {
          wrapperClass: 'opkpi-modern-page',
          filterFields: ['status'],
          tableOptions: {
            visibleColumnIds: ['companyName','businessRegNo','contactPerson','email','phone','status'],
            linkColumnId: 'companyName',
            onLinkClick: async index => {
              const c = customersCache[index];
              if (c) openIsoCustomerQuickView(c);
            },
          },
        });
        ['#importBtn','#undoBtn','#importFile'].forEach(s => { const el = listWrap.querySelector(s); if (el) el.style.display = 'none'; });
        host.appendChild(listWrap);
      } else {
        const listWrap = await renderDataPage('isoJobs', {
          wrapperClass: 'opkpi-modern-page',
          filterFields: ['serviceType','status'],
          tableOptions: {
            visibleColumnIds: ['jobId','customer','serviceType','tankNumber','destination','plannedStart','status'],
          },
        });
        ['#importBtn','#undoBtn','#importFile'].forEach(s => { const el = listWrap.querySelector(s); if (el) el.style.display = 'none'; });
        host.appendChild(listWrap);
      }
    }

    function openIsoCustomerQuickView(c){
      const overlay = document.getElementById('modalOverlay');
      const box = document.getElementById('modalBox');
      box.classList.remove('opkpi-modal','user-modal','bugreport-modal');
      box.innerHTML = `
        <h4>${escapeHtml(c.companyName || '(No Name)')}</h4>
        <div class="pm-detail-grid">
          <div class="pm-detail-row"><span class="pm-detail-lbl">Business Reg No.</span><span class="pm-detail-val">${escapeHtml(c.businessRegNo || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Contact Person</span><span class="pm-detail-val">${escapeHtml(c.contactPerson || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Email</span><span class="pm-detail-val">${escapeHtml(c.email || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Phone</span><span class="pm-detail-val">${escapeHtml(c.phone || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Address</span><span class="pm-detail-val">${escapeHtml(c.address || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Status</span><span class="pm-detail-val">${isoStatusBadge(c.status)}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Remarks</span><span class="pm-detail-val">${escapeHtml(c.remarks || '—')}</span></div>
        </div>
        <div class="modalfoot"><button class="btn primary" id="isoCustClose">Close</button></div>`;
      overlay.classList.add('show');
      box.querySelector('#isoCustClose').onclick = () => overlay.classList.remove('show');
    }

    await paint();
    return wrap;
  }

  /* =====================================================================
     PAGE 06 — GATE IN / GATE OUT
     Tiga tab: Gate In | Gate Out | History
     ===================================================================== */

  async function renderIsoGate(){
    const wrap = document.createElement('div');
    let activeTab = 'in';

    async function snapshot(){
      const [tanks, gates] = await Promise.all([
        getData('isoTanks').catch(() => []),
        getData('isoGateEvents').catch(() => []),
      ]);
      return {
        tanks: (tanks || []).filter(t => t && t.archived !== 'Yes'),
        gates: (gates || []).slice().sort((a,b) => {
          const da = String(a.eventDate || '') + ' ' + String(a.eventTime || '');
          const db = String(b.eventDate || '') + ' ' + String(b.eventTime || '');
          return db.localeCompare(da);
        }),
      };
    }

    async function paint(){
      const { tanks, gates } = await snapshot();

      // Tanks dalam yard: blockName ada & status 'In Yard' atau 'Available'
      const inYardTanks = tanks.filter(t => String(t.blockName || '').trim() && ['In Yard','Available'].includes(String(t.operationalStatus || '')));
      // Tanks boleh gate-in: tak de blockName (belum dalam yard), status not On Trip
      const canGateInTanks = tanks.filter(t => !String(t.blockName || '').trim() && String(t.operationalStatus || '') !== 'On Trip');

      wrap.innerHTML = `
        <div class="skel-intro">
          <div class="skel-intro-text">
            <div class="skel-crumbs"><span>ISO Tank</span><span class="sep">/</span><span class="current">Gate In / Gate Out</span></div>
            <p>Record physical entry dan departure ISO tank. Gate event update tank location secara konsisten.</p>
          </div>
        </div>

        <div class="cdx-tabs" style="margin-bottom:14px;">
          <button class="cdx-tab${activeTab === 'in' ? ' active' : ''}" data-iso-gate-tab="in">Gate In <span class="count">${gates.filter(g => g.direction === 'In').length}</span></button>
          <button class="cdx-tab${activeTab === 'out' ? ' active' : ''}" data-iso-gate-tab="out">Gate Out <span class="count">${gates.filter(g => g.direction === 'Out').length}</span></button>
          <button class="cdx-tab${activeTab === 'history' ? ' active' : ''}" data-iso-gate-tab="history">History <span class="count">${gates.length}</span></button>
        </div>

        <div id="isoGateHost"></div>
      `;

      wrap.querySelectorAll('[data-iso-gate-tab]').forEach(btn => {
        btn.onclick = () => { activeTab = btn.dataset.isoGateTab; paint(); };
      });

      const host = wrap.querySelector('#isoGateHost');

      if (activeTab === 'in'){
        host.innerHTML = gateInFormHtml(canGateInTanks);
        wireGateInForm(host, canGateInTanks, paint);
      } else if (activeTab === 'out'){
        host.innerHTML = gateOutFormHtml(inYardTanks);
        wireGateOutForm(host, inYardTanks, paint);
      } else {
        host.innerHTML = gateHistoryHtml(gates);
      }
    }

    /* ---------------- Gate In form ---------------- */
    function gateInFormHtml(tanks){
      return `
        <div class="section">
          <div class="section-head"><h3>Record Gate In</h3><span class="eyebrow">Physical arrival</span></div>
          <div class="section-body">
            <div class="formgrid">
              <div class="formfield"><label>Tank *</label>
                <select id="isoGiTank" ${tanks.length ? '' : 'disabled'}>
                  <option value="">— Select Tank —</option>
                  ${tanks.map(t => `<option value="${escapeHtml(t.tankId || '')}">${escapeHtml(t.tankNumber || t.tankId || '(unnamed)')}${t.owner ? ' · ' + escapeHtml(t.owner) : ''}</option>`).join('')}
                </select>
                ${!tanks.length ? '<div class="settings-note" style="color:var(--warn,#e6a339);">No tanks available for gate-in. All tanks are either already in yard or on trip.</div>' : ''}
              </div>
              <div class="formfield"><label>Customer</label>
                <input type="text" id="isoGiCustomer" placeholder="Optional — customer at delivery">
              </div>
              <div class="formfield"><label>Truck Registration</label>
                <input type="text" id="isoGiTruck" placeholder="e.g. CDM 5679" autocomplete="off">
              </div>
              <div class="formfield"><label>Driver</label>
                <input type="text" id="isoGiDriver" placeholder="Driver name" autocomplete="off">
              </div>
              <div class="formfield"><label>Date *</label>
                <input type="date" id="isoGiDate" value="${isoToday()}">
              </div>
              <div class="formfield"><label>Time</label>
                <input type="time" id="isoGiTime" value="${new Date().toTimeString().slice(0,5)}">
              </div>
              <div class="formfield"><label>Yard Block</label>
                <input type="text" id="isoGiBlock" placeholder="e.g. A" maxlength="4" style="text-transform:uppercase;" autocomplete="off">
              </div>
              <div class="formfield"><label>Yard Slot</label>
                <input type="text" id="isoGiSlot" placeholder="e.g. A-05" style="text-transform:uppercase;" autocomplete="off">
              </div>
              <div class="formfield full"><label>Arrival Condition</label>
                <input type="text" id="isoGiCondition" placeholder="e.g. no visible damage, seals intact" autocomplete="off">
              </div>
              <div class="formfield full"><label>DO / Reference</label>
                <input type="text" id="isoGiDo" placeholder="Delivery Order number" autocomplete="off">
              </div>
            </div>
            <div class="settings-note" id="isoGiError" style="display:none;color:var(--red);"></div>
            <div class="modalfoot" style="justify-content:flex-start;">
              <button class="btn primary" id="isoGiSubmit" ${tanks.length ? '' : 'disabled'}>Record Gate In</button>
            </div>
          </div>
        </div>`;
    }

    function wireGateInForm(host, tanks, repaint){
      const btn = host.querySelector('#isoGiSubmit');
      if (!btn) return;
      btn.onclick = async () => {
        const errEl = host.querySelector('#isoGiError');
        const tankId = String(host.querySelector('#isoGiTank').value || '').trim();
        const date = String(host.querySelector('#isoGiDate').value || '').trim();
        if (!tankId){ errEl.style.display='block'; errEl.textContent='Select a tank.'; return; }
        if (!date){ errEl.style.display='block'; errEl.textContent='Date is required.'; return; }

        const tank = tanks.find(t => String(t.tankId || '') === tankId);
        if (!tank){ errEl.style.display='block'; errEl.textContent='Tank not found.'; return; }

        const blockName = String(host.querySelector('#isoGiBlock').value || '').trim().toUpperCase();
        const slotNo = window.isoNormSlot
          ? window.isoNormSlot(host.querySelector('#isoGiSlot').value)
          : String(host.querySelector('#isoGiSlot').value || '').trim().toUpperCase();
        const time = String(host.querySelector('#isoGiTime').value || '').trim();
        const customer = String(host.querySelector('#isoGiCustomer').value || '').trim();
        const truck = String(host.querySelector('#isoGiTruck').value || '').trim();
        const driver = String(host.querySelector('#isoGiDriver').value || '').trim();
        const condition = String(host.querySelector('#isoGiCondition').value || '').trim();
        const doRef = String(host.querySelector('#isoGiDo').value || '').trim();

        btn.disabled = true;
        try{
          const locationLabel = blockName && slotNo ? ('Block ' + blockName + ' · ' + slotNo) : (blockName || '');
          const gateRow = {
            gateEventId: isoId('GE'),
            tankId: tank.tankId || '',
            tankNumber: tank.tankNumber || '',
            direction: 'In',
            eventDate: date,
            eventTime: time,
            truckReg: truck,
            driver: driver,
            customer: customer,
            owner: tank.owner || '',
            arrivalCondition: condition,
            doReference: doRef,
            yardSlot: slotNo,
            linkedTripId: '',
            actor: isoActor(),
            at: isoNow(),
          };
          const movementRow = isoHistoryRowMovements(tank, 'Gate In', '', locationLabel, 'GateEvent', gateRow.gateEventId, 'Gate In');

          await isoSaveTankWithHistory(tank.tankId, {
            blockName: blockName,
            slotNo: slotNo,
            currentLocation: locationLabel,
            operationalStatus: 'In Yard',
            customer: customer || tank.customer || '',
          }, 'isoTankMovements', movementRow);

          // Append ke isoGateEvents (best-effort kedua)
          try{
            const gates = await getData('isoGateEvents');
            gates.push(gateRow);
            DATA_CACHE.isoGateEvents = gates;
            await persist('isoGateEvents');
          }catch(e){
            console.warn('[ISO Tank] gate event append failed:', e);
          }

          // Audit
          try{
            const audits = await getData('isoAuditEvents');
            audits.push({
              auditId: isoId('AUD'),
              actor: isoActor(),
              actionType: 'Gate In',
              entityType: 'Tank',
              entityId: tank.tankId || '',
              timestamp: isoNow(),
              referenceId: gateRow.gateEventId,
            });
            DATA_CACHE.isoAuditEvents = audits;
            await persist('isoAuditEvents');
          }catch(e){ /* best-effort */ }

          alert('Gate In recorded for ' + (tank.tankNumber || tank.tankId) + '.');
          await repaint();
        }catch(err){
          btn.disabled = false;
          errEl.style.display = 'block';
          errEl.textContent = 'Save failed: ' + (err && err.message ? err.message : err);
        }
      };
    }

    /* ---------------- Gate Out form ---------------- */
    function gateOutFormHtml(tanks){
      return `
        <div class="section">
          <div class="section-head"><h3>Record Gate Out</h3><span class="eyebrow">Departure</span></div>
          <div class="section-body">
            <div class="formgrid">
              <div class="formfield"><label>Tank *</label>
                <select id="isoGoTank" ${tanks.length ? '' : 'disabled'}>
                  <option value="">— Select Tank —</option>
                  ${tanks.map(t => `<option value="${escapeHtml(t.tankId || '')}">${escapeHtml(t.tankNumber || t.tankId || '(unnamed)')} · ${escapeHtml(t.blockName || '')} ${escapeHtml(t.slotNo || '')}</option>`).join('')}
                </select>
                ${!tanks.length ? '<div class="settings-note" style="color:var(--warn,#e6a339);">No tanks in yard. All tanks are either out on trip or not yet received.</div>' : ''}
              </div>
              <div class="formfield"><label>Destination *</label>
                <input type="text" id="isoGoDest" placeholder="e.g. Port Klang / Customer Site" autocomplete="off">
              </div>
              <div class="formfield"><label>Truck Registration</label>
                <input type="text" id="isoGoTruck" placeholder="e.g. CDM 5679" autocomplete="off">
              </div>
              <div class="formfield"><label>Driver</label>
                <input type="text" id="isoGoDriver" placeholder="Driver name" autocomplete="off">
              </div>
              <div class="formfield"><label>Date *</label>
                <input type="date" id="isoGoDate" value="${isoToday()}">
              </div>
              <div class="formfield"><label>Time</label>
                <input type="time" id="isoGoTime" value="${new Date().toTimeString().slice(0,5)}">
              </div>
              <div class="formfield full"><label>DO / Job Reference</label>
                <input type="text" id="isoGoDo" placeholder="DO or trip reference" autocomplete="off">
              </div>
              <div class="formfield full"><label>Condition Check</label>
                <input type="text" id="isoGoCondition" placeholder="e.g. all seals intact, no damage" autocomplete="off">
              </div>
            </div>
            <div class="settings-note" id="isoGoError" style="display:none;color:var(--red);"></div>
            <div class="modalfoot" style="justify-content:flex-start;">
              <button class="btn primary" id="isoGoSubmit" ${tanks.length ? '' : 'disabled'}>Record Gate Out</button>
            </div>
          </div>
        </div>`;
    }

    function wireGateOutForm(host, tanks, repaint){
      const btn = host.querySelector('#isoGoSubmit');
      if (!btn) return;
      btn.onclick = async () => {
        const errEl = host.querySelector('#isoGoError');
        const tankId = String(host.querySelector('#isoGoTank').value || '').trim();
        const date = String(host.querySelector('#isoGoDate').value || '').trim();
        const dest = String(host.querySelector('#isoGoDest').value || '').trim();
        if (!tankId){ errEl.style.display='block'; errEl.textContent='Select a tank.'; return; }
        if (!date){ errEl.style.display='block'; errEl.textContent='Date is required.'; return; }
        if (!dest){ errEl.style.display='block'; errEl.textContent='Destination is required.'; return; }

        const tank = tanks.find(t => String(t.tankId || '') === tankId);
        if (!tank){ errEl.style.display='block'; errEl.textContent='Tank not found.'; return; }

        const time = String(host.querySelector('#isoGoTime').value || '').trim();
        const truck = String(host.querySelector('#isoGoTruck').value || '').trim();
        const driver = String(host.querySelector('#isoGoDriver').value || '').trim();
        const doRef = String(host.querySelector('#isoGoDo').value || '').trim();
        const condition = String(host.querySelector('#isoGoCondition').value || '').trim();

        btn.disabled = true;
        try{
          const fromLoc = [tank.blockName, tank.slotNo].filter(Boolean).join(' · ');
          const gateRow = {
            gateEventId: isoId('GE'),
            tankId: tank.tankId || '',
            tankNumber: tank.tankNumber || '',
            direction: 'Out',
            eventDate: date,
            eventTime: time,
            truckReg: truck,
            driver: driver,
            customer: tank.customer || '',
            owner: tank.owner || '',
            arrivalCondition: condition,
            doReference: doRef,
            yardSlot: '',
            linkedTripId: '',
            actor: isoActor(),
            at: isoNow(),
          };
          const movementRow = isoHistoryRowMovements(tank, 'Gate Out', fromLoc, dest, 'GateEvent', gateRow.gateEventId, 'Gate Out to ' + dest);

          await isoSaveTankWithHistory(tank.tankId, {
            blockName: '',
            slotNo: '',
            currentLocation: dest,
            operationalStatus: 'On Trip',
          }, 'isoTankMovements', movementRow);

          try{
            const gates = await getData('isoGateEvents');
            gates.push(gateRow);
            DATA_CACHE.isoGateEvents = gates;
            await persist('isoGateEvents');
          }catch(e){ console.warn('[ISO Tank] gate event append failed:', e); }

          try{
            const audits = await getData('isoAuditEvents');
            audits.push({
              auditId: isoId('AUD'),
              actor: isoActor(),
              actionType: 'Gate Out',
              entityType: 'Tank',
              entityId: tank.tankId || '',
              timestamp: isoNow(),
              referenceId: gateRow.gateEventId,
            });
            DATA_CACHE.isoAuditEvents = audits;
            await persist('isoAuditEvents');
          }catch(e){ /* best-effort */ }

          alert('Gate Out recorded for ' + (tank.tankNumber || tank.tankId) + ' → ' + dest + '.');
          await repaint();
        }catch(err){
          btn.disabled = false;
          errEl.style.display = 'block';
          errEl.textContent = 'Save failed: ' + (err && err.message ? err.message : err);
        }
      };
    }

    /* ---------------- History table ---------------- */
    function gateHistoryHtml(gates){
      if (!gates.length){
        return `<div class="section"><div class="section-body">${emptyState('No gate events yet', 'Recorded gate-ins and gate-outs will appear here.')}</div></div>`;
      }
      return `
        <div class="section">
          <div class="section-head"><h3>Gate History</h3><span class="eyebrow">${gates.length} event${gates.length === 1 ? '' : 's'}</span></div>
          <div class="section-body">
            <div class="tablewrap">
              <table class="cdx-table">
                <thead><tr>
                  <th>Date</th><th>Time</th><th>Direction</th><th>Tank</th><th>Customer</th>
                  <th>Truck</th><th>Driver</th><th>Slot / Dest</th><th>DO Ref</th><th>By</th>
                </tr></thead>
                <tbody>
                  ${gates.slice(0,200).map(g => {
                    const dir = String(g.direction || '').toUpperCase();
                    const badge = dir === 'IN'
                      ? '<span class="badge good" style="background:rgba(63,154,110,.13);color:#3f9a6e;">IN</span>'
                      : '<span class="badge" style="background:rgba(79,127,209,.13);color:#4f7fd1;">OUT</span>';
                    return `<tr>
                      <td>${escapeHtml(g.eventDate ? fmtDate(g.eventDate) : '—')}</td>
                      <td>${escapeHtml(g.eventTime || '—')}</td>
                      <td>${badge}</td>
                      <td>${escapeHtml(g.tankNumber || g.tankId || '—')}</td>
                      <td>${escapeHtml(g.customer || '—')}</td>
                      <td>${escapeHtml(g.truckReg || '—')}</td>
                      <td>${escapeHtml(g.driver || '—')}</td>
                      <td>${escapeHtml(g.yardSlot || '—')}</td>
                      <td>${escapeHtml(g.doReference || '—')}</td>
                      <td>${escapeHtml(g.actor || '—')}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>`;
    }

    function emptyState(title, sub){
      return `<div class="cdx-empty">
        <div style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink);">${escapeHtml(title)}</div>
        <div style="font-size:12.5px;line-height:1.5;max-width:380px;text-align:center;">${escapeHtml(sub)}</div>
      </div>`;
    }

    await paint();
    return wrap;
  }

  /* =====================================================================
     PAGE 05 — HAULAGE DISPATCH BOARD
     KPI + board dengan tab per status + create/edit trip + status transitions.
     ===================================================================== */

  const TRIP_STATUS_FLOW = ['Planned','Assigned','Dispatched','In Transit','Arrived','Completed'];

  async function renderIsoDispatch(){
    const wrap = document.createElement('div');
    let activeTab = 'All';
    let tripsCache = [];

    async function loadTrips(){
      tripsCache = (await getData('isoTrips').catch(() => [])) || [];
    }

    const VALID_STATUSES = ['Planned','Assigned','Dispatched','In Transit','Arrived','Completed','Cancelled','Exception','Delayed'];

    async function paint(){
      await loadTrips();

      const counts = {};
      VALID_STATUSES.forEach(s => { counts[s] = 0; });
      tripsCache.forEach(t => { const s = String(t.status || 'Planned'); if (counts[s] !== undefined) counts[s]++; else counts[s] = 1; });

      const filtered = activeTab === 'All'
        ? tripsCache
        : tripsCache.filter(t => String(t.status || '') === activeTab);

      filtered.sort((a,b) => {
        const da = String(a.plannedDeparture || '');
        const db = String(b.plannedDeparture || '');
        return db.localeCompare(da);
      });

      wrap.innerHTML = `
        <div class="skel-intro">
          <div class="skel-intro-text">
            <div class="skel-crumbs"><span>ISO Tank</span><span class="sep">/</span><span class="current">Haulage Dispatch Board</span></div>
            <p>Manage assignments dan track trips involving ISO tanks, trucks dan drivers.</p>
          </div>
        </div>

        <div class="cdx-statgrid" style="margin-bottom:18px;">
          ${[
            ['Planned',      counts.Planned || 0,      'Awaiting assignment'],
            ['Assigned',     counts.Assigned || 0,     'Ready to dispatch'],
            ['In Transit',   counts['In Transit'] || 0,'Currently moving'],
            ['Completed',    counts.Completed || 0,    'This period'],
            ['Delayed / Exception', (counts.Delayed || 0) + (counts.Exception || 0), 'Needs attention'],
          ].map(([l,v,s]) => `<div class="mini-stat"><div class="label">${escapeHtml(l)}</div><div class="value">${v}</div><div class="meta">${escapeHtml(s)}</div></div>`).join('')}
        </div>

        <div class="section">
          <div class="section-head">
            <h3>Trip Board</h3>
            <span class="eyebrow">${filtered.length} trip${filtered.length === 1 ? '' : 's'}</span>
            <div class="spacer"></div>
            <button class="btn primary" id="isoTripNew">+ New Trip</button>
          </div>
          <div class="section-body">
            <div class="cdx-tabs" style="margin-bottom:12px;">
              <button class="cdx-tab${activeTab === 'All' ? ' active' : ''}" data-iso-trip-tab="All">All <span class="count">${tripsCache.length}</span></button>
              ${TRIP_STATUS_FLOW.concat(['Cancelled','Delayed','Exception']).map(s =>
                `<button class="cdx-tab${activeTab === s ? ' active' : ''}" data-iso-trip-tab="${escapeHtml(s)}">${escapeHtml(s)} <span class="count">${counts[s] || 0}</span></button>`
              ).join('')}
            </div>
            <div id="isoTripTableHost"></div>
          </div>
        </div>
      `;

      wrap.querySelectorAll('[data-iso-trip-tab]').forEach(btn => {
        btn.onclick = () => { activeTab = btn.dataset.isoTripTab; paint(); };
      });

      wrap.querySelector('#isoTripNew').onclick = () => openIsoTripModal(null, paint);

      const host = wrap.querySelector('#isoTripTableHost');
      if (!filtered.length){
        host.innerHTML = emptyState('No trips in this view', activeTab === 'All' ? 'Press "+ New Trip" to create the first trip.' : 'No trips with status "' + activeTab + '".');
      } else {
        host.innerHTML = `
          <div class="tablewrap">
            <table class="cdx-table">
              <thead><tr>
                <th>Trip ID</th><th>Customer</th><th>Tank</th><th>Truck / Driver</th>
                <th>Pickup → Destination</th><th>Planned</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                ${filtered.map(t => `
                  <tr>
                    <td><span class="truckchip" style="font-family:var(--font-mono);font-size:11px;">${escapeHtml(t.tripId || '—')}</span></td>
                    <td>${escapeHtml(t.customer || '—')}<div class="settings-note" style="margin:2px 0 0;">${escapeHtml(t.jobRef || '')}</div></td>
                    <td>${escapeHtml(t.tankNumber || t.tankId || '—')}</td>
                    <td>${escapeHtml(t.truckReg || '—')}<div class="settings-note" style="margin:2px 0 0;">${escapeHtml(t.driver || '')}</div></td>
                    <td>${escapeHtml(t.pickupLocation || '—')}<div style="color:var(--muted);font-size:11px;">↓</div>${escapeHtml(t.destination || '—')}</td>
                    <td>${escapeHtml(t.plannedDeparture ? fmtDate(String(t.plannedDeparture).slice(0,10)) : '—')}</td>
                    <td>${isoStatusBadge(t.status)}</td>
                    <td style="text-align:right;"><button class="btn" data-iso-trip-open="${escapeHtml(t.tripId || '')}" style="padding:5px 10px;font-size:12px;">Manage</button></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`;
      }

      host.querySelectorAll('[data-iso-trip-open]').forEach(btn => {
        btn.onclick = () => {
          const tripId = btn.dataset.isoTripOpen;
          const trip = tripsCache.find(t => String(t.tripId || '') === tripId);
          if (trip) openIsoTripDetail(trip, paint);
        };
      });
    }

    function emptyState(title, sub){
      return `<div class="cdx-empty">
        <div style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink);">${escapeHtml(title)}</div>
        <div style="font-size:12.5px;line-height:1.5;max-width:380px;text-align:center;">${escapeHtml(sub)}</div>
      </div>`;
    }

    /* ---------------- Create/Edit Trip modal ---------------- */
    async function openIsoTripModal(existing, onDone){
      const isEdit = !!existing;
      const tanks = (await getData('isoTanks').catch(() => [])).filter(t => t && t.archived !== 'Yes');
      const customers = (await getData('isoCustomers').catch(() => [])) || [];

      // Candidates: tanks available (not On Trip)
      const tankCandidates = tanks.filter(t => String(t.operationalStatus || '') !== 'On Trip');

      const trip = existing || {};
      const overlay = document.getElementById('modalOverlay');
      const box = document.getElementById('modalBox');
      box.classList.remove('opkpi-modal','user-modal','bugreport-modal');

      box.innerHTML = `
        <h4>${isEdit ? 'Edit Trip' : 'New Trip'}</h4>
        ${isoDatalist('isoTripCustomersList', customers.map(c => c.companyName).filter(Boolean))}
        <div class="formgrid">
          <div class="formfield"><label>Customer *</label>
            <input type="text" id="isoTripCustomer" list="isoTripCustomersList" value="${escapeHtml(trip.customer || '')}" autocomplete="off" placeholder="Type or pick">
          </div>
          <div class="formfield"><label>Job Reference</label>
            <input type="text" id="isoTripJobRef" value="${escapeHtml(trip.jobRef || '')}" autocomplete="off">
          </div>
          <div class="formfield"><label>Tank *</label>
            <select id="isoTripTank" ${tankCandidates.length ? '' : 'disabled'}>
              <option value="">— Select Tank —</option>
              ${tankCandidates.map(t => `<option value="${escapeHtml(t.tankId || '')}" ${String(trip.tankId || '') === String(t.tankId || '') ? 'selected' : ''}>${escapeHtml(t.tankNumber || t.tankId || '(unnamed)')}${t.owner ? ' · ' + escapeHtml(t.owner) : ''}</option>`).join('')}
            </select>
            ${!tankCandidates.length ? '<div class="settings-note" style="color:var(--warn,#e6a339);">No tanks available (all on trip or archived).</div>' : ''}
          </div>
          <div class="formfield"><label>Truck Registration</label>
            <input type="text" id="isoTripTruck" value="${escapeHtml(trip.truckReg || '')}" autocomplete="off">
          </div>
          <div class="formfield"><label>Driver</label>
            <input type="text" id="isoTripDriver" value="${escapeHtml(trip.driver || '')}" autocomplete="off">
          </div>
          <div class="formfield"><label>Planned Departure</label>
            <input type="date" id="isoTripPlanned" value="${escapeHtml(String(trip.plannedDeparture || '').slice(0,10))}">
          </div>
          <div class="formfield full"><label>Pickup Location</label>
            <input type="text" id="isoTripPickup" value="${escapeHtml(trip.pickupLocation || '')}" autocomplete="off" placeholder="e.g. Depot Block A / Customer Site">
          </div>
          <div class="formfield full"><label>Destination *</label>
            <input type="text" id="isoTripDest" value="${escapeHtml(trip.destination || '')}" autocomplete="off" placeholder="e.g. Port Klang / JB Plant">
          </div>
          <div class="formfield full"><label>Instructions</label>
            <input type="text" id="isoTripInstructions" value="${escapeHtml(trip.instructions || '')}" autocomplete="off">
          </div>
        </div>
        <div class="settings-note" id="isoTripError" style="display:none;color:var(--red);"></div>
        <div class="modalfoot">
          <button class="btn" id="isoTripCancel">Cancel</button>
          <button class="btn primary" id="isoTripSave" ${tankCandidates.length ? '' : 'disabled'}>${isEdit ? 'Save Changes' : 'Create Trip'}</button>
        </div>`;
      overlay.classList.add('show');

      box.querySelector('#isoTripCancel').onclick = () => overlay.classList.remove('show');
      box.querySelector('#isoTripSave').onclick = async () => {
        const errEl = box.querySelector('#isoTripError');
        const customer = String(box.querySelector('#isoTripCustomer').value || '').trim();
        const tankId = String(box.querySelector('#isoTripTank').value || '').trim();
        const dest = String(box.querySelector('#isoTripDest').value || '').trim();
        if (!customer){ errEl.style.display='block'; errEl.textContent='Customer required.'; return; }
        if (!tankId){ errEl.style.display='block'; errEl.textContent='Tank required.'; return; }
        if (!dest){ errEl.style.display='block'; errEl.textContent='Destination required.'; return; }

        const tank = tankCandidates.find(t => String(t.tankId || '') === tankId)
                  || tanks.find(t => String(t.tankId || '') === tankId);
        const today = isoToday();
        const who = isoActor();
        const record = {
          tripId: existing ? existing.tripId : isoId('TRIP'),
          customer: customer,
          jobRef: String(box.querySelector('#isoTripJobRef').value || '').trim(),
          tankId: tankId,
          tankNumber: tank ? (tank.tankNumber || '') : '',
          truckReg: String(box.querySelector('#isoTripTruck').value || '').trim(),
          driver: String(box.querySelector('#isoTripDriver').value || '').trim(),
          pickupLocation: String(box.querySelector('#isoTripPickup').value || '').trim(),
          destination: dest,
          plannedDeparture: String(box.querySelector('#isoTripPlanned').value || '').trim(),
          eta: existing ? (existing.eta || '') : '',
          actualDeparture: existing ? (existing.actualDeparture || '') : '',
          actualArrival: existing ? (existing.actualArrival || '') : '',
          instructions: String(box.querySelector('#isoTripInstructions').value || '').trim(),
          status: existing ? (existing.status || 'Planned') : 'Planned',
          remarks: existing ? (existing.remarks || '') : '',
        };

        try{
          const trips = await getData('isoTrips');
          const i = existing ? trips.findIndex(t => t && String(t.tripId || '') === String(existing.tripId || '')) : -1;
          if (i >= 0) trips[i] = record;
          else trips.push(record);
          DATA_CACHE.isoTrips = trips;
          await persist('isoTrips');
          overlay.classList.remove('show');
          if (onDone) await onDone();
        }catch(err){
          errEl.style.display = 'block';
          errEl.textContent = 'Save failed: ' + (err && err.message ? err.message : err);
        }
      };
    }

    /* ---------------- Trip detail modal (Manage) ---------------- */
    function openIsoTripDetail(trip, onDone){
      const overlay = document.getElementById('modalOverlay');
      const box = document.getElementById('modalBox');
      box.classList.remove('opkpi-modal','user-modal','bugreport-modal');

      const currentIdx = TRIP_STATUS_FLOW.indexOf(String(trip.status || ''));
      const canAdvance = currentIdx >= 0 && currentIdx < TRIP_STATUS_FLOW.length - 1;
      const nextStatus = canAdvance ? TRIP_STATUS_FLOW[currentIdx + 1] : '';
      const terminal = ['Completed','Cancelled'].includes(String(trip.status || ''));

      box.innerHTML = `
        <h4>Trip ${escapeHtml(trip.tripId || '')}</h4>
        <div class="pm-detail-grid" style="margin-bottom:14px;">
          <div class="pm-detail-row"><span class="pm-detail-lbl">Status</span><span class="pm-detail-val">${isoStatusBadge(trip.status)}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Customer</span><span class="pm-detail-val">${escapeHtml(trip.customer || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Job Reference</span><span class="pm-detail-val">${escapeHtml(trip.jobRef || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Tank</span><span class="pm-detail-val">${escapeHtml(trip.tankNumber || trip.tankId || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Truck</span><span class="pm-detail-val">${escapeHtml(trip.truckReg || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Driver</span><span class="pm-detail-val">${escapeHtml(trip.driver || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Pickup</span><span class="pm-detail-val">${escapeHtml(trip.pickupLocation || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Destination</span><span class="pm-detail-val">${escapeHtml(trip.destination || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Planned Departure</span><span class="pm-detail-val">${escapeHtml(trip.plannedDeparture || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Actual Departure</span><span class="pm-detail-val">${escapeHtml(trip.actualDeparture || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Actual Arrival</span><span class="pm-detail-val">${escapeHtml(trip.actualArrival || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Instructions</span><span class="pm-detail-val">${escapeHtml(trip.instructions || '—')}</span></div>
        </div>
        <div class="modalfoot">
          <button class="btn" id="isoTripClose">Close</button>
          ${!terminal ? `<button class="btn" id="isoTripEdit">Edit</button>` : ''}
          ${canAdvance ? `<button class="btn primary" id="isoTripAdvance">Mark as ${escapeHtml(nextStatus)}</button>` : ''}
          ${!terminal ? `<button class="btn danger" id="isoTripCancelTrip" style="margin-left:auto;">Cancel Trip</button>` : ''}
        </div>`;
      overlay.classList.add('show');

      const finish = async () => {
        overlay.classList.remove('show');
        if (onDone) await onDone();
      };

      box.querySelector('#isoTripClose').onclick = () => overlay.classList.remove('show');

      const editBtn = box.querySelector('#isoTripEdit');
      if (editBtn) editBtn.onclick = () => {
        overlay.classList.remove('show');
        openIsoTripModal(trip, onDone);
      };

      const cancelBtn = box.querySelector('#isoTripCancelTrip');
      if (cancelBtn) cancelBtn.onclick = async () => {
        if (!confirm('Cancel this trip? Tank status will remain unchanged.')) return;
        await updateTripStatus(trip.tripId, 'Cancelled', {});
        await finish();
      };

      const advanceBtn = box.querySelector('#isoTripAdvance');
      if (advanceBtn) advanceBtn.onclick = async () => {
        const patch = {};
        const now = isoNow();
        if (nextStatus === 'Dispatched') patch.actualDeparture = now;
        if (nextStatus === 'Arrived') patch.actualArrival = now;

        // Auto tank status transition
        if (nextStatus === 'Dispatched' || nextStatus === 'In Transit'){
          try{
            const tanks = await getData('isoTanks');
            const idx = tanks.findIndex(t => t && String(t.tankId || '') === String(trip.tankId || ''));
            if (idx >= 0 && String(tanks[idx].operationalStatus || '') !== 'On Trip'){
              tanks[idx] = Object.assign({}, tanks[idx], {
                operationalStatus: 'On Trip',
                blockName: '',
                slotNo: '',
                currentLocation: trip.destination || '',
                lastActivityAt: isoToday(),
                updatedAt: isoToday(),
                updatedBy: isoActor(),
              });
              DATA_CACHE.isoTanks = tanks;
              await persist('isoTanks');
            }
          }catch(e){ console.warn('tank status update failed', e); }
        }
        if (nextStatus === 'Completed'){
          try{
            const tanks = await getData('isoTanks');
            const idx = tanks.findIndex(t => t && String(t.tankId || '') === String(trip.tankId || ''));
            if (idx >= 0){
              tanks[idx] = Object.assign({}, tanks[idx], {
                operationalStatus: 'Available',
                currentLocation: trip.destination || '',
                lastActivityAt: isoToday(),
                updatedAt: isoToday(),
                updatedBy: isoActor(),
              });
              DATA_CACHE.isoTanks = tanks;
              await persist('isoTanks');
            }
          }catch(e){ console.warn('tank status update failed', e); }
        }

        await updateTripStatus(trip.tripId, nextStatus, patch);
        await finish();
      };
    }

    async function updateTripStatus(tripId, status, patch){
      const trips = await getData('isoTrips');
      const i = trips.findIndex(t => t && String(t.tripId || '') === String(tripId || ''));
      if (i < 0) return;
      trips[i] = Object.assign({}, trips[i], patch || {}, { status: status });
      DATA_CACHE.isoTrips = trips;
      await persist('isoTrips');
    }

    await paint();
    return wrap;
  }

  /* =====================================================================
     OVERRIDE ROUTES FASA 2 → FASA 3 (3 route)
     ===================================================================== */

  ROUTES.isoTankCustomers = { title:'Customer & Job Management', crumb:'ISO Tank', render: renderIsoCustomers };
  ROUTES.isoTankGate      = { title:'Gate In / Gate Out',        crumb:'ISO Tank', render: renderIsoGate      };
  ROUTES.isoTankDispatch  = { title:'Haulage Dispatch Board',    crumb:'ISO Tank', render: renderIsoDispatch  };

  console.log('[ISO Tank] Fasa 3 loaded: Customer + Gate + Dispatch');
})();

/* =========================================================================
   FOCC ISO TANK DEPOT — Fasa 4
   =========================================================================
   Condition & Compliance:
     · isoTankCleaning    — Cleaning Management
     · isoTankMaintenance — Maintenance & Repair
     · isoTankInspection  — Inspection & Certificate Control
   =========================================================================
   Prinsip Fasa 4:
   · Status transitions dengan validation — tiada skip status.
   · Cleaning complete ≠ tank ready. Maintenance done ≠ tank fit.
     Tank operational status hanya berubah bila user explicit buat.
   · Inspection & Certificate ialah entiti BERASINGAN (tab berlainan).
   · Best-effort atomicity — tank update dulu, history kemudian.
   ========================================================================= */

(function(){
  'use strict';

  /* ---------------------------------------------------------------------
     HELPERS — self-contained
     --------------------------------------------------------------------- */

  function isoId(prefix){
    const p = String(prefix || 'ISO').toUpperCase();
    try{ if (window.crypto && crypto.randomUUID) return p + '-' + crypto.randomUUID(); }catch(e){}
    return p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
  }
  function isoToday(){ return new Date().toISOString().slice(0,10); }
  function isoNow(){ return new Date().toISOString().slice(0,16).replace('T',' '); }
  function isoActor(){
    return (typeof getSessionEmail === 'function') ? (getSessionEmail() || '') : '';
  }
  function isoStatusBadge(s){ return badgeFor(s); }

  function isoStatCard(label, value, sub){
    return `<div class="mini-stat"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(String(value == null ? '—' : value))}</div>${sub ? `<div class="meta">${escapeHtml(String(sub))}</div>` : ''}</div>`;
  }
  function isoEmptyState(title, sub){
    return `<div class="cdx-empty"><div style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink);">${escapeHtml(title)}</div><div style="font-size:12.5px;line-height:1.5;max-width:380px;text-align:center;">${escapeHtml(sub)}</div></div>`;
  }
  function isoIntro(title, sub){
    return `<div class="skel-intro"><div class="skel-intro-text"><div class="skel-crumbs"><span>ISO Tank</span><span class="sep">/</span><span class="current">${escapeHtml(title)}</span></div><p>${escapeHtml(sub)}</p></div></div>`;
  }

  function isoDatalist(id, items){
    return `<datalist id="${id}">${(items || []).map(v => `<option value="${escapeHtml(String(v))}"></option>`).join('')}</datalist>`;
  }

  function isoDaysUntil(isoDate){
    if (!isoDate) return null;
    const d = new Date(String(isoDate).slice(0,10) + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    return Math.round((d - today) / 86400000);
  }
  function isoExpiryLabel(isoDate){
    const days = isoDaysUntil(isoDate);
    if (days === null) return '<span style="color:var(--muted);">—</span>';
    if (days < 0) return `<span class="badge bad">Expired ${Math.abs(days)}d ago</span>`;
    if (days === 0) return '<span class="badge warn">Expires today</span>';
    if (days <= 30) return `<span class="badge warn">${days}d left</span>`;
    return `<span class="badge good">${fmtDate(isoDate)}</span>`;
  }
  function isoCertificateStatus(isoDate){
    const days = isoDaysUntil(isoDate);
    if (days === null) return 'Not Available';
    if (days < 0) return 'Expired';
    if (days <= 30) return 'Due Soon';
    return 'Valid';
  }

  /* Tanks candidates untuk work order — bukan On Trip, bukan archived. */
  async function isoTankCandidatesForWork(){
    const tanks = await getData('isoTanks').catch(() => []);
    return (tanks || []).filter(t =>
      t && t.archived !== 'Yes' &&
      String(t.operationalStatus || '') !== 'On Trip'
    );
  }
  async function isoAllActiveTanks(){
    const tanks = await getData('isoTanks').catch(() => []);
    return (tanks || []).filter(t => t && t.archived !== 'Yes');
  }

  /* Append audit + movement history, best-effort */
  async function isoAppendHistory(tankId, tankNumber, action, fromLoc, toLoc, refType, refId, notes){
    try{
      const list = await getData('isoTankMovements').catch(() => []);
      list.push({
        movementId: isoId('MOV'),
        tankId: tankId || '',
        tankNumber: tankNumber || '',
        action: action,
        fromLocation: fromLoc || '',
        toLocation: toLoc || '',
        referenceType: refType || '',
        referenceId: refId || '',
        notes: notes || '',
        actor: isoActor(),
        at: isoNow(),
      });
      DATA_CACHE.isoTankMovements = list;
      await persist('isoTankMovements');
    }catch(e){ console.warn('[ISO Tank] movement append failed:', e); }
  }

  async function isoAppendAudit(action, entityType, entityId, refId){
    try{
      const list = await getData('isoAuditEvents').catch(() => []);
      list.push({
        auditId: isoId('AUD'),
        actor: isoActor(),
        actionType: action,
        entityType: entityType,
        entityId: entityId,
        timestamp: isoNow(),
        referenceId: refId || '',
      });
      DATA_CACHE.isoAuditEvents = list;
      await persist('isoAuditEvents');
    }catch(e){ /* best-effort */ }
  }

  /* =====================================================================
     PAGE 07 — CLEANING MANAGEMENT
     ===================================================================== */

  const CLEAN_STATUSES = ['Pending','Scheduled','In Progress','Awaiting Verification','Completed','Rejected','Re-clean Required'];

  async function renderIsoCleaning(){
    const wrap = document.createElement('div');

    async function paint(){
      const jobs = (await getData('isoCleaningJobs').catch(() => [])) || [];
      const counts = {};
      CLEAN_STATUSES.forEach(s => counts[s] = 0);
      jobs.forEach(j => { const s = String(j.status || 'Pending'); counts[s] = (counts[s] || 0) + 1; });

      const sorted = jobs.slice().sort((a,b) => {
        const da = String(a.plannedStart || a.actualStart || '');
        const db = String(b.plannedStart || b.actualStart || '');
        return db.localeCompare(da);
      });

      wrap.innerHTML = `
        ${isoIntro('Cleaning Management', 'Track cleaning requests, work progress, evidence dan completion verification.')}

        <div class="cdx-statgrid" style="margin-bottom:18px;">
          ${isoStatCard('Pending', counts.Pending, 'Awaiting vendor')}
          ${isoStatCard('Scheduled', counts.Scheduled, 'Assigned')}
          ${isoStatCard('In Progress', counts['In Progress'], 'Cleaning')}
          ${isoStatCard('Awaiting Verification', counts['Awaiting Verification'], 'Submitted')}
          ${isoStatCard('Completed', counts.Completed, 'Verified')}
          ${isoStatCard('Rejected / Re-clean', (counts.Rejected || 0) + (counts['Re-clean Required'] || 0), 'Needs attention')}
        </div>

        <div class="section">
          <div class="section-head">
            <h3>Cleaning Work Orders</h3>
            <span class="eyebrow">${jobs.length} work order${jobs.length === 1 ? '' : 's'}</span>
            <div class="spacer"></div>
            <button class="btn primary" id="isoCleanNew">+ New Cleaning Job</button>
          </div>
          <div class="section-body">
            ${sorted.length ? cleaningTableHtml(sorted) : isoEmptyState('No cleaning jobs yet', 'Create the first cleaning work order to get started.')}
          </div>
        </div>`;

      wrap.querySelector('#isoCleanNew').onclick = () => openCleaningModal(null, paint);
      wrap.querySelectorAll('[data-clean-open]').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.cleanOpen;
          const job = sorted.find(j => String(j.cleaningId || '') === id);
          if (job) openCleaningDetail(job, paint);
        };
      });
    }

    function cleaningTableHtml(jobs){
      return `<div class="tablewrap"><table class="cdx-table"><thead><tr>
        <th>Work Order</th><th>Tank</th><th>Customer</th><th>Vendor / Team</th>
        <th>Planned Start</th><th>Status</th><th></th>
      </tr></thead><tbody>
        ${jobs.map(j => `<tr>
          <td><span class="truckchip" style="font-family:var(--font-mono);font-size:11px;">${escapeHtml(j.cleaningId || '—')}</span></td>
          <td>${escapeHtml(j.tankNumber || j.tankId || '—')}</td>
          <td>${escapeHtml(j.customer || '—')}</td>
          <td>${escapeHtml(j.vendor || '—')}</td>
          <td>${escapeHtml(j.plannedStart ? fmtDate(String(j.plannedStart).slice(0,10)) : '—')}</td>
          <td>${isoStatusBadge(j.status)}</td>
          <td style="text-align:right;"><button class="btn" data-clean-open="${escapeHtml(j.cleaningId || '')}" style="padding:5px 10px;font-size:12px;">Manage</button></td>
        </tr>`).join('')}
      </tbody></table></div>`;
    }

    /* Create / Edit modal */
    async function openCleaningModal(existing, onDone){
      const isEdit = !!existing;
      const tanks = await isoTankCandidatesForWork();
      const vendors = (await loadOptionList('isoCleaningJobs','vendor').catch(() => null)) || [];
      const rec = existing || {};

      const overlay = document.getElementById('modalOverlay');
      const box = document.getElementById('modalBox');
      box.classList.remove('opkpi-modal','user-modal','bugreport-modal');
      box.innerHTML = `
        <h4>${isEdit ? 'Edit Cleaning Job' : 'New Cleaning Job'}</h4>
        ${isoDatalist('isoCleanVendorsList', vendors)}
        <div class="formgrid">
          <div class="formfield"><label>Tank *</label>
            <select id="isoCleanTank" ${tanks.length ? '' : 'disabled'}>
              <option value="">— Select Tank —</option>
              ${tanks.map(t => `<option value="${escapeHtml(t.tankId || '')}" ${String(rec.tankId || '') === String(t.tankId || '') ? 'selected' : ''}>${escapeHtml(t.tankNumber || t.tankId || '(unnamed)')}${t.owner ? ' · ' + escapeHtml(t.owner) : ''}</option>`).join('')}
            </select>
          </div>
          <div class="formfield"><label>Customer</label>
            <input type="text" id="isoCleanCustomer" value="${escapeHtml(rec.customer || '')}" autocomplete="off">
          </div>
          <div class="formfield"><label>Job Reference</label>
            <input type="text" id="isoCleanJobRef" value="${escapeHtml(rec.jobRef || '')}" autocomplete="off">
          </div>
          <div class="formfield"><label>Previous Cargo</label>
            <input type="text" id="isoCleanCargo" value="${escapeHtml(rec.previousCargo || '')}" autocomplete="off" placeholder="e.g. Palm oil, chemicals">
          </div>
          <div class="formfield full"><label>Cleaning Scope / Instructions</label>
            <input type="text" id="isoCleanScope" value="${escapeHtml(rec.scope || '')}" autocomplete="off" placeholder="e.g. Hot wash + steam, chemical rinse">
          </div>
          <div class="formfield"><label>Vendor / Team</label>
            <input type="text" id="isoCleanVendor" list="isoCleanVendorsList" value="${escapeHtml(rec.vendor || '')}" autocomplete="off">
          </div>
          <div class="formfield"><label>Planned Start</label>
            <input type="date" id="isoCleanStart" value="${escapeHtml(String(rec.plannedStart || '').slice(0,10))}">
          </div>
          <div class="formfield"><label>Planned Complete</label>
            <input type="date" id="isoCleanComplete" value="${escapeHtml(String(rec.plannedComplete || '').slice(0,10))}">
          </div>
          <div class="formfield"><label>Cost (RM)</label>
            <input type="number" step="0.01" id="isoCleanCost" value="${rec.cost != null ? escapeHtml(String(rec.cost)) : ''}">
          </div>
          <div class="formfield full"><label>Remarks</label>
            <input type="text" id="isoCleanRemarks" value="${escapeHtml(rec.remarks || '')}" autocomplete="off">
          </div>
        </div>
        <div class="settings-note">Business rule: cleaning completion does <b>not</b> automatically release the tank for service. Release requires separate authorisation.</div>
        <div class="settings-note" id="isoCleanError" style="display:none;color:var(--red);"></div>
        <div class="modalfoot">
          <button class="btn" id="isoCleanCancel">Cancel</button>
          <button class="btn primary" id="isoCleanSave">${isEdit ? 'Save Changes' : 'Create Cleaning Job'}</button>
        </div>`;
      overlay.classList.add('show');

      box.querySelector('#isoCleanCancel').onclick = () => overlay.classList.remove('show');
      box.querySelector('#isoCleanSave').onclick = async () => {
        const errEl = box.querySelector('#isoCleanError');
        const tankId = String(box.querySelector('#isoCleanTank').value || '').trim();
        if (!tankId){ errEl.style.display='block'; errEl.textContent='Select a tank.'; return; }
        const tank = tanks.find(t => String(t.tankId || '') === tankId);

        const rec2 = {
          cleaningId: existing ? existing.cleaningId : isoId('CLN'),
          tankId: tankId,
          tankNumber: tank ? (tank.tankNumber || '') : '',
          customer: String(box.querySelector('#isoCleanCustomer').value || '').trim(),
          jobRef: String(box.querySelector('#isoCleanJobRef').value || '').trim(),
          previousCargo: String(box.querySelector('#isoCleanCargo').value || '').trim(),
          scope: String(box.querySelector('#isoCleanScope').value || '').trim(),
          vendor: String(box.querySelector('#isoCleanVendor').value || '').trim(),
          plannedStart: String(box.querySelector('#isoCleanStart').value || '').trim(),
          plannedComplete: String(box.querySelector('#isoCleanComplete').value || '').trim(),
          cost: box.querySelector('#isoCleanCost').value === '' ? '' : parseFloat(box.querySelector('#isoCleanCost').value),
          remarks: String(box.querySelector('#isoCleanRemarks').value || '').trim(),
          // Preserve existing workflow fields
          instructions: existing ? (existing.instructions || '') : '',
          actualStart: existing ? (existing.actualStart || '') : '',
          actualComplete: existing ? (existing.actualComplete || '') : '',
          verifiedBy: existing ? (existing.verifiedBy || '') : '',
          verifiedAt: existing ? (existing.verifiedAt || '') : '',
          status: existing ? (existing.status || 'Pending') : 'Pending',
        };

        try{
          const list = await getData('isoCleaningJobs');
          const i = existing ? list.findIndex(j => j && String(j.cleaningId || '') === String(existing.cleaningId || '')) : -1;
          if (i >= 0) list[i] = rec2; else list.push(rec2);
          DATA_CACHE.isoCleaningJobs = list;
          await persist('isoCleaningJobs');

          if (!existing){
            await isoAppendAudit('Cleaning Created', 'CleaningJob', rec2.cleaningId, rec2.tankId);
            await isoAppendHistory(rec2.tankId, rec2.tankNumber, 'Cleaning Start', '', '', 'CleaningJob', rec2.cleaningId, 'Created');
          }

          // Simpan vendor untuk datalist
          if (rec2.vendor){
            try{
              const vlist = ((await loadOptionList('isoCleaningJobs','vendor')) || []);
              if (!vlist.includes(rec2.vendor)){
                vlist.push(rec2.vendor);
                await saveOptionList('isoCleaningJobs','vendor', vlist.sort());
              }
            }catch(e){}
          }

          overlay.classList.remove('show');
          if (onDone) await onDone();
        }catch(err){
          errEl.style.display = 'block';
          errEl.textContent = 'Save failed: ' + (err && err.message ? err.message : err);
        }
      };
    }

    /* Detail + status transitions */
    function openCleaningDetail(job, onDone){
      const overlay = document.getElementById('modalOverlay');
      const box = document.getElementById('modalBox');
      box.classList.remove('opkpi-modal','user-modal','bugreport-modal');
      const status = String(job.status || 'Pending');

      const actions = [];
      if (status === 'Pending' || status === 'Rejected' || status === 'Re-clean Required'){
        actions.push({ id:'schedule', label:'Assign Vendor', primary: true });
      }
      if (status === 'Scheduled'){
        actions.push({ id:'start', label:'Start Cleaning', primary: true });
      }
      if (status === 'In Progress'){
        actions.push({ id:'submit', label:'Submit for Verification', primary: true });
      }
      if (status === 'Awaiting Verification'){
        actions.push({ id:'approve', label:'Approve', primary: true });
        actions.push({ id:'reject', label:'Reject' });
        actions.push({ id:'reclean', label:'Request Re-clean' });
      }

      box.innerHTML = `
        <h4>Cleaning ${escapeHtml(job.cleaningId || '')}</h4>
        <div class="pm-detail-grid" style="margin-bottom:14px;">
          <div class="pm-detail-row"><span class="pm-detail-lbl">Status</span><span class="pm-detail-val">${isoStatusBadge(status)}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Tank</span><span class="pm-detail-val">${escapeHtml(job.tankNumber || job.tankId || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Customer</span><span class="pm-detail-val">${escapeHtml(job.customer || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Job Ref</span><span class="pm-detail-val">${escapeHtml(job.jobRef || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Previous Cargo</span><span class="pm-detail-val">${escapeHtml(job.previousCargo || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Scope</span><span class="pm-detail-val">${escapeHtml(job.scope || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Vendor</span><span class="pm-detail-val">${escapeHtml(job.vendor || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Planned Start</span><span class="pm-detail-val">${escapeHtml(job.plannedStart ? fmtDate(job.plannedStart) : '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Planned Complete</span><span class="pm-detail-val">${escapeHtml(job.plannedComplete ? fmtDate(job.plannedComplete) : '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Actual Start</span><span class="pm-detail-val">${escapeHtml(job.actualStart || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Actual Complete</span><span class="pm-detail-val">${escapeHtml(job.actualComplete || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Cost (RM)</span><span class="pm-detail-val">${escapeHtml(job.cost != null && job.cost !== '' ? String(job.cost) : '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Verified By</span><span class="pm-detail-val">${escapeHtml(job.verifiedBy || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Verified At</span><span class="pm-detail-val">${escapeHtml(job.verifiedAt || '—')}</span></div>
          <div class="pm-detail-row" style="grid-column:1/-1;"><span class="pm-detail-lbl">Remarks</span><span class="pm-detail-val">${escapeHtml(job.remarks || '—')}</span></div>
        </div>
        <div class="modalfoot" style="flex-wrap:wrap;gap:8px;">
          <button class="btn" id="isoCleanDClose">Close</button>
          <button class="btn" id="isoCleanDEdit">Edit</button>
          ${actions.map(a => `<button class="btn${a.primary ? ' primary' : ''}" data-clean-action="${a.id}">${escapeHtml(a.label)}</button>`).join('')}
        </div>`;
      overlay.classList.add('show');

      const finish = async () => { overlay.classList.remove('show'); if (onDone) await onDone(); };
      box.querySelector('#isoCleanDClose').onclick = () => overlay.classList.remove('show');
      box.querySelector('#isoCleanDEdit').onclick = () => {
        overlay.classList.remove('show');
        openCleaningModal(job, onDone);
      };

      box.querySelectorAll('[data-clean-action]').forEach(btn => {
        btn.onclick = async () => {
          const action = btn.dataset.cleanAction;
          await performCleaningAction(job, action);
          await finish();
        };
      });
    }

    async function performCleaningAction(job, action){
      const list = await getData('isoCleaningJobs');
      const i = list.findIndex(j => j && String(j.cleaningId || '') === String(job.cleaningId || ''));
      if (i < 0) throw new Error('Cleaning job not found.');

      const today = isoToday();
      const who = isoActor();
      const now = isoNow();
      const j = list[i];

      if (action === 'schedule'){
        j.status = 'Scheduled';
      } else if (action === 'start'){
        if (j.status !== 'Scheduled') throw new Error('Can only start from Scheduled status.');
        j.status = 'In Progress';
        j.actualStart = today;
      } else if (action === 'submit'){
        if (j.status !== 'In Progress') throw new Error('Can only submit from In Progress status.');
        j.status = 'Awaiting Verification';
      } else if (action === 'approve'){
        if (j.status !== 'Awaiting Verification') throw new Error('Can only approve from Awaiting Verification status.');
        j.status = 'Completed';
        j.actualComplete = today;
        j.verifiedBy = who;
        j.verifiedAt = now;
      } else if (action === 'reject'){
        if (j.status !== 'Awaiting Verification') throw new Error('Can only reject from Awaiting Verification status.');
        const reason = prompt('Reason for rejection:');
        if (!reason) return;
        j.status = 'Rejected';
        j.verifiedBy = who;
        j.verifiedAt = now;
        j.remarks = (j.remarks || '') + '\n[Rejected] ' + reason;
      } else if (action === 'reclean'){
        if (j.status !== 'Awaiting Verification') throw new Error('Can only request re-clean from Awaiting Verification status.');
        const reason = prompt('Reason for re-clean:');
        if (!reason) return;
        j.status = 'Re-clean Required';
        j.verifiedBy = who;
        j.verifiedAt = now;
        j.remarks = (j.remarks || '') + '\n[Re-clean] ' + reason;
      }

      DATA_CACHE.isoCleaningJobs = list;
      await persist('isoCleaningJobs');

      await isoAppendAudit('Cleaning ' + action, 'CleaningJob', j.cleaningId, j.tankId);

      if (action === 'approve'){
        await isoAppendHistory(j.tankId, j.tankNumber, 'Cleaning Complete', '', '', 'CleaningJob', j.cleaningId, 'Verified by ' + who);
      }
    }

    await paint();
    return wrap;
  }

  /* =====================================================================
     PAGE 08 — MAINTENANCE & REPAIR
     ===================================================================== */

  const MAINT_STATUSES = ['Open','Under Repair','Awaiting Parts','Awaiting Inspection','Completed','Closed'];

  async function renderIsoMaintenance(){
    const wrap = document.createElement('div');

    async function paint(){
      const orders = (await getData('isoMaintenanceOrders').catch(() => [])) || [];
      const counts = {};
      MAINT_STATUSES.forEach(s => counts[s] = 0);
      orders.forEach(o => { const s = String(o.status || 'Open'); counts[s] = (counts[s] || 0) + 1; });

      // Downtime = jumlah hari dari reportedDate ke completedDate (untuk yang selesai), atau ke hari ini (untuk yang aktif)
      let totalDowntime = 0;
      orders.forEach(o => {
        const start = o.reportedDate ? new Date(o.reportedDate + 'T00:00:00') : null;
        if (!start || isNaN(start.getTime())) return;
        const end = o.completedDate ? new Date(o.completedDate + 'T00:00:00') : new Date();
        if (isNaN(end.getTime())) return;
        const days = Math.max(0, Math.round((end - start) / 86400000));
        totalDowntime += days;
      });

      const sorted = orders.slice().sort((a,b) => {
        const da = String(a.reportedDate || '');
        const db = String(b.reportedDate || '');
        return db.localeCompare(da);
      });

      wrap.innerHTML = `
        ${isoIntro('Maintenance & Repair', 'Damage reports, maintenance requests, repair work dan downtime tracking.')}

        <div class="cdx-statgrid" style="margin-bottom:18px;">
          ${isoStatCard('Open Work Orders', counts.Open || 0, 'Awaiting action')}
          ${isoStatCard('Under Repair', counts['Under Repair'] || 0, 'In workshop')}
          ${isoStatCard('Awaiting Parts', counts['Awaiting Parts'] || 0, 'Blocked')}
          ${isoStatCard('Awaiting Inspection', counts['Awaiting Inspection'] || 0, 'Verification pending')}
          ${isoStatCard('Completed', counts.Completed || 0, 'Done')}
          ${isoStatCard('Total Downtime', totalDowntime + 'd', 'Across all orders')}
        </div>

        <div class="section">
          <div class="section-head">
            <h3>Maintenance Register</h3>
            <span class="eyebrow">${orders.length} work order${orders.length === 1 ? '' : 's'}</span>
            <div class="spacer"></div>
            <button class="btn primary" id="isoMaintNew">+ Report Damage / New Work Order</button>
          </div>
          <div class="section-body">
            ${sorted.length ? maintTableHtml(sorted) : isoEmptyState('No work orders yet', 'Report damage to create the first maintenance work order.')}
          </div>
        </div>`;

      wrap.querySelector('#isoMaintNew').onclick = () => openMaintModal(null, paint);
      wrap.querySelectorAll('[data-maint-open]').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.maintOpen;
          const o = sorted.find(x => String(x.workOrderId || '') === id);
          if (o) openMaintDetail(o, paint);
        };
      });
    }

    function maintTableHtml(orders){
      return `<div class="tablewrap"><table class="cdx-table"><thead><tr>
        <th>Work Order</th><th>Tank</th><th>Category</th><th>Priority</th>
        <th>Assigned To</th><th>Reported</th><th>Status</th><th></th>
      </tr></thead><tbody>
        ${orders.map(o => `<tr>
          <td><span class="truckchip" style="font-family:var(--font-mono);font-size:11px;">${escapeHtml(o.workOrderId || '—')}</span></td>
          <td>${escapeHtml(o.tankNumber || o.tankId || '—')}</td>
          <td>${escapeHtml(o.issueCategory || '—')}</td>
          <td>${isoStatusBadge(o.priority)}</td>
          <td>${escapeHtml(o.assignedTo || '—')}</td>
          <td>${escapeHtml(o.reportedDate ? fmtDate(String(o.reportedDate).slice(0,10)) : '—')}</td>
          <td>${isoStatusBadge(o.status)}</td>
          <td style="text-align:right;"><button class="btn" data-maint-open="${escapeHtml(o.workOrderId || '')}" style="padding:5px 10px;font-size:12px;">Manage</button></td>
        </tr>`).join('')}
      </tbody></table></div>`;
    }

    async function openMaintModal(existing, onDone){
      const isEdit = !!existing;
      const tanks = await isoTankCandidatesForWork();
      const rec = existing || {};

      const overlay = document.getElementById('modalOverlay');
      const box = document.getElementById('modalBox');
      box.classList.remove('opkpi-modal','user-modal','bugreport-modal');
      box.innerHTML = `
        <h4>${isEdit ? 'Edit Work Order' : 'Report Damage / New Work Order'}</h4>
        <div class="formgrid">
          <div class="formfield"><label>Tank *</label>
            <select id="isoMtTank" ${tanks.length ? '' : 'disabled'}>
              <option value="">— Select Tank —</option>
              ${tanks.map(t => `<option value="${escapeHtml(t.tankId || '')}" ${String(rec.tankId || '') === String(t.tankId || '') ? 'selected' : ''}>${escapeHtml(t.tankNumber || t.tankId || '(unnamed)')}</option>`).join('')}
            </select>
          </div>
          <div class="formfield"><label>Issue Category</label>
            <select id="isoMtCat">
              ${['Structural','Valve','Gasket','Frame','Coating','Other'].map(v => `<option value="${v}" ${rec.issueCategory === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="formfield"><label>Priority</label>
            <select id="isoMtPri">
              ${['Low','Medium','High','Critical'].map(v => `<option value="${v}" ${rec.priority === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="formfield"><label>Assigned Technician / Vendor</label>
            <input type="text" id="isoMtAssign" value="${escapeHtml(rec.assignedTo || '')}" autocomplete="off">
          </div>
          <div class="formfield"><label>Reported Date *</label>
            <input type="date" id="isoMtReported" value="${escapeHtml(String(rec.reportedDate || isoToday()).slice(0,10))}">
          </div>
          <div class="formfield"><label>Cost (RM)</label>
            <input type="number" step="0.01" id="isoMtCost" value="${rec.cost != null ? escapeHtml(String(rec.cost)) : ''}">
          </div>
          <div class="formfield full"><label>Description *</label>
            <input type="text" id="isoMtDesc" value="${escapeHtml(rec.description || '')}" autocomplete="off" placeholder="e.g. valve leak, frame bent, coating peeled">
          </div>
          <div class="formfield full"><label>Remarks</label>
            <input type="text" id="isoMtRemarks" value="${escapeHtml(rec.remarks || '')}" autocomplete="off">
          </div>
        </div>
        <div class="settings-note">Business rule: work-order completion does <b>not</b> automatically declare the tank fit for service. Separate inspection authorisation is required.</div>
        <div class="settings-note" id="isoMtError" style="display:none;color:var(--red);"></div>
        <div class="modalfoot">
          <button class="btn" id="isoMtCancel">Cancel</button>
          <button class="btn primary" id="isoMtSave">${isEdit ? 'Save Changes' : 'Create Work Order'}</button>
        </div>`;
      overlay.classList.add('show');

      box.querySelector('#isoMtCancel').onclick = () => overlay.classList.remove('show');
      box.querySelector('#isoMtSave').onclick = async () => {
        const errEl = box.querySelector('#isoMtError');
        const tankId = String(box.querySelector('#isoMtTank').value || '').trim();
        const desc = String(box.querySelector('#isoMtDesc').value || '').trim();
        if (!tankId){ errEl.style.display='block'; errEl.textContent='Select a tank.'; return; }
        if (!desc){ errEl.style.display='block'; errEl.textContent='Description is required.'; return; }
        const tank = tanks.find(t => String(t.tankId || '') === tankId);

        const rec2 = {
          workOrderId: existing ? existing.workOrderId : isoId('WO'),
          tankId: tankId,
          tankNumber: tank ? (tank.tankNumber || '') : '',
          issueCategory: String(box.querySelector('#isoMtCat').value || '').trim(),
          description: desc,
          priority: String(box.querySelector('#isoMtPri').value || '').trim(),
          assignedTo: String(box.querySelector('#isoMtAssign').value || '').trim(),
          reportedDate: String(box.querySelector('#isoMtReported').value || '').trim(),
          cost: box.querySelector('#isoMtCost').value === '' ? '' : parseFloat(box.querySelector('#isoMtCost').value),
          remarks: String(box.querySelector('#isoMtRemarks').value || '').trim(),
          startDate: existing ? (existing.startDate || '') : '',
          completedDate: existing ? (existing.completedDate || '') : '',
          photos: existing ? (existing.photos || '') : '',
          status: existing ? (existing.status || 'Open') : 'Open',
        };

        try{
          const list = await getData('isoMaintenanceOrders');
          const i = existing ? list.findIndex(o => o && String(o.workOrderId || '') === String(existing.workOrderId || '')) : -1;
          if (i >= 0) list[i] = rec2; else list.push(rec2);
          DATA_CACHE.isoMaintenanceOrders = list;
          await persist('isoMaintenanceOrders');

          if (!existing){
            await isoAppendAudit('Maintenance Reported', 'WorkOrder', rec2.workOrderId, rec2.tankId);
            await isoAppendHistory(rec2.tankId, rec2.tankNumber, 'Maintenance Start', '', '', 'WorkOrder', rec2.workOrderId, rec2.description);
          }

          overlay.classList.remove('show');
          if (onDone) await onDone();
        }catch(err){
          errEl.style.display = 'block';
          errEl.textContent = 'Save failed: ' + (err && err.message ? err.message : err);
        }
      };
    }

    function openMaintDetail(order, onDone){
      const overlay = document.getElementById('modalOverlay');
      const box = document.getElementById('modalBox');
      box.classList.remove('opkpi-modal','user-modal','bugreport-modal');
      const status = String(order.status || 'Open');

      const actions = [];
      if (status === 'Open') actions.push({ id:'start', label:'Start Repair', primary: true });
      if (status === 'Under Repair'){
        actions.push({ id:'parts', label:'Awaiting Parts' });
        actions.push({ id:'submit', label:'Submit for Inspection', primary: true });
      }
      if (status === 'Awaiting Parts') actions.push({ id:'resume', label:'Resume Repair', primary: true });
      if (status === 'Awaiting Inspection'){
        actions.push({ id:'pass', label:'Pass Inspection', primary: true });
        actions.push({ id:'fail', label:'Fail — Return to Repair' });
      }
      if (status === 'Completed') actions.push({ id:'close', label:'Close Work Order', primary: true });

      box.innerHTML = `
        <h4>Work Order ${escapeHtml(order.workOrderId || '')}</h4>
        <div class="pm-detail-grid" style="margin-bottom:14px;">
          <div class="pm-detail-row"><span class="pm-detail-lbl">Status</span><span class="pm-detail-val">${isoStatusBadge(status)}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Tank</span><span class="pm-detail-val">${escapeHtml(order.tankNumber || order.tankId || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Issue</span><span class="pm-detail-val">${escapeHtml(order.issueCategory || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Priority</span><span class="pm-detail-val">${isoStatusBadge(order.priority)}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Assigned To</span><span class="pm-detail-val">${escapeHtml(order.assignedTo || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Reported</span><span class="pm-detail-val">${escapeHtml(order.reportedDate ? fmtDate(order.reportedDate) : '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Start</span><span class="pm-detail-val">${escapeHtml(order.startDate || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Completed</span><span class="pm-detail-val">${escapeHtml(order.completedDate || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Cost</span><span class="pm-detail-val">${escapeHtml(order.cost != null && order.cost !== '' ? 'RM ' + order.cost : '—')}</span></div>
          <div class="pm-detail-row" style="grid-column:1/-1;"><span class="pm-detail-lbl">Description</span><span class="pm-detail-val">${escapeHtml(order.description || '—')}</span></div>
          <div class="pm-detail-row" style="grid-column:1/-1;"><span class="pm-detail-lbl">Remarks</span><span class="pm-detail-val">${escapeHtml(order.remarks || '—')}</span></div>
        </div>
        <div class="modalfoot" style="flex-wrap:wrap;gap:8px;">
          <button class="btn" id="isoMtDClose">Close</button>
          <button class="btn" id="isoMtDEdit">Edit</button>
          ${actions.map(a => `<button class="btn${a.primary ? ' primary' : ''}" data-maint-action="${a.id}">${escapeHtml(a.label)}</button>`).join('')}
        </div>`;
      overlay.classList.add('show');

      const finish = async () => { overlay.classList.remove('show'); if (onDone) await onDone(); };
      box.querySelector('#isoMtDClose').onclick = () => overlay.classList.remove('show');
      box.querySelector('#isoMtDEdit').onclick = () => {
        overlay.classList.remove('show');
        openMaintModal(order, onDone);
      };
      box.querySelectorAll('[data-maint-action]').forEach(btn => {
        btn.onclick = async () => {
          await performMaintAction(order, btn.dataset.maintAction);
          await finish();
        };
      });
    }

    async function performMaintAction(order, action){
      const list = await getData('isoMaintenanceOrders');
      const i = list.findIndex(o => o && String(o.workOrderId || '') === String(order.workOrderId || ''));
      if (i < 0) throw new Error('Work order not found.');

      const today = isoToday();
      const now = isoNow();
      const who = isoActor();
      const o = list[i];

      if (action === 'start'){
        if (o.status !== 'Open') throw new Error('Can only start from Open status.');
        o.status = 'Under Repair';
        o.startDate = today;
      } else if (action === 'parts'){
        if (o.status !== 'Under Repair') throw new Error('Can only set Awaiting Parts from Under Repair.');
        o.status = 'Awaiting Parts';
      } else if (action === 'resume'){
        if (o.status !== 'Awaiting Parts') throw new Error('Can only resume from Awaiting Parts.');
        o.status = 'Under Repair';
      } else if (action === 'submit'){
        if (o.status !== 'Under Repair') throw new Error('Can only submit from Under Repair status.');
        o.status = 'Awaiting Inspection';
      } else if (action === 'pass'){
        if (o.status !== 'Awaiting Inspection') throw new Error('Can only pass from Awaiting Inspection.');
        o.status = 'Completed';
        o.completedDate = today;
      } else if (action === 'fail'){
        if (o.status !== 'Awaiting Inspection') throw new Error('Can only fail from Awaiting Inspection.');
        const reason = prompt('Inspection failure reason:');
        if (!reason) return;
        o.status = 'Under Repair';
        o.remarks = (o.remarks || '') + '\n[Inspection Failed] ' + reason;
      } else if (action === 'close'){
        if (o.status !== 'Completed') throw new Error('Can only close completed orders.');
        o.status = 'Closed';
      }

      DATA_CACHE.isoMaintenanceOrders = list;
      await persist('isoMaintenanceOrders');
      await isoAppendAudit('Maintenance ' + action, 'WorkOrder', o.workOrderId, o.tankId);

      if (action === 'pass'){
        await isoAppendHistory(o.tankId, o.tankNumber, 'Maintenance Complete', '', '', 'WorkOrder', o.workOrderId, 'Passed inspection');
      }
    }

    await paint();
    return wrap;
  }

  /* =====================================================================
     PAGE 09 — INSPECTION & CERTIFICATE CONTROL
     Tiga tab: Inspections | Certificates | Calendar
     ===================================================================== */

  const INSP_STATUSES = ['Scheduled','In Progress','Passed','Failed','Follow-up Required'];

  async function renderIsoInspection(){
    const wrap = document.createElement('div');
    let activeTab = 'inspections';

    async function paint(){
      const [inspections, certificates] = await Promise.all([
        getData('isoInspections').catch(() => []),
        getData('isoCertificates').catch(() => []),
      ]);

      wrap.innerHTML = `
        ${isoIntro('Inspection & Certificate Control', 'Track tank inspections, follow-up actions dan certificates. Inspection dan certificates ialah entiti berasingan.')}

        <div class="cdx-tabs" style="margin-bottom:14px;">
          <button class="cdx-tab${activeTab === 'inspections' ? ' active' : ''}" data-iso-insp-tab="inspections">Inspections <span class="count">${inspections.length}</span></button>
          <button class="cdx-tab${activeTab === 'certificates' ? ' active' : ''}" data-iso-insp-tab="certificates">Certificates <span class="count">${certificates.length}</span></button>
          <button class="cdx-tab${activeTab === 'calendar' ? ' active' : ''}" data-iso-insp-tab="calendar">Calendar</button>
        </div>

        <div id="isoInspHost"></div>
      `;

      wrap.querySelectorAll('[data-iso-insp-tab]').forEach(btn => {
        btn.onclick = () => { activeTab = btn.dataset.isoInspTab; paint(); };
      });

      const host = wrap.querySelector('#isoInspHost');
      if (activeTab === 'inspections') host.innerHTML = inspectionsViewHtml(inspections);
      else if (activeTab === 'certificates') host.innerHTML = certificatesViewHtml(certificates);
      else host.innerHTML = calendarViewHtml(inspections, certificates);

      if (activeTab === 'inspections'){
        host.querySelector('#isoInspNew').onclick = () => openInspectionModal(null, paint);
        host.querySelectorAll('[data-insp-open]').forEach(btn => {
          btn.onclick = () => {
            const id = btn.dataset.inspOpen;
            const r = inspections.find(x => String(x.inspectionId || '') === id);
            if (r) openInspectionDetail(r, paint);
          };
        });
      } else if (activeTab === 'certificates'){
        host.querySelector('#isoCertNew').onclick = () => openCertModal(null, paint);
        host.querySelectorAll('[data-cert-open]').forEach(btn => {
          btn.onclick = () => {
            const id = btn.dataset.certOpen;
            const r = certificates.find(x => String(x.certificateId || '') === id);
            if (r) openCertDetail(r, paint);
          };
        });
      }
    }

    /* ---------------- Inspections tab ---------------- */
    function inspectionsViewHtml(rows){
      const counts = {};
      INSP_STATUSES.forEach(s => counts[s] = 0);
      rows.forEach(r => { const s = String(r.status || 'Scheduled'); counts[s] = (counts[s] || 0) + 1; });

      const sorted = rows.slice().sort((a,b) => String(b.scheduledDate || '').localeCompare(String(a.scheduledDate || '')));

      return `
        <div class="cdx-statgrid" style="margin-bottom:18px;">
          ${isoStatCard('Scheduled', counts.Scheduled, 'Upcoming')}
          ${isoStatCard('In Progress', counts['In Progress'], 'Ongoing')}
          ${isoStatCard('Passed', counts.Passed, 'Cleared')}
          ${isoStatCard('Failed', counts.Failed, 'Needs action')}
          ${isoStatCard('Follow-up Required', counts['Follow-up Required'], 'Pending')}
        </div>
        <div class="section">
          <div class="section-head">
            <h3>Inspection Records</h3>
            <span class="eyebrow">${sorted.length} record${sorted.length === 1 ? '' : 's'}</span>
            <div class="spacer"></div>
            <button class="btn primary" id="isoInspNew">+ Schedule Inspection</button>
          </div>
          <div class="section-body">
            ${sorted.length ? `<div class="tablewrap"><table class="cdx-table"><thead><tr>
              <th>Inspection ID</th><th>Tank</th><th>Type</th><th>Scheduled</th>
              <th>Inspector</th><th>Result</th><th>Status</th><th></th>
            </tr></thead><tbody>
              ${sorted.map(r => `<tr>
                <td><span class="truckchip" style="font-family:var(--font-mono);font-size:11px;">${escapeHtml(r.inspectionId || '—')}</span></td>
                <td>${escapeHtml(r.tankNumber || r.tankId || '—')}</td>
                <td>${escapeHtml(r.inspectionType || '—')}</td>
                <td>${escapeHtml(r.scheduledDate ? fmtDate(String(r.scheduledDate).slice(0,10)) : '—')}</td>
                <td>${escapeHtml(r.inspector || '—')}</td>
                <td>${isoStatusBadge(r.result)}</td>
                <td>${isoStatusBadge(r.status)}</td>
                <td style="text-align:right;"><button class="btn" data-insp-open="${escapeHtml(r.inspectionId || '')}" style="padding:5px 10px;font-size:12px;">Manage</button></td>
              </tr>`).join('')}
            </tbody></table></div>` : isoEmptyState('No inspection records yet', 'Schedule the first inspection to get started.')}
          </div>
        </div>`;
    }

    async function openInspectionModal(existing, onDone){
      const isEdit = !!existing;
      const tanks = await isoAllActiveTanks();
      const rec = existing || {};

      const overlay = document.getElementById('modalOverlay');
      const box = document.getElementById('modalBox');
      box.classList.remove('opkpi-modal','user-modal','bugreport-modal');
      box.innerHTML = `
        <h4>${isEdit ? 'Edit Inspection' : 'Schedule Inspection'}</h4>
        <div class="formgrid">
          <div class="formfield"><label>Tank *</label>
            <select id="isoInTank">
              <option value="">— Select Tank —</option>
              ${tanks.map(t => `<option value="${escapeHtml(t.tankId || '')}" ${String(rec.tankId || '') === String(t.tankId || '') ? 'selected' : ''}>${escapeHtml(t.tankNumber || t.tankId || '(unnamed)')}</option>`).join('')}
            </select>
          </div>
          <div class="formfield"><label>Inspection Type</label>
            <input type="text" id="isoInType" value="${escapeHtml(rec.inspectionType || '')}" autocomplete="off" placeholder="e.g. Periodic, Hydro, Visual">
          </div>
          <div class="formfield"><label>Scheduled Date *</label>
            <input type="date" id="isoInSched" value="${escapeHtml(String(rec.scheduledDate || isoToday()).slice(0,10))}">
          </div>
          <div class="formfield"><label>Inspector / Provider</label>
            <input type="text" id="isoInInspector" value="${escapeHtml(rec.inspector || '')}" autocomplete="off">
          </div>
          <div class="formfield"><label>Checklist Reference</label>
            <input type="text" id="isoInChecklist" value="${escapeHtml(rec.checklistRef || '')}" autocomplete="off">
          </div>
          <div class="formfield full"><label>Findings (optional)</label>
            <input type="text" id="isoInFind" value="${escapeHtml(rec.findings || '')}" autocomplete="off">
          </div>
        </div>
        <div class="settings-note" id="isoInError" style="display:none;color:var(--red);"></div>
        <div class="modalfoot">
          <button class="btn" id="isoInCancel">Cancel</button>
          <button class="btn primary" id="isoInSave">${isEdit ? 'Save Changes' : 'Schedule'}</button>
        </div>`;
      overlay.classList.add('show');

      box.querySelector('#isoInCancel').onclick = () => overlay.classList.remove('show');
      box.querySelector('#isoInSave').onclick = async () => {
        const errEl = box.querySelector('#isoInError');
        const tankId = String(box.querySelector('#isoInTank').value || '').trim();
        const sched = String(box.querySelector('#isoInSched').value || '').trim();
        if (!tankId){ errEl.style.display='block'; errEl.textContent='Select a tank.'; return; }
        if (!sched){ errEl.style.display='block'; errEl.textContent='Scheduled date required.'; return; }
        const tank = tanks.find(t => String(t.tankId || '') === tankId);

        const rec2 = {
          inspectionId: existing ? existing.inspectionId : isoId('INSP'),
          tankId: tankId,
          tankNumber: tank ? (tank.tankNumber || '') : '',
          inspectionType: String(box.querySelector('#isoInType').value || '').trim(),
          scheduledDate: sched,
          actualDate: existing ? (existing.actualDate || '') : '',
          inspector: String(box.querySelector('#isoInInspector').value || '').trim(),
          checklistRef: String(box.querySelector('#isoInChecklist').value || '').trim(),
          findings: String(box.querySelector('#isoInFind').value || '').trim(),
          correctiveActions: existing ? (existing.correctiveActions || '') : '',
          followUpDate: existing ? (existing.followUpDate || '') : '',
          report: existing ? (existing.report || '') : '',
          result: existing ? (existing.result || 'Pending') : 'Pending',
          status: existing ? (existing.status || 'Scheduled') : 'Scheduled',
        };

        try{
          const list = await getData('isoInspections');
          const i = existing ? list.findIndex(r => r && String(r.inspectionId || '') === String(existing.inspectionId || '')) : -1;
          if (i >= 0) list[i] = rec2; else list.push(rec2);
          DATA_CACHE.isoInspections = list;
          await persist('isoInspections');

          // Update tank inspectionStatus (info only)
          try{
            const tanksArr = await getData('isoTanks');
            const ti = tanksArr.findIndex(t => t && String(t.tankId || '') === tankId);
            if (ti >= 0){
              tanksArr[ti].inspectionStatus = 'Scheduled';
              tanksArr[ti].updatedAt = isoToday();
              tanksArr[ti].updatedBy = isoActor();
              DATA_CACHE.isoTanks = tanksArr;
              await persist('isoTanks');
            }
          }catch(e){ /* best-effort */ }

          if (!existing){
            await isoAppendAudit('Inspection Scheduled', 'Inspection', rec2.inspectionId, rec2.tankId);
          }

          overlay.classList.remove('show');
          if (onDone) await onDone();
        }catch(err){
          errEl.style.display = 'block';
          errEl.textContent = 'Save failed: ' + (err && err.message ? err.message : err);
        }
      };
    }

    function openInspectionDetail(rec, onDone){
      const overlay = document.getElementById('modalOverlay');
      const box = document.getElementById('modalBox');
      box.classList.remove('opkpi-modal','user-modal','bugreport-modal');
      const status = String(rec.status || 'Scheduled');

      const actions = [];
      if (status === 'Scheduled') actions.push({ id:'start', label:'Start Inspection', primary: true });
      if (status === 'In Progress'){
        actions.push({ id:'pass', label:'Mark Passed', primary: true });
        actions.push({ id:'fail', label:'Mark Failed' });
        actions.push({ id:'follow', label:'Follow-up Required' });
      }
      if (status === 'Failed' || status === 'Follow-up Required'){
        actions.push({ id:'restart', label:'Restart Inspection' });
      }

      box.innerHTML = `
        <h4>Inspection ${escapeHtml(rec.inspectionId || '')}</h4>
        <div class="pm-detail-grid" style="margin-bottom:14px;">
          <div class="pm-detail-row"><span class="pm-detail-lbl">Status</span><span class="pm-detail-val">${isoStatusBadge(status)}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Tank</span><span class="pm-detail-val">${escapeHtml(rec.tankNumber || rec.tankId || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Type</span><span class="pm-detail-val">${escapeHtml(rec.inspectionType || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Scheduled</span><span class="pm-detail-val">${escapeHtml(rec.scheduledDate ? fmtDate(rec.scheduledDate) : '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Actual</span><span class="pm-detail-val">${escapeHtml(rec.actualDate || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Inspector</span><span class="pm-detail-val">${escapeHtml(rec.inspector || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Checklist Ref</span><span class="pm-detail-val">${escapeHtml(rec.checklistRef || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Result</span><span class="pm-detail-val">${isoStatusBadge(rec.result)}</span></div>
          <div class="pm-detail-row" style="grid-column:1/-1;"><span class="pm-detail-lbl">Findings</span><span class="pm-detail-val">${escapeHtml(rec.findings || '—')}</span></div>
          <div class="pm-detail-row" style="grid-column:1/-1;"><span class="pm-detail-lbl">Corrective Actions</span><span class="pm-detail-val">${escapeHtml(rec.correctiveActions || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Follow-up</span><span class="pm-detail-val">${escapeHtml(rec.followUpDate || '—')}</span></div>
        </div>
        <div class="modalfoot" style="flex-wrap:wrap;gap:8px;">
          <button class="btn" id="isoInDClose">Close</button>
          <button class="btn" id="isoInDEdit">Edit</button>
          ${actions.map(a => `<button class="btn${a.primary ? ' primary' : ''}" data-insp-action="${a.id}">${escapeHtml(a.label)}</button>`).join('')}
        </div>`;
      overlay.classList.add('show');

      const finish = async () => { overlay.classList.remove('show'); if (onDone) await onDone(); };
      box.querySelector('#isoInDClose').onclick = () => overlay.classList.remove('show');
      box.querySelector('#isoInDEdit').onclick = () => {
        overlay.classList.remove('show');
        openInspectionModal(rec, onDone);
      };
      box.querySelectorAll('[data-insp-action]').forEach(btn => {
        btn.onclick = async () => {
          await performInspAction(rec, btn.dataset.inspAction);
          await finish();
        };
      });
    }

    async function performInspAction(rec, action){
      const list = await getData('isoInspections');
      const i = list.findIndex(r => r && String(r.inspectionId || '') === String(rec.inspectionId || ''));
      if (i < 0) throw new Error('Inspection not found.');
      const today = isoToday();
      const who = isoActor();
      const r = list[i];

      if (action === 'start'){
        if (r.status !== 'Scheduled') throw new Error('Can only start from Scheduled.');
        r.status = 'In Progress';
        r.actualDate = today;
      } else if (action === 'pass'){
        if (r.status !== 'In Progress') throw new Error('Only from In Progress.');
        r.status = 'Passed';
        r.result = 'Passed';
      } else if (action === 'fail'){
        if (r.status !== 'In Progress') throw new Error('Only from In Progress.');
        const findings = prompt('Failure findings:');
        if (!findings) return;
        r.status = 'Failed';
        r.result = 'Failed';
        r.findings = findings;
      } else if (action === 'follow'){
        if (r.status !== 'In Progress') throw new Error('Only from In Progress.');
        r.status = 'Follow-up Required';
        r.result = 'Follow-up Required';
        const date = prompt('Follow-up date (YYYY-MM-DD):');
        if (date) r.followUpDate = date;
      } else if (action === 'restart'){
        r.status = 'In Progress';
        r.result = 'Pending';
      }

      DATA_CACHE.isoInspections = list;
      await persist('isoInspections');
      await isoAppendAudit('Inspection ' + action, 'Inspection', r.inspectionId, r.tankId);

      // Update tank inspectionStatus field (info only)
      try{
        const tanksArr = await getData('isoTanks');
        const ti = tanksArr.findIndex(t => t && String(t.tankId || '') === String(r.tankId || ''));
        if (ti >= 0){
          tanksArr[ti].inspectionStatus =
            r.status === 'Passed' ? 'Passed'
            : r.status === 'Failed' ? 'Failed'
            : r.status === 'Follow-up Required' ? 'Follow-up Required'
            : r.status === 'In Progress' ? 'Scheduled'
            : 'Scheduled';
          tanksArr[ti].updatedAt = today;
          tanksArr[ti].updatedBy = who;
          DATA_CACHE.isoTanks = tanksArr;
          await persist('isoTanks');
        }
      }catch(e){ /* best-effort */ }
    }

    /* ---------------- Certificates tab ---------------- */
    function certificatesViewHtml(rows){
      const today = new Date(); today.setHours(0,0,0,0);
      let valid = 0, dueSoon = 0, expired = 0, missing = 0;
      rows.forEach(r => {
        const s = isoCertificateStatus(r.expiryDate);
        if (s === 'Valid') valid++;
        else if (s === 'Due Soon') dueSoon++;
        else if (s === 'Expired') expired++;
        else missing++;
      });

      const sorted = rows.slice().sort((a,b) => String(a.expiryDate || '9999').localeCompare(String(b.expiryDate || '9999')));

      return `
        <div class="cdx-statgrid" style="margin-bottom:18px;">
          ${isoStatCard('Valid', valid, 'Compliant')}
          ${isoStatCard('Due Soon', dueSoon, 'Within 30 days')}
          ${isoStatCard('Expired', expired, 'Needs action')}
          ${isoStatCard('Not Available', missing, 'Missing documents')}
        </div>
        <div class="section">
          <div class="section-head">
            <h3>Certificate Register</h3>
            <span class="eyebrow">${sorted.length} certificate${sorted.length === 1 ? '' : 's'}</span>
            <div class="spacer"></div>
            <button class="btn primary" id="isoCertNew">+ Add Certificate</button>
          </div>
          <div class="section-body">
            ${sorted.length ? `<div class="tablewrap"><table class="cdx-table"><thead><tr>
              <th>Tank</th><th>Type</th><th>Ref</th><th>Issued</th>
              <th>Expires</th><th>Issuer</th><th>Status</th><th></th>
            </tr></thead><tbody>
              ${sorted.map(r => `<tr>
                <td>${escapeHtml(r.tankNumber || r.tankId || '—')}</td>
                <td>${escapeHtml(r.certificateType || '—')}</td>
                <td>${escapeHtml(r.documentRef || '—')}</td>
                <td>${escapeHtml(r.issueDate ? fmtDate(r.issueDate) : '—')}</td>
                <td>${isoExpiryLabel(r.expiryDate)}</td>
                <td>${escapeHtml(r.issuer || '—')}</td>
                <td>${isoStatusBadge(r.reminderStatus || isoCertificateStatus(r.expiryDate))}</td>
                <td style="text-align:right;"><button class="btn" data-cert-open="${escapeHtml(r.certificateId || '')}" style="padding:5px 10px;font-size:12px;">Manage</button></td>
              </tr>`).join('')}
            </tbody></table></div>` : isoEmptyState('No certificates yet', 'Add a certificate to start tracking compliance.')}
          </div>
        </div>`;
    }

    async function openCertModal(existing, onDone){
      const isEdit = !!existing;
      const tanks = await isoAllActiveTanks();
      const rec = existing || {};

      const overlay = document.getElementById('modalOverlay');
      const box = document.getElementById('modalBox');
      box.classList.remove('opkpi-modal','user-modal','bugreport-modal');
      box.innerHTML = `
        <h4>${isEdit ? 'Edit Certificate' : 'Add Certificate'}</h4>
        <div class="formgrid">
          <div class="formfield"><label>Tank *</label>
            <select id="isoCeTank">
              <option value="">— Select Tank —</option>
              ${tanks.map(t => `<option value="${escapeHtml(t.tankId || '')}" ${String(rec.tankId || '') === String(t.tankId || '') ? 'selected' : ''}>${escapeHtml(t.tankNumber || t.tankId || '(unnamed)')}</option>`).join('')}
            </select>
          </div>
          <div class="formfield"><label>Certificate Type *</label>
            <input type="text" id="isoCeType" value="${escapeHtml(rec.certificateType || '')}" autocomplete="off" placeholder="e.g. CSC, IMDG, ISO, Test cert">
          </div>
          <div class="formfield"><label>Document Reference</label>
            <input type="text" id="isoCeRef" value="${escapeHtml(rec.documentRef || '')}" autocomplete="off">
          </div>
          <div class="formfield"><label>Issuing Organization</label>
            <input type="text" id="isoCeIssuer" value="${escapeHtml(rec.issuer || '')}" autocomplete="off">
          </div>
          <div class="formfield"><label>Issue Date</label>
            <input type="date" id="isoCeIssue" value="${escapeHtml(String(rec.issueDate || '').slice(0,10))}">
          </div>
          <div class="formfield"><label>Expiry Date</label>
            <input type="date" id="isoCeExpiry" value="${escapeHtml(String(rec.expiryDate || '').slice(0,10))}">
          </div>
          <div class="formfield"><label>Verification Status</label>
            <select id="isoCeVerify">
              ${['Pending Verification','Verified','Rejected'].map(v => `<option value="${v}" ${rec.verificationStatus === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="settings-note">Expiry status is calculated from the actual expiry date. Missing document is different from expired document.</div>
        <div class="settings-note" id="isoCeError" style="display:none;color:var(--red);"></div>
        <div class="modalfoot">
          <button class="btn" id="isoCeCancel">Cancel</button>
          <button class="btn primary" id="isoCeSave">${isEdit ? 'Save Changes' : 'Add Certificate'}</button>
        </div>`;
      overlay.classList.add('show');

      box.querySelector('#isoCeCancel').onclick = () => overlay.classList.remove('show');
      box.querySelector('#isoCeSave').onclick = async () => {
        const errEl = box.querySelector('#isoCeError');
        const tankId = String(box.querySelector('#isoCeTank').value || '').trim();
        const certType = String(box.querySelector('#isoCeType').value || '').trim();
        if (!tankId){ errEl.style.display='block'; errEl.textContent='Select a tank.'; return; }
        if (!certType){ errEl.style.display='block'; errEl.textContent='Certificate type required.'; return; }
        const tank = tanks.find(t => String(t.tankId || '') === tankId);
        const expiryDate = String(box.querySelector('#isoCeExpiry').value || '').trim();

        const rec2 = {
          certificateId: existing ? existing.certificateId : isoId('CERT'),
          tankId: tankId,
          tankNumber: tank ? (tank.tankNumber || '') : '',
          certificateType: certType,
          documentRef: String(box.querySelector('#isoCeRef').value || '').trim(),
          issuer: String(box.querySelector('#isoCeIssuer').value || '').trim(),
          issueDate: String(box.querySelector('#isoCeIssue').value || '').trim(),
          expiryDate: expiryDate,
          verificationStatus: String(box.querySelector('#isoCeVerify').value || 'Pending Verification'),
          reminderStatus: isoCertificateStatus(expiryDate),
        };

        try{
          const list = await getData('isoCertificates');
          const i = existing ? list.findIndex(r => r && String(r.certificateId || '') === String(existing.certificateId || '')) : -1;
          if (i >= 0) list[i] = rec2; else list.push(rec2);
          DATA_CACHE.isoCertificates = list;
          await persist('isoCertificates');

          // Update tank certificateStatus (info only)
          try{
            const tanksArr = await getData('isoTanks');
            const ti = tanksArr.findIndex(t => t && String(t.tankId || '') === tankId);
            if (ti >= 0){
              tanksArr[ti].certificateStatus = rec2.reminderStatus;
              tanksArr[ti].updatedAt = isoToday();
              tanksArr[ti].updatedBy = isoActor();
              DATA_CACHE.isoTanks = tanksArr;
              await persist('isoTanks');
            }
          }catch(e){ /* best-effort */ }

          if (!existing){
            await isoAppendAudit('Certificate Uploaded', 'Certificate', rec2.certificateId, rec2.tankId);
            await isoAppendHistory(rec2.tankId, rec2.tankNumber, 'Certificate Upload', '', '', 'Certificate', rec2.certificateId, certType);
          }

          overlay.classList.remove('show');
          if (onDone) await onDone();
        }catch(err){
          errEl.style.display = 'block';
          errEl.textContent = 'Save failed: ' + (err && err.message ? err.message : err);
        }
      };
    }

    function openCertDetail(rec, onDone){
      const overlay = document.getElementById('modalOverlay');
      const box = document.getElementById('modalBox');
      box.classList.remove('opkpi-modal','user-modal','bugreport-modal');
      const currentStatus = rec.reminderStatus || isoCertificateStatus(rec.expiryDate);

      box.innerHTML = `
        <h4>Certificate ${escapeHtml(rec.documentRef || rec.certificateId || '')}</h4>
        <div class="pm-detail-grid" style="margin-bottom:14px;">
          <div class="pm-detail-row"><span class="pm-detail-lbl">Tank</span><span class="pm-detail-val">${escapeHtml(rec.tankNumber || rec.tankId || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Type</span><span class="pm-detail-val">${escapeHtml(rec.certificateType || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Issuer</span><span class="pm-detail-val">${escapeHtml(rec.issuer || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Issue Date</span><span class="pm-detail-val">${escapeHtml(rec.issueDate ? fmtDate(rec.issueDate) : '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Expiry Date</span><span class="pm-detail-val">${escapeHtml(rec.expiryDate ? fmtDate(rec.expiryDate) : '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Status</span><span class="pm-detail-val">${isoStatusBadge(currentStatus)}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Verification</span><span class="pm-detail-val">${isoStatusBadge(rec.verificationStatus)}</span></div>
        </div>
        <div class="modalfoot" style="flex-wrap:wrap;gap:8px;">
          <button class="btn" id="isoCeDClose">Close</button>
          <button class="btn" id="isoCeDEdit">Edit</button>
          ${rec.verificationStatus !== 'Verified' ? `<button class="btn primary" data-cert-action="verify">Mark Verified</button>` : ''}
          ${rec.verificationStatus !== 'Rejected' ? `<button class="btn" data-cert-action="reject">Mark Rejected</button>` : ''}
        </div>`;
      overlay.classList.add('show');

      const finish = async () => { overlay.classList.remove('show'); if (onDone) await onDone(); };
      box.querySelector('#isoCeDClose').onclick = () => overlay.classList.remove('show');
      box.querySelector('#isoCeDEdit').onclick = () => {
        overlay.classList.remove('show');
        openCertModal(rec, onDone);
      };
      box.querySelectorAll('[data-cert-action]').forEach(btn => {
        btn.onclick = async () => {
          const list = await getData('isoCertificates');
          const i = list.findIndex(r => r && String(r.certificateId || '') === String(rec.certificateId || ''));
          if (i >= 0){
            list[i].verificationStatus = btn.dataset.certAction === 'verify' ? 'Verified' : 'Rejected';
            DATA_CACHE.isoCertificates = list;
            await persist('isoCertificates');
            await isoAppendAudit('Certificate ' + btn.dataset.certAction, 'Certificate', rec.certificateId, rec.tankId);
          }
          await finish();
        };
      });
    }

    /* ---------------- Calendar tab ---------------- */
    function calendarViewHtml(inspections, certificates){
      const today = new Date(); today.setHours(0,0,0,0);
      const items = [];

      // Inspections
      inspections.forEach(r => {
        if (!r.scheduledDate) return;
        const d = new Date(r.scheduledDate + 'T00:00:00');
        if (isNaN(d.getTime())) return;
        const days = Math.round((d - today) / 86400000);
        if (days < -90) return;   // skip very old
        items.push({
          type: 'Inspection',
          date: r.scheduledDate,
          days: days,
          ref: r.inspectionId,
          entity: r.tankNumber || r.tankId,
          label: r.inspectionType || 'Inspection',
          status: r.status,
        });
      });
      // Certificates (expiry)
      certificates.forEach(r => {
        if (!r.expiryDate) return;
        const d = new Date(r.expiryDate + 'T00:00:00');
        if (isNaN(d.getTime())) return;
        const days = Math.round((d - today) / 86400000);
        items.push({
          type: 'Certificate Expiry',
          date: r.expiryDate,
          days: days,
          ref: r.certificateId,
          entity: r.tankNumber || r.tankId,
          label: r.certificateType || 'Certificate',
          status: isoCertificateStatus(r.expiryDate),
        });
      });

      items.sort((a,b) => a.days - b.days);

      const buckets = [
        { key:'overdue',  label:'Overdue / Expired',       items: items.filter(i => i.days < 0) },
        { key:'today',    label:'Today',                   items: items.filter(i => i.days === 0) },
        { key:'d30',      label:'Within 30 days',          items: items.filter(i => i.days > 0 && i.days <= 30) },
        { key:'d60',      label:'31 – 60 days',            items: items.filter(i => i.days > 30 && i.days <= 60) },
        { key:'d90',      label:'61 – 90 days',            items: items.filter(i => i.days > 60 && i.days <= 90) },
      ];

      return `
        <div class="section">
          <div class="section-head"><h3>Upcoming Dates</h3><span class="eyebrow">${items.length} item${items.length === 1 ? '' : 's'}</span></div>
          <div class="section-body">
            ${items.length ? buckets.map(b => b.items.length ? `
              <div style="margin-bottom:20px;">
                <div style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink);margin-bottom:10px;">${escapeHtml(b.label)} <span style="font-size:12px;color:var(--muted);font-weight:500;">(${b.items.length})</span></div>
                <div class="tablewrap"><table class="cdx-table"><thead><tr>
                  <th>Date</th><th>Type</th><th>Entity</th><th>Label</th><th>Ref</th><th>Status</th>
                </tr></thead><tbody>
                  ${b.items.slice(0,30).map(it => `<tr>
                    <td>${escapeHtml(fmtDate(it.date))}${it.days !== 0 ? ` <span style="color:var(--muted);font-size:11px;">(${it.days > 0 ? it.days + 'd' : Math.abs(it.days) + 'd ago'})</span>` : ''}</td>
                    <td>${escapeHtml(it.type)}</td>
                    <td>${escapeHtml(it.entity || '—')}</td>
                    <td>${escapeHtml(it.label)}</td>
                    <td><span style="font-family:var(--font-mono);font-size:11px;">${escapeHtml(it.ref || '—')}</span></td>
                    <td>${isoStatusBadge(it.status)}</td>
                  </tr>`).join('')}
                </tbody></table></div>
              </div>` : '').join('') : isoEmptyState('Nothing scheduled', 'Inspection schedules and certificate expiries will appear here.')}
          </div>
        </div>`;
    }

    await paint();
    return wrap;
  }

  /* =====================================================================
     OVERRIDE ROUTES FASA 2 → FASA 4
     ===================================================================== */

  ROUTES.isoTankCleaning    = { title:'Cleaning Management',       crumb:'ISO Tank', render: renderIsoCleaning    };
  ROUTES.isoTankMaintenance = { title:'Maintenance & Repair',      crumb:'ISO Tank', render: renderIsoMaintenance };
  ROUTES.isoTankInspection  = { title:'Inspection & Certificate',  crumb:'ISO Tank', render: renderIsoInspection  };

  console.log('[ISO Tank] Fasa 4 loaded: Cleaning + Maintenance + Inspection');
})();

/* =========================================================================
   FOCC ISO TANK DEPOT — Fasa 5
   =========================================================================
   · isoTankAlerts  — Exception & Alert Centre (auto-generate + manual actions)
   · isoTankReports — Reports & Analytics (KPI + CSV export)
   =========================================================================
   Prinsip Fasa 5:
   · Alerts auto-generate dari rules — signature-based dedupe. Alert yang
     resolved TIDAK di-resurrect walaupun issue masih ada (user decide).
   · Alerts link ke underlying records (tank / cert / inspection / trip).
   · Reports guna data sebenar. Tiada anggaran, tiada mock.
   · Export CSV apa yang user nampak — bukan semua data.
   ========================================================================= */

(function(){
  'use strict';

  /* ---------------------------------------------------------------------
     HELPERS
     --------------------------------------------------------------------- */

  function isoId(prefix){
    const p = String(prefix || 'ISO').toUpperCase();
    try{ if (window.crypto && crypto.randomUUID) return p + '-' + crypto.randomUUID(); }catch(e){}
    return p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
  }
  function isoToday(){ return new Date().toISOString().slice(0,10); }
  function isoNow(){ return new Date().toISOString().slice(0,16).replace('T',' '); }
  function isoActor(){ return (typeof getSessionEmail === 'function') ? (getSessionEmail() || '') : ''; }

  function isoStatCard(label, value, sub){
    return `<div class="mini-stat"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(String(value == null ? '—' : value))}</div>${sub ? `<div class="meta">${escapeHtml(String(sub))}</div>` : ''}</div>`;
  }
  function isoEmptyState(title, sub){
    return `<div class="cdx-empty"><div style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink);">${escapeHtml(title)}</div><div style="font-size:12.5px;line-height:1.5;max-width:380px;text-align:center;">${escapeHtml(sub)}</div></div>`;
  }
  function isoIntro(title, sub){
    return `<div class="skel-intro"><div class="skel-intro-text"><div class="skel-crumbs"><span>ISO Tank</span><span class="sep">/</span><span class="current">${escapeHtml(title)}</span></div><p>${escapeHtml(sub)}</p></div></div>`;
  }
  function isoStatusBadge(s){ return badgeFor(s); }

  function isoDaysUntil(isoDate){
    if (!isoDate) return null;
    const d = new Date(String(isoDate).slice(0,10) + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    return Math.round((d - today) / 86400000);
  }
  function isoDaysBetween(from, to){
    if (!from || !to) return null;
    const a = new Date(String(from).slice(0,10) + 'T00:00:00');
    const b = new Date(String(to).slice(0,10) + 'T00:00:00');
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    return Math.round((b - a) / 86400000);
  }

  async function isoLoadAll(){
    const [tanks, certificates, inspections, cleaning, maintenance, trips, alerts, movements] = await Promise.all([
      getData('isoTanks').catch(() => []),
      getData('isoCertificates').catch(() => []),
      getData('isoInspections').catch(() => []),
      getData('isoCleaningJobs').catch(() => []),
      getData('isoMaintenanceOrders').catch(() => []),
      getData('isoTrips').catch(() => []),
      getData('isoAlerts').catch(() => []),
      getData('isoTankMovements').catch(() => []),
    ]);
    return {
      tanks: (tanks || []).filter(t => t && t.archived !== 'Yes'),
      certificates: certificates || [],
      inspections: inspections || [],
      cleaning: cleaning || [],
      maintenance: maintenance || [],
      trips: trips || [],
      alerts: alerts || [],
      movements: movements || [],
    };
  }

  /* =====================================================================
     SEKSYEN 1 — ALERT RULES (auto-generate dari data)
     ===================================================================== */

  const ALERT_WINDOW_DAYS = 30;          // certificate due-soon window
  const LONG_YARD_STAY_DAYS = 30;        // yard stay threshold (configurable)
  const MAINT_PENDING_DAYS = 7;          // open WO warning threshold
  const TRIP_NOT_CLOSED_DAYS = 3;        // arrived but not completed

  /* Setiap rule pulangkan { signature, issueCategory, priority, linkedEntityType,
     linkedEntityId, linkedEntityRef, detectedDate, remarks } atau null. */

  function alertForCertificate(cert){
    if (!cert || !cert.expiryDate) return null;
    if (String(cert.verificationStatus || '') === 'Rejected') return null;
    const days = isoDaysUntil(cert.expiryDate);
    if (days === null) return null;

    if (days < 0){
      return {
        signature: `CERT-EXPIRED:${cert.certificateId}`,
        issueCategory: 'Certificate Expired',
        priority: 'Critical',
        linkedEntityType: 'Certificate',
        linkedEntityId: cert.certificateId,
        linkedEntityRef: cert.tankNumber || cert.tankId || '',
        detectedDate: isoToday(),
        remarks: `${cert.certificateType || 'Certificate'} for ${cert.tankNumber || cert.tankId} expired ${Math.abs(days)} day(s) ago.`,
      };
    }
    if (days <= ALERT_WINDOW_DAYS){
      return {
        signature: `CERT-DUE:${cert.certificateId}`,
        issueCategory: 'Certificate Due Soon',
        priority: 'High',
        linkedEntityType: 'Certificate',
        linkedEntityId: cert.certificateId,
        linkedEntityRef: cert.tankNumber || cert.tankId || '',
        detectedDate: isoToday(),
        remarks: `${cert.certificateType || 'Certificate'} for ${cert.tankNumber || cert.tankId} expires in ${days} day(s).`,
      };
    }
    return null;
  }

  function alertForInspection(insp){
    if (!insp) return null;
    const status = String(insp.status || '');
    if (status === 'Passed') return null;

    if (status === 'Failed'){
      return {
        signature: `INSP-FAILED:${insp.inspectionId}`,
        issueCategory: 'Inspection Failed',
        priority: 'High',
        linkedEntityType: 'Inspection',
        linkedEntityId: insp.inspectionId,
        linkedEntityRef: insp.tankNumber || insp.tankId || '',
        detectedDate: isoToday(),
        remarks: `Inspection for ${insp.tankNumber || insp.tankId} failed. ${insp.findings || ''}`.trim(),
      };
    }
    if (status === 'Follow-up Required'){
      const days = insp.followUpDate ? isoDaysUntil(insp.followUpDate) : null;
      if (days !== null && days < 0){
        return {
          signature: `INSP-FOLLOWUP-OVERDUE:${insp.inspectionId}`,
          issueCategory: 'Inspection Overdue',
          priority: 'High',
          linkedEntityType: 'Inspection',
          linkedEntityId: insp.inspectionId,
          linkedEntityRef: insp.tankNumber || insp.tankId || '',
          detectedDate: isoToday(),
          remarks: `Follow-up for ${insp.tankNumber || insp.tankId} overdue by ${Math.abs(days)} day(s).`,
        };
      }
      return null;
    }
    // Scheduled but past scheduled date
    if (status === 'Scheduled' && insp.scheduledDate){
      const days = isoDaysUntil(insp.scheduledDate);
      if (days !== null && days < 0){
        return {
          signature: `INSP-OVERDUE:${insp.inspectionId}`,
          issueCategory: 'Inspection Overdue',
          priority: 'Critical',
          linkedEntityType: 'Inspection',
          linkedEntityId: insp.inspectionId,
          linkedEntityRef: insp.tankNumber || insp.tankId || '',
          detectedDate: isoToday(),
          remarks: `Scheduled inspection for ${insp.tankNumber || insp.tankId} overdue by ${Math.abs(days)} day(s).`,
        };
      }
    }
    return null;
  }

  function alertForCleaning(job){
    if (!job) return null;
    const status = String(job.status || '');
    if (['Completed','Rejected','Re-clean Required'].includes(status)) return null;
    if (!job.plannedComplete) return null;
    const days = isoDaysUntil(job.plannedComplete);
    if (days === null || days >= 0) return null;
    return {
      signature: `CLEANING-OVERDUE:${job.cleaningId}`,
      issueCategory: 'Cleaning Overdue',
      priority: 'Medium',
      linkedEntityType: 'CleaningJob',
      linkedEntityId: job.cleaningId,
      linkedEntityRef: job.tankNumber || job.tankId || '',
      detectedDate: isoToday(),
      remarks: `Cleaning job for ${job.tankNumber || job.tankId} overdue by ${Math.abs(days)} day(s) (was planned to complete ${job.plannedComplete}).`,
    };
  }

  function alertForMaintenance(order){
    if (!order) return null;
    const status = String(order.status || '');
    if (['Completed','Closed'].includes(status)) return null;
    if (!order.reportedDate) return null;
    const days = isoDaysUntil(order.reportedDate);
    if (days === null) return null;
    const openDays = Math.abs(days);
    const prio = String(order.priority || '');
    if (openDays < MAINT_PENDING_DAYS && !['High','Critical'].includes(prio)) return null;
    return {
      signature: `MAINT-PENDING:${order.workOrderId}`,
      issueCategory: 'Work Order Pending',
      priority: prio === 'Critical' ? 'Critical' : prio === 'High' ? 'High' : 'Medium',
      linkedEntityType: 'WorkOrder',
      linkedEntityId: order.workOrderId,
      linkedEntityRef: order.tankNumber || order.tankId || '',
      detectedDate: isoToday(),
      remarks: `Work order ${order.workOrderId} (${order.issueCategory || ''}) open for ${openDays} day(s). ${order.description || ''}`.trim(),
    };
  }

  function alertForTrip(trip){
    if (!trip) return null;
    const status = String(trip.status || '');
    if (['Completed','Cancelled'].includes(status)) return null;

    // Trip in transit past ETA
    if (['In Transit','Dispatched','Delayed'].includes(status) && trip.eta){
      const days = isoDaysUntil(trip.eta);
      if (days !== null && days < 0){
        return {
          signature: `TRIP-DELAYED:${trip.tripId}`,
          issueCategory: 'Trip Delayed',
          priority: 'High',
          linkedEntityType: 'Trip',
          linkedEntityId: trip.tripId,
          linkedEntityRef: trip.tankNumber || trip.tankId || '',
          detectedDate: isoToday(),
          remarks: `Trip ${trip.tripId} to ${trip.destination || '—'} past ETA by ${Math.abs(days)} day(s).`,
        };
      }
    }

    // Arrived but not completed
    if (status === 'Arrived' && trip.actualArrival){
      const days = isoDaysSince(trip.actualArrival);
      if (days !== null && days > TRIP_NOT_CLOSED_DAYS){
        return {
          signature: `TRIP-NOT-CLOSED:${trip.tripId}`,
          issueCategory: 'Trip Not Closed',
          priority: 'Medium',
          linkedEntityType: 'Trip',
          linkedEntityId: trip.tripId,
          linkedEntityRef: trip.tankNumber || trip.tankId || '',
          detectedDate: isoToday(),
          remarks: `Trip ${trip.tripId} arrived ${days} day(s) ago but not marked Completed.`,
        };
      }
    }
    return null;
  }

  function isoDaysSince(isoDate){
    if (!isoDate) return null;
    const d = new Date(String(isoDate).slice(0,10) + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    return Math.round((today - d) / 86400000);
  }

  function alertForLongYardStay(tank){
    if (!tank) return null;
    const status = String(tank.operationalStatus || '');
    if (!['In Yard','Available'].includes(status)) return null;
    if (!tank.blockName) return null;
    if (!tank.lastActivityAt) return null;
    const days = isoDaysSince(tank.lastActivityAt);
    if (days === null || days < LONG_YARD_STAY_DAYS) return null;
    return {
      signature: `LONG-YARD:${tank.tankId}`,
      issueCategory: 'Long Yard Stay',
      priority: 'Medium',
      linkedEntityType: 'Tank',
      linkedEntityId: tank.tankId,
      linkedEntityRef: tank.tankNumber || tank.tankId || '',
      detectedDate: isoToday(),
      remarks: `Tank ${tank.tankNumber || tank.tankId} in yard ${days} day(s) — exceeds ${LONG_YARD_STAY_DAYS}-day threshold.`,
    };
  }

  /* Generate senarai alert issues dari data semasa. */
  function computeCurrentIssues(data){
    const out = [];
    const push = a => { if (a) out.push(a); };

    data.certificates.forEach(c => push(alertForCertificate(c)));
    data.inspections.forEach(i => push(alertForInspection(i)));
    data.cleaning.forEach(c => push(alertForCleaning(c)));
    data.maintenance.forEach(m => push(alertForMaintenance(m)));
    data.trips.forEach(t => push(alertForTrip(t)));
    data.tanks.forEach(t => push(alertForLongYardStay(t)));

    return out;
  }

  /* Signature = compare alert yang belum resolved (Open/Acknowledged/In Progress/Escalated).
     Kalau ada issue dengan signature yang SAMA dan status belum resolved → skip.
     Kalau user dah resolve → issue boleh naik balik (fresh alert). */
  function alertSignature(alert){
    if (!alert) return '';
    return `${alert.issueCategory || ''}:${alert.linkedEntityId || ''}`;
  }

  function isOpenStatus(s){
    return ['Open','Acknowledged','In Progress','Escalated'].includes(String(s || ''));
  }

  /* Reconcile: bandingkan issues vs alerts. Tambah yang baharu.
     TIDAK ubah alerts yang dah ada (user actions kekal). */
  async function reconcileAlerts(){
    const data = await isoLoadAll();
    const issues = computeCurrentIssues(data);
    if (!issues.length) return { added: 0, resolved: 0 };

    const existingSigs = new Set(
      data.alerts.filter(a => isOpenStatus(a.status)).map(alertSignature)
    );

    const toAdd = issues.filter(i => !existingSigs.has(i.signature));
    if (!toAdd.length) return { added: 0, resolved: 0 };

    const newAlerts = toAdd.map(issue => ({
      alertId: isoId('ALERT'),
      issueCategory: issue.issueCategory,
      linkedEntityType: issue.linkedEntityType,
      linkedEntityId: issue.linkedEntityId,
      linkedEntityRef: issue.linkedEntityRef,
      detectedDate: issue.detectedDate,
      priority: issue.priority,
      assignedTo: '',
      status: 'Open',
      remarks: issue.remarks || '',
      resolvedBy: '',
      resolvedAt: '',
      _signature: issue.signature,
    }));

    const list = await getData('isoAlerts').catch(() => []);
    newAlerts.forEach(a => list.push(a));
    DATA_CACHE.isoAlerts = list;
    await persist('isoAlerts');
    return { added: newAlerts.length, resolved: 0 };
  }

  /* =====================================================================
     PAGE 10 — EXCEPTION & ALERT CENTRE
     ===================================================================== */

  const ALERT_PRIORITIES = ['Critical','High','Medium','Informational'];
  const ALERT_STATUSES = ['Open','Acknowledged','In Progress','Escalated','Resolved'];

  async function renderIsoAlerts(){
    const wrap = document.createElement('div');
    let filterPriority = 'All';
    let filterStatus = 'All';
    let autoRefresh = true;

    async function paint(){
      let data = await isoLoadAll();
      let alerts = data.alerts.slice();

      const openCount = alerts.filter(a => isOpenStatus(a.status)).length;

      // Kiraan per priority (semua status)
      const byPriority = {};
      ALERT_PRIORITIES.forEach(p => byPriority[p] = 0);
      alerts.forEach(a => {
        const p = String(a.priority || '');
        if (byPriority[p] !== undefined) byPriority[p]++;
      });

      const filtered = alerts.filter(a => {
        if (filterPriority !== 'All' && String(a.priority || '') !== filterPriority) return false;
        if (filterStatus !== 'All' && String(a.status || '') !== filterStatus) return false;
        return true;
      }).sort((a,b) => {
        const pa = ALERT_PRIORITIES.indexOf(String(a.priority || ''));
        const pb = ALERT_PRIORITIES.indexOf(String(b.priority || ''));
        if (pa !== pb) return pa - pb;
        return String(b.detectedDate || '').localeCompare(String(a.detectedDate || ''));
      });

      wrap.innerHTML = `
        ${isoIntro('Exception & Alert Centre', 'Operational issues aggregated across all ISO Tank modules. Alerts auto-generated from live data.')}

        <div class="cdx-statgrid" style="margin-bottom:18px;">
          ${isoStatCard('Open Issues', openCount, 'Not yet resolved')}
          ${isoStatCard('Critical', byPriority.Critical || 0, 'Immediate action')}
          ${isoStatCard('High', byPriority.High || 0, 'Priority')}
          ${isoStatCard('Medium', byPriority.Medium || 0, 'Monitor')}
          ${isoStatCard('Total Alerts', alerts.length, 'All time')}
        </div>

        <div class="section">
          <div class="section-head">
            <h3>Alert List</h3>
            <span class="eyebrow">${filtered.length} shown</span>
            <div class="spacer"></div>
            <button class="btn" id="isoAlertRefresh" title="Re-scan live data for new issues">
              ⟳ Re-scan
            </button>
          </div>
          <div class="section-body">
            <div class="toolbar">
              <span class="tblfilter-wrap">
                <span class="tblfilter-lbl">Priority:</span>
                <select id="isoAlertFilterPriority" class="searchbox" style="max-width:180px;">
                  <option value="All"${filterPriority === 'All' ? ' selected' : ''}>All Priorities</option>
                  ${ALERT_PRIORITIES.map(p => `<option value="${p}"${filterPriority === p ? ' selected' : ''}>${p}</option>`).join('')}
                </select>
              </span>
              <span class="tblfilter-wrap">
                <span class="tblfilter-lbl">Status:</span>
                <select id="isoAlertFilterStatus" class="searchbox" style="max-width:180px;">
                  <option value="All"${filterStatus === 'All' ? ' selected' : ''}>All Statuses</option>
                  ${ALERT_STATUSES.map(s => `<option value="${s}"${filterStatus === s ? ' selected' : ''}>${s}</option>`).join('')}
                </select>
              </span>
            </div>
            ${filtered.length ? alertsTableHtml(filtered) : isoEmptyState('No alerts', filterPriority === 'All' && filterStatus === 'All' ? 'All clear — no outstanding operational issues.' : 'No alerts matching current filters.')}
          </div>
        </div>
      `;

      // Wire filter
      wrap.querySelector('#isoAlertFilterPriority').onchange = e => {
        filterPriority = e.target.value; paint();
      };
      wrap.querySelector('#isoAlertFilterStatus').onchange = e => {
        filterStatus = e.target.value; paint();
      };
      wrap.querySelector('#isoAlertRefresh').onclick = async () => {
        const btn = wrap.querySelector('#isoAlertRefresh');
        btn.disabled = true; btn.textContent = '⟳ Scanning…';
        try{
          const res = await reconcileAlerts();
          alert('Re-scan complete. ' + res.added + ' new alert' + (res.added === 1 ? '' : 's') + ' added.');
          await paint();
        }catch(e){
          btn.disabled = false; btn.textContent = '⟳ Re-scan';
          alert('Re-scan failed: ' + (e && e.message ? e.message : e));
        }
      };

      // Wire row open
      wrap.querySelectorAll('[data-alert-open]').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.alertOpen;
          const alert = alerts.find(a => String(a.alertId || '') === id);
          if (alert) openAlertDetail(alert, paint);
        };
      });
    }

    function alertsTableHtml(alerts){
      return `<div class="tablewrap"><table class="cdx-table"><thead><tr>
        <th>Priority</th><th>Category</th><th>Entity</th><th>Detected</th>
        <th>Assigned To</th><th>Status</th><th></th>
      </tr></thead><tbody>
        ${alerts.map(a => `<tr>
          <td>${isoStatusBadge(a.priority)}</td>
          <td>${escapeHtml(a.issueCategory || '—')}<div class="settings-note" style="margin:2px 0 0;">${escapeHtml(String(a.remarks || '').slice(0,120))}</div></td>
          <td>${escapeHtml(a.linkedEntityRef || a.linkedEntityId || '—')}<div class="settings-note" style="margin:2px 0 0;">${escapeHtml(a.linkedEntityType || '')}</div></td>
          <td>${escapeHtml(a.detectedDate ? fmtDate(String(a.detectedDate).slice(0,10)) : '—')}</td>
          <td>${escapeHtml(a.assignedTo || '—')}</td>
          <td>${isoStatusBadge(a.status)}</td>
          <td style="text-align:right;"><button class="btn" data-alert-open="${escapeHtml(a.alertId || '')}" style="padding:5px 10px;font-size:12px;">Manage</button></td>
        </tr>`).join('')}
      </tbody></table></div>`;
    }

    function openAlertDetail(alert, onDone){
      const overlay = document.getElementById('modalOverlay');
      const box = document.getElementById('modalBox');
      box.classList.remove('opkpi-modal','user-modal','bugreport-modal');
      const status = String(alert.status || 'Open');
      const resolved = status === 'Resolved';

      box.innerHTML = `
        <h4>Alert ${escapeHtml(alert.alertId || '')}</h4>
        <div class="pm-detail-grid" style="margin-bottom:14px;">
          <div class="pm-detail-row"><span class="pm-detail-lbl">Priority</span><span class="pm-detail-val">${isoStatusBadge(alert.priority)}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Status</span><span class="pm-detail-val">${isoStatusBadge(status)}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Category</span><span class="pm-detail-val">${escapeHtml(alert.issueCategory || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Detected</span><span class="pm-detail-val">${escapeHtml(alert.detectedDate ? fmtDate(String(alert.detectedDate).slice(0,10)) : '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Linked Entity</span><span class="pm-detail-val">${escapeHtml(alert.linkedEntityType || '—')} · ${escapeHtml(alert.linkedEntityRef || alert.linkedEntityId || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Assigned To</span><span class="pm-detail-val">${escapeHtml(alert.assignedTo || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Resolved By</span><span class="pm-detail-val">${escapeHtml(alert.resolvedBy || '—')}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Resolved At</span><span class="pm-detail-val">${escapeHtml(alert.resolvedAt || '—')}</span></div>
        </div>
        <div class="formfield full" style="margin-bottom:12px;">
          <label>Remarks / Evidence</label>
          <textarea id="isoAlertRemarks" rows="3" placeholder="Add context or evidence...">${escapeHtml(alert.remarks || '')}</textarea>
        </div>
        <div class="modalfoot" style="flex-wrap:wrap;gap:8px;">
          <button class="btn" id="isoAlertClose">Close</button>
          ${!resolved ? `
            <button class="btn" data-alert-action="assign">Assign</button>
            <button class="btn" data-alert-action="acknowledge">Acknowledge</button>
            <button class="btn" data-alert-action="progress">In Progress</button>
            <button class="btn" data-alert-action="escalate">Escalate</button>
            <button class="btn primary" data-alert-action="resolve">Mark Resolved</button>
          ` : `<span class="badge good">Resolved</span>`}
        </div>`;
      overlay.classList.add('show');

      box.querySelector('#isoAlertClose').onclick = () => overlay.classList.remove('show');

      box.querySelectorAll('[data-alert-action]').forEach(btn => {
        btn.onclick = async () => {
          const action = btn.dataset.alertAction;
          const newRemarks = String(box.querySelector('#isoAlertRemarks').value || '').trim();
          await performAlertAction(alert, action, newRemarks);
          overlay.classList.remove('show');
          if (onDone) await onDone();
        };
      });
    }

    async function performAlertAction(alert, action, newRemarks){
      const list = await getData('isoAlerts');
      const i = list.findIndex(a => a && String(a.alertId || '') === String(alert.alertId || ''));
      if (i < 0) throw new Error('Alert not found.');
      const a = list[i];
      const who = isoActor();
      const now = isoNow();

      if (action === 'assign'){
        const user = prompt('Assign to (name or email):', a.assignedTo || '');
        if (!user) return;
        a.assignedTo = user;
        if (a.status === 'Open') a.status = 'Acknowledged';
      } else if (action === 'acknowledge'){
        if (a.status === 'Open') a.status = 'Acknowledged';
      } else if (action === 'progress'){
        a.status = 'In Progress';
      } else if (action === 'escalate'){
        const reason = prompt('Escalation reason:');
        if (!reason) return;
        a.status = 'Escalated';
        newRemarks = (newRemarks || a.remarks || '') + '\n[Escalated] ' + reason;
      } else if (action === 'resolve'){
        const resolution = prompt('Resolution notes:');
        if (!resolution) return;
        a.status = 'Resolved';
        a.resolvedBy = who;
        a.resolvedAt = now;
        newRemarks = (newRemarks || a.remarks || '') + '\n[Resolved] ' + resolution;
      }

      a.remarks = newRemarks;
      DATA_CACHE.isoAlerts = list;
      await persist('isoAlerts');
    }

    /* Auto-run reconcile on page load — silent, no alert popup */
    try{
      const res = await reconcileAlerts();
      if (res.added > 0) console.log('[ISO Tank Alerts] Auto-generated', res.added, 'new alert(s)');
    }catch(e){ console.warn('[ISO Tank Alerts] Auto-reconcile failed:', e); }

    await paint();
    return wrap;
  }

  /* =====================================================================
     PAGE 12 — REPORTS & ANALYTICS
     ===================================================================== */

  async function renderIsoReports(){
    const wrap = document.createElement('div');
    let activeTab = 'operations';
    let cached = null;

    async function loadAll(){
      cached = await isoLoadAll();
      return cached;
    }

    function csvQuote(v){
      const s = String(v == null ? '' : v);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }
    function toCsv(headers, rows){
      const lines = [headers.map(csvQuote).join(',')];
      rows.forEach(r => lines.push(r.map(csvQuote).join(',')));
      return lines.join('\r\n');
    }
    function downloadCsv(filename, headers, rows){
      const csv = '\ufeff' + toCsv(headers, rows);
      const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }

    async function paint(){
      await loadAll();
      wrap.innerHTML = `
        ${isoIntro('Reports & Analytics', 'Operational reporting dari data sebenar. Export CSV mengikut tab aktif.')}

        <div class="cdx-tabs" style="margin-bottom:14px;">
          ${[
            ['operations','Operational Overview'],
            ['yard','Yard Utilization'],
            ['haulage','Haulage Performance'],
            ['cleaning','Cleaning & Maintenance'],
            ['inspection','Inspection & Certificates'],
          ].map(([k,lbl]) => `<button class="cdx-tab${activeTab === k ? ' active' : ''}" data-iso-rep-tab="${k}">${lbl}</button>`).join('')}
          <div style="flex:1;"></div>
          <button class="btn" id="isoRepExport" style="align-self:center;">Export CSV</button>
        </div>

        <div id="isoRepHost"></div>
      `;

      wrap.querySelectorAll('[data-iso-rep-tab]').forEach(btn => {
        btn.onclick = () => { activeTab = btn.dataset.isoRepTab; paint(); };
      });

      const host = wrap.querySelector('#isoRepHost');
      if (activeTab === 'operations') host.innerHTML = tabOperations(cached);
      else if (activeTab === 'yard') host.innerHTML = tabYard(cached);
      else if (activeTab === 'haulage') host.innerHTML = tabHaulage(cached);
      else if (activeTab === 'cleaning') host.innerHTML = tabCleaning(cached);
      else if (activeTab === 'inspection') host.innerHTML = tabInspection(cached);

      wrap.querySelector('#isoRepExport').onclick = () => exportCurrentTab();
    }

    /* ---------------- Tab A — Operational Overview ---------------- */
    function computeOpStats(d){
      const activeTanks = d.tanks.length;
      const inYard = d.tanks.filter(t => ['In Yard','Available'].includes(String(t.operationalStatus || ''))).length;
      const available = d.tanks.filter(t => String(t.operationalStatus || '') === 'Available').length;
      const onTrip = d.tanks.filter(t => String(t.operationalStatus || '') === 'On Trip').length;
      const maintenance = d.tanks.filter(t => String(t.operationalStatus || '') === 'Maintenance').length;
      const outOfService = d.tanks.filter(t => String(t.operationalStatus || '') === 'Out of Service').length;

      // Avg days in yard untuk tank yang ada blockName
      const inYardArr = d.tanks.filter(t => t.blockName && t.lastActivityAt);
      const avgDays = inYardArr.length
        ? Math.round(inYardArr.reduce((s,t) => s + (isoDaysSince(t.lastActivityAt) || 0), 0) / inYardArr.length)
        : 0;

      const completedTrips = d.trips.filter(t => String(t.status || '') === 'Completed').length;
      const delayedTrips = d.trips.filter(t => ['Delayed','Exception'].includes(String(t.status || ''))).length;

      // Cleaning turnaround (avg planned → actual complete)
      const completedClean = d.cleaning.filter(c => c.status === 'Completed' && c.actualStart && c.actualComplete);
      const cleaningTurn = completedClean.length
        ? Math.round(completedClean.reduce((s,c) => s + (isoDaysBetween(c.actualStart, c.actualComplete) || 0), 0) / completedClean.length)
        : 0;

      // Maintenance downtime (avg reportedDate → completedDate untuk closed)
      const closedMaint = d.maintenance.filter(m => ['Completed','Closed'].includes(String(m.status || '')) && m.reportedDate && m.completedDate);
      const maintDowntime = closedMaint.length
        ? Math.round(closedMaint.reduce((s,m) => s + (isoDaysBetween(m.reportedDate, m.completedDate) || 0), 0) / closedMaint.length)
        : 0;

      return { activeTanks, inYard, available, onTrip, maintenance, outOfService, avgDays, completedTrips, delayedTrips, cleaningTurn, maintDowntime };
    }

    function tabOperations(d){
      const s = computeOpStats(d);
      const occupancyPct = s.activeTanks ? Math.round(s.inYard / s.activeTanks * 100) : 0;
      return `
        <div class="cdx-statgrid" style="margin-bottom:18px;">
          ${isoStatCard('Total ISO Tanks', s.activeTanks, 'Active (not archived)')}
          ${isoStatCard('Yard Occupancy', occupancyPct + '%', s.inYard + ' of ' + s.activeTanks)}
          ${isoStatCard('Available', s.available, 'Ready for use')}
          ${isoStatCard('On Trip', s.onTrip, 'Dispatched')}
          ${isoStatCard('Avg Days in Yard', s.avgDays + 'd', 'Currently stored')}
          ${isoStatCard('Trips Completed', s.completedTrips, 'All time')}
          ${isoStatCard('Trips Delayed', s.delayedTrips, 'Delayed / Exception')}
          ${isoStatCard('Cleaning Turnaround', s.cleaningTurn + 'd', 'Avg start → complete')}
          ${isoStatCard('Maintenance Downtime', s.maintDowntime + 'd', 'Avg reported → completed')}
        </div>

        <div class="section">
          <div class="section-head"><h3>Fleet Breakdown</h3></div>
          <div class="section-body">
            <div class="tablewrap"><table class="cdx-table"><thead><tr>
              <th>Operational Status</th><th>Count</th><th>% of Fleet</th>
            </tr></thead><tbody>
              ${[
                ['In Yard', s.inYard],
                ['Available', s.available],
                ['On Trip', s.onTrip],
                ['Maintenance', s.maintenance],
                ['Out of Service', s.outOfService],
              ].map(([lbl, n]) => `<tr>
                <td>${escapeHtml(lbl)}</td>
                <td>${n}</td>
                <td>${s.activeTanks ? Math.round(n / s.activeTanks * 100) : 0}%</td>
              </tr>`).join('')}
            </tbody></table></div>
          </div>
        </div>`;
    }

    /* ---------------- Tab B — Yard Utilization ---------------- */
    function tabYard(d){
      const inYard = d.tanks.filter(t => t.blockName && ['In Yard','Available'].includes(String(t.operationalStatus || '')));
      const byBlock = {};
      inYard.forEach(t => {
        const b = String(t.blockName || '(unassigned)');
        if (!byBlock[b]) byBlock[b] = [];
        byBlock[b].push(t);
      });

      const longStay = inYard
        .map(t => ({ ...t, days: isoDaysSince(t.lastActivityAt) || 0 }))
        .filter(t => t.days >= LONG_YARD_STAY_DAYS)
        .sort((a,b) => b.days - a.days);

      return `
        <div class="cdx-grid2">
          <div class="section">
            <div class="section-head"><h3>Occupancy by Block</h3><span class="eyebrow">${Object.keys(byBlock).length} block${Object.keys(byBlock).length === 1 ? '' : 's'}</span></div>
            <div class="section-body">
              ${Object.keys(byBlock).length ? `<div class="tablewrap"><table class="cdx-table"><thead><tr>
                <th>Block</th><th>Tanks</th><th>Oldest Stay</th>
              </tr></thead><tbody>
                ${Object.entries(byBlock).sort().map(([b, arr]) => {
                  const oldest = arr.reduce((m,t) => Math.max(m, isoDaysSince(t.lastActivityAt) || 0), 0);
                  return `<tr>
                    <td>${escapeHtml(b)}</td>
                    <td>${arr.length}</td>
                    <td>${oldest}d</td>
                  </tr>`;
                }).join('')}
              </tbody></table></div>` : isoEmptyState('No tanks in yard', 'Assign tanks to blocks via Gate In or Yard Layout.')}
            </div>
          </div>

          <div class="section">
            <div class="section-head"><h3>Long-Stay Tanks</h3><span class="eyebrow">&ge; ${LONG_YARD_STAY_DAYS} days</span></div>
            <div class="section-body">
              ${longStay.length ? `<div class="tablewrap"><table class="cdx-table"><thead><tr>
                <th>Tank</th><th>Block</th><th>Slot</th><th>Days</th>
              </tr></thead><tbody>
                ${longStay.slice(0, 30).map(t => `<tr>
                  <td>${escapeHtml(t.tankNumber || t.tankId || '—')}</td>
                  <td>${escapeHtml(t.blockName || '—')}</td>
                  <td>${escapeHtml(t.slotNo || '—')}</td>
                  <td><span class="badge warn">${t.days}d</span></td>
                </tr>`).join('')}
              </tbody></table></div>` : isoEmptyState('No long-stay tanks', 'All tanks under ' + LONG_YARD_STAY_DAYS + ' days in yard.')}
            </div>
          </div>
        </div>`;
    }

    /* ---------------- Tab C — Haulage Performance ---------------- */
    function tabHaulage(d){
      const statusCounts = {};
      d.trips.forEach(t => {
        const s = String(t.status || 'Unknown');
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });

      const completed = d.trips.filter(t => t.status === 'Completed');
      const onTime = completed.filter(t => {
        if (!t.eta || !t.actualArrival) return true;
        return String(t.actualArrival).slice(0,10) <= String(t.eta).slice(0,10);
      }).length;
      const onTimePct = completed.length ? Math.round(onTime / completed.length * 100) : 0;

      const byCustomer = {};
      d.trips.forEach(t => {
        const c = String(t.customer || '(unassigned)');
        if (!byCustomer[c]) byCustomer[c] = { total:0, completed:0, delayed:0 };
        byCustomer[c].total++;
        if (t.status === 'Completed') byCustomer[c].completed++;
        if (['Delayed','Exception'].includes(t.status)) byCustomer[c].delayed++;
      });

      return `
        <div class="cdx-statgrid" style="margin-bottom:18px;">
          ${isoStatCard('Total Trips', d.trips.length, 'All time')}
          ${isoStatCard('Completed', completed.length, 'Finished')}
          ${isoStatCard('On-Time Rate', onTimePct + '%', completed.length + ' completed trips')}
          ${isoStatCard('Delayed', (statusCounts.Delayed || 0) + (statusCounts.Exception || 0), 'Delayed + Exception')}
          ${isoStatCard('In Transit', statusCounts['In Transit'] || 0, 'Currently moving')}
        </div>

        <div class="cdx-grid2">
          <div class="section">
            <div class="section-head"><h3>Status Breakdown</h3></div>
            <div class="section-body">
              ${Object.keys(statusCounts).length ? `<div class="tablewrap"><table class="cdx-table"><thead><tr>
                <th>Status</th><th>Count</th>
              </tr></thead><tbody>
                ${Object.entries(statusCounts).sort((a,b) => b[1] - a[1]).map(([s,c]) => `<tr>
                  <td>${isoStatusBadge(s)}</td><td>${c}</td>
                </tr>`).join('')}
              </tbody></table></div>` : isoEmptyState('No trips', 'Create trips in Dispatch Board.')}
            </div>
          </div>

          <div class="section">
            <div class="section-head"><h3>By Customer</h3></div>
            <div class="section-body">
              ${Object.keys(byCustomer).length ? `<div class="tablewrap"><table class="cdx-table"><thead><tr>
                <th>Customer</th><th>Total</th><th>Completed</th><th>Delayed</th>
              </tr></thead><tbody>
                ${Object.entries(byCustomer).sort((a,b) => b[1].total - a[1].total).map(([c,s]) => `<tr>
                  <td>${escapeHtml(c)}</td><td>${s.total}</td><td>${s.completed}</td><td>${s.delayed}</td>
                </tr>`).join('')}
              </tbody></table></div>` : isoEmptyState('No customer data', 'Trips with customer assigned will show here.')}
            </div>
          </div>
        </div>`;
    }

    /* ---------------- Tab D — Cleaning & Maintenance ---------------- */
    function tabCleaning(d){
      const cStatus = {};
      d.cleaning.forEach(c => { const s = String(c.status || 'Pending'); cStatus[s] = (cStatus[s] || 0) + 1; });
      const mStatus = {};
      d.maintenance.forEach(m => { const s = String(m.status || 'Open'); mStatus[s] = (mStatus[s] || 0) + 1; });

      const completedClean = d.cleaning.filter(c => c.status === 'Completed');
      const cleanTurn = completedClean.filter(c => c.actualStart && c.actualComplete);
      const cleanAvgTurn = cleanTurn.length
        ? Math.round(cleanTurn.reduce((s,c) => s + (isoDaysBetween(c.actualStart, c.actualComplete) || 0), 0) / cleanTurn.length)
        : 0;
      const cleanCost = completedClean.reduce((s,c) => s + (Number(c.cost) || 0), 0);

      const closedMaint = d.maintenance.filter(m => ['Completed','Closed'].includes(String(m.status || '')));
      const maintCost = closedMaint.reduce((s,m) => s + (Number(m.cost) || 0), 0);

      return `
        <div class="cdx-statgrid" style="margin-bottom:18px;">
          ${isoStatCard('Cleaning Jobs', d.cleaning.length, 'Total')}
          ${isoStatCard('Cleaning Completed', completedClean.length, 'Verified')}
          ${isoStatCard('Avg Cleaning Turnaround', cleanAvgTurn + 'd', 'Start → complete')}
          ${isoStatCard('Cleaning Cost', 'RM ' + cleanCost.toLocaleString(), 'Completed jobs')}
          ${isoStatCard('Maintenance Orders', d.maintenance.length, 'Total')}
          ${isoStatCard('Maintenance Completed', closedMaint.length, 'Done / Closed')}
          ${isoStatCard('Maintenance Cost', 'RM ' + maintCost.toLocaleString(), 'Completed / closed')}
        </div>

        <div class="cdx-grid2">
          <div class="section">
            <div class="section-head"><h3>Cleaning Status</h3></div>
            <div class="section-body">
              ${Object.keys(cStatus).length ? `<div class="tablewrap"><table class="cdx-table"><thead><tr>
                <th>Status</th><th>Count</th>
              </tr></thead><tbody>
                ${Object.entries(cStatus).sort((a,b) => b[1] - a[1]).map(([s,c]) => `<tr><td>${isoStatusBadge(s)}</td><td>${c}</td></tr>`).join('')}
              </tbody></table></div>` : isoEmptyState('No cleaning jobs', 'Cleaning work orders will appear here.')}
            </div>
          </div>

          <div class="section">
            <div class="section-head"><h3>Maintenance Status</h3></div>
            <div class="section-body">
              ${Object.keys(mStatus).length ? `<div class="tablewrap"><table class="cdx-table"><thead><tr>
                <th>Status</th><th>Count</th>
              </tr></thead><tbody>
                ${Object.entries(mStatus).sort((a,b) => b[1] - a[1]).map(([s,c]) => `<tr><td>${isoStatusBadge(s)}</td><td>${c}</td></tr>`).join('')}
              </tbody></table></div>` : isoEmptyState('No maintenance orders', 'Work orders will appear here.')}
            </div>
          </div>
        </div>`;
    }

    /* ---------------- Tab E — Inspection & Certificates ---------------- */
    function tabInspection(d){
      const iStatus = {};
      d.inspections.forEach(i => { const s = String(i.status || 'Scheduled'); iStatus[s] = (iStatus[s] || 0) + 1; });

      const now = new Date(); now.setHours(0,0,0,0);
      let certValid = 0, certDue = 0, certExpired = 0, certMissing = 0;
      d.certificates.forEach(c => {
        const days = isoDaysUntil(c.expiryDate);
        if (days === null) certMissing++;
        else if (days < 0) certExpired++;
        else if (days <= ALERT_WINDOW_DAYS) certDue++;
        else certValid++;
      });

      const upcomingCerts = d.certificates
        .filter(c => {
          const days = isoDaysUntil(c.expiryDate);
          return days !== null && days >= 0 && days <= 60;
        })
        .sort((a,b) => String(a.expiryDate).localeCompare(String(b.expiryDate)));

      return `
        <div class="cdx-statgrid" style="margin-bottom:18px;">
          ${isoStatCard('Certificates Valid', certValid, 'Compliant')}
          ${isoStatCard('Certificates Due Soon', certDue, 'Within ' + ALERT_WINDOW_DAYS + ' days')}
          ${isoStatCard('Certificates Expired', certExpired, 'Needs action')}
          ${isoStatCard('Not Available', certMissing, 'Missing documents')}
          ${isoStatCard('Inspections Passed', iStatus.Passed || 0, 'Cleared')}
          ${isoStatCard('Inspections Failed', iStatus.Failed || 0, 'Requires follow-up')}
        </div>

        <div class="cdx-grid2">
          <div class="section">
            <div class="section-head"><h3>Inspection Status</h3></div>
            <div class="section-body">
              ${Object.keys(iStatus).length ? `<div class="tablewrap"><table class="cdx-table"><thead><tr>
                <th>Status</th><th>Count</th>
              </tr></thead><tbody>
                ${Object.entries(iStatus).sort((a,b) => b[1] - a[1]).map(([s,c]) => `<tr><td>${isoStatusBadge(s)}</td><td>${c}</td></tr>`).join('')}
              </tbody></table></div>` : isoEmptyState('No inspection records', 'Inspection schedule akan muncul di sini.')}
            </div>
          </div>

          <div class="section">
            <div class="section-head"><h3>Upcoming Certificate Expiries</h3><span class="eyebrow">60 days</span></div>
            <div class="section-body">
              ${upcomingCerts.length ? `<div class="tablewrap"><table class="cdx-table"><thead><tr>
                <th>Tank</th><th>Type</th><th>Expires</th><th>Days Left</th>
              </tr></thead><tbody>
                ${upcomingCerts.slice(0, 30).map(c => {
                  const days = isoDaysUntil(c.expiryDate);
                  return `<tr>
                    <td>${escapeHtml(c.tankNumber || c.tankId || '—')}</td>
                    <td>${escapeHtml(c.certificateType || '—')}</td>
                    <td>${escapeHtml(fmtDate(c.expiryDate))}</td>
                    <td>${days <= 30 ? `<span class="badge warn">${days}d</span>` : `${days}d`}</td>
                  </tr>`;
                }).join('')}
              </tbody></table></div>` : isoEmptyState('No upcoming expiries', 'Nothing expiring in next 60 days.')}
            </div>
          </div>
        </div>`;
    }

    /* ---------------- Export current tab ---------------- */
    function exportCurrentTab(){
      const d = cached;
      const stamp = isoToday();
      if (activeTab === 'operations'){
        const s = computeOpStats(d);
        downloadCsv('ISO-Reports-Operations-' + stamp + '.csv',
          ['Metric','Value'],
          [
            ['Total ISO Tanks', s.activeTanks],
            ['In Yard', s.inYard],
            ['Available', s.available],
            ['On Trip', s.onTrip],
            ['Maintenance', s.maintenance],
            ['Out of Service', s.outOfService],
            ['Avg Days in Yard', s.avgDays],
            ['Trips Completed', s.completedTrips],
            ['Trips Delayed', s.delayedTrips],
            ['Cleaning Turnaround (days)', s.cleaningTurn],
            ['Maintenance Downtime (days)', s.maintDowntime],
          ]);
      } else if (activeTab === 'yard'){
        const inYard = d.tanks.filter(t => t.blockName && ['In Yard','Available'].includes(String(t.operationalStatus || '')));
        downloadCsv('ISO-Reports-Yard-' + stamp + '.csv',
          ['Tank','Block','Slot','Status','Days in Yard','Owner','Customer'],
          inYard.map(t => [
            t.tankNumber || t.tankId || '',
            t.blockName || '',
            t.slotNo || '',
            t.operationalStatus || '',
            isoDaysSince(t.lastActivityAt) || 0,
            t.owner || '',
            t.customer || '',
          ]));
      } else if (activeTab === 'haulage'){
        downloadCsv('ISO-Reports-Haulage-' + stamp + '.csv',
          ['Trip ID','Customer','Tank','Truck','Driver','Pickup','Destination','Planned','Actual Departure','Actual Arrival','Status'],
          d.trips.map(t => [
            t.tripId || '', t.customer || '', t.tankNumber || t.tankId || '',
            t.truckReg || '', t.driver || '',
            t.pickupLocation || '', t.destination || '',
            t.plannedDeparture || '', t.actualDeparture || '', t.actualArrival || '',
            t.status || '',
          ]));
      } else if (activeTab === 'cleaning'){
        downloadCsv('ISO-Reports-CleaningMaintenance-' + stamp + '.csv',
          ['Type','ID','Tank','Vendor/Assignee','Planned','Start','Complete','Cost','Status'],
          [
            ...d.cleaning.map(c => ['Cleaning', c.cleaningId, c.tankNumber || c.tankId || '', c.vendor || '', c.plannedStart || '', c.actualStart || '', c.actualComplete || '', c.cost || '', c.status || '']),
            ...d.maintenance.map(m => ['Maintenance', m.workOrderId, m.tankNumber || m.tankId || '', m.assignedTo || '', m.reportedDate || '', m.startDate || '', m.completedDate || '', m.cost || '', m.status || '']),
          ]);
      } else if (activeTab === 'inspection'){
        downloadCsv('ISO-Reports-InspectionCert-' + stamp + '.csv',
          ['Type','Ref','Tank','Category','Issued/Scheduled','Expires/Actual','Issuer/Inspector','Status'],
          [
            ...d.inspections.map(i => ['Inspection', i.inspectionId, i.tankNumber || i.tankId || '', i.inspectionType || '', i.scheduledDate || '', i.actualDate || '', i.inspector || '', i.status || '']),
            ...d.certificates.map(c => ['Certificate', c.documentRef || c.certificateId, c.tankNumber || c.tankId || '', c.certificateType || '', c.issueDate || '', c.expiryDate || '', c.issuer || '', c.reminderStatus || '']),
          ]);
      }
    }

    await paint();
    return wrap;
  }

  /* =====================================================================
     OVERRIDE ROUTES FASA 2 → FASA 5
     ===================================================================== */

  ROUTES.isoTankAlerts  = { title:'Exception & Alert Centre', crumb:'ISO Tank', render: renderIsoAlerts  };
  ROUTES.isoTankReports = { title:'Reports & Analytics',      crumb:'ISO Tank', render: renderIsoReports };

  console.log('[ISO Tank] Fasa 5 loaded: Alerts + Reports');
})();
