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
  CORRECTION_PRIORITIES,
  CORRECTION_PRIORITY_LABELS,
  CORRECTION_STATUSES,
  CORRECTION_STATUS_LABELS,
  type CorrectionFilterState,
} from "@/lib/corrections-shared";
import { Search, SlidersHorizontal } from "lucide-react";

/** Search + filter controls for the Corrections page (mirrors LessonFilters). */
export function CorrectionFilters({
  filters,
  onChange,
  subjects,
  classGrades,
  assessmentTypes,
  onSortChange,
  sort,
}: {
  filters: CorrectionFilterState;
  onChange: (next: CorrectionFilterState) => void;
  subjects: string[];
  classGrades: string[];
  assessmentTypes: string[];
  onSortChange: (sort: string) => void;
  sort: string;
}) {
  const activeCount =
    (filters.status !== "all" ? 1 : 0) +
    (filters.subject !== "all" ? 1 : 0) +
    (filters.classGrade !== "all" ? 1 : 0) +
    (filters.assessmentType !== "all" ? 1 : 0) +
    (filters.priority !== "all" ? 1 : 0) +
    (filters.period !== "all" ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search corrections…"
          aria-label="Search corrections"
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
            <SheetTitle>Filter corrections</SheetTitle>
            <SheetDescription>Narrow the list to what matters now.</SheetDescription>
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
                  <SelectItem value="overdue">Overdue</SelectItem>
                  {CORRECTION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {CORRECTION_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Assessment type</span>
              <Select
                value={filters.assessmentType}
                onValueChange={(v) => onChange({ ...filters, assessmentType: v })}
              >
                <SelectTrigger className="w-full" aria-label="Filter by assessment type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {assessmentTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Priority</span>
              <Select
                value={filters.priority}
                onValueChange={(v) => onChange({ ...filters, priority: v })}
              >
                <SelectTrigger className="w-full" aria-label="Filter by priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {CORRECTION_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {CORRECTION_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Deadline</span>
              <Select
                value={filters.period}
                onValueChange={(v) =>
                  onChange({ ...filters, period: v as CorrectionFilterState["period"] })
                }
              >
                <SelectTrigger className="w-full" aria-label="Filter by deadline period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any time</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">Next month</SelectItem>
                  <SelectItem value="past">Past deadline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Sort by</span>
              <Select value={sort} onValueChange={onSortChange}>
                <SelectTrigger className="w-full" aria-label="Sort corrections">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
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
              onClick={() => onChange({ ...DEFAULT_RESET, search: filters.search })}
            >
              Reset filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: "attention", label: "Needs attention" },
  { value: "deadline_asc", label: "Deadline — soonest" },
  { value: "deadline_desc", label: "Deadline — latest" },
  { value: "priority", label: "Priority" },
  { value: "recent", label: "Recently updated" },
  { value: "progress", label: "Progress — most done" },
];

const DEFAULT_RESET: CorrectionFilterState = {
  search: "",
  status: "all",
  subject: "all",
  classGrade: "all",
  assessmentType: "all",
  priority: "all",
  period: "all",
};