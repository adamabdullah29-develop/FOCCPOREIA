/* =========================================================================
   FOCC — 11-pages-admin.js
   Settings, Release Manager, User Manager, Company Manager, System Health,
   Module Skeleton pages.
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
   USER MANAGER — fieldset bina dari NAV_STRUCTURE + ROUTES
============================================================= */
function buildAllowedRouteGroups(){
  const groups = [];
  function pushGroupFromItems(label, items){
    const mapped = (items || [])
      .filter(it => ROUTES[navItemKey(it)])
      .map(it => ({
        key: navItemKey(it),
        label: navItemLabel(it)
      }));
    if (mapped.length){
      groups.push({ label, items: mapped });
    }
  }
  NAV_STRUCTURE.forEach(entry => {
    if (entry.standalone){
      if (!ROUTES[entry.key]) return;
      groups.push({
        label: entry.label,
        items: [{
          key: entry.key,
          label: ROUTES[entry.key].crumb || ROUTES[entry.key].title
        }]
      });
      return;
    }
    if (entry.subgroups){
      entry.subgroups.forEach(sg => {
        pushGroupFromItems(`${entry.group} — ${sg.label}`, sg.items);
      });
      return;
    }
    pushGroupFromItems(entry.group, entry.items);
  });
  return groups;
}

function renderAllowedRouteFieldset(selectedRoutes){
  const groups = buildAllowedRouteGroups();
  const routes = Array.isArray(selectedRoutes) ? selectedRoutes : [];
  const isAll = routes.includes('ALL');
  return `
    <div class="formfield full">
      <label>Allowed Access</label>
      <div class="route-access-allrow">
        <label class="checkbox-option">
          <input type="checkbox" id="routeAllToggle" ${isAll ? 'checked' : ''}>
          <span><b>Grant ALL Access (Admin)</b></span>
        </label>
      </div>
      <div class="route-access-groups" id="routeAccessGroups">
        ${groups.map(g => `
          <div class="route-access-group">
            <div class="route-access-group-title">${escapeHtml(g.label)}</div>
            ${g.items.map(it => `
              <label class="checkbox-option">
                <input type="checkbox" class="route-access-item" value="${escapeHtml(it.key)}" ${(isAll || routes.includes(it.key)) ? 'checked' : ''} ${isAll ? 'disabled' : ''}>
                <span>${escapeHtml(it.label)}</span>
              </label>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* ============================================================
   USER MANAGER — modal Add/Edit User
============================================================= */
function openUserFormModal(user){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    box.classList.add('user-modal');
    const isEdit = !!user;
    const selectedRoutes = user ? user.routes : [];
    box.innerHTML = `
      <h4>${isEdit ? 'Edit User' : 'Add User'}</h4>
      <div class="formgrid">
        <div class="formfield">
          <label>Email</label>
          <input type="email" id="umEmail" value="${escapeHtml(user ? user.email : '')}" placeholder="user@company.com" ${isEdit ? 'readonly' : ''}>
        </div>
        <div class="formfield">
          <label>Company</label>
          <div class="fpick" data-umpick="umCompany">
            <input type="text" id="umCompany" class="fpick-input" data-no-type="1" inputmode="none" autocomplete="off" placeholder="Select company..." value="${escapeHtml(user ? (user.company || '') : '')}">
            <span class="fpick-caret"></span>
            <div class="combo-panel fpick-panel" data-umpick-panel="umCompany"></div>
          </div>
        </div>
        <div class="formfield">
          <label>Company ID</label>
          <input type="text" id="umCompanyId" value="${escapeHtml(user ? (user.companyId || '') : '')}" readonly style="background:#f1f4f6;color:var(--muted);cursor:not-allowed;" placeholder="Auto-filled from company">
        </div>
        <div class="formfield">
          <label>Role</label>
          <div class="combo-wrap" data-umpick="umRole">
            <input type="text" id="umRole" autocomplete="off" value="${escapeHtml(user ? user.role : '')}" placeholder="e.g. SuperAdmin, Admin, Safety">
            <div class="combo-panel" data-umpick-panel="umRole"></div>
          </div>
        </div>
        ${isEdit ? `
        <div class="formfield">
          <label>Status</label>
          <div class="fpick" data-fp="umStatus">
            <input type="text" id="umStatus" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select..." value="${escapeHtml((user && user.status) || 'Active')}">
            <span class="fpick-caret"></span>
            <div class="combo-panel fpick-panel" data-fp-panel="umStatus"></div>
          </div>
        </div>
        ` : ''}
        <div class="formfield">
          <label>Expiry Date</label>
          <input type="date" id="umExpiryDate" value="${escapeHtml(user ? user.expiryDate : '')}">
        </div>
        ${renderAllowedRouteFieldset(selectedRoutes)}
      </div>
      <div class="modalfoot">
        ${isEdit ? `<button class="btn" id="umResetPass" style="margin-right:auto;">🔑 Reset Password</button>` : ''}
        <button class="btn" id="umCancel">Cancel</button>
        <button class="btn primary" id="umSave">${isEdit ? 'Save Changes' : 'Add User'}</button>
      </div>
    `;
    overlay.classList.add('show');

    wireUserCompanyAndRolePickers(box, user);

    wireFixedPicker(box, {
      field:'[data-fp="umStatus"]', input:'#umStatus',
      panel:'[data-fp-panel="umStatus"]', values:['Active','Suspended'],
      current: user ? (user.status || 'Active') : 'Active'
    });

    const allToggle = box.querySelector('#routeAllToggle');
    const itemBoxes = () => Array.from(box.querySelectorAll('.route-access-item'));
    allToggle.addEventListener('change', () => {
      itemBoxes().forEach(cb => { cb.disabled = allToggle.checked; if (allToggle.checked) cb.checked = true; });
    });

    const finish = (result) => {
      overlay.classList.remove('show');
      box.classList.remove('user-modal');
      resolve(result);
    };
    box.querySelector('#umCancel').addEventListener('click', () => finish(null));

    const resetBtn = box.querySelector('#umResetPass');
    if (resetBtn) resetBtn.addEventListener('click', async () => {
      if (!confirm('Reset password for ' + user.email + '?\n\nThe old password will stop working immediately.')) return;

      const newPass = generateTempPassword();
      resetBtn.disabled = true;
      resetBtn.textContent = 'Resetting…';
      try{
        await foccUpdateUser(user.email, { password: newPass });
      }catch(err){
        resetBtn.disabled = false;
        resetBtn.textContent = '🔑 Reset Password';
        alert('Failed to reset password: ' + String(err && err.message || err));
        return;
      }
      finish(null);
      await showNewPasswordModal(user.email, newPass);
    });

    box.querySelector('#umSave').addEventListener('click', () => {
      const email = box.querySelector('#umEmail').value.trim();
      const company = box.querySelector('#umCompany').value.trim();
      const role = box.querySelector('#umRole').value.trim();
      const expiryDate = box.querySelector('#umExpiryDate').value;
      if (!email || !company || !role){
        alert('Email, Company and Role are required.');
        return;
      }
      const routes = allToggle.checked ? ['ALL'] : itemBoxes().filter(cb => cb.checked).map(cb => cb.value);
      const companyId = box.querySelector('#umCompanyId').value.trim();
      const payload = { email, company, role, expiryDate, routes, companyId };
      if (isEdit){
        payload.status = box.querySelector('#umStatus').value;
      }
      finish(payload);
    });
  });
}

/* ============================================================
   USER MANAGER — Company + Role pickers
============================================================= */
function wireUserCompanyAndRolePickers(box, user){
  const esc = s => String(s).replace(/"/g, '&quot;');

  function makePicker(input, panel, fieldEl, getOptions, onPick){
    function render(){
      const opts = getOptions();
      const current = input.value.trim();
      panel.innerHTML = opts.length
        ? opts.map(o =>
            `<div class="combo-item fpick-option${o.value === current ? ' is-active' : ''}" data-value="${esc(o.value)}">
               <span class="combo-item-text">${esc(o.label || o.value)}</span>
             </div>`).join('')
        : '<div class="combo-empty">No options</div>';
      panel.querySelectorAll('.fpick-option').forEach(row => {
        row.addEventListener('mousedown', e => {
          e.preventDefault(); e.stopPropagation();
          input.value = row.dataset.value || '';
          if (onPick) onPick(input.value);
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
    input.addEventListener('input', () => { if (panel.classList.contains('open')) render(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ close(); return; }
      if (e.key === 'Enter'){
        e.preventDefault();
        if (panel.classList.contains('open')) close(); else open();
        return;
      }
      if (input.dataset.noType === '1'){ e.preventDefault(); return; }
    });
    document.addEventListener('mousedown', e => {
      if (!fieldEl.contains(e.target)) close();
    });
  }

  const roleField = box.querySelector('[data-umpick="umRole"]');
  if (roleField){
    const roleInput = roleField.querySelector('#umRole');
    const rolePanel = roleField.querySelector('[data-umpick-panel="umRole"]');
    if (roleInput && rolePanel){
      const roleOpts = FOCC_USER_ROLE_SUGGESTIONS.slice();
      const curRole = roleInput.value.trim();
      if (curRole && !roleOpts.includes(curRole)) roleOpts.unshift(curRole);
      makePicker(roleInput, rolePanel, roleField,
        () => roleOpts.map(r => ({ value: r, label: r })));
    }
  }

  const compField = box.querySelector('[data-umpick="umCompany"]');
  if (compField){
    const compInput = compField.querySelector('#umCompany');
    const compPanel = compField.querySelector('[data-umpick-panel="umCompany"]');
    const companyIdInput = box.querySelector('#umCompanyId');
    if (compInput && compPanel){
      let compMap = {};
      let compOpts = [];
      const syncId = () => {
        if (companyIdInput) companyIdInput.value = compMap[compInput.value.trim()] || '';
      };
      makePicker(compInput, compPanel, compField, () => compOpts, syncId);
      (async () => {
        try {
          const companies = await fetchFoccCompanies();
          compMap = {};
          compOpts = companies.map(c => {
            compMap[c.company] = c.companyId || '';
            return { value: c.company, label: c.company + (c.companyId ? ' (' + c.companyId + ')' : '') };
          });
          if (user && user.company) compInput.value = user.company;
          syncId();
        } catch(e) { console.error('Failed to load companies:', e); }
      })();
    }
  }
}

/* ============================================================
   USER MANAGER — metrics + render
============================================================= */
function computeUserManagerMetrics(list){
  const today = new Date(); today.setHours(0,0,0,0);
  let active = 0, suspended = 0, expiringSoon = 0;
  (list || []).forEach(u => {
    const status = (u.status || 'Active');
    if (status === 'Suspended') suspended++; else active++;
    if (u.expiryDate){
      const dt = new Date(`${u.expiryDate}T00:00:00`);
      if (!isNaN(dt.getTime())){
        const daysLeft = Math.round((dt - today) / 86400000);
        if (daysLeft >= 0 && daysLeft <= 30) expiringSoon++;
      }
    }
  });
  return { total: (list || []).length, active, suspended, expiringSoon };
}

function renderUserManagerMetricsGrid(list){
  const m = computeUserManagerMetrics(list);
  return `
    <div class="mini-stat" style="--stat-accent:var(--teal)">
      <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>Total Users</div>
      <div class="value">${FMT.num(m.total)}</div>
      <div class="meta">All registered accounts</div>
    </div>
    <div class="mini-stat" style="--stat-accent:var(--green)">
      <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"></path><path d="M15 6h6v6"></path></svg>Active Users</div>
      <div class="value">${FMT.num(m.active)}</div>
      <div class="meta">Currently enabled access</div>
    </div>
    <div class="mini-stat" style="--stat-accent:var(--red)">
      <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M4.9 4.9l14.2 14.2"></path></svg>Suspended Users</div>
      <div class="value">${FMT.num(m.suspended)}</div>
      <div class="meta">Access disabled</div>
    </div>
    <div class="mini-stat" style="--stat-accent:var(--amber)">
      <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>Expiring Soon</div>
      <div class="value">${FMT.num(m.expiringSoon)}</div>
      <div class="meta">Expiry within 30 days</div>
    </div>
  `;
}

async function renderUserManagerPage(){
  console.log('USER MANAGER LOADED');
  let users = [];
  let loadError = '';
  try{ users = await fetchFoccUsers(); }catch(e){ loadError = String(e && e.message || e); }

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="section">
      <div class="section-body">
        <div class="cdx-statgrid" id="userMetricsGrid">${renderUserManagerMetricsGrid(users)}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h3>Users</h3>
        <span class="eyebrow" id="userCountEyebrow">${users.length} user${users.length === 1 ? '' : 's'}</span>
      </div>
      <div class="section-body">
        ${loadError ? `<div class="notice notice-danger" style="margin-bottom:14px;">Failed to load users: ${escapeHtml(loadError)}</div>` : ''}
        <div class="toolbar">
          <input class="searchbox" type="text" id="umSearchEmail" placeholder="Search by Email...">
          <input class="searchbox" type="text" id="umSearchCompany" placeholder="Search by Company...">
          <input class="searchbox" type="text" id="umSearchRole" placeholder="Search by Role...">
          <button class="btn primary" id="addUserBtn">+ Add User</button>
        </div>
        <div class="tablewrap">
          <table class="cdx-table" id="userTable">
            <thead><tr><th>Email</th><th>Company</th><th>Role</th><th>Status</th><th>Expiry Date</th><th>Version</th><th>Actions</th></tr></thead>
            <tbody id="userTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const tbody = wrap.querySelector('#userTableBody');

  function updateCountEyebrow(){
    const el = wrap.querySelector('#userCountEyebrow');
    if (el) el.textContent = `${users.length} user${users.length === 1 ? '' : 's'}`;
  }

  function refreshUserMetrics(){
    const grid = wrap.querySelector('#userMetricsGrid');
    if (grid) grid.innerHTML = renderUserManagerMetricsGrid(users);
  }

  FOCC_ADMIN_LIVE_REFRESH = async () => {
    console.log('REFRESH USERS');
    users = await fetchFoccUsers();
    updateCountEyebrow();
    renderRows();
    refreshUserMetrics();
  };

  foccAdminLiveStart('userManager');

  function renderRows(){
    const qEmail = wrap.querySelector('#umSearchEmail').value.trim().toLowerCase();
    const qCompany = wrap.querySelector('#umSearchCompany').value.trim().toLowerCase();
    const qRole = wrap.querySelector('#umSearchRole').value.trim().toLowerCase();
    const filtered = users.filter(u =>
      (!qEmail || (u.email || '').toLowerCase().includes(qEmail)) &&
      (!qCompany || (u.company || '').toLowerCase().includes(qCompany)) &&
      (!qRole || (u.role || '').toLowerCase().includes(qRole))
    );
    tbody.innerHTML = filtered.length ? filtered.map(u => `
      <tr>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.company || '-')}</td>
        <td>${escapeHtml(u.role || '-')}</td>
        <td>${badgeFor(u.status || 'Active')}</td>
        <td>${fmtDate(u.expiryDate)}</td>
        <td>${escapeHtml(u.version || '-')}</td>
        <td><div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">
          <button class="btn rowedit" data-action="edit" data-email="${escapeHtml(u.email)}" title="Edit user" aria-label="Edit">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
          </button>
          <button class="btn rowdel" data-action="delete" data-email="${escapeHtml(u.email)}" title="Delete user" aria-label="Delete">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z" fill="currentColor"/><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
          </button>
        </div></td>
      </tr>
    `).join('') : `<tr><td colspan="7" class="kpi-bucket-empty">No users found.</td></tr>`;
  }
  renderRows();

  ['#umSearchEmail', '#umSearchCompany', '#umSearchRole'].forEach(sel => {
    wrap.querySelector(sel).addEventListener('input', renderRows);
  });

  wrap.querySelector('#addUserBtn').addEventListener('click', async () => {
    const result = await openUserFormModal(null);
    if (!result) return;
    try{
      await foccAddUser(result);
      users = await fetchFoccUsers();
      updateCountEyebrow();
      renderRows();
      refreshUserMetrics();
      alert('User added successfully.');
    }catch(e){
      alert(`Failed to add user: ${String(e && e.message || e)}`);
    }
  });

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const email = btn.dataset.email;
    const action = btn.dataset.action;
    const user = users.find(u => u.email === email);
    if (!user) return;

    if (action === 'edit'){
      const result = await openUserFormModal(user);
      if (!result) return;
      try{
        await foccUpdateUser(email, result);
        users = await fetchFoccUsers();
        renderRows();
        refreshUserMetrics();
        alert('User updated successfully.');
      }catch(err){
        alert(`Failed to update user: ${String(err && err.message || err)}`);
      }
    } else if (action === 'suspend'){
      const nextStatus = (user.status || 'Active') === 'Suspended' ? 'Active' : 'Suspended';
      const ok = await confirmModal(
        nextStatus === 'Suspended' ? 'Suspend User' : 'Reactivate User',
        `${nextStatus === 'Suspended' ? 'Suspend' : 'Reactivate'} access for <strong>${escapeHtml(email)}</strong>?`,
        {confirmLabel: nextStatus === 'Suspended' ? 'Suspend' : 'Reactivate'}
      );
      if (!ok) return;
      try{
        await foccSetUserStatus(email, nextStatus);
        users = await fetchFoccUsers();
        renderRows();
        refreshUserMetrics();
      }catch(err){
        alert(`Failed to update status: ${String(err && err.message || err)}`);
      }
    } else if (action === 'delete'){
      const ok = await confirmModal('Delete User', `Permanently delete <strong>${escapeHtml(email)}</strong>? This cannot be undone.`, {confirmLabel:'Delete', tone:'danger'});
      if (!ok) return;
      try{
        await foccDeleteUser(email);
        users = users.filter(u => u.email !== email);
        updateCountEyebrow();
        renderRows();
        refreshUserMetrics();
        alert('User deleted successfully.');
      }catch(err){
        alert(`Failed to delete user: ${String(err && err.message || err)}`);
      }
    } else if (action === 'resetVersion'){
      const ok = await confirmModal('Reset Version', `Reset the stored app version for <strong>${escapeHtml(email)}</strong>? They will see the "What's New" notice again on next login.`, {confirmLabel:'Reset'});
      if (!ok) return;
      try{
        await foccResetUserVersion(email);
        users = await fetchFoccUsers();
        renderRows();
      }catch(err){
        alert(`Failed to reset version: ${String(err && err.message || err)}`);
      }
    }
  });

  return wrap;
}

/* ============================================================
   COMPANY MANAGER — modals + page
============================================================= */
function openCompanyFormModal(company){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    const isEdit = !!company;
    box.innerHTML = `
      <h4>${isEdit ? 'Edit Company' : 'Add Company'}</h4>
      <div class="formgrid">
        <div class="formfield">
          <label>Company</label>
          <input type="text" id="cmCompany" value="${escapeHtml(isEdit ? company.company : '')}" placeholder="e.g. Kemaman Operation">
        </div>
        <div class="formfield">
          <label>Company ID</label>
          <input type="text" id="cmCompanyId" value="${escapeHtml(isEdit ? (company.companyId || '') : '')}" readonly style="background:#f1f4f6;color:var(--muted);cursor:not-allowed;" placeholder="Auto-generated on save">
        </div>
        <div class="formfield">
          <label>Google Sheet ID</label>
          <input type="text" id="cmGoogleSheetId" value="${escapeHtml(isEdit ? company.googleSheetId : '')}" placeholder="Sheet ID">
        </div>
        <div class="formfield">
          <label>Apps Script URL</label>
          <input type="text" id="cmAppsScriptUrl" value="${escapeHtml(isEdit ? company.appsScriptUrl : '')}" placeholder="https://script.google.com/...">
        </div>
        <div class="formfield">
          <label>Status</label>
          <div class="fpick" data-secpick="cmStatus">
            <input type="text" id="cmStatus" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
            <span class="fpick-caret"></span>
            <div class="combo-panel fpick-panel" data-secpick-panel></div>
          </div>
        </div>
      </div>
      <div class="modalfoot">
        <button class="btn" id="cmCancel">Cancel</button>
        <button class="btn primary" id="cmSave">${isEdit ? 'Save Changes' : 'Add Company'}</button>
      </div>
    `;
    overlay.classList.add('show');
    wireCompanyStatusPicker(box, isEdit ? (company.status || 'Active') : 'Active');

    const finish = (result) => {
      overlay.classList.remove('show');
      resolve(result);
    };
    box.querySelector('#cmCancel').addEventListener('click', () => finish(null));
    box.querySelector('#cmSave').addEventListener('click', () => {
      const companyName = box.querySelector('#cmCompany').value.trim();
      const googleSheetId = box.querySelector('#cmGoogleSheetId').value.trim();
      const appsScriptUrl = box.querySelector('#cmAppsScriptUrl').value.trim();
      const status = box.querySelector('#cmStatus').value;
      if (!companyName){
        alert('Company name is required.');
        return;
      }
      const companyId = box.querySelector('#cmCompanyId').value.trim();
      finish({ company: companyName, companyId, googleSheetId, appsScriptUrl, status });
    });
  });
}

function wireCompanyStatusPicker(box, currentVal){
  const OPTIONS = ['Active','Suspended'];
  const esc = s => String(s).replace(/"/g, '&quot;');
  const fieldEl = box.querySelector('[data-secpick="cmStatus"]');
  if (!fieldEl) return;
  const input = fieldEl.querySelector('input[data-col], input#cmStatus');
  const panel = fieldEl.querySelector('[data-secpick-panel]');
  if (!input || !panel) return;
  const cur = String(currentVal || 'Active').trim();

  function render(){
    const current = input.value || cur;
    panel.innerHTML = OPTIONS.map(v =>
      `<div class="combo-item fpick-option${v === current ? ' is-active' : ''}" data-value="${esc(v)}">
         <span class="combo-item-text">${v}</span>
       </div>`).join('');
    panel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        input.value = row.dataset.value || '';
        panel.classList.remove('open');
      });
    });
  }

  input.addEventListener('click', () => {
    if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
    render(); panel.classList.add('open');
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      if (panel.classList.contains('open')) panel.classList.remove('open');
      else { render(); panel.classList.add('open'); }
      return;
    }
    e.preventDefault();
  });
  document.addEventListener('mousedown', e => {
    if (!fieldEl.contains(e.target)) panel.classList.remove('open');
  });

  input.value = cur;
}

async function renderCompanyManagerPage(){
  let companies = [];
  let loadError = '';
  try{ companies = await fetchFoccCompanies(); }catch(e){ loadError = String(e && e.message || e); }

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="section">
      <div class="section-head">
        <h3>Companies</h3>
        <span class="eyebrow" id="companyCountEyebrow">${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}</span>
      </div>
      <div class="section-body">
        ${loadError ? `<div class="notice notice-danger" style="margin-bottom:14px;">Failed to load companies: ${escapeHtml(loadError)}</div>` : ''}
        <div class="toolbar">
          <input class="searchbox" type="text" id="cmSearchCompany" placeholder="Search by Company Name...">
          <button class="btn primary" id="addCompanyBtn">+ Add Company</button>
        </div>
        <div class="tablewrap">
          <table class="cdx-table" id="companyTable">
            <thead><tr><th>Company ID</th><th>Company</th><th>Google Sheet ID</th><th>Apps Script URL</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody id="companyTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const tbody = wrap.querySelector('#companyTableBody');

  function updateCountEyebrow(){
    const el = wrap.querySelector('#companyCountEyebrow');
    if (el) el.textContent = `${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}`;
  }

  FOCC_ADMIN_LIVE_REFRESH = async () => {
    companies = await fetchFoccCompanies();
    updateCountEyebrow();
    renderRows();
  };

  function renderRows(){
    const q = wrap.querySelector('#cmSearchCompany').value.trim().toLowerCase();
    const filtered = companies.filter(c => !q || (c.company || '').toLowerCase().includes(q));
    tbody.innerHTML = filtered.length ? filtered.map(c => `
      <tr>
        <td><span class="truckchip">${escapeHtml(c.companyId || '-')}</span></td>
        <td>${escapeHtml(c.company)}</td>
        <td>${escapeHtml(c.googleSheetId || '-')}</td>
        <td>${escapeHtml(c.appsScriptUrl || '-')}</td>
        <td>${badgeFor(c.status || 'Active')}</td>
        <td><div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">
          <button class="btn rowedit" data-action="edit" data-company="${escapeHtml(c.company)}" title="Edit company" aria-label="Edit">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
          </button>
          <button
          class="btn rowdel"
          data-action="delete"
          data-company="${escapeHtml(c.company)}"
          title="Delete company"
          aria-label="Delete">
          🗑
          </button>
        </div></td>
      </tr>
    `).join('') : `<tr><td colspan="6" class="kpi-bucket-empty">No companies found.</td></tr>`;
  }
  renderRows();

  wrap.querySelector('#cmSearchCompany').addEventListener('input', renderRows);

  wrap.querySelector('#addCompanyBtn').addEventListener('click', async () => {
    const result = await openCompanyFormModal();
    if (!result) return;
    try{
      await foccAddCompany(result);
      companies = await fetchFoccCompanies();
      updateCountEyebrow();
      renderRows();
      alert('Company added successfully.');
    }catch(e){
      alert(`Failed to add company: ${String(e && e.message || e)}`);
    }
  });

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const companyName = btn.dataset.company;
    const action = btn.dataset.action;

    if (action === 'edit') {
      const company = companies.find(c => c.company === companyName);
      if (!company) return;

      const result = await openCompanyFormModal(company);
      if (!result) return;

      try {
        await foccUpdateCompany(companyName, result);
        companies = await fetchFoccCompanies();
        renderRows();
        alert('Company updated successfully.');
      } catch (err) {
        alert(`Failed to update company: ${String(err && err.message || err)}`);
      }
      return;
    }

    if (action === 'delete') {
      const ok = await confirmModal(
        'Delete Company',
        `Delete <strong>${escapeHtml(companyName)}</strong>?`,
        { confirmLabel: 'Delete', tone: 'danger' }
      );
      if (!ok) return;

      try {
        await foccDeleteCompany(companyName);
        companies = await fetchFoccCompanies();
        updateCountEyebrow();
        renderRows();
        alert('Company deleted successfully.');
      } catch (err) {
        alert(`Failed to delete company: ${String(err && err.message || err)}`);
      }
      return;
    }
  });

  return wrap;
}

/* ============================================================
   PAGE: SYSTEM HEALTH
============================================================= */
async function renderSystemHealthPage(){
  const wrap = document.createElement('div');
  wrap.className = 'opkpi-modern-page';
  wrap.innerHTML = '<div class="section"><div class="section-body" id="shRoot">'
                 + '<div class="focc-sh-empty">Loading system health…</div></div></div>';

  const root = wrap.querySelector('#shRoot');
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const TREND_KEY = 'focc-sh-storage-trend-v1';
  let busy = false;

  function fmtBytes(n){
    n = Number(n || 0);
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(2) + ' MB';
    return (n / 1073741824).toFixed(2) + ' GB';
  }
  function usePct(part, whole){
    const p = whole ? (Number(part || 0) / Number(whole)) * 100 : 0;
    return { n: p, txt: p >= 10 ? p.toFixed(1) : p.toFixed(2) };
  }
  function fmtWhen(iso){
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const now = new Date();
    const hh = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    const days = Math.floor((now - d) / 86400000);
    if (d.toDateString() === now.toDateString()) return 'Today ' + hh;
    if (days <= 1) return 'Yesterday ' + hh;
    if (days < 7) return days + 'd ago';
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + hh;
  }
  function fmtClock(iso){
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function statusPill(s){
    if (s === 'active_today')     return '<span class="focc-sh-pill is-today">Active today</span>';
    if (s === 'data_today')       return '<span class="focc-sh-pill is-today">Data today</span>';
    if (s === 'doc_today')        return '<span class="focc-sh-pill is-today">Upload today</span>';
    if (s === 'active_this_week') return '<span class="focc-sh-pill is-week">This week</span>';
    return '<span class="focc-sh-pill is-silent">Silent</span>';
  }

  function readTrend(){
    try{
      const a = JSON.parse(localStorage.getItem(TREND_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    }catch(_e){ return []; }
  }
  function writeTrend(a){
    try{ localStorage.setItem(TREND_KEY, JSON.stringify(a.slice(-60))); }catch(_e){}
  }
  function storageTrend(currentBytes){
    const today = new Date().toISOString().slice(0,10);
    const hist = readTrend();
    const last = hist.length - 1;
    let prev = null;

    if (last >= 0 && hist[last].day === today){
      prev = (last >= 1) ? hist[last - 1] : null;
      hist[last] = { day: today, bytes: Number(currentBytes || 0) };
    }else{
      prev = (last >= 0) ? hist[last] : null;
      hist.push({ day: today, bytes: Number(currentBytes || 0) });
    }
    writeTrend(hist);

    if (!prev) return { value: '—', sub: 'Baseline saved — the next check shows the change' };

    const diff = Number(currentBytes || 0) - Number(prev.bytes || 0);
    const when = (prev.day === today) ? 'the last check' : prev.day;

    if (diff === 0) return { value: 'No change', sub: 'Same size as ' + when };
    return {
      value: (diff > 0 ? '+' : '−') + ' ' + fmtBytes(Math.abs(diff)),
      sub: (diff > 0 ? 'Grew' : 'Shrank') + ' since ' + when
    };
  }

  function render(data, ms){
    data = data || {};
    const p = data.platform || {};
    const companies = data.companies || [];

    const used    = Number(p.totalStorageBytes || 0);
    const limit   = Number(p.storageLimitBytes || 0);
    const storage = usePct(used, limit);

    const dbUsed  = Number(p.databaseBytes || 0);
    const dbLimit = Number(p.dbLimitBytes || 0);
    const db      = usePct(dbUsed, dbLimit);

    const largest   = p.largestCompany || null;
    const topTables = Array.isArray(p.topTables) ? p.topTables : [];
    const trend     = storageTrend(used);

    let health = 'Healthy', dot = 'is-ok';
    if (storage.n >= 80 || db.n >= 80)       { health = 'Nearly full'; dot = 'is-bad'; }
    else if (storage.n >= 60 || db.n >= 60)  { health = 'Filling up';  dot = 'is-warn'; }
    else if (Number(p.silentCount || 0) > 0) { health = 'Attention';   dot = 'is-warn'; }

    const rowsHtml = companies.length
      ? companies.map(c => {
          const sub = escapeHtml(String(c.companyId || ''))
            + (c.companyStatus && c.companyStatus !== 'Active' ? ' · ' + escapeHtml(String(c.companyStatus)) : '');
          return '<tr>'
            + '<td><b>' + escapeHtml(String(c.companyName || c.companyId || '')) + '</b>'
            + '<div class="focc-sh-mute" style="font-size:11.5px;">' + sub + '</div></td>'
            + '<td>' + statusPill(c.activityStatus) + '</td>'
            + '<td class="focc-sh-num">' + escapeHtml(fmtWhen(c.lastSignInAt)) + '</td>'
            + '<td class="focc-sh-num">' + escapeHtml(fmtWhen(c.lastDataChangeAt)) + '</td>'
            + '<td class="focc-sh-num">' + escapeHtml(fmtWhen(c.lastUploadAt)) + '</td>'
            + '<td class="focc-sh-num">' + escapeHtml(fmtBytes(c.storageBytes)) + '</td>'
            + '<td class="focc-sh-num">' + Number(c.fileCount || 0) + '</td>'
            + '</tr>';
        }).join('')
      : '<tr><td colspan="7"><div class="focc-sh-empty">No company yet.</div></td></tr>';

    const topRowsHtml = topTables.length
      ? topTables.map(t => '<tr>'
          + '<td class="focc-sh-num">' + escapeHtml(String(t.schema || '')) + '</td>'
          + '<td><b>' + escapeHtml(String(t.table || '')) + '</b></td>'
          + '<td class="focc-sh-num">' + escapeHtml(fmtBytes(t.bytes)) + '</td>'
          + '</tr>').join('')
      : '<tr><td colspan="3"><div class="focc-sh-empty">No table data.</div></td></tr>';

    root.innerHTML = `
      <div class="section">
        <div class="section-head">
          <h3>Web Status</h3>
          <span class="eyebrow">SuperAdmin · read-only</span>
        </div>
        <div class="section-body">
          <div class="focc-sh-top">
            <div class="focc-sh-banner">
              <span class="focc-sh-dot ${dot}"></span>
              <div>
                <div class="focc-sh-statustext">${escapeHtml(health)}</div>
                <div class="focc-sh-stamp">Last check ${escapeHtml(fmtClock(data.checkedAt))} · Round trip ${Number(ms || 0)} ms · DB query ${Number(p.dbMs || 0)} ms</div>
              </div>
            </div>
            <button class="btn primary" id="shRefresh">Refresh Check</button>
          </div>
          <div class="focc-sh-tech">
            <span>Database ${escapeHtml(fmtBytes(dbUsed))} / ${escapeHtml(fmtBytes(dbLimit))}</span>
            <span>Storage ${escapeHtml(fmtBytes(used))} / ${escapeHtml(fmtBytes(limit))}</span>
            <span>Auth: OK</span>
            <span>${Number(p.activeToday || 0)} active today</span>
            <span>${Number(p.silentCount || 0)} silent</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Storage &amp; Database</h3>
          <span class="eyebrow">${escapeHtml(p.storageLimitLabel || ('Storage limit: ' + fmtBytes(limit)))}</span>
        </div>
        <div class="section-body">
          <div class="focc-sh-cards">
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Storage Used</div>
              <div class="focc-sh-card-value">${escapeHtml(fmtBytes(used))}</div>
              <div class="focc-sh-card-sub">of ${escapeHtml(fmtBytes(limit))} · ${storage.txt}%</div>
              <div class="focc-sh-bar"><span style="width:${Math.min(100, Math.max(0.6, storage.n))}%"></span></div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Database Used</div>
              <div class="focc-sh-card-value">${escapeHtml(fmtBytes(dbUsed))}</div>
              <div class="focc-sh-card-sub">of ${escapeHtml(fmtBytes(dbLimit))} · ${db.txt}%</div>
              <div class="focc-sh-bar"><span style="width:${Math.min(100, Math.max(0.6, db.n))}%"></span></div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Uploaded Files</div>
              <div class="focc-sh-card-value">${Number(p.totalFiles || 0)}</div>
              <div class="focc-sh-card-sub">${Number(p.companiesWithFiles || 0)} of ${Number(p.companyCount || 0)} companies have documents</div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Largest Company</div>
              <div class="focc-sh-card-value" style="font-size:20px;">${escapeHtml(largest ? String(largest.companyName || largest.companyId) : '—')}</div>
              <div class="focc-sh-card-sub">${largest ? escapeHtml(fmtBytes(largest.storageBytes)) : 'No documents yet'}</div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Speed</div>
              <div class="focc-sh-card-value">${Number(ms || 0)} ms</div>
              <div class="focc-sh-card-sub">Round trip from this browser · database part ${Number(p.dbMs || 0)} ms</div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Storage Trend</div>
              <div class="focc-sh-card-value" style="font-size:20px;">${escapeHtml(trend.value)}</div>
              <div class="focc-sh-card-sub">${escapeHtml(trend.sub)}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Largest Tables</h3>
          <span class="eyebrow">Live from Postgres · biggest first</span>
        </div>
        <div class="section-body">
          <div class="tablewrap">
            <table class="datatable">
              <thead><tr><th>Schema</th><th>Table</th><th>Size</th></tr></thead>
              <tbody>${topRowsHtml}</tbody>
            </table>
          </div>
          <div class="settings-note" style="margin-top:12px;">
            <code>auth.*</code>, <code>storage.*</code> and <code>realtime.*</code> are Supabase's own tables —
            they still count toward the database quota. <code>public.*</code> are this app's tables.
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Company Activity &amp; Usage</h3>
          <span class="eyebrow">24-hour rolling window · silent companies first</span>
        </div>
        <div class="section-body">
          <div class="tablewrap">
            <table class="datatable">
              <thead><tr>
                <th>Company</th><th>Activity (24h)</th><th>Last sign-in</th>
                <th>Data changed</th><th>Last upload</th><th>Storage</th><th>Files</th>
              </tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
          <div class="settings-note" style="margin-top:12px;">
            "Last sign-in" only means a staff member signed in successfully — it is not proof they use the system.
            Every figure is computed live from Supabase each time this page opens; nothing is stored on the server.
            The storage trend above is kept only in this browser.
          </div>
        </div>
      </div>
    `;

    const btn = root.querySelector('#shRefresh');
    if (btn) btn.addEventListener('click', load);
  }

  async function load(){
    if (busy) return;
    busy = true;
    root.innerHTML = '<div class="focc-sh-empty">Loading system health…</div>';
    const t0 = performance.now();
    try{
      const res = await adminInvoke('system_health');
      render(res && res.data ? res.data : {}, Math.round(performance.now() - t0));
    }catch(err){
      root.innerHTML = '<div class="settings-note" style="margin-top:0;color:var(--red);">'
        + 'Failed to load system health: ' + escapeHtml(String(err && err.message || err)) + '</div>';
    }
    busy = false;
  }

  await load();
  return wrap;
}

/* =========================================================================
   MODULE SKELETON PAGES
   ========================================================================= */

function skelSvg(paths, size){
  const s = size || 30;
  return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const SKEL_ICON_EMPTY = skelSvg('<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 9h18"></path><path d="M8 14h8"></path>', 34);
const SKEL_ICON_CHART = skelSvg('<path d="M4 19V9"></path><path d="M10 19V5"></path><path d="M16 19v-7"></path><path d="M20 19H4"></path>', 32);

const SKELETON_MODULES = {
  tipperOpsDashboard: {
    title:'Tipper Operations Dashboard', crumb:'Tipper Operations',
    description:'Fleet-wide view of tipper truck activity, utilization and daily trip performance.',
    kpis:[
      {label:'Active Tippers', note:'On the road today'},
      {label:'Trips Completed', note:'Today'},
      {label:'Fleet Utilization', note:'Active vs total fleet'},
      {label:'Avg Turnaround Time', note:'Load to unload'},
    ],
    statusOptions:['Loading','In Transit','Unloading','Idle','Under Maintenance'],
    tableColumns:['Date','Truck No.','Driver','Route','Load (MT)','Status'],
    chartLabel:'Trips Trend (Last 30 Days)',
  },
  containerOpsDashboard: {
    title:'Container Operations Dashboard', crumb:'Container Operations',
    description:'Container movement, yard utilization and vessel schedule overview.',
    kpis:[
      {label:'Active Containers', note:'Currently in yard'},
      {label:'TEU Moved', note:'Today'},
      {label:'Yard Utilization', note:'Occupied vs capacity'},
      {label:'On-Time Delivery Rate', note:'Last 30 days'},
    ],
    statusOptions:['In Yard','Loading','In Transit','Delivered','Empty Return'],
    tableColumns:['Date','Container No.','Vessel','Yard Location','ETA','Status'],
    chartLabel:'TEU Volume Trend (Last 30 Days)',
  },
  tankerOpsDashboard: {
    title:'Tanker Operations Dashboard', crumb:'Tanker Operations',
    description:'Tanker fleet activity, product volumes and delivery status at a glance.',
    kpis:[
      {label:'Active Tankers', note:'On the road today'},
      {label:'Volume Delivered', note:'Litres, today'},
      {label:'Compartment Utilization', note:'Avg across fleet'},
      {label:'Safety Incidents', note:'This month'},
    ],
    statusOptions:['Loading','In Transit','Discharging','Idle','Under Maintenance'],
    tableColumns:['Date','Tanker No.','Product','Volume (L)','Route','Status'],
    chartLabel:'Volume Delivered Trend (Last 30 Days)',
  },
  logisticsDistributionDashboard: {
    title:'Logistics & Distribution Dashboard', crumb:'Logistics & Distribution',
    description:'Cross-fleet distribution performance, delivery volumes and cost overview.',
    kpis:[
      {label:'Total Deliveries', note:'This month'},
      {label:'On-Time Rate', note:'Last 30 days'},
      {label:'Fleet Utilization', note:'All vehicle types'},
      {label:'Distribution Cost', note:'This month'},
    ],
    statusOptions:['Scheduled','Dispatched','In Transit','Delivered','Delayed'],
    tableColumns:['Date','Order No.','Origin','Destination','Carrier','Status'],
    chartLabel:'Delivery Volume Trend (Last 30 Days)',
  },
  orderPlanning: {
    title:'Order Planning', crumb:'Planning',
    description:'Plan, schedule and allocate customer orders ahead of dispatch.',
    kpis:[
      {label:'Open Orders', note:'Awaiting allocation'},
      {label:'Scheduled Today', note:'Ready for dispatch'},
      {label:'Pending Allocation', note:'Needs vehicle/driver'},
      {label:'Fulfillment Rate', note:'Last 30 days'},
    ],
    statusOptions:['New','Scheduled','Allocated','Fulfilled','Cancelled'],
    tableColumns:['Order No.','Customer','Product','Qty','Requested Date','Status'],
  },
  routePlanning: {
    title:'Route Planning', crumb:'Planning',
    description:'Design and manage delivery routes, distances and vehicle assignments.',
    kpis:[
      {label:'Active Routes', note:'Currently in use'},
      {label:'Avg Distance', note:'Per route, km'},
      {label:'Avg Route Time', note:'Per route'},
      {label:'Optimization Savings', note:'This month'},
    ],
    statusOptions:['Draft','Active','Under Review','Archived'],
    tableColumns:['Route No.','Origin','Destination','Distance (km)','Assigned Vehicle','Status'],
    chartLabel:'Route Efficiency Overview',
  },
  deliveryPlanning: {
    title:'Delivery Planning', crumb:'Planning',
    description:'Coordinate delivery schedules, driver assignments and ETAs.',
    kpis:[
      {label:'Deliveries Planned', note:'Today'},
      {label:'Deliveries Completed', note:'Today'},
      {label:'Delayed Deliveries', note:'Today'},
      {label:'On-Time Rate', note:'Last 30 days'},
    ],
    statusOptions:['Planned','Dispatched','In Transit','Completed','Delayed'],
    tableColumns:['Delivery No.','Order No.','Driver','Vehicle','ETA','Status'],
  },
  podManagement: {
    title:'POD Management', crumb:'Delivery',
    description:'Track, verify and manage proof-of-delivery documents.',
    kpis:[
      {label:'Total PODs', note:'This month'},
      {label:'Pending Verification', note:'Awaiting review'},
      {label:'Verified PODs', note:'This month'},
      {label:'Rejected PODs', note:'This month'},
    ],
    statusOptions:['Pending','Verified','Rejected','Resubmitted'],
    tableColumns:['POD No.','Order No.','Delivery Date','Received By','Verification Status'],
  },
  jisa: {
    title:'JISA', crumb:'Safety & Compliance',
    description:'Job Inspection Safety Analysis records and review status.',
    kpis:[
      {label:'Total JISA Records', note:'All time'},
      {label:'Completed', note:'This month'},
      {label:'Pending Review', note:'Awaiting sign-off'},
      {label:'Overdue', note:'Past due date'},
    ],
    statusOptions:['Draft','Pending Review','Approved','Overdue'],
    tableColumns:['JISA No.','Task / Job','Location','Assessed By','Date','Status'],
  },
  hirarc: {
    title:'HIRARC', crumb:'Safety & Compliance',
    description:'Hazard Identification, Risk Assessment & Risk Control register.',
    kpis:[
      {label:'Total Assessments', note:'All time'},
      {label:'High Risk Items', note:'Currently open'},
      {label:'Under Review', note:'Awaiting sign-off'},
      {label:'Closed', note:'This month'},
    ],
    statusOptions:['Open','Under Review','Control In Place','Closed'],
    tableColumns:['HIRARC No.','Activity','Hazard','Risk Rating','Control Measures','Status'],
  },
  apadKnowledgeCenter: {
    title:'APAD Knowledge Center', crumb:'Knowledge Center',
    description:'Central library for APAD procedures, guidelines and reference documents.',
    kpis:[
      {label:'Total Documents', note:'Published'},
      {label:'Categories', note:'Active'},
      {label:'Recently Updated', note:'Last 30 days'},
      {label:'Pending Approval', note:'Awaiting review'},
    ],
    statusOptions:['Published','Draft','Under Review','Archived'],
    tableColumns:['Document Title','Category','Version','Last Updated','Status'],
    searchPlaceholder:'Search documents...',
    dateLabel:'Last Updated',
  },
  invoiceManagement: {
    title:'Invoice Management', crumb:'Finance',
    description:'Track invoices, payment status and outstanding balances.',
    kpis:[
      {label:'Total Invoices', note:'This month'},
      {label:'Outstanding Amount', note:'Unpaid'},
      {label:'Overdue Invoices', note:'Past due date'},
      {label:'Paid This Month', note:'Settled'},
    ],
    statusOptions:['Draft','Sent','Paid','Overdue','Cancelled'],
    tableColumns:['Invoice No.','Vendor / Customer','Amount','Due Date','Status'],
  },
  vendorManagement: {
    title:'Vendor Management', crumb:'Finance',
    description:'Manage vendor records, onboarding status and performance.',
    kpis:[
      {label:'Total Vendors', note:'Registered'},
      {label:'Active Vendors', note:'Currently engaged'},
      {label:'Pending Approval', note:'Awaiting onboarding'},
      {label:'Avg Rating', note:'Last 12 months'},
    ],
    statusOptions:['Active','Pending Approval','Suspended','Inactive'],
    tableColumns:['Vendor Name','Category','Contact','Onboarded Date','Status'],
    searchPlaceholder:'Search vendors...',
    dateLabel:'Onboarded Date',
  },
  pettyCash: {
    title:'Petty Cash', crumb:'Finance',
    description:'Track petty cash claims, approvals and reimbursements.',
    kpis:[
      {label:'Petty Cash Balance', note:'Current'},
      {label:'Claims This Month', note:'Submitted'},
      {label:'Pending Approval', note:'Awaiting sign-off'},
      {label:'Reimbursed Amount', note:'This month'},
    ],
    statusOptions:['Submitted','Pending Approval','Approved','Reimbursed','Rejected'],
    tableColumns:['Date','Requested By','Description','Amount','Status'],
    searchPlaceholder:'Search claims...',
  },
  tipperOperationKPI: {
    title: 'Tipper Operation KPI',
    crumb: 'Tipper Operations',
    description: 'Operational performance overview for the tipper fleet.',
    kpis: [
      { label: 'Daily Trips', note: 'Today' },
      { label: 'Fleet Running', note: 'Active now' },
      { label: 'Fleet Availability', note: 'Available vs total' },
      { label: 'Revenue', note: 'Today' },
    ],
    statusOptions: ['Running','Idle','Under Maintenance','Off Duty'],
    tableColumns: ['Date','Vehicle No','Driver','Destination','Trips','Tonnage','Revenue'],
    chartLabel: 'Tipper Trips & Revenue Trend',
  },
  tipperDriverKPI: {
    title: 'Tipper Driver KPI',
    crumb: 'Tipper Operations',
    description: 'Driver performance monitoring for tipper operations.',
    kpis: [
      { label: 'Driver Attendance', note: 'Today' },
      { label: 'Trips Completed', note: 'Today' },
      { label: 'Revenue Generated', note: 'Today' },
      { label: 'Safety Score', note: '30 Days' },
    ],
    statusOptions: ['Present','Absent','On Leave','Suspended'],
    tableColumns: ['Driver','Attendance','Trips','Revenue','Violations','KPI Score'],
    chartLabel: 'Driver Performance Trend',
  },
  containerOperationKPI: {
    title: 'Container Operation KPI',
    crumb: 'Container Operations',
    description: 'Operational performance overview for container operations.',
    kpis: [
      { label: 'Containers Delivered', note: 'Today' },
      { label: 'Fleet Running', note: 'Active now' },
      { label: 'Fleet Availability', note: 'Available vs total' },
      { label: 'Revenue', note: 'Today' },
    ],
    statusOptions: ['Running','Idle','Under Maintenance','Off Duty'],
    tableColumns: ['Date','Vehicle','Driver','Customer','Containers','Revenue'],
    chartLabel: 'Container Deliveries Trend',
  },
  containerDriverKPI: {
    title: 'Container Driver KPI',
    crumb: 'Container Operations',
    description: 'Driver performance monitoring for container operations.',
    kpis: [
      { label: 'Attendance', note: 'Today' },
      { label: 'Containers Delivered', note: 'Today' },
      { label: 'Revenue', note: 'Today' },
      { label: 'Safety Score', note: '30 Days' },
    ],
    statusOptions: ['Present','Absent','On Leave','Suspended'],
    tableColumns: ['Driver','Attendance','Deliveries','Revenue','Violations'],
    chartLabel: 'Driver Performance Trend',
  },
  tankerOperationKPI: {
    title: 'Tanker Operation KPI',
    crumb: 'Tanker Operations',
    description: 'Operational performance overview for tanker operations.',
    kpis: [
      { label: 'Loads Delivered', note: 'Today' },
      { label: 'Fleet Running', note: 'Active now' },
      { label: 'Fleet Availability', note: 'Available vs total' },
      { label: 'Revenue', note: 'Today' },
    ],
    statusOptions: ['Running','Idle','Under Maintenance','Off Duty'],
    tableColumns: ['Date','Vehicle','Driver','Product','Destination','Loads','Revenue'],
    chartLabel: 'Tanker Loads Trend',
  },
  tankerDriverKPI: {
    title: 'Tanker Driver KPI',
    crumb: 'Tanker Operations',
    description: 'Driver performance monitoring for tanker operations.',
    kpis: [
      { label: 'Attendance', note: 'Today' },
      { label: 'Loads Delivered', note: 'Today' },
      { label: 'Revenue', note: 'Today' },
      { label: 'Safety Score', note: '30 Days' },
    ],
    statusOptions: ['Present','Absent','On Leave','Suspended'],
    tableColumns: ['Driver','Attendance','Loads','Revenue','Violations'],
    chartLabel: 'Driver Performance Trend',
  },
};

function renderModuleSkeleton(moduleKey){
  const cfg = SKELETON_MODULES[moduleKey];
  const searchPlaceholder = cfg.searchPlaceholder || 'Search records...';
  const dateLabel = cfg.dateLabel || 'Date Range';

  const wrap = document.createElement('div');
  wrap.className = 'skel-page';
  wrap.innerHTML = `
    <div class="skel-intro">
      <div class="skel-intro-text">
        <div class="skel-crumbs">
          <span>${cfg.crumb}</span><span class="sep">/</span><span class="current">${cfg.title}</span>
        </div>
        <p>${cfg.description}</p>
      </div>
      <span class="skel-badge">Skeleton &middot; In Development</span>
    </div>

    <div class="kpirow">
      ${cfg.kpis.map(k => kpiCard({label:k.label, value:'&mdash;', note:k.note})).join('')}
    </div>

    <div class="section">
      <div class="section-head">
        <h3>Filters</h3>
        <span class="spacer"></span>
      </div>
      <div class="section-body">
        <div class="skel-filterbar">
          <input class="searchbox" type="text" placeholder="${searchPlaceholder}" disabled>
          <input class="skel-date" type="date" aria-label="${dateLabel}" disabled>
          <select class="skel-select" aria-label="Status" disabled>
            <option>All Statuses</option>
            ${cfg.statusOptions.map(s => `<option>${s}</option>`).join('')}
          </select>
          <button class="btn" disabled>Apply Filters</button>
        </div>
      </div>
    </div>

    <div class="skel-main-grid">
      <div class="section">
        <div class="section-head">
          <h3>Records</h3>
          <span class="eyebrow">0 records</span>
        </div>
        <div class="section-body skel-table-placeholder">
          <div class="tablewrap">
            <table class="datatable">
              <thead><tr>${cfg.tableColumns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
              <tbody></tbody>
            </table>
          </div>
          <div class="skel-empty">
            ${SKEL_ICON_EMPTY}
            <div class="skel-empty-title">No Data Available</div>
            <div class="skel-empty-sub">Records will appear here once this module is connected to live data.</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Overview</h3>
        </div>
        <div class="section-body">
          <div class="skel-chart-placeholder">
            ${SKEL_ICON_CHART}
            <span>${cfg.chartLabel || 'Chart placeholder'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  return wrap;
}