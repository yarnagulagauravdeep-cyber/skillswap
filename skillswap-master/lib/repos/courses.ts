import { db } from "../db";

export interface CourseCard {
  id: number;
  skill: string;
  cost: number;
  estDays: number;
  description: string;
  popularity: number;
  createdAt: string;
  teacherId: number;
  teacherName: string;
  teacherStyle: string;
  teacherRating: number; // avg 0..5
  reviewCount: number;
}

export type SortKey = "recent" | "popularity" | "rating" | "credits";

const CARD_SELECT = `
  SELECT
    c.id, c.skill, c.cost, c.est_days AS estDays, c.description,
    c.popularity, c.created_at AS createdAt,
    c.teacher_id AS teacherId, u.name AS teacherName,
    u.teaching_style AS teacherStyle,
    COALESCE(AVG(r.rating), 0) AS teacherRating,
    COUNT(r.id) AS reviewCount
  FROM courses c
  JOIN users u ON u.id = c.teacher_id
  LEFT JOIN reviews r ON r.reviewee_id = c.teacher_id
`;

function mapCard(row: Record<string, unknown>): CourseCard {
  return {
    id: Number(row.id),
    skill: String(row.skill),
    cost: Number(row.cost),
    estDays: Number(row.estDays),
    description: String(row.description ?? ""),
    popularity: Number(row.popularity),
    createdAt: String(row.createdAt),
    teacherId: Number(row.teacherId),
    teacherName: String(row.teacherName),
    teacherStyle: String(row.teacherStyle ?? ""),
    teacherRating: Math.round(Number(row.teacherRating) * 10) / 10,
    reviewCount: Number(row.reviewCount),
  };
}

export function createCourse(input: {
  teacherId: number;
  skill: string;
  cost: number;
  estDays: number;
  description: string;
}): CourseCard {
  const res = db
    .prepare(
      `INSERT INTO courses (teacher_id, skill, cost, est_days, description)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      input.teacherId,
      input.skill.trim(),
      input.cost,
      input.estDays,
      input.description.trim(),
    );
  return getCourse(Number(res.lastInsertRowid))!;
}

export function getCourse(id: number): CourseCard | undefined {
  const row = db
    .prepare(`${CARD_SELECT} WHERE c.id = ? GROUP BY c.id`)
    .get(id);
  return row ? mapCard(row) : undefined;
}

export function listCourses(opts: {
  search?: string;
  anyTerms?: string[];
  maxCost?: number;
  minRating?: number;
  sort?: SortKey;
  excludeTeacherId?: number;
  hideActiveForStudent?: number;
} = {}): CourseCard[] {
  const where: string[] = [];
  const params: unknown[] = [];

  // Base keyword search plus any AI-expanded synonym terms are OR'd together,
  // so a semantic query still returns exact matches.
  const terms = [
    ...(opts.search && opts.search.trim() ? [opts.search.trim()] : []),
    ...(opts.anyTerms ?? []),
  ]
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (terms.length) {
    const ors = terms.map(
      () => "(LOWER(c.skill) LIKE ? OR LOWER(c.description) LIKE ? OR LOWER(u.name) LIKE ?)",
    );
    where.push(`(${ors.join(" OR ")})`);
    for (const t of terms) {
      const like = `%${t}%`;
      params.push(like, like, like);
    }
  }
  if (opts.maxCost) {
    where.push("c.cost <= ?");
    params.push(opts.maxCost);
  }
  if (opts.excludeTeacherId) {
    where.push("c.teacher_id <> ?");
    params.push(opts.excludeTeacherId);
  }
  // Hide courses the student is already engaged with (requested/scheduling/learning).
  if (opts.hideActiveForStudent) {
    where.push(
      `NOT EXISTS (
         SELECT 1 FROM requests rq
          WHERE rq.course_id = c.id AND rq.student_id = ?
            AND rq.status IN ('pending','accepted','confirmed'))`,
    );
    params.push(opts.hideActiveForStudent);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const having =
    opts.minRating && opts.minRating > 0
      ? "HAVING teacherRating >= ?"
      : "";
  if (having) params.push(opts.minRating);

  const order =
    opts.sort === "popularity"
      ? "c.popularity DESC, c.created_at DESC"
      : opts.sort === "rating"
        ? "teacherRating DESC, reviewCount DESC"
        : opts.sort === "credits"
          ? "c.cost ASC, c.created_at DESC"
          : "c.created_at DESC";

  const rows = db
    .prepare(
      `${CARD_SELECT} ${whereSql} GROUP BY c.id ${having} ORDER BY ${order}`,
    )
    .all(...params);
  return rows.map(mapCard);
}

export function incrementPopularity(courseId: number): void {
  db.prepare("UPDATE courses SET popularity = popularity + 1 WHERE id = ?").run(
    courseId,
  );
}

export function coursesByTeacher(teacherId: number): CourseCard[] {
  const rows = db
    .prepare(
      `${CARD_SELECT} WHERE c.teacher_id = ? GROUP BY c.id ORDER BY c.created_at DESC`,
    )
    .all(teacherId);
  return rows.map(mapCard);
}
