import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory can be configured via environment variable for Docker persistence
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const dbFile = fs.existsSync(path.join(DATA_DIR, 'wichtelmat.sqlite')) && !fs.existsSync(path.join(DATA_DIR, 'wichtlag.sqlite'))
  ? 'wichtelmat.sqlite'
  : 'wichtlag.sqlite';
const dbPath = path.join(DATA_DIR, dbFile);
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_date TEXT NOT NULL,
    max_budget TEXT,
    banner_url TEXT,
    admin_token TEXT NOT NULL UNIQUE,
    is_drawn INTEGER DEFAULT 0,
    drawn_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_claimed INTEGER DEFAULT 0,
    claimed_at TEXT,
    participant_token TEXT UNIQUE,
    avatar_url TEXT,
    wishlist_text TEXT,
    wishlist_url TEXT,
    is_ready INTEGER DEFAULT 0,
    wishlist_updated_at TEXT,
    target_participant_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY(target_participant_id) REFERENCES participants(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS exclusions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    giver_name TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
  CREATE INDEX IF NOT EXISTS idx_exclusions_event ON exclusions(event_id);
`);

// Safe migrations for existing databases
try {
  db.exec(`ALTER TABLE participants ADD COLUMN wishlist_updated_at TEXT`);
} catch (e) {
  // column already exists
}

export { db, DATA_DIR, UPLOADS_DIR };
