const fs = require('fs');
const path = require('path');

const snapshotPath = process.env.SNAPSHOT_PATH || (
  process.env.DATA_DIR
    ? path.join(process.env.DATA_DIR, 'data_snapshot.json')
    : path.join(__dirname, '../../data_snapshot.json')
);

let saveDebounceTimer = null;

/**
 * Save snapshot of all essential database tables to JSON file
 */
async function saveSnapshot(db) {
  if (!db) return;
  
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(async () => {
    try {
      const tables = [
        'school_information',
        'homework',
        'homework_attachments',
        'notices',
        'announcements',
        'activities',
        'activity_images',
        'gallery_categories',
        'gallery',
        'students',
        'users',
        'calendar_events',
        'downloads'
      ];

      const snapshot = {};
      for (const table of tables) {
        try {
          const rows = await db.all(`SELECT * FROM ${table}`);
          snapshot[table] = rows || [];
        } catch (e) {
          snapshot[table] = [];
        }
      }

      fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
      console.log('💾 Data snapshot saved successfully!');
    } catch (err) {
      console.error('⚠️ Failed to save data snapshot:', err.message);
    }
  }, 500);
}

/**
 * Restore data snapshot into SQLite database on server startup
 */
async function restoreSnapshot(db) {
  try {
    if (!fs.existsSync(snapshotPath)) return;
    const raw = fs.readFileSync(snapshotPath, 'utf8');
    if (!raw || !raw.trim()) return;

    const snapshot = JSON.parse(raw);
    if (!snapshot || typeof snapshot !== 'object') return;

    for (const [table, rows] of Object.entries(snapshot)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;

      try {
        // Safely insert snapshot rows if missing WITHOUT deleting any existing data
        const sampleRow = rows[0];
        const cols = Object.keys(sampleRow);
        const colNames = cols.join(', ');
        const placeholders = cols.map(() => '?').join(', ');

        const stmt = await db.prepare(`INSERT OR IGNORE INTO ${table} (${colNames}) VALUES (${placeholders})`);
        for (const row of rows) {
          const values = cols.map((c) => (row[c] === undefined ? null : row[c]));
          await stmt.run(values);
        }
        await stmt.finalize();
      } catch (tableErr) {
        console.error(`⚠️ Error restoring table ${table}:`, tableErr.message);
      }
    }
    console.log('✅ Restored latest user data snapshot successfully on boot!');
  } catch (err) {
    console.error('⚠️ Failed to restore data snapshot:', err.message);
  }
}

module.exports = {
  saveSnapshot,
  restoreSnapshot
};
