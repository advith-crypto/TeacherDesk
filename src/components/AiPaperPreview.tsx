import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AI_QUESTION_TYPES,
  AI_QUESTION_TYPE_SHORT,
  formatDuration,
  paperStats,
  type AiQuestion,
  type AiSection,
} from "@/lib/ai-papers-shared";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { useState } from "react";

export type AiPaperPreviewPaper = {
  title: string;
  subject: string;
  classGrade: string;
  section?: string;
  examType: string;
  durationMinutes?: number;
  difficulty?: string;
  totalMarksRequested?: number;
  questionCountRequested?: number;
  sections: AiSection[];
};

const ALL_TYPES = AI_QUESTION_TYPES as readonly string[];

function typeBadge(type: string) {
  const key = ALL_TYPES.find((t) => t === type);
  const short = key ? AI_QUESTION_TYPE_SHORT[key as keyof typeof AI_QUESTION_TYPE_SHORT] : type;
  return short;
}

function isMcq(q: AiQuestion): boolean {
  return q.type === "MCQ" && !!q.options && q.options.length > 0;
}

/**
 * Clean student-facing question-paper preview. The answer key is hidden by
 * default (teacher can reveal it) and review notes surface real mismatches
 * between requested and generated totals — nothing is claimed that isn't
 * computed from the actual content.
 */
export function AiPaperPreview({
  paper,
  reviewNotes = [],
  className,
}: {
  paper: AiPaperPreviewPaper;
  reviewNotes?: string[];
  className?: string;
}) {
  const [showAnswers, setShowAnswers] = useState(false);
  const stats = paperStats(paper.sections);
  const marksMismatch =
    paper.totalMarksRequested !== undefined &&
    paper.totalMarksRequested !== stats.totalMarks;
  const countMismatch =
    paper.questionCountRequested !== undefined &&
    paper.questionCountRequested !== stats.questionCount;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Exam header */}
      <div className="card-soft p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">{paper.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {paper.subject} · {paper.classGrade}
              {paper.section ? ` · Section ${paper.section}` : ""} ·{" "}
              {paper.examType}
            </p>
          </div>
          {paper.difficulty && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
              {paper.difficulty}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span>
            Requested:{" "}
            <span className="font-medium text-foreground">
              {paper.totalMarksRequested ?? "—"} marks
            </span>{" "}
            · {paper.questionCountRequested ?? "—"} questions
          </span>
          <span>
            In paper:{" "}
            <span
              className={cn(
                "font-medium tabular-nums",
                marksMismatch
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {stats.totalMarks} marks
            </span>{" "}
            ·{" "}
            <span
              className={cn(
                "font-medium tabular-nums",
                countMismatch
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {stats.questionCount} questions
            </span>
            {formatDuration(paper.durationMinutes)
              ? ` · ${formatDuration(paper.durationMinutes)}`
              : ""}
          </span>
        </div>

        {reviewNotes.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-700 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div className="flex flex-col gap-0.5">
              {reviewNotes.map((note, i) => (
                <p key={i}>{note}</p>
              ))}
              <p className="text-xs opacity-80">
                Review the paper before using it — you can regenerate if it
                doesn't match your requirements.
              </p>
            </div>
          </div>
        )}

        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            aria-pressed={showAnswers}
            onClick={() => setShowAnswers((v) => !v)}
          >
            {showAnswers ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
            {showAnswers ? "Hide answers" : "Show answers (teacher view)"}
          </Button>
        </div>
        {!showAnswers && (
          <p className="-mt-1 text-right text-[11px] text-muted-foreground">
            Answer keys stay hidden from the student-facing paper.
          </p>
        )}
      </div>

      {/* Sections + questions */}
      {paper.sections.map((section, sectionIdx) => (
        <section key={`${section.name}-${sectionIdx}`} className="card-soft p-4">
          <h3 className="flex items-baseline justify-between gap-2">
            <span className="font-semibold">
              {section.name || `Section ${sectionIdx + 1}`}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {section.questions.reduce((sum, q) => sum + q.marks, 0)} marks
            </span>
          </h3>
          {section.instructions && (
            <p className="mt-1 text-[13px] italic text-muted-foreground">
              {section.instructions}
            </p>
          )}
          <ol className="mt-3 flex flex-col gap-3">
            {section.questions.map((q) => (
              <li key={q.number} className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                  {q.number}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                    {q.text}
                  </p>

                  {isMcq(q) && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {q.options!.map((option, i) => {
                        const isCorrect =
                          showAnswers &&
                          !!q.answer &&
                          q.answer.trim().toLowerCase() ===
                            option.trim().toLowerCase();
                        return (
                          <li
                            key={i}
                            className={cn(
                              "flex items-start gap-2 rounded-md px-2 py-1 text-sm",
                              isCorrect &&
                                "bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-400",
                            )}
                          >
                            <span className="shrink-0 font-medium text-muted-foreground">
                              {String.fromCharCode(65 + i)}.
                            </span>
                            <span className="min-w-0">{option}</span>
                            {isCorrect && <span aria-label="Correct option">✓</span>}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {showAnswers && q.answer && !isMcq(q) && (
                    <p className="mt-1.5 text-[13px] text-emerald-700 dark:text-emerald-400">
                      <span className="font-medium">Answer:</span> {q.answer}
                    </p>
                  )}

                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {q.marks} {q.marks === 1 ? "mark" : "marks"}
                    </span>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                      {typeBadge(q.type)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
