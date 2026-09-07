import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DEFAULT_SEATING_FILTERS,
  SEATING_SORT_OPTIONS,
  SEATING_STATUSES,
  SEATING_STATUS_LABELS,
  type SeatingFilterState,
} from "@/lib/exam-seating-shared";
import { Search, SlidersHorizontal } from "lucide-react";

/** Search + filter controls for the Exam Seating page (mirrors other modules). */
export function SeatingPlanFilters({
  filters,
  onChange,
  sort,
  onSortChange,
}: {
  filters: SeatingFilterState;
  onChange: (next: SeatingFilterState) => void;
  sort: string;
  onSortChange: (sort: string) => void;
}) {
  const activeCount =
    (filters.status !== "all" ? 1 : 0) + (filters.period !== "all" ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search seating plans…"
          aria-label="Search seating plans"
          className="h-11 pl-9"
        />
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="h-11 gap-2" aria-label="Filters">
            <SlidersHorizontal className="size-4" />
            {activeCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filter seating plans</SheetTitle>
            <SheetDescription>Narrow the list by status or exam date.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4 pb-6">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Status</span>
              <Select
                value={filters.status}
                onValueChange={(v) => onChange({ ...filters, status: v })}
              >
                <SelectTrigger className="w-full" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {SEATING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SEATING_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Exam date</span>
              <Select
                value={filters.period}
                onValueChange={(v) =>
                  onChange({ ...filters, period: v as SeatingFilterState["period"] })
                }
              >
                <SelectTrigger className="w-full" aria-label="Filter by exam date">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any time</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="past">Past exams</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Sort by</span>
              <Select value={sort} onValueChange={onSortChange}>
                <SelectTrigger className="w-full" aria-label="Sort seating plans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEATING_SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              className="h-11"
              onClick={() => onChange({ ...DEFAULT_SEATING_FILTERS, search: filters.search })}
            >
              Reset filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}