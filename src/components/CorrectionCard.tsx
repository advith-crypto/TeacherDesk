import { cn } from "@/lib/utils";
import {
  CORRECTION_PRIORITY_LABELS,
  CORRECTION_STATUS_LABELS,
  correctionAttentionReasons,
  progressPercent,
  remainingPapers,
  type CorrectionPriority,
  type CorrectionStatus,
} from "@/lib/corrections-shared";
import { friendlyDate } from "@/lib/attention";
import { useCorrectionMutations, type CorrectionItem } from "@/hooks/use-corrections";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";

const reasonToneClasses: Record<string, string> = {
  overdue: "bg-destructive/10 text-destructive",
  today: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  soon: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  priority: "bg-accent text-accent-foreground",
  none: "bg-secondary text-muted-foreground",
};

const statusDotClasses: Record<string, string> = {
  not_started: "bg-slate-400 dark:bg-slate-500",
  in_progress: "bg-amber-500",
  completed: "bg-emerald-500",
};

const progressBarClasses: Record<string, string> = {
  not_started: "bg-slate-400 dark:bg-slate-500",
  in_progress: "bg-amber-500",
  completed: "bg-emerald-500",
};

/**
 * Correction list card — mobile-first with quick − / + progress controls.
 * Tapping the card opens the detail drawer; tapping the steppers never does.
 */
export function CorrectionCard({
  correction,
  onOpen,
}: {
  correction: CorrectionItem;
  onOpen: (correction: CorrectionItem) => void;
}) {
  const { updateCorrectionProgress } = useCorrectionMutations();
  const [busy, setBusy] = useState(false);

  const isCompleted = correction.status === "completed";
  const reasons = correctionAttentionReasons(correction);
  const remaining = remainingPapers(correction.totalPapers, correction.correctedPapers);
  const pct = progressPercent(correction.totalPapers, correction.correctedPapers);

  const bump = async (delta: number) => {
    if (busy) return;
    const next = correction.correctedPapers + delta;
    if (next < 0 || next > correction.totalPapers) return;
    setBusy(true);
    try {
      await updateCorrectionProgress(correction._id, next);
    } finally {
      setBusy(false);
    }
  };

  // Keep stepper taps from opening the detail drawer. For keydown only stop
  // propagation — preventDefault would break Enter/Space activation of the
  // native buttons inside.
  const stopClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };
  const stopKey = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Correction: ${correction.title}`}
      onClick={() => onOpen(correction)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(correction);
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
            {correction.title}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {correction.subject} · {correction.classGrade}
            {correction.section ? ` · ${correction.section}` : ""} ·{" "}
            {correction.assessmentType}
          </p>
        </div>
        <span
          aria-label={`Status: ${correction.status}`}
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            statusDotClasses[correction.status] ?? "bg-slate-400",
          )}
        />
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div
          className="relative h-2 flex-1 overflow-hidden rounded-full bg-primary/10"
          aria-hidden
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              progressBarClasses[correction.status] ?? "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {correction.correctedPapers} / {correction.totalPapers}
        </span>
      </div>
      <p className="text-[13px] text-muted-foreground">
        {isCompleted
          ? "All papers corrected"
          : `${remaining} ${remaining === 1 ? "paper" : "papers"} remaining`}{" "}
        · {pct}% done
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
            {r.label}
          </span>
        ))}
        {reasons.length === 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
            {friendlyDate(correction.correctionDeadline)}
          </span>
        )}
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
          {CORRECTION_PRIORITY_LABELS[correction.priority as CorrectionPriority] ?? "Medium"}
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
          {CORRECTION_STATUS_LABELS[correction.status as CorrectionStatus] ?? correction.status}
        </span>
      </div>

      {/* Quick progress stepper */}
      <div
        className="mt-1 flex items-center gap-2"
        onClick={stopClick}
        onKeyDown={stopKey}
      >
        <button
          type="button"
          aria-label="Decrease corrected papers"
          disabled={busy || correction.correctedPapers <= 0}
          onClick={() => bump(-1)}
          className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors active:scale-95 disabled:opacity-35"
        >
          <Minus className="size-4" />
        </button>
        <div className="flex-1 text-center text-sm font-semibold tabular-nums">
          {correction.correctedPapers} corrected
        </div>
        <button
          type="button"
          aria-label="Increase corrected papers"
          disabled={busy || correction.correctedPapers >= correction.totalPapers}
          onClick={() => bump(1)}
          className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors active:scale-95 disabled:opacity-35"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}