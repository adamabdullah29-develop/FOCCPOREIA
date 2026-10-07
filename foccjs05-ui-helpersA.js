/* =========================================================================
   FOCC — 05-ui-helpers.js
   Table engine, modal helpers, picker, combo fields.
   Ini fail BESAR — dipecahkan kepada beberapa bahagian dalam fail yang sama.
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
   Cari SEMUA storagePath dalam satu row (docs / units[].docs /
   serviceLog / apa-apa sahaja), pastikan tiada row LAIN yang
   masih menunjuk ke path itu, baru buang.
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
   renderDataPage — full data page dengan toolbar + filter + table
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