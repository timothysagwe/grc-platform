/*
  CONTROLS.JS — Controls Library Module

  Models the set of controls that mitigate risks.
  Each control can reference one risk via riskRef (the risk's ID).
  This creates the first relational link in the platform:
    Risk ──< Control  (one risk can have many controls)

  Control types follow the standard taxonomy:
    Preventive  — stops the risk event from occurring
    Detective   — identifies when a risk event has occurred
    Corrective  — reduces impact after a risk event
    Directive   — instructs people to behave in a certain way (policies, training)

  Framework references map controls to real standards:
    ISO 27001 Annex A, NIST CSF functions, CIS Controls, etc.
*/

const ControlsModule = (() => {

  // Colour map for control type badges
  const TYPE_COLOURS = {
    'Preventive':  '#1565C0',
    'Detective':   '#00838F',
    'Corrective':  '#E65100',
    'Directive':   '#6A1B9A',
  };

  // Colour map for effectiveness badges
  const EFF_COLOURS = {
    'Effective':           '#2E7D32',
    'Partially Effective': '#F0A500',
    'Ineffective':         '#C62828',
    'Not Tested':          '#757575',
  };

  // ── RENDER (main list view) ────────────────────────────────────────────────
  function render(container) {
    const controls = Storage.getAll('controls');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Controls Library</h1>
          <p class="subtitle">
            ${controls.length} control(s) — 
            ${controls.filter(c => c.effectiveness === 'Effective').length} effective, 
            ${controls.filter(c => c.effectiveness === 'Ineffective').length} ineffective
          </p>
        </div>
        <button class="btn-primary" id="btn-add-ctrl">+ Add Control</button>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <select id="fc-type">
          <option value="">All Types</option>
          <option>Preventive</option>
          <option>Detective</option>
          <option>Corrective</option>
          <option>Directive</option>
        </select>

        <select id="fc-effectiveness">
          <option value="">All Effectiveness</option>
          <option>Effective</option>
          <option>Partially Effective</option>
          <option>Ineffective</option>
          <option>Not Tested</option>
        </select>

        <select id="fc-automated">
          <option value="">Automated / Manual</option>
          <option>Yes</option>
          <option>No</option>
          <option>Partially</option>
        </select>

        <select id="fc-framework">
          <option value="">All Frameworks</option>
          <option>ISO 27001</option>
          <option>NIST CSF</option>
          <option>CIS Controls</option>
          <option>COBIT 5</option>
          <option>PSD2</option>
          <option>FCA SYSC</option>
          <option>DORA</option>
        </select>

        <input type="text" id="fc-search"
          placeholder="Search title, owner, or framework ref..." />
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Control Title</th>
              <th>Type</th>
              <th>Framework Ref</th>
              <th>Linked Risk</th>
              <th>Owner</th>
              <th>Effectiveness</th>
              <th>Automated?</th>
              <th>Last Tested</th>
              <th>Edit / Del</th>
            </tr>
          </thead>
          <tbody id="ctrl-tbody"></tbody>
        </table>
      </div>
    `;

    renderTable(controls);
    attachFilters();
    document.getElementById('btn-add-ctrl')
      .addEventListener('click', () => openForm(null));
  }

  // ── RENDER TABLE ROWS ──────────────────────────────────────────────────────
  function renderTable(controls) {
    const tbody = document.getElementById('ctrl-tbody');
    if (!tbody) return;

    if (!controls.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="empty-row">
            No controls yet. Click "Add Control" to start building your controls library.
          </td>
        </tr>`;
      return;
    }

    // Build a lookup map of risk ID → risk title for the "Linked Risk" column
    const riskMap = {};
    Storage.getAll('risks').forEach(r => { riskMap[r.id] = r; });

    tbody.innerHTML = controls.map(c => {
      const typeColour = TYPE_COLOURS[c.type]     || '#9E9E9E';
      const effColour  = EFF_COLOURS[c.effectiveness] || '#9E9E9E';

      // Resolve linked risk — show ID and truncated title if found
      const linkedRisk = riskMap[c.riskRef];
      const riskCell   = linkedRisk
        ? `<span class="tag" title="${linkedRisk.title}">
             ${linkedRisk.id}
             <span style="color:#555;font-weight:400"> — ${linkedRisk.title.slice(0, 30)}${linkedRisk.title.length > 30 ? '…' : ''}</span>
           </span>`
        : `<span style="color:#9E9E9E;font-size:.8rem">${c.riskRef ? c.riskRef + ' (not found)' : 'None'}</span>`;

      // Automated indicator
      const autoCell = c.automated === 'Yes'
        ? `<span style="color:#2E7D32;font-weight:700">✔ Yes</span>`
        : c.automated === 'Partially'
        ? `<span style="color:#F0A500;font-weight:700">~ Partial</span>`
        : `<span style="color:#9E9E9E">✘ No</span>`;

      return `
        <tr>
          <td><code style="font-size:.78rem;color:#555">${c.id}</code></td>
          <td style="max-width:260px;font-weight:600">${c.title}</td>
          <td>
            <span class="badge" style="background:${typeColour}">
              ${c.type || '—'}
            </span>
          </td>
          <td style="font-size:.82rem;color:#444">${c.frameworkRef || '—'}</td>
          <td style="min-width:180px">${riskCell}</td>
          <td>${c.owner || '—'}</td>
          <td>
            <span class="badge" style="background:${effColour}">
              ${c.effectiveness || '—'}
            </span>
          </td>
          <td class="td-center">${autoCell}</td>
          <td style="white-space:nowrap">${c.testDate || '—'}</td>
          <td class="td-center">
            <button class="btn-icon" title="Edit"
              onclick="ControlsModule.edit('${c.id}')">✏️</button>
            <button class="btn-icon" title="Delete"
              onclick="ControlsModule.deleteControl('${c.id}')">🗑</button>
          </td>
        </tr>`;
    }).join('');
  }

  // ── FILTERS ────────────────────────────────────────────────────────────────
  function attachFilters() {
    function apply() {
      let controls = Storage.getAll('controls');

      const type   = document.getElementById('fc-type')?.value;
      const eff    = document.getElementById('fc-effectiveness')?.value;
      const auto   = document.getElementById('fc-automated')?.value;
      const fw     = document.getElementById('fc-framework')?.value;
      const search = document.getElementById('fc-search')?.value.toLowerCase();

      if (type)   controls = controls.filter(c => c.type === type);
      if (eff)    controls = controls.filter(c => c.effectiveness === eff);
      if (auto)   controls = controls.filter(c => c.automated === auto);
      if (fw)     controls = controls.filter(c =>
                    (c.frameworkRef || '').toLowerCase().includes(fw.toLowerCase()));
      if (search) controls = controls.filter(c =>
                    c.title.toLowerCase().includes(search) ||
                    (c.owner || '').toLowerCase().includes(search) ||
                    (c.frameworkRef || '').toLowerCase().includes(search));

      renderTable(controls);
    }

    ['fc-type', 'fc-effectiveness', 'fc-automated', 'fc-framework', 'fc-search']
      .forEach(id => document.getElementById(id)?.addEventListener('input', apply));
  }

  // ── ADD / EDIT FORM ────────────────────────────────────────────────────────
  function openForm(control) {
    const isEdit = !!control;

    // Build the risk dropdown options dynamically from stored risks.
    // This is what makes riskRef a real relationship rather than a free-text field.
    const risks = Storage.getAll('risks');
    const riskOptions = risks.map(r =>
      `<option value="${r.id}" ${control?.riskRef === r.id ? 'selected' : ''}>
         ${r.id} — ${r.title}
       </option>`
    ).join('');

    document.getElementById('modal-content').innerHTML = `
      <h2>${isEdit ? 'Edit Control' : 'Add New Control'}</h2>

      <form id="ctrl-form" class="grc-form">

        <label>Control Title *
          <input name="title" required
            placeholder="e.g. Real-Time Transaction Fraud Scoring"
            value="${control?.title || ''}" />
        </label>

        <div class="form-row">
          <label>Control Type
            <select name="type">
              ${['Preventive','Detective','Corrective','Directive']
                .map(t => `<option ${control?.type === t ? 'selected' : ''}>${t}</option>`)
                .join('')}
            </select>
            <small style="color:#757575;font-size:.77rem">
              Preventive=stops risk, Detective=identifies risk, Corrective=reduces impact
            </small>
          </label>

          <label>Automated?
            <select name="automated">
              ${['Yes','No','Partially']
                .map(v => `<option ${control?.automated === v ? 'selected' : ''}>${v}</option>`)
                .join('')}
            </select>
          </label>
        </div>

        <label>Framework Reference
          <input name="frameworkRef"
            placeholder="e.g. ISO 27001 A.12.6.1 / NIST CSF DE.CM-3"
            value="${control?.frameworkRef || ''}" />
          <small style="color:#757575;font-size:.77rem">
            Map to a specific control within ISO 27001, NIST CSF, CIS Controls, PSD2, etc.
          </small>
        </label>

        <label>Linked Risk
          <select name="riskRef">
            <option value="">— Not linked to a specific risk —</option>
            ${riskOptions}
          </select>
          <small style="color:#757575;font-size:.77rem">
            Linking a control to a risk lets the Risk Register show "controls mapped" counts.
          </small>
        </label>

        <label>Control Owner
          <input name="owner"
            placeholder="e.g. Fraud Technology Team / CISO"
            value="${control?.owner || ''}" />
        </label>

        <div class="form-row">
          <label>Effectiveness
            <select name="effectiveness">
              ${['Effective','Partially Effective','Ineffective','Not Tested']
                .map(e => `<option ${control?.effectiveness === e ? 'selected' : ''}>${e}</option>`)
                .join('')}
            </select>
          </label>

          <label>Last Test Date
            <input type="date" name="testDate"
              value="${control?.testDate || ''}" />
          </label>
        </div>

        <label>Next Review Date
          <input type="date" name="nextReviewDate"
            value="${control?.nextReviewDate || ''}" />
        </label>

        <label>Control Description
          <textarea name="description" rows="3"
            placeholder="Describe what this control does and how it works..."
          >${control?.description || ''}</textarea>
        </label>

        <label>Testing Notes / Evidence Reference
          <textarea name="testingNotes" rows="2"
            placeholder="e.g. Penetration test report Q1 2025 / EV-001 on SharePoint..."
          >${control?.testingNotes || ''}</textarea>
        </label>

        <label>Gaps / Weaknesses Identified
          <textarea name="gaps" rows="2"
            placeholder="Note any known weaknesses or partial coverage gaps..."
          >${control?.gaps || ''}</textarea>
        </label>

        <div class="form-actions">
          <button type="submit" class="btn-primary">
            ${isEdit ? 'Save Changes' : 'Add Control'}
          </button>
          <button type="button" class="btn-secondary"
            onclick="Modal.close()">Cancel</button>
        </div>

      </form>
    `;

    document.getElementById('ctrl-form').addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));

      if (isEdit) {
        Storage.update('controls', control.id, data);
      } else {
        Storage.add('controls', data);
      }

      Modal.close();
      Router.navigate('controls');
    });

    Modal.open();
  }

  // ── PUBLIC METHODS (called from inline onclick attributes in the table) ────
  function edit(id) {
    const control = Storage.getById('controls', id);
    if (control) openForm(control);
  }

  function deleteControl(id) {
    if (confirm('Delete this control? Any risks referencing it will lose the link.')) {
      Storage.remove('controls', id);
      Router.navigate('controls');
    }
  }

  // ── INIT — registers this module's route with the router ──────────────────
  function init() {
    Router.register('controls', render);
  }

  return { init, edit, deleteControl };

})();