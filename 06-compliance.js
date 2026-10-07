/* =========================================================================
   FOCC — 06-compliance.js
   Compliance Alert engine + KPI helpers + rank tables.
   ========================================================================= */

/* ============================================================
   KPI CARD + RANK TABLE HELPERS
============================================================= */
function kpiCard({label, value, note, accent, barPct}){
  return `
    <div class="kpi" style="--accent:${accent || 'var(--teal)'}">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      ${note ? `<div class="note">${note}</div>` : ''}
      ${barPct != null ? `<div class="bar"><i style="width:${Math.min(100, Math.max(0, barPct))}%"></i></div>` : ''}
    </div>`;
}

function rankTable(title, rows, valueLabel){
  let html = `<table class="ranklist"><thead><tr><th>#</th><th>Truck</th><th>${valueLabel}</th></tr></thead><tbody>`;
  rows.forEach((r,i) => {
    html += `<tr><td class="num">${i+1}</td><td><span class="truckchip">${r.truck}</span></td><td>${r.value}</td></tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

function rankTableWithSpending(rows, valueLabel){
  let html = `<table class="ranklist"><thead><tr><th>#</th><th>Truck</th><th>${valueLabel}</th><th>Total Spending</th></tr></thead><tbody>`;
  if (!rows.length){
    html += `<tr><td colspan="4" style="padding:18px;text-align:center;color:var(--muted);">No data</td></tr>`;
  } else {
    rows.forEach((r,i) => {
      html += `<tr><td class="num">${i+1}</td><td><span class="truckchip">${r.truck}</span></td><td>${r.value}</td><td>${FMT.money(r.spending)}</td></tr>`;
    });
  }
  html += `</tbody></table>`;
  return html;
}

/* ============================================================
   COMPLIANCE ALERT ENGINE
============================================================= */
function toWhatsAppDigits(phone){
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('60')) return digits;
  if (digits.startsWith('0')) return '60' + digits.slice(1);
  return '60' + digits;
}

function buildComplianceAlertItems(rows, assetNoun){
  const today = new Date(); today.setHours(0,0,0,0);
  const items = [];
  rows.forEach(r => {
    const truck = r.lorry || `(No ${assetNoun})`;
    COMPLIANCE_ALERT_FIELDS.forEach(f => {
      const raw = r[f.id];
      if (!raw || raw === '-') return;
      const dt = new Date(`${raw}T00:00:00`);
      if (isNaN(dt.getTime())) return;
      const daysLeft = Math.round((dt - today) / 86400000);
      items.push({truck, field: f.label, date: raw, daysLeft});
    });
  });
  return items;
}

function buildStaffComplianceAlertItems(rows){
  const today = new Date(); today.setHours(0,0,0,0);
  const items = [];
  rows.forEach(r => {
    const staffName = r.staffName || '(No Staff Name)';
    STAFF_COMPLIANCE_ALERT_FIELDS.forEach(f => {
      const raw = r[f.id];
      if (!raw || raw === '-') return;
      const dueDateStr = f.calc(raw);
      if (!dueDateStr) return;
      const dt = new Date(`${dueDateStr}T00:00:00`);
      if (isNaN(dt.getTime())) return;
      const daysLeft = Math.round((dt - today) / 86400000);
      items.push({truck: staffName, field: f.label, date: dueDateStr, daysLeft});
    });
  });
  return items;
}

/* FEG compliance: scan row.units[] (bukan row) — unit Disposed & Draft DILANGKAU. */
function fegCylinderReplaceFrom(cylinderDue){
  const raw = String(cylinderDue || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(raw + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() - FEG_CYLINDER_REPLACE_MONTHS);
  return d;
}

function fegCylinderDueFrom(mfgDate){
  const raw = String(mfgDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const y = Number(raw.slice(0, 4)) + FEG_CYLINDER_TEST_YEARS;
  if (!y) return '';
  let mm = raw.slice(5, 7), dd = raw.slice(8, 10);
  const leap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  if (mm === '02' && dd === '29' && !leap) dd = '28';
  return y + '-' + mm + '-' + dd;
}

function fegSerialLabel(u){
  const pre = String((u && u.serialPrefix) || '').trim();
  const no  = String((u && u.serialNo) || '').trim();
  if (!no) return '';
  return pre ? (pre + '-' + no) : no;
}

function fegIsDisposed(u){ return String((u && u.disposal) || 'No') === 'Yes'; }

function fegUnitServiceLog(unit){
  return (unit && Array.isArray(unit.serviceLog)) ? unit.serviceLog : [];
}
function fegActiveService(unit){
  return fegUnitServiceLog(unit).find(s => s && s.status === 'Active') || null;
}
function fegIsInService(unit){ return !!fegActiveService(unit); }

function fegServiceCount(unit){
  return fegUnitServiceLog(unit).filter(s => s && s.status === 'Completed').length;
}
function fegNextServiceNo(unit){
  const maxLog = fegUnitServiceLog(unit).reduce((m,s) => Math.max(m, Number(s && s.serviceNo) || 0), 0);
  const seq    = Number(unit && unit.serviceSeq) || 0;
  return Math.max(maxLog, seq) + 1;
}

function buildFegComplianceAlertItems(rows){
  const today = new Date(); today.setHours(0,0,0,0);
  const items = [];
  (rows || []).forEach(r => {
    (r.units || []).forEach(u => {
      if (String(u.disposal || 'No') === 'Yes') return;
      if (!String(u.serialNo || '').trim()) return;
      const asset  = r.assetRef || '(No Asset)';
      const serial = fegSerialLabel(u);

      const replaceFrom = fegCylinderReplaceFrom(u.cylinderDue);
      if (replaceFrom && today >= replaceFrom){
        const due = new Date(String(u.cylinderDue) + 'T00:00:00');
        items.push({
          truck: asset, serial: serial,
          field: 'Cylinder Replacement',
          date: String(u.cylinderDue),
          daysLeft: Math.round((due - today) / 86400000),
          isCylinderReplacement: true,
        });
        return;
      }

      if (fegIsInService(u)) return;

      FEG_COMPLIANCE_ALERT_FIELDS.forEach(f => {
        const raw = u[f.id];
        if (!raw || raw === '-') return;
        const dt = new Date(`${raw}T00:00:00`);
        if (isNaN(dt.getTime())) return;
        const daysLeft = Math.round((dt - today) / 86400000);
        items.push({ truck: asset, serial: serial, field: f.label, date: raw, daysLeft: daysLeft });
      });
    });
  });
  return items;
}

function complianceDaysLeftLabel(daysLeft){
  if (daysLeft > 0) return `Days Left: ${daysLeft}`;
  if (daysLeft === 0) return 'Due Today';
  return `Expired ${Math.abs(daysLeft)} Days Ago`;
}

function groupComplianceItemsByTruck(items){
  const map = new Map();
  items.forEach(it => {
    if (!map.has(it.truck)) map.set(it.truck, []);
    map.get(it.truck).push(it);
  });
  const groups = Array.from(map.entries()).map(([truck, list]) => {
    list.sort((a, b) => a.daysLeft - b.daysLeft);
    return {truck, items: list, minDays: list[0].daysLeft};
  });
  groups.sort((a, b) => a.minDays - b.minDays || a.truck.localeCompare(b.truck));
  return groups;
}

function buildComplianceAlertMessage(rows, config, tableKey){
  const allItems = tableKey === 'staffDatabase'
    ? buildStaffComplianceAlertItems(rows)
    : tableKey === 'feg'
    ? buildFegComplianceAlertItems(rows)
    : buildComplianceAlertItems(rows, config.asset);
  const dueItems = tableKey === 'staffDatabase'
    ? allItems.filter(it => it.daysLeft <= STAFF_COMPLIANCE_ALERT_WINDOW_DAYS)
    : allItems.filter(it => it.isCylinderReplacement || it.daysLeft <= COMPLIANCE_ALERT_WINDOW_DAYS);
  const groups = groupComplianceItemsByTruck(dueItems);

  const allClear = tableKey !== 'feg' && groups.length === 0;
  const lines = [`${allClear ? '✅' : '⚠️'} ${config.title}${allClear ? ' — ALL CLEAR' : ''}`];

  if (tableKey === 'feg'){
    if (groups.length){
      groups.forEach((g, i) => {
        if (i > 0) lines.push('--------------------------------');
        lines.push(`${config.asset} No: ${g.truck}`);
        g.items.forEach(it => {
          lines.push(`${it.field}${it.serial ? ' (' + it.serial + ')' : ''} Expiry: ${fmtDate(it.date)} | ${complianceDaysLeftLabel(it.daysLeft)}${it.isCylinderReplacement ? ' — REPLACE CYLINDER (cannot be serviced)' : ''}`);
        });
      });
      lines.push('Please arrange replacement or servicing accordingly.');
    } else {
      lines.push(`All ${rows.length} FEG record(s) scanned. No extinguisher is due or expiring within the next ${COMPLIANCE_ALERT_WINDOW_DAYS} days.`);
      lines.push('No action required.');
    }
  } else if (groups.length){
    lines.push('The following compliance items require attention:');
    groups.forEach((g, i) => {
      if (i > 0) lines.push('');
      lines.push(`${config.asset}: ${g.truck}`);
      g.items.forEach(it => {
        lines.push(`${it.field}: ${fmtDate(it.date)} | ${complianceDaysLeftLabel(it.daysLeft)}`);
      });
    });
  } else if (tableKey === 'staffDatabase') {
    lines.push(`All ${rows.length} staff scanned. No compliance items are due or expiring within the next ${COMPLIANCE_ALERT_WINDOW_DAYS} days.`);
    lines.push('No action required.');
  } else {
    const assetPlural = `${config.asset.toLowerCase()}${rows.length === 1 ? '' : 's'}`;
    lines.push(`All ${rows.length} ${assetPlural} scanned. No compliance items are due or expiring within the next ${COMPLIANCE_ALERT_WINDOW_DAYS} days.`);
    lines.push('No action required.');
  }

  if (tableKey !== 'feg' && !allClear) lines.push('Please arrange renewal accordingly.');
  lines.push('FOCC Fleet Operations Control Centre');
  return {message: lines.join('\n'), dueItems, groups};
}

function notifyAvatarColor(name){
  const s = String(name || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return NOTIFY_AVATAR_COLORS[hash % NOTIFY_AVATAR_COLORS.length];
}

function notifyInitials(name){
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

/* ============================================================
   OPEN COMPLIANCE ALERT MODAL
============================================================= */
async function openComplianceAlertModal(tableKey){
  const def = TABLES[tableKey];
  const data = await getData(tableKey);
  const moduleLabel = def.label;
  const alertConfig = COMPLIANCE_ALERT_CONFIG[tableKey] || {asset: 'Truck', title: 'PRIME MOVER COMPLIANCE ALERT'};
  const assetNoun = alertConfig.asset;

  const contacts = await getData('notificationContact');
  const activeContacts = contacts.filter(c => (c.status || '').trim().toLowerCase() === 'active');

  let groupsRaw = [];
  try { groupsRaw = (await getData('whatsappGroups')) || []; } catch(e){ groupsRaw = []; }
  const activeGroups = groupsRaw.filter(g =>
    (g.status || '').trim().toLowerCase() === 'active' &&
    /https?:\/\/(?:www\.)?chat\.whatsapp\.com\/[A-Za-z0-9]+/i.test(String(g.groupLink || '').trim())
  );

  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');

  const waIconSvg = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 4.99L2 22l5.2-1.36a9.94 9.94 0 0 0 4.84 1.23h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2zm5.86 14.06c-.25.7-1.25 1.28-2.03 1.44-.55.12-1.27.21-3.7-.79-2.75-1.14-4.65-3.7-4.8-3.9-.14-.19-1.15-1.53-1.15-2.92 0-1.39.72-2.06.98-2.34.25-.28.55-.35.73-.35.18 0 .37 0 .53.01.17.01.4-.06.62.48.25.6.85 2.08.92 2.23.07.15.12.32.02.51-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.28-.12.56.16.28.71 1.18 1.53 1.92 1.05.95 1.94 1.24 2.22 1.38.28.14.44.12.6-.07.17-.19.72-.85.92-1.14.19-.28.38-.24.65-.14.27.1 1.72.82 2.01.97.29.14.48.21.55.34.07.13.07.72-.18 1.42z"/></svg>`;
  const truckIconSvg = `<svg viewBox="0 0 24 24"><path d="M3 6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v3h3.28a1 1 0 0 1 .9.56l1.72 3.44a1 1 0 0 1 .1.44V17a1 1 0 0 1-1 1h-1.17a2.5 2.5 0 0 1-4.66 0H9.83a2.5 2.5 0 0 1-4.66 0H4a1 1 0 0 1-1-1V6zm14 5V7h-2.28l1.4 2.8.28.2H17zM7.5 16.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>`;
  const emptyPersonSvg = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12zm0 2c-3.3 0-9 1.7-9 5v2h18v-2c0-3.3-5.7-5-9-5z" fill="currentColor"/></svg>`;

  const normBranch    = v => String(v == null ? '' : v).trim();
  const branchKeyOf   = v => normBranch(v) || '__nobranch__';
  const branchLabelOf = v => normBranch(v) || 'No Branch Assigned';
  const ALL_KEY = '__all__';

  const branchMap = new Map();
  data.forEach(r => {
    const k = branchKeyOf(r.branch);
    if (!branchMap.has(k)) branchMap.set(k, {key: k, label: branchLabelOf(r.branch), rows: []});
    branchMap.get(k).rows.push(r);
  });
  const branches = Array.from(branchMap.values()).sort((a, b) => a.label.localeCompare(b.label));

  const byKey = new Map();
  branches.forEach(b => byKey.set(b.key, Object.assign({key: b.key, label: b.label, rows: b.rows},
    buildComplianceAlertMessage(b.rows, alertConfig, tableKey))));
  const allTarget = Object.assign({key: ALL_KEY, label: 'All Branches', rows: data},
    buildComplianceAlertMessage(data, alertConfig, tableKey));
  byKey.set(ALL_KEY, allTarget);

  const targetOrder = [ALL_KEY].concat(branches.map(b => b.key));

  function assetLabelFor(t){
    const n = t.groups.length;
    const base = t.dueItems.length ? `${n} ${assetNoun}${n===1?'':'s'}` : `All ${assetNoun}s`;
    return t.key === ALL_KEY ? base : `${t.label} · ${base}`;
  }

  function branchCardHtml(t){
    const isAlert = t.dueItems.length > 0;
    const isAll = t.key === ALL_KEY;
    const valueText = isAlert
      ? `${t.dueItems.length} item${t.dueItems.length===1?'':'s'} &middot; ${t.groups.length} ${assetNoun.toLowerCase()}${t.groups.length===1?'':'s'}`
      : 'Nothing due &mdash; all clear';
    return `
      <label class="notify-asset-card pickable ${isAlert ? 'is-alert' : 'is-clear'}" data-notify-target="${escapeHtml(t.key)}">
        <input type="radio" name="notifyBranchPick" value="${escapeHtml(t.key)}" style="display:none">
        <div class="notify-asset-icon">${truckIconSvg}</div>
        <div class="notify-asset-body">
          <div class="notify-asset-label">${escapeHtml(isAll ? 'All Branches' : t.label)}</div>
          <div class="notify-asset-value">${valueText}</div>
        </div>
      </label>`;
  }

  function recipientRowHtml(c){
    const noPhone = !toWhatsAppDigits(c.phone || '');
    return `
      <label class="notify-recipient-row${noPhone ? ' is-disabled' : ''}">
        <span class="notify-avatar" style="background:${notifyAvatarColor(c.name)}">${notifyInitials(c.name)}</span>
        <span class="notify-recipient-info">
          <span class="notify-recipient-name">${escapeHtml(c.name || '(no name)')}</span>
          <span class="notify-recipient-phone">${noPhone ? 'No phone number' : escapeHtml(formatPhone(c.phone) || '-')}</span>
        </span>
        <input type="checkbox" class="notify-recipient-cb" data-name="${escapeHtml(c.name || '')}" data-phone="${escapeHtml(c.phone || '')}"${noPhone ? ' disabled' : ''}>
      </label>`;
  }

  function emptyHtml(msg){
    return `
      <div class="notify-empty">
        ${emptyPersonSvg}
        <span>${escapeHtml(msg)}</span>
      </div>`;
  }

  box.innerHTML = `
    <div class="notify-header">
      <div class="notify-header-icon"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg></div>
      <div>
        <h4>Compliance Alert</h4>
        <div class="notify-subtitle">${escapeHtml(moduleLabel)} &middot; All ${assetNoun}s Scanned</div>
      </div>
    </div>

    <div class="notify-section-head">
      <label>Select Branch</label>
      <span class="notify-count none" id="notifyBranchCount">None selected</span>
    </div>
    <div id="notifyBranchCards" class="notify-branch-grid">
      ${targetOrder.map(k => branchCardHtml(byKey.get(k))).join('')}
    </div>

    <div class="notify-section">
      <div class="notify-section-head notify-section-head-split">
        <label>Recipient List</label>
        <div class="notify-mode-toggle" id="notifyModeToggle">
          <button type="button" class="active" data-mode="personal">Personal</button>
          <button type="button" data-mode="group">Group</button>
        </div>
        <span class="notify-count none" id="notifyCount">0 selected</span>
      </div>
      <div id="notifyRecipientList" class="notify-recipient-list notify-recipient-grid">
        ${emptyHtml('Please select branch')}
      </div>
    </div>

    <div class="notify-section" style="margin-bottom:0;">
      <div class="notify-section-head">
        <label>Message Preview</label>
        <button type="button" class="btn notify-copy-btn" id="notifyCopyMsgBtn">Copy Message</button>
      </div>
      <div class="notify-message-card">
        <div class="notify-message-icon">${waIconSvg}</div>
        <p class="notify-message-text" id="notifyMessagePreview">${escapeHtml(allTarget.message)}</p>
      </div>
      <div class="notify-queue-bar" id="notifyQueueBar"><span id="notifyQueueText"></span></div>
    </div>

    <div class="modalfoot">
      <button class="btn" id="cancelModal">Cancel</button>
      <button class="btn whatsapp-send" id="sendWhatsAppBtn" disabled>${waIconSvg}<span id="sendWhatsAppLabel">Send WhatsApp</span></button>
    </div>
  `;

  overlay.classList.add('show');

  const countEl       = box.querySelector('#notifyCount');
  const sendBtn       = box.querySelector('#sendWhatsAppBtn');
  const sendLabel     = box.querySelector('#sendWhatsAppLabel');
  const branchCountEl = box.querySelector('#notifyBranchCount');
  const recipientHost = box.querySelector('#notifyRecipientList');
  const previewEl     = box.querySelector('#notifyMessagePreview');

  let currentTarget = allTarget;
  let notifyMode   = 'personal';
  let branchChosen = false;
  let queue        = [];
  let queueIdx     = 0;
  let queueLogged  = new Set();
  let queueMessage = '';
  let queueMode    = 'personal';

  const modeToggleEl = box.querySelector('#notifyModeToggle');
  const queueBarEl   = box.querySelector('#notifyQueueBar');
  const queueTextEl  = box.querySelector('#notifyQueueText');
  const copyMsgBtn   = box.querySelector('#notifyCopyMsgBtn');

  function updateSelectionState(){
    const sel = notifyMode === 'group' ? '.notify-group-cb:checked' : '.notify-recipient-cb:checked';
    const n = box.querySelectorAll(sel).length;

    countEl.textContent = n === 1 ? '1 selected' : `${n} selected`;
    countEl.classList.toggle('none', n === 0);

    if (queue.length){
      const isGrp = queueMode === 'group';
      queueBarEl.style.display = 'flex';
      queueTextEl.textContent = `${Math.min(queueIdx, queue.length)} of ${queue.length} ${isGrp ? 'groups' : 'recipients'} opened`;
      if (queueIdx >= queue.length){
        sendBtn.disabled = true;
        sendLabel.textContent = isGrp ? 'All groups opened' : 'All recipients opened';
      } else {
        sendBtn.disabled = false;
        sendLabel.textContent = (isGrp ? 'Open Next Group' : 'Open Next Chat') + ` (${queueIdx + 1} of ${queue.length})`;
      }
    } else {
      queueBarEl.style.display = 'none';
      sendBtn.disabled = n === 0;
      sendLabel.textContent = notifyMode === 'group'
        ? (n > 0 ? `Copy & Open Group (${n})` : 'Copy & Open Group')
        : (n > 0 ? `Send WhatsApp (${n})` : 'Send WhatsApp');
    }

    box.querySelectorAll('.notify-recipient-row').forEach(rowEl => {
      const cb = rowEl.querySelector('.notify-recipient-cb, .notify-group-cb');
      rowEl.classList.toggle('selected', !!(cb && cb.checked));
    });
  }

  function applyTarget(t){
    currentTarget = t;

    box.querySelectorAll('[data-notify-target]').forEach(cardEl => {
      const on = cardEl.getAttribute('data-notify-target') === t.key;
      cardEl.classList.toggle('selected', on);
      const radio = cardEl.querySelector('input[type="radio"]');
      if (radio) radio.checked = on;
    });
    branchCountEl.textContent = t.key === ALL_KEY ? 'All Branches' : t.label;
    branchCountEl.classList.remove('none');

    previewEl.textContent = t.message;

    branchChosen = true;
    clearQueue();
    renderRecipientArea();
  }

  function resetTarget(){
    currentTarget = allTarget;
    box.querySelectorAll('[data-notify-target]').forEach(cardEl => {
      cardEl.classList.remove('selected');
      const radio = cardEl.querySelector('input[type="radio"]');
      if (radio) radio.checked = false;
    });
    branchCountEl.textContent = 'None selected';
    branchCountEl.classList.add('none');
    previewEl.textContent = allTarget.message;
    branchChosen = false;
    clearQueue();
    renderRecipientArea();
  }

  box.querySelectorAll('input[name="notifyBranchPick"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const t = byKey.get(radio.value);
      if (t) applyTarget(t);
    });
  });

  const groupLinkOf = v => {
    const m = String(v || '').match(/https?:\/\/(?:www\.)?chat\.whatsapp\.com\/[A-Za-z0-9]+/i);
    return m ? m[0] : '';
  };

  function clearQueue(){
    queue = [];
    queueIdx = 0;
    queueLogged = new Set();
    queueMessage = '';
    queueMode = 'personal';
    const cards = box.querySelector('#notifyBranchCards');
    if (cards){ cards.style.pointerEvents = ''; cards.style.opacity = ''; }
    if (modeToggleEl) modeToggleEl.querySelectorAll('button').forEach(b => { b.disabled = false; });
    recipientHost.querySelectorAll('.queue-locked').forEach(cb => {
      cb.disabled = false;
      cb.classList.remove('queue-locked');
    });
    if (queueBarEl) queueBarEl.style.display = 'none';
  }

  function groupRowHtml(g){
    const link = groupLinkOf(g.groupLink);
    const disabled = !link;
    return `
      <label class="notify-recipient-row notify-group-row${disabled ? ' is-disabled' : ''}">
        <span class="notify-avatar" style="background:${notifyAvatarColor(g.groupName || 'G')}">${notifyInitials(g.groupName || '?')}</span>
        <span class="notify-recipient-info">
          <span class="notify-recipient-name">${escapeHtml(g.groupName || '(no name)')}</span>
          <span class="notify-recipient-phone">${disabled ? 'Missing group link' : escapeHtml(String(g.branch || '').trim() || 'No branch')}</span>
        </span>
        <input type="checkbox" class="notify-group-cb" data-group="${escapeHtml(g.groupName || '')}" data-link="${escapeHtml(link)}"${disabled ? ' disabled' : ''}>
      </label>`;
  }

  function renderRecipientArea(){
    if (!branchChosen){
      recipientHost.innerHTML = emptyHtml('Please select branch');
      updateSelectionState();
      return;
    }
    const t = currentTarget;

    if (notifyMode === 'group'){
      const list = t.key === ALL_KEY
        ? activeGroups
        : activeGroups.filter(g => branchKeyOf(g.branch) === t.key);
      recipientHost.innerHTML = list.length
        ? list.map(groupRowHtml).join('')
        : emptyHtml(t.key === ALL_KEY
            ? 'No active WhatsApp groups found.'
            : 'No active WhatsApp groups for this branch.');
      recipientHost.querySelectorAll('.notify-group-cb').forEach(cb => cb.addEventListener('change', updateSelectionState));
      updateSelectionState();
      return;
    }

    const list = t.key === ALL_KEY
      ? activeContacts
      : activeContacts.filter(c => branchKeyOf(c.branch) === t.key);
    recipientHost.innerHTML = list.length
      ? list.map(recipientRowHtml).join('')
      : emptyHtml(t.key === ALL_KEY
          ? 'No active recipients found in Notification Contact.'
          : 'No active recipients for this branch.');
    recipientHost.querySelectorAll('.notify-recipient-cb').forEach(cb => cb.addEventListener('change', updateSelectionState));
    updateSelectionState();
  }

  async function handleGroupSend(){
    const checked = Array.from(box.querySelectorAll('.notify-group-cb:checked'));

    if (!queue.length){
      if (!checked.length){ alert('Please select at least one WhatsApp group.'); return; }
      queue        = checked.map(cb => ({name: cb.dataset.group || '', link: cb.dataset.link || ''}));
      queueIdx     = 0;
      queueLogged  = new Set();
      queueMessage = currentTarget.message;

      const copied = await copyTextToClipboard(queueMessage);
      if (!copied){
        alert('Auto-copy disekat oleh browser. Sila tekan butang "Copy Message" untuk salin mesej secara manual.');
      }

      const cards = box.querySelector('#notifyBranchCards');
      if (cards){ cards.style.pointerEvents = 'none'; cards.style.opacity = '.55'; }
      modeToggleEl.querySelectorAll('button').forEach(b => { b.disabled = true; });
    }

    if (queueIdx >= queue.length){ updateSelectionState(); return; }

    const item = queue[queueIdx];
    queueIdx++;

    window.open(item.link, '_blank', 'noopener');
    if (!queueLogged.has(item.link)){
      queueLogged.add(item.link);
      await logAlertHistory(`[Group] ${item.name}`, '-', 'Opened', queueMessage);
    }
    updateSelectionState();
  }

  async function logAlertHistory(recipient, phone, status, message){
    const nowD = new Date();
    const historyData = await getData('notificationHistory');
    historyData.push({
      date: toISODateLocal(nowD),
      time: String(nowD.getHours()).padStart(2,'0') + ':' + String(nowD.getMinutes()).padStart(2,'0'),
      module: moduleLabel,
      asset: assetLabelFor(currentTarget),
      recipient: recipient,
      phone: phone || '-',
      message: message || currentTarget.message,
      sentBy: getSessionEmail(),
      status: status || 'Opened',
    });
    await persist('notificationHistory');
  }

  async function handlePersonalSend(){
    const checked = Array.from(box.querySelectorAll('.notify-recipient-cb:checked'));

    if (!queue.length){
      if (!checked.length){ alert('Please select at least one recipient.'); return; }

      if (checked.length === 1){
        const cb = checked[0];
        const name = cb.dataset.name || '';
        const waDigits = toWhatsAppDigits(cb.dataset.phone || '');
        const link = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(currentTarget.message)}` : '';
        if (link) window.open(link, '_blank', 'noopener');
        await logAlertHistory(name, waDigits, link ? 'Opened' : 'No Phone', currentTarget.message);
        overlay.classList.remove('show');
        return;
      }

      queue        = checked.map(cb => ({
        name: cb.dataset.name || '',
        phone: toWhatsAppDigits(cb.dataset.phone || ''),
      }));
      queueIdx     = 0;
      queueLogged  = new Set();
      queueMode    = 'personal';
      queueMessage = currentTarget.message;

      const cards = box.querySelector('#notifyBranchCards');
      if (cards){ cards.style.pointerEvents = 'none'; cards.style.opacity = '.55'; }
      modeToggleEl.querySelectorAll('button').forEach(b => { b.disabled = true; });
      recipientHost.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(cb => {
        cb.disabled = true;
        cb.classList.add('queue-locked');
      });
    }

    if (queueIdx >= queue.length){ updateSelectionState(); return; }

    const item = queue[queueIdx];
    queueIdx++;

    const link = item.phone ? `https://wa.me/${item.phone}?text=${encodeURIComponent(queueMessage)}` : '';
    if (link) window.open(link, '_blank', 'noopener');
    const key = item.name + '|' + item.phone;
    if (!queueLogged.has(key)){
      queueLogged.add(key);
      await logAlertHistory(item.name, item.phone, link ? 'Opened' : 'No Phone', queueMessage);
    }
    updateSelectionState();
  }

  modeToggleEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (queue.length) return;
      notifyMode = btn.dataset.mode === 'group' ? 'group' : 'personal';
      modeToggleEl.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      clearQueue();
      renderRecipientArea();
    });
  });

  copyMsgBtn.onclick = async () => {
    const ok = await copyTextToClipboard(previewEl.textContent || '');
    copyMsgBtn.textContent = ok ? '✓ Copied' : 'Tekan Ctrl+C';
    setTimeout(() => { copyMsgBtn.textContent = 'Copy Message'; }, 1600);
  };

  box.querySelector('#cancelModal').onclick = () => { overlay.classList.remove('show'); };

  sendBtn.onclick = async () => {
    if (notifyMode === 'group'){ await handleGroupSend(); return; }
    await handlePersonalSend();
  };

  resetTarget();
}

/* ============================================================
   FEG FINAL STATUS
============================================================= */
function fegFinalStatus(u){
  if (!u) return 'Draft';

  if (String(u.disposal || 'No') === 'Yes') return 'Disposed';
  if (fegIsInService(u))                    return 'Under Service';

  const today = new Date(); today.setHours(0,0,0,0);
  const asDate = s => { if (!s) return null; const d = new Date(String(s) + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; };
  const cyFrom = fegCylinderReplaceFrom(u.cylinderDue);
  if (cyFrom && cyFrom <= today) return 'Cylinder Due';
  const sv = asDate(u.serviceDate);
  if (sv && sv < today) return 'Service Due';

  if (!String(u.serialNo || '').trim()) return 'Draft';
  return String(u.manualStatus || '').trim() || 'In Service';
}

function fegStatusClass(s){
  const v = String(s || '');
  if (v === 'Disposed') return 'bad';
  if (v === 'Under Service') return 'sync';
  if (v === 'Under Maintenance' || v === 'Service Due' || v === 'Cylinder Due') return 'warn';
  if (v === 'Transfer' || v === 'Missing') return 'warn';
  if (v === 'Draft') return 'neutral';
  return 'good';
}

function fegNextInspectionDue(u){
  const d = String((u && u.inspectionDate) || '').trim();
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt.getTime())) return '';
  const next = new Date(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  return next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2,'0') + '-' + String(next.getDate()).padStart(2,'0');
}

function fegInspectionDueLabel(isoDue){
  if (!isoDue) return { text:'\u2014', cls:'' };
  const due = new Date(isoDue + 'T00:00:00');
  if (isNaN(due.getTime())) return { text:'\u2014', cls:'' };
  const today = new Date(); today.setHours(0,0,0,0);
  const days  = Math.round((due - today) / 86400000);
  if (days < 0)  return { text:'Overdue ' + Math.abs(days) + 'd', cls:'bad'  };
  if (days <= 7) return { text:'Due in ' + days + 'd',            cls:'warn' };
  return { text: fmtDate(isoDue), cls:'' };
}

function fegUnitCounts(units){
  const arr = Array.isArray(units) ? units : [];
  let active = 0, disposed = 0, draft = 0, serviceDue = 0, cylinderDue = 0;
  arr.forEach(u => {
    const s = fegFinalStatus(u);
    if (s === 'Disposed') disposed += 1;
    else if (s === 'Draft') draft += 1;
    else {
      active += 1;
      if (s === 'Service Due') serviceDue += 1;
      else if (s === 'Cylinder Due') cylinderDue += 1;
    }
  });
  const inUse = active - serviceDue - cylinderDue;
  return { total: arr.length, active, inUse, disposed, draft, serviceDue, cylinderDue };
}

function fegUnitsCell(row){
  const c = fegUnitCounts(row && row.units);
  if (!c.total) return '<span style="color:var(--muted)">0 units</span>';
  const closed = c.disposed === c.total;
  const parts = [
    `<span class="badge ${closed ? 'bad' : 'neutral'}">${closed ? 'Closed' : c.total + ' unit' + (c.total === 1 ? '' : 's')}</span>`
  ];
  if (c.draft)       parts.push(`<span class="badge neutral">${c.draft} draft</span>`);
  if (c.inUse)       parts.push(`<span class="badge good">${c.inUse} in use</span>`);
  if (c.serviceDue)  parts.push(`<span class="badge warn">${c.serviceDue} service due</span>`);
  if (c.cylinderDue) parts.push(`<span class="badge warn">${c.cylinderDue} cylinder due</span>`);
  if (c.disposed && !closed) parts.push(`<span class="badge bad">${c.disposed} disposed</span>`);
  if (!c.inUse && !c.serviceDue && !c.cylinderDue && !closed) parts.push('<span class="badge warn">0 in use</span>');
  return `<span style="display:inline-flex;gap:4px;flex-wrap:wrap">${parts.join('')}</span>`;
}

/* ============================================================
   FEG PERSIST UNIT (Supabase-safe by assetId)
============================================================= */
async function fegPersistUnit(assetIdOrRef, unitId, mutate){
  const all = await getData('feg');
  const row = (all || []).find(r => r && (
    String(r.assetId || '') === String(assetIdOrRef || '') ||
    String(r.assetRef || '') === String(assetIdOrRef || '')
  ));
  if (!row) throw new Error('Rekod FEG tak dijumpai.');
  const unit = (row.units || []).find(u => u && String(u.unitId || '') === String(unitId || ''));
  if (!unit) throw new Error('Unit tak dijumpai.');
  mutate(unit);
  unit.cylinderDue = fegCylinderDueFrom(unit.mfgDate);
  unit.finalStatus = fegFinalStatus(unit);
  await persist('feg');
  return { row, unit };
}

/* ============================================================
   FEG SERVICE OPERATIONS
============================================================= */
async function fegStartService(row, unit, info){
  const at = new Date().toISOString();
  let rec  = null;
  await fegPersistUnit(row.assetId || row.assetRef, unit.unitId, u => {
    if (fegActiveService(u)) throw new Error('Unit ini sudah ada service aktif.');
    rec = {
      serviceId  : fegNewId('FS'),
      serviceNo  : fegNextServiceNo(u),
      status     : 'Active',
      dateService: at,
      vendor     : (info && info.vendor) || '',
      reason     : (info && info.reason) || '',
      remark     : (info && info.remark) || '',
      serviceBy  : getSessionEmail() || '',
      createdAt  : at,
      receivedDate: '', invoiceNo: '', price: '', completedAt: '', completedBy: '',
    };
    u.serviceLog = fegUnitServiceLog(u).concat([rec]);
    u.serviceSeq = rec.serviceNo;
  });
  return rec;
}

async function fegCancelService(row, unit, expectedServiceId){
  let removed = false;
  await fegPersistUnit(row.assetId || row.assetRef, unit.unitId, u => {
    const active = fegActiveService(u);
    if (!active) throw new Error('Tiada service aktif untuk dibatalkan.');
    if (expectedServiceId && String(active.serviceId) !== String(expectedServiceId)){
      throw new Error('Rekod service sudah berubah. Refresh dan cuba lagi.');
    }
    u.serviceLog = fegUnitServiceLog(u).filter(s => s && s.serviceId !== active.serviceId);
    removed = true;
  });
  return removed;
}

function fegAddOneYear(isoDate){
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0,10);
}

async function fegCompleteService(row, unit, info){
  const receivedDate = String((info && info.receivedDate) || '').trim();
  const nextDue      = fegAddOneYear(receivedDate);
  if (!nextDue) throw new Error('Date Received tak sah.');
  const actId = (fegActiveService(unit) || {}).serviceId;
  if (!actId) throw new Error('Tiada service aktif untuk unit ini.');
  const at    = new Date().toISOString();
  const price = (info && info.price != null && info.price !== '') ? info.price : '';

  await fegPersistUnit(row.assetId || row.assetRef, unit.unitId, u => {
    let hit = false;
    (u.serviceLog || []).forEach(s => {
      if (s && s.serviceId === actId && s.status === 'Active'){
        s.status       = 'Completed';
        s.receivedDate = receivedDate;
        s.invoiceNo    = (info && info.invoiceNo) || '';
        s.price        = price;
        s.completedAt  = at;
        s.completedBy  = getSessionEmail() || '';
        hit = true;
      }
    });
    if (!hit) throw new Error('Service aktif tak dijumpai (mungkin sudah diubah user lain).');
    u.serviceDate = nextDue;
  });
  return { nextDue };
}

function fegServiceEntries(){
  const out = [];
  (DATA_CACHE.feg || []).forEach(row => {
    (row.units || []).forEach(unit => {
      fegUnitServiceLog(unit).forEach(rec => { if (rec) out.push({ row: row, unit: unit, rec: rec }); });
    });
  });
  out.sort((a,b) => String(b.rec.dateService || '').localeCompare(String(a.rec.dateService || '')));
  return out;
}

async function fegDeleteServiceRecord(row, unit, serviceId){
  const sid = String(serviceId || '');
  if (!sid) throw new Error('Rekod service tak sah.');
  let removed = false;
  await fegPersistUnit(row.assetId || row.assetRef, unit.unitId, u => {
    const before = fegUnitServiceLog(u).length;
    u.serviceLog = fegUnitServiceLog(u).filter(s => s && String(s.serviceId || '') !== sid);
    if (u.serviceLog.length === before) throw new Error('Rekod sudah tiada. Refresh dan cuba lagi.');
    removed = true;
  });
  return removed;
}

/* ============================================================
   FEG DISPOSAL AUDIT
============================================================= */
async function fegAuditDisposal(entry){
  try{
    const rec = Object.assign({
      auditId: fegNewId('FA'),
      at     : new Date().toISOString(),
      by     : getSessionEmail() || ''
    }, entry);

    for (let attempt = 0; attempt < 3; attempt++){
      let list = [];
      try{ list = await loadOptionList('feg', FEG_DISPOSAL_AUDIT_FIELD); }catch(e){ list = []; }
      if (!Array.isArray(list)) list = [];

      if (list.some(x => x && String(x.auditId || '') === String(rec.auditId))) return;

      list.unshift(rec);
      try{
        await saveOptionList('feg', FEG_DISPOSAL_AUDIT_FIELD, list.slice(0, 300));
        return;
      }catch(e){
        if (attempt === 2) console.error('FEG disposal audit failed', e);
      }
    }
  }catch(e){ console.error('FEG disposal audit failed', e); }
}

async function fegDisposeUnit(row, unit, info){
  const at   = new Date().toISOString();
  const date = String((info && info.date) || '').trim() || at.slice(0,10);
  const snap = { assetRef: row.assetRef || '', serial: fegSerialLabel(unit), unitId: unit.unitId,
                 vendor: info.vendor, reason: info.reason, note: info.note || '' };
  await fegPersistUnit(row.assetId || row.assetRef, unit.unitId, u => {
    u.disposal         = 'Yes';
    u.disposalVendor   = info.vendor;
    u.disposalReason   = info.reason;
    u.disposalNote     = info.note || '';
    u.disposedAt       = date;
    u.disposedLoggedAt = at;
    u.disposedBy       = getSessionEmail() || '';
  });
  await fegAuditDisposal(Object.assign({ action:'Disposed', at: at, date: date }, snap));
}

async function fegRestoreUnit(row, unit){
  const snap = { assetRef: row.assetRef || '', serial: fegSerialLabel(unit), unitId: unit.unitId,
                 wasDisposedAt: unit.disposedAt || '', wasDisposedBy: unit.disposedBy || '',
                 vendor: unit.disposalVendor || '', reason: unit.disposalReason || '' };
  await fegPersistUnit(row.assetId || row.assetRef, unit.unitId, u => {
    u.disposal        = 'No';
    u.disposalVendor  = '';
    u.disposalReason  = '';
    u.disposalNote    = '';
    u.disposedAt       = '';
    u.disposedLoggedAt = '';
    u.disposedBy       = '';
  });
  await fegAuditDisposal(Object.assign({ action:'Restored' }, snap));
}

/* ============================================================
   FEG DISPOSAL PERMISSION
============================================================= */
function fegCanDispose(){
  try{
    const s = JSON.parse(localStorage.getItem(FOCC_SESSION_KEY));
    const r = String((s && s.role) || '');
    return r === 'SuperAdmin' || r === 'Admin' || r === 'Manager';
  }catch(e){ return false; }
}