import { db } from "../db";

export type TagKind = "teach" | "learn";

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  salt: string;
  background: string;
  education: string;
  teaching_style: string;
  learning_style: string;
  credits: number;
  created_at: string;
}

/** User shape safe to send to the client (no secrets). */
export interface PublicUser {
  id: number;
  name: string;
  email: string;
  background: string;
  education: string;
  teachingStyle: string;
  learningStyle: string;
  credits: number;
  teachTags: string[];
  learnTags: string[];
}

export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  background: string;
  education: string;
  teachingStyle: string;
  learningStyle: string;
  teachTags: string[];
  learnTags: string[];
}

export function getUserByEmail(email: string): UserRow | undefined {
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase().trim()) as UserRow | undefined;
}

export function getUserRowById(id: number): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | UserRow
    | undefined;
}

export function getTags(userId: number, kind: TagKind): string[] {
  return db
    .prepare("SELECT tag FROM user_tags WHERE user_id = ? AND kind = ?")
    .all(userId, kind)
    .map((r) => String(r.tag));
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    background: row.background,
    education: row.education,
    teachingStyle: row.teaching_style,
    learningStyle: row.learning_style,
    credits: row.credits,
    teachTags: getTags(row.id, "teach"),
    learnTags: getTags(row.id, "learn"),
  };
}

export function getPublicUserById(id: number): PublicUser | undefined {
  const row = getUserRowById(id);
  return row ? toPublicUser(row) : undefined;
}

export function createUser(input: NewUser): PublicUser {
  const res = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, salt, background, education, teaching_style, learning_style)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name.trim(),
      input.email.toLowerCase().trim(),
      input.passwordHash,
      input.salt,
      input.background,
      input.education,
      input.teachingStyle,
      input.learningStyle,
    );
  const id = Number(res.lastInsertRowid);

  const insertTag = db.prepare(
    "INSERT INTO user_tags (user_id, kind, tag) VALUES (?, ?, ?)",
  );
  for (const tag of dedupe(input.teachTags)) insertTag.run(id, "teach", tag);
  for (const tag of dedupe(input.learnTags)) insertTag.run(id, "learn", tag);

  return getPublicUserById(id)!;
}

function dedupe(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}
