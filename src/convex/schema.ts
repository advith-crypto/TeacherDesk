import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  // Default auth tables from convex auth. Do not remove or modify.
  ...authTables,

  // The default users table brought in by the authTables.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.string()),
  }).index("email", ["email"]),

  /**
   * Teacher profile - one per user. Stores teaching context that later
   * modules (lessons, timetable, exam seating) will reuse. Fully generic:
   * works for any school, board, subject, or country.
   */
  teacherProfiles: defineTable({
    userId: v.id("users"),
    fullName: v.optional(v.string()),
    schoolName: v.optional(v.string()),
    board: v.optional(v.string()),
    subjects: v.array(v.string()),
    grades: v.array(v.string()),
    workStartTime: v.optional(v.string()), // "HH:MM"
    workEndTime: v.optional(v.string()), // "HH:MM"
    workDay: v.optional(v.string()), // e.g. "Mon-Fri"
    onboardingComplete: v.boolean(),
  }).index("by_user", ["userId"]),

  /**
   * Teacher tasks - the Phase 1 core. Every row carries userId for strict
   * ownership isolation. Subtasks live in a separate table.
   */
  tasks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    priority: v.string(),
    status: v.string(),
    dueDate: v.optional(v.string()), // "YYYY-MM-DD"
    dueTime: v.optional(v.string()), // "HH:MM"
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_due", ["userId", "dueDate"]),

  /**
   * Task subtasks - ordered checklist items belonging to a task.
   */
  subtasks: defineTable({
    userId: v.id("users"),
    taskId: v.id("tasks"),
    title: v.string(),
    isCompleted: v.boolean(),
    position: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_user", ["userId"]),

  /**
   * Activity history - important user actions for the recent-activity feed.
   */
  activities: defineTable({
    userId: v.id("users"),
    action: v.string(), // created | updated | completed | reopened | deleted | profile_updated | onboarded
    entityType: v.string(), // task | subtask | profile | account | lesson | correction | question_paper | timetable | exam_seating | ai_paper
    entityId: v.optional(
      v.union(
        v.id("tasks"),
        v.id("lessons"),
        v.id("corrections"),
        v.id("questionPapers"),
        v.id("timetableEntries"),
        v.id("examSeatingPlans"),
        v.id("examSeatingAssignments"),
        v.id("aiGeneratedPapers"),
      ),
    ),
    summary: v.string(),
  }).index("by_user", ["userId"]), // _creationTime ordering is implicit

  /**
   * Per-user app settings (theme, notification preference placeholder).
   */
  userSettings: defineTable({
    userId: v.id("users"),
    theme: v.optional(v.string()), // "light" | "dark" | "system"
  }).index("by_user", ["userId"]),

  /**
   * Lessons — Phase 2A Lesson Planner. Every row carries userId for strict
   * ownership isolation, following the tasks table conventions.
   */
  lessons: defineTable({
    userId: v.id("users"),
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
    status: v.string(), // "planned" | "in_progress" | "completed"
    priority: v.string(), // "low" | "medium" | "high"
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_date", ["userId", "lessonDate"]),

  /**
   * Corrections — Phase 2B Corrections Tracker. Batches of papers/assignments
   * that need correction, per subject/class, with progress tracking.
   * remainingPapers and progress are always derived, never stored.
   */
  corrections: defineTable({
    userId: v.id("users"),
    title: v.string(),
    subject: v.string(),
    classGrade: v.string(),
    section: v.optional(v.string()),
    assessmentType: v.string(),
    assessmentDate: v.optional(v.string()), // "YYYY-MM-DD"
    correctionDeadline: v.string(), // "YYYY-MM-DD"
    totalPapers: v.number(),
    correctedPapers: v.number(),
    notes: v.optional(v.string()),
    priority: v.string(), // "low" | "medium" | "high" | "urgent"
    status: v.string(), // "not_started" | "in_progress" | "completed"
    completedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_deadline", ["userId", "correctionDeadline"]),

  /**
   * Question Papers — Phase 2C. Organize question-paper preparation from
   * draft to ready, with exam details and preparation deadlines.
   */
  questionPapers: defineTable({
    userId: v.id("users"),
    title: v.string(),
    subject: v.string(),
    classGrade: v.string(),
    section: v.optional(v.string()),
    examType: v.string(),
    examDate: v.optional(v.string()), // "YYYY-MM-DD"
    preparationDeadline: v.optional(v.string()), // "YYYY-MM-DD"
    durationMinutes: v.optional(v.number()),
    totalMarks: v.optional(v.number()),
    status: v.string(), // "not_started" | "draft" | "ready" | "completed"
    priority: v.string(), // "low" | "medium" | "high" | "urgent"
    syllabusTopics: v.optional(v.string()),
    questionCount: v.optional(v.number()),
    notes: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_deadline", ["userId", "preparationDeadline"]),

  /**
   * Timetable — Phase 2D. Weekly teaching periods. dayOfWeek follows the
   * JS convention: 0 = Sunday .. 6 = Saturday. Times are "HH:MM" (24h).
   */
  timetableEntries: defineTable({
    userId: v.id("users"),
    dayOfWeek: v.number(), // 0 (Sunday) .. 6 (Saturday)
    startTime: v.string(), // "HH:MM" 24-hour
    endTime: v.string(), // "HH:MM" 24-hour
    subject: v.string(),
    classGrade: v.string(),
    section: v.optional(v.string()),
    room: v.optional(v.string()),
    notes: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_day", ["userId", "dayOfWeek"]),

  /**
   * Exam Seating — Phase 2E. Plans for arranging exam seats. Students exist
   * only as identifiers inside a plan (no student database). assignedCount is
   * a derived counter kept in sync by every assignment mutation so list and
   * dashboard views never need to load full assignment rows.
   */
  examSeatingPlans: defineTable({
    userId: v.id("users"),
    title: v.string(),
    examName: v.string(),
    examDate: v.string(), // "YYYY-MM-DD"
    startTime: v.optional(v.string()), // "HH:MM" 24-hour
    durationMinutes: v.optional(v.number()),
    room: v.optional(v.string()),
    rows: v.number(), // positive whole number (1..50)
    columns: v.number(), // positive whole number (1..50)
    notes: v.optional(v.string()),
    status: v.string(), // "draft" | "ready" | "completed"
    assignedCount: v.number(), // derived, synced atomically by mutations
    completedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "examDate"])
    .index("by_user_status", ["userId", "status"]),

  /**
   * Exam seating assignments — one row per occupied seat. Seats are 1-based
   * (R1C1..R{rows}C{columns}) to match the visual grid and friendly errors.
   */
  examSeatingAssignments: defineTable({
    userId: v.id("users"),
    seatingPlanId: v.id("examSeatingPlans"),
    studentIdentifier: v.string(),
    row: v.number(), // 1-based
    column: v.number(), // 1-based
    updatedAt: v.optional(v.number()),
  })
    .index("by_seating_plan", ["seatingPlanId"])
    .index("by_user", ["userId"])
    .index("by_plan_student", ["seatingPlanId", "studentIdentifier"]),

  /**
   * AI Generated Question Papers — Phase 3A. Question papers produced by the
   * AI generator and saved by the teacher. Content is stored as typed
   * sections + questions (never one opaque blob) so it can be previewed,
   * re-rendered and later edited. Every row carries userId for ownership.
   * Totals are always derived from content on read; requested totals are
   * kept alongside so mismatches are visible instead of being papered over.
   */
  aiGeneratedPapers: defineTable({
    userId: v.id("users"),
    title: v.string(),
    subject: v.string(),
    classGrade: v.string(),
    section: v.optional(v.string()),
    examType: v.string(),
    durationMinutes: v.optional(v.number()),
    difficulty: v.string(), // "Easy" | "Medium" | "Hard" | "Mixed"
    topics: v.string(), // the syllabus/topics the paper was generated from
    questionTypes: v.array(v.string()),
    additionalInstructions: v.optional(v.string()),
    totalMarksRequested: v.number(),
    questionCountRequested: v.number(),
    // Structured content: sections → questions with number/type/marks/options.
    // `answer` is an internal teacher-facing key, never shown to students.
    content: v.array(
      v.object({
        name: v.string(),
        instructions: v.optional(v.string()),
        questions: v.array(
          v.object({
            number: v.number(),
            text: v.string(),
            type: v.string(),
            marks: v.number(),
            options: v.optional(v.array(v.string())),
            answer: v.optional(v.string()),
          }),
        ),
      }),
    ),
    status: v.string(), // "draft" | "ready"
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),
});

export default schema;
