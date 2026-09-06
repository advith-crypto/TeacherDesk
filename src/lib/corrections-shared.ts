// Shared correction domain values — single source of truth for UI + backend.
// Reuses the existing attention helpers for dates and reasons.

import { daysUntil, localDateStr } from "./attention";
import type { AttentionReason } from "./attention";

export const CORRECTION_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
] as const;
export type CorrectionStatus = (typeof CORRECTION_STATUSES)[number];

export const CORRECTION_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type CorrectionPriority = (typeof CORRECTION_PRIORITIES)[number];

/** Assessment-type options (display strings, stored as-is). */
export const ASSESSMENT_TYPES = [
  "Class Test",
  "Unit Test",
  "Mid-Term",
  "Final Exam",
  "Assignment",
  "Worksheet",
  "Project",
  "Other",
] as const;

export const CORRECTION_STATUS_LABELS: Record<CorrectionStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

export const CORRECTION_PRIORITY_LABELS: Record<CorrectionPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

/** Priority order for sorting (lower = more attention). */
export const CORRECTION_PRIORITY_RANK: Record<CorrectionPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Status is always derived from progress — mirrors the backend rule. */
export function deriveCorrectionStatus(
  correctedPapers: number,
  totalPapers: number,
): CorrectionStatus {
  if (totalPapers > 0 && correctedPapers >= totalPapers) return "completed";
  if (correctedPapers > 0) return "in_progress";
  return "not_started";
}

export function remainingPapers(
  totalPapers: number,
  correctedPapers: number,
): number {
  return Math.max(0, totalPapers - correctedPapers);
}

/** Progress percentage, always clamped to 0..100. */
export function progressPercent(
  totalPapers: number,
  correctedPapers: number,
): number {
  if (totalPapers <= 0) return 0;
  const p = Math.round((correctedPapers / totalPapers) * 100);
  return Math.min(100, Math.max(0, p));
}

export type DeadlineBucket =
  | "overdue"
  | "today"
  | "soon"
  | "upcoming"
  | "completed";

/** Deterministic deadline classification for an incomplete correction. */
export function deadlineBucket(c: {
  status: string;
  correctionDeadline: string;
}, today: string = localDateStr()): DeadlineBucket {
  if (c.status === "completed") return "completed";
  const d = daysUntil(c.correctionDeadline, today);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 3) return "soon";
  return "upcoming";
}

/**
 * Explainable reason chips for a correction (deterministic, no AI).
 * Returns the strongest applicable reasons first.
 */
export function correctionAttentionReasons(c: {
  status: string;
  correctionDeadline: string;
  priority: string;
  totalPapers: number;
  correctedPapers: number;
}): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  if (c.status === "completed") return reasons;

  const d = daysUntil(c.correctionDeadline);
  if (d < 0) {
    reasons.push({
      label: d === -1 ? "Overdue by 1 day" : `Overdue by ${-d} days`,
      tone: "overdue",
    });
  } else if (d === 0) {
    reasons.push({ label: "Due today", tone: "today" });
  } else if (d === 1) {
    reasons.push({ label: "Due tomorrow", tone: "soon" });
  } else if (d <= 3) {
    reasons.push({ label: `Due in ${d} days`, tone: "soon" });
  }

  if (c.priority === "urgent") {
    reasons.push({ label: "Urgent", tone: "priority" });
  } else if (c.priority === "high") {
    reasons.push({ label: "High priority", tone: "priority" });
  }

  const remaining = remainingPapers(c.totalPapers, c.correctedPapers);
  if (remaining > 0) {
    reasons.push({
      label: `${remaining} ${remaining === 1 ? "paper" : "papers"} remaining`,
      tone: "none",
    });
  }

  return reasons.slice(0, 2);
}

export type CorrectionSortKey =
  | "attention"
  | "deadline_asc"
  | "deadline_desc"
  | "priority"
  | "recent"
  | "progress";

export const CORRECTION_SORT_OPTIONS: { value: CorrectionSortKey; label: string }[] =
  [
    { value: "attention", label: "Needs attention" },
    { value: "deadline_asc", label: "Deadline — soonest" },
    { value: "deadline_desc", label: "Deadline — latest" },
    { value: "priority", label: "Priority" },
    { value: "recent", label: "Recently updated" },
    { value: "progress", label: "Progress — most done" },
  ];

/**
 * Sort corrections. Completed batches sink to the bottom; incomplete ones are
 * ordered by the chosen key (default "attention": overdue → today → soon →
 * priority → most remaining papers).
 */
export function sortCorrections<
  T extends {
    status: string;
    correctionDeadline: string;
    priority: string;
    totalPapers: number;
    correctedPapers: number;
    _creationTime: number;
    updatedAt?: number;
  },
>(corrections: T[], sort: CorrectionSortKey = "attention", today: string = localDateStr()): T[] {
  const rankOf = (p: string) => CORRECTION_PRIORITY_RANK[p as CorrectionPriority] ?? 2;

  return [...corrections].sort((a, b) => {
    const aDone = a.status === "completed" ? 1 : 0;
    const bDone = b.status === "completed" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    switch (sort) {
      case "deadline_asc":
        return a.correctionDeadline < b.correctionDeadline ? -1 : 1;
      case "deadline_desc":
        return a.correctionDeadline > b.correctionDeadline ? -1 : 1;
      case "priority": {
        const ap = rankOf(a.priority);
        const bp = rankOf(b.priority);
        if (ap !== bp) return ap - bp;
        return a.correctionDeadline < b.correctionDeadline ? -1 : 1;
      }
      case "recent": {
        const au = a.updatedAt ?? a._creationTime;
        const bu = b.updatedAt ?? b._creationTime;
        if (au !== bu) return bu - au;
        return b._creationTime - a._creationTime;
      }
      case "progress": {
        const ap = progressPercent(a.totalPapers, a.correctedPapers);
        const bp = progressPercent(b.totalPapers, b.correctedPapers);
        if (ap !== bp) return bp - ap;
        return a.correctionDeadline < b.correctionDeadline ? -1 : 1;
      }
      case "attention":
      default: {
        const aB = deadlineBucket(a, today);
        const bB = deadlineBucket(b, today);
        const bucketRank: Record<DeadlineBucket, number> = {
          overdue: 0,
          today: 1,
          soon: 2,
          upcoming: 3,
          completed: 4,
        };
        if (bucketRank[aB] !== bucketRank[bB])
          return bucketRank[aB] - bucketRank[bB];
        const ap = rankOf(a.priority);
        const bp = rankOf(b.priority);
        if (ap !== bp) return ap - bp;
        const ar = remainingPapers(a.totalPapers, a.correctedPapers);
        const br = remainingPapers(b.totalPapers, b.correctedPapers);
        if (ar !== br) return br - ar;
        return a._creationTime - b._creationTime;
      }
    }
  });
}

/** Summary counts for the Corrections page cards (all computed from real data). */
export function correctionSummaryCounts<
  T extends { status: string; correctionDeadline: string; totalPapers: number; correctedPapers: number },
>(corrections: T[], today: string = localDateStr()): {
  active: number;
  papersRemaining: number;
  completed: number;
  dueSoon: number;
} {
  const soonEnd = new Date(today + "T00:00:00");
  soonEnd.setDate(soonEnd.getDate() + 3);
  const soonEndStr = localDateStr(soonEnd);

  const active = corrections.filter((c) => c.status !== "completed");
  return {
    active: active.length,
    papersRemaining: active.reduce(
      (sum, c) => sum + Math.max(0, c.totalPapers - c.correctedPapers),
      0,
    ),
    completed: corrections.filter((c) => c.status === "completed").length,
    dueSoon: active.filter(
      (c) => c.correctionDeadline >= today && c.correctionDeadline <= soonEndStr,
    ).length,
  };
}

export type CorrectionFilterState = {
  search: string;
  status: string; // "all" | CorrectionStatus | "overdue"
  subject: string; // "all" | subject
  classGrade: string; // "all" | class/grade
  assessmentType: string; // "all" | assessment type
  priority: string; // "all" | CorrectionPriority
  period: "all" | "week" | "month" | "past";
};

export const DEFAULT_CORRECTION_FILTERS: CorrectionFilterState = {
  search: "",
  status: "all",
  subject: "all",
  classGrade: "all",
  assessmentType: "all",
  priority: "all",
  period: "all",
};

/** Filter corrections by search text and structured filters. */
export function filterCorrections<
  T extends {
    title: string;
    subject: string;
    classGrade: string;
    section?: string;
    assessmentType: string;
    status: string;
    priority: string;
    correctionDeadline: string;
  },
>(corrections: T[], filters: CorrectionFilterState, today: string = localDateStr()): T[] {
  const q = filters.search.trim().toLowerCase();
  const weekEnd = new Date(today + "T00:00:00");
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = localDateStr(weekEnd);
  const monthEnd = new Date(today + "T00:00:00");
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  const monthEndStr = localDateStr(monthEnd);

  return corrections.filter((c) => {
    if (filters.status === "overdue") {
      if (c.status === "completed" || c.correctionDeadline >= today) return false;
    } else if (filters.status !== "all" && c.status !== filters.status) {
      return false;
    }
    if (filters.subject !== "all" && c.subject !== filters.subject) return false;
    if (filters.classGrade !== "all" && c.classGrade !== filters.classGrade) return false;
    if (filters.assessmentType !== "all" && c.assessmentType !== filters.assessmentType)
      return false;
    if (filters.priority !== "all" && c.priority !== filters.priority) return false;

    if (filters.period === "week" && !(c.correctionDeadline >= today && c.correctionDeadline <= weekEndStr))
      return false;
    if (filters.period === "month" && !(c.correctionDeadline >= today && c.correctionDeadline <= monthEndStr))
      return false;
    if (filters.period === "past" && c.correctionDeadline >= today) return false;

    if (q) {
      const hay =
        `${c.title} ${c.subject} ${c.classGrade} ${c.section ?? ""} ${c.assessmentType}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Distinct subjects / class grades / assessment types present in the data. */
export function uniqueCorrectionValues<
  T extends { subject: string; classGrade: string; assessmentType: string },
>(corrections: T[]): { subjects: string[]; classGrades: string[]; assessmentTypes: string[] } {
  const sortUnique = (values: string[]) =>
    [...new Set(values.filter((v) => v))].sort((a, b) => a.localeCompare(b));
  return {
    subjects: sortUnique(corrections.map((c) => c.subject)),
    classGrades: sortUnique(corrections.map((c) => c.classGrade)),
    assessmentTypes: sortUnique(corrections.map((c) => c.assessmentType)),
  };
}