import { db } from "../db";

export interface Material {
  id: number;
  requestId: number;
  filename: string;
  uploadedAt: string;
  isOpen: boolean;
  totalSeconds: number;
}

// Note: the on-disk `path` is deliberately NOT included — it stays server-side.
function map(row: Record<string, unknown>): Material {
  return {
    id: Number(row.id),
    requestId: Number(row.request_id),
    filename: String(row.filename),
    uploadedAt: String(row.uploaded_at),
    isOpen: String(row.opened_at ?? "") !== "",
    totalSeconds: Number(row.total_seconds),
  };
}

export function addMaterial(input: {
  requestId: number;
  filename: string;
  path: string;
}): Material {
  const res = db
    .prepare(
      "INSERT INTO materials (request_id, filename, path) VALUES (?, ?, ?)",
    )
    .run(input.requestId, input.filename, input.path);
  return getMaterial(Number(res.lastInsertRowid))!;
}

export function getMaterial(id: number): Material | undefined {
  const row = db.prepare("SELECT * FROM materials WHERE id = ?").get(id);
  return row ? map(row) : undefined;
}

export function getMaterialRow(id: number) {
  return db.prepare("SELECT * FROM materials WHERE id = ?").get(id) as
    | { id: number; request_id: number; path: string; filename: string; opened_at: string }
    | undefined;
}

export function listMaterials(requestId: number): Material[] {
  return db
    .prepare(
      "SELECT * FROM materials WHERE request_id = ? ORDER BY uploaded_at DESC",
    )
    .all(requestId)
    .map(map);
}

/** Mark a PDF as opened (starts the simple open/close timer). */
export function markOpen(id: number): void {
  db.prepare(
    "UPDATE materials SET opened_at = datetime('now') WHERE id = ? AND (opened_at IS NULL OR opened_at = '')",
  ).run(id);
}

/** Close the PDF: add elapsed seconds since it was opened to the running total. */
export function markClose(id: number): void {
  const row = db
    .prepare("SELECT opened_at FROM materials WHERE id = ?")
    .get(id) as { opened_at: string } | undefined;
  if (!row || !row.opened_at) return;
  const elapsed = db
    .prepare(
      "SELECT CAST((julianday('now') - julianday(?)) * 86400 AS INTEGER) AS secs",
    )
    .get(row.opened_at) as { secs: number };
  const secs = Math.max(0, Number(elapsed.secs));
  db.prepare(
    "UPDATE materials SET total_seconds = total_seconds + ?, closed_at = datetime('now'), opened_at = '' WHERE id = ?",
  ).run(secs, id);
}
