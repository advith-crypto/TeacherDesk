// Shared exam-seating domain values — single source of truth for UI + backend.

import { daysUntil, friendlyDate, localDateStr } from "./attention";
import { isValidTime } from "./timetable-shared";

export const SEATING_STATUSES = ["draft", "ready", "completed"] as const;
export type SeatingStatus = (typeof SEATING_STATUSES)[number];

export const SEATING_STATUS_LABELS: Record<SeatingStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  completed: "Completed",
};

/** Status colors: muted dot for Draft, sky for Ready, green for Completed. */
export const SEATING_STATUS_DOT: Record<SeatingStatus, string> = {
  draft: "bg-slate-400 dark:bg-slate-500",
  ready: "bg-sky-500",
  completed: "bg-emerald-500",
};

export const SEATING_STATUS_CHIP: Record<SeatingStatus, string> = {
  draft: "bg-secondary text-foreground",
  ready: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

/** Status order for sorting (lower = higher priority in the list). */
export const SEATING_STATUS_RANK: Record<SeatingStatus, number> = {
  draft: 0,
  ready: 1,
  completed: 2,
};

/** Total seat capacity of a rows × columns grid. */
export function capacity(rows: number, columns: number): number {
  return rows * columns;
}

/** Empty seats = capacity − assigned. Clamped, since stats come from real data. */
export function emptySeats(
  rows: number,
  columns: number,
  assignedCount: number,
): number {
  return Math.max(0, capacity(rows, columns) - assignedCount);
}

/** "R1C1"-style seat label matching the visual grid. */
export function seatLabel(row: number, column: number): string {
  return `R${row}C${column}`;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Strict YYYY-MM-DD check: format plus a real calendar date (no rollovers). */
export function isValidDateStr(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const d = new Date(value + "T00:00:00");
  if (Number.isNaN(d.getTime())) return false;
  return (
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` ===
    value
  );
}

export type SeatingPlanLike = {
  _id: string;
  title: string;
  examName: string;
  examDate: string;
  startTime?: string;
  durationMinutes?: number;
  room?: string;
  rows: number;
  columns: number;
  status: string;
  assignedCount: number;
  _creationTime: number;
  updatedAt?: number;
};

export type SeatingFilterState = {
  search: string;
  status: string; // "all" | SeatingStatus
  period: "all" | "upcoming" | "today" | "past";
};

export const DEFAULT_SEATING_FILTERS: SeatingFilterState = {
  search: "",
  status: "all",
  period: "all",
};

/** Filter plans by search text (title/exam/room) and structured filters. */
export function filterSeatingPlans<T extends SeatingPlanLike>(
  plans: T[],
  filters: SeatingFilterState,
  today: string = localDateStr(),
): T[] {
  const q = filters.search.trim().toLowerCase();
  return plans.filter((p) => {
    if (filters.status !== "all" && p.status !== filters.status) return false;
    if (filters.period === "upcoming" && p.examDate < today) return false;
    if (filters.period === "today" && p.examDate !== today) return false;
    if (filters.period === "past" && p.examDate >= today) return false;
    if (q) {
      const hay = `${p.title} ${p.examName} ${p.room ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export type SeatingSortKey = "exam_date" | "recent" | "status";

export const SEATING_SORT_OPTIONS: { value: SeatingSortKey; label: string }[] = [
  { value: "exam_date", label: "Exam date — soonest" },
  { value: "recent", label: "Recently updated" },
  { value: "status", label: "Status" },
];

/**
 * Sort plans. Open plans float above Completed ones; within that, the chosen
 * key orders the rest (default: soonest exam date first).
 */
export function sortSeatingPlans<T extends SeatingPlanLike>(
  plans: T[],
  sort: SeatingSortKey = "exam_date",
): T[] {
  return [...plans].sort((a, b) => {
    const aDone = a.status === "completed" ? 1 : 0;
    const bDone = b.status === "completed" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    switch (sort) {
      case "recent": {
        const au = a.updatedAt ?? a._creationTime;
        const bu = b.updatedAt ?? b._creationTime;
        if (au !== bu) return bu - au;
        return b._creationTime - a._creationTime;
      }
      case "status": {
        const ar = SEATING_STATUS_RANK[a.status as SeatingStatus] ?? 2;
        const br = SEATING_STATUS_RANK[b.status as SeatingStatus] ?? 2;
        if (ar !== br) return ar - br;
        return a.examDate < b.examDate ? -1 : 1;
      }
      case "exam_date":
      default:
        if (a.examDate !== b.examDate) return a.examDate < b.examDate ? -1 : 1;
        return b._creationTime - a._creationTime;
    }
  });
}

/** Summary counts for the Exam Seating page cards (all from real data). */
export function seatingSummaryCounts<T extends { status: string }>(
  plans: T[],
): { draft: number; ready: number; completed: number; total: number } {
  return {
    total: plans.length,
    draft: plans.filter((p) => p.status === "draft").length,
    ready: plans.filter((p) => p.status === "ready").length,
    completed: plans.filter((p) => p.status === "completed").length,
  };
}

/** Deterministic exam-date chip for a plan card: Today / friendly date / passed. */
export function examDateChip(plan: {
  status: string;
  examDate: string;
}, today: string = localDateStr()) {
  const d = daysUntil(plan.examDate, today);
  if (plan.status === "completed")
    return { label: friendlyDate(plan.examDate), cls: "bg-secondary text-muted-foreground" };
  if (d === 0) return { label: "Today", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  if (d < 0) return { label: "Exam passed", cls: "bg-secondary text-muted-foreground" };
  return { label: friendlyDate(plan.examDate), cls: "bg-sky-500/10 text-sky-700 dark:text-sky-400" };
}

export { isValidTime };