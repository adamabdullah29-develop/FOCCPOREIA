/* =========================================================================
   BAHAGIAN B — User Manager + Company Manager + form modals
   ========================================================================= */

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