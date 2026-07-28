// Plain client-facing shapes (no server/db imports) shared across the
// request/exchange UI components.

export interface Slot {
  day: string;
  time: string;
}

export type RequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "confirmed"
  | "completed";

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

export interface Material {
  id: number;
  requestId: number;
  filename: string;
  uploadedAt: string;
  isOpen: boolean;
  totalSeconds: number;
}

export interface StudentContext {
  rating: { avg: number; count: number };
  learningStyle: string;
  pastSkills: string[];
}

export interface Review {
  id: number;
  reviewerId: number;
  reviewerName: string;
  revieweeId: number;
  rating: number;
  text: string;
  createdAt: string;
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
