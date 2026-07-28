// Reset + seed the SkillSwap database with fake demo data.
// Usage: node scripts/seed.mjs   (or: npm run seed)
// Writes through its own connection, so a running dev server just needs a refresh.
import { DatabaseSync } from "node:sqlite";
import { scryptSync, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, "skillswap.db"));
db.exec("PRAGMA busy_timeout = 8000;");

// --- schema (idempotent; matches lib/db.ts) ---
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, salt TEXT NOT NULL, background TEXT DEFAULT '',
  education TEXT DEFAULT '', teaching_style TEXT DEFAULT '', learning_style TEXT DEFAULT '',
  credits INTEGER NOT NULL DEFAULT 5, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS user_tags (user_id INTEGER, kind TEXT, tag TEXT);
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id INTEGER, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id INTEGER, skill TEXT, cost INTEGER,
  est_days INTEGER DEFAULT 1, description TEXT DEFAULT '', popularity INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER, student_id INTEGER, teacher_id INTEGER,
  status TEXT DEFAULT 'pending', escrow_credits INTEGER DEFAULT 0, teacher_avail TEXT DEFAULT '',
  session_len_min INTEGER DEFAULT 60, expected_end TEXT DEFAULT '', rules_text TEXT DEFAULT '',
  student_slots TEXT DEFAULT '', meet_link TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS timetable (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER,
  starts_at TEXT, ends_at TEXT, meet_link TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS materials (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER,
  filename TEXT, path TEXT, uploaded_at TEXT DEFAULT (datetime('now')), opened_at TEXT DEFAULT '',
  closed_at TEXT DEFAULT '', total_seconds INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER,
  reviewer_id INTEGER, reviewee_id INTEGER, rating INTEGER, text TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')));
`);

// --- wipe ---
db.exec("PRAGMA foreign_keys = OFF;");
for (const t of ["reviews", "materials", "timetable", "requests", "user_tags", "sessions", "courses", "users"])
  db.exec(`DELETE FROM ${t};`);
db.exec("DELETE FROM sqlite_sequence;");
db.exec("PRAGMA foreign_keys = ON;");

function hash(pw) {
  const salt = randomBytes(16).toString("hex");
  return { h: scryptSync(pw, salt, 64).toString("hex"), salt };
}

// --- users (everyone can teach + learn; password is "password") ---
const USERS = [
  { name: "Priya Sharma", email: "priya@demo.dev", bg: "Self-taught developer, 4 yrs freelancing", edu: "B.Sc Computer Science", ts: "Hands-on / Project-based", ls: "Visual", teach: ["Frontend Development", "React", "UI Design"], learn: ["Public Speaking", "Guitar"], credits: 11 },
  { name: "Arjun Rao", email: "arjun@demo.dev", bg: "Marketing pro exploring tech", edu: "MBA, Marketing", ts: "Auditory / Discussion", ls: "Reading / Writing", teach: ["Public Speaking", "Content Writing"], learn: ["React", "Frontend Development"], credits: 8 },
  { name: "Meera Iyer", email: "meera@demo.dev", bg: "Illustrator & muralist", edu: "BFA, Fine Arts", ts: "Hands-on / Project-based", ls: "Visual", teach: ["Watercolour Painting", "Sketching"], learn: ["Yoga", "French"], credits: 5 },
  { name: "Daniel Okafor", email: "daniel@demo.dev", bg: "Session guitarist, 10 yrs", edu: "Diploma, Music Performance", ts: "Step-by-step", ls: "Auditory / Discussion", teach: ["Guitar", "Music Theory"], learn: ["Python", "Data Analysis"], credits: 2 },
  { name: "Sofia Marquez", email: "sofia@demo.dev", bg: "Language tutor & dancer", edu: "B.A. Linguistics", ts: "Auditory / Discussion", ls: "Hands-on / Project-based", teach: ["Spanish", "Salsa Dancing"], learn: ["Photography", "UI Design"], credits: 4 },
  { name: "Kenji Tanaka", email: "kenji@demo.dev", bg: "Data scientist at a startup", edu: "M.Sc Statistics", ts: "Step-by-step", ls: "Visual", teach: ["Python", "Data Analysis", "Machine Learning"], learn: ["Public Speaking", "Guitar"], credits: 10 },
  { name: "Aisha Khan", email: "aisha@demo.dev", bg: "Certified yoga instructor", edu: "500-hr YTT", ts: "Hands-on / Project-based", ls: "Reading / Writing", teach: ["Yoga", "Meditation"], learn: ["Watercolour Painting", "Content Writing"], credits: 4 },
  { name: "Liam O'Brien", email: "liam@demo.dev", bg: "Freelance photographer", edu: "Self-taught", ts: "Visual", ls: "Auditory / Discussion", teach: ["Photography", "Video Editing"], learn: ["Spanish", "Music Theory"], credits: 3 },
  { name: "Fatima Noor", email: "fatima@demo.dev", bg: "Pastry chef & polyglot", edu: "Culinary Diploma", ts: "Step-by-step", ls: "Hands-on / Project-based", teach: ["French", "Baking"], learn: ["Machine Learning", "Salsa Dancing"], credits: 1 },
  { name: "Marcus Bell", email: "marcus@demo.dev", bg: "Ex-banker, chess coach", edu: "B.A. Economics", ts: "Auditory / Discussion", ls: "Reading / Writing", teach: ["Chess", "Personal Finance"], learn: ["Guitar", "Yoga"], credits: 4 },
];

const uid = {};
const insUser = db.prepare(`INSERT INTO users (name,email,password_hash,salt,background,education,teaching_style,learning_style,credits) VALUES (?,?,?,?,?,?,?,?,?)`);
const insTag = db.prepare(`INSERT INTO user_tags (user_id,kind,tag) VALUES (?,?,?)`);
for (const u of USERS) {
  const { h, salt } = hash("password");
  const id = Number(insUser.run(u.name, u.email, h, salt, u.bg, u.edu, u.ts, u.ls, u.credits).lastInsertRowid);
  uid[u.email] = id;
  for (const t of u.teach) insTag.run(id, "teach", t);
  for (const t of u.learn) insTag.run(id, "learn", t);
}

// --- courses: [teacherEmail, skill, cost, days, desc] ---
const COURSES = [
  ["priya@demo.dev", "Intro to React", 3, 14, "Hooks, state, and components — build a real app."],
  ["priya@demo.dev", "Modern CSS & Tailwind", 2, 7, "Flexbox, grid, and utility-first styling."],
  ["priya@demo.dev", "UI Design Foundations", 3, 10, "Layout, type, and colour for interfaces."],
  ["arjun@demo.dev", "Confident Public Speaking", 2, 7, "Beat the nerves and own the stage."],
  ["arjun@demo.dev", "Blog Writing that Ranks", 2, 6, "Write posts people (and Google) love."],
  ["meera@demo.dev", "Watercolour for Beginners", 2, 8, "Washes, blends, and your first landscape."],
  ["meera@demo.dev", "Urban Sketching", 1, 5, "Capture streets and cafes in ink."],
  ["daniel@demo.dev", "Fingerstyle Guitar Basics", 3, 21, "Play melodies and bass together."],
  ["daniel@demo.dev", "Music Theory 101", 2, 10, "Scales, chords, and how songs work."],
  ["sofia@demo.dev", "Conversational Spanish", 2, 14, "Speak from day one — no boring drills."],
  ["sofia@demo.dev", "Salsa: First Steps", 1, 5, "Basic steps, timing, and turns."],
  ["kenji@demo.dev", "Python for Absolute Beginners", 3, 14, "From zero to writing useful scripts."],
  ["kenji@demo.dev", "Data Analysis with Pandas", 4, 18, "Wrangle and chart real datasets."],
  ["kenji@demo.dev", "Intro to Machine Learning", 4, 21, "Models, training, and evaluation basics."],
  ["aisha@demo.dev", "Morning Yoga Flow", 1, 7, "Wake up your body in 30 minutes."],
  ["aisha@demo.dev", "Guided Meditation", 1, 5, "Simple breathwork for a calmer mind."],
  ["liam@demo.dev", "Photography: Manual Mode", 3, 12, "Master aperture, shutter, and ISO."],
  ["liam@demo.dev", "Video Editing in DaVinci", 3, 12, "Cut, colour, and export like a pro."],
  ["fatima@demo.dev", "French for Travellers", 2, 10, "Get around and order like a local."],
  ["fatima@demo.dev", "Home Baking: Breads", 2, 9, "Sourdough, focaccia, and soft rolls."],
  ["marcus@demo.dev", "Chess Openings", 2, 8, "Start every game with a plan."],
  ["marcus@demo.dev", "Personal Finance 101", 2, 7, "Budgets, saving, and simple investing."],
];
const cid = {};
const insCourse = db.prepare(`INSERT INTO courses (teacher_id,skill,cost,est_days,description) VALUES (?,?,?,?,?)`);
for (const [email, skill, cost, days, desc] of COURSES)
  cid[skill] = Number(insCourse.run(uid[email], skill, cost, days, desc).lastInsertRowid);

// --- exchanges ---
const AVAIL = JSON.stringify([{ day: "Mon", time: "18:00" }, { day: "Wed", time: "18:00" }, { day: "Sat", time: "11:00" }]);
const CHOSEN = JSON.stringify([{ day: "Mon", time: "18:00" }, { day: "Wed", time: "18:00" }]);
const MEET = "https://meet.google.com/demo-swap-room";

// [student, teacher, skill, status, escrow, updatedMod, scheduled?]
const EX = [
  ["arjun@demo.dev", "priya@demo.dev", "Intro to React", "completed", 0, "-2 days", false],
  ["kenji@demo.dev", "arjun@demo.dev", "Confident Public Speaking", "completed", 0, "-3 days", false],
  ["daniel@demo.dev", "kenji@demo.dev", "Python for Absolute Beginners", "completed", 0, "-18 hours", false],
  ["marcus@demo.dev", "aisha@demo.dev", "Morning Yoga Flow", "completed", 0, "-5 hours", false],
  ["sofia@demo.dev", "priya@demo.dev", "UI Design Foundations", "completed", 0, "-1 day", false],
  ["liam@demo.dev", "sofia@demo.dev", "Conversational Spanish", "completed", 0, "-6 hours", false],
  ["aisha@demo.dev", "arjun@demo.dev", "Blog Writing that Ranks", "completed", 0, "-30 hours", false],
  ["fatima@demo.dev", "kenji@demo.dev", "Intro to Machine Learning", "completed", 0, "-3 hours", false],
  ["arjun@demo.dev", "daniel@demo.dev", "Fingerstyle Guitar Basics", "confirmed", 3, "-8 minutes", true],
  ["meera@demo.dev", "aisha@demo.dev", "Morning Yoga Flow", "confirmed", 1, "-25 minutes", true],
  ["marcus@demo.dev", "daniel@demo.dev", "Fingerstyle Guitar Basics", "accepted", 3, "-50 minutes", "accepted"],
  ["sofia@demo.dev", "liam@demo.dev", "Photography: Manual Mode", "pending", 0, "-10 minutes", false],
  ["liam@demo.dev", "sofia@demo.dev", "Salsa: First Steps", "pending", 0, "-40 minutes", false],
];

const insReq = db.prepare(`INSERT INTO requests (course_id,student_id,teacher_id,status,escrow_credits,teacher_avail,session_len_min,expected_end,rules_text,student_slots,meet_link,created_at,updated_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?, datetime('now', ?), datetime('now', ?))`);
const insTT = db.prepare(`INSERT INTO timetable (request_id,starts_at,ends_at,meet_link) VALUES (?,?,?,?)`);

function pad(n) { return String(n).padStart(2, "0"); }
function sessionStr(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(18, 0, 0, 0);
  const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00`;
  const e = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`;
  return [s, e];
}

const reqIds = [];
for (const [se, te, skill, status, escrow, mod, sched] of EX) {
  const scheduled = sched === true;
  const accepted = sched === "accepted";
  const avail = scheduled || accepted ? AVAIL : "";
  const chosen = scheduled ? CHOSEN : "";
  const expEnd = scheduled || accepted ? "2026-08-31" : "";
  const rules = scheduled || accepted ? "Come prepared; practice between sessions." : "";
  const meet = scheduled ? MEET : "";
  const id = Number(
    insReq.run(cid[skill], uid[se], uid[te], status, escrow, avail, 60, expEnd, rules, chosen, meet, mod, mod).lastInsertRowid,
  );
  reqIds.push({ id, skill, se, te, status });
  if (scheduled) for (const ahead of [2, 9, 16]) { const [s, e] = sessionStr(ahead); insTT.run(id, s, e, MEET); }
}

// --- reviews (on completed exchanges; both directions on some) ---
const byPair = (se, te) => reqIds.find((r) => r.se === se && r.te === te && r.status === "completed");
const insRev = db.prepare(`INSERT INTO reviews (request_id,reviewer_id,reviewee_id,rating,text) VALUES (?,?,?,?,?)`);
const REVIEWS = [
  ["arjun@demo.dev", "priya@demo.dev", 5, "Priya explained hooks so clearly — I shipped my first app."],
  ["priya@demo.dev", "arjun@demo.dev", 5, "Arjun came prepared and asked sharp questions."],
  ["kenji@demo.dev", "arjun@demo.dev", 5, "Great, practical tips on stage presence."],
  ["arjun@demo.dev", "kenji@demo.dev", 4, "Curious and quick learner."],
  ["daniel@demo.dev", "kenji@demo.dev", 5, "Python finally clicked. Patient teacher."],
  ["kenji@demo.dev", "daniel@demo.dev", 4, "Enthusiastic, did all the exercises."],
  ["marcus@demo.dev", "aisha@demo.dev", 5, "Calm, welcoming sessions — a great start to the day."],
  ["sofia@demo.dev", "priya@demo.dev", 4, "Solid fundamentals and honest feedback."],
  ["priya@demo.dev", "sofia@demo.dev", 5, "A joy to teach."],
  ["liam@demo.dev", "sofia@demo.dev", 5, "Mis clases favoritas — I can actually hold a conversation now."],
  ["aisha@demo.dev", "arjun@demo.dev", 4, "Helpful, structured writing feedback."],
  ["fatima@demo.dev", "kenji@demo.dev", 5, "Best intro to ML I've come across."],
];
for (const [reviewer, reviewee, rating, text] of REVIEWS) {
  // find the completed request connecting these two (either direction)
  const r = reqIds.find(
    (x) => x.status === "completed" && ((x.se === reviewer && x.te === reviewee) || (x.te === reviewer && x.se === reviewee)),
  );
  insRev.run(r ? r.id : null, uid[reviewer], uid[reviewee], rating, text);
}

// popularity = completed count per course
db.exec(`UPDATE courses SET popularity = (SELECT COUNT(*) FROM requests WHERE course_id = courses.id AND status = 'completed')`);

const counts = ["users", "courses", "requests", "reviews", "timetable"].map(
  (t) => `${t}=${db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n}`,
);
console.log("Seeded:", counts.join("  "));
console.log("All accounts use password: password");
db.close();
