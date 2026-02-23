const DashboardModule = (() => {

  // Hold chart instances so we can destroy them before re-rendering.
  // If you don't destroy old Chart.js instances, you get "Canvas already in use" errors.
  let chartInstances = [];

  function render(container) {
    // Pull live data from storage
    const risks      = Storage.getAll('risks');
    const controls   = Storage.getAll('controls');
    const incidents  = Storage.getAll('incidents');
    const compliance = Storage.getAll('compliance');

    // Calculate KPI values
    const openRisks    = risks.filter(r => r.status === 'Open').length;
    const critRisks    = risks.filter(r => r.rating === 'Critical').length;
    const nonCompliant = compliance.filter(c => c.status === 'Non-Compliant').length;
    const today        = new Date();
    const overdueActs  = risks.filter(r => {
      return r.reviewDate && new Date(r.reviewDate) < today && r.status === 'Open';
    }).length;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Dashboard</h1>
          <p class="subtitle">Live GRC Overview — updated in real time from your data</p>
        </div>
      </div>

      <div class="kpi-grid">
        <a href="#risks" class="kpi-card" style="border-top-color:#2E5FA3">
          <div class="kpi-value" style="color:#2E5FA3">${risks.length}</div>
          <div class="kpi-label">Total Risks</div>
        </a>
        <a href="#risks" class="kpi-card" style="border-top-color:#E65100">
          <div class="kpi-value" style="color:#E65100">${openRisks}</div>
          <div class="kpi-label">Open Risks</div>
        </a>
        <a href="#risks" class="kpi-card" style="border-top-color:#C62828">
          <div class="kpi-value" style="color:#C62828">${critRisks}</div>
          <div class="kpi-label">Critical Risks</div>
        </a>
        <a href="#controls" class="kpi-card" style="border-top-color:#00838F">
          <div class="kpi-value" style="color:#00838F">${controls.length}</div>
          <div class="kpi-label">Controls Mapped</div>
        </a>
        <a href="#compliance" class="kpi-card" style="border-top-color:#C62828">
          <div class="kpi-value" style="color:#C62828">${nonCompliant}</div>
          <div class="kpi-label">Non-Compliant Items</div>
        </a>
        <a href="#incidents" class="kpi-card" style="border-top-color:#E65100">
          <div class="kpi-value" style="color:#E65100">
            ${incidents.filter(i => i.status !== 'Closed').length}
          </div>
          <div class="kpi-label">Open Incidents</div>
        </a>
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <h3>Risks by Category</h3>
          <canvas id="chart-by-category" height="220"></canvas>
        </div>
        <div class="chart-card">
          <h3>Risks by Rating</h3>
          <canvas id="chart-by-rating" height="220"></canvas>
        </div>
        <div class="chart-card">
          <h3>Compliance Status</h3>
          <canvas id="chart-compliance" height="220"></canvas>
        </div>
        <div class="chart-card">
          <h3>Control Effectiveness</h3>
          <canvas id="chart-controls" height="220"></canvas>
        </div>
      </div>

      <div class="section-card">
        <h3>Risk Heat Map (Likelihood vs Impact)</h3>
        <p style="color:#757575;font-size:.85rem;margin-bottom:1rem">
          Each cell shows the number of risks at that likelihood/impact intersection.
          Colour indicates inherent risk level: Critical (dark red) → Low (green).
        </p>
        <div id="heat-map-wrapper"></div>
      </div>
    `;

    // Destroy old charts to avoid canvas reuse errors
    chartInstances.forEach(c => c.destroy());
    chartInstances = [];

    chartInstances.push(renderBarChart('chart-by-category', risks, 'category'));
    chartInstances.push(renderRatingDoughnut('chart-by-rating', risks));
    chartInstances.push(renderComplianceChart('chart-compliance', compliance));
    chartInstances.push(renderControlsChart('chart-controls', controls));

    renderHeatMap(risks);
  }

  function renderBarChart(canvasId, risks, field) {
    const counts = {};
    risks.forEach(r => {
      const val = r[field] || 'Unknown';
      counts[val] = (counts[val] || 0) + 1;
    });
    return new Chart(document.getElementById(canvasId), {
      type: 'bar',
      data: {
        labels: Object.keys(counts),
        datasets: [{ data: Object.values(counts), backgroundColor: '#2E5FA3',
                     borderRadius: 5, borderSkipped: false }]
      },
      options: {
        plugins: { legend: { display: false } },
        responsive: true,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  function renderRatingDoughnut(canvasId, risks) {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    risks.forEach(r => { if (counts[r.rating] !== undefined) counts[r.rating]++; });
    return new Chart(document.getElementById(canvasId), {
      type: 'doughnut',
      data: {
        labels: Object.keys(counts),
        datasets: [{
          data: Object.values(counts),
          backgroundColor: ['#C62828', '#E65100', '#F0A500', '#2E7D32'],
          borderWidth: 2
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }

  function renderComplianceChart(canvasId, compliance) {
    const counts = {};
    compliance.forEach(c => {
      const s = c.status || 'Unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return new Chart(document.getElementById(canvasId), {
      type: 'pie',
      data: {
        labels: Object.keys(counts),
        datasets: [{
          data: Object.values(counts),
          backgroundColor: ['#2E7D32', '#F0A500', '#C62828', '#2E5FA3', '#9E9E9E'],
          borderWidth: 2
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }

  function renderControlsChart(canvasId, controls) {
    const counts = {};
    controls.forEach(c => {
      const e = c.effectiveness || 'Not Tested';
      counts[e] = (counts[e] || 0) + 1;
    });
    return new Chart(document.getElementById(canvasId), {
      type: 'bar',
      data: {
        labels: Object.keys(counts),
        datasets: [{
          data: Object.values(counts),
          backgroundColor: ['#2E7D32', '#F0A500', '#C62828', '#9E9E9E'],
          borderRadius: 5
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        responsive: true,
        scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  function renderHeatMap(risks) {
    const wrapper = document.getElementById('heat-map-wrapper');
    if (!wrapper) return;

    // Colour logic: mirrors the classic 5x5 risk matrix
    function cellClass(l, i) {
      const score = l * i;
      if (score >= 20) return 'hm-critical';
      if (score >= 12) return 'hm-high';
      if (score >= 6)  return 'hm-medium';
      return 'hm-low';
    }

    let html = `
      <table class="heat-map">
        <thead>
          <tr>
            <th style="width:120px">Likelihood ↓ / Impact →</th>
            <th>1 – Negligible</th>
            <th>2 – Minor</th>
            <th>3 – Moderate</th>
            <th>4 – Major</th>
            <th>5 – Catastrophic</th>
          </tr>
        </thead>
        <tbody>`;

    const likelihoodLabels = {
      5: '5 – Almost Certain',
      4: '4 – Likely',
      3: '3 – Possible',
      2: '2 – Unlikely',
      1: '1 – Rare'
    };

    for (let l = 5; l >= 1; l--) {
      html += `<tr><th style="background:#37474F;color:white;font-size:.8rem">${likelihoodLabels[l]}</th>`;
      for (let imp = 1; imp <= 5; imp++) {
        const count = risks.filter(r =>
          parseInt(r.likelihood) === l && parseInt(r.impact) === imp
        ).length;
        const cls = cellClass(l, imp);
        html += `
          <td class="hm-cell ${cls}">
            ${count > 0 ? `<span class="hm-count">${count}</span>` : ''}
          </td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    wrapper.innerHTML = html;
  }

  function init() {
    Router.register('dashboard', render);
  }

  return { init };
})();