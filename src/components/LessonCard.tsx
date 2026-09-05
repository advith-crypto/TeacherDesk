import { cn } from "@/lib/utils";
import {
  LESSON_PRIORITY_LABELS,
  lessonAttentionReasons,
  type LessonPriority,
} from "@/lib/lessons-shared";
import { friendlyDate } from "@/lib/attention";
import type { LessonItem } from "@/hooks/use-lessons";
import { BookOpen, Clock } from "lucide-react";

const reasonToneClasses: Record<string, string> = {
  overdue: "bg-destructive/10 text-destructive",
  today: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  soon: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  priority: "bg-accent text-accent-foreground",
  none: "bg-secondary text-muted-foreground",
};

const statusDotClasses: Record<string, string> = {
  planned: "bg-sky-500",
  in_progress: "bg-amber-500",
  completed: "bg-emerald-500",
};

/** Lesson list card — mobile-first, comfortable touch targets. */
export function LessonCard({
  lesson,
  onOpen,
}: {
  lesson: LessonItem;
  onOpen: (lesson: LessonItem) => void;
}) {
  const reasons = lessonAttentionReasons(lesson);
  const isCompleted = lesson.status === "completed";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Lesson: ${lesson.title}`}
      onClick={() => onOpen(lesson)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(lesson);
        }
      }}
      className={cn(
        "card-soft card-soft-hover flex w-full cursor-pointer flex-col gap-2 p-4 text-left",
        isCompleted && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("font-medium leading-5", isCompleted && "line-through")}>
            {lesson.title}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {lesson.subject} · {lesson.classGrade}
            {lesson.section ? ` · ${lesson.section}` : ""}
          </p>
        </div>
        <span
          aria-label={`Status: ${lesson.status}`}
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            statusDotClasses[lesson.status] ?? "bg-sky-500",
          )}
        />
      </div>

      <p className="line-clamp-1 text-sm text-muted-foreground">
        <BookOpen className="mr-1 inline size-3.5 align-[-2px]" />
        {lesson.topic}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {reasons.map((r) => (
          <span
            key={r.label}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              reasonToneClasses[r.tone],
            )}
          >
            {r.tone === "overdue" || r.tone === "today" ? <Clock className="size-3" /> : null}
            {r.label}
          </span>
        ))}
        {reasons.length === 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            {friendlyDate(lesson.lessonDate)}
          </span>
        )}
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
          {LESSON_PRIORITY_LABELS[lesson.priority as LessonPriority] ?? "Medium"}
        </span>
      </div>
    </div>
  );
}
