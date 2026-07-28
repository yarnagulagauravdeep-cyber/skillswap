import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { hashPassword } from "./crypto";

// `data/` holds the SQLite file; created on first run, git-ignored.
const DATA_DIR = path.join(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, "skillswap.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  salt           TEXT NOT NULL,
  background     TEXT DEFAULT '',
  education      TEXT DEFAULT '',
  teaching_style TEXT DEFAULT '',
  learning_style TEXT DEFAULT '',
  credits        INTEGER NOT NULL DEFAULT 5,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_tags (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind    TEXT NOT NULL CHECK (kind IN ('teach','learn')),
  tag     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill       TEXT NOT NULL,
  cost        INTEGER NOT NULL CHECK (cost BETWEEN 1 AND 4),
  est_days    INTEGER NOT NULL DEFAULT 1,
  description TEXT DEFAULT '',
  popularity  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS requests (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id       INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending',
  escrow_credits  INTEGER NOT NULL DEFAULT 0,
  teacher_avail   TEXT DEFAULT '',
  session_len_min INTEGER DEFAULT 60,
  expected_end    TEXT DEFAULT '',
  rules_text      TEXT DEFAULT '',
  student_slots   TEXT DEFAULT '',
  meet_link       TEXT DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS timetable (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  starts_at  TEXT NOT NULL,
  ends_at    TEXT NOT NULL,
  meet_link  TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS materials (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id    INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  path          TEXT NOT NULL,
  uploaded_at   TEXT NOT NULL DEFAULT (datetime('now')),
  opened_at     TEXT DEFAULT '',
  closed_at     TEXT DEFAULT '',
  total_seconds INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id  INTEGER REFERENCES requests(id) ON DELETE SET NULL,
  reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        TEXT DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function seedIfEmpty(database: DatabaseSync) {
  const row = database.prepare("SELECT COUNT(*) AS n FROM users").get() as {
    n: number;
  };
  if (row.n > 0) return;

  const demo = [
    {
      name: "Priya Sharma",
      email: "priya@demo.dev",
      password: "password",
      background: "Self-taught developer, 4 years freelancing",
      education: "B.Sc Computer Science",
      teaching_style: "Hands-on, project-based",
      learning_style: "Visual",
      teach: ["Frontend Development", "React", "UI Design"],
      learn: ["Public Speaking", "Guitar"],
    },
    {
      name: "Arjun Rao",
      email: "arjun@demo.dev",
      password: "password",
      background: "Marketing professional exploring tech",
      education: "MBA, Marketing",
      teaching_style: "Discussion-led, storytelling",
      learning_style: "Reading/Writing",
      teach: ["Public Speaking", "Content Writing"],
      learn: ["Frontend Development", "React"],
    },
  ];

  const insertUser = database.prepare(
    `INSERT INTO users (name, email, password_hash, salt, background, education, teaching_style, learning_style)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertTag = database.prepare(
    "INSERT INTO user_tags (user_id, kind, tag) VALUES (?, ?, ?)",
  );

  for (const u of demo) {
    const { hash, salt } = hashPassword(u.password);
    const res = insertUser.run(
      u.name,
      u.email,
      hash,
      salt,
      u.background,
      u.education,
      u.teaching_style,
      u.learning_style,
    );
    const id = Number(res.lastInsertRowid);
    for (const t of u.teach) insertTag.run(id, "teach", t);
    for (const t of u.learn) insertTag.run(id, "learn", t);
  }
}

function init(): DatabaseSync {
  const database = new DatabaseSync(DB_PATH);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(SCHEMA);
  seedIfEmpty(database);
  return database;
}

// Reuse a single connection across dev HMR reloads.
const globalForDb = globalThis as unknown as { __ssDb?: DatabaseSync };

/**
 * Lazily opened connection. The DB is only opened on first query — never at
 * import time — so `next build` can evaluate the module graph across parallel
 * workers without them fighting over the SQLite file ("database is locked").
 */
function getDb(): DatabaseSync {
  if (!globalForDb.__ssDb) globalForDb.__ssDb = init();
  return globalForDb.__ssDb;
}

export const db: DatabaseSync = new Proxy({} as DatabaseSync, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value;
  },
});
