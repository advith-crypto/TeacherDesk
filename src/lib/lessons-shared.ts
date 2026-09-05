// Shared lesson domain values — single source of truth for UI + backend.
// Reuses the existing task attention helpers instead of duplicating date logic.

import { daysUntil, localDateStr } from "./attention";
import type { AttentionReason } from "./attention";

export const LESSON_STATUSES = ["planned", "in_progress", "completed"] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

export const LESSON_PRIORITIES = ["low", "medium", "high"] as const;
export type LessonPriority = (typeof LESSON_PRIORITIES)[number];

export const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
};

export const LESSON_PRIORITY_LABELS: Record<LessonPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Priority order for sorting (lower = more attention). */
export const LESSON_PRIORITY_RANK: Record<LessonPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Explainable reason chips for a lesson (deterministic, no AI).
 * Returns the strongest applicable reasons first.
 */
export function lessonAttentionReasons(lesson: {
  status: string;
  lessonDate: string;
  priority: string;
}): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  if (lesson.status === "completed") return reasons;

  const d = daysUntil(lesson.lessonDate);
  if (d < 0) {
    reasons.push({
      label: d === -1 ? "Overdue by 1 day" : `Overdue by ${-d} days`,
      tone: "overdue",
    });
  } else if (d === 0) {
    reasons.push({ label: "Today", tone: "today" });
  } else if (d === 1) {
    reasons.push({ label: "Tomorrow", tone: "soon" });
  } else if (d <= 7) {
    reasons.push({ label: `In ${d} days`, tone: "soon" });
  }

  if (lesson.priority === "high") {
    reasons.push({ label: "High priority", tone: "priority" });
  }

  return reasons.slice(0, 2);
}

/** Local date for the start of the current week (Monday). */
function weekStartStr(today: string): string {
  const d = new Date(today + "T00:00:00");
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  return localDateStr(d);
}

/**
 * Intelligent sort: today/upcoming first by date, then undated, completed last.
 * Within the same bucket: date, then priority, then newest created.
 */
export function sortLessons<T extends { lessonDate: string; status: string; priority: string; _creationTime: number }>(
  lessons: T[],
  today: string = localDateStr(),
): T[] {
  const priorityOf = (p: string) =>
    LESSON_PRIORITY_RANK[p as LessonPriority] ?? 1;

  return [...lessons].sort((a, b) => {
    const aDone = a.status === "completed" ? 1 : 0;
    const bDone = b.status === "completed" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    // Overdue/past incomplete lessons are still actionable — keep them visible
    // after today but before far-future ones. Use max(date, today) as key.
    const aKey = a.lessonDate < today ? today : a.lessonDate;
    const bKey = b.lessonDate < today ? today : b.lessonDate;
    if (aKey !== bKey) return aKey < bKey ? -1 : 1;

    const ap = priorityOf(a.priority);
    const bp = priorityOf(b.priority);
    if (ap !== bp) return ap - bp;

    return b._creationTime - a._creationTime;
  });
}

/** Summary counts for the Lessons page cards (all computed from real data). */
export function lessonSummaryCounts<T extends { status: string; lessonDate: string }>(
  lessons: T[],
  today: string = localDateStr(),
): { planned: number; inProgress: number; completed: number; upcoming: number } {
  const weekEnd = new Date(today + "T00:00:00");
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = localDateStr(weekEnd);

  return {
    planned: lessons.filter((l) => l.status === "planned").length,
    inProgress: lessons.filter((l) => l.status === "in_progress").length,
    completed: lessons.filter((l) => l.status === "completed").length,
    upcoming: lessons.filter(
      (l) =>
        l.status !== "completed" &&
        l.lessonDate > today &&
        l.lessonDate <= weekEndStr,
    ).length,
  };
}

export type LessonFilterState = {
  search: string;
  status: string; // "all" | LessonStatus
  subject: string; // "all" | subject
  classGrade: string; // "all" | class/grade
  priority: string; // "all" | LessonPriority
  period: "all" | "week" | "month" | "past";
};

export const DEFAULT_LESSON_FILTERS: LessonFilterState = {
  search: "",
  status: "all",
  subject: "all",
  classGrade: "all",
  priority: "all",
  period: "all",
};

/** Filter lessons by search text and structured filters. */
export function filterLessons<
  T extends {
    title: string;
    subject: string;
    classGrade: string;
    topic: string;
    section?: string;
    status: string;
    priority: string;
    lessonDate: string;
  },
>(lessons: T[], filters: LessonFilterState, today: string = localDateStr()): T[] {
  const q = filters.search.trim().toLowerCase();
  const weekEnd = new Date(today + "T00:00:00");
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = localDateStr(weekEnd);
  const monthEnd = new Date(today + "T00:00:00");
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  const monthEndStr = localDateStr(monthEnd);

  return lessons.filter((l) => {
    if (filters.status !== "all" && l.status !== filters.status) return false;
    if (filters.subject !== "all" && l.subject !== filters.subject) return false;
    if (filters.classGrade !== "all" && l.classGrade !== filters.classGrade) return false;
    if (filters.priority !== "all" && l.priority !== filters.priority) return false;

    if (filters.period === "week" && !(l.lessonDate >= today && l.lessonDate <= weekEndStr))
      return false;
    if (filters.period === "month" && !(l.lessonDate >= today && l.lessonDate <= monthEndStr))
      return false;
    if (filters.period === "past" && l.lessonDate >= today) return false;

    if (q) {
      const hay =
        `${l.title} ${l.subject} ${l.classGrade} ${l.section ?? ""} ${l.topic}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Distinct subjects / class grades present in the data, for filter options. */
export function uniqueValues<T extends { subject: string; classGrade: string }>(
  lessons: T[],
): { subjects: string[]; classGrades: string[] } {
  const subjects = [...new Set(lessons.map((l) => l.subject))].sort((a, b) =>
    a.localeCompare(b),
  );
  const classGrades = [...new Set(lessons.map((l) => l.classGrade))].sort((a, b) =>
    a.localeCompare(b),
  );
  return { subjects, classGrades };
}
