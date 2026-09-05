// Deterministic, explainable attention logic. No AI.

import { PRIORITY_RANK, type Priority } from "./tasks-shared";

export type AttentionReason = {
  label: string;
  tone: "overdue" | "today" | "soon" | "priority" | "none";
};

/** Local calendar date as YYYY-MM-DD (no timezone drift from UTC helpers). */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Days from today to a YYYY-MM-DD date (negative = overdue). */
export function daysUntil(dateStr: string, today: string = localDateStr()): number {
  const toMs = (s: string) => new Date(s + "T00:00:00").getTime();
  return Math.round((toMs(dateStr) - toMs(today)) / 86_400_000);
}

/** Deterministic attention score. Higher = more urgent attention needed. */
export function attentionScore(task: {
  priority: string;
  status: string;
  dueDate?: string;
}): number {
  if (task.status === "completed") return -1;
  let score = 0;
  const p = (PRIORITY_RANK[task.priority as Priority] ?? 2) * 10;
  if (task.dueDate) {
    const d = daysUntil(task.dueDate);
    if (d < 0) score += 1000 - d * 10; // overdue: more days = more score
    else if (d === 0) score += 500;
    else if (d <= 2) score += 300;
    else if (d <= 7) score += 150;
  }
  score += 100 - p; // higher priority (lower rank) = more score
  return score;
}

/**
 * Explainable reason chips shown on a task.
 * Returns the strongest applicable reason first.
 */
export function attentionReasons(task: {
  priority: string;
  status: string;
  dueDate?: string;
}): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  if (task.status === "completed") return reasons;

  if (task.dueDate) {
    const d = daysUntil(task.dueDate);
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
  }

  if (task.priority === "urgent")
    reasons.push({ label: "Urgent", tone: "priority" });
  else if (task.priority === "high")
    reasons.push({ label: "High priority", tone: "priority" });

  return reasons.slice(0, 2);
}

/** Human-friendly date: "Today", "Tomorrow", "Mon, 3 Feb", etc. */
export function friendlyDate(dateStr?: string): string {
  if (!dateStr) return "No date";
  const d = daysUntil(dateStr);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  const date = new Date(dateStr + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  };
  return date.toLocaleDateString(undefined, opts);
}
