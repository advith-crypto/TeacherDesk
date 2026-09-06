// Shared question-paper domain values — single source of truth for UI + backend.

import { daysUntil, localDateStr } from "./attention";
import type { AttentionReason } from "./attention";

export const QUESTION_PAPER_STATUSES = [
  "not_started",
  "draft",
  "ready",
  "completed",
] as const;
export type QuestionPaperStatus = (typeof QUESTION_PAPER_STATUSES)[number];

export const QUESTION_PAPER_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type QuestionPaperPriority = (typeof QUESTION_PAPER_PRIORITIES)[number];

/** Exam-type options (display strings, stored as-is). */
export const EXAM_TYPES = [
  "Unit Test",
  "Periodic Test",
  "Mid Term",
  "Final Exam",
  "Quiz",
  "Assignment",
  "Other",
] as const;

export const QUESTION_PAPER_STATUS_LABELS: Record<QuestionPaperStatus, string> = {
  not_started: "Not Started",
  draft: "Draft",
  ready: "Ready",
  completed: "Completed",
};

export const QUESTION_PAPER_PRIORITY_LABELS: Record<QuestionPaperPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

/** Priority order for sorting (lower = more attention). */
export const QUESTION_PAPER_PRIORITY_RANK: Record<QuestionPaperPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Status order for sorting (lower = earlier stage). */
export const QUESTION_PAPER_STATUS_RANK: Record<QuestionPaperStatus, number> = {
  not_started: 0,
  draft: 1,
  ready: 2,
  completed: 3,
};

/**
 * Explainable reason chips for a question paper (deterministic, no AI).
 * Preparation-deadline attention first, then priority.
 */
export function questionPaperAttentionReasons(p: {
  status: string;
  preparationDeadline?: string;
  examDate?: string;
  priority: string;
}): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  if (p.status === "completed") return reasons;

  if (p.preparationDeadline) {
    const d = daysUntil(p.preparationDeadline);
    if (d < 0) {
      reasons.push({
        label: d === -1 ? "Prep overdue by 1 day" : `Prep overdue by ${-d} days`,
        tone: "overdue",
      });
    } else if (d === 0) {
      reasons.push({ label: "Prep due today", tone: "today" });
    } else if (d === 1) {
      reasons.push({ label: "Prep due tomorrow", tone: "soon" });
    } else if (d <= 3) {
      reasons.push({ label: `Prep due in ${d} days`, tone: "soon" });
    }
  }

  if (p.priority === "urgent") {
    reasons.push({ label: "Urgent", tone: "priority" });
  } else if (p.priority === "high") {
    reasons.push({ label: "High priority", tone: "priority" });
  }

  if (p.examDate && reasons.length === 0) {
    const d = daysUntil(p.examDate);
    if (d === 0) reasons.push({ label: "Exam today", tone: "today" });
    else if (d > 0 && d <= 7) reasons.push({ label: `Exam in ${d} days`, tone: "soon" });
  }

  return reasons.slice(0, 2);
}

export type QuestionPaperSortKey =
  | "attention"
  | "exam_date"
  | "prep_deadline"
  | "priority"
  | "recent"
  | "status";

export const QUESTION_PAPER_SORT_OPTIONS: { value: QuestionPaperSortKey; label: string }[] =
  [
    { value: "attention", label: "Needs attention" },
    { value: "prep_deadline", label: "Prep deadline — soonest" },
    { value: "exam_date", label: "Exam date — soonest" },
    { value: "priority", label: "Priority" },
    { value: "recent", label: "Recently updated" },
    { value: "status", label: "Status" },
  ];

/**
 * Sort question papers. Completed papers sink to the bottom; incomplete ones
 * are ordered by the chosen key (default "attention": overdue prep → due today
 * → due soon → priority → soonest exam date).
 */
export function sortQuestionPapers<
  T extends {
    status: string;
    preparationDeadline?: string;
    examDate?: string;
    priority: string;
    _creationTime: number;
    updatedAt?: number;
  },
>(papers: T[], sort: QuestionPaperSortKey = "attention", today: string = localDateStr()): T[] {
  const rankOf = (p: string) =>
    QUESTION_PAPER_PRIORITY_RANK[p as QuestionPaperPriority] ?? 2;

  return [...papers].sort((a, b) => {
    const aDone = a.status === "completed" ? 1 : 0;
    const bDone = b.status === "completed" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    switch (sort) {
      case "prep_deadline": {
        const ad = a.preparationDeadline ?? "9999-12-31";
        const bd = b.preparationDeadline ?? "9999-12-31";
        if (ad !== bd) return ad < bd ? -1 : 1;
        return a._creationTime - b._creationTime;
      }
      case "exam_date": {
        const ad = a.examDate ?? "9999-12-31";
        const bd = b.examDate ?? "9999-12-31";
        if (ad !== bd) return ad < bd ? -1 : 1;
        return a._creationTime - b._creationTime;
      }
      case "priority": {
        const ap = rankOf(a.priority);
        const bp = rankOf(b.priority);
        if (ap !== bp) return ap - bp;
        const ad = a.preparationDeadline ?? "9999-12-31";
        const bd = b.preparationDeadline ?? "9999-12-31";
        return ad < bd ? -1 : 1;
      }
      case "recent": {
        const au = a.updatedAt ?? a._creationTime;
        const bu = b.updatedAt ?? b._creationTime;
        if (au !== bu) return bu - au;
        return b._creationTime - a._creationTime;
      }
      case "status": {
        const as = QUESTION_PAPER_STATUS_RANK[a.status as QuestionPaperStatus] ?? 3;
        const bs = QUESTION_PAPER_STATUS_RANK[b.status as QuestionPaperStatus] ?? 3;
        if (as !== bs) return as - bs;
        const ad = a.preparationDeadline ?? "9999-12-31";
        const bd = b.preparationDeadline ?? "9999-12-31";
        return ad < bd ? -1 : 1;
      }
      case "attention":
      default: {
        const bucketOf = (p: T) =>
          p.preparationDeadline && p.preparationDeadline < today
            ? 0
            : p.preparationDeadline === today
              ? 1
              : p.preparationDeadline && p.preparationDeadline <= dateStr(today, 3)
                ? 2
                : 3;
        const ab = bucketOf(a);
        const bb = bucketOf(b);
        if (ab !== bb) return ab - bb;
        const ap = rankOf(a.priority);
        const bp = rankOf(b.priority);
        if (ap !== bp) return ap - bp;
        const aExam = a.examDate ?? "9999-12-31";
        const bExam = b.examDate ?? "9999-12-31";
        if (aExam !== bExam) return aExam < bExam ? -1 : 1;
        return a._creationTime - b._creationTime;
      }
    }
  });
}

function dateStr(today: string, offset: number): string {
  const d = new Date(today + "T00:00:00");
  d.setDate(d.getDate() + offset);
  return localDateStr(d);
}

/** Summary counts for the Question Papers page cards (computed from real data). */
export function questionPaperSummaryCounts<
  T extends { status: string; preparationDeadline?: string },
>(papers: T[], today: string = localDateStr()): {
  total: number;
  notStarted: number;
  draft: number;
  ready: number;
  completed: number;
  overdue: number;
} {
  return {
    total: papers.length,
    notStarted: papers.filter((p) => p.status === "not_started").length,
    draft: papers.filter((p) => p.status === "draft").length,
    ready: papers.filter((p) => p.status === "ready").length,
    completed: papers.filter((p) => p.status === "completed").length,
    overdue: papers.filter(
      (p) =>
        p.status !== "completed" &&
        !!p.preparationDeadline &&
        p.preparationDeadline < today,
    ).length,
  };
}

export type QuestionPaperFilterState = {
  search: string;
  status: string; // "all" | QuestionPaperStatus | "overdue"
  subject: string; // "all" | subject
  classGrade: string; // "all" | class/grade
  examType: string; // "all" | exam type
  priority: string; // "all" | QuestionPaperPriority
  period: "all" | "week" | "month" | "past";
};

export const DEFAULT_QUESTION_PAPER_FILTERS: QuestionPaperFilterState = {
  search: "",
  status: "all",
  subject: "all",
  classGrade: "all",
  examType: "all",
  priority: "all",
  period: "all",
};

/** Filter question papers by search text and structured filters. */
export function filterQuestionPapers<
  T extends {
    title: string;
    subject: string;
    classGrade: string;
    section?: string;
    examType: string;
    syllabusTopics?: string;
    status: string;
    priority: string;
    preparationDeadline?: string;
  },
>(papers: T[], filters: QuestionPaperFilterState, today: string = localDateStr()): T[] {
  const q = filters.search.trim().toLowerCase();
  const weekEnd = dateStr(today, 7);
  const monthEnd = dateStr(today, 30);

  return papers.filter((p) => {
    if (filters.status === "overdue") {
      if (
        p.status === "completed" ||
        !p.preparationDeadline ||
        p.preparationDeadline >= today
      )
        return false;
    } else if (filters.status !== "all" && p.status !== filters.status) {
      return false;
    }
    if (filters.subject !== "all" && p.subject !== filters.subject) return false;
    if (filters.classGrade !== "all" && p.classGrade !== filters.classGrade) return false;
    if (filters.examType !== "all" && p.examType !== filters.examType) return false;
    if (filters.priority !== "all" && p.priority !== filters.priority) return false;

    if (filters.period === "week") {
      if (!p.preparationDeadline || !(p.preparationDeadline >= today && p.preparationDeadline <= weekEnd))
        return false;
    }
    if (filters.period === "month") {
      if (!p.preparationDeadline || !(p.preparationDeadline >= today && p.preparationDeadline <= monthEnd))
        return false;
    }
    if (filters.period === "past") {
      if (!p.preparationDeadline || p.preparationDeadline >= today) return false;
    }

    if (q) {
      const hay =
        `${p.title} ${p.subject} ${p.classGrade} ${p.section ?? ""} ${p.examType} ${p.syllabusTopics ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Distinct subjects / class grades / exam types present in the data. */
export function uniqueQuestionPaperValues<
  T extends { subject: string; classGrade: string; examType: string },
>(papers: T[]): { subjects: string[]; classGrades: string[]; examTypes: string[] } {
  const sortUnique = (values: string[]) =>
    [...new Set(values.filter((v) => v))].sort((a, b) => a.localeCompare(b));
  return {
    subjects: sortUnique(papers.map((p) => p.subject)),
    classGrades: sortUnique(papers.map((p) => p.classGrade)),
    examTypes: sortUnique(papers.map((p) => p.examType)),
  };
}