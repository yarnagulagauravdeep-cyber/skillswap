import { db } from "../db";
import { adjustCredits, availableCredits } from "./credits";
import { getCourse, incrementPopularity } from "./courses";
import { ratingSummary, type RatingSummary } from "./reviews";

export type RequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "confirmed"
  | "completed";

export interface Slot {
  day: string; // e.g. "Mon"
  time: string; // "HH:MM"
}

export interface RequestDetail {
  id: number;
  courseId: number;
  skill: string;
  cost: number;
  estDays: number;
  status: RequestStatus;
  escrowCredits: number;
  teacherId: number;
  teacherName: string;
  studentId: number;
  studentName: string;
  studentLearningStyle: string;
  teacherAvail: Slot[];
  sessionLenMin: number;
  expectedEnd: string;
  rulesText: string;
  studentSlots: Slot[];
  meetLink: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableSession {
  id: number;
  requestId: number;
  startsAt: string;
  endsAt: string;
  meetLink: string;
}

const DETAIL_SELECT = `
  SELECT
    q.*, c.skill AS skill, c.cost AS cost, c.est_days AS estDays,
    t.name AS teacherName,
    s.name AS studentName, s.learning_style AS studentLearningStyle
  FROM requests q
  JOIN courses c ON c.id = q.course_id
  JOIN users t ON t.id = q.teacher_id
  JOIN users s ON s.id = q.student_id
`;

function parseSlots(raw: unknown): Slot[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(String(raw));
    return Array.isArray(v) ? (v as Slot[]) : [];
  } catch {
    return [];
  }
}

function mapDetail(row: Record<string, unknown>): RequestDetail {
  return {
    id: Number(row.id),
    courseId: Number(row.course_id),
    skill: String(row.skill),
    cost: Number(row.cost),
    estDays: Number(row.estDays),
    status: String(row.status) as RequestStatus,
    escrowCredits: Number(row.escrow_credits),
    teacherId: Number(row.teacher_id),
    teacherName: String(row.teacherName),
    studentId: Number(row.student_id),
    studentName: String(row.studentName),
    studentLearningStyle: String(row.studentLearningStyle ?? ""),
    teacherAvail: parseSlots(row.teacher_avail),
    sessionLenMin: Number(row.session_len_min ?? 60),
    expectedEnd: String(row.expected_end ?? ""),
    rulesText: String(row.rules_text ?? ""),
    studentSlots: parseSlots(row.student_slots),
    meetLink: String(row.meet_link ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function getRequest(id: number): RequestDetail | undefined {
  const row = db.prepare(`${DETAIL_SELECT} WHERE q.id = ?`).get(id);
  return row ? mapDetail(row) : undefined;
}

export function listIncomingForTeacher(teacherId: number): RequestDetail[] {
  return db
    .prepare(`${DETAIL_SELECT} WHERE q.teacher_id = ? ORDER BY q.updated_at DESC`)
    .all(teacherId)
    .map(mapDetail);
}

export function listOutgoingForStudent(studentId: number): RequestDetail[] {
  return db
    .prepare(`${DETAIL_SELECT} WHERE q.student_id = ? ORDER BY q.updated_at DESC`)
    .all(studentId)
    .map(mapDetail);
}

/** Every exchange a user is part of (either side). */
export function listForUser(userId: number): RequestDetail[] {
  return db
    .prepare(
      `${DETAIL_SELECT} WHERE q.teacher_id = ? OR q.student_id = ? ORDER BY q.updated_at DESC`,
    )
    .all(userId, userId)
    .map(mapDetail);
}

export function activeRequestFor(
  courseId: number,
  studentId: number,
): RequestDetail | undefined {
  const row = db
    .prepare(
      `${DETAIL_SELECT} WHERE q.course_id = ? AND q.student_id = ?
        AND q.status IN ('pending','accepted','confirmed') LIMIT 1`,
    )
    .get(courseId, studentId);
  return row ? mapDetail(row) : undefined;
}

/** Skills a student has already completed — shown to teachers as context. */
export function completedSkillsForStudent(studentId: number): string[] {
  return db
    .prepare(
      `SELECT DISTINCT c.skill FROM requests q
         JOIN courses c ON c.id = q.course_id
        WHERE q.student_id = ? AND q.status = 'completed'`,
    )
    .all(studentId)
    .map((r) => String(r.skill));
}

export interface StudentContext {
  rating: RatingSummary;
  learningStyle: string;
  pastSkills: string[];
}

export function studentContext(
  studentId: number,
  learningStyle: string,
): StudentContext {
  return {
    rating: ratingSummary(studentId),
    learningStyle,
    pastSkills: completedSkillsForStudent(studentId),
  };
}

export function createRequest(courseId: number, studentId: number) {
  const course = getCourse(courseId);
  if (!course) return { error: "Course not found." as const };
  if (course.teacherId === studentId)
    return { error: "You can't request your own course." as const };
  if (activeRequestFor(courseId, studentId))
    return { error: "You already have an active request for this course." as const };
  if (availableCredits(studentId) < course.cost)
    return { error: "Not enough available credits for this course." as const };

  const res = db
    .prepare(
      `INSERT INTO requests (course_id, student_id, teacher_id, status)
       VALUES (?, ?, ?, 'pending')`,
    )
    .run(courseId, studentId, course.teacherId);
  return { request: getRequest(Number(res.lastInsertRowid))! };
}

function touch(id: number) {
  db.prepare("UPDATE requests SET updated_at = datetime('now') WHERE id = ?").run(
    id,
  );
}

export function acceptRequest(
  id: number,
  input: {
    teacherAvail: Slot[];
    sessionLenMin: number;
    expectedEnd: string;
    rulesText: string;
  },
) {
  const req = getRequest(id);
  if (!req) return { error: "Request not found." as const };
  if (req.status !== "pending")
    return { error: "This request can no longer be accepted." as const };
  if (availableCredits(req.studentId) < req.cost)
    return { error: "Student no longer has enough available credits." as const };

  db.prepare(
    `UPDATE requests
        SET status = 'accepted', escrow_credits = ?, teacher_avail = ?,
            session_len_min = ?, expected_end = ?, rules_text = ?,
            updated_at = datetime('now')
      WHERE id = ?`,
  ).run(
    req.cost,
    JSON.stringify(input.teacherAvail),
    input.sessionLenMin,
    input.expectedEnd,
    input.rulesText,
    id,
  );
  return { request: getRequest(id)! };
}

export function rejectRequest(id: number) {
  const req = getRequest(id);
  if (!req) return { error: "Request not found." as const };
  db.prepare(
    "UPDATE requests SET status = 'rejected', escrow_credits = 0, updated_at = datetime('now') WHERE id = ?",
  ).run(id);
  return { request: getRequest(id)! };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Expand chosen weekly slots into concrete dated sessions up to expectedEnd. */
function generateTimetable(req: RequestDetail) {
  db.prepare("DELETE FROM timetable WHERE request_id = ?").run(req.id);
  if (!req.studentSlots.length) return;

  const start = new Date();
  start.setDate(start.getDate() + 1); // start tomorrow
  const end = req.expectedEnd ? new Date(req.expectedEnd) : new Date();
  if (req.expectedEnd) end.setHours(23, 59, 59, 999);

  const insert = db.prepare(
    "INSERT INTO timetable (request_id, starts_at, ends_at) VALUES (?, ?, ?)",
  );

  const cursor = new Date(start);
  let guard = 0;
  while (cursor <= end && guard < 400) {
    const dayName = WEEKDAYS[cursor.getDay()];
    for (const slot of req.studentSlots) {
      if (slot.day !== dayName) continue;
      const [h, m] = slot.time.split(":").map(Number);
      const s = new Date(cursor);
      s.setHours(h, m || 0, 0, 0);
      const e = new Date(s.getTime() + req.sessionLenMin * 60000);
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      insert.run(req.id, fmt(s), fmt(e));
    }
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
}

export function confirmSlots(id: number, slots: Slot[]) {
  const req = getRequest(id);
  if (!req) return { error: "Request not found." as const };
  if (req.status !== "accepted")
    return { error: "This request isn't ready for scheduling." as const };
  if (!slots.length)
    return { error: "Pick at least one time slot." as const };

  // Slots must be a subset of what the teacher offered.
  const offered = new Set(req.teacherAvail.map((s) => `${s.day}|${s.time}`));
  const chosen = slots.filter((s) => offered.has(`${s.day}|${s.time}`));
  if (!chosen.length)
    return { error: "Chosen slots must be within the teacher's availability." as const };

  db.prepare(
    `UPDATE requests SET status = 'confirmed', student_slots = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(JSON.stringify(chosen), id);

  generateTimetable(getRequest(id)!);
  return { request: getRequest(id)! };
}

export function setMeetLink(id: number, link: string) {
  const req = getRequest(id);
  if (!req) return { error: "Request not found." as const };
  db.prepare(
    "UPDATE requests SET meet_link = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(link.trim(), id);
  db.prepare("UPDATE timetable SET meet_link = ? WHERE request_id = ?").run(
    link.trim(),
    id,
  );
  touch(id);
  return { request: getRequest(id)! };
}

/**
 * True if the two users share a real exchange (either direction) — one the
 * teacher has actually accepted. A mere pending request doesn't count, so you
 * can't review someone off an unaccepted request.
 */
export function haveExchanged(a: number, b: number): boolean {
  const row = db
    .prepare(
      `SELECT 1 AS x FROM requests
        WHERE ((teacher_id = ? AND student_id = ?) OR (teacher_id = ? AND student_id = ?))
          AND status IN ('accepted','confirmed','completed')
        LIMIT 1`,
    )
    .get(a, b, b, a);
  return !!row;
}

export function completeRequest(id: number) {
  const req = getRequest(id);
  if (!req) return { error: "Request not found." as const };
  if (req.status !== "confirmed")
    return { error: "Only a confirmed exchange can be completed." as const };

  // Release escrow: teacher earns, student spends.
  adjustCredits(req.teacherId, req.cost);
  adjustCredits(req.studentId, -req.cost);
  incrementPopularity(req.courseId);
  db.prepare(
    "UPDATE requests SET status = 'completed', updated_at = datetime('now') WHERE id = ?",
  ).run(id);
  return { request: getRequest(id)! };
}

export function getTimetable(requestId: number): TimetableSession[] {
  return db
    .prepare(
      "SELECT * FROM timetable WHERE request_id = ? ORDER BY starts_at ASC",
    )
    .all(requestId)
    .map((r) => ({
      id: Number(r.id),
      requestId: Number(r.request_id),
      startsAt: String(r.starts_at),
      endsAt: String(r.ends_at),
      meetLink: String(r.meet_link ?? ""),
    }));
}

export interface RecentSwap {
  skill: string;
  cost: number;
  status: "confirmed" | "completed";
  teacherName: string;
  studentName: string;
  updatedAt: string;
}

/** Latest real exchanges on the platform — powers the landing "live swap" card. */
export function recentSwaps(limit = 6): RecentSwap[] {
  return db
    .prepare(
      `SELECT c.skill AS skill, c.cost AS cost, q.status AS status,
              q.updated_at AS updatedAt,
              t.name AS teacherName, s.name AS studentName
         FROM requests q
         JOIN courses c ON c.id = q.course_id
         JOIN users t ON t.id = q.teacher_id
         JOIN users s ON s.id = q.student_id
        WHERE q.status IN ('confirmed','completed')
        ORDER BY q.updated_at DESC
        LIMIT ?`,
    )
    .all(limit)
    .map((r) => ({
      skill: String(r.skill),
      cost: Number(r.cost),
      status: String(r.status) as "confirmed" | "completed",
      teacherName: String(r.teacherName),
      studentName: String(r.studentName),
      updatedAt: String(r.updatedAt),
    }));
}

/** All upcoming sessions across a user's confirmed exchanges. */
export function upcomingSessionsForUser(userId: number) {
  const rows = db
    .prepare(
      `SELECT tt.*, c.skill AS skill, q.status AS status,
              q.teacher_id AS teacherId, q.student_id AS studentId,
              t.name AS teacherName, s.name AS studentName
         FROM timetable tt
         JOIN requests q ON q.id = tt.request_id
         JOIN courses c ON c.id = q.course_id
         JOIN users t ON t.id = q.teacher_id
         JOIN users s ON s.id = q.student_id
        WHERE (q.teacher_id = ? OR q.student_id = ?)
          AND q.status IN ('confirmed','completed')
        ORDER BY tt.starts_at ASC`,
    )
    .all(userId, userId);
  return rows.map((r) => ({
    id: Number(r.id),
    requestId: Number(r.request_id),
    startsAt: String(r.starts_at),
    endsAt: String(r.ends_at),
    meetLink: String(r.meet_link ?? ""),
    skill: String(r.skill),
    status: String(r.status),
    teacherId: Number(r.teacherId),
    studentId: Number(r.studentId),
    teacherName: String(r.teacherName),
    studentName: String(r.studentName),
  }));
}
