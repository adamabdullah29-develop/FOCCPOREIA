/* =========================================================================
   FOCC — 18-depot-layout.js
   Depot Layout Builder — setup block/slot ikut layout depot sendiri.
   ========================================================================= */

/* ============================================================
   LOAD/SAVE LAYOUT
============================================================= */

async function depotLayoutLoad(){
  try{
    const rows = await getData('depotLayout');
    if (Array.isArray(rows) && rows.length){
      return rows[0];
    }
  }catch(e){
    console.warn('depotLayoutLoad failed:', e);
  }
  // Default baru
  return {
    layoutId: 'layout-default',
    depotName: 'My Depot',
    blocks: [],
  };
}

async function depotLayoutSave(layout){
  try{
    DATA_CACHE.depotLayout = [layout];
    await persist('depotLayout');
    return true;
  }catch(e){
    console.error('depotLayoutSave failed:', e);
    throw e;
  }
}

/* ============================================================
   GENERATE BLOCK ID (stable)
============================================================= */

function depotGenerateBlockId(){
  return 'block-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

/* ============================================================
   VALIDATE BLOCK
============================================================= */

function depotValidateBlock(draft, existingBlocks, currentBlockId){
  const errors = [];
  const name = String(draft.name || '').trim().toUpperCase();
  const cols = parseInt(draft.cols, 10);
  const rows = parseInt(draft.rows, 10);
  const stackLimit = parseInt(draft.stackLimit, 10);

  if (!name) errors.push('Block name is required.');
  if (name.length > 3) errors.push('Block name max 3 characters (A, B, AB, etc).');
  if (!/^[A-Z0-9]+$/.test(name)) errors.push('Block name can only contain A-Z and 0-9.');

  // Check duplicate name (case-insensitive)
  const dup = (existingBlocks || []).find(b =>
    b.blockId !== currentBlockId &&
    String(b.name || '').toUpperCase() === name
  );
  if (dup) errors.push(`Block "${name}" already exists.`);

  if (!cols || cols < 1 || cols > 20) errors.push('Columns must be between 1 and 20.');
  if (!rows || rows < 1 || rows > 30) errors.push('Rows must be between 1 and 30.');
  if (!stackLimit || stackLimit < 1 || stackLimit > 5) errors.push('Stack limit must be between 1 and 5.');

  return errors;
}

/* ============================================================
   RENDER — MAIN PAGE
============================================================= */

async function renderDepotLayout(){
  const wrap = document.createElement('div');
  wrap.className = 'depot-layout-page';

  let layout = await depotLayoutLoad();
  let editing = false;
  let editorDraft = null;
  let editorOriginalId = null;

  function paint(){
    wrap.innerHTML = `
      <div class="skel-intro">
        <div class="skel-intro-text">
          <div class="skel-crumbs">
            <span>Depot</span><span class="sep">/</span><span class="current">Layout Builder</span>
          </div>
          <p>Define your depot blocks, rows and columns. This layout is used by the Depot Overview to draw the yard grid.</p>
        </div>
        <span class="skel-badge">${layout.blocks.length} block${layout.blocks.length === 1 ? '' : 's'}</span>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Depot Info</h3>
        </div>
        <div class="section-body">
          <div class="formgrid">
            <div class="formfield full">
              <label>Depot Name</label>
              <input type="text" id="depotNameInput" value="${escapeHtml(layout.depotName || '')}" placeholder="e.g. Kemaman Depot A">
            </div>
          </div>
          <div class="settings-note">This name appears at the top of the Depot Overview page.</div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Blocks</h3>
          <div class="spacer"></div>
          <button class="btn primary" id="addBlockBtn">+ Add Block</button>
        </div>
        <div class="section-body">
          ${layout.blocks.length
            ? `<div class="depot-block-grid">${layout.blocks.map((b, i) => depotBlockCard(b, i)).join('')}</div>`
            : depotEmptyState()
          }
        </div>
      </div>

      ${editing ? depotEditorModal() : ''}
    `;

    // Wire depot name input
    const nameInput = wrap.querySelector('#depotNameInput');
    if (nameInput){
      nameInput.addEventListener('input', () => {
        layout.depotName = nameInput.value;
        depotLayoutSaveDebounced();
      });
    }

    // Wire add block
    const addBtn = wrap.querySelector('#addBlockBtn');
    if (addBtn) addBtn.onclick = () => openBlockEditor(null);

    // Wire block cards
    wrap.querySelectorAll('[data-block-action]').forEach(el => {
      el.onclick = () => {
        const blockId = el.dataset.blockId;
        const action = el.dataset.blockAction;
        if (action === 'edit') openBlockEditor(blockId);
        if (action === 'delete') deleteBlock(blockId);
        if (action === 'up') moveBlock(blockId, -1);
        if (action === 'down') moveBlock(blockId, +1);
      };
    });

    // Wire editor modal
    if (editing){
      wireBlockEditor();
    }
  }

  function depotEmptyState(){
    return `
      <div class="skel-empty">
        <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <path d="M3 9h18M9 21V9"></path>
        </svg>
        <div class="skel-empty-title">No blocks yet</div>
        <div class="skel-empty-sub">Start by adding your first block. A block is a section of your depot yard with rows and columns (like a parking lot layout).</div>
        <button class="btn primary" onclick="document.getElementById('addBlockBtn').click()" style="margin-top:12px;">+ Add First Block</button>
      </div>
    `;
  }

  function depotBlockCard(block, index){
    const totalSlots = (block.cols || 0) * (block.rows || 0);
    const capacity = totalSlots * (block.stackLimit || 1);
    const canMoveUp = index > 0;
    const canMoveDown = index < layout.blocks.length - 1;
    return `
      <div class="depot-block-card" style="--block-color:${block.color || '#1aa39a'}">
        <div class="depot-block-card-head">
          <span class="depot-block-badge">${escapeHtml(block.name || '?')}</span>
          <div class="spacer"></div>
          <button class="depot-block-icon-btn" data-block-action="up" data-block-id="${block.blockId}" title="Move up" ${canMoveUp ? '' : 'disabled'}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </button>
          <button class="depot-block-icon-btn" data-block-action="down" data-block-id="${block.blockId}" title="Move down" ${canMoveDown ? '' : 'disabled'}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>
        <div class="depot-block-preview">
          ${depotBlockPreview(block)}
        </div>
        <div class="depot-block-stats">
          <span><b>${block.cols}</b> cols × <b>${block.rows}</b> rows</span>
          <span class="sep">·</span>
          <span><b>${totalSlots}</b> slots</span>
          <span class="sep">·</span>
          <span>stack <b>${block.stackLimit}</b></span>
        </div>
        <div class="depot-block-card-actions">
          <button class="btn" data-block-action="edit" data-block-id="${block.blockId}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
            Edit
          </button>
          <button class="btn danger" data-block-action="delete" data-block-id="${block.blockId}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>
            Delete
          </button>
        </div>
      </div>
    `;
  }

  function depotBlockPreview(block){
    const cols = Math.min(block.cols || 0, 10);
    const rows = Math.min(block.rows || 0, 6);
    const cells = [];
    for (let r = 0; r < rows; r++){
      for (let c = 0; c < cols; c++){
        cells.push('<div class="depot-preview-cell"></div>');
      }
    }
    const truncated = (block.cols > 10 || block.rows > 6);
    return `
      <div class="depot-preview-grid" style="grid-template-columns:repeat(${cols},1fr);">
        ${cells.join('')}
      </div>
      ${truncated ? '<div class="depot-preview-truncated">Preview truncated</div>' : ''}
    `;
  }

  function depotEditorModal(){
    const draft = editorDraft || { name: '', cols: 6, rows: 8, stackLimit: 2, color: DEPOT_BLOCK_COLORS[0] };
    const isEdit = !!editorOriginalId;
    return `
      <div class="depot-editor-overlay">
        <div class="depot-editor-modal">
          <h4>${isEdit ? 'Edit Block' : 'Add Block'}</h4>

          <div class="formgrid">
            <div class="formfield">
              <label>Block Name *</label>
              <input type="text" id="blockNameInput" maxlength="3" placeholder="A" value="${escapeHtml(draft.name || '')}" style="text-transform:uppercase;">
              <div class="settings-note" style="margin-top:4px;">1–3 characters, A–Z or 0–9</div>
            </div>
            <div class="formfield">
              <label>Color</label>
              <div class="depot-color-picker" id="blockColorPicker">
                ${DEPOT_BLOCK_COLORS.map(c => `
                  <button type="button" class="depot-color-swatch${draft.color === c ? ' is-active' : ''}" data-color="${c}" style="background:${c};" aria-label="Color ${c}"></button>
                `).join('')}
              </div>
            </div>

            <div class="formfield">
              <label>Columns (1–20) *</label>
              <input type="number" id="blockColsInput" min="1" max="20" value="${draft.cols || 6}">
            </div>
            <div class="formfield">
              <label>Rows (1–30) *</label>
              <input type="number" id="blockRowsInput" min="1" max="30" value="${draft.rows || 8}">
            </div>
            <div class="formfield">
              <label>Stack Limit (1–5) *</label>
              <input type="number" id="blockStackInput" min="1" max="5" value="${draft.stackLimit || 2}">
              <div class="settings-note" style="margin-top:4px;">How many containers can stack in one slot</div>
            </div>
            <div class="formfield">
              <label>Preview</label>
              <div id="blockLivePreview" class="depot-live-preview"></div>
            </div>
          </div>

          <div id="blockFormError" class="settings-note" style="display:none;color:var(--red);"></div>

          <div class="modalfoot">
            <button class="btn" id="blockEditorCancel">Cancel</button>
            <button class="btn primary" id="blockEditorSave">${isEdit ? 'Save Changes' : 'Add Block'}</button>
          </div>
        </div>
      </div>
    `;
  }

  function wireBlockEditor(){
    const nameInput = wrap.querySelector('#blockNameInput');
    const colsInput = wrap.querySelector('#blockColsInput');
    const rowsInput = wrap.querySelector('#blockRowsInput');
    const stackInput = wrap.querySelector('#blockStackInput');
    const colorPicker = wrap.querySelector('#blockColorPicker');
    const preview = wrap.querySelector('#blockLivePreview');
    const errorEl = wrap.querySelector('#blockFormError');
    const cancelBtn = wrap.querySelector('#blockEditorCancel');
    const saveBtn = wrap.querySelector('#blockEditorSave');

    if (!nameInput) return;

    function updatePreview(){
      const cols = Math.min(parseInt(colsInput.value, 10) || 1, 10);
      const rows = Math.min(parseInt(rowsInput.value, 10) || 1, 6);
      const color = (editorDraft && editorDraft.color) || DEPOT_BLOCK_COLORS[0];
      const cells = [];
      for (let r = 0; r < rows; r++){
        for (let c = 0; c < cols; c++){
          cells.push(`<div class="depot-preview-cell" style="background:${color}20;border-color:${color};"></div>`);
        }
      }
      preview.innerHTML = `
        <div class="depot-preview-grid" style="grid-template-columns:repeat(${cols},1fr);">
          ${cells.join('')}
        </div>
      `;
    }

    nameInput.addEventListener('input', () => {
      nameInput.value = nameInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    [colsInput, rowsInput, stackInput].forEach(el => {
      el.addEventListener('input', updatePreview);
    });

    colorPicker.querySelectorAll('.depot-color-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!editorDraft) editorDraft = {};
        editorDraft.color = btn.dataset.color;
        colorPicker.querySelectorAll('.depot-color-swatch').forEach(b => {
          b.classList.toggle('is-active', b.dataset.color === editorDraft.color);
        });
        updatePreview();
      });
    });

    cancelBtn.onclick = () => {
      editing = false;
      editorDraft = null;
      editorOriginalId = null;
      paint();
    };

    saveBtn.onclick = async () => {
      const draft = {
        name: nameInput.value.trim().toUpperCase(),
        cols: parseInt(colsInput.value, 10) || 0,
        rows: parseInt(rowsInput.value, 10) || 0,
        stackLimit: parseInt(stackInput.value, 10) || 0,
        color: (editorDraft && editorDraft.color) || DEPOT_BLOCK_COLORS[0],
      };

      const errors = depotValidateBlock(draft, layout.blocks, editorOriginalId);
      if (errors.length){
        errorEl.style.display = 'block';
        errorEl.textContent = errors[0];
        return;
      }

      errorEl.style.display = 'none';
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';

      try{
        if (editorOriginalId){
          // Edit
          const idx = layout.blocks.findIndex(b => b.blockId === editorOriginalId);
          if (idx >= 0){
            layout.blocks[idx] = Object.assign({}, layout.blocks[idx], draft);
          }
        } else {
          // Add
          const newBlock = Object.assign({
            blockId: depotGenerateBlockId(),
            order: layout.blocks.length + 1,
          }, draft);
          layout.blocks.push(newBlock);
        }
        await depotLayoutSave(layout);
        editing = false;
        editorDraft = null;
        editorOriginalId = null;
        paint();
      }catch(e){
        saveBtn.disabled = false;
        saveBtn.textContent = editorOriginalId ? 'Save Changes' : 'Add Block';
        errorEl.style.display = 'block';
        errorEl.textContent = 'Save failed: ' + (e && e.message ? e.message : e);
      }
    };

    updatePreview();
    nameInput.focus();
  }

  function openBlockEditor(blockId){
    if (blockId){
      const block = layout.blocks.find(b => b.blockId === blockId);
      if (!block) return;
      editorDraft = { name: block.name, cols: block.cols, rows: block.rows, stackLimit: block.stackLimit, color: block.color };
      editorOriginalId = blockId;
    } else {
      // Default untuk block baru
      const usedColors = layout.blocks.map(b => b.color);
      const nextColor = DEPOT_BLOCK_COLORS.find(c => !usedColors.includes(c)) || DEPOT_BLOCK_COLORS[layout.blocks.length % DEPOT_BLOCK_COLORS.length];
      const nextLetter = String.fromCharCode(65 + layout.blocks.length); // A, B, C...
      editorDraft = { name: nextLetter, cols: 6, rows: 8, stackLimit: 2, color: nextColor };
      editorOriginalId = null;
    }
    editing = true;
    paint();
  }

  async function deleteBlock(blockId){
    const block = layout.blocks.find(b => b.blockId === blockId);
    if (!block) return;

    // Check kalau ada container dalam block ni
    let containerCount = 0;
    try{
      const containers = await getData('depotContainers');
      containerCount = (containers || []).filter(c => c && c.blockId === blockId && !c.departed).length;
    }catch(e){ /* ignore */ }

    let warning = `Delete Block "${block.name}"?`;
    if (containerCount > 0){
      warning = `Block "${block.name}" has <b>${containerCount} container${containerCount === 1 ? '' : 's'}</b> in the yard.<br><br>Delete only works if the block is empty. Move the containers to another block first.`;
      await confirmModal('Cannot Delete Block', warning, { confirmLabel: 'OK', tone: 'warning', cancelLabel: null });
      return;
    }

    const ok = await confirmModal(
      'Delete Block',
      `${warning}<br><br>This cannot be undone.`,
      { confirmLabel: 'Delete', tone: 'danger' }
    );
    if (!ok) return;

    layout.blocks = layout.blocks.filter(b => b.blockId !== blockId);
    // Re-number order
    layout.blocks.forEach((b, i) => b.order = i + 1);
    await depotLayoutSave(layout);
    paint();
  }

  async function moveBlock(blockId, delta){
    const idx = layout.blocks.findIndex(b => b.blockId === blockId);
    if (idx < 0) return;
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= layout.blocks.length) return;
    const arr = layout.blocks.slice();
    const [item] = arr.splice(idx, 1);
    arr.splice(newIdx, 0, item);
    arr.forEach((b, i) => b.order = i + 1);
    layout.blocks = arr;
    await depotLayoutSave(layout);
    paint();
  }

  // Debounced save untuk depot name (elak terlalu banyak save)
  let saveTimer = null;
  function depotLayoutSaveDebounced(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      depotLayoutSave(layout).catch(e => console.error('depotLayoutSaveDebounced failed:', e));
    }, 500);
  }

  paint();
  return wrap;
}