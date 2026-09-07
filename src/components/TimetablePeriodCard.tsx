import { cn } from "@/lib/utils";
import { formatTime12 } from "@/lib/timetable-shared";
import type { TimetableEntryItem } from "@/hooks/use-timetable";
import { BookOpen, DoorOpen } from "lucide-react";

/**
 * Timetable period card — mobile-first. Highlights the current ("Now") and
 * next ("Next") class on today's schedule.
 */
export function TimetablePeriodCard({
  entry,
  highlight,
  onOpen,
}: {
  entry: TimetableEntryItem;
  highlight?: "now" | "next";
  onOpen: (entry: TimetableEntryItem) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Period: ${entry.subject}, ${entry.classGrade}, ${formatTime12(entry.startTime)} to ${formatTime12(entry.endTime)}`}
      onClick={() => onOpen(entry)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(entry);
        }
      }}
      className={cn(
        "card-soft card-soft-hover flex w-full cursor-pointer items-stretch gap-3 p-4 text-left",
        highlight === "now" && "border-primary/50 bg-primary/[0.04]",
      )}
    >
      {/* Time rail */}
      <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-border/60 pr-3 text-center">
        <span className="text-[13px] font-bold tabular-nums leading-tight">
          {formatTime12(entry.startTime)}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">to</span>
        <span className="text-[13px] font-bold tabular-nums leading-tight">
          {formatTime12(entry.endTime)}
        </span>
        {highlight === "now" && (
          <span className="mt-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            Now
          </span>
        )}
        {highlight === "next" && (
          <span className="mt-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-400">
            Next
          </span>
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-5">{entry.subject}</p>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
          {entry.classGrade}
          {entry.section ? ` · ${entry.section}` : ""}
        </p>
        {(entry.room || entry.notes) && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            {entry.room && (
              <span className="inline-flex items-center gap-1">
                <DoorOpen className="size-3.5" />
                {entry.room}
              </span>
            )}
            {entry.notes && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <BookOpen className="size-3.5 shrink-0" />
                <span className="truncate">{entry.notes}</span>
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}