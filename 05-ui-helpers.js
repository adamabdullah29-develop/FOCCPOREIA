/* =========================================================================
   FOCC — 05-ui-helpers.js
   Table engine, modal helpers, picker, combo fields.
   ========================================================================= */

/* ============================================================
   BAHAGIAN A — TABLE ENGINE
============================================================= */

/* Susunan paparan: Branch A→Z, kemudian kolum pertama table.
   Auto untuk MANA-MANA table yang ada kolum 'branch' — termasuk page baharu.
   DISPLAY-ONLY: DATA_CACHE & idx asal TIDAK diubah. */
function branchSortRows(tableKey, rows, opts){
  opts = opts || {};
  if (opts.noAutoSort) return rows;
  const cols = (TABLES[tableKey] && TABLES[tableKey].columns) || [];
  const field = opts.sortField || (cols.some(c => c.id === 'branch') ? 'branch' : '');
  if (!field) return rows;

  const blank = v => !String(v ?? '').trim();
  const norm  = v => String(v ?? '').trim();
  const cmp   = (a, b) => norm(a).localeCompare(norm(b), undefined, { numeric:true, sensitivity:'base' });
  const sub   = opts.subSortField || (cols[0] && cols[0].id) || '';

  return rows.slice().sort((A, B) => {
    const ab = blank(A.row[field]), bb = blank(B.row[field]);
    if (ab !== bb) return ab ? 1 : -1;
    const c = cmp(A.row[field], B.row[field]);
    if (c) return c;
    if (sub && sub !== field) return cmp(A.row[sub], B.row[sub]);
    return 0;
  });
}

function buildTableHTML(tableKey, data, filterText, opts){
  opts = opts || {};
  const def = TABLES[tableKey];
  const cols = opts.visibleColumnIds
    ? opts.visibleColumnIds.map(id => def.columns.find(c => c.id === id)).filter(Boolean)
    : def.columns;
  const term = (filterText || '').toLowerCase();
  const showEditButton = opts.showEditButton !== false;
  const showDeleteButton = opts.showDeleteButton !== false;
  const extraRowAction = opts.extraRowAction || null;
  const showRowActions = showEditButton || showDeleteButton || !!extraRowAction;

  let rows = data.map((row, idx) => ({row, idx}));
  if (opts.rowFilterFn) rows = rows.filter(({row}) => opts.rowFilterFn(row));

  if (term.startsWith('__ach_range__')){
    const parts = term.replace('__ach_range__','').split('_');
    const min = parts[0] === '' ? -Infinity : parseFloat(parts[0]);
    const max = parts[1] === '' ? Infinity : parseFloat(parts[1]);
    rows = rows.filter(({row}) => {
      const a = parseFloat(row.achievement || 0) || 0;
      return a >= min && a < max;
    });
  } else {
    rows = rows.filter(({row}) => !term || Object.values(row).some(v => (v ?? '').toString().toLowerCase().includes(term)));
  }

  rows = branchSortRows(tableKey, rows, opts);

  let html = `<div class="tablewrap"><table class="datatable" data-table="${tableKey}"><thead><tr>`;
  cols.forEach(c => html += `<th>${c.label}</th>`);
  html += `${showRowActions ? '<th></th>' : ''}</tr></thead><tbody>`;

  rows.forEach(({row, idx}) => {
    html += `<tr data-idx="${idx}">`;
    cols.forEach(c => {
      const raw = row[c.id] ?? '';
      const disp = cellDisplay(c, raw, row);
      const inner = (opts.linkColumnId && c.id === opts.linkColumnId)
        ? `<span class="celllink" data-idx="${idx}">${disp}</span>`
        : disp;
      html += `<td data-col="${c.id}" data-type="${c.type}" data-raw="${(raw+'').replace(/"/g,'&quot;')}">${inner}</td>`;
    });
    if (showRowActions){
      html += `<td class="row-actions"><div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">
        ${extraRowAction ? `<button class="btn rowextra" data-idx="${idx}" title="${escapeHtml(extraRowAction.title || '')}" aria-label="${escapeHtml(extraRowAction.title || '')}">
          ${extraRowAction.icon || ''}
        </button>` : ''}
        ${showEditButton ? `<button class="btn rowedit" data-idx="${idx}" title="Edit row" aria-label="Edit">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
        </button>` : ''}
        ${showDeleteButton ? `<button class="btn rowdel" data-idx="${idx}" title="Delete row" aria-label="Delete">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z" fill="currentColor"/><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
        </button>` : ''}
      </div></td>`;
    }
    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  return html;
}

function parseEditedValue(col, text){
  text = text.trim();
  if (col.type === 'number' || col.type === 'money'){
    const n = parseFloat(text.replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? '' : n;
  }
  if (col.type === 'pct'){
    const n = parseFloat(text.replace(/[^0-9.\-]/g, ''));
    if (isNaN(n)) return '';
    return n > 1 ? n / 100 : n;
  }
  return text;
}

/* =============================================================
   PADAM FAIL STORAGE IKUT REKOD
   ============================================================= */
function foccCollectStoragePaths(value, out){
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)){ value.forEach(v => foccCollectStoragePaths(v, out)); return; }
  if (typeof value.storagePath === 'string' && value.storagePath.trim()){
    out.add(value.storagePath.trim());
  }
  Object.values(value).forEach(v => foccCollectStoragePaths(v, out));
}

async function foccPurgeRowStorage(row){
  const candidates = new Set();
  foccCollectStoragePaths(row, candidates);
  if (!candidates.size) return;

  const companyId = await SupabaseProvider.getCompanyId();
  const res = await FOCC_SUPABASE
    .from('tenant_tables')
    .select('payload')
    .eq('company_id', companyId);
  if (res.error) throw res.error;

  const stillUsed = new Set();
  (res.data || []).forEach(t => foccCollectStoragePaths(t.payload, stillUsed));

  const paths = [...candidates].filter(p => p.startsWith(companyId + '/') && !stillUsed.has(p));
  if (!paths.length) return;

  const del = await FOCC_SUPABASE.storage.from('focc-documents').remove(paths);
  if (del.error) throw del.error;
}

function wireTable(container, tableKey, getFilterText, opts){
  container.addEventListener('click', async (e) => {
    const cellLink = e.target.closest('.celllink');
    if (cellLink && container.contains(cellLink) && opts && opts.onLinkClick){
      await opts.onLinkClick(parseInt(cellLink.dataset.idx, 10));
      return;
    }
    const extraBtn = e.target.closest('.rowextra');
    if (extraBtn && container.contains(extraBtn)){
      const idx = parseInt(extraBtn.dataset.idx, 10);
      if (opts && opts.onExtraRowAction) await opts.onExtraRowAction(idx);
      return;
    }

    const editBtn = e.target.closest('.rowedit');
    if (editBtn && container.contains(editBtn)){
      const idx = parseInt(editBtn.dataset.idx, 10);
      if (opts && opts.onEditRow){
        await opts.onEditRow(idx);
        return;
      }
      await openEditRowModal(tableKey, idx, async () => {
        await refreshTable(container, tableKey, getFilterText ? getFilterText() : '', opts);
      });
      return;
    }

    const delBtn = e.target.closest('.rowdel');
    if (delBtn && container.contains(delBtn)){
      const idx = parseInt(delBtn.dataset.idx, 10);
      if (opts && opts.onDeleteRow){
        await opts.onDeleteRow(idx);
        return;
      }
      const data = await getData(tableKey);
      if (!confirm('Delete this row?')) return;
      const deletedRow = data[idx];
      data.splice(idx, 1);
      await persist(tableKey);
      try{ await foccPurgeRowStorage(deletedRow); }
      catch(e){ console.error('Row deleted, but Storage cleanup failed:', e); }
      await refreshTable(container, tableKey, getFilterText ? getFilterText() : '', opts);
      if (opts && typeof opts.onAfterDelete === 'function') await opts.onAfterDelete();
      return;
    }

    const row = e.target.closest('tbody tr[data-idx]');
    if (row && container.contains(row) && opts && opts.onRowClick){
      await opts.onRowClick(parseInt(row.dataset.idx, 10));
    }
  });
}

async function refreshTable(container, tableKey, filterText, opts){
  const data = await getData(tableKey);
  container.innerHTML = buildTableHTML(tableKey, data, filterText, opts);
}

/* ============================================================
   renderDataPage — full data page
============================================================= */
async function renderDataPage(tableKey, opts){
  opts = opts || {};
  const def = TABLES[tableKey];
  const data = await getData(tableKey);

  const filterFields = opts.filterFields || [];
  const filterState = {};
  const filterChoices = {};
  filterFields.forEach(fid => {
    const set = new Set();
    data.forEach(r => { const v = String(r[fid] ?? '').trim(); if (v) set.add(v); });
    filterChoices[fid] = [...set].sort((a,b) => a.localeCompare(b));
  });
  const baseOptions = opts.tableOptions || {};
  const baseRowFilter = baseOptions.rowFilterFn || null;
  const tableOptions = {...baseOptions};
  if (filterFields.length){
    tableOptions.rowFilterFn = row => {
      if (baseRowFilter && !baseRowFilter(row)) return false;
      return filterFields.every(fid => {
        const want = filterState[fid];
        return !want || String(row[fid] ?? '') === want;
      });
    };
  }

  const wrap = document.createElement('div');
  if (opts.wrapperClass) wrap.classList.add(opts.wrapperClass);
  wrap.innerHTML = `
    ${opts.note ? `<div class="notice notice-info">&#9432;&nbsp; ${opts.note}</div>` : ''}
    ${opts.beforeSectionHtml || ''}
    <div class="section">
      <div class="section-head">
        <span class="eyebrow">${data.length} records</span>
        <div class="spacer"></div>
        <span class="savechip" id="savechip">&#10003; saved</span>
      </div>
      <div class="section-body">
        <div class="toolbar">
          <input class="searchbox" type="text" placeholder="Search ${def.label.toLowerCase()}...">
          ${filterFields.map(fid => {
            const colDef = def.columns.find(c => c.id === fid);
            const lbl = colDef ? colDef.label : fid;
            return `<span class="tblfilter-wrap">
              <span class="tblfilter-lbl">${escapeHtml(lbl)}:</span>
              <button type="button" class="tblfilter-btn" data-tblfilter-btn="${fid}" aria-haspopup="listbox" aria-expanded="false">
                <span class="tblfilter-val" data-tblfilter-val="${fid}">All</span>
                <svg class="tblfilter-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <div class="tblfilter-panel" data-tblfilter-panel="${fid}" role="listbox"></div>
            </span>`;
          }).join('')}
          <div class="toolbar-actions" style="display:flex;gap:8px;align-items:center">

            ${opts.readOnly ? '' : `
            <button class="btn primary" id="addRowBtn">+ <span class="lbl-full">Add Row</span><span class="lbl-short">Add</span></button>
            <button class="btn" id="importBtn"><span class="lbl-full">Import Data</span><span class="lbl-short">Import</span></button>
            <button class="btn" id="undoBtn" disabled><span class="lbl-full">Undo Import</span><span class="lbl-short">Undo</span></button>
            <input type="file" id="importFile" accept=".csv" style="display:none">
            `}
            <button class="btn" id="exportBtn"><span class="lbl-full">Export Data</span><span class="lbl-short">Export</span></button>
            ${opts.showComplianceAlertButton ? `<button class="btn" id="complianceAlertBtn"><span class="lbl-full">Compliance Alert</span><span class="lbl-short">Alert</span></button>` : ''}
          </div>
        </div>
        <div id="tableHost"></div>
      </div>
    </div>
  `;
  const tableHost = wrap.querySelector('#tableHost');
  const search = wrap.querySelector('.searchbox');
  const pageOpts = (typeof tableOptions !== 'undefined') ? tableOptions : (opts.tableOptions || {});
  function updateEyebrow(){
    const all = DATA_CACHE[tableKey] || [];
    let cnt = all.length;
    if (pageOpts && typeof pageOpts.rowFilterFn === 'function'){
      cnt = all.filter(pageOpts.rowFilterFn).length;
    }
    const pill = wrap.querySelector('.eyebrow');
    if (pill) pill.textContent = `${cnt} records`;
  }
  tableHost.innerHTML = buildTableHTML(tableKey, data, '', pageOpts);
  wireTable(tableHost, tableKey, () => search.value, Object.assign({}, pageOpts, { onAfterDelete: updateEyebrow }));

  search.addEventListener('input', () => refreshTable(tableHost, tableKey, search.value, tableOptions));

  function optionRowHTML(fid, val, label){
    const isActive = (filterState[fid] || '') === val;
    return `<div class="tblfilter-option${isActive ? ' is-active' : ''}" data-value="${val.replace(/"/g,'&quot;')}" role="option">
      <span>${escapeHtml(label)}</span>
      <svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    </div>`;
  }
  function renderFilterPanel(fid){
    const panel = wrap.querySelector(`[data-tblfilter-panel="${fid}"]`);
    const valEl = wrap.querySelector(`[data-tblfilter-val="${fid}"]`);
    if (!panel) return;
    const all = DATA_CACHE[tableKey] || [];
    const vals = [...new Set(all.map(r => String(r[fid] ?? '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    if (filterState[fid] && !vals.includes(filterState[fid])) filterState[fid] = '';
    const keep = filterState[fid] || '';
    let html = optionRowHTML(fid, '', 'All');
    html += vals.map(v => optionRowHTML(fid, v, v)).join('');
    panel.innerHTML = html;
    if (valEl) valEl.textContent = keep || 'All';
    panel.querySelectorAll('.tblfilter-option').forEach(row => {
      row.addEventListener('click', async () => {
        const v = row.dataset.value || '';
        filterState[fid] = v;
        if (valEl) valEl.textContent = v || 'All';
        panel.classList.remove('open');
        const btn = wrap.querySelector(`[data-tblfilter-btn="${fid}"]`);
        if (btn) btn.setAttribute('aria-expanded','false');
        await refreshTable(tableHost, tableKey, search.value, tableOptions);
        const all2 = DATA_CACHE[tableKey] || [];
        const active = filterFields.some(f => filterState[f]);
        const cnt = active ? all2.filter(tableOptions.rowFilterFn).length : all2.length;
        const pill = wrap.querySelector('.eyebrow');
        if (pill) pill.textContent = `${cnt} records`;
      });
    });
  }
  function closeAllFilterPanels(){
    wrap.querySelectorAll('.tblfilter-panel.open').forEach(p => {
      p.classList.remove('open');
      const b = wrap.querySelector(`[data-tblfilter-btn="${p.dataset.tblfilterPanel}"]`);
      if (b) b.setAttribute('aria-expanded','false');
    });
  }
  if (!window.__tblfilterGlobalBound){
    window.__tblfilterGlobalBound = true;
    document.addEventListener('click', (e) => {
      const insideWrap = e.target.closest('.tblfilter-wrap');
      document.querySelectorAll('.tblfilter-panel.open').forEach(p => {
        if (insideWrap && p.closest('.tblfilter-wrap') === insideWrap) return;
        p.classList.remove('open');
        const b = p.parentElement && p.parentElement.querySelector('[data-tblfilter-btn]');
        if (b) b.setAttribute('aria-expanded','false');
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape'){
        document.querySelectorAll('.tblfilter-panel.open').forEach(p => {
          p.classList.remove('open');
          const b = p.parentElement && p.parentElement.querySelector('[data-tblfilter-btn]');
          if (b) b.setAttribute('aria-expanded','false');
        });
      }
    });
  }
  filterFields.forEach(fid => {
    const btn = wrap.querySelector(`[data-tblfilter-btn="${fid}"]`);
    const panel = wrap.querySelector(`[data-tblfilter-panel="${fid}"]`);
    if (!btn || !panel) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = panel.classList.contains('open');
      closeAllFilterPanels();
      if (!isOpen){
        renderFilterPanel(fid);
        panel.classList.add('open');
        btn.setAttribute('aria-expanded','true');
      }
    });
  });

  wrap.querySelector('#addRowBtn')?.addEventListener('click', () => {
    if (opts.onAddRow) return opts.onAddRow();
    return openAddRowModal(tableKey, async () => {
      await refreshTable(tableHost, tableKey, search.value, tableOptions);
      updateEyebrow();
    });
  });

  wrap.querySelector('#complianceAlertBtn')?.addEventListener('click', () => {
    if (opts.onComplianceAlert) return opts.onComplianceAlert();
  });

  function csvEscapeCell(v){
    if (v === null || v === undefined) return '';
    const s = (typeof v === 'string') ? v : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')){
      return '"' + s.replace(/"/g,'""') + '"';
    }
    return s;
  }
  function toCSV(rows, cols){
    const header = cols.map(c => c.id).join(',');
    const lines = [header];
    rows.forEach(r => {
      const line = cols.map(c => {
        let v = r[c.id];
        if (String(c.type || '').startsWith('computed-')){
          if (c.type === 'computed-whatsapp'){
            v = toWhatsAppLink(r.phone || '') || '';
          } else if (c.type === 'computed-tenure'){
            v = '';
            const s = r.dateHired ? new Date(r.dateHired + 'T00:00:00') : null;
            const e = r.resignationDate ? new Date(r.resignationDate + 'T00:00:00') : new Date();
            if (s && !isNaN(s.getTime()) && e && !isNaN(e.getTime()) && s <= e){
              let y = e.getFullYear() - s.getFullYear();
              let mo = e.getMonth() - s.getMonth();
              if (e.getDate() < s.getDate()) mo--;
              if (mo < 0){ y--; mo += 12; }
              v = (y + mo / 12).toFixed(2);
            }
          } else {
            const disp = cellDisplay(c, '', r);
            v = String(disp == null ? '' : disp)
                  .replace(/<[^>]*>/g, ' ')
                  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
                  .replace(/\s+/g, ' ').trim();
            if (v === '-') v = '';
          }
        }
        if (c.type === 'pct' && v !== undefined && v !== null && v !== ''){
          v = (Number(v) * 100).toFixed(2);
        }
        return csvEscapeCell(v);
      }).join(',');
      lines.push(line);
    });
    return lines.join('\n');
  }
  async function handleExport(){
    let data = await getData(tableKey);
    if (filterFields.some(f => filterState[f])) data = data.filter(r => tableOptions.rowFilterFn(r));
    const csv = toCSV(data, opts.exportColumns || def.columns);
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const y = now.getFullYear(); const m = String(now.getMonth()+1).padStart(2,'0'); const d = String(now.getDate()).padStart(2,'0');
    a.download = `${tableKey}-${y}${m}${d}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function parseCSV(text){
    const rows = [];
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (!lines.length) return rows;
    const headers = lines[0].split(',').map(h=>h.trim());
    for (let i=1;i<lines.length;i++){
      const line = lines[i];
      const cols = [];
      let cur = '', inQuotes = false;
      for (let chIdx=0; chIdx<line.length; chIdx++){
        const ch = line[chIdx];
        if (ch === '"'){
          if (inQuotes && line[chIdx+1] === '"'){ cur += '"'; chIdx++; }
          else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes){ cols.push(cur); cur = ''; }
        else cur += ch;
      }
      cols.push(cur);
      if (cols.length === headers.length){
        const obj = {};
        headers.forEach((h, idx) => obj[h] = cols[idx]);
        rows.push(obj);
      }
    }
    return {headers: lines[0].split(',').map(h=>h.trim()), rows };
  }

  const exportBtn = wrap.querySelector('#exportBtn');
  const importBtn = wrap.querySelector('#importBtn');
  const undoBtn = wrap.querySelector('#undoBtn');
  const importFile = wrap.querySelector('#importFile');
  exportBtn.addEventListener('click', handleExport);
  if (importBtn) importBtn.addEventListener('click', () => importFile.click());

  if (typeof IMPORT_BACKUPS === 'undefined') window.IMPORT_BACKUPS = {};

  function normalizeDateValue(raw){
    if (raw === undefined || raw === null) return '';
    let s = String(raw).trim();
    if (!s) return '';
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m){
      let day = parseInt(m[1], 10), month = parseInt(m[2], 10);
      const year = parseInt(m[3], 10);
      if (month > 12 && day <= 12){ const t = day; day = month; month = t; }
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31){
        return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      }
      return '';
    }
    if (/^\d{4,6}$/.test(s)){
      const serial = parseInt(s, 10);
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(epoch.getTime() + serial * 86400000);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return '';
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return toDateKeyUTC(parsed);
    return '';
  }
  function toDateKeyUTC(d){
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
  }

  importFile?.addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const txt = await f.text();
    const parsed = parseCSV(txt);
    if (!parsed || !parsed.rows) return alert('Failed to parse CSV');
    let unparsedDateCount = 0;
    const newData = parsed.rows.map(r => {
      const obj = {};
      def.columns.forEach(c => {
        const raw = r[c.id] !== undefined ? r[c.id] : '';
        let v = raw;
        if (c.type === 'number' || c.type === 'money'){
          const n = parseFloat(raw.replace(/[^0-9.\-]/g, ''));
          v = isNaN(n) ? '' : n;
        } else if (c.type === 'pct'){
          const n = parseFloat(raw.toString().replace(/[^0-9.\-]/g, ''));
          if (isNaN(n)) v = '';
          else v = (n > 1) ? (n/100) : n;
        } else if (c.type === 'date'){
          v = normalizeDateValue(raw);
          if (raw && !v) unparsedDateCount++;
        } else {
          v = raw;
        }
        obj[c.id] = v;
      });
      return obj;
    });
    newData.forEach(o => recalcImportedRowAutos(tableKey, o));
    if (unparsedDateCount > 0){
      if (!confirm(`${unparsedDateCount} row(s) have a Date value that could not be recognised and will be imported blank, which may hide them from date-based views. Continue importing the remaining ${newData.length - unparsedDateCount} row(s) normally anyway?`)) return;
    }
    if (!confirm(`Append ${newData.length} rows to existing data for ${def.label}?`)) return;

    const existing = await getData(tableKey) || [];
    window.IMPORT_BACKUPS[tableKey] = existing.map(r => ({...r}));
    if (undoBtn){
      undoBtn.disabled = false;
      const undoFull = undoBtn.querySelector('.lbl-full');
      const undoShort = undoBtn.querySelector('.lbl-short');
      if (undoFull) undoFull.textContent = `Undo Import (${newData.length} rows)`;
      if (undoShort) undoShort.textContent = `Undo (${newData.length})`;
      if (!undoFull && !undoShort) undoBtn.textContent = `Undo Import (${newData.length} rows)`;
    }

    DATA_CACHE[tableKey] = newData.concat(existing);
    await persist(tableKey);
    await refreshTable(tableHost, tableKey, search.value, tableOptions);
    wrap.querySelector('.eyebrow').textContent = `${(await getData(tableKey)).length} records`;
    importFile.value = '';
    alert('Import completed (appended)');
  });

  if (undoBtn){
    undoBtn.addEventListener('click', async () => {
      const backup = window.IMPORT_BACKUPS && window.IMPORT_BACKUPS[tableKey];
      if (!backup || !backup.length) return alert('No import to undo');
      if (!confirm(`Undo last import and restore previous ${def.label} data?`)) return;
      DATA_CACHE[tableKey] = backup.map(r => ({...r}));
      delete window.IMPORT_BACKUPS[tableKey];
      undoBtn.disabled = true;
      const undoFullR = undoBtn.querySelector('.lbl-full');
      const undoShortR = undoBtn.querySelector('.lbl-short');
      if (undoFullR) undoFullR.textContent = 'Undo Import';
      if (undoShortR) undoShortR.textContent = 'Undo';
      await persist(tableKey);
      await refreshTable(tableHost, tableKey, search.value, tableOptions);
      wrap.querySelector('.eyebrow').textContent = `${(await getData(tableKey)).length} records`;
      alert('Undo completed');
    });
  }

  return wrap;
}

/* =========================================================================
   BAHAGIAN B — Modal helpers, picker, combo fields
   ========================================================================= */

/* ============================================================
   OPTION LIST — load / save
============================================================= */
const FEG_SB_OPTION_TABLES = {
  assetRef     : 'fegAssetRefs',
  vendor       : 'fegVendors',
  disposalAudit: 'fegDisposalAudit',
};

function fegSbOptionTable(tableKey, fieldId){
  if (tableKey !== 'feg') return '';
  return FEG_SB_OPTION_TABLES[fieldId] || '';
}

async function fegSbOptionLoad(sbKey){
  let rows = [];
  try{ rows = await getData(sbKey); }catch(e){ rows = []; }
  if (Array.isArray(rows) && rows.length) return rows;
  try{
    const companyId = await SupabaseProvider.getCompanyId();
    const res = await FOCC_SUPABASE.from('tenant_tables')
      .select('table_key')
      .eq('company_id', companyId)
      .eq('table_key', sbKey)
      .maybeSingle();
    if (res.error) return Array.isArray(rows) ? rows : [];
    return res.data ? (Array.isArray(rows) ? rows : []) : null;
  }catch(e){ return Array.isArray(rows) ? rows : null; }
}

async function fegSbOptionSave(sbKey, list){
  const safe = Array.isArray(list) ? list.slice() : [];
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++){
    if (attempt > 0){
      try{ await SupabaseProvider.loadTable(sbKey); }catch(e){}
    }
    DATA_CACHE[sbKey] = safe.slice();
    try{ await persist(sbKey); return; }
    catch(e){ lastErr = e; }
  }
  throw lastErr || new Error('Save failed.');
}

async function loadOptionList(tableKey, fieldId){
  const sbKey = fegSbOptionTable(tableKey, fieldId);
  if (sbKey) return await fegSbOptionLoad(sbKey);

  const key = comboStorageKey(tableKey, fieldId);
  try{
    if (window.storage && typeof window.storage.get === 'function'){
      const res = await window.storage.get(key, false);
      if (res && res.value) return JSON.parse(res.value);
    }
    if (typeof localStorage !== 'undefined'){
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  }catch(e){ /* not found yet */ }
  return null;
}

async function saveOptionList(tableKey, fieldId, list){
  const sbKey = fegSbOptionTable(tableKey, fieldId);
  if (sbKey){ await fegSbOptionSave(sbKey, list); return; }

  const key = comboStorageKey(tableKey, fieldId);
  try{
    if (window.storage && typeof window.storage.set === 'function'){
      await window.storage.set(key, JSON.stringify(list), false);
    } else if (typeof localStorage !== 'undefined'){
      localStorage.setItem(key, JSON.stringify(list));
    }
  }catch(e){ console.error('save option list failed', e); }
}

/* ============================================================
   BUILD FORM FIELDS
============================================================= */
function buildComboField(c){
  return `<div class="formfield"><label>${c.label}</label>
    <div class="combo-wrap" data-combo-wrap="${c.id}">
      <input data-col="${c.id}" type="text" autocomplete="off" placeholder="Type new or pick existing...">
      <div class="combo-panel" data-combo-panel="${c.id}"></div>
    </div>
  </div>`;
}

function buildFixedPickerField(c){
  return `<div class="formfield"><label>${c.label}</label>
    <div class="fpick" data-fpick="${c.id}">
      <input data-col="${c.id}" type="text" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
      <span class="fpick-caret"></span>
      <div class="combo-panel fpick-panel" data-fpick-panel="${c.id}"></div>
    </div>
  </div>`;
}

/* ============================================================
   FIXED PICKER (generic)
============================================================= */
function wireFixedPicker(box, cfg){
  const fieldEl = box.querySelector(cfg.field);
  if (!fieldEl) return;
  const input = box.querySelector(cfg.input);
  const panel = box.querySelector(cfg.panel);
  if (!input || !panel) return;
  const esc = s => String(s).replace(/"/g, '&quot;');
  let values = (cfg.values || []).slice();
  const current = String(input.value || cfg.current || '').trim();
  if (current && !values.includes(current)) values = [current].concat(values);
  if (current) input.value = current;

  function render(){
    const cur = input.value;
    panel.innerHTML = values.length
      ? values.map(v =>
          `<div class="combo-item fpick-option${v === cur ? ' is-active' : ''}" data-value="${esc(v)}">
             <span class="combo-item-text">${v}</span>
           </div>`).join('')
      : '<div class="combo-empty">No options</div>';
    panel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        input.value = row.dataset.value || '';
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
}

function wireFixedPickerFields(box, tableKey, def){
  const fieldIds = FIXED_PICKER_FIELDS[tableKey];
  if (!fieldIds) return;
  fieldIds.forEach(fid => {
    const colDef = def.columns.find(c => c.id === fid);
    const inp = box.querySelector(`[data-col="${fid}"]`);
    if (!colDef || !inp) return;
    wireFixedPicker(box, {
      field: `[data-fpick="${fid}"]`,
      input: `[data-col="${fid}"]`,
      panel: `[data-fpick-panel="${fid}"]`,
      values: (colDef.options || []).slice(),
      current: inp.value || ''
    });
  });
}

/* ============================================================
   COMBO FIELDS (editable, persisted option list)
============================================================= */
async function wireComboFields(box, tableKey, def){
  const fieldIds = COMBO_OPTION_FIELDS[tableKey];
  if (!fieldIds) return;
  for (const fieldId of fieldIds){
    const wrap = box.querySelector(`[data-combo-wrap="${fieldId}"]`);
    if (!wrap) continue;
    const input = wrap.querySelector('input[data-col]');
    const panel = wrap.querySelector('[data-combo-panel]');
    const colDef = def.columns.find(c => c.id === fieldId);
    const fieldLabel = colDef ? colDef.label : fieldId;

    let options = await loadOptionList(tableKey, fieldId);
    if (options === null){
      options = (COMBO_DEFAULT_OPTIONS[tableKey] && COMBO_DEFAULT_OPTIONS[tableKey][fieldId]) || [];
      await saveOptionList(tableKey, fieldId, options);
    }

    function renderPanel(filterText){
      const term = (filterText || '').toLowerCase();
      const visible = term ? options.filter(o => o.toLowerCase().includes(term)) : options;
      if (!visible.length){
        panel.innerHTML = `<div class="combo-empty">No saved options yet</div>`;
        return;
      }
      panel.innerHTML = visible.map(o => `
        <div class="combo-item" data-value="${o.replace(/"/g,'&quot;')}">
          <span class="combo-item-text">${o}</span>
          <button type="button" class="combo-del" data-del="${o.replace(/"/g,'&quot;')}" title="Remove from list">&times;</button>
        </div>
      `).join('');
      panel.querySelectorAll('.combo-item').forEach(row => {
        row.querySelector('.combo-item-text').addEventListener('mousedown', (e) => {
          e.preventDefault();
          input.value = row.dataset.value;
          panel.classList.remove('open');
        });
        row.querySelector('.combo-del').addEventListener('mousedown', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const val = row.dataset.value;
          if (!confirm(`Remove "${val}" from the ${fieldLabel} list?`)) return;
          options = options.filter(o => o !== val);
          await saveOptionList(tableKey, fieldId, options);
          renderPanel(input.value);
        });
      });
    }
    renderPanel();

    input.addEventListener('focus', () => { renderPanel(input.value); panel.classList.add('open'); });
    input.addEventListener('input', () => { renderPanel(input.value); panel.classList.add('open'); });
    input.addEventListener('blur', () => {
      setTimeout(async () => {
        panel.classList.remove('open');
        const val = input.value.trim();
        if (val && !options.includes(val)){
          options = [...options, val].sort();
          await saveOptionList(tableKey, fieldId, options);
        }
      }, 150);
    });
  }
}

/* ============================================================
   LOOKUP — Vessel / Truck / Driver / Safety
============================================================= */
async function getVesselOptions(){
  const opRows = await getData('operationKPI');
  return [...new Set(opRows.map(r => r.vessel).filter(Boolean))].sort();
}

async function getTruckOptions(){
  const primeRows = await getData('primeMover');
  return [...new Set(primeRows.map(r => (r.lorry || '').trim()).filter(Boolean))].sort();
}

async function getDriverOptions(){
  const staffRows = await getData('staffDatabase');
  return [...new Set(
    staffRows
      .filter(r => (r.designation || '').trim().toLowerCase() === 'driver')
      .map(r => r.staffName)
      .filter(Boolean)
  )].sort();
}

async function getSafetyEquipmentAssetOptions(){
  const [primeRows, staffRows] = await Promise.all([getData('primeMover'), getData('staffDatabase')]);
  const truckNumbers = [...new Set(primeRows.map(r => (r.lorry || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const staffNames = [...new Set(staffRows.map(r => (r.staffName || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  return [...truckNumbers, ...staffNames];
}

/* ============================================================
   NOTIFICATION CONTACT — Branch + Name picker (khas)
============================================================= */
async function wireNotificationContactNameBranch(box){
  const nameOld = box.querySelector('[data-col="name"]');
  const brOld   = box.querySelector('[data-col="branch"]');
  if (!nameOld || !brOld) return;

  const nameField = nameOld.closest('.formfield');
  const brField   = brOld.closest('.formfield');
  if (!nameField || !brField || !nameField.parentNode) return;

  const escS = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  const norm = s => String(s || '').trim().toUpperCase().replace(/\s+/g,' ');

  let staffRows = [];
  try { staffRows = (await getData('staffDatabase')) || []; }
  catch(e){ console.error('notification contact: staff load failed', e); }

  const seen = new Set();
  const staff = [];
  staffRows.forEach(r => {
    const nm = String(r.staffName || '').trim();
    if (!nm) return;
    const br = String(r.branch || '').trim();
    const id = String(r.employeeId || '').trim();
    const k = norm(nm) + '|' + norm(br) + '|' + id;
    if (seen.has(k)) return;
    seen.add(k);
    staff.push({ name: nm, branch: br, empId: id });
  });

  const branches = [...new Set(staff.map(s => s.branch).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  const curBranch = String(brOld.value || '').trim();
  const curName   = String(nameOld.value || '').trim();

  nameField.parentNode.insertBefore(brField, nameField);

  brField.innerHTML = `
    <label>Branch</label>
    <div class="fpick" data-fpick="ncBranch">
      <input data-col="branch" type="text" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select branch...">
      <span class="fpick-caret"></span>
      <div class="combo-panel fpick-panel" data-fpick-panel="ncBranch"></div>
    </div>`;

  nameField.innerHTML = `
    <label>Name</label>
    <div class="fpick" data-fpick="ncName">
      <input data-col="name" type="text" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select staff...">
      <span class="fpick-caret"></span>
      <div class="combo-panel fpick-panel" data-fpick-panel="ncName"></div>
    </div>`;

  const brEl      = brField.querySelector('[data-col="branch"]');
  const brPanel   = brField.querySelector('[data-fpick-panel="ncBranch"]');
  const nameEl    = nameField.querySelector('[data-col="name"]');
  const namePanel = nameField.querySelector('[data-fpick-panel="ncName"]');
  if (!brEl || !brPanel || !nameEl || !namePanel) return;

  brEl.value   = curBranch;
  nameEl.value = curName;

  const closeAll = () => { brPanel.classList.remove('open'); namePanel.classList.remove('open'); };
  const syncNameHint = () => { nameEl.placeholder = norm(brEl.value) ? 'Select staff...' : 'Select branch first...'; };
  syncNameHint();

  function renderBranchPanel(){
    if (!branches.length){
      brPanel.innerHTML = '<div class="combo-empty">No branches in Staff Database</div>';
      return;
    }
    const cb = norm(brEl.value);
    brPanel.innerHTML = branches.map(v => `
      <div class="combo-item fpick-option${norm(v) === cb ? ' is-active' : ''}" data-value="${escS(v)}">
        <span class="combo-item-text">${escS(v)}</span>
      </div>`).join('');
    brPanel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        const picked = row.dataset.value || '';
        if (norm(picked) !== norm(brEl.value)) nameEl.value = '';
        brEl.value = picked;
        syncNameHint();
        closeAll();
      });
    });
  }

  function renderNamePanel(){
    const cb = norm(brEl.value);
    if (!cb){
      namePanel.innerHTML = '<div class="combo-empty">Select branch first</div>';
      return;
    }
    const list = staff.filter(s => norm(s.branch) === cb)
                      .sort((a, b) => a.name.localeCompare(b.name));
    if (!list.length){
      namePanel.innerHTML = '<div class="combo-empty">No staff in this branch</div>';
      return;
    }
    const cn = norm(nameEl.value);
    const dup = nm => list.filter(s => norm(s.name) === nm).length > 1;
    namePanel.innerHTML = list.map(s => {
      const label = dup(norm(s.name))
        ? `${s.name}${s.empId ? ' (' + s.empId + ')' : ''}`
        : s.name;
      return `<div class="combo-item fpick-option${norm(s.name) === cn ? ' is-active' : ''}" data-value="${escS(s.name)}">
        <span class="combo-item-text">${escS(label)}</span>
      </div>`;
    }).join('');
    namePanel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        nameEl.value = row.dataset.value || '';
        closeAll();
      });
    });
  }

  function bindPicker(el, panel, render){
    el.addEventListener('click', () => {
      const wasOpen = panel.classList.contains('open');
      closeAll();
      if (wasOpen) return;
      render();
      panel.classList.add('open');
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ closeAll(); return; }
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); el.click(); return; }
      e.preventDefault();
    });
  }
  bindPicker(brEl, brPanel, renderBranchPanel);
  bindPicker(nameEl, namePanel, renderNamePanel);

  document.addEventListener('mousedown', e => {
    if (!brField.contains(e.target) && !nameField.contains(e.target)) closeAll();
  });
}

/* ============================================================
   WHATSAPP GROUPS — Branch picker (khas)
============================================================= */
async function wireWhatsAppGroupsBranch(box){
  const brOld = box.querySelector('[data-col="branch"]');
  if (!brOld) return;
  const brField = brOld.closest('.formfield');
  if (!brField) return;

  const escS = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  const norm = s => String(s || '').trim().toUpperCase().replace(/\s+/g,' ');

  let staffRows = [];
  try { staffRows = (await getData('staffDatabase')) || []; }
  catch(e){ console.error('whatsapp groups: staff load failed', e); }

  const seenBr = new Set();
  const branches = [];
  staffRows.forEach(r => {
    const v = String(r.branch || '').trim();
    if (!v) return;
    const k = norm(v);
    if (seenBr.has(k)) return;
    seenBr.add(k);
    branches.push(v);
  });
  branches.sort((a, b) => a.localeCompare(b));

  const curRaw = String(brOld.value || '').trim();
  const cur = branches.some(b => norm(b) === norm(curRaw)) ? curRaw : '';

  brField.innerHTML = `
    <label>Branch</label>
    <div class="fpick" data-fpick="wgBranch">
      <input data-col="branch" type="text" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select branch...">
      <span class="fpick-caret"></span>
      <div class="combo-panel fpick-panel" data-fpick-panel="wgBranch" style="top:auto;bottom:calc(100% + 6px);"></div>
    </div>`;

  const brEl    = brField.querySelector('[data-col="branch"]');
  const brPanel = brField.querySelector('[data-fpick-panel="wgBranch"]');
  if (!brEl || !brPanel) return;

  brEl.value = cur;

  function renderBranchPanel(){
    if (!branches.length){
      brPanel.innerHTML = '<div class="combo-empty">No branches in Staff Database</div>';
      return;
    }
    const cb = norm(brEl.value);
    brPanel.innerHTML = branches.map(v => `
      <div class="combo-item fpick-option${norm(v) === cb ? ' is-active' : ''}" data-value="${escS(v)}">
        <span class="combo-item-text">${escS(v)}</span>
      </div>`).join('');
    brPanel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        brEl.value = row.dataset.value || '';
        brPanel.classList.remove('open');
      });
    });
  }

  brEl.addEventListener('click', () => {
    const wasOpen = brPanel.classList.contains('open');
    brPanel.classList.remove('open');
    if (wasOpen) return;
    renderBranchPanel();
    brPanel.classList.add('open');
  });
  brEl.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    if (e.key === 'Escape'){ brPanel.classList.remove('open'); return; }
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); brEl.click(); return; }
    e.preventDefault();
  });
  document.addEventListener('mousedown', e => {
    if (!brField.contains(e.target)) brPanel.classList.remove('open');
  });
}

/* ============================================================
   STAFF FIELD LOOKUP (untuk Notification Contact auto-fill)
============================================================= */
function staffFieldValueFor(name, branch, fieldId){
  return getData('staffDatabase').then(rows => {
    const norm = s => String(s == null ? '' : s).trim().toUpperCase().replace(/\s+/g,' ');
    const n = norm(name), b = norm(branch);
    if (!n) return '';
    const sameName = (rows || []).filter(r => norm(r.staffName) === n);
    if (!sameName.length) return '';

    if (b){
      const exact = sameName.filter(r => norm(r.branch) === b);
      if (exact.length === 1) return String(exact[0][fieldId] || '').trim();
      if (exact.length > 1) return '';
    }
    if (sameName.length === 1) return String(sameName[0][fieldId] || '').trim();
    return '';
  });
}
function staffDesignationFor(name, branch){ return staffFieldValueFor(name, branch, 'designation'); }
function staffPhoneFor(name, branch){ return staffFieldValueFor(name, branch, 'phone'); }

/* ============================================================
   SAFETY EQUIPMENT PICKERS
============================================================= */
async function wireSafetyEquipmentPickers(box){
  const [staffRows, primeRows] = await Promise.all([getData('staffDatabase'), getData('primeMover')]);
  const uniq = arr => [...new Set(arr.map(v => String(v || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const staffOpts  = uniq(staffRows.map(r => r.staffName));
  const truckOpts  = uniq(primeRows.map(r => r.lorry));
  const branchOpts = uniq(staffRows.map(r => r.branch));
  const esc = s => String(s).replace(/"/g, '&quot;');

  const curCat    = (box.querySelector('[data-col="category"]') || {}).value || '';
  const curAsset  = (box.querySelector('[data-col="asset"]')    || {}).value || '';
  const curBranch = (box.querySelector('[data-col="branch"]')   || {}).value || '';

  function makePicker(colId, listFn, cur){
    const el = box.querySelector(`[data-col="${colId}"]`);
    const fieldEl = el ? el.closest('.formfield') : null;
    if (!fieldEl) return null;
    const labelEl = fieldEl.querySelector('label');
    const lbl = labelEl ? labelEl.textContent : colId;
    fieldEl.innerHTML = `
      <label>${lbl}</label>
      <div class="fpick" data-fpick="${colId}">
        <input type="text" data-col="${colId}" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
        <span class="fpick-caret"></span>
        <div class="combo-panel fpick-panel" data-fpick-panel="${colId}"></div>
      </div>`;
    const input = fieldEl.querySelector('input[data-col]');
    const panel = fieldEl.querySelector('[data-fpick-panel]');

    function render(){
      let list = (listFn() || []).slice();
      const current = input.value || cur;
      if (current && !list.includes(current)) list = [current].concat(list);
      panel.innerHTML = list.length
        ? list.map(v =>
            `<div class="combo-item fpick-option${v === current ? ' is-active' : ''}" data-value="${esc(v)}">
               <span class="combo-item-text">${v}</span>
             </div>`).join('')
        : '<div class="combo-empty">No options</div>';
      panel.querySelectorAll('.fpick-option').forEach(row => {
        row.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          input.value = row.dataset.value || '';
          panel.classList.remove('open');
        });
      });
    }

    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
      render();
      panel.classList.add('open');
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if (panel.classList.contains('open')){ panel.classList.remove('open'); }
        else { render(); panel.classList.add('open'); }
        return;
      }
      e.preventDefault();
    });
    document.addEventListener('mousedown', e => {
      if (!fieldEl.contains(e.target)) panel.classList.remove('open');
    });

    if (cur) input.value = cur;
    return { input, render };
  }

  const catP = makePicker('category', () => ['Truck','Staff'], curCat || 'Truck');
  const catVal = () => (catP ? String(catP.input.value).trim() : '');
  const assetList = () => (catVal() === 'Staff' ? staffOpts : truckOpts);

  const assetP  = makePicker('asset',  assetList,  curAsset);
  const branchP = makePicker('branch', () => branchOpts, curBranch);

  function refreshAsset(){
    if (!assetP) return;
    const arr = assetList();
    const cur = assetP.input.value;
    if (cur && !arr.includes(cur)) assetP.input.value = '';
  }
  if (catP){
    box.addEventListener('mousedown', e => {
      const opt = e.target.closest('.fpick-option');
      if (opt && opt.closest('[data-fpick="category"]')) setTimeout(refreshAsset, 0);
    });
  }
}

/* ============================================================
   APAD CATEGORY PICKER
============================================================= */
async function wireApadCategoryPicker(box){
  const CAT_OPTIONS = ['ICOP','Pekeliling','Guideline','Portal','Other'];
  const esc = s => String(s).replace(/"/g, '&quot;');
  const colId = 'category';
  const el = box.querySelector(`[data-col="${colId}"]`);
  const fieldEl = el ? el.closest('.formfield') : null;
  if (!fieldEl) return;
  const labelEl = fieldEl.querySelector('label');
  const lbl = labelEl ? labelEl.textContent : colId;
  const cur = String(el.value || '').trim();

  fieldEl.innerHTML = `
    <label>${lbl}</label>
    <div class="fpick" data-fpick="${colId}">
      <input type="text" data-col="${colId}" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
      <span class="fpick-caret"></span>
      <div class="combo-panel fpick-panel" data-fpick-panel="${colId}"></div>
    </div>`;
  const input = fieldEl.querySelector('input[data-col]');
  const panel = fieldEl.querySelector('[data-fpick-panel]');

  function render(){
    let list = CAT_OPTIONS.slice();
    const current = input.value || cur;
    if (current && !list.includes(current)) list = [current].concat(list);
    panel.innerHTML = list.length
      ? list.map(v =>
          `<div class="combo-item fpick-option${v === current ? ' is-active' : ''}" data-value="${esc(v)}">
             <span class="combo-item-text">${v}</span>
           </div>`).join('')
      : '<div class="combo-empty">No options</div>';
    panel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        input.value = row.dataset.value || '';
        panel.classList.remove('open');
      });
    });
  }

  input.addEventListener('click', () => {
    if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
    render();
    panel.classList.add('open');
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      if (panel.classList.contains('open')){ panel.classList.remove('open'); }
      else { render(); panel.classList.add('open'); }
      return;
    }
    e.preventDefault();
  });
  document.addEventListener('mousedown', e => {
    if (!fieldEl.contains(e.target)) panel.classList.remove('open');
  });

  if (cur) input.value = cur;
}

/* ============================================================
   TRAILER PICKERS
============================================================= */
async function wireTrailerPickers(box){
  const [staffRows, primeRows, trailerRows] = await Promise.all([
    getData('staffDatabase'), getData('primeMover'), getData('trailer')
  ]);

  const apmInput = box.querySelector('[data-col="assignedPrimeMover"]');
  if (apmInput && apmInput.closest('.formfield')){
    apmInput.closest('.formfield').style.display = 'none';
  }
  const esc = s => String(s).replace(/"/g, '&quot;');
  const uniq = arr => [...new Set(arr.map(v => String(v || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const FALLBACK_BRANCHES = ['Kemaman','HQ','Johor Bahru','Penang','Klang Valley'];

  let branches = uniq([...staffRows.map(r => r.branch), ...trailerRows.map(r => r.branch)]);
  if (!branches.length) branches = FALLBACK_BRANCHES;

  const trucksByBranch = {};
  primeRows.forEach(r => {
    const lor = String(r.lorry || '').trim();
    const br  = String(r.branch || '').trim();
    if (!lor || !br) return;
    (trucksByBranch[br] = trucksByBranch[br] || []).push(lor);
  });
  Object.keys(trucksByBranch).forEach(b => { trucksByBranch[b] = uniq(trucksByBranch[b]); });

  const curBranch = String((box.querySelector('[data-col="branch"]') || {}).value || '').trim();
  const curTruck  = String((box.querySelector('[data-col="assignedPrimeMover"]') || {}).value || '').trim();
  const state = { branch: curBranch };
  const pickers = {};

  function makePicker(colId, listFn, initial, emptyMsg){
    const el = box.querySelector(`[data-col="${colId}"]`);
    const fieldEl = el ? el.closest('.formfield') : null;
    if (!fieldEl) return null;
    const labelEl = fieldEl.querySelector('label');
    const lbl = labelEl ? labelEl.textContent : colId;
    fieldEl.innerHTML = `
      <label>${lbl}</label>
      <div class="fpick" data-fpick="${colId}">
        <input type="text" data-col="${colId}" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
        <span class="fpick-caret"></span>
        <div class="combo-panel fpick-panel" data-fpick-panel="${colId}"></div>
      </div>`;
    const input = fieldEl.querySelector('input[data-col]');
    const panel = fieldEl.querySelector('[data-fpick-panel]');
    if (initial) input.value = initial;

    function render(){
      let list = (listFn() || []).slice();
      const current = input.value || '';
      if (current && !list.includes(current)) list = [current].concat(list);
      panel.innerHTML = list.length
        ? list.map(v =>
            `<div class="combo-item fpick-option${v === current ? ' is-active' : ''}" data-value="${esc(v)}">
               <span class="combo-item-text">${v}</span>
             </div>`).join('')
        : `<div class="combo-empty">${emptyMsg || 'No options'}</div>`;
      panel.querySelectorAll('.fpick-option').forEach(row => {
        row.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          input.value = row.dataset.value || '';
          panel.classList.remove('open');
          if (pickers.onChange) pickers.onChange(colId, input.value);
        });
      });
    }

    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
      render();
      panel.classList.add('open');
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if (panel.classList.contains('open')){ panel.classList.remove('open'); }
        else { render(); panel.classList.add('open'); }
        return;
      }
      e.preventDefault();
    });
    document.addEventListener('mousedown', e => {
      if (!fieldEl.contains(e.target)) panel.classList.remove('open');
    });

    return { input, render };
  }

  pickers.onChange = (colId, val) => {
    if (colId !== 'branch') return;
    state.branch = val;
    const trucks = trucksByBranch[state.branch] || [];
    const t = pickers.truck;
    if (t && t.input.value && !trucks.includes(t.input.value)) t.input.value = '';
  };

  makePicker('type',
    () => ['Container','Flatbed','Lowbed','Tanker','Curtainside','General Cargo','Other'],
    '', 'No options');

  pickers.branch = makePicker('branch', () => branches, curBranch, 'No options');
}

/* ============================================================
   PRIME MOVER PICKERS
============================================================= */
async function wirePrimeMoverPickers(box){
  const esc = s => String(s).replace(/"/g, '&quot;');
  const uniq = arr => [...new Set(arr.map(v => String(v || '').trim()).filter(Boolean))]
    .sort((a,b) => a.localeCompare(b));
  const FALLBACK_BRANCHES = ['Kemaman','HQ','Johor Bahru','Penang','Klang Valley'];

  function makePicker(colId, listFn, emptyMsg){
    const el = box.querySelector(`[data-col="${colId}"]`);
    const fieldEl = el ? el.closest('.formfield') : null;
    if (!fieldEl) return null;
    const cur = String(el.value || '').trim();
    const labelEl = fieldEl.querySelector('label');
    const lbl = labelEl ? labelEl.textContent : colId;

    fieldEl.innerHTML = `
      <label>${lbl}</label>
      <div class="fpick" data-fpick="${colId}">
        <input type="text" data-col="${colId}" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
        <span class="fpick-caret"></span>
        <div class="combo-panel fpick-panel" data-fpick-panel="${colId}"></div>
      </div>`;
    const input = fieldEl.querySelector('input[data-col]');
    const panel = fieldEl.querySelector('[data-fpick-panel]');
    if (cur) input.value = cur;

    function render(){
      let list = (listFn() || []).slice();
      const current = input.value || '';
      if (current && !list.includes(current)) list = [current].concat(list);
      panel.innerHTML = list.length
        ? list.map(v =>
            `<div class="combo-item fpick-option${v === current ? ' is-active' : ''}" data-value="${esc(v)}">
               <span class="combo-item-text">${v}</span>
             </div>`).join('')
        : `<div class="combo-empty">${emptyMsg || 'No options'}</div>`;
      panel.querySelectorAll('.fpick-option').forEach(row => {
        row.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          input.value = row.dataset.value || '';
          panel.classList.remove('open');
        });
      });
    }

    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
      render();
      panel.classList.add('open');
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if (panel.classList.contains('open')){ panel.classList.remove('open'); }
        else { render(); panel.classList.add('open'); }
        return;
      }
      e.preventDefault();
    });
    document.addEventListener('mousedown', e => {
      if (!fieldEl.contains(e.target)) panel.classList.remove('open');
    });

    return { input, render };
  }

  let staffRows = [], primeRows = [];
  try{ staffRows = await getData('staffDatabase'); }catch(e){ staffRows = []; }
  try{ primeRows = await getData('primeMover'); }catch(e){ primeRows = []; }
  let branches = uniq([
    ...(staffRows || []).map(r => r && r.branch),
    ...(primeRows || []).map(r => r && r.branch),
  ]);
  if (!branches.length) branches = FALLBACK_BRANCHES;

  makePicker('branch', () => branches, 'No options');
}

/* ============================================================
   FEG HELPERS — ID, unit, kunci kumpulan
============================================================= */
function fegNewId(prefix){
  return (prefix || 'FEG') + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,6).toUpperCase();
}

function fegNewUnit(){
  return {
    unitId: fegNewId('FU'),
    serialPrefix: '', serialNo: '',
    driver: '', fegType: '', capacity: '',
    mfgDate: '', serviceDate: '', inspectionDate: '', cylinderDue: '',
    vendor: '', manualStatus: '', remark: '', note: '',
    finalStatus: 'Draft', disposal: 'No',
    disposalVendor: '', disposalReason: '', disposedAt: '', disposedLoggedAt: '', disposedBy: '',
    serviceLog: [],
    serviceSeq: 0,
  };
}

function fegGroupKey(v){
  return String(v == null ? '' : v).trim().replace(/\s+/g,' ').toLowerCase();
}

/* ============================================================
   FEG ASSET OPTIONS
============================================================= */
async function getFegAssetOptions(branchFilter){
  let primeRows = [], trailerRows = [];
  try{ primeRows = await getData('primeMover'); }catch(e){ primeRows = []; }
  try{ trailerRows = await getData('trailer'); }catch(e){ trailerRows = []; }

  const trailersOf = new Map();
  const addTrailer = (truck, trail) => {
    const t = String(trail || '').trim();
    const k = fegGroupKey(truck);
    if (!t || !k) return;
    const arr = trailersOf.get(k) || [];
    if (!arr.some(x => fegGroupKey(x) === fegGroupKey(t))) arr.push(t);
    trailersOf.set(k, arr);
  };
  (trailerRows || []).forEach(r => addTrailer(r && r.assignedPrimeMover, r && r.lorry));

  const trailerNoById = new Map();
  (trailerRows || []).forEach(t => {
    const id = String((t && t.assetId) || '').trim();
    const no = String((t && t.lorry) || '').trim();
    if (id && no) trailerNoById.set(id, no);
  });

  const want = fegGroupKey(branchFilter);
  const seen = new Set();
  const out  = [];

  (primeRows || []).forEach(r => {
    const truck = String((r && r.lorry) || '').trim();
    if (!truck) return;
    const key = fegGroupKey(truck);
    if (seen.has(key)) return;
    const br = String((r && r.branch) || '').trim();
    if (want && fegGroupKey(br) !== want) return;
    seen.add(key);

    const list = [];
    const push = t => {
      const s = String(t || '').trim();
      if (s && !list.some(x => fegGroupKey(x) === fegGroupKey(s))) list.push(s);
    };
    const at = r && r.assignedTrailers;
    if (Array.isArray(at)){
      at.forEach(v => { const no = trailerNoById.get(String(v == null ? '' : v).trim()); if (no) push(no); });
    } else if (typeof at === 'string' && at.trim()){
      const s = at.trim();
      push(trailerNoById.get(s) || s);
    }
    (trailersOf.get(key) || []).forEach(push);

    out.push({
      value: truck,
      kind: 'truck',
      branch: br,
      trailer: list[0] || '',
      label: list.length ? (truck + ' (' + list.join(', ') + ')') : truck,
    });
  });

  return out;
}

/* ============================================================
   FEG PICKERS (dalam modal Add / Edit)
============================================================= */
async function wireFegPickers(box){
  const head = box.querySelector('h4');
  const isAdd = String((head && head.textContent) || '').trim().toLowerCase().startsWith('add');

  const brEl = box.querySelector('[data-col="branch"]');
  const brField = brEl ? brEl.closest('.formfield') : null;

  let qtyEl = null;
  if (isAdd && brField){
    const holder = document.createElement('div');
    holder.className = 'formfield';
    holder.innerHTML = `
      <label>Quantity</label>
      <input data-col="fegQuantity" type="number" min="1" max="${FEG_MAX_UNITS}" step="1" value="1">
      <div class="settings-note" style="margin-top:6px;">How many extinguisher units to create. Fill in each unit's details (serial, dates, vendor, status) on the Detail Page.</div>`;
    brField.parentNode.insertBefore(holder, brField.nextSibling);
    qtyEl = holder.querySelector('input');
  }

  const warn = document.createElement('div');
  warn.className = 'settings-note';
  warn.style.marginTop = '10px';
  warn.style.display = 'none';
  const foot = box.querySelector('.modalfoot');
  if (foot && foot.parentNode) foot.parentNode.insertBefore(warn, foot);

  const saveBtns = () => [box.querySelector('#saveModal'), box.querySelector('#saveModalComplete')].filter(Boolean);

  async function validate(){
    const cat = String((box.querySelector('[data-col="assetType"]') || {}).value || '').trim();
    const loc = String((box.querySelector('[data-col="assetRef"]')  || {}).value || '').trim();
    const br  = String((box.querySelector('[data-col="branch"]')    || {}).value || '').trim();
    const q   = qtyEl ? parseInt(qtyEl.value, 10) : 1;
    let msg = '';

    if (!cat) msg = 'Choose a Category first (Asset / Building).';
    else if (!loc) msg = 'Fill in Asset / Location.';
    else if (!br)  msg = 'Choose a Branch.';

    if (!msg && cat === 'Asset'){
      const list = await getFegAssetOptions(br);
      if (!list.some(a => fegGroupKey(a.value) === fegGroupKey(loc)))
        msg = 'This truck is not in the selected Branch. Pick a truck from that branch.';
    }

    if (!msg){
      let rows = [];
      try{ rows = await getData('feg'); }catch(e){ rows = []; }
      const dup = (rows || []).find(r => r && String(r.assetType || '') === cat && fegGroupKey(r.assetRef) === fegGroupKey(loc));
      if (dup) msg = 'A FEG record for "' + loc + '" already exists. Open that record to add units.';
    }
    if (!msg && (!isFinite(q) || q < 1 || q > FEG_MAX_UNITS)) msg = 'Quantity must be a whole number from 1 to ' + FEG_MAX_UNITS + '.';

    const ok = !msg;
    saveBtns().forEach(b => { b.disabled = !ok; });
    warn.textContent = msg;
    warn.style.display = msg ? 'block' : 'none';
    warn.style.color = msg ? 'var(--bad, #c0392b)' : '';
    return ok;
  }

  box.addEventListener('input',  () => { validate(); });
  box.addEventListener('change', () => { validate(); });
  box.addEventListener('mousedown', () => { setTimeout(() => { validate(); }, 0); });

  const allAssets = await getFegAssetOptions();
  const branchOf = {};
  allAssets.forEach(a => { if (a.value) branchOf[fegGroupKey(a.value)] = a.branch || ''; });
  box.addEventListener('change', () => {
    const loc   = String((box.querySelector('[data-col="assetRef"]') || {}).value || '').trim();
    const brNow = box.querySelector('[data-col="branch"]');
    if (!loc || !brNow) return;
    const b = branchOf[fegGroupKey(loc)];
    if (b && !String(brNow.value || '').trim()){
      brNow.value = b;
      brNow.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  box.addEventListener('click', e => {
    const t = e.target;
    const btn = (t && t.closest) ? t.closest('#saveModal, #saveModalComplete') : null;
    if (!btn) return;
    const q = qtyEl ? parseInt(qtyEl.value, 10) : 1;
    FEG_PENDING_QTY = (isFinite(q) && q > 0) ? Math.min(q, FEG_MAX_UNITS) : 1;
  }, true);

  box.addEventListener('mousedown', () => { setTimeout(() => { fegSyncAssetField(box); }, 0); });
  box.addEventListener('click',     () => { setTimeout(() => { fegSyncAssetField(box); }, 0); });
  await fegSyncAssetField(box, true);
  await validate();
}

/* ============================================================
   FEG BRANCH PICKER
============================================================= */
async function wireFegBranch(box){
  const brOld = box.querySelector('[data-col="branch"]');
  if (!brOld) return;
  const brField = brOld.closest('.formfield');
  if (!brField) return;

  let staffRows = [];
  try{ staffRows = (await getData('staffDatabase')) || []; }
  catch(e){ console.error('FEG branch: staff load failed', e); }

  const seen = new Set();
  const branches = [];
  (staffRows || []).forEach(r => {
    const v = String(r.branch || '').trim();
    if (!v) return;
    const k = fegGroupKey(v);
    if (seen.has(k)) return;
    seen.add(k);
    branches.push(v);
  });
  branches.sort((a,b) => a.localeCompare(b));

  const escS  = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  const curRaw = String(brOld.value || '').trim();

  brField.innerHTML = `
    <label>Branch</label>
    <div class="fpick" data-fpick="fegBranch">
      <input data-col="branch" type="text" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select branch...">
      <span class="fpick-caret"></span>
      <div class="combo-panel fpick-panel" data-fpick-panel="fegBranch"></div>
    </div>`;

  const el    = brField.querySelector('[data-col="branch"]');
  const panel = brField.querySelector('[data-fpick-panel="fegBranch"]');
  if (!el || !panel) return;
  el.value = curRaw;

  const fire = () => {
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  function render(){
    if (!branches.length){
      panel.innerHTML = '<div class="combo-empty">No branches in Staff Database</div>';
      return;
    }
    const cb = fegGroupKey(el.value);
    panel.innerHTML = branches.map(v => `
      <div class="combo-item fpick-option${fegGroupKey(v) === cb ? ' is-active' : ''}" data-value="${escS(v)}">
        <span class="combo-item-text">${escS(v)}</span>
      </div>`).join('');
    panel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        el.value = row.dataset.value || '';
        panel.classList.remove('open');
        fire();
        setTimeout(() => { fegSyncAssetField(box); }, 0);
      });
    });
  }

  el.addEventListener('click', () => {
    const wasOpen = panel.classList.contains('open');
    panel.classList.remove('open');
    if (wasOpen) return;
    render(); panel.classList.add('open');
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); el.click(); return; }
    e.preventDefault();
  });
  document.addEventListener('mousedown', e => {
    if (!brField.contains(e.target)) panel.classList.remove('open');
  });

  fire();
}

/* ============================================================
   FEG ASSET FIELD SYNC (Asset vs Building)
============================================================= */
async function fegSyncAssetField(box, force){
  const catEl = box.querySelector('[data-col="assetType"]');
  const cat   = String((catEl && catEl.value) || '').trim() || 'Asset';
  const brEl  = box.querySelector('[data-col="branch"]');
  const brKey = fegGroupKey(String((brEl && brEl.value) || '').trim());
  const curEl = box.querySelector('[data-col="assetRef"]');
  const fieldEl = curEl ? curEl.closest('.formfield') : null;
  if (!fieldEl) return;

  const sig = cat + '|' + brKey;
  if (!force && String(fieldEl.dataset.fegMode || '') === sig) return;

  const prevCat = String(fieldEl.dataset.fegCat || '');
  fieldEl.dataset.fegCat = cat;

  await fegPaintAssetField(box, cat, brKey, !!(prevCat && prevCat !== cat));
}

async function fegPaintAssetField(box, cat, branchKey, clearValue){
  const oldEl   = box.querySelector('[data-col="assetRef"]');
  const fieldEl = oldEl ? oldEl.closest('.formfield') : null;
  if (!fieldEl) return;
  const current = clearValue ? '' : String(oldEl.value || '');
  const esc = s => String(s == null ? '' : s).replace(/"/g, '&quot;');

  if (cat === 'Asset'){
    const seq = ++FOCC_FEG_PAINT_SEQ;
    const assets = await getFegAssetOptions(branchKey);
    if (seq !== FOCC_FEG_PAINT_SEQ) return;
    const inList = assets.some(a => fegGroupKey(a.value) === fegGroupKey(current));
    const keep   = (!clearValue && current && inList) ? current : '';
    fieldEl.innerHTML = `
      <label>Asset / Location</label>
      <div class="fpick" data-fpick="assetRef">
        <input type="text" data-col="assetRef" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select truck...">
        <span class="fpick-caret"></span>
        <div class="combo-panel fpick-panel" data-fpick-panel="assetRef"></div>
      </div>
      <div class="settings-note" style="margin-top:6px;">One row per truck from Prime Mover${branchKey ? ' (filtered by the selected Branch)' : ''}. Assigned trailer shown in brackets.</div>`;
    const input = fieldEl.querySelector('input[data-col]');
    const panel = fieldEl.querySelector('[data-fpick-panel]');
    if (keep) input.value = keep;

    const render = () => {
      const cur = fegGroupKey(input.value);
      panel.innerHTML = assets.length
        ? assets.map(a => `<div class="combo-item fpick-option${fegGroupKey(a.value) === cur ? ' is-active' : ''}" data-value="${esc(a.value)}">
             <span class="combo-item-text">${esc(a.label)}</span>
           </div>`).join('')
        : '<div class="combo-empty">No trucks' + (branchKey ? ' in this branch' : '') + ' — check the Prime Mover page.</div>';
      panel.querySelectorAll('.fpick-option').forEach(rowEl => {
        rowEl.addEventListener('mousedown', e => {
          e.preventDefault(); e.stopPropagation();
          input.value = rowEl.dataset.value || '';
          panel.classList.remove('open');
          input.dispatchEvent(new Event('input',  { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    };

    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
      render(); panel.classList.add('open');
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if (panel.classList.contains('open')){ panel.classList.remove('open'); }
        else { render(); panel.classList.add('open'); }
        return;
      }
      e.preventDefault();
    });

  } else {
    fieldEl.innerHTML = `
      <label>Asset / Location</label>
      <div class="combo-wrap" data-combo-wrap="assetRef">
        <input data-col="assetRef" type="text" autocomplete="off" placeholder="Type new or pick existing...">
        <div class="combo-panel" data-combo-panel="assetRef"></div>
      </div>
      <div class="settings-note" style="margin-top:6px;">Type a new location name or pick from the list. &times; removes it from the list.</div>`;
    const input = fieldEl.querySelector('input[data-col]');
    const panel = fieldEl.querySelector('[data-combo-panel]');
    if (current) input.value = current;

    let list = [];
    try{
      const saved = await loadOptionList('feg', 'assetRef');
      if (Array.isArray(saved)) list = saved.slice();
    }catch(e){ list = []; }
    if (current && !list.includes(current)) list = [current].concat(list);

    const render = () => {
      const vis = list.slice().sort((a,b) => String(a).localeCompare(String(b)));
      const cur = String(input.value || '');
      panel.innerHTML = vis.length
        ? vis.map(v => `<div class="combo-item${v === cur ? ' is-active' : ''}" data-value="${esc(v)}">
             <span class="combo-item-text">${esc(v)}</span>
             <button type="button" class="combo-del" data-del="${esc(v)}" title="Remove from list">&times;</button>
           </div>`).join('')
        : '<div class="combo-empty">Type a new location name…</div>';
      panel.querySelectorAll('.combo-item').forEach(rowEl => {
        const txt = rowEl.querySelector('.combo-item-text');
        if (txt) txt.addEventListener('mousedown', e => {
          e.preventDefault(); e.stopPropagation();
          input.value = rowEl.dataset.value || '';
          panel.classList.remove('open');
          input.dispatchEvent(new Event('input',  { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        const del = rowEl.querySelector('.combo-del');
        if (del) del.addEventListener('mousedown', async e => {
          e.preventDefault(); e.stopPropagation();
          list = list.filter(x => String(x) !== String(rowEl.dataset.value));
          try{ await saveOptionList('feg', 'assetRef', list); }catch(err){}
          render();
        });
      });
    };

    input.addEventListener('focus', () => { render(); panel.classList.add('open'); });
    input.addEventListener('input', () => { render(); panel.classList.add('open'); });
    input.addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('open'); });
  }

  if (!box.dataset.fegOutsideBound){
    box.dataset.fegOutsideBound = '1';
    document.addEventListener('mousedown', e => {
      const f = box.querySelector('[data-col="assetRef"]');
      const fld = f ? f.closest('.formfield') : null;
      if (!fld) return;
      if (fld.contains(e.target)) return;
      fld.querySelectorAll('.fpick-panel.open, .combo-panel.open').forEach(p => p.classList.remove('open'));
    });
  }

  fieldEl.dataset.fegMode = cat + '|' + branchKey;
  const inp = fieldEl.querySelector('[data-col="assetRef"]');
  if (inp) inp.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ============================================================
   SPEEDING PICKERS
============================================================= */
async function wireSpeedingPickers(box){
  const [staffRows, primeRows] = await Promise.all([getData('staffDatabase'), getData('primeMover')]);
  const uniq = arr => [...new Set(arr.map(v => String(v || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const esc = s => String(s).replace(/"/g, '&quot;');
  const low = s => String(s || '').trim().toLowerCase();

  const driversByBranch = {};
  const trucksByBranch  = {};
  const branchOfDriver  = {};
  const branchOfTruck   = {};
  staffRows.forEach(r => {
    const name = String(r.staffName || '').trim();
    const br   = String(r.branch || '').trim();
    if (!name || !br || low(r.designation) !== 'driver') return;
    (driversByBranch[br] = driversByBranch[br] || []).push(name);
    branchOfDriver[name] = br;
  });
  primeRows.forEach(r => {
    const lor = String(r.lorry || '').trim();
    const br  = String(r.branch || '').trim();
    if (!lor || !br) return;
    (trucksByBranch[br] = trucksByBranch[br] || []).push(lor);
    branchOfTruck[lor] = br;
  });
  Object.keys(driversByBranch).forEach(b => { driversByBranch[b] = uniq(driversByBranch[b]); });
  Object.keys(trucksByBranch).forEach(b =>  { trucksByBranch[b]  = uniq(trucksByBranch[b]); });
  const branches = uniq([...Object.keys(driversByBranch), ...Object.keys(trucksByBranch)]);

  const curBranch = String((box.querySelector('[data-col="branch"]') || {}).value || '').trim();
  const curDriver = String((box.querySelector('[data-col="driver"]') || {}).value || '').trim();
  const curTruck  = String((box.querySelector('[data-col="truck"]')  || {}).value || '').trim();

  let initialBranch = curBranch;
  if (!initialBranch && curDriver && branchOfDriver[curDriver]) initialBranch = branchOfDriver[curDriver];
  if (!initialBranch && curTruck  && branchOfTruck[curTruck])   initialBranch = branchOfTruck[curTruck];

  const state = { branch: initialBranch, driver: curDriver, truck: curTruck };
  const pickers = {};

  const branchDriverList = () => (driversByBranch[state.branch] || []).slice();
  const branchTruckList  = () => (trucksByBranch[state.branch]  || []).slice();

  function makePicker(colId, listFn){
    const el = box.querySelector(`[data-col="${colId}"]`);
    const fieldEl = el ? el.closest('.formfield') : null;
    if (!fieldEl) return null;
    const labelEl = fieldEl.querySelector('label');
    const lbl = labelEl ? labelEl.textContent : colId;
    const initial = state[colId] || '';
    fieldEl.innerHTML = `
      <label>${lbl}</label>
      <div class="fpick" data-fpick="${colId}">
        <input type="text" data-col="${colId}" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
        <span class="fpick-caret"></span>
        <div class="combo-panel fpick-panel" data-fpick-panel="${colId}"></div>
      </div>`;
    const input = fieldEl.querySelector('input[data-col]');
    const panel = fieldEl.querySelector('[data-fpick-panel]');
    if (initial) input.value = initial;

    function render(){
      let list = listFn();
      const current = input.value || '';
      if (current && !list.includes(current)) list = [current].concat(list);
      panel.innerHTML = list.length
        ? list.map(v =>
            `<div class="combo-item fpick-option${v === current ? ' is-active' : ''}" data-value="${esc(v)}">
               <span class="combo-item-text">${v}</span>
             </div>`).join('')
        : '<div class="combo-empty">No options</div>';
      panel.querySelectorAll('.fpick-option').forEach(row => {
        row.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          input.value = row.dataset.value || '';
          panel.classList.remove('open');
          if (pickers.onChange) pickers.onChange(colId, input.value);
        });
      });
    }

    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
      render();
      panel.classList.add('open');
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if (panel.classList.contains('open')){ panel.classList.remove('open'); }
        else { render(); panel.classList.add('open'); }
        return;
      }
      e.preventDefault();
    });
    document.addEventListener('mousedown', e => {
      if (!fieldEl.contains(e.target)) panel.classList.remove('open');
    });

    return { input, render };
  }

  pickers.onChange = (colId, val) => {
    if (colId !== 'branch') return;
    state.branch = val;
    const drivers = branchDriverList();
    const trucks  = branchTruckList();
    if (pickers.driver && pickers.driver.input.value && !drivers.includes(pickers.driver.input.value)) pickers.driver.input.value = '';
    if (pickers.truck  && pickers.truck.input.value  && !trucks.includes(pickers.truck.input.value))  pickers.truck.input.value  = '';
  };

  pickers.branch = makePicker('branch', () => branches);
  pickers.driver = makePicker('driver', branchDriverList);
  pickers.truck  = makePicker('truck',  branchTruckList);
}

/* ============================================================
   MISCONDUCT PICKERS
============================================================= */
async function wireMisconductPickers(box, existing){
  const [staffRows, primeRows] = await Promise.all([getData('staffDatabase'), getData('primeMover')]);
  const uniq = arr => [...new Set(arr.map(v => String(v || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const esc = s => String(s).replace(/"/g, '&quot;');
  const low = s => String(s || '').trim().toLowerCase();

  const driversByBranch = {};
  const trucksByBranch  = {};
  const branchOfDriver  = {};
  const branchOfTruck   = {};
  staffRows.forEach(r => {
    const name = String(r.staffName || '').trim();
    const br   = String(r.branch || '').trim();
    if (!name || !br || low(r.designation) !== 'driver') return;
    (driversByBranch[br] = driversByBranch[br] || []).push(name);
    branchOfDriver[name] = br;
  });
  primeRows.forEach(r => {
    const lor = String(r.lorry || '').trim();
    const br  = String(r.branch || '').trim();
    if (!lor || !br) return;
    (trucksByBranch[br] = trucksByBranch[br] || []).push(lor);
    branchOfTruck[lor] = br;
  });
  Object.keys(driversByBranch).forEach(b => { driversByBranch[b] = uniq(driversByBranch[b]); });
  Object.keys(trucksByBranch).forEach(b =>  { trucksByBranch[b]  = uniq(trucksByBranch[b]); });
  const branches = uniq([...Object.keys(driversByBranch), ...Object.keys(trucksByBranch)]);

  const CATEGORY_OPTS = ['Property Damage','Speeding','Absent Without Notice','Accident','Other'];
  const STATUS_OPTS   = ['Open','Closed'];

  const curBranch = String(existing.branch || '').trim();
  const curDriver = String(existing.driver || '').trim();
  const curTruck  = String(existing.truck  || '').trim();
  let initialBranch = curBranch;
  if (!initialBranch && curDriver && branchOfDriver[curDriver]) initialBranch = branchOfDriver[curDriver];
  if (!initialBranch && curTruck  && branchOfTruck[curTruck])   initialBranch = branchOfTruck[curTruck];

  const state = { branch: initialBranch, driver: curDriver, truck: curTruck, category: String(existing.category || '').trim(), status: String(existing.status || '').trim() };
  const pickers = {};
  const branchDriverList = () => (driversByBranch[state.branch] || []).slice();
  const branchTruckList  = () => (trucksByBranch[state.branch]  || []).slice();

  function makePicker(colId, listFn, opts){
    opts = opts || {};
    const el = box.querySelector(`[data-col="${colId}"]`);
    const fieldEl = el ? el.closest('.formfield') : null;
    if (!fieldEl) return null;
    const labelEl = fieldEl.querySelector('label');
    const lbl = labelEl ? labelEl.textContent : colId;
    const initial = state[colId] || '';
    fieldEl.innerHTML = `
      <label>${lbl}</label>
      <div class="fpick" data-fpick="${colId}">
        <input type="text" data-col="${colId}" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
        <span class="fpick-caret"></span>
        <div class="combo-panel fpick-panel" data-fpick-panel="${colId}"></div>
      </div>`;
    const input = fieldEl.querySelector('input[data-col]');
    const panel = fieldEl.querySelector('[data-fpick-panel]');
    if (initial) input.value = initial;

    function render(){
      let list = listFn();
      const current = input.value || '';
      if (current && !list.includes(current)) list = [current].concat(list);
      panel.innerHTML = list.length
        ? list.map(v =>
            `<div class="combo-item fpick-option${v === current ? ' is-active' : ''}" data-value="${esc(v)}">
               <span class="combo-item-text">${v}</span>
             </div>`).join('')
        : '<div class="combo-empty">No options</div>';
      panel.querySelectorAll('.fpick-option').forEach(row => {
        row.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          input.value = row.dataset.value || '';
          panel.classList.remove('open');
          if (pickers.onChange) pickers.onChange(colId, input.value);
        });
      });
    }

    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
      render();
      panel.classList.add('open');
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if (panel.classList.contains('open')){ panel.classList.remove('open'); }
        else { render(); panel.classList.add('open'); }
        return;
      }
      e.preventDefault();
    });
    document.addEventListener('mousedown', e => {
      if (!fieldEl.contains(e.target)) panel.classList.remove('open');
    });
    return { input, render };
  }

  pickers.onChange = (colId, val) => {
    if (colId !== 'branch') return;
    state.branch = val;
    const drivers = branchDriverList();
    const trucks  = branchTruckList();
    if (pickers.driver && !drivers.includes(pickers.driver.input.value)) pickers.driver.input.value = '';
    if (pickers.truck  && !trucks.includes(pickers.truck.input.value))  pickers.truck.input.value  = '';
  };

  pickers.branch  = makePicker('branch',  () => branches, {});
  pickers.driver  = makePicker('driver',  branchDriverList, {});
  pickers.truck   = makePicker('truck',   branchTruckList, {});
  pickers.category = makePicker('category', () => CATEGORY_OPTS.slice(), {});
  pickers.status   = makePicker('status',   () => STATUS_OPTS.slice(), {});
}

/* ============================================================
   OPEN ADD ROW MODAL
============================================================= */
async function openAddRowModal(tableKey, onDone, opts){
  const def = TABLES[tableKey];
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  const vesselOptions = (tableKey === 'driverKPI' || tableKey === 'maintenanceLog') ? await getVesselOptions() : null;
  const truckFieldId = TRUCK_DROPDOWN_FIELDS[tableKey];
  const truckOptions = truckFieldId ? await getTruckOptions() : null;
  const safetyAssetOptions = tableKey === 'safetyEquipment' ? await getSafetyEquipmentAssetOptions() : null;
  const driverFieldId = DRIVER_DROPDOWN_FIELDS[tableKey];
  const driverOptions = driverFieldId ? await getDriverOptions() : null;

  let fields = '';
  const formCols = (tableKey === 'staffDatabase')
    ? STAFF_FORM_FIELDS.map(id => def.columns.find(x => x.id === id)).filter(Boolean)
    : def.columns;
  formCols.forEach(c => {
    if (tableKey === 'feg' && String(c.type || '').startsWith('computed-')) return;
    if ((tableKey === 'operationKPI' && OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'containerOperationKPI' && CONTAINER_OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'driverKPI' && DR_AUTO_FIELDS.includes(c.id)) || (tableKey === 'mileage' && MILEAGE_AUTO_FIELDS.includes(c.id)) || (tableKey === 'staffDatabase' && (STAFF_AUTO_FIELDS.includes(c.id) || STAFF_FORM_HIDDEN.includes(c.id))) || (tableKey === 'safetyEquipment' && ['inspectionDate','firstAid','triangle','cone','wheelChock','reflectiveString','torchlight','helmet','safetyShoes','reflectiveVest'].includes(c.id)) || (tableKey === 'maintenanceLog' && MAINT_AUTO_FIELDS.includes(c.id)) || (tableKey === 'machineryLog' && MACHINERY_AUTO_FIELDS.includes(c.id)) || (tableKey === 'speedingIdling' && SPEEDING_AUTO_FIELDS.includes(c.id)) || (tableKey === 'notificationContact' && (c.id === 'designation' || c.id === 'phone'))) return;
    if (c.id === 'vessel' && vesselOptions){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${vesselOptions.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (c.id === truckFieldId && truckOptions){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${truckOptions.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (c.id === driverFieldId && driverOptions){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${driverOptions.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (COMBO_OPTION_FIELDS[tableKey] && COMBO_OPTION_FIELDS[tableKey].includes(c.id)){
      fields += buildComboField(c);
    } else if (FIXED_PICKER_FIELDS[tableKey] && FIXED_PICKER_FIELDS[tableKey].includes(c.id)){
      fields += buildFixedPickerField(c);
    } else if (c.type === 'select'){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${c.options.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (c.type === 'badge'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text" placeholder="status..."></div>`;
    } else if (c.type === 'ic'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text" placeholder="900101-14-5678" maxlength="14"></div>`;
    } else if (c.type === 'phone'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text" placeholder="012-345 6789" maxlength="13"></div>`;
    } else if (c.type === 'date'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="date"></div>`;
    } else if (c.type === 'time'){
      fields += `<div class="formfield"><label>${c.label}</label><div class="time-input"><input data-col="${c.id}" type="time"></div></div>`;
    } else if (c.type === 'number' || c.type === 'money'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="number" step="any"></div>`;
    } else if (c.type === 'pct'){
      fields += `<div class="formfield"><label>${c.label} (%)</label><input data-col="${c.id}" type="number" step="any" placeholder="e.g. 85"></div>`;
    } else {
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text"></div>`;
    }
  });

  const twoBtn = !!(opts && opts.completeLabel);
  box.innerHTML = `
    <h4>Add ${def.label} Record</h4>
    <div class="formgrid">${fields}</div>
    <div class="modalfoot">
      <button class="btn" id="cancelModal">Cancel</button>
      <button class="btn${twoBtn ? '' : ' primary'}" id="saveModal">${twoBtn ? 'Save &amp; Return to List' : 'Save Record'}</button>
      ${twoBtn ? `<button class="btn primary" id="saveModalComplete">${opts.completeLabel}</button>` : ''}
    </div>
  `;
  overlay.classList.add('show');
  if (tableKey === 'operationKPI' || tableKey === 'containerOperationKPI') box.classList.add('opkpi-modal');
  def.columns.forEach(c => {
    if (c.type === 'ic'){
      const icEl = box.querySelector(`[data-col="${c.id}"]`);
      if (icEl) icEl.addEventListener('input', () => { icEl.value = formatIC(icEl.value); });
    }
    if (c.type === 'phone'){
      const phEl = box.querySelector(`[data-col="${c.id}"]`);
      if (phEl) phEl.addEventListener('input', () => { phEl.value = formatPhone(phEl.value); });
    }
  });
  if (tableKey === 'safetyEquipment'){ await wireSafetyEquipmentPickers(box); }
  if (tableKey === 'apadDocuments'){ await wireApadCategoryPicker(box); }
  if (tableKey === 'trailer'){ await wireTrailerPickers(box); }
  if (tableKey === 'primeMover'){ await wirePrimeMoverPickers(box); }
  if (tableKey === 'feg'){ await wireFegPickers(box); }
  if (tableKey === 'speedingIdling'){ await wireSpeedingPickers(box); }
  await wireComboFields(box, tableKey, def);
  wireFixedPickerFields(box, tableKey, def);
  if (tableKey === 'feg'){ await wireFegBranch(box); }
  if (tableKey === 'notificationContact'){ await wireNotificationContactNameBranch(box); }
  if (tableKey === 'whatsappGroups'){ await wireWhatsAppGroupsBranch(box); }

  const dateEl = box.querySelector('[data-col="date"]');
  const monthEl = box.querySelector('[data-col="month"]');
  const yearEl = box.querySelector('[data-col="year"]');
  const totalTruckEl = box.querySelector('[data-col="totalTruck"]');
  const repairEl = box.querySelector('[data-col="repairTruck"]');
  const activeEl = box.querySelector('[data-col="activeTruck"]');
  const utilEl = box.querySelector('[data-col="utilization"]');
  const startEl = box.querySelector('[data-col="operationStart"]');
  const endEl = box.querySelector('[data-col="operationEnd"]');
  const totalHoursEl = box.querySelector('[data-col="totalHours"]');
  const targetEl = box.querySelector('[data-col="targetTon"]');
  const actualEl = box.querySelector('[data-col="actualTon"]');
  const tonMetricEl = box.querySelector('[data-col="tonMetric"]');
  const achEl = box.querySelector('[data-col="achievement"]');
  const sumEl = box.querySelector('[data-col="kpiSummary"]');

  function toMonthName(date){
    try{
      const d = new Date(date);
      return d.toLocaleString('en-GB', {month:'long'});
    }catch(e){ return ''; }
  }

  function setReadonlyIf(el){ if (el) el.readOnly = true; }
  if (tableKey === 'operationKPI') {
    [monthEl, yearEl, activeEl, utilEl, achEl, sumEl, totalHoursEl, tonMetricEl].forEach(setReadonlyIf);
  }

  if (dateEl && !dateEl.value){
    const today = new Date();
    dateEl.value = today.toISOString().slice(0,10);
    if (monthEl) monthEl.value = toMonthName(dateEl.value);
    if (yearEl) yearEl.value = new Date(dateEl.value).getFullYear();
  } else if (dateEl && dateEl.value){
    if (monthEl) monthEl.value = toMonthName(dateEl.value);
    if (yearEl) yearEl.value = new Date(dateEl.value).getFullYear();
  }

  function parseTime(t){
    if (!t) return null;
    const m = t.split(':');
    if (m.length < 2) return null;
    return parseInt(m[0],10)*60 + parseInt(m[1],10);
  }
  function computeHours(start, end){
    const s = parseTime(start);
    const e = parseTime(end);
    if (s == null || e == null) return null;
    let diff = e - s;
    if (diff < 0) diff += 24*60;
    const hrs = Math.floor(diff/60);
    const mins = diff % 60;
    return String(hrs).padStart(2,'0') + ':' + String(mins).padStart(2,'0');
  }

  function updateComputed(){
    const totalTruck = totalTruckEl ? parseFloat(totalTruckEl.value) || 0 : 0;
    const repair = repairEl ? parseFloat(repairEl.value) || 0 : 0;
    const active = Math.max(0, totalTruck - repair);
    if (activeEl) activeEl.value = active;

    if (utilEl){
      if (active > 0){
        const util = (active - repair) / active;
        utilEl.value = isFinite(util) ? (Math.round(util * 10000) / 100) : '';
      } else {
        utilEl.value = '';
      }
    }

    if (totalHoursEl){
      const hrs = computeHours(startEl ? startEl.value : '', endEl ? endEl.value : '');
      totalHoursEl.value = hrs == null ? '' : hrs;
    }

    if (tonMetricEl){
      const actual = actualEl ? parseFloat(actualEl.value) || 0 : 0;
      tonMetricEl.value = actual ? (Math.round((actual / 1000) * 100) / 100) : '';
    }

    if (achEl){
      const actual = actualEl ? parseFloat(actualEl.value) || 0 : 0;
      const target = targetEl ? parseFloat(targetEl.value) || 0 : 0;
      if (target > 0){
        const ach = actual / target;
        achEl.value = isFinite(ach) ? (Math.round(ach * 10000) / 100) : '';
        if (sumEl){
          if (ach < 0.8) sumEl.value = 'Below 80%';
          else if (ach < 0.9) sumEl.value = 'Below 90%';
          else if (ach < 1.0) sumEl.value = 'Below 100%';
          else sumEl.value = 'Above 100%';
        }
      } else {
        achEl.value = '';
        if (sumEl) sumEl.value = '';
      }
    }
  }

  if (dateEl){
    dateEl.addEventListener('change', () => {
      if (monthEl) monthEl.value = toMonthName(dateEl.value);
      if (yearEl) yearEl.value = new Date(dateEl.value).getFullYear();
    });
  }

  if (totalTruckEl) totalTruckEl.addEventListener('input', updateComputed);
  if (repairEl) repairEl.addEventListener('input', updateComputed);
  if (startEl) startEl.addEventListener('input', updateComputed);
  if (endEl) endEl.addEventListener('input', updateComputed);
  if (targetEl) targetEl.addEventListener('input', updateComputed);
  if (actualEl) actualEl.addEventListener('input', updateComputed);

  updateComputed();

  box.querySelector('#cancelModal').onclick = () => { overlay.classList.remove('show'); if (box.classList.contains('opkpi-modal')) box.classList.remove('opkpi-modal'); };

  async function commitAddRow(){
    const newRow = {};
    const autos = (tableKey === 'operationKPI') ? computeOperationKPIAutos(box) : (tableKey === 'containerOperationKPI') ? computeContainerOperationKPIAutos(box) : (tableKey === 'driverKPI') ? computeDriverKPIAutos(box) : (tableKey === 'mileage') ? computeMileageAutos(box) : {};
    def.columns.forEach(c => {
      if ((tableKey === 'operationKPI' && OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'containerOperationKPI' && CONTAINER_OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'driverKPI' && DR_AUTO_FIELDS.includes(c.id)) || (tableKey === 'mileage' && MILEAGE_AUTO_FIELDS.includes(c.id))){
        newRow[c.id] = autos[c.id];
        return;
      }
      const el = box.querySelector(`[data-col="${c.id}"]`);
      let v = el ? el.value : '';
      if (c.type === 'pct' && v !== '') v = parseFloat(v) / 100;
      if ((c.type === 'number' || c.type === 'money') && v !== '') v = parseFloat(v);
      if (c.type === 'ic' && v) v = formatIC(v);
      if (c.type === 'phone' && v) v = formatPhone(v);
      newRow[c.id] = v;
    });
    if (tableKey === 'notificationContact'){
      newRow.designation = await staffDesignationFor(newRow.name, newRow.branch);
      newRow.phone       = await staffPhoneFor(newRow.name, newRow.branch);
    }
    const data = await getData(tableKey);
    data.unshift(newRow);
    await persist(tableKey);
    overlay.classList.remove('show');
    if (box.classList.contains('opkpi-modal')) box.classList.remove('opkpi-modal');
  }

  box.querySelector('#saveModal').onclick = async () => {
    await commitAddRow();
    if (onDone) onDone();
  };

  const completeBtn = box.querySelector('#saveModalComplete');
  if (completeBtn) completeBtn.onclick = async () => {
    await commitAddRow();
    if (opts && opts.onComplete) opts.onComplete();
    else if (onDone) onDone();
  };
}

/* ============================================================
   OPEN EDIT ROW MODAL
============================================================= */
async function openEditRowModal(tableKey, idx, onDone, opts){
  const def = TABLES[tableKey];
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  const dataForVessel = await getData(tableKey);
  const rowForVessel = (dataForVessel && dataForVessel[idx]) ? dataForVessel[idx] : {};
  let vesselOptions = (tableKey === 'driverKPI' || tableKey === 'maintenanceLog') ? await getVesselOptions() : null;
  if (vesselOptions && rowForVessel.vessel && !vesselOptions.includes(rowForVessel.vessel)){
    vesselOptions = [...vesselOptions, rowForVessel.vessel].sort();
  }
  const truckFieldId = TRUCK_DROPDOWN_FIELDS[tableKey];
  let truckOptions = truckFieldId ? await getTruckOptions() : null;
  if (truckOptions && rowForVessel[truckFieldId] && !truckOptions.includes(rowForVessel[truckFieldId])){
    truckOptions = [...truckOptions, rowForVessel[truckFieldId]].sort();
  }
  const driverFieldId = DRIVER_DROPDOWN_FIELDS[tableKey];
  let driverOptions = driverFieldId ? await getDriverOptions() : null;
  if (driverOptions && rowForVessel[driverFieldId] && !driverOptions.includes(rowForVessel[driverFieldId])){
    driverOptions = [...driverOptions, rowForVessel[driverFieldId]].sort();
  }
  let safetyAssetOptions = tableKey === 'safetyEquipment' ? await getSafetyEquipmentAssetOptions() : null;
  if (safetyAssetOptions && rowForVessel.asset && !safetyAssetOptions.includes(rowForVessel.asset)){
    safetyAssetOptions = [...safetyAssetOptions, rowForVessel.asset];
  }

  let fields = '';
  const formCols = (tableKey === 'staffDatabase')
    ? STAFF_FORM_FIELDS.map(id => def.columns.find(x => x.id === id)).filter(Boolean)
    : def.columns;
  formCols.forEach(c => {
    if ((tableKey === 'operationKPI' && OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'containerOperationKPI' && CONTAINER_OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'driverKPI' && DR_AUTO_FIELDS.includes(c.id)) || (tableKey === 'mileage' && MILEAGE_AUTO_FIELDS.includes(c.id)) || (tableKey === 'staffDatabase' && (STAFF_AUTO_FIELDS.includes(c.id) || STAFF_FORM_HIDDEN.includes(c.id))) || (tableKey === 'safetyEquipment' && ['inspectionDate','firstAid','triangle','cone','wheelChock','reflectiveString','torchlight','helmet','safetyShoes','reflectiveVest'].includes(c.id)) || (tableKey === 'maintenanceLog' && MAINT_AUTO_FIELDS.includes(c.id)) || (tableKey === 'machineryLog' && MACHINERY_AUTO_FIELDS.includes(c.id)) || (tableKey === 'speedingIdling' && SPEEDING_AUTO_FIELDS.includes(c.id)) || (tableKey === 'notificationContact' && (c.id === 'designation' || c.id === 'phone'))) return;
    if (c.id === 'vessel' && vesselOptions){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${vesselOptions.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (c.id === truckFieldId && truckOptions){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${truckOptions.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (c.id === driverFieldId && driverOptions){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${driverOptions.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (COMBO_OPTION_FIELDS[tableKey] && COMBO_OPTION_FIELDS[tableKey].includes(c.id)){
      fields += buildComboField(c);
    } else if (FIXED_PICKER_FIELDS[tableKey] && FIXED_PICKER_FIELDS[tableKey].includes(c.id)){
      fields += buildFixedPickerField(c);
    } else if (c.type === 'select'){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${c.options.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (c.type === 'badge'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text" placeholder="status..."></div>`;
    } else if (c.type === 'ic'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text" placeholder="900101-14-5678" maxlength="14"></div>`;
    } else if (c.type === 'phone'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text" placeholder="012-345 6789" maxlength="13"></div>`;
    } else if (c.type === 'date'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="date"></div>`;
    } else if (c.type === 'time'){
      fields += `<div class="formfield"><label>${c.label}</label><div class="time-input"><input data-col="${c.id}" type="time"></div></div>`;
    } else if (c.type === 'number' || c.type === 'money'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="number" step="any"></div>`;
    } else if (c.type === 'pct'){
      fields += `<div class="formfield"><label>${c.label} (%)</label><input data-col="${c.id}" type="number" step="any" placeholder="e.g. 85"></div>`;
    } else {
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text"></div>`;
    }
  });

  box.innerHTML = `
    <h4>Edit ${def.label} Record</h4>
    <div class="formgrid">${fields}</div>
    <div id="pmDocUpdatePanel"></div>
    <div class="modalfoot">
      <button class="btn" id="cancelModal">Cancel</button>
      <button class="btn primary" id="saveModal">Save Record</button>
    </div>
  `;
  overlay.classList.add('show');
  if (tableKey === 'operationKPI' || tableKey === 'containerOperationKPI') box.classList.add('opkpi-modal');
  def.columns.forEach(c => {
    if (c.type === 'ic'){
      const icEl = box.querySelector(`[data-col="${c.id}"]`);
      if (icEl) icEl.addEventListener('input', () => { icEl.value = formatIC(icEl.value); });
    }
    if (c.type === 'phone'){
      const phEl = box.querySelector(`[data-col="${c.id}"]`);
      if (phEl) phEl.addEventListener('input', () => { phEl.value = formatPhone(phEl.value); });
    }
  });
  await wireComboFields(box, tableKey, def);

  const dateEl = box.querySelector('[data-col="date"]');
  const monthEl = box.querySelector('[data-col="month"]');
  const yearEl = box.querySelector('[data-col="year"]');
  const totalTruckEl = box.querySelector('[data-col="totalTruck"]');
  const repairEl = box.querySelector('[data-col="repairTruck"]');
  const activeEl = box.querySelector('[data-col="activeTruck"]');
  const utilEl = box.querySelector('[data-col="utilization"]');
  const startEl = box.querySelector('[data-col="operationStart"]');
  const endEl = box.querySelector('[data-col="operationEnd"]');
  const totalHoursEl = box.querySelector('[data-col="totalHours"]');
  const targetEl = box.querySelector('[data-col="targetTon"]');
  const actualEl = box.querySelector('[data-col="actualTon"]');
  const tonMetricEl = box.querySelector('[data-col="tonMetric"]');
  const achEl = box.querySelector('[data-col="achievement"]');
  const sumEl = box.querySelector('[data-col="kpiSummary"]');

  function toMonthName(date){ try{ const d = new Date(date); return d.toLocaleString('en-GB', {month:'long'}); }catch(e){ return ''; } }
  function setReadonlyIf(el){ if (el) el.readOnly = true; }
  if (tableKey === 'operationKPI') {
    [monthEl, yearEl, activeEl, utilEl, achEl, sumEl, totalHoursEl, tonMetricEl].forEach(setReadonlyIf);
  }

  const data = await getData(tableKey);
  const row = (data && data[idx]) ? data[idx] : {};
  def.columns.forEach(c => {
    const el = box.querySelector(`[data-col="${c.id}"]`);
    if (!el) return;
    let v = row[c.id];
    if (c.type === 'pct'){
      el.value = (v === '' || v == null) ? '' : (parseFloat(v) * 100);
    } else {
      el.value = (v === undefined || v === null) ? '' : v;
    }
  });
  if (tableKey === 'safetyEquipment'){ await wireSafetyEquipmentPickers(box); }
  if (tableKey === 'apadDocuments'){ await wireApadCategoryPicker(box); }
  if (tableKey === 'trailer'){ await wireTrailerPickers(box); }
  if (tableKey === 'primeMover'){ await wirePrimeMoverPickers(box); }
  if (tableKey === 'feg'){ await wireFegPickers(box); }
  if (tableKey === 'speedingIdling'){ await wireSpeedingPickers(box); }
  wireFixedPickerFields(box, tableKey, def);
  if (tableKey === 'notificationContact'){ await wireNotificationContactNameBranch(box); }
  if (tableKey === 'whatsappGroups'){ await wireWhatsAppGroupsBranch(box); }

  let pmDocRadioValue = '';
  if (tableKey === 'primeMover' || tableKey === 'trailer' || tableKey === 'staffDatabase'){
    const isPm = (tableKey === 'primeMover');
    const isTl = (tableKey === 'trailer');
    const docFieldMap  = isPm ? PM_DOC_FIELD_MAP  : (isTl ? TL_DOC_FIELD_MAP  : ST_DOC_FIELD_MAP);
    const docChangedFn = isPm ? pmDocSlotsChanged : (isTl ? tlDocSlotsChanged : stDocSlotsChanged);
    const docLabelFn   = isPm ? pmDocSlotLabel    : (isTl ? tlDocSlotLabel    : stDocSlotLabel);

    const docPanel = box.querySelector('#pmDocUpdatePanel');
    const saveBtn  = box.querySelector('#saveModal');
    const snapshot = {};
    Object.keys(docFieldMap).forEach(f => { snapshot[f] = (row[f] == null) ? '' : String(row[f]); });

    function readDocInputs(){
      const out = {};
      Object.keys(docFieldMap).forEach(f => {
        const el = box.querySelector(`[data-col="${f}"]`);
        if (!el) return;
        out[f] = String(el.value || '');
      });
      return out;
    }

    function refreshDocPanel(){
      const slots = docChangedFn(snapshot, Object.assign({}, snapshot, readDocInputs()));
      if (!slots.length){
        docPanel.innerHTML = '';
        docPanel.dataset.rendered = '';
        pmDocRadioValue = '';
        saveBtn.disabled = false;
        return;
      }
      if (docPanel.dataset.rendered !== slots.join(',')){
        docPanel.dataset.rendered = slots.join(',');
        docPanel.innerHTML = `
          <div class="pm-docupd">
            <div class="pm-docupd-head">Document update &mdash; <strong>${slots.map(docLabelFn).join(', ')}</strong></div>
            <label class="pm-docupd-opt">
              <input type="radio" name="pmDocUpdateMode" value="correction_only">
              <span><b>Correction Only</b><small>I am fixing a mistake. The existing document is still valid.</small></span>
            </label>
            <label class="pm-docupd-opt">
              <input type="radio" name="pmDocUpdateMode" value="document_renewal">
              <span><b>Document Renewal / Update</b><small>This information comes from a new or renewed document.</small></span>
            </label>
            <div class="pm-docupd-hint">You must choose one option before saving.</div>
          </div>`;
        docPanel.querySelectorAll('input[name="pmDocUpdateMode"]').forEach(r => {
          r.addEventListener('change', () => { pmDocRadioValue = r.value; saveBtn.disabled = false; });
        });
        pmDocRadioValue = '';
        saveBtn.disabled = true;
      }
    }

    const grid = box.querySelector('.formgrid');
    if (grid){
      grid.addEventListener('input', refreshDocPanel);
      grid.addEventListener('change', refreshDocPanel);
    }
    refreshDocPanel();
  }

  if (dateEl && dateEl.value){
    if (monthEl) monthEl.value = toMonthName(dateEl.value);
    if (yearEl) yearEl.value = new Date(dateEl.value).getFullYear();
  } else if (dateEl){
    const today = new Date();
    dateEl.value = today.toISOString().slice(0,10);
    if (monthEl) monthEl.value = toMonthName(dateEl.value);
    if (yearEl) yearEl.value = new Date(dateEl.value).getFullYear();
  }

  function parseTime(t){
    if (!t) return null;
    const m = t.split(':');
    if (m.length < 2) return null;
    return parseInt(m[0],10)*60 + parseInt(m[1],10);
  }
  function computeHours(start, end){
    const s = parseTime(start);
    const e = parseTime(end);
    if (s == null || e == null) return null;
    let diff = e - s;
    if (diff < 0) diff += 24*60;
    const hrs = Math.floor(diff/60);
    const mins = diff % 60;
    return String(hrs).padStart(2,'0') + ':' + String(mins).padStart(2,'0');
  }

  function updateComputed(){
    const totalTruck = totalTruckEl ? parseFloat(totalTruckEl.value) || 0 : 0;
    const repair = repairEl ? parseFloat(repairEl.value) || 0 : 0;
    const active = Math.max(0, totalTruck - repair);
    if (activeEl) activeEl.value = active;
    if (utilEl){
      if (active > 0){
        const util = (active - repair) / active;
        utilEl.value = isFinite(util) ? (Math.round(util * 10000) / 100) : '';
      } else {
        utilEl.value = '';
      }
    }
    if (totalHoursEl){
      const hrs = computeHours(startEl ? startEl.value : '', endEl ? endEl.value : '');
      totalHoursEl.value = hrs == null ? '' : hrs;
    }
    if (tonMetricEl){
      const actual = actualEl ? parseFloat(actualEl.value) || 0 : 0;
      tonMetricEl.value = actual ? (Math.round((actual / 1000) * 100) / 100) : '';
    }
    if (achEl){
      const actual = actualEl ? parseFloat(actualEl.value) || 0 : 0;
      const target = targetEl ? parseFloat(targetEl.value) || 0 : 0;
      if (target > 0){
        const ach = actual / target;
        achEl.value = isFinite(ach) ? (Math.round(ach * 10000) / 100) : '';
        if (sumEl){
          if (ach < 0.8) sumEl.value = 'Below 80%';
          else if (ach < 0.9) sumEl.value = 'Below 90%';
          else if (ach < 1.0) sumEl.value = 'Below 100%';
          else sumEl.value = 'Above 100%';
        }
      } else {
        achEl.value = '';
        if (sumEl) sumEl.value = '';
      }
    }
  }

  if (dateEl){
    dateEl.addEventListener('change', () => {
      if (monthEl) monthEl.value = toMonthName(dateEl.value);
      if (yearEl) yearEl.value = new Date(dateEl.value).getFullYear();
    });
  }
  if (totalTruckEl) totalTruckEl.addEventListener('input', updateComputed);
  if (repairEl) repairEl.addEventListener('input', updateComputed);
  if (startEl) startEl.addEventListener('input', updateComputed);
  if (endEl) endEl.addEventListener('input', updateComputed);
  if (targetEl) targetEl.addEventListener('input', updateComputed);
  if (actualEl) actualEl.addEventListener('input', updateComputed);

  updateComputed();

  box.querySelector('#cancelModal').onclick = () => { overlay.classList.remove('show'); if (box.classList.contains('opkpi-modal')) box.classList.remove('opkpi-modal'); };
  box.querySelector('#saveModal').onclick = async () => {
    const newRow = {};
    const autos = (tableKey === 'operationKPI') ? computeOperationKPIAutos(box) : (tableKey === 'containerOperationKPI' ? computeContainerOperationKPIAutos(box) : (tableKey === 'driverKPI' ? computeDriverKPIAutos(box) : (tableKey === 'mileage' ? computeMileageAutos(box) : {})));
    def.columns.forEach(c => {
      if (tableKey === 'trailer' && c.id === 'assignedPrimeMover') return;
      if ((tableKey === 'operationKPI' && OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'containerOperationKPI' && CONTAINER_OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'driverKPI' && DR_AUTO_FIELDS.includes(c.id)) || (tableKey === 'mileage' && MILEAGE_AUTO_FIELDS.includes(c.id))){
        newRow[c.id] = autos[c.id];
        return;
      }
      const el = box.querySelector(`[data-col="${c.id}"]`);
      if (!el) return;
      let v = el.value;
      if (c.type === 'pct' && v !== '') v = parseFloat(v) / 100;
      if ((c.type === 'number' || c.type === 'money') && v !== '') v = parseFloat(v);
      if (c.type === 'ic' && v) v = formatIC(v);
      if (c.type === 'phone' && v) v = formatPhone(v);
      newRow[c.id] = v;
    });
    if (tableKey === 'notificationContact'){
      newRow.designation = await staffDesignationFor(newRow.name, newRow.branch);
      newRow.phone       = await staffPhoneFor(newRow.name, newRow.branch);
    }
    let docUpdate = null;
    if (tableKey === 'primeMover' || tableKey === 'trailer' || tableKey === 'staffDatabase'){
      const docChangedFn = (tableKey === 'primeMover') ? pmDocSlotsChanged
                         : (tableKey === 'trailer')    ? tlDocSlotsChanged
                         : stDocSlotsChanged;
      const slots = docChangedFn(row, Object.assign({}, row, newRow));
      if (slots.length){
        if (!pmDocRadioValue){ alert('Please choose Correction Only or Document Renewal / Update.'); return; }
        docUpdate = { slots, mode: pmDocRadioValue };
      }
    }
    const data = await getData(tableKey);
    data[idx] = Object.assign({}, data[idx], newRow);
    if (docUpdate){
      data[idx].docs = pmApplyDocUpdateMode(data[idx].docs, docUpdate.slots, docUpdate.mode);
    }
    await persist(tableKey);
    overlay.classList.remove('show');
    if (box.classList.contains('opkpi-modal')) box.classList.remove('opkpi-modal');
    if (opts && typeof opts.onAfterSaveEdit === 'function'){
      await opts.onAfterSaveEdit({
        slots: docUpdate ? docUpdate.slots : [],
        mode:  docUpdate ? docUpdate.mode  : '',
        lorry: data[idx] ? data[idx].lorry : '',
        assetId: data[idx] ? data[idx].assetId : '',
        index: idx,
      });
    } else if (onDone){
      onDone();
    }
  };
}

document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay'){
    e.currentTarget.classList.remove('show');
    const box = document.getElementById('modalBox');
    if (box && box.classList.contains('opkpi-modal')) box.classList.remove('opkpi-modal');
  }
});

/* ============================================================
   PM / TL / ST / FEG DOC HELPERS
============================================================= */
function pmNewId(){
  try{ if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); }catch(e){}
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function pmDocMeta(truck, slotId){
  const docs = (truck && truck.docs && typeof truck.docs === 'object' && !Array.isArray(truck.docs)) ? truck.docs : {};
  const doc  = (docs[slotId] && typeof docs[slotId] === 'object') ? docs[slotId] : {};
  const hasFile = !!(doc.fileName || doc.storagePath);
  let status = doc.status;
  if (status !== 'current' && status !== 'pending_upload' && status !== 'missing'){
    status = hasFile ? 'current' : 'missing';
  }
  if (status === 'current' && !hasFile) status = 'missing';
  return { doc, hasFile, status, pending: status === 'pending_upload' };
}

function pmDocSlotLabel(slotId){
  const s = PM_DOCUMENT_SLOTS.find(x => x.id === slotId);
  return s ? s.label : slotId;
}

function tlDocSlotLabel(slotId){
  const s = TL_DOCUMENT_SLOTS.find(x => x.id === slotId);
  return s ? s.label : slotId;
}

function stDocSlotLabel(slotId){
  const s = ST_DOCUMENT_SLOTS.find(x => x.id === slotId);
  return s ? s.label : slotId;
}

function fegDocSlotLabel(slotId){
  const s = FEG_DOCUMENT_SLOTS.find(x => x.id === slotId);
  return s ? s.label : slotId;
}

function pmApplyDocUpdateMode(truckDocs, slots, mode){
  const docs = (truckDocs && typeof truckDocs === 'object' && !Array.isArray(truckDocs)) ? {...truckDocs} : {};
  slots.forEach(slotId => {
    const cur = (docs[slotId] && typeof docs[slotId] === 'object' && !Array.isArray(docs[slotId])) ? {...docs[slotId]} : {};
    cur.updateMode = mode;
    if (mode === 'document_renewal'){
      cur.status = 'pending_upload';
      cur.pendingSince = new Date().toISOString();
    } else {
      cur.status = cur.fileName ? 'current' : 'missing';
      delete cur.pendingSince;
    }
    docs[slotId] = cur;
  });
  return docs;
}

function pmDocSlotsChanged(prevRow, nextRow){
  const out = [];
  Object.keys(PM_DOC_FIELD_MAP).forEach(field => {
    const a = (prevRow && prevRow[field] != null) ? String(prevRow[field]) : '';
    const b = (nextRow && nextRow[field] != null) ? String(nextRow[field]) : '';
    if (a !== b){
      const slot = PM_DOC_FIELD_MAP[field];
      if (!out.includes(slot)) out.push(slot);
    }
  });
  return out;
}

function tlDocSlotsChanged(prevRow, nextRow){
  const out = [];
  Object.keys(TL_DOC_FIELD_MAP).forEach(field => {
    const a = (prevRow && prevRow[field] != null) ? String(prevRow[field]) : '';
    const b = (nextRow && nextRow[field] != null) ? String(nextRow[field]) : '';
    if (a !== b){
      const slot = TL_DOC_FIELD_MAP[field];
      if (!out.includes(slot)) out.push(slot);
    }
  });
  return out;
}

function stDocSlotsChanged(prevRow, nextRow){
  const out = [];
  Object.keys(ST_DOC_FIELD_MAP).forEach(field => {
    const a = (prevRow && prevRow[field] != null) ? String(prevRow[field]) : '';
    const b = (nextRow && nextRow[field] != null) ? String(nextRow[field]) : '';
    if (a !== b){
      const slot = ST_DOC_FIELD_MAP[field];
      if (!out.includes(slot)) out.push(slot);
    }
  });
  return out;
}

/* ============================================================
   PM / TL / ST / FEG SCROLLABLE HELPERS
============================================================= */
function foccScrollables(){
  const out = [];
  try{
    document.querySelectorAll('#content *').forEach(el => {
      const scrollable = (el.scrollWidth  > el.clientWidth  + 1) ||
                         (el.scrollHeight > el.clientHeight + 1);
      if (scrollable) out.push(el);
    });
  }catch(e){}
  return out;
}

function foccCaptureScroll(){
  return {
    win: window.scrollY || window.pageYOffset || 0,
    els: foccScrollables().map(el => ({ left: el.scrollLeft, top: el.scrollTop })),
  };
}

function foccRestoreScroll(saved){
  if (!saved) return;
  const apply = () => {
    try{
      const now = foccScrollables();
      saved.els.forEach((v, i) => {
        const el = now[i];
        if (!el) return;
        if (v.left) el.scrollLeft = v.left;
        if (v.top)  el.scrollTop  = v.top;
      });
      window.scrollTo(0, saved.win);
    }catch(e){}
  };
  requestAnimationFrame(() => { apply(); requestAnimationFrame(apply); });
}

function foccRouteFromHash(){
  const raw = String(location.hash || '').replace(/^#\/?/, '').trim();
  if (!raw) return '';
  try{ return decodeURIComponent(raw); }
  catch(e){ return raw; }
}

/* ============================================================
   KPI AUTO-COMPUTE
============================================================= */
function computeDriverKPIAutos(box){
  const dateEl = box.querySelector('[data-col="date"]');
  const dateVal = dateEl ? dateEl.value : '';
  const month = dateVal ? (new Date(dateVal)).toLocaleString('en-GB', {month:'long'}) : '';
  const year = dateVal ? String(new Date(dateVal).getFullYear()) : '';

  const targetTripEl = box.querySelector('[data-col="targetTrip"]');
  const lostTripEl = box.querySelector('[data-col="lostTrip"]');
  const actualEl = box.querySelector('[data-col="actualTrip"]');
  const targetEl = box.querySelector('[data-col="adjTarget"]');

  const targetTrip = targetTripEl ? (parseFloat(targetTripEl.value) || 0) : 0;
  const lostTrip = lostTripEl ? (parseFloat(lostTripEl.value) || 0) : 0;
  const adjTarget = Math.max(0, targetTrip - lostTrip);

  if (targetEl) targetEl.value = adjTarget;

  const actual = actualEl ? (parseFloat(actualEl.value) || 0) : 0;
  const target = adjTarget;
  const productivity = (target > 0) ? (actual / target) : 0;
  return { month, year, adjTarget, productivity };
}

function computeMileageAutos(box){
  const startEl = box.querySelector('[data-col="startMileage"]');
  const endEl = box.querySelector('[data-col="endMileage"]');
  const startMileage = startEl ? (parseFloat(startEl.value) || 0) : 0;
  const endMileage = endEl ? (parseFloat(endEl.value) || 0) : 0;
  return { totalMileage: Math.max(0, endMileage - startMileage) };
}

function parseTimeHM(t){
  if (!t) return null;
  const m = t.split(':');
  if (m.length < 2) return null;
  return parseInt(m[0],10)*60 + parseInt(m[1],10);
}

function computeMinutesHM(start, end){
  const s = parseTimeHM(start);
  const e = parseTimeHM(end);
  if (s == null || e == null) return null;
  let diff = e - s;
  if (diff < 0) diff += 24*60;
  return diff;
}

function minutesToHHMM(mins){
  if (mins == null) return null;
  const h = Math.floor(mins/60);
  const m = mins % 60;
  return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
}

function computeOperationKPIAutos(box){
  const dateEl = box.querySelector('[data-col="date"]');
  const totalTruckEl = box.querySelector('[data-col="totalTruck"]');
  const repairEl = box.querySelector('[data-col="repairTruck"]');
  const startEl = box.querySelector('[data-col="operationStart"]');
  const endEl = box.querySelector('[data-col="operationEnd"]');
  const targetEl = box.querySelector('[data-col="targetTon"]');
  const actualEl = box.querySelector('[data-col="actualTon"]');

  const dateVal = dateEl ? dateEl.value : '';
  const month = (dateVal) ? (new Date(dateVal)).toLocaleString('en-GB', {month:'long'}) : '';
  const year = dateVal ? String(new Date(dateVal).getFullYear()) : '';

  const totalTruck = totalTruckEl ? (parseFloat(totalTruckEl.value) || 0) : 0;
  const repair = repairEl ? (parseFloat(repairEl.value) || 0) : 0;
  const active = Math.max(0, totalTruck - repair);
  const utilization = (active > 0) ? ((active - repair) / active) : 0;

  const start = startEl ? startEl.value : '';
  const end = endEl ? endEl.value : '';
  const mins = computeMinutesHM(start, end);
  const totalHours = mins == null ? '' : minutesToHHMM(mins);

  const actual = actualEl ? (parseFloat(actualEl.value) || 0) : 0;
  const target = targetEl ? (parseFloat(targetEl.value) || 0) : 0;
  const tonMetric = actual / 1000;
  const achievement = (target > 0) ? (actual / target) : 0;
  let kpiSummary = '';
  if (target > 0){
    if (achievement < 0.8) kpiSummary = 'Below 80%';
    else if (achievement < 0.9) kpiSummary = 'Below 90%';
    else if (achievement < 1.0) kpiSummary = 'Below 100%';
    else kpiSummary = 'Above 100%';
  }

  return { month, year, activeTruck: active, utilization, totalHours, achievement, kpiSummary, tonMetric };
}

function computeContainerOperationKPIAutos(box){
  const dateEl = box.querySelector('[data-col="date"]');
  const totalTruckEl = box.querySelector('[data-col="totalTruck"]');
  const repairEl = box.querySelector('[data-col="repairTruck"]');
  const startEl = box.querySelector('[data-col="operationStart"]');
  const endEl = box.querySelector('[data-col="operationEnd"]');
  const totalOrderEl = box.querySelector('[data-col="totalOrder"]');
  const actualCompleteEl = box.querySelector('[data-col="actualComplete"]');

  const dateVal = dateEl ? dateEl.value : '';
  const month = (dateVal) ? (new Date(dateVal)).toLocaleString('en-GB', {month:'long'}) : '';
  const year = dateVal ? String(new Date(dateVal).getFullYear()) : '';

  const totalTruck = totalTruckEl ? (parseFloat(totalTruckEl.value) || 0) : 0;
  const repair = repairEl ? (parseFloat(repairEl.value) || 0) : 0;
  const active = Math.max(0, totalTruck - repair);
  const utilization = (active > 0) ? ((active - repair) / active) : 0;

  const start = startEl ? startEl.value : '';
  const end = endEl ? endEl.value : '';
  const mins = computeMinutesHM(start, end);
  const totalHours = mins == null ? '' : minutesToHHMM(mins);

  const totalOrder = totalOrderEl ? (parseFloat(totalOrderEl.value) || 0) : 0;
  const actualComplete = actualCompleteEl ? (parseFloat(actualCompleteEl.value) || 0) : 0;
  const achievement = (totalOrder > 0) ? (actualComplete / totalOrder) : 0;

  return { month, year, activeTruck: active, utilization, totalHours, achievement };
}

function recalcImportedRowAutos(tableKey, row){
  const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const dateMonthYear = d => {
    if (!d) return {month:'', year:''};
    const dt = new Date(`${String(d).slice(0,10)}T00:00:00`);
    if (isNaN(dt.getTime())) return {month:'', year:''};
    return {month: dt.toLocaleString('en-GB', {month:'long'}), year: String(dt.getFullYear())};
  };
  if (tableKey === 'operationKPI'){
    const {month, year} = dateMonthYear(row.date);
    const totalTruck = num(row.totalTruck), repair = num(row.repairTruck);
    const active = Math.max(0, totalTruck - repair);
    const utilization = active > 0 ? (active - repair) / active : 0;
    const mins = computeMinutesHM(row.operationStart, row.operationEnd);
    const totalHours = mins == null ? '' : minutesToHHMM(mins);
    const actual = num(row.actualTon), target = num(row.targetTon);
    const tonMetric = actual / 1000;
    const achievement = target > 0 ? actual / target : 0;
    let kpiSummary = '';
    if (target > 0){
      if (achievement < 0.8) kpiSummary = 'Below 80%';
      else if (achievement < 0.9) kpiSummary = 'Below 90%';
      else if (achievement < 1.0) kpiSummary = 'Below 100%';
      else kpiSummary = 'Above 100%';
    }
    Object.assign(row, {month, year, activeTruck: active, utilization, totalHours, achievement, kpiSummary, tonMetric});
  } else if (tableKey === 'containerOperationKPI'){
    const {month, year} = dateMonthYear(row.date);
    const totalTruck = num(row.totalTruck), repair = num(row.repairTruck);
    const active = Math.max(0, totalTruck - repair);
    const utilization = active > 0 ? (active - repair) / active : 0;
    const mins = computeMinutesHM(row.operationStart, row.operationEnd);
    const totalHours = mins == null ? '' : minutesToHHMM(mins);
    const totalOrder = num(row.totalOrder), actualComplete = num(row.actualComplete);
    const achievement = totalOrder > 0 ? actualComplete / totalOrder : 0;
    Object.assign(row, {month, year, activeTruck: active, utilization, totalHours, achievement});
  } else if (tableKey === 'driverKPI'){
    const {month, year} = dateMonthYear(row.date);
    const targetTrip = num(row.targetTrip), lostTrip = num(row.lostTrip);
    const adjTarget = Math.max(0, targetTrip - lostTrip);
    const actual = num(row.actualTrip);
    const productivity = adjTarget > 0 ? actual / adjTarget : 0;
    Object.assign(row, {month, year, adjTarget, productivity});
  } else if (tableKey === 'mileage'){
    const startMileage = num(row.startMileage), endMileage = num(row.endMileage);
    Object.assign(row, {totalMileage: Math.max(0, endMileage - startMileage)});
  }
  return row;
}