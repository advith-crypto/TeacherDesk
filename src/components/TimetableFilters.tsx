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
  DEFAULT_TIMETABLE_FILTERS,
  type TimetableFilterState,
} from "@/lib/timetable-shared";
import { Search, SlidersHorizontal } from "lucide-react";

/** Search + subject/class filters for the Timetable page (lightweight by design). */
export function TimetableFilters({
  filters,
  onChange,
  subjects,
  classGrades,
}: {
  filters: TimetableFilterState;
  onChange: (next: TimetableFilterState) => void;
  subjects: string[];
  classGrades: string[];
}) {
  const activeCount =
    (filters.subject !== "all" ? 1 : 0) + (filters.classGrade !== "all" ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search periods…"
          aria-label="Search timetable periods"
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
            <SheetTitle>Filter periods</SheetTitle>
            <SheetDescription>Narrow the day's schedule to what matters.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4 pb-6">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Subject</span>
              <Select
                value={filters.subject}
                onValueChange={(v) => onChange({ ...filters, subject: v })}
              >
                <SelectTrigger className="w-full" aria-label="Filter by subject">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Class / Grade</span>
              <Select
                value={filters.classGrade}
                onValueChange={(v) => onChange({ ...filters, classGrade: v })}
              >
                <SelectTrigger className="w-full" aria-label="Filter by class">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classGrades.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              className="h-11"
              onClick={() => onChange({ ...DEFAULT_TIMETABLE_FILTERS, search: filters.search })}
            >
              Reset filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}