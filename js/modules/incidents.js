const IncidentsModule = (() => {

  function render(container) {
    const incidents = Storage.getAll('incidents');
    container.innerHTML = `
      <div class="page-header">
        <div><h1>Incident Log</h1>
          <p class="subtitle">${incidents.length} incident(s) recorded</p>
        </div>
        <button class="btn-primary" id="btn-add-inc">+ Log Incident</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Title</th><th>Severity</th>
              <th>Category</th><th>Status</th><th>Date</th>
              <th>Regulatory Notifiable?</th><th>Edit/Del</th>
            </tr>
          </thead>
          <tbody id="inc-tbody"></tbody>
        </table>
      </div>`;

    renderTable(incidents);
    document.getElementById('btn-add-inc')
      .addEventListener('click', () => openForm(null));
  }

  const SEV_COLOURS = {
    'P1 – Critical': '#C62828', 'P2 – High': '#E65100',
    'P3 – Medium': '#F0A500',   'P4 – Low': '#2E7D32'
  };

  function renderTable(incidents) {
    const tbody = document.getElementById('inc-tbody');
    if (!tbody) return;
    if (!incidents.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No incidents logged.</td></tr>`;
      return;
    }
    tbody.innerHTML = incidents.map(i => `
      <tr>
        <td><code style="font-size:.78rem">${i.id}</code></td>
        <td style="font-weight:600">${i.title}</td>
        <td>
          <span class="badge" style="background:${SEV_COLOURS[i.severity]||'#9E9E9E'}">
            ${i.severity || '—'}
          </span>
        </td>
        <td><span class="tag">${i.category || '—'}</span></td>
        <td>
          <span class="status-pill status-${(i.status||'').toLowerCase().replace(/\s+/g,'-')}">
            ${i.status || '—'}
          </span>
        </td>
        <td>${i.dateReported || '—'}</td>
        <td class="td-center">
          ${i.regulatoryNotifiable === 'Yes'
            ? '<span class="badge" style="background:#C62828">Yes</span>'
            : '<span style="color:#9E9E9E">No</span>'}
        </td>
        <td class="td-center">
          <button class="btn-icon" onclick="IncidentsModule.edit('${i.id}')">✏️</button>
          <button class="btn-icon" onclick="IncidentsModule.deleteInc('${i.id}')">🗑</button>
        </td>
      </tr>`).join('');
  }

  function openForm(incident) {
    const isEdit = !!incident;
    document.getElementById('modal-content').innerHTML = `
      <h2>${isEdit ? 'Edit Incident' : 'Log New Incident'}</h2>
      <form id="inc-form" class="grc-form">
        <label>Incident Title *
          <input name="title" required value="${incident?.title || ''}" />
        </label>
        <div class="form-row">
          <label>Severity
            <select name="severity">
              ${['P1 – Critical','P2 – High','P3 – Medium','P4 – Low']
                .map(s=>`<option ${incident?.severity===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </label>
          <label>Category
            <select name="category">
              ${['Fraud','Cyber','Data Breach','Operational','Third Party']
                .map(c=>`<option ${incident?.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="form-row">
          <label>Date Reported
            <input type="date" name="dateReported" value="${incident?.dateReported || ''}" />
          </label>
          <label>Status
            <select name="status">
              ${['Open','Under Investigation','Contained','Resolved','Closed']
                .map(s=>`<option ${incident?.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </label>
        </div>
        <label>Regulatory Notifiable?
          <select name="regulatoryNotifiable">
            ${['No','Yes','TBD']
              .map(v=>`<option ${incident?.regulatoryNotifiable===v?'selected':''}>${v}</option>`).join('')}
          </select>
        </label>
        <label>Description / Root Cause
          <textarea name="description" rows="3">${incident?.description || ''}</textarea>
        </label>
        <label>Lessons Learned
          <textarea name="lessons" rows="2">${incident?.lessons || ''}</textarea>
        </label>
        <div class="form-actions">
          <button type="submit" class="btn-primary">${isEdit ? 'Save' : 'Log Incident'}</button>
          <button type="button" class="btn-secondary" onclick="Modal.close()">Cancel</button>
        </div>
      </form>`;

    document.getElementById('inc-form').addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      if (isEdit) Storage.update('incidents', incident.id, data);
      else        Storage.add('incidents', data);
      Modal.close();
      Router.navigate('incidents');
    });
    Modal.open();
  }

  function edit(id) {
    const i = Storage.getById('incidents', id);
    if (i) openForm(i);
  }
  function deleteInc(id) {
    if (confirm('Delete this incident?')) {
      Storage.remove('incidents', id);
      Router.navigate('incidents');
    }
  }

  function init() {
    Router.register('incidents', render);
  }

  return { init, edit, deleteInc };
})();