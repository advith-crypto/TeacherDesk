// Shared timetable domain values — single source of truth for UI + backend.

/** Day-of-week labels indexed by the JS convention (0 = Sunday .. 6 = Saturday). */
export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Short day labels (Sun..Sat) for the day switcher chips. */
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Validates a "HH:MM" 24-hour time string. */
export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** "HH:MM" → minutes since midnight; -1 for malformed input. */
export function timeToMinutes(value: string): number {
  if (!isValidTime(value)) return -1;
  const [h, m] = value.split(":").map((n) => Number.parseInt(n, 10));
  return h * 60 + m;
}

/** "09:00" → "9:00 AM" (12-hour display format). */
export function formatTime12(value: string): string {
  if (!isValidTime(value)) return value;
  const [h, m] = value.split(":").map((n) => Number.parseInt(n, 10));
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export type TimetableEntryLike = {
  _id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  classGrade: string;
  section?: string;
  room?: string;
  notes?: string;
};

/**
 * Deterministic overlap check (end-exclusive): 09:00–09:45 and 09:45–10:30 do
 * NOT conflict; 09:00–09:45 and 09:30–10:15 DO. No AI — minute arithmetic.
 */
export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Entries on the same day whose time ranges overlap the candidate (optionally excluding one id). */
export function findConflicts(
  entries: TimetableEntryLike[],
  candidate: { dayOfWeek: number; startTime: string; endTime: string },
  excludeId?: string,
): TimetableEntryLike[] {
  return entries.filter(
    (e) =>
      e._id !== excludeId &&
      e.dayOfWeek === candidate.dayOfWeek &&
      rangesOverlap(
        timeToMinutes(candidate.startTime),
        timeToMinutes(candidate.endTime),
        timeToMinutes(e.startTime),
        timeToMinutes(e.endTime),
      ),
  );
}

/** Sort periods for a day chronologically by start time (never creation order). */
export function sortTimetableEntries<T extends { startTime: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export type TimetableFilterState = {
  search: string;
  subject: string; // "all" | subject
  classGrade: string; // "all" | class/grade
};

export const DEFAULT_TIMETABLE_FILTERS: TimetableFilterState = {
  search: "",
  subject: "all",
  classGrade: "all",
};

/** Filter periods by search text (subject/class/room/notes) and structured filters. */
export function filterTimetableEntries<T extends TimetableEntryLike>(
  entries: T[],
  filters: TimetableFilterState,
): T[] {
  const q = filters.search.trim().toLowerCase();
  return entries.filter((e) => {
    if (filters.subject !== "all" && e.subject !== filters.subject) return false;
    if (filters.classGrade !== "all" && e.classGrade !== filters.classGrade)
      return false;
    if (q) {
      const hay =
        `${e.subject} ${e.classGrade} ${e.section ?? ""} ${e.room ?? ""} ${e.notes ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Distinct subjects / class grades present in the data. */
export function uniqueTimetableValues<
  T extends { subject: string; classGrade: string },
>(entries: T[]): { subjects: string[]; classGrades: string[] } {
  const sortUnique = (values: string[]) =>
    [...new Set(values.filter((v) => v))].sort((a, b) => a.localeCompare(b));
  return {
    subjects: sortUnique(entries.map((e) => e.subject)),
    classGrades: sortUnique(entries.map((e) => e.classGrade)),
  };
}

export type CurrentNext = {
  /** Period currently in session (start <= now < end), if any. */
  current: TimetableEntryLike | null;
  /** Next period today (earliest start after now), if any. */
  next: TimetableEntryLike | null;
};

/**
 * Given today's sorted periods and the current wall-clock time, find the
 * current and next class. Pure local-time logic, no external services.
 */
export function currentNextClass(
  todaysSorted: TimetableEntryLike[],
  nowMinutes: number,
): CurrentNext {
  const current =
    todaysSorted.find(
      (e) =>
        timeToMinutes(e.startTime) <= nowMinutes &&
        nowMinutes < timeToMinutes(e.endTime),
    ) ?? null;
  const next = todaysSorted.find((e) => timeToMinutes(e.startTime) > nowMinutes) ?? null;
  return { current, next };
}