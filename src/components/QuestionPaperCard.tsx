import { cn } from "@/lib/utils";
import {
  QUESTION_PAPER_PRIORITY_LABELS,
  QUESTION_PAPER_STATUS_LABELS,
  questionPaperAttentionReasons,
  type QuestionPaperPriority,
  type QuestionPaperStatus,
} from "@/lib/question-papers-shared";
import { friendlyDate } from "@/lib/attention";
import type { QuestionPaperItem } from "@/hooks/use-question-papers";
import { CalendarDays, Clock } from "lucide-react";

const reasonToneClasses: Record<string, string> = {
  overdue: "bg-destructive/10 text-destructive",
  today: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  soon: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  priority: "bg-accent text-accent-foreground",
  none: "bg-secondary text-muted-foreground",
};

const statusDotClasses: Record<string, string> = {
  not_started: "bg-slate-400 dark:bg-slate-500",
  draft: "bg-amber-500",
  ready: "bg-sky-500",
  completed: "bg-emerald-500",
};

/** Question paper list card — mobile-first, comfortable touch targets. */
export function QuestionPaperCard({
  paper,
  onOpen,
}: {
  paper: QuestionPaperItem;
  onOpen: (paper: QuestionPaperItem) => void;
}) {
  const reasons = questionPaperAttentionReasons(paper);
  const isCompleted = paper.status === "completed";
  const marksLine =
    paper.totalMarks !== undefined && paper.totalMarks > 0
      ? `${paper.totalMarks} marks`
      : "";
  const questionsLine =
    paper.questionCount !== undefined && paper.questionCount > 0
      ? `${paper.questionCount} questions`
      : "";
  const meta =
    [marksLine, questionsLine, paper.durationMinutes
      ? `${paper.durationMinutes} min`
      : ""].filter(Boolean).join(" · ") || null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Question paper: ${paper.title}`}
      onClick={() => onOpen(paper)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(paper);
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
            {paper.title}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {paper.subject} · {paper.classGrade}
            {paper.section ? ` · ${paper.section}` : ""} · {paper.examType}
          </p>
        </div>
        <span
          aria-label={`Status: ${paper.status}`}
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            statusDotClasses[paper.status] ?? "bg-slate-400",
          )}
        />
      </div>

      <p className="text-[13px] text-muted-foreground">
        <CalendarDays className="mr-1 inline size-3.5 align-[-2px]" />
        {paper.examDate ? `Exam ${friendlyDate(paper.examDate)}` : "Exam date TBD"}
        {paper.preparationDeadline && (
          <>
            {" "}
            · <Clock className="mr-1 inline size-3.5 align-[-2px]" />
            Prep by {friendlyDate(paper.preparationDeadline)}
          </>
        )}
      </p>

      {meta && <p className="text-[13px] font-medium text-foreground/80">{meta}</p>}

      <div className="flex flex-wrap items-center gap-1.5">
        {reasons.map((r) => (
          <span
            key={r.label}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              reasonToneClasses[r.tone],
            )}
          >
            {r.label}
          </span>
        ))}
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
          {QUESTION_PAPER_STATUS_LABELS[paper.status as QuestionPaperStatus] ?? paper.status}
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
          {QUESTION_PAPER_PRIORITY_LABELS[paper.priority as QuestionPaperPriority] ?? "Medium"}
        </span>
      </div>
    </div>
  );
}