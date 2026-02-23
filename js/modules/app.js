/*
  APP.JS — Boots the entire application.

  Responsibilities:
  1. Define the Modal helper used by all modules
  2. Wire up Export / Import / Reset buttons
  3. Seed demo data on first load so the site isn't empty
  4. Initialise all modules (which register their routes)
  5. Start the router (which renders the initial view)
*/

// ── MODAL HELPER ──────────────────────────────────────────────────────────────
// Exposed as a global so any module can call Modal.open() / Modal.close()
const Modal = {
  open() {
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }
};

// Close modal when clicking the X button
document.getElementById('modal-close').addEventListener('click', Modal.close);

// Close modal when clicking the dark overlay background (outside the box)
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target.id === 'modal-overlay') Modal.close();
});

// ── EXPORT ────────────────────────────────────────────────────────────────────
document.getElementById('btn-export').addEventListener('click', () => {
  // Create a downloadable file from the JSON string
  const json    = Storage.exportAll();
  const blob    = new Blob([json], { type: 'application/json' });
  const url     = URL.createObjectURL(blob);
  const anchor  = document.createElement('a');
  anchor.href     = url;
  anchor.download = `grc-backup-${new Date().toISOString().split('T')[0]}.json`;
  anchor.click();
  URL.revokeObjectURL(url); // Clean up memory
});

// ── IMPORT ────────────────────────────────────────────────────────────────────
document.getElementById('btn-import').addEventListener('click', () => {
  // Create a hidden file input, trigger it, read the selected file
  const input   = document.createElement('input');
  input.type    = 'file';
  input.accept  = '.json';
  input.onchange = e => {
    const file   = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        Storage.importAll(ev.target.result);
        alert('Data imported successfully.');
        Router.navigate('dashboard');
      } catch {
        alert('Import failed. Please check the file is a valid GRC export.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
});

// ── RESET ─────────────────────────────────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('This will permanently delete ALL data. Are you sure?')) {
    Storage.resetAll();
    Router.navigate('dashboard');
  }
});

// ── SEED DATA ─────────────────────────────────────────────────────────────────
// Runs only if the risks collection is empty (i.e. first time loading).
// This gives visitors to your portfolio a populated demo to explore.
function seedDemoData() {
  if (Storage.getAll('risks').length > 0) return; // Already has data, skip

  const demoRisks = [
    { id:'RR-001', title:'Account Takeover via Credential Stuffing',
      category:'Fraud Risk', likelihood:4, impact:5, rating:'Critical',
      owner:'Head of Fraud Technology', status:'Open',
      reviewDate:'2025-06-30',
      description:'Automated bots test large volumes of leaked credentials against online banking login.',
      treatment:'Real-time velocity checks, CAPTCHA, device fingerprinting.', framework:'NIST CSF' },
    { id:'RR-002', title:'Phishing Campaign Targeting Staff Credentials',
      category:'Cyber Risk', likelihood:4, impact:4, rating:'High',
      owner:'CISO', status:'Open', reviewDate:'2025-07-15',
      description:'Spear phishing emails targeting staff to harvest VPN and system credentials.',
      treatment:'Email filtering, security awareness training, MFA enforcement.', framework:'ISO 27001' },
    { id:'RR-003', title:'PSD2 SCA Non-Compliance Risk',
      category:'Regulatory Risk', likelihood:3, impact:5, rating:'High',
      owner:'Compliance Director', status:'In Progress', reviewDate:'2025-04-20',
      description:'Biometric fallback authentication does not meet PSD2 RTS Article 4 requirements.',
      treatment:'Remediation project underway with vendor to upgrade fallback flow.', framework:'PSD2' },
    { id:'RR-004', title:'Synthetic Identity Fraud on New Accounts',
      category:'Fraud Risk', likelihood:4, impact:4, rating:'High',
      owner:'Head of Fraud Technology', status:'Open', reviewDate:'2025-05-01',
      description:'Fraudsters combining real and fictitious personal data to open accounts.',
      treatment:'ML-based identity verification, document authenticity checks.', framework:'FCA SYSC' },
    { id:'RR-005', title:'Third Party Data Processor Failure',
      category:'Third Party Risk', likelihood:2, impact:4, rating:'Medium',
      owner:'Vendor Manager', status:'Open', reviewDate:'2025-08-01',
      description:'Critical payment processing vendor experiencing financial instability.',
      treatment:'Annual TPRA, contract SLAs with exit clause, backup vendor identified.', framework:'ISO 31000' },
  ];

  const demoControls = [
    { id:'CTL-001', title:'Real-Time Transaction Fraud Scoring',
      type:'Detective', frameworkRef:'NIST CSF DE.CM-3',
      riskRef:'RR-001', owner:'Fraud Tech Team',
      effectiveness:'Effective', testDate:'2025-02-01', automated:'Yes',
      description:'ML model scoring every transaction in real time against fraud patterns.' },
    { id:'CTL-002', title:'Anti-Phishing Email Gateway',
      type:'Preventive', frameworkRef:'ISO 27001 A.12.6',
      riskRef:'RR-002', owner:'Cyber Security',
      effectiveness:'Effective', testDate:'2025-01-15', automated:'Yes',
      description:'Proofpoint SEG deployed to detect and quarantine phishing emails.' },
    { id:'CTL-003', title:'Strong Customer Authentication (SCA)',
      type:'Preventive', frameworkRef:'PSD2 RTS Art. 4',
      riskRef:'RR-003', owner:'Digital Banking',
      effectiveness:'Partially Effective', testDate:'2025-01-20', automated:'Yes',
      description:'Biometric + OTP MFA on all payment journeys. Fallback gap identified.' },
  ];

  const demoCompliance = [
    { id:'CMP-001', requirement:'Transaction Monitoring & SAR Reporting',
      regulation:'FCA / POCA 2002', article:'s.330',
      status:'Compliant', owner:'MLRO', dueDate:'2025-03-31',
      gapDescription:'', notes:'SARs submitted within statutory window.' },
    { id:'CMP-002', requirement:'Strong Customer Authentication',
      regulation:'PSD2', article:'RTS Art. 4',
      status:'Partially Compliant', owner:'Head of Digital', dueDate:'2025-06-30',
      gapDescription:'Biometric fallback not fully SCA-compliant.',
      notes:'Remediation vendor engaged. Delivery expected May 2025.' },
    { id:'CMP-003', requirement:'Data Subject Rights Requests',
      regulation:'GDPR', article:'Art. 17',
      status:'Compliant', owner:'DPO', dueDate:'2025-05-25',
      gapDescription:'', notes:'DSAR workflow managed via ServiceNow.' },
    { id:'CMP-004', requirement:'Consumer Duty Fair Value Assessment',
      regulation:'FCA PS22/9', article:'Ch. 4',
      status:'In Review', owner:'Head of Products', dueDate:'2025-07-31',
      gapDescription:'Outcomes testing in progress.',
      notes:'Board paper scheduled for Q2 2025.' },
    { id:'CMP-005', requirement:'ICT Risk Management Framework',
      regulation:'DORA', article:'Art. 6',
      status:'Non-Compliant', owner:'CISO', dueDate:'2025-01-17',
      gapDescription:'ICT governance framework not yet implemented to DORA standard.',
      notes:'Gap analysis complete. Remediation road map being built.' },
  ];

  const demoIncidents = [
    { id:'INC-001', title:'Fraudulent BACS Payment Batch',
      severity:'P2 – High', category:'Fraud', status:'Closed',
      dateReported:'2025-01-05', regulatoryNotifiable:'No',
      description:'Batch of fraudulent BACS payments processed due to control bypass.',
      lessons:'Velocity check added to BACS payment journey.' },
    { id:'INC-002', title:'Phishing Email – Staff Credentials Harvested',
      severity:'P2 – High', category:'Cyber', status:'Under Investigation',
      dateReported:'2025-01-12', regulatoryNotifiable:'No',
      description:'Staff member clicked phishing link; credentials potentially compromised.',
      lessons:'Forensic investigation ongoing. Awareness training to be refreshed.' },
    { id:'INC-003', title:'Unauthorised Access – Customer Records',
      severity:'P1 – Critical', category:'Data Breach', status:'Open',
      dateReported:'2025-01-18', regulatoryNotifiable:'Yes',
      description:'Privileged account misused to access customer records without authorisation.',
      lessons:'ICO notification submitted. PAM review initiated.' },
  ];

  demoRisks.forEach(r      => Storage.add('risks',      r));
  demoControls.forEach(c   => Storage.add('controls',   c));
  demoCompliance.forEach(c => Storage.add('compliance', c));
  demoIncidents.forEach(i  => Storage.add('incidents',  i));
}

// ── BOOT SEQUENCE ─────────────────────────────────────────────────────────────
// Initialise all modules (registers their routes with the router)
DashboardModule.init();
RisksModule.init();
ControlsModule.init();   // You'll build this
ComplianceModule.init(); // You'll build this
IncidentsModule.init();

// Seed demo data if first visit
seedDemoData();

// Start the router — this triggers the first page render
Router.init();