import { cn } from "@/lib/utils";
import { friendlyDate } from "@/lib/attention";
import {
  capacity,
  emptySeats,
  examDateChip,
  SEATING_STATUS_CHIP,
  SEATING_STATUS_DOT,
  SEATING_STATUS_LABELS,
  type SeatingStatus,
} from "@/lib/exam-seating-shared";
import type { SeatingPlanItem } from "@/hooks/use-exam-seating";

/**
 * Seating plan list card — mobile-first. Shows the exam, date, room, capacity
 * and how many seats are filled, plus the plan status.
 */
export function SeatingPlanCard({
  plan,
  onOpen,
}: {
  plan: SeatingPlanItem;
  onOpen: (plan: SeatingPlanItem) => void;
}) {
  const chip = examDateChip(plan);
  const cap = capacity(plan.rows, plan.columns);
  const empty = emptySeats(plan.rows, plan.columns, plan.assignedCount);
  const isCompleted = plan.status === "completed";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Seating plan: ${plan.title}`}
      onClick={() => onOpen(plan)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(plan);
        }
      }}
      className={cn(
        "card-soft card-soft-hover flex w-full cursor-pointer flex-col gap-1.5 p-4 text-left",
        isCompleted && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("min-w-0 font-medium leading-5", isCompleted && "line-through")}>
          {plan.title}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
            chip.cls,
          )}
        >
          {chip.label}
        </span>
      </div>

      <p className="truncate text-[13px] text-muted-foreground">
        {plan.examName}
        {plan.room ? ` · ${plan.room}` : ""}
      </p>

      <p className="text-[13px] text-muted-foreground">
        {cap} {cap === 1 ? "seat" : "seats"} · {plan.assignedCount} assigned ·{" "}
        {empty} {empty === 1 ? "empty" : "empty"}
      </p>

      <div className="mt-0.5 flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            SEATING_STATUS_DOT[plan.status as SeatingStatus] ?? "bg-slate-400",
          )}
        />
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            SEATING_STATUS_CHIP[plan.status as SeatingStatus] ?? "bg-secondary text-foreground",
          )}
        >
          {SEATING_STATUS_LABELS[plan.status as SeatingStatus] ?? plan.status}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {plan.startTime ? `Starts ${plan.startTime}` : friendlyDate(plan.examDate)}
        </span>
      </div>
    </div>
  );
}