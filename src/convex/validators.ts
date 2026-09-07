import { v } from "convex/values";

export const CATEGORY_VALUES = [
  "general",
  "lesson_planning",
  "corrections",
  "question_paper",
  "examination",
  "timetable",
  "administration",
  "other",
] as const;

export const PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;
export const STATUS_VALUES = ["todo", "in_progress", "completed"] as const;

export const categoryValidator = v.string();
export const priorityValidator = v.string();
export const statusValidator = v.string();

export const subtaskInputValidator = v.object({
  title: v.string(),
});

export const taskInputValidator = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  category: categoryValidator,
  priority: priorityValidator,
  status: statusValidator,
  dueDate: v.optional(v.string()),
  dueTime: v.optional(v.string()),
  subtasks: v.optional(v.array(subtaskInputValidator)),
});

export const taskUpdateValidator = v.object({
  title: v.optional(v.string()),
  description: v.optional(v.nullable(v.string())),
  category: v.optional(categoryValidator),
  priority: v.optional(priorityValidator),
  status: v.optional(statusValidator),
  dueDate: v.optional(v.nullable(v.string())),
  dueTime: v.optional(v.nullable(v.string())),
});

export const subtaskToggleValidator = v.object({
  taskId: v.id("tasks"),
  subtaskId: v.id("subtasks"),
});

// --- Lessons (Phase 2A) ---

export const LESSON_STATUS_VALUES = ["planned", "in_progress", "completed"] as const;
export const LESSON_PRIORITY_VALUES = ["low", "medium", "high"] as const;

export const lessonInputValidator = v.object({
  title: v.string(),
  subject: v.string(),
  classGrade: v.string(),
  section: v.optional(v.string()),
  topic: v.string(),
  lessonDate: v.string(), // "YYYY-MM-DD"
  durationMinutes: v.optional(v.number()),
  objectives: v.optional(v.string()),
  teachingActivities: v.optional(v.string()),
  materials: v.optional(v.string()),
  homework: v.optional(v.string()),
  notes: v.optional(v.string()),
  status: v.string(),
  priority: v.string(),
});

export const lessonUpdateValidator = v.object({
  title: v.optional(v.string()),
  subject: v.optional(v.string()),
  classGrade: v.optional(v.string()),
  section: v.optional(v.nullable(v.string())),
  topic: v.optional(v.string()),
  lessonDate: v.optional(v.string()),
  durationMinutes: v.optional(v.nullable(v.number())),
  objectives: v.optional(v.nullable(v.string())),
  teachingActivities: v.optional(v.nullable(v.string())),
  materials: v.optional(v.nullable(v.string())),
  homework: v.optional(v.nullable(v.string())),
  notes: v.optional(v.nullable(v.string())),
  status: v.optional(v.string()),
  priority: v.optional(v.string()),
});

// --- Corrections (Phase 2B) ---

/** Lowercase keys follow the tasks/lessons convention; labels live in the UI. */
export const CORRECTION_STATUS_VALUES = [
  "not_started",
  "in_progress",
  "completed",
] as const;
export const CORRECTION_PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;

export const correctionInputValidator = v.object({
  title: v.string(),
  subject: v.string(),
  classGrade: v.string(),
  section: v.optional(v.string()),
  assessmentType: v.string(),
  assessmentDate: v.optional(v.string()),
  correctionDeadline: v.string(),
  totalPapers: v.number(),
  correctedPapers: v.optional(v.number()),
  notes: v.optional(v.string()),
  priority: v.string(),
});

export const correctionUpdateValidator = v.object({
  title: v.optional(v.string()),
  subject: v.optional(v.string()),
  classGrade: v.optional(v.string()),
  section: v.optional(v.nullable(v.string())),
  assessmentType: v.optional(v.string()),
  assessmentDate: v.optional(v.nullable(v.string())),
  correctionDeadline: v.optional(v.string()),
  totalPapers: v.optional(v.number()),
  correctedPapers: v.optional(v.number()),
  notes: v.optional(v.nullable(v.string())),
  priority: v.optional(v.string()),
});

// --- Question Papers (Phase 2C) ---

export const QUESTION_PAPER_STATUS_VALUES = [
  "not_started",
  "draft",
  "ready",
  "completed",
] as const;
export const QUESTION_PAPER_PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;

export const questionPaperInputValidator = v.object({
  title: v.string(),
  subject: v.string(),
  classGrade: v.string(),
  section: v.optional(v.string()),
  examType: v.string(),
  examDate: v.optional(v.string()),
  preparationDeadline: v.optional(v.string()),
  durationMinutes: v.optional(v.number()),
  totalMarks: v.optional(v.number()),
  status: v.string(),
  priority: v.string(),
  syllabusTopics: v.optional(v.string()),
  questionCount: v.optional(v.number()),
  notes: v.optional(v.string()),
});

export const questionPaperUpdateValidator = v.object({
  title: v.optional(v.string()),
  subject: v.optional(v.string()),
  classGrade: v.optional(v.string()),
  section: v.optional(v.nullable(v.string())),
  examType: v.optional(v.string()),
  examDate: v.optional(v.nullable(v.string())),
  preparationDeadline: v.optional(v.nullable(v.string())),
  durationMinutes: v.optional(v.nullable(v.number())),
  totalMarks: v.optional(v.nullable(v.number())),
  status: v.optional(v.string()),
  priority: v.optional(v.string()),
  syllabusTopics: v.optional(v.nullable(v.string())),
  questionCount: v.optional(v.nullable(v.number())),
  notes: v.optional(v.nullable(v.string())),
});

// --- Timetable (Phase 2D) ---

export const timetableEntryInputValidator = v.object({
  dayOfWeek: v.number(),
  startTime: v.string(),
  endTime: v.string(),
  subject: v.string(),
  classGrade: v.string(),
  section: v.optional(v.string()),
  room: v.optional(v.string()),
  notes: v.optional(v.string()),
});

export const timetableEntryUpdateValidator = v.object({
  dayOfWeek: v.optional(v.number()),
  startTime: v.optional(v.string()),
  endTime: v.optional(v.string()),
  subject: v.optional(v.string()),
  classGrade: v.optional(v.string()),
  section: v.optional(v.nullable(v.string())),
  room: v.optional(v.nullable(v.string())),
  notes: v.optional(v.nullable(v.string())),
});

// --- Exam Seating (Phase 2E) ---

export const EXAM_SEATING_STATUS_VALUES = ["draft", "ready", "completed"] as const;

export const examSeatingPlanInputValidator = v.object({
  title: v.string(),
  examName: v.string(),
  examDate: v.string(), // "YYYY-MM-DD"
  startTime: v.optional(v.string()),
  durationMinutes: v.optional(v.number()),
  room: v.optional(v.string()),
  rows: v.number(),
  columns: v.number(),
  notes: v.optional(v.string()),
  status: v.optional(v.string()), // defaults to "draft" on the backend
});

export const examSeatingPlanUpdateValidator = v.object({
  title: v.optional(v.string()),
  examName: v.optional(v.string()),
  examDate: v.optional(v.string()),
  startTime: v.optional(v.nullable(v.string())),
  durationMinutes: v.optional(v.nullable(v.number())),
  room: v.optional(v.nullable(v.string())),
  rows: v.optional(v.number()),
  columns: v.optional(v.number()),
  notes: v.optional(v.nullable(v.string())),
  status: v.optional(v.string()),
});

export const examSeatingAssignmentUpdateValidator = v.object({
  studentIdentifier: v.optional(v.string()),
  row: v.optional(v.number()),
  column: v.optional(v.number()),
});

// --- AI Question Paper Generator (Phase 3A) ---

/** Difficulty options for AI generation (display strings stored as-is). */
export const AI_DIFFICULTY_VALUES = ["Easy", "Medium", "Hard", "Mixed"] as const;

/** Question types the AI may be asked to produce (canonical display strings). */
export const AI_QUESTION_TYPE_VALUES = [
  "MCQ",
  "Very Short Answer",
  "Short Answer",
  "Long Answer",
  "Fill in the Blanks",
  "True / False",
] as const;

export const AI_PAPER_STATUS_VALUES = ["draft", "ready"] as const;

/** Question shape stored inside a generated paper's content. */
export const aiPaperQuestionValidator = v.object({
  number: v.number(),
  text: v.string(),
  type: v.string(),
  marks: v.number(),
  options: v.optional(v.array(v.string())),
  answer: v.optional(v.string()),
});

/** Section shape stored inside a generated paper's content. */
export const aiPaperSectionValidator = v.object({
  name: v.string(),
  instructions: v.optional(v.string()),
  questions: v.array(aiPaperQuestionValidator),
});

/** Request args for the AI generation action (what the teacher fills in). */
export const aiPaperGenerateValidator = v.object({
  subject: v.string(),
  classGrade: v.string(),
  section: v.optional(v.string()),
  examType: v.string(),
  topics: v.string(),
  totalMarks: v.number(),
  questionCount: v.number(),
  durationMinutes: v.optional(v.number()),
  difficulty: v.string(),
  questionTypes: v.array(v.string()),
  additionalInstructions: v.optional(v.string()),
});

/** Args for persisting a generated paper (request + generated content). */
export const aiPaperSaveValidator = v.object({
  title: v.string(),
  subject: v.string(),
  classGrade: v.string(),
  section: v.optional(v.string()),
  examType: v.string(),
  topics: v.string(),
  durationMinutes: v.optional(v.number()),
  difficulty: v.string(),
  questionTypes: v.array(v.string()),
  additionalInstructions: v.optional(v.string()),
  totalMarksRequested: v.number(),
  questionCountRequested: v.number(),
  content: v.array(aiPaperSectionValidator),
});

