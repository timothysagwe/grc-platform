/*
  COMPLIANCE.JS — Compliance & Regulatory Tracker Module

  Tracks your organisation's compliance posture against specific
  regulatory requirements and framework obligations.

  Each record represents ONE requirement from ONE regulation/framework,
  with a status, owner, gap description, and due date for remediation.

  Regulations covered:
    GDPR        — UK/EU General Data Protection Regulation
    PSD2        — Payment Services Directive 2 (Strong Customer Authentication etc.)
    FCA SYSC    — FCA Senior Management Arrangements, Systems and Controls sourcebook
    FCA PS22/9  — Consumer Duty
    DORA        — Digital Operational Resilience Act (EU, applicable to UK via adoption)
    ISO 27001   — Information Security Management System standard
    POCA 2002   — Proceeds of Crime Act (AML / SAR obligations)
    MLRs 2017   — Money Laundering Regulations

  Status values and what they mean in practice:
    Compliant           — Evidence gathered, requirement met, no gaps
    Partially Compliant — Requirement partially met; gap exists, remediation underway
    Non-Compliant       — Requirement not met; action required urgently
    In Review           — Being assessed; compliance status not yet confirmed
    N/A                 — Requirement not applicable to this entity
*/

const ComplianceModule = (() => {

  // Colour map for status badges — mirrors the traffic light system used in GRC reports
  const STATUS_COLOURS = {
    'Compliant':           '#2E7D32',
    'Partially Compliant': '#F0A500',
    'Non-Compliant':       '#C62828',
    'In Review':           '#1565C0',
    'N/A':                 '#757575',
  };

  // Priority colours
  const PRIORITY_COLOURS = {
    'Critical': '#C62828',
    'High':     '#E65100',
    'Medium':   '#F0A500',
    'Low':      '#2E7D32',
  };

  // Full list of supported regulations for dropdowns
  const REGULATIONS = [
    'GDPR',
    'PSD2',
    'FCA SYSC',
    'FCA PS22/9 (Consumer Duty)',
    'DORA',
    'ISO 27001',
    'POCA 2002',
    'MLRs 2017',
    'FCA PS21/3 (Op. Resilience)',
    'Basel III',
    'PCI DSS',
    'Other',
  ];

  // ── RENDER (main list view) ────────────────────────────────────────────────
  function render(container) {
    const items = Storage.getAll('compliance');

    // Calculate summary counts for the subtitle
    const counts = {
      compliant:   items.filter(i => i.status === 'Compliant').length,
      partial:     items.filter(i => i.status === 'Partially Compliant').length,
      nonCompliant:items.filter(i => i.status === 'Non-Compliant').length,
      inReview:    items.filter(i => i.status === 'In Review').length,
    };

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Compliance Tracker</h1>
          <p class="subtitle">
            ${items.length} requirement(s) — 
            <span style="color:#2E7D32;font-weight:600">${counts.compliant} Compliant</span> · 
            <span style="color:#F0A500;font-weight:600">${counts.partial} Partial</span> · 
            <span style="color:#C62828;font-weight:600">${counts.nonCompliant} Non-Compliant</span> · 
            <span style="color:#1565C0;font-weight:600">${counts.inReview} In Review</span>
          </p>
        </div>
        <button class="btn-primary" id="btn-add-comp">+ Add Requirement</button>
      </div>

      <!-- Compliance posture bar — visual at-a-glance summary -->
      ${items.length > 0 ? renderPostureBar(counts, items.length) : ''}

      <!-- Filter bar -->
      <div class="filter-bar">
        <select id="fco-regulation">
          <option value="">All Regulations</option>
          ${REGULATIONS.map(r => `<option>${r}</option>`).join('')}
        </select>

        <select id="fco-status">
          <option value="">All Statuses</option>
          <option>Compliant</option>
          <option>Partially Compliant</option>
          <option>Non-Compliant</option>
          <option>In Review</option>
          <option>N/A</option>
        </select>

        <select id="fco-priority">
          <option value="">All Priorities</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <input type="text" id="fco-search"
          placeholder="Search requirement, owner, or article..." />

        <label style="display:flex;align-items:center;gap:.4rem;font-size:.85rem;color:#555;margin:0">
          <input type="checkbox" id="fco-overdue" />
          Overdue only
        </label>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Requirement</th>
              <th>Regulation</th>
              <th>Article / Section</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Due Date</th>
              <th>Gap?</th>
              <th>Edit / Del</th>
            </tr>
          </thead>
          <tbody id="comp-tbody"></tbody>
        </table>
      </div>
    `;

    renderTable(items);
    attachFilters();
    document.getElementById('btn-add-comp')
      .addEventListener('click', () => openForm(null));
  }

  // ── POSTURE BAR ────────────────────────────────────────────────────────────
  // A horizontal segmented bar showing the proportion of each status.
  // This is a common component in real GRC dashboards (e.g. ServiceNow GRC).
  function renderPostureBar(counts, total) {
    const pct = v => ((v / total) * 100).toFixed(1);
    return `
      <div class="section-card" style="margin-bottom:1.5rem;padding:1.25rem 1.5rem">
        <div style="display:flex;justify-content:space-between;
                    align-items:center;margin-bottom:.75rem">
          <h3 style="margin:0">Compliance Posture</h3>
          <span style="font-size:.82rem;color:#757575">${total} requirements</span>
        </div>
        <div style="display:flex;height:20px;border-radius:10px;
                    overflow:hidden;gap:2px;background:#F0F4F8">
          ${counts.compliant > 0
            ? `<div style="flex:${counts.compliant};background:#2E7D32"
                    title="Compliant: ${counts.compliant} (${pct(counts.compliant)}%)"></div>` : ''}
          ${counts.partial > 0
            ? `<div style="flex:${counts.partial};background:#F0A500"
                    title="Partially Compliant: ${counts.partial} (${pct(counts.partial)}%)"></div>` : ''}
          ${counts.inReview > 0
            ? `<div style="flex:${counts.inReview};background:#1565C0"
                    title="In Review: ${counts.inReview} (${pct(counts.inReview)}%)"></div>` : ''}
          ${counts.nonCompliant > 0
            ? `<div style="flex:${counts.nonCompliant};background:#C62828"
                    title="Non-Compliant: ${counts.nonCompliant} (${pct(counts.nonCompliant)}%)"></div>` : ''}
        </div>
        <div style="display:flex;gap:1.5rem;margin-top:.6rem;flex-wrap:wrap">
          ${[
            { label:'Compliant',           count:counts.compliant,    colour:'#2E7D32' },
            { label:'Partially Compliant', count:counts.partial,      colour:'#F0A500' },
            { label:'In Review',           count:counts.inReview,     colour:'#1565C0' },
            { label:'Non-Compliant',       count:counts.nonCompliant, colour:'#C62828' },
          ].map(s => `
            <div style="display:flex;align-items:center;gap:.35rem;font-size:.82rem">
              <div style="width:10px;height:10px;border-radius:50%;
                          background:${s.colour};flex-shrink:0"></div>
              <span>${s.label}: <strong>${s.count}</strong>
                (${pct(s.count)}%)</span>
            </div>`).join('')}
        </div>
      </div>`;
  }

  // ── RENDER TABLE ROWS ──────────────────────────────────────────────────────
  function renderTable(items) {
    const tbody = document.getElementById('comp-tbody');
    if (!tbody) return;

    if (!items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="empty-row">
            No compliance requirements yet. Click "Add Requirement" to start tracking.
          </td>
        </tr>`;
      return;
    }

    const today = new Date();

    tbody.innerHTML = items.map(item => {
      const statusColour   = STATUS_COLOURS[item.status]   || '#9E9E9E';
      const priorityColour = PRIORITY_COLOURS[item.priority] || '#9E9E9E';

      // Overdue logic — flag items past their due date that are not yet compliant
      const dueDate  = item.dueDate ? new Date(item.dueDate) : null;
      const isOverdue = dueDate && dueDate < today &&
                        item.status !== 'Compliant' && item.status !== 'N/A';

      // Gap indicator — show a warning if a gap description exists
      const gapCell = item.gapDescription && item.gapDescription.trim()
        ? `<span title="${item.gapDescription}"
                style="color:#C62828;font-weight:700;cursor:help">⚠ Yes</span>`
        : `<span style="color:#9E9E9E;font-size:.82rem">—</span>`;

      // Due date cell — red if overdue
      const dueDateCell = item.dueDate
        ? `<span style="${isOverdue ? 'color:#C62828;font-weight:700' : ''}">
             ${isOverdue ? '⚠ ' : ''}${item.dueDate}
           </span>`
        : '—';

      return `
        <tr ${isOverdue ? 'style="background:#FFF5F5"' : ''}>
          <td><code style="font-size:.78rem;color:#555">${item.id}</code></td>
          <td style="max-width:280px;font-weight:600">${item.requirement}</td>
          <td><span class="tag">${item.regulation || '—'}</span></td>
          <td style="font-size:.82rem;color:#444">${item.article || '—'}</td>
          <td>${item.owner || '—'}</td>
          <td>
            <span class="badge" style="background:${statusColour}">
              ${item.status || '—'}
            </span>
          </td>
          <td>
            ${item.priority
              ? `<span class="badge" style="background:${priorityColour}">
                   ${item.priority}
                 </span>`
              : '<span style="color:#9E9E9E">—</span>'}
          </td>
          <td style="white-space:nowrap">${dueDateCell}</td>
          <td class="td-center">${gapCell}</td>
          <td class="td-center">
            <button class="btn-icon" title="Edit"
              onclick="ComplianceModule.edit('${item.id}')">✏️</button>
            <button class="btn-icon" title="Delete"
              onclick="ComplianceModule.deleteItem('${item.id}')">🗑</button>
          </td>
        </tr>`;
    }).join('');
  }

  // ── FILTERS ────────────────────────────────────────────────────────────────
  function attachFilters() {
    const today = new Date();

    function apply() {
      let items = Storage.getAll('compliance');

      const reg      = document.getElementById('fco-regulation')?.value;
      const status   = document.getElementById('fco-status')?.value;
      const priority = document.getElementById('fco-priority')?.value;
      const search   = document.getElementById('fco-search')?.value.toLowerCase();
      const overdue  = document.getElementById('fco-overdue')?.checked;

      if (reg)      items = items.filter(i => i.regulation === reg);
      if (status)   items = items.filter(i => i.status === status);
      if (priority) items = items.filter(i => i.priority === priority);
      if (search)   items = items.filter(i =>
                      i.requirement.toLowerCase().includes(search) ||
                      (i.owner || '').toLowerCase().includes(search) ||
                      (i.article || '').toLowerCase().includes(search) ||
                      (i.regulation || '').toLowerCase().includes(search));
      if (overdue)  items = items.filter(i => {
                      const d = i.dueDate ? new Date(i.dueDate) : null;
                      return d && d < today &&
                             i.status !== 'Compliant' && i.status !== 'N/A';
                    });

      renderTable(items);
    }

    ['fco-regulation','fco-status','fco-priority','fco-search','fco-overdue']
      .forEach(id => document.getElementById(id)?.addEventListener('input', apply));
  }

  // ── ADD / EDIT FORM ────────────────────────────────────────────────────────
  function openForm(item) {
    const isEdit = !!item;

    document.getElementById('modal-content').innerHTML = `
      <h2>${isEdit ? 'Edit Compliance Requirement' : 'Add Compliance Requirement'}</h2>

      <form id="comp-form" class="grc-form">

        <label>Requirement Title *
          <input name="requirement" required
            placeholder="e.g. Strong Customer Authentication for Online Payments"
            value="${item?.requirement || ''}" />
        </label>

        <div class="form-row">
          <label>Regulation / Framework
            <select name="regulation">
              <option value="">— Select —</option>
              ${REGULATIONS.map(r =>
                `<option ${item?.regulation === r ? 'selected' : ''}>${r}</option>`
              ).join('')}
            </select>
          </label>

          <label>Article / Section
            <input name="article"
              placeholder="e.g. Art. 4 / s.330 / SYSC 4.1"
              value="${item?.article || ''}" />
          </label>
        </div>

        <label>Compliance Owner
          <input name="owner"
            placeholder="e.g. MLRO / DPO / Head of Digital"
            value="${item?.owner || ''}" />
        </label>

        <div class="form-row">
          <label>Compliance Status
            <select name="status">
              ${['Compliant','Partially Compliant','Non-Compliant','In Review','N/A']
                .map(s => `<option ${item?.status === s ? 'selected' : ''}>${s}</option>`)
                .join('')}
            </select>
          </label>

          <label>Priority
            <select name="priority">
              <option value="">— Select —</option>
              ${['Critical','High','Medium','Low']
                .map(p => `<option ${item?.priority === p ? 'selected' : ''}>${p}</option>`)
                .join('')}
            </select>
          </label>
        </div>

        <div class="form-row">
          <label>Due Date / Assessment Date
            <input type="date" name="dueDate"
              value="${item?.dueDate || ''}" />
          </label>

          <label>Last Assessed
            <input type="date" name="lastAssessed"
              value="${item?.lastAssessed || ''}" />
          </label>
        </div>

        <label>Evidence Reference
          <input name="evidence"
            placeholder="e.g. EV-C001 / SharePoint/Compliance/SCA-Evidence.pdf"
            value="${item?.evidence || ''}" />
          <small style="color:#757575;font-size:.77rem">
            Link to or name the document that proves compliance.
          </small>
        </label>

        <label>Gap Description
          <textarea name="gapDescription" rows="3"
            placeholder="Describe what is missing or not yet compliant..."
          >${item?.gapDescription || ''}</textarea>
          <small style="color:#757575;font-size:.77rem">
            Leave blank if fully compliant. Fill in for Partial/Non-Compliant statuses.
          </small>
        </label>

        <label>Remediation Action
          <textarea name="remediationAction" rows="3"
            placeholder="What is being done to close the gap? Who is responsible?"
          >${item?.remediationAction || ''}</textarea>
        </label>

        <label>Notes
          <textarea name="notes" rows="2"
            placeholder="Any additional context, dependencies, or board-level considerations..."
          >${item?.notes || ''}</textarea>
        </label>

        <div class="form-actions">
          <button type="submit" class="btn-primary">
            ${isEdit ? 'Save Changes' : 'Add Requirement'}
          </button>
          <button type="button" class="btn-secondary"
            onclick="Modal.close()">Cancel</button>
        </div>

      </form>
    `;

    document.getElementById('comp-form').addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));

      if (isEdit) {
        Storage.update('compliance', item.id, data);
      } else {
        Storage.add('compliance', data);
      }

      Modal.close();
      Router.navigate('compliance');
    });

    Modal.open();
  }

  // ── PUBLIC METHODS (called from inline onclick attributes in the table) ────
  function edit(id) {
    const item = Storage.getById('compliance', id);
    if (item) openForm(item);
  }

  function deleteItem(id) {
    if (confirm('Delete this compliance requirement?')) {
      Storage.remove('compliance', id);
      Router.navigate('compliance');
    }
  }

  // ── INIT — registers this module's route with the router ──────────────────
  function init() {
    Router.register('compliance', render);
  }

  return { init, edit, deleteItem };

})();