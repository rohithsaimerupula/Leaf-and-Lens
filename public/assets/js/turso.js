// turso.js — Leaf & Lens Turso Cloud Database Client
// This file is the single source of truth for all database operations.
// All admin pages and public pages use this to read/write data.

const TURSO = (() => {
  const DB_URL = "https://leaf-and-lens-tharunmerupula.aws-ap-south-1.turso.io/v2/pipeline";
  const DB_TOKEN = "Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzkxOTA0NzQsImlkIjoiMDE5ZTNmZmQtM2QwMS03OGMyLTlmNTAtZThiYmJjMmY3N2QzIiwicmlkIjoiZTkwMDMyNTQtMzIwZi00YTJhLWFhYTQtMjM2NzQ0Mjg4OGI1In0.fv4NNmBZhf2nwtdxUnM8dCjBeHQsP8BXvZBHlcjdDumt8wl6RiCSOFFAvqzwnhBQY1deZCXNppT8TfPtrkLzAA";

  // ── Core HTTP query executor ─────────────────────
  async function query(sql, args = []) {
    const stmt = args.length > 0 ? { sql, args: args.map(v => v === null ? { type: 'null' } : { type: 'text', value: String(v) }) } : { sql };
    const body = JSON.stringify({
      requests: [
        { type: 'execute', stmt },
        { type: 'close' }
      ]
    });
    const res = await fetch(DB_URL, {
      method: 'POST',
      headers: { 'Authorization': DB_TOKEN, 'Content-Type': 'application/json' },
      body
    });
    const data = await res.json();
    if (data.results[0].type === 'error') {
      throw new Error(data.results[0].error.message);
    }
    return data.results[0].response.result;
  }

  // ── Parse rows into objects ──────────────────────
  function parseRows(result) {
    const cols = result.cols.map(c => c.name);
    return result.rows.map(row => {
      const obj = {};
      cols.forEach((col, i) => {
        const valObj = row[i];
        if (valObj && typeof valObj === 'object') {
          obj[col] = valObj.type === 'null' ? null : (valObj.value ?? null);
        } else {
          obj[col] = valObj ?? null;
        }
      });
      return obj;
    });
  }

  // ── SETTINGS ────────────────────────────────────
  const defaultSettings = {
    regStartDate: "2026-05-20",
    regEndDate: "2026-05-26",
    resultsPublic: false,
    resultDate: "2026-06-05",
    competitionActive: false,
    timerStarted: false
  };

  async function getSettings() {
    try {
      const result = await query("SELECT value FROM config WHERE key = 'settings'");
      const rows = parseRows(result);
      if (rows.length > 0) {
        const parsed = JSON.parse(rows[0].value);
        return { ...defaultSettings, ...parsed };
      }
      return defaultSettings;
    } catch (e) {
      console.warn("Turso getSettings failed, using LocalStorage fallback:", e);
      try { return JSON.parse(localStorage.getItem('ll_settings')) || defaultSettings; }
      catch { return defaultSettings; }
    }
  }

  async function saveSettings(settings) {
    const val = JSON.stringify(settings);
    try {
      await query("INSERT OR REPLACE INTO config (key, value) VALUES ('settings', ?)", [val]);
      localStorage.setItem('ll_settings', val);
    } catch (e) {
      console.warn("Turso saveSettings failed, using LocalStorage fallback:", e);
      localStorage.setItem('ll_settings', val);
    }
  }

  // ── SUBMISSIONS ──────────────────────────────────
  async function getSubmissions() {
    try {
      const result = await query("SELECT * FROM submissions ORDER BY submittedAt DESC");
      return parseRows(result);
    } catch (e) {
      console.warn("Turso getSubmissions failed, using LocalStorage fallback:", e);
      try { return JSON.parse(localStorage.getItem('ll_submissions')) || []; }
      catch { return []; }
    }
  }

  async function saveSubmission(sub) {
    try {
      await query(
        `INSERT OR REPLACE INTO submissions
          (id, teamName, participationType, member1Name, member1Roll, member1Email, member1Phone,
           member2Name, member2Roll, member2Email, member2Phone, photoUrl, reelUrl,
           paymentScreenshotUrl, status, submittedAt, branch, section, member2Branch, member2Section, aiFlags, rating)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          sub.id, sub.teamName || sub.name || '', sub.participationType || sub.category || '',
          sub.member1Name || sub.name || '', sub.member1Roll || sub.rollNum || '',
          sub.member1Email || sub.email || '', sub.member1Phone || sub.phone || '',
          sub.member2Name || null, sub.member2Roll || null, sub.member2Email || null, sub.member2Phone || null,
          sub.photoUrl || null, sub.reelUrl || null,
          sub.paymentScreenshotUrl || sub.paymentScreenshot || '',
          sub.status || 'pending', sub.submittedAt || new Date().toISOString(),
          sub.branch || null, sub.section || null, sub.member2Branch || null, sub.member2Section || null, sub.aiFlags || null, sub.rating !== undefined ? sub.rating : null
        ]
      );
    } catch (e) {
      console.warn("Turso saveSubmission failed, using LocalStorage fallback:", e);
      const subs = JSON.parse(localStorage.getItem('ll_submissions') || '[]');
      const idx = subs.findIndex(s => s.id === sub.id);
      if (idx > -1) subs[idx] = sub; else subs.push(sub);
      localStorage.setItem('ll_submissions', JSON.stringify(subs));
    }
  }

  async function updateSubmissionStatus(id, status) {
    try {
      await query("UPDATE submissions SET status = ? WHERE id = ?", [status, id]);
    } catch (e) {
      console.warn("Turso updateSubmissionStatus failed:", e);
      const subs = JSON.parse(localStorage.getItem('ll_submissions') || '[]');
      const idx = subs.findIndex(s => s.id === id);
      if (idx > -1) { subs[idx].status = status; localStorage.setItem('ll_submissions', JSON.stringify(subs)); }
    }
  }

  async function updateSubmissionRating(id, rating) {
    try {
      await query("UPDATE submissions SET rating = ? WHERE id = ?", [rating, id]);
    } catch (e) {
      console.warn("Turso updateSubmissionRating failed, using localStorage:", e);
      const subs = JSON.parse(localStorage.getItem('ll_submissions') || '[]');
      const idx = subs.findIndex(s => s.id === id);
      if (idx > -1) { subs[idx].rating = rating; localStorage.setItem('ll_submissions', JSON.stringify(subs)); }
    }
  }

  async function deleteSubmission(id) {
    try {
      await query("DELETE FROM submissions WHERE id = ?", [id]);
    } catch (e) {
      console.warn("Turso deleteSubmission failed:", e);
      const subs = JSON.parse(localStorage.getItem('ll_submissions') || '[]');
      localStorage.setItem('ll_submissions', JSON.stringify(subs.filter(s => s.id !== id)));
    }
  }

  // ── ADMIN CREDENTIALS ────────────────────────────
  const defaultCreds = { username: 'admin', password: 'leaflens2026' };

  async function getAdminCreds() {
    try {
      const result = await query("SELECT value FROM config WHERE key = 'admin_creds'");
      const rows = parseRows(result);
      if (rows.length > 0) return { ...defaultCreds, ...JSON.parse(rows[0].value) };
      return defaultCreds;
    } catch (e) {
      try { return JSON.parse(localStorage.getItem('ll_admin_creds')) || defaultCreds; }
      catch { return defaultCreds; }
    }
  }

  async function saveAdminCreds(creds) {
    const val = JSON.stringify(creds);
    try {
      await query("INSERT OR REPLACE INTO config (key, value) VALUES ('admin_creds', ?)", [val]);
      localStorage.setItem('ll_admin_creds', val);
    } catch (e) {
      localStorage.setItem('ll_admin_creds', val);
    }
  }

  // ── COORDINATORS ─────────────────────────────────
  const defaultCoordinators = {
    faculty: [
      { name: 'Mr. S. Yogeshwara Rao', role: 'Faculty Coordinator', phone: '94901 49200', initials: 'SY' },
      { name: 'Dr. K. Sirisha', role: 'Faculty Coordinator', phone: '8688753830', initials: 'KS' },
      { name: 'Ms. Ch. Meenakshi', role: 'Faculty Coordinator', phone: '7075739689', initials: 'CM' }
    ],
    student: [
      { name: 'M. Rohith Sai', role: 'Student Coordinator', phone: '9014123748', initials: 'MR' },
      { name: 'N. Govardhan', role: 'Student Coordinator', phone: '9030536726', initials: 'NG' },
      { name: 'M. Kotesh', role: 'Student Coordinator', phone: '9908474421', initials: 'MK' }
    ]
  };

  async function getCoordinators() {
    return defaultCoordinators;
  }

  async function saveCoordinators(coords) {
    const val = JSON.stringify(coords);
    try {
      await query("INSERT OR REPLACE INTO config (key, value) VALUES ('coordinators', ?)", [val]);
      localStorage.setItem('ll_coordinators', val);
    } catch (e) {
      localStorage.setItem('ll_coordinators', val);
    }
  }

  // ── WINNERS ─────────────────────────────────────
  async function getWinners() {
    try {
      const result = await query("SELECT * FROM winners");
      return parseRows(result);
    } catch (e) {
      console.warn("Turso getWinners failed:", e);
      try { return JSON.parse(localStorage.getItem('ll_results')) || []; }
      catch { return []; }
    }
  }

  async function saveWinner(winner) {
    try {
      await query(
        `INSERT OR REPLACE INTO winners (key, label, submissionId, name, branch, category, fileUrl, caption)
         VALUES (?,?,?,?,?,?,?,?)`,
        [winner.key, winner.label, winner.submissionId || '', winner.name, winner.branch || '', winner.category || '', winner.fileUrl || null, winner.caption || null]
      );
    } catch (e) {
      console.warn("Turso saveWinner failed:", e);
    }
  }

  return { getSettings, saveSettings, getSubmissions, saveSubmission, updateSubmissionStatus, updateSubmissionRating, deleteSubmission, getWinners, saveWinner, getAdminCreds, saveAdminCreds, getCoordinators, saveCoordinators };
})();

window.TURSO = TURSO;
