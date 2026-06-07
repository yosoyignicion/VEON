const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'veon.db');

let db;

function initDB() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      original_name TEXT,
      format TEXT,
      status TEXT DEFAULT 'queued',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      duration REAL,
      output_path TEXT,
      error TEXT,
      output_format TEXT DEFAULT 'mp4',
      output_size INTEGER,
      thumbnail_path TEXT
    )
  `);
  try { db.exec("ALTER TABLE jobs ADD COLUMN output_format TEXT DEFAULT 'mp4'"); } catch {}
  try { db.exec('ALTER TABLE jobs ADD COLUMN output_size INTEGER'); } catch {}
  try { db.exec('ALTER TABLE jobs ADD COLUMN thumbnail_path TEXT'); } catch {}
  return db;
}

function getDB() {
  if (!db) throw new Error('DB not initialized');
  return db;
}

function createJob({ id, originalName, format, outputFormat }) {
  const stmt = getDB().prepare(
    'INSERT INTO jobs (id, original_name, format, output_format) VALUES (?, ?, ?, ?)'
  );
  stmt.run(id, originalName, format, outputFormat || 'mp4');
}

function updateJob({ id, status, duration, outputPath, error, outputSize, thumbnailPath }) {
  const fields = [];
  const values = [];

  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (duration !== undefined) { fields.push('duration = ?'); values.push(duration); }
  if (outputPath !== undefined) { fields.push('output_path = ?'); values.push(outputPath); }
  if (error !== undefined) { fields.push('error = ?'); values.push(error); }
  if (outputSize !== undefined) { fields.push('output_size = ?'); values.push(outputSize); }
  if (thumbnailPath !== undefined) { fields.push('thumbnail_path = ?'); values.push(thumbnailPath); }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  const sql = `UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);
  getDB().prepare(sql).run(...values);
}

function getJob(id) {
  return getDB().prepare('SELECT * FROM jobs WHERE id = ?').get(id);
}

function listJobs() {
  return getDB().prepare('SELECT * FROM jobs ORDER BY created_at DESC').all();
}

module.exports = { initDB, getDB, createJob, updateJob, getJob, listJobs };
