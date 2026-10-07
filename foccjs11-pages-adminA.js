/* =========================================================================
   FOCC — 11-pages-admin.js
   Settings, Release Manager, User Manager, Company Manager, System Health.
   ========================================================================= */

/* =========================================================================
   BAHAGIAN A — SETTINGS + RELEASE MANAGER
   ========================================================================= */

/* ============================================================
   PAGE: SETTINGS
============================================================= */
async function renderSettingsPage(){
  const cfg = await getSettingsConfig();
  const history = await getBackupHistory();
  const lastBackup = history.find(h => h.status === 'Success') || null;
  const lastAuto = history.find(h => h.trigger === 'Auto' && h.status === 'Success' && !/safety backup/i.test(h.note||'')) || null;
  const nextAuto = nextSaturday(new Date());

  let totalRecords = 0;
  let approxBytes = 0;
  for (const tableKey of Object.keys(TABLES)){
    try {
      const rows = await getData(tableKey);
      totalRecords += rows.length;
      approxBytes += JSON.stringify(rows).length;
    } catch (err){
      console.warn('Settings storage summary: skipping table', tableKey, '-', err && err.message);
    }
  }
  const storageUsage = approxBytes > 1024*1024
    ? `${(approxBytes/(1024*1024)).toFixed(2)} MB`
    : `${(approxBytes/1024).toFixed(1)} KB`;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <!-- Database Settings: hidden from users per request — section is
         still fully rendered and wired up (Test Connection, Save
         Configuration, inputs), just not shown. -->
    <div class="section" style="display:none;">
      <div class="section-head">
        <h3>Database Settings</h3>
        <span class="eyebrow">Sync configuration</span>
        <div class="spacer"></div>
        <span id="dbStatusBadge">${settingsStatusBadgeHtml(cfg.connectionStatus)}</span>
      </div>
      <div class="section-body">
        <div class="settings-grid">
          <div class="formfield">
            <label>Company Name</label>
            <input type="text" id="cfgCompanyName" value="${escapeHtml(cfg.companyName)}" placeholder="e.g. Kemaman Operation">
          </div>
          <div class="formfield"></div>
          <div class="formfield">
            <label>Google Sheet ID</label>
            <input type="text" id="cfgSheetId" value="${escapeHtml(cfg.googleSheetId)}" placeholder="1AbCXyz... (Sheet ID from its URL)">
          </div>
          <div class="formfield">
            <label>Google Apps Script URL</label>
            <input type="text" id="cfgAppsScriptUrl" value="${escapeHtml(cfg.appsScriptUrl)}" placeholder="https://script.google.com/macros/s/.../exec">
          </div>
          <div class="formfield full">
            <label>Database Type</label>
            <div class="radio-group">
              <label class="radio-option"><input type="radio" name="cfgProvider" value="local" ${cfg.provider === 'sheet' ? '' : 'checked'}> Local Storage</label>
              <label class="radio-option"><input type="radio" name="cfgProvider" value="sheet" ${cfg.provider === 'sheet' ? 'checked' : ''}> Google Sheet</label>
            </div>
          </div>
        </div>
        <div class="settings-actions">
          <button class="btn" id="testConnectionBtn">Test Connection</button>
          <button class="btn primary" id="saveConfigBtn">Save Configuration</button>
        </div>
        <div class="settings-note" id="dbConfigNote">
          Data is currently synced to <strong>${cfg.provider === 'sheet' ? 'Google Sheet' : 'Local Storage (this browser)'}</strong>. Test Connection performs a real <span class="mono">?action=ping</span> call to the Apps Script URL above — it only reports "Connected" once that call actually succeeds.
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h3>Backup &amp; Restore</h3>
        <span class="eyebrow">${history.length} log ${history.length === 1 ? 'entry' : 'entries'}</span>
        <div class="spacer"></div>
        <span class="savechip" id="savechip">&#10003; saved</span>
      </div>
      <div class="section-body">
        <div class="formfield full" style="max-width:420px;">
          <label>Backup Mode</label>
          <div class="radio-group">
            <label class="radio-option"><input type="radio" name="cfgBackupMode" value="auto" ${cfg.backupMode === 'manual' ? '' : 'checked'}> Auto Backup</label>
            <label class="radio-option"><input type="radio" name="cfgBackupMode" value="manual" ${cfg.backupMode === 'manual' ? 'checked' : ''}> Manual Backup</label>
          </div>
        </div>
        <div class="settings-note" id="backupModeNote" style="margin-top:6px;">${cfg.backupMode === 'manual' ? 'Auto Backup is off — backups only happen when you click "Backup Now".' : 'Auto Backup is on — a backup runs automatically every Saturday while the app is open.'}</div>

        <div style="height:18px"></div>
        <div class="formfield full" style="max-width:520px;">
          <label>Backup Email Distribution</label>
          <div class="backup-email-addrow">
            <input type="email" id="backupEmailInput" placeholder="e.g. admin@company.com">
            <button class="btn" id="backupEmailAddBtn" type="button">+ Add Email</button>
          </div>
          <div class="settings-note" id="backupEmailError" style="margin-top:6px;color:var(--red);display:none;"></div>
          <div class="backup-email-list" id="backupEmailList">
            ${(cfg.backupEmails && cfg.backupEmails.length) ? cfg.backupEmails.map(addr => `
              <div class="backup-email-row">
                <span class="backup-email-addr">${escapeHtml(addr)}</span>
                <button class="btn rowdel backup-email-remove" data-email="${escapeHtml(addr)}" type="button">Remove</button>
              </div>
            `).join('') : `<div class="backup-email-empty">No backup email recipients yet — backups will not be emailed until at least one is added.</div>`}
          </div>
          <div class="settings-note">Every completed backup (Auto or Manual) emails the JSON and Excel backup files to everyone on this list.</div>
        </div>

        <div style="height:12px"></div>
        <div class="settings-actions" style="margin-top:0;">
          <button class="btn primary" id="backupNowBtn">Backup Now</button>
          <button class="btn danger" id="restoreBackupBtn">Restore Backup</button>
        </div>
        <div style="height:14px"></div>
        <div class="backup-summary" id="lastBackupSummary">
          ${lastBackup ? `
            <div class="bs-field"><div class="label">Last Backup</div><div class="value"><span class="badge good">&#10003; Success</span></div></div>
            <div class="bs-field"><div class="label">Date</div><div class="value">${escapeHtml(lastBackup.date)}</div></div>
            <div class="bs-field"><div class="label">Time</div><div class="value">${escapeHtml(lastBackup.time)}</div></div>
            <div class="bs-field"><div class="label">File</div><div class="value">${escapeHtml(lastBackup.fileName)}</div></div>
            <div class="bs-field"><div class="label">Trigger</div><div class="value">${escapeHtml(lastBackup.trigger)}</div></div>
            <div class="bs-field"><div class="label">User</div><div class="value">${escapeHtml(lastBackup.user)}</div></div>
          ` : `<div class="settings-note" style="margin-top:0;">No backup has been made yet. Click "Backup Now" to create one.</div>`}
        </div>

        <div style="height:16px"></div>
        <div class="backup-summary">
          <div class="bs-field"><div class="label">Next Scheduled Backup</div><div class="value">${nextAuto.toLocaleDateString('en-GB',{weekday:'short', day:'2-digit', month:'short', year:'numeric'})} (Sat)</div></div>
          <div class="bs-field"><div class="label">Last Scheduled Backup</div><div class="value">${lastAuto ? `${escapeHtml(lastAuto.date)} ${escapeHtml(lastAuto.time)}` : 'None yet'}</div></div>
          <div class="bs-field"><div class="label">Backup Status</div><div class="value">${lastAuto ? '<span class="badge good">Success</span>' : '<span class="badge neutral">Pending</span>'}</div></div>
        </div>
        <div class="settings-note">Auto backup runs every Saturday, checked automatically when this app is open (it has no server, so it cannot run while the browser is closed — it will simply run on the next visit that falls on or after a missed Saturday).</div>

        <div style="height:18px"></div>
        <div class="section-head" style="margin:0 -18px;border-radius:0;">
          <h3 style="font-size:13px;">Backup History</h3>
          <div class="spacer"></div>
          <button class="btn danger" id="deleteAllHistoryBtn" ${history.length ? '' : 'disabled'} style="padding:5px 12px;font-size:12px;">Delete All History</button>
        </div>
        <div class="backup-history-scroll" style="margin-top:10px;">
          <table class="kpi-bucket-table" style="width:100%;">
            <thead><tr><th>Date</th><th>Time</th><th>File</th><th>Trigger</th><th>User</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${history.length ? history.map(h => `
                <tr>
                  <td class="date-cell">${escapeHtml(h.date)}</td>
                  <td>${escapeHtml(h.time)}</td>
                  <td>${escapeHtml(h.fileName)}</td>
                  <td>${escapeHtml(h.trigger)}</td>
                  <td>${escapeHtml(h.user)}</td>
                  <td>${h.status === 'Success' ? '<span class="badge good">Success</span>' : '<span class="badge bad">Failed</span>'}</td>
                  <td><button class="backup-history-row-del" data-iso="${escapeHtml(h.isoDate)}" data-file="${escapeHtml(h.fileName)}">Delete</button></td>
                </tr>
              `).join('') : `<tr><td colspan="7" class="kpi-bucket-empty">No backup history yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h3>System Information</h3>
        <span class="eyebrow">Live snapshot</span>
      </div>
      <div class="section-body">
        <div class="settings-infogrid">
          <div class="settings-infocard"><div class="label">System Version</div><div class="value">${escapeHtml(APP_VERSION)}</div></div>
          <div class="settings-infocard"><div class="label">Database Type</div><div class="value mono">${cfg.provider === 'sheet' ? 'Google Sheet' : 'Local Storage'}</div></div>
          <div class="settings-infocard"><div class="label">Last Backup</div><div class="value mono">${lastBackup ? `${lastBackup.date} ${lastBackup.time}` : 'Never'}</div></div>
          <div class="settings-infocard"><div class="label">Total Records</div><div class="value">${totalRecords.toLocaleString()}</div></div>
          <div class="settings-infocard"><div class="label">Storage Usage</div><div class="value">${storageUsage}</div></div>
        </div>
      </div>
    </div>
  `;

  wrap.querySelector('#testConnectionBtn').addEventListener('click', async () => {
    const liveCfg = {
      ...cfg,
      googleSheetId: wrap.querySelector('#cfgSheetId').value.trim(),
      appsScriptUrl: wrap.querySelector('#cfgAppsScriptUrl').value.trim(),
    };
    const note = wrap.querySelector('#dbConfigNote');
    const formatStatus = computeConnectionStatus(liveCfg);
    if (formatStatus === 'not_configured'){
      note.innerHTML = 'Google Sheet ID or Apps Script URL format looks invalid or is empty. Fix the format before testing — no request was sent.';
      wrap.querySelector('#dbStatusBadge').innerHTML = settingsStatusBadgeHtml('not_configured');
      return;
    }
    const btn = wrap.querySelector('#testConnectionBtn');
    btn.disabled = true; btn.textContent = 'Testing…';
    try{
      await pingGoogleSheet(liveCfg);
      note.innerHTML = 'Connected — the Apps Script <span class="mono">?action=ping</span> call succeeded.';
      wrap.querySelector('#dbStatusBadge').innerHTML = settingsStatusBadgeHtml('connected');
      await saveSettingsConfig({...liveCfg, connectionStatus:'connected'});
    }catch(e){
      note.innerHTML = `Connection failed: ${escapeHtml(String(e && e.message || e))}`;
      wrap.querySelector('#dbStatusBadge').innerHTML = settingsStatusBadgeHtml('configured');
      await saveSettingsConfig({...liveCfg, connectionStatus:'configured'});
    }finally{
      btn.disabled = false; btn.textContent = 'Test Connection';
    }
  });

  wrap.querySelector('#saveConfigBtn').addEventListener('click', async () => {
    const selectedProvider = wrap.querySelector('input[name="cfgProvider"]:checked').value;
    const providerChanged = selectedProvider !== cfg.provider;
    const note = wrap.querySelector('#dbConfigNote');
    const badge = wrap.querySelector('#dbStatusBadge');

    const newCfg = {
      ...cfg,
      companyName: wrap.querySelector('#cfgCompanyName').value.trim(),
      googleSheetId: wrap.querySelector('#cfgSheetId').value.trim(),
      appsScriptUrl: wrap.querySelector('#cfgAppsScriptUrl').value.trim(),
      provider: selectedProvider,
    };
    newCfg.connectionStatus = computeConnectionStatus(newCfg);
    await saveSettingsConfig(newCfg);
    badge.innerHTML = settingsStatusBadgeHtml(newCfg.connectionStatus);
    note.innerHTML = `Data is currently synced to <strong>${newCfg.provider === 'sheet' ? 'Google Sheet' : 'Local Storage (this browser)'}</strong>. Test Connection performs a real <span class="mono">?action=ping</span> call to the Apps Script URL above — it only reports "Connected" once that call actually succeeds.`;

    if (providerChanged){
      Object.keys(DATA_CACHE).forEach(k => delete DATA_CACHE[k]);

      if (newCfg.provider === 'sheet'){
        const loadFromSheet = await confirmModal(
          'Load from Google Sheet?',
          'You switched Database Type to Google Sheet. Load existing data from the Google Sheet now? Choosing "No" keeps the cache cleared and empty — pages will pull fresh from Google Sheet as you visit them.'
        );
        if (loadFromSheet){
          note.innerHTML = 'Loading data from Google Sheet…';
          try{
            for (const tableKey of Object.keys(TABLES)){
              DATA_CACHE[tableKey] = await GoogleSheetProvider.loadTable(tableKey);
            }
            const synced = {...newCfg, connectionStatus:'sync_active'};
            await saveSettingsConfig(synced);
            badge.innerHTML = settingsStatusBadgeHtml('sync_active');
            note.innerHTML = 'Now synced to Google Sheet — data loaded successfully from every table.';
          }catch(e){
            note.innerHTML = `Could not load from Google Sheet: ${escapeHtml(String(e && e.message || e))}. Fix the configuration and try again — pages will retry automatically on next visit.`;
          }
        } else {
          note.innerHTML = 'Google Sheet is now the active database. Existing data was left untouched in Local Storage; pages will read fresh from Google Sheet from here on.';
        }
      } else {
        note.innerHTML = 'Switched back to Local Storage. The cache was cleared — pages will read from this browser\'s Local Storage from here on.';
      }
    }
    flashSaved();
  });

  wrap.querySelectorAll('input[name="cfgBackupMode"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const mode = e.target.value === 'manual' ? 'manual' : 'auto';
      const latestCfg = await getSettingsConfig();
      await saveSettingsConfig({...latestCfg, backupMode: mode});
      const note = wrap.querySelector('#backupModeNote');
      note.textContent = mode === 'manual'
        ? 'Auto Backup is off — backups only happen when you click "Backup Now".'
        : 'Auto Backup is on — a backup runs automatically every Saturday while the app is open.';
      flashSaved();
    });
  });

  const emailErrorEl = wrap.querySelector('#backupEmailError');
  function showEmailError(msg){
    emailErrorEl.textContent = msg;
    emailErrorEl.style.display = 'block';
  }
  const backupEmailAddBtn = wrap.querySelector('#backupEmailAddBtn');
  const backupEmailInputEl = wrap.querySelector('#backupEmailInput');
  if (backupEmailInputEl){
    backupEmailInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter'){ e.preventDefault(); backupEmailAddBtn && backupEmailAddBtn.click(); }
    });
  }
  if (backupEmailAddBtn){
    backupEmailAddBtn.addEventListener('click', async () => {
      const input = wrap.querySelector('#backupEmailInput');
      const raw = (input.value || '').trim();
      emailErrorEl.style.display = 'none';
      if (!raw){ showEmailError('Enter an email address first.'); return; }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(raw)){ showEmailError('That doesn\'t look like a valid email address.'); return; }
      const latestCfg = await getSettingsConfig();
      const existing = Array.isArray(latestCfg.backupEmails) ? latestCfg.backupEmails : [];
      if (existing.some(addr => addr.toLowerCase() === raw.toLowerCase())){
        showEmailError('That email is already on the list.');
        return;
      }
      const updated = [...existing, raw];
      await saveSettingsConfig({...latestCfg, backupEmails: updated});
      flashSaved();
      const node = await renderSettingsPage();
      wrap.replaceWith(node);
    });
  }

  wrap.querySelectorAll('.backup-email-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const addr = btn.getAttribute('data-email');
      const latestCfg = await getSettingsConfig();
      const existing = Array.isArray(latestCfg.backupEmails) ? latestCfg.backupEmails : [];
      const updated = existing.filter(a => a !== addr);
      await saveSettingsConfig({...latestCfg, backupEmails: updated});
      flashSaved();
      const node = await renderSettingsPage();
      wrap.replaceWith(node);
    });
  });

  wrap.querySelectorAll('.backup-history-row-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const iso = btn.getAttribute('data-iso');
      const fileName = btn.getAttribute('data-file');
      const confirmed = await openDeleteHistoryRowModal(fileName);
      if (!confirmed) return;
      await deleteBackupHistoryEntry(iso, fileName);
      const node = await renderSettingsPage();
      wrap.replaceWith(node);
    });
  });

  const deleteAllBtn = wrap.querySelector('#deleteAllHistoryBtn');
  if (deleteAllBtn){
    deleteAllBtn.addEventListener('click', async () => {
      if (deleteAllBtn.disabled) return;
      const confirmed = await openDeleteAllHistoryModal(history.length);
      if (!confirmed) return;
      await clearBackupHistory();
      const node = await renderSettingsPage();
      wrap.replaceWith(node);
    });
  }

  wrap.querySelector('#backupNowBtn').addEventListener('click', async () => {
    const btn = wrap.querySelector('#backupNowBtn');
    btn.disabled = true; btn.textContent = 'Backing up…';
    await runBackup('Manual');
    btn.disabled = false; btn.textContent = 'Backup Now';
    const node = await renderSettingsPage();
    wrap.replaceWith(node);
  });

  wrap.querySelector('#restoreBackupBtn').addEventListener('click', () => {
    openRestoreModal(async () => {
      const node = await renderSettingsPage();
      wrap.replaceWith(node);
    });
  });

  return wrap;
}

/* ============================================================
   PAGE: RELEASE MANAGER
============================================================= */
function renderReleaseManagerTable(rows){
  if (!rows.length) return `<div class="settings-note" style="margin-top:0;">No releases published yet.</div>`;
  return `<div class="tablewrap admin-rows-5">
    <table class="kpi-bucket-table" style="width:100%;">
      <thead><tr><th>Version</th><th>Date</th><th>Type</th><th>Title</th><th>Description</th><th style="width:96px;text-align:right;">Actions</th></tr></thead>
      <tbody>
        ${rows.map((r, i) => `
          <tr>
            <td class="date-cell">${escapeHtml(r.version || '-')}</td>
            <td>${escapeHtml(fmtDate ? fmtDate(r.releaseDate) : (r.releaseDate || '-'))}</td>
            <td>${escapeHtml(r.type || '-')}</td>
            <td>${escapeHtml(r.title || '-')}</td>
            <td class="reason-cell" style="white-space:normal;max-width:320px;"><span class="clamp-1line">${escapeHtml(r.description || '-')}</span></td>
            <td style="text-align:right;white-space:nowrap;">
              ${i === 0
                ? `<span title="Release terkini — dilindungi. Untuk betulkan, publish versi baharu." style="font-size:11px;color:var(--muted);">🔒 Latest</span>`
                : (r.releaseId != null
                    ? `<button class="btn danger" data-release-id="${escapeHtml(String(r.releaseId))}" data-release-version="${escapeHtml(r.version || '')}" style="padding:5px 12px;font-size:12px;">Delete</button>`
                    : `<span style="font-size:11px;color:var(--muted);">—</span>`)}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;
}

async function renderReleaseManagerPage(){
  const rows = await fetchSystemUpdates().catch(() => []);

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="rm-split">
      <div class="section">
        <div class="section-head">
          <h3>Publish Release</h3>
          <span class="eyebrow">New system update</span>
        </div>
        <div class="section-body">
          <div class="settings-grid">
            <div class="formfield">
              <label>Version</label>
              <input type="text" id="relVersion" placeholder="e.g. v1.2.0">
            </div>
            <div class="formfield">
              <label>Type</label>
              <div class="fpick" data-fp="relType">
                <input type="text" id="relType" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select..." value="${escapeHtml(RELEASE_TYPES[0])}">
                <span class="fpick-caret"></span>
                <div class="combo-panel fpick-panel" data-fp-panel="relType"></div>
              </div>
            </div>
            <div class="formfield full">
              <label>Title</label>
              <input type="text" id="relTitle" placeholder="Short summary of the release">
            </div>
            <div class="formfield full">
              <label>Description</label>
              <textarea id="relDescription" rows="4" placeholder="What changed, in detail..."></textarea>
            </div>
          </div>
          <div class="settings-note" id="relFixNote" style="display:none;"></div>
          <div class="settings-actions">
            <button class="btn primary" id="publishReleaseBtn">Publish Release</button>
            <button class="btn" id="relClearFixBtn" style="display:none;">Clear &amp; Reset</button>
          </div>
          <div class="settings-note" id="releaseFormNote" style="display:none;"></div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Bug Reports</h3>
          <span class="eyebrow" id="bugCountEyebrow">Loading…</span>
        </div>
        <div class="section-body" id="bugReportBody">
          <div class="settings-note" style="margin-top:0;">Loading…</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h3>Release History</h3>
        <span class="eyebrow" id="releaseCountEyebrow">${rows.length} release${rows.length === 1 ? '' : 's'}</span>
      </div>
      <div class="section-body" id="releaseHistoryBody">
        ${renderReleaseManagerTable(rows)}
      </div>
    </div>
  `;

  const noteEl = wrap.querySelector('#releaseFormNote');
  function showNote(text, isError){
    noteEl.style.display = 'block';
    noteEl.style.color = isError ? 'var(--red)' : 'var(--green)';
    noteEl.textContent = text;
  }

  const historyBody = wrap.querySelector('#releaseHistoryBody');

  async function refreshHistory(){
    const freshRows = await fetchSystemUpdates().catch(() => []);
    historyBody.innerHTML = renderReleaseManagerTable(freshRows);
    const eyebrow = wrap.querySelector('#releaseCountEyebrow');
    if (eyebrow) eyebrow.textContent = `${freshRows.length} release${freshRows.length === 1 ? '' : 's'}`;
  }

  FOCC_ADMIN_LIVE_REFRESH = refreshHistory;

  historyBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-release-id]');
    if (!btn) return;
    const id = Number(btn.dataset.releaseId || 0);
    const ver = btn.dataset.releaseVersion || '';
    if (!id) return;

    const ok = await confirmModal(
      'Delete Release',
      `Delete release <strong>${escapeHtml(ver)}</strong> from the history?<br><br>This cannot be undone.`,
      { confirmLabel: 'Delete', tone: 'danger' }
    );
    if (!ok) return;

    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Deleting…';
    try{
      await adminInvoke('delete_release', { releaseId: id });
      await refreshHistory();
    }catch(err){
      alert('Failed to delete release: ' + String(err && err.message || err));
      btn.disabled = false;
      btn.textContent = label;
    }
  });

  const bugBody = wrap.querySelector('#bugReportBody');
  const bugEyebrow = wrap.querySelector('#bugCountEyebrow');
  let bugRows = [];

  async function refreshBugs(){
    bugBody.innerHTML = `<div class="settings-note" style="margin-top:0;">Loading…</div>`;
    try{
      const res = await adminInvoke('list_bug_reports');
      bugRows = res.data || [];
    }catch(err){
      bugBody.innerHTML = `<div class="settings-note" style="margin-top:0;color:var(--red);">Failed to load bug reports: ${escapeHtml(String((err && err.message) || err))}</div>`;
      bugEyebrow.textContent = '—';
      return;
    }
    const c = {};
    bugRows.forEach(b => { c[b.status] = (c[b.status] || 0) + 1; });
    bugEyebrow.textContent =
      `${c['New'] || 0} new \u00b7 ${c['On Repairing'] || 0} repairing \u00b7 ${c['Ready for Release'] || 0} ready \u00b7 ${c['Fixed'] || 0} fixed`;
    bugBadgeRender(c['New'] || 0);
    bugBody.innerHTML = renderBugReportsTable(bugRows);
  }

  window.FOCC_REFRESH_BUGS = refreshBugs;

  bugBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-bug-id]');
    if (!btn) return;
    const id = Number(btn.dataset.bugId || 0);
    const bug = bugRows.find(b => Number(b.bugId) === id);
    if (!bug) return;
    const res = await openBugDetailModal(bug);
    if (res && res.changed) await refreshBugs();
    if (res && res.prepareFix) applyFixPrefill(res.prepareFix);
  });

  await refreshBugs();

  wireFixedPicker(wrap, {
    field:'[data-fp="relType"]', input:'#relType',
    panel:'[data-fp-panel="relType"]', values: RELEASE_TYPES
  });

  let linkedBugId = null;
  const relFixNote = wrap.querySelector('#relFixNote');
  const relClearFixBtn = wrap.querySelector('#relClearFixBtn');

  function setFixLink(bug){
    linkedBugId = bug ? Number(bug.bugId) : null;
    if (relFixNote){
      relFixNote.style.display = bug ? 'block' : 'none';
      relFixNote.style.color = 'var(--teal-dark)';
      relFixNote.textContent = bug
        ? 'Linked to Bug #' + bug.bugId + ' — "' + String(bug.title || '') + '". Publishing this release will mark that report as Fixed.'
        : '';
    }
    if (relClearFixBtn) relClearFixBtn.style.display = bug ? 'inline-flex' : 'none';
  }

  if (relClearFixBtn){
    relClearFixBtn.addEventListener('click', async () => {
      const ok = await confirmModal(
        'Clear Bug Link',
        'This unlinks the bug report <strong>and resets the Publish Release form</strong>.<br><br>The form will be empty again, so this release becomes a normal update.',
        { confirmLabel: 'Clear & Reset' }
      );
      if (!ok) return;

      setFixLink(null);

      wrap.querySelector('#relVersion').value = '';
      wrap.querySelector('#relType').value = RELEASE_TYPES[0];
      wrap.querySelector('#relTitle').value = '';
      wrap.querySelector('#relDescription').value = '';

      if (relFixNote){
        relFixNote.style.display = 'block';
        relFixNote.style.color = 'var(--muted)';
        relFixNote.textContent = 'Bug link cleared — the form has been reset. This release will be published as a normal update.';
      }
    });
  }

  function applyFixPrefill(bug){
    wrap.querySelector('#relVersion').value = '';
    wrap.querySelector('#relType').value = 'Fix';
    wrap.querySelector('#relTitle').value = bug.title || '';

    const lines = ['Fix done — ' + (bug.title || '')];
    if (bug.description) lines.push('', bug.description);
    if (bug.steps) lines.push('', 'Steps: ' + bug.steps);
    lines.push('', 'Reported by ' + (bug.reporterEmail || '-') +
      (bug.reporterCompany ? ' (' + bug.reporterCompany + ')' : '') +
      ' on ' + bugWhen(bug.createdAt) + '.');
    wrap.querySelector('#relDescription').value = lines.join('\n');

    setFixLink(bug);
    const card = wrap.querySelector('.rm-split .section');
    if (card && card.scrollIntoView) card.scrollIntoView({ behavior:'smooth', block:'start' });
    const v = wrap.querySelector('#relVersion');
    if (v) v.focus();
  }

  wrap.querySelector('#publishReleaseBtn').addEventListener('click', async () => {
    const version = wrap.querySelector('#relVersion').value.trim();
    const type = wrap.querySelector('#relType').value;
    const title = wrap.querySelector('#relTitle').value.trim();
    const description = wrap.querySelector('#relDescription').value.trim();

    if (!version || !title){
      showNote('Version and Title are required.', true);
      return;
    }

    const btn = wrap.querySelector('#publishReleaseBtn');
    btn.disabled = true; btn.textContent = 'Publishing…';
    try{
      const cfg = await getSettingsConfig();
      const payload = {version, type, title, description};
      if (linkedBugId) payload.bugId = linkedBugId;
      const res = await adminInvoke('create_release', payload);

      showNote('✅ Release Published Successfully' +
        (res && res.bug ? ` — Bug #${res.bug.bugId} marked as Fixed` : ''), false);
      wrap.querySelector('#relVersion').value = '';
      wrap.querySelector('#relType').value = RELEASE_TYPES[0];
      wrap.querySelector('#relTitle').value = '';
      wrap.querySelector('#relDescription').value = '';

      if (linkedBugId){ setFixLink(null); await refreshBugs(); }
      await refreshHistory();
    }catch(e){
      showNote(`Failed to publish release: ${String(e && e.message || e)}`, true);
    }finally{
      btn.disabled = false; btn.textContent = 'Publish Release';
    }
  });

  return wrap;
}

/* ============================================================
   BUG REPORT PAGE list (helper untuk User/Company Manager)
============================================================= */
function bugReportPageList(){
  return Object.keys(ROUTES)
    .filter(k => userCanAccess(k))
    .map(k => ({ key: k, title: (ROUTES[k] && ROUTES[k].title) || k }));
}

function wireBugPagePicker(box, pages, currentKey){
  const fieldEl = box.querySelector('[data-fp="bugPage"]');
  if (!fieldEl) return;
  const input = box.querySelector('#bugPage');
  const panel = box.querySelector('[data-fp-panel="bugPage"]');
  if (!input || !panel) return;
  const esc = s => String(s).replace(/"/g, '&quot;');
  const opts = (pages || []).map(p => ({ key: p.key, title: p.title || p.key }));
  const titleOf = k => { const o = opts.find(x => x.key === k); return o ? o.title : k; };

  function setKey(key){
    input.value = titleOf(key);
    input.dataset.key = key;
    input.dataset.title = titleOf(key);
  }
  function render(){
    panel.innerHTML = opts.length
      ? opts.map(o =>
          `<div class="combo-item fpick-option${o.key === input.dataset.key ? ' is-active' : ''}" data-value="${esc(o.key)}" data-title="${esc(o.title)}">
             <span class="combo-item-text">${esc(o.title)}</span>
           </div>`).join('')
      : '<div class="combo-empty">No pages</div>';
    panel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        input.value = row.dataset.value ? (row.dataset.title || row.dataset.value) : '';
        input.dataset.key = row.dataset.value || '';
        input.dataset.title = row.dataset.title || input.dataset.key;
        panel.classList.remove('open');
      });
    });
  }
  const open = () => { render(); panel.classList.add('open'); };
  const close = () => panel.classList.remove('open');

  input.addEventListener('click', () => {
    if (panel.classList.contains('open')){ close(); return; }
    open();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    if (e.key === 'Escape'){ close(); return; }
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      if (panel.classList.contains('open')) close(); else open();
      return;
    }
    e.preventDefault();
  });
  document.addEventListener('mousedown', e => {
    if (!fieldEl.contains(e.target)) close();
  });

  if (currentKey) setKey(currentKey);
}

/* ============================================================
   BUG REPORT — open modal (butang "!" di topbar)
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