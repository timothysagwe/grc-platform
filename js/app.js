/*
  APP.JS — Boots the entire GRC platform application.

  Responsibilities:
  1. Define the Modal helper used by all modules
  2. Wire up Export (CSV) / Import (JSON) / Reset buttons
  3. Seed demo data on first load
  4. Initialise all modules
  5. Start the router
*/

// ── MODAL HELPER ──────────────────────────────────────────────────────────────
const Modal = {
  open()  { document.getElementById('modal-overlay').classList.remove('hidden'); },
  close() { document.getElementById('modal-overlay').classList.add('hidden'); }
};

document.getElementById('modal-close')
  .addEventListener('click', Modal.close);

document.getElementById('modal-overlay')
  .addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') Modal.close();
  });


// ── CSV EXPORT ────────────────────────────────────────────────────────────────
/*
  CSV export works differently from JSON because CSV is a flat format —
  one file, one table. Since the GRC platform has multiple collections
  (risks, controls, compliance, incidents), we export EACH as its own
  CSV file, then trigger all downloads in sequence.

  Steps for each collection:
  1. Get all records from storage
  2. Extract column headers from the keys of the first record
  3. For each record, map its values to a row
  4. Wrap any value containing commas or newlines in double quotes
  5. Join rows with newline characters
  6. Trigger a browser download
*/

function escapeCSVValue(value) {
  /*
    CSV escaping rules:
    - If the value contains a comma, newline, or double-quote, wrap in double quotes
    - Any double-quote characters inside the value must be escaped as ""
    - Null/undefined values become empty strings
  */
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, newline, or quote — wrap in quotes and escape inner quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function collectionToCSV(collection) {
  const records = Storage.getAll(collection);
  if (!records.length) return null; // Nothing to export for this collection

  /*
    Build headers from the keys of ALL records combined.
    This handles the case where different records might have different fields
    (e.g. older records created before a new field was added).
    Using a Set ensures no duplicate column names.
  */
  const allKeys = new Set();
  records.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
  const headers = Array.from(allKeys);

  // Header row
  const headerRow = headers.map(escapeCSVValue).join(',');

  // Data rows — for each record, output values in the same column order as headers
  const dataRows = records.map(record =>
    headers.map(key => escapeCSVValue(record[key])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

function downloadCSV(filename, csvString) {
  /*
    '\uFEFF' is a UTF-8 BOM (Byte Order Mark).
    Adding it to the start of the file tells Excel to interpret
    the CSV as UTF-8, which prevents special characters
    (like £ signs or accented letters) from showing as garbled text.
  */
  const blob   = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url    = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href     = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url); // Free memory after download is triggered
}

function exportAllAsCSV() {
  /*
    We export each collection as a separate CSV file.
    Each file is named: grc-[collection]-[date].csv
    e.g. grc-risks-2025-02-23.csv

    A small delay between downloads (300ms) prevents some browsers
    from blocking multiple simultaneous download triggers.
  */
  const collections = ['risks', 'controls', 'compliance', 'incidents'];
  const dateStr     = new Date().toISOString().split('T')[0]; // e.g. 2025-02-23
  let   delay       = 0;

  let exportedCount = 0;

  collections.forEach(collection => {
    const csv = collectionToCSV(collection);

    if (!csv) return; // Skip empty collections silently

    exportedCount++;
    setTimeout(() => {
      downloadCSV(`grc-${collection}-${dateStr}.csv`, csv);
    }, delay);

    delay += 300; // Stagger each download by 300ms
  });

  if (exportedCount === 0) {
    alert('No data to export. Add some risks, controls, or compliance items first.');
  }
}

// Wire up the export button
document.getElementById('btn-export').addEventListener('click', exportAllAsCSV);


// ── IMPORT (JSON) ─────────────────────────────────────────────────────────────
/*
  Import still uses JSON because CSV doesn't preserve the structure
  needed to restore multiple collections from one file.
  The export-as-JSON function from Storage is used for backup/restore.
  CSV is for analysis (open in Excel). JSON is for backup/restore.

  We keep both concepts separate and clear in the UI:
  Export → CSV (for Excel / analysis)
  Import → JSON (for backup restore)
*/
document.getElementById('btn-import').addEventListener('click', () => {
  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = '.json';
  input.onchange = e => {
    const file   = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        Storage.importAll(ev.target.result);
        alert('Data imported successfully.');
        Router.navigate('dashboard');
      } catch {
        alert('Import failed. Make sure you are importing a valid GRC JSON backup file.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
});


// ── RESET ─────────────────────────────────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('This will permanently delete ALL GRC data. This cannot be undone. Continue?')) {
    Storage.resetAll();
    Router.navigate('dashboard');
  }
});


// ── SEED DEMO DATA ────────────────────────────────────────────────────────────
/*
  Runs only if the risks collection is empty (first time visiting).
  Gives portfolio visitors and learners a fully populated platform to explore
  rather than a blank screen.

  Data is based on a UK banking / fraud technology context, mirroring
  real regulatory obligations (PSD2, GDPR, FCA, DORA, POCA 2002).
*/
function seedDemoData() {
  if (Storage.getAll('risks').length > 0) return; // Already seeded — skip

  const demoRisks = [
    {
      id: 'RR-001',
      title: 'Account Takeover via Credential Stuffing',
      category: 'Fraud Risk',
      likelihood: 4, impact: 5, rating: 'Critical',
      owner: 'Head of Fraud Technology',
      status: 'Open',
      reviewDate: '2025-06-30',
      description: 'Automated bots test large volumes of leaked credentials against online banking login endpoints. Successful logins result in account takeover and fraudulent payments.',
      treatment: 'Real-time velocity checks, CAPTCHA, device fingerprinting, behavioural biometrics.',
      framework: 'NIST CSF'
    },
    {
      id: 'RR-002',
      title: 'Phishing Campaign Targeting Staff Credentials',
      category: 'Cyber Risk',
      likelihood: 4, impact: 4, rating: 'High',
      owner: 'CISO',
      status: 'Open',
      reviewDate: '2025-07-15',
      description: 'Spear phishing emails targeting staff to harvest VPN and internal system credentials. Increases insider threat and lateral movement risk.',
      treatment: 'Email filtering (Proofpoint SEG), security awareness training, MFA enforcement on all systems.',
      framework: 'ISO 27001'
    },
    {
      id: 'RR-003',
      title: 'PSD2 SCA Non-Compliance Risk',
      category: 'Regulatory Risk',
      likelihood: 3, impact: 5, rating: 'High',
      owner: 'Compliance Director',
      status: 'In Progress',
      reviewDate: '2025-04-20',
      description: 'Biometric fallback authentication on mobile app does not fully meet PSD2 RTS Article 4 requirements for Strong Customer Authentication.',
      treatment: 'Remediation project underway with vendor to upgrade biometric fallback flow. Target completion Q2 2025.',
      framework: 'PSD2'
    },
    {
      id: 'RR-004',
      title: 'Synthetic Identity Fraud on New Account Opening',
      category: 'Fraud Risk',
      likelihood: 4, impact: 4, rating: 'High',
      owner: 'Head of Fraud Technology',
      status: 'Open',
      reviewDate: '2025-05-01',
      description: 'Fraudsters combining real and fictitious personal data to pass KYC checks and open accounts used for money mule activity.',
      treatment: 'ML-based identity verification, document authenticity checks, network analysis at onboarding.',
      framework: 'FCA SYSC'
    },
    {
      id: 'RR-005',
      title: 'Third Party Data Processor Failure',
      category: 'Third Party Risk',
      likelihood: 2, impact: 4, rating: 'Medium',
      owner: 'Vendor Manager',
      status: 'Open',
      reviewDate: '2025-08-01',
      description: 'Critical payment processing vendor experiencing financial instability. Failure would disrupt real-time payment processing.',
      treatment: 'Annual TPRA, contract SLAs with exit clause, backup vendor identified and contracted.',
      framework: 'ISO 31000'
    },
    {
      id: 'RR-006',
      title: 'DORA ICT Risk Management Non-Compliance',
      category: 'Regulatory Risk',
      likelihood: 3, impact: 4, rating: 'High',
      owner: 'CISO',
      status: 'In Progress',
      reviewDate: '2025-03-31',
      description: 'ICT risk management framework not yet fully aligned to DORA Article 6 requirements. Applicable via UK adoption pathway.',
      treatment: 'Gap analysis complete. ICT governance road map being built with Q3 2025 target.',
      framework: 'DORA'
    },
  ];

  const demoControls = [
    {
      id: 'CTL-001',
      title: 'Real-Time Transaction Fraud Scoring',
      type: 'Detective',
      frameworkRef: 'NIST CSF DE.CM-3',
      riskRef: 'RR-001',
      owner: 'Fraud Technology Team',
      effectiveness: 'Effective',
      testDate: '2025-02-01',
      nextReviewDate: '2025-08-01',
      automated: 'Yes',
      description: 'ML model scoring every transaction in real time against fraud behavioural patterns. Transactions above threshold are blocked or step-up authenticated.',
      testingNotes: 'Model v3.2 deployed Jan 2025. False positive rate 0.3%.',
      gaps: 'Model drift monitoring not yet automated.'
    },
    {
      id: 'CTL-002',
      title: 'Anti-Phishing Email Gateway',
      type: 'Preventive',
      frameworkRef: 'ISO 27001 A.12.6.1',
      riskRef: 'RR-002',
      owner: 'Cyber Security Team',
      effectiveness: 'Effective',
      testDate: '2025-01-15',
      nextReviewDate: '2025-07-15',
      automated: 'Yes',
      description: 'Proofpoint Secure Email Gateway deployed to detect, quarantine, and block phishing and malicious emails before reaching staff inboxes.',
      testingNotes: 'Quarterly phishing simulation. Jan 2025 click rate: 2.1%.',
      gaps: ''
    },
    {
      id: 'CTL-003',
      title: 'Strong Customer Authentication (SCA)',
      type: 'Preventive',
      frameworkRef: 'PSD2 RTS Art. 4',
      riskRef: 'RR-003',
      owner: 'Digital Banking Team',
      effectiveness: 'Partially Effective',
      testDate: '2025-01-20',
      nextReviewDate: '2025-04-20',
      automated: 'Yes',
      description: 'Biometric and OTP MFA on all payment journeys exceeding PSD2 thresholds. Fallback to PIN not fully SCA-compliant.',
      testingNotes: 'PSD2 RTS compliance assessment Jan 2025. Fallback gap identified.',
      gaps: 'Biometric fallback (PIN only) does not satisfy RTS Art. 4 inherence requirement.'
    },
    {
      id: 'CTL-004',
      title: 'Behavioural Biometrics (BioCatch)',
      type: 'Detective',
      frameworkRef: 'NIST SP 800-53 SI-4',
      riskRef: 'RR-001',
      owner: 'Fraud Technology Team',
      effectiveness: 'Effective',
      testDate: '2025-02-10',
      nextReviewDate: '2025-08-10',
      automated: 'Yes',
      description: 'BioCatch behavioural biometrics monitors typing rhythm, mouse movement, and device interaction patterns to detect account takeover in real time.',
      testingNotes: 'Live since Nov 2024. Detection rate for ATO: 78%.',
      gaps: ''
    },
    {
      id: 'CTL-005',
      title: 'Third Party Risk Assessment (TPRA)',
      type: 'Detective',
      frameworkRef: 'ISO 27001 A.15.2.1',
      riskRef: 'RR-005',
      owner: 'Procurement / Vendor Management',
      effectiveness: 'Effective',
      testDate: '2025-01-05',
      nextReviewDate: '2026-01-05',
      automated: 'No',
      description: 'Annual structured risk assessment of all critical third parties. Covers financial stability, security posture, SLA compliance, and exit planning.',
      testingNotes: 'TPRA completed Jan 2025 for all Tier 1 vendors.',
      gaps: 'Tier 2 vendor assessments run every 2 years — may miss emerging risks.'
    },
  ];

  const demoCompliance = [
    {
      id: 'CMP-001',
      requirement: 'Transaction Monitoring & SAR Reporting',
      regulation: 'POCA 2002',
      article: 's.330',
      status: 'Compliant',
      priority: 'High',
      owner: 'MLRO',
      dueDate: '2025-03-31',
      lastAssessed: '2025-02-01',
      evidence: 'EV-C001 / NCA SAR submission logs',
      gapDescription: '',
      remediationAction: '',
      notes: 'SARs submitted within statutory window. Monthly MLRO review in place.'
    },
    {
      id: 'CMP-002',
      requirement: 'Strong Customer Authentication for Online Payments',
      regulation: 'PSD2',
      article: 'RTS Art. 4',
      status: 'Partially Compliant',
      priority: 'Critical',
      owner: 'Head of Digital Banking',
      dueDate: '2025-06-30',
      lastAssessed: '2025-02-15',
      evidence: 'EV-C002 / SCA Assessment Jan 2025',
      gapDescription: 'Biometric fallback (PIN only) does not satisfy the inherence factor requirement under RTS Art. 4.',
      remediationAction: 'Vendor engaged to upgrade fallback to face ID / fingerprint. Delivery expected May 2025.',
      notes: 'FCA informal engagement completed. No enforcement action at this stage.'
    },
    {
      id: 'CMP-003',
      requirement: 'Data Subject Rights — Right to Erasure',
      regulation: 'GDPR',
      article: 'Art. 17',
      status: 'Compliant',
      priority: 'Medium',
      owner: 'Data Protection Officer',
      dueDate: '2025-05-25',
      lastAssessed: '2025-01-20',
      evidence: 'EV-C003 / DSAR process document v2.1',
      gapDescription: '',
      remediationAction: '',
      notes: 'DSAR workflow managed via ServiceNow. Average response time: 8 days.'
    },
    {
      id: 'CMP-004',
      requirement: 'Consumer Duty — Fair Value Assessment',
      regulation: 'FCA PS22/9 (Consumer Duty)',
      article: 'Ch. 4',
      status: 'In Review',
      priority: 'High',
      owner: 'Head of Products',
      dueDate: '2025-07-31',
      lastAssessed: '2025-03-01',
      evidence: 'EV-C004 / Outcomes testing in progress',
      gapDescription: 'Fair value assessment not yet complete for all retail products.',
      remediationAction: 'Outcomes testing underway. Board paper scheduled Q2 2025.',
      notes: 'FCA supervisory letter received Feb 2025. Response submitted.'
    },
    {
      id: 'CMP-005',
      requirement: 'ICT Risk Management Framework',
      regulation: 'DORA',
      article: 'Art. 6',
      status: 'Non-Compliant',
      priority: 'Critical',
      owner: 'CISO',
      dueDate: '2025-01-17',
      lastAssessed: '2025-02-20',
      evidence: 'EV-C005 / DORA gap analysis report',
      gapDescription: 'ICT governance framework not implemented to DORA standard. ICT risk appetite not formally documented.',
      remediationAction: 'Road map approved by board. Q3 2025 target for full compliance.',
      notes: 'DORA applicable via UK adoption pathway. Legal opinion obtained Feb 2025.'
    },
    {
      id: 'CMP-006',
      requirement: 'Operational Resilience — Important Business Services',
      regulation: 'FCA PS21/3 (Op. Resilience)',
      article: 'Ch. 2',
      status: 'Partially Compliant',
      priority: 'Critical',
      owner: 'Chief Operating Officer',
      dueDate: '2025-03-31',
      lastAssessed: '2025-02-10',
      evidence: 'EV-C006 / IBS tolerance statements draft v0.3',
      gapDescription: 'Impact tolerance statements not yet finalised for 3 of 7 Important Business Services.',
      remediationAction: 'Statements to be finalised by end of March 2025. Board sign-off required.',
      notes: 'FCA expects full compliance by 31 March 2025. At risk of breach.'
    },
  ];

  const demoIncidents = [
    {
      id: 'INC-001',
      title: 'Fraudulent BACS Payment Batch',
      severity: 'P2 – High',
      category: 'Fraud',
      status: 'Closed',
      dateReported: '2025-01-05',
      regulatoryNotifiable: 'No',
      description: 'Batch of 14 fraudulent BACS payments processed totalling £45,000 due to velocity check bypass on legacy payment rail.',
      lessons: 'Velocity check retrofitted to BACS payment journey. Legacy system flagged for replacement.'
    },
    {
      id: 'INC-002',
      title: 'Phishing Email — Staff Credentials Potentially Compromised',
      severity: 'P2 – High',
      category: 'Cyber',
      status: 'Under Investigation',
      dateReported: '2025-01-12',
      regulatoryNotifiable: 'No',
      description: 'Staff member in Payments Operations clicked a phishing link and entered credentials into a spoofed VPN login page. Forensic investigation ongoing.',
      lessons: 'Credentials reset immediately. Email filtering rules updated. Awareness refresher deployed to all staff.'
    },
    {
      id: 'INC-003',
      title: 'Unauthorised Access to Customer Records',
      severity: 'P1 – Critical',
      category: 'Data Breach',
      status: 'Open',
      dateReported: '2025-01-18',
      regulatoryNotifiable: 'Yes',
      description: 'Privileged user account used to access approximately 2,300 customer records outside of normal job function. Possible insider threat or compromised credential.',
      lessons: 'ICO notification submitted within 72 hours. PAM review initiated. UEBA alerts reviewed retrospectively.'
    },
    {
      id: 'INC-004',
      title: 'APP Fraud — Customer Manipulated via Social Engineering',
      severity: 'P2 – High',
      category: 'Fraud',
      status: 'Closed',
      dateReported: '2025-01-25',
      regulatoryNotifiable: 'No',
      description: 'Customer defrauded of £12,000 via authorised push payment after being manipulated by fraudster posing as bank employee. SCA bypassed via social engineering.',
      lessons: 'Customer education campaign launched. In-app warnings added to large payment journeys.'
    },
  ];

  demoRisks.forEach(r      => Storage.add('risks',      r));
  demoControls.forEach(c   => Storage.add('controls',   c));
  demoCompliance.forEach(c => Storage.add('compliance', c));
  demoIncidents.forEach(i  => Storage.add('incidents',  i));
}


// ── BOOT SEQUENCE ─────────────────────────────────────────────────────────────
DashboardModule.init();
RisksModule.init();
ControlsModule.init();
ComplianceModule.init();
IncidentsModule.init();

seedDemoData();
Router.init();