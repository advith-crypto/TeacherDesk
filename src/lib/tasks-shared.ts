// Shared task domain values — single source of truth for UI + backend.

export const CATEGORIES = [
  "general",
  "lesson_planning",
  "corrections",
  "question_paper",
  "examination",
  "timetable",
  "administration",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ["todo", "in_progress", "completed"] as const;
export type Status = (typeof STATUSES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  general: "General",
  lesson_planning: "Lesson Planning",
  corrections: "Corrections",
  question_paper: "Question Paper",
  examination: "Examination",
  timetable: "Timetable",
  administration: "Administration",
  other: "Other",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const STATUS_LABELS: Record<Status, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  completed: "Completed",
};

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  CalendarClock,
  Circle,
  FileQuestion,
  FolderKanban,
  LayoutGrid,
} from "lucide-react";

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  general: Circle,
  lesson_planning: BookOpen,
  corrections: ClipboardCheck,
  question_paper: FileQuestion,
  examination: ClipboardList,
  timetable: CalendarClock,
  administration: FolderKanban,
  other: LayoutGrid,
};

/** Priority order for sorting (lower = more attention). */
export const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};
