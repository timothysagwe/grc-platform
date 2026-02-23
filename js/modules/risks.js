const RisksModule = (() => {

  // Score thresholds define your risk rating logic.
  // These match ISO 31000 / NIST 5x5 matrix conventions.
  function calcRating(likelihood, impact) {
    const score = parseInt(likelihood) * parseInt(impact);
    if (score >= 20) return 'Critical';
    if (score >= 12) return 'High';
    if (score >= 6)  return 'Medium';
    return 'Low';
  }

  const RATING_COLOURS = {
    Critical: '#C62828', High: '#E65100', Medium: '#F0A500', Low: '#2E7D32'
  };

  function render(container) {
    const risks = Storage.getAll('risks');
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Risk Register</h1>
          <p class="subtitle">${risks.length} risk(s) recorded</p>
        </div>
        <button class="btn-primary" id="btn-add-risk">+ Add Risk</button>
      </div>

      <div class="filter-bar">
        <select id="f-category">
          <option value="">All Categories</option>
          <option>Fraud Risk</option>
          <option>Cyber Risk</option>
          <option>Operational Risk</option>
          <option>Regulatory Risk</option>
          <option>Third Party Risk</option>
          <option>Reputational Risk</option>
        </select>
        <select id="f-rating">
          <option value="">All Ratings</option>
          <option>Critical</option><option>High</option>
          <option>Medium</option><option>Low</option>
        </select>
        <select id="f-status">
          <option value="">All Statuses</option>
          <option>Open</option><option>In Progress</option>
          <option>Closed</option><option>Accepted</option>
        </select>
        <input type="text" id="f-search" placeholder="Search title or owner..." />
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Category</th>
              <th>Likelihood</th>
              <th>Impact</th>
              <th>Score</th>
              <th>Rating</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Review Date</th>
              <th>Controls</th>
              <th>Edit / Del</th>
            </tr>
          </thead>
          <tbody id="risks-tbody"></tbody>
        </table>
      </div>
    `;

    renderTable(risks);
    attachFilters();
    document.getElementById('btn-add-risk')
      .addEventListener('click', () => openForm(null));
  }

  function renderTable(risks) {
    const tbody = document.getElementById('risks-tbody');
    if (!tbody) return;

    if (!risks.length) {
      tbody.innerHTML = `<tr><td colspan="12" class="empty-row">
        No risks yet. Click "Add Risk" to get started.</td></tr>`;
      return;
    }

    tbody.innerHTML = risks.map(r => {
      const score  = (parseInt(r.likelihood) || 0) * (parseInt(r.impact) || 0);
      const rating = r.rating || calcRating(r.likelihood, r.impact);
      const colour = RATING_COLOURS[rating] || '#9E9E9E';

      // Find controls linked to this risk
      const controls = Storage.getAll('controls')
        .filter(c => c.riskRef === r.id).length;

      // Format status as a pill — replace spaces with hyphens for CSS class
      const statusClass = (r.status || '').toLowerCase().replace(/\s+/g, '-');

      return `<tr>
        <td><code style="font-size:.78rem;color:#555">${r.id}</code></td>
        <td style="max-width:280px;font-weight:600">${r.title}</td>
        <td><span class="tag">${r.category || '—'}</span></td>
        <td class="td-center">${r.likelihood || '—'}</td>
        <td class="td-center">${r.impact || '—'}</td>
        <td class="td-center"><strong>${score || '—'}</strong></td>
        <td>
          <span class="badge" style="background:${colour}">${rating}</span>
        </td>
        <td>${r.owner || '—'}</td>
        <td>
          <span class="status-pill status-${statusClass}">${r.status || '—'}</span>
        </td>
        <td style="white-space:nowrap">${r.reviewDate || '—'}</td>
        <td class="td-center">
          ${controls > 0
            ? `<span class="tag">${controls} linked</span>`
            : '<span style="color:#9E9E9E;font-size:.8rem">None</span>'}
        </td>
        <td class="td-center">
          <button class="btn-icon" title="Edit" onclick="RisksModule.edit('${r.id}')">✏️</button>
          <button class="btn-icon" title="Delete" onclick="RisksModule.deleteRisk('${r.id}')">🗑</button>
        </td>
      </tr>`;
    }).join('');
  }

  function attachFilters() {
    function apply() {
      let risks = Storage.getAll('risks');
      const cat    = document.getElementById('f-category')?.value;
      const rating = document.getElementById('f-rating')?.value;
      const status = document.getElementById('f-status')?.value;
      const search = document.getElementById('f-search')?.value.toLowerCase();
      if (cat)    risks = risks.filter(r => r.category === cat);
      if (rating) risks = risks.filter(r =>
        (r.rating || calcRating(r.likelihood, r.impact)) === rating);
      if (status) risks = risks.filter(r => r.status === status);
      if (search) risks = risks.filter(r =>
        r.title.toLowerCase().includes(search) ||
        (r.owner || '').toLowerCase().includes(search));
      renderTable(risks);
    }
    ['f-category','f-rating','f-status','f-search'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', apply);
    });
  }

  function openForm(risk) {
    const isEdit = !!risk;
    document.getElementById('modal-content').innerHTML = `
      <h2>${isEdit ? 'Edit Risk' : 'Add New Risk'}</h2>
      <form id="risk-form" class="grc-form">

        <label>Risk Title *
          <input name="title" required placeholder="e.g. Account Takeover via Credential Stuffing"
            value="${risk?.title || ''}" />
        </label>

        <label>Category
          <select name="category">
            <option ${risk?.category==='Fraud Risk'?'selected':''}>Fraud Risk</option>
            <option ${risk?.category==='Cyber Risk'?'selected':''}>Cyber Risk</option>
            <option ${risk?.category==='Operational Risk'?'selected':''}>Operational Risk</option>
            <option ${risk?.category==='Regulatory Risk'?'selected':''}>Regulatory Risk</option>
            <option ${risk?.category==='Third Party Risk'?'selected':''}>Third Party Risk</option>
            <option ${risk?.category==='Reputational Risk'?'selected':''}>Reputational Risk</option>
          </select>
        </label>

        <div class="form-row">
          <label>Likelihood (1–5)
            <input type="number" name="likelihood" min="1" max="5"
              value="${risk?.likelihood || 3}" />
            <small style="color:#757575;font-size:.78rem">
              1=Rare, 3=Possible, 5=Almost Certain
            </small>
          </label>
          <label>Impact (1–5)
            <input type="number" name="impact" min="1" max="5"
              value="${risk?.impact || 3}" />
            <small style="color:#757575;font-size:.78rem">
              1=Negligible, 3=Moderate, 5=Catastrophic
            </small>
          </label>
        </div>

        <label>Risk Owner
          <input name="owner" placeholder="e.g. Head of Fraud Technology"
            value="${risk?.owner || ''}" />
        </label>

        <div class="form-row">
          <label>Status
            <select name="status">
              ${['Open','In Progress','Closed','Accepted','Transferred']
                .map(s => `<option ${risk?.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </label>
          <label>Review Date
            <input type="date" name="reviewDate" value="${risk?.reviewDate || ''}" />
          </label>
        </div>

        <label>Description
          <textarea name="description" rows="3"
            placeholder="Describe the risk scenario in detail..."
          >${risk?.description || ''}</textarea>
        </label>

        <label>Treatment / Mitigation Plan
          <textarea name="treatment" rows="3"
            placeholder="How is this risk being managed or mitigated?"
          >${risk?.treatment || ''}</textarea>
        </label>

        <label>Relevant Framework
          <select name="framework">
            <option value="">— Select —</option>
            ${['ISO 31000','NIST CSF','ISO 27001','COBIT 5','FCA SYSC','PSD2','GDPR','DORA']
              .map(f => `<option ${risk?.framework===f?'selected':''}>${f}</option>`).join('')}
          </select>
        </label>

        <div class="form-actions">
          <button type="submit" class="btn-primary">
            ${isEdit ? 'Save Changes' : 'Add Risk'}
          </button>
          <button type="button" class="btn-secondary" onclick="Modal.close()">
            Cancel
          </button>
        </div>
      </form>
    `;

    document.getElementById('risk-form').addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      data.likelihood = parseInt(data.likelihood);
      data.impact     = parseInt(data.impact);
      data.rating     = calcRating(data.likelihood, data.impact);

      if (isEdit) {
        Storage.update('risks', risk.id, data);
      } else {
        Storage.add('risks', data);
      }

      Modal.close();
      Router.navigate('risks');
    });

    Modal.open();
  }

  function edit(id) {
    const risk = Storage.getById('risks', id);
    if (risk) openForm(risk);
  }

  function deleteRisk(id) {
    if (confirm('Delete this risk? This cannot be undone.')) {
      Storage.remove('risks', id);
      Router.navigate('risks');
    }
  }

  function init() {
    Router.register('risks', render);
  }

  return { init, edit, deleteRisk };
})();