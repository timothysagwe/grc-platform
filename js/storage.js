/*
  STORAGE.JS — The data layer of the GRC platform.

  localStorage works like a dictionary:
    - You give it a KEY (a string name) and a VALUE (your data as a string)
    - localStorage.setItem('myKey', 'myValue')  → saves it
    - localStorage.getItem('myKey')             → retrieves it
    - Data survives page refresh and browser close

  JSON.stringify() converts a JavaScript object/array into a string for storage.
  JSON.parse()     converts it back into a JavaScript object/array when reading.

  The entire module is wrapped in an IIFE (Immediately Invoked Function Expression):
    const Storage = (() => { ... })();
  This creates a private scope — nothing inside can be accidentally overwritten
  by other scripts. Only what's in the final 'return' is accessible outside.
*/

const Storage = (() => {

  // These are the localStorage key names for each GRC collection.
  // Centralising them here means if you rename one, you change it in ONE place.
  const KEYS = {
    risks:      'grc_risks',
    controls:   'grc_controls',
    compliance: 'grc_compliance',
    incidents:  'grc_incidents',
  };

  /*
    uid() — Generates a unique ID for new records.
    Example: uid('RR') might return 'RR-1714912345678-A3F2'
    This ensures no two risks share the same ID.
  */
  function uid(prefix) {
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${Date.now()}-${rand}`;
  }

  /*
    getAll(collection) — Returns all records for a collection as an array.
    If nothing is stored yet, returns an empty array [].

    Why '|| []'?
    localStorage.getItem returns NULL if the key doesn't exist.
    JSON.parse(null) throws an error. So we default to '[]' (empty array string)
    before parsing, making this safe on first run.
  */
  function getAll(collection) {
    const key  = KEYS[collection];
    const raw  = localStorage.getItem(key) || '[]';
    return JSON.parse(raw);
  }

  /*
    saveAll(collection, dataArray) — Saves an entire array to localStorage.
    Called internally after every add/update/delete.
  */
  function saveAll(collection, dataArray) {
    localStorage.setItem(KEYS[collection], JSON.stringify(dataArray));
  }

  /*
    add(collection, record) — Adds a new record to a collection.
    Automatically assigns an id, createdAt, and updatedAt timestamp.
  */
  function add(collection, record) {
    const all = getAll(collection);

    // Assign metadata
    record.id        = record.id || uid(collection.slice(0, 2).toUpperCase());
    record.createdAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();

    all.push(record);
    saveAll(collection, all);
    return record; // Return it so the caller can use the generated ID
  }

  /*
    update(collection, id, changes) — Updates specific fields of one record.
    Uses the spread operator { ...existing, ...changes } to merge:
    if existing = { title: 'Old', status: 'Open' }
    and changes = { status: 'Closed' }
    result is  = { title: 'Old', status: 'Closed', updatedAt: '...' }
  */
  function update(collection, id, changes) {
    const all = getAll(collection);
    const idx = all.findIndex(r => r.id === id); // Find position of record with this id
    if (idx === -1) return null;                  // Not found, bail out

    all[idx] = { ...all[idx], ...changes, updatedAt: new Date().toISOString() };
    saveAll(collection, all);
    return all[idx];
  }

  /*
    remove(collection, id) — Deletes one record from a collection.
    filter() returns a new array excluding the record with this id.
  */
  function remove(collection, id) {
    const all     = getAll(collection);
    const updated = all.filter(r => r.id !== id);
    saveAll(collection, updated);
  }

  /*
    getById(collection, id) — Retrieves one specific record.
    Returns null if not found — callers should check for null.
  */
  function getById(collection, id) {
    return getAll(collection).find(r => r.id === id) || null;
  }

  /*
    exportAll() — Bundles all GRC data into one JSON string.
    Used for the "Export Data" button so users can back up and share data.
  */
  function exportAll() {
    const snapshot = {};
    Object.keys(KEYS).forEach(k => {
      snapshot[k] = getAll(k);
    });
    return JSON.stringify(snapshot, null, 2); // null, 2 = pretty-printed JSON
  }

  /*
    importAll(jsonString) — Restores data from an exported JSON string.
    Overwrites existing data. Used for the "Import Data" button.
  */
  function importAll(jsonString) {
    const parsed = JSON.parse(jsonString);
    Object.keys(KEYS).forEach(k => {
      if (parsed[k] && Array.isArray(parsed[k])) {
        saveAll(k, parsed[k]);
      }
    });
  }

  /*
    resetAll() — Wipes all GRC data from localStorage.
    Used for the "Reset All" button.
  */
  function resetAll() {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  }

  // Expose only what other modules are allowed to use
  return { KEYS, getAll, add, update, remove, getById, exportAll, importAll, resetAll };

})();