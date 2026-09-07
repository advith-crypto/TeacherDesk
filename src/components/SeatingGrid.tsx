import { cn } from "@/lib/utils";
import { seatLabel } from "@/lib/exam-seating-shared";
import type { SeatingAssignmentItem } from "@/hooks/use-exam-seating";
import { useMemo } from "react";

export type SeatCell = {
  row: number;
  column: number;
  assignment?: SeatingAssignmentItem;
};

/**
 * Visual seating grid — phone-first. Seats are compact cards in a CSS grid;
 * wide plans scroll horizontally only inside the grid area, never the page.
 */
export function SeatingGrid({
  rows,
  columns,
  assignments,
  onSeatClick,
}: {
  rows: number;
  columns: number;
  assignments: SeatingAssignmentItem[];
  onSeatClick: (seat: SeatCell) => void;
}) {
  const seats = useMemo<SeatCell[]>(() => {
    const bySeat = new Map(
      assignments.map((a) => [`${a.row}-${a.column}`, a] as const),
    );
    const list: SeatCell[] = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= columns; c++) {
        list.push({
          row: r,
          column: c,
          assignment: bySeat.get(`${r}-${c}`),
        });
      }
    }
    return list;
  }, [rows, columns, assignments]);

  return (
    <div className="overflow-x-auto pb-2 [scrollbar-width:thin]">
      <div
        className="grid min-w-max gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(72px, 1fr))`,
        }}
        aria-label={`Seating grid with ${rows} rows and ${columns} columns`}
      >
        {seats.map((seat) => {
          const occupied = Boolean(seat.assignment);
          return (
            <button
              key={`${seat.row}-${seat.column}`}
              type="button"
              onClick={() => onSeatClick(seat)}
              aria-label={`Seat ${seatLabel(seat.row, seat.column)}${
                seat.assignment
                  ? `, ${seat.assignment.studentIdentifier}`
                  : ", empty"
              }`}
              className={cn(
                "flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 text-center transition-colors active:scale-95",
                occupied
                  ? "border-primary/40 bg-primary/[0.07] hover:bg-primary/[0.12]"
                  : "card-soft border-transparent hover:border-border",
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {seatLabel(seat.row, seat.column)}
              </span>
              <span
                className={cn(
                  "w-full truncate text-xs font-medium leading-tight",
                  occupied ? "text-foreground" : "text-muted-foreground/70",
                )}
              >
                {seat.assignment ? seat.assignment.studentIdentifier : "Empty"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}