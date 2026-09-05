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
import { CATEGORIES, CATEGORY_LABELS, PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from "@/lib/tasks-shared";
import { SlidersHorizontal, Search } from "lucide-react";

export type TaskFilterState = {
  search: string;
  status: string; // "all" | Status
  category: string; // "all" | Category
  priority: string; // "all" | Priority
  sort: "attention" | "due" | "priority" | "created";
};

export const DEFAULT_FILTERS: TaskFilterState = {
  search: "",
  status: "all",
  category: "all",
  priority: "all",
  sort: "attention",
};

export function TaskFilters({
  filters,
  onChange,
}: {
  filters: TaskFilterState;
  onChange: (next: TaskFilterState) => void;
}) {
  const activeCount =
    (filters.status !== "all" ? 1 : 0) +
    (filters.category !== "all" ? 1 : 0) +
    (filters.priority !== "all" ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          className="h-11 pl-9"
        />
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="h-11 gap-2" aria-label="Filters and sort">
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
            <SheetTitle>Filter & sort</SheetTitle>
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
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Category</span>
              <Select
                value={filters.category}
                onValueChange={(v) => onChange({ ...filters, category: v })}
              >
                <SelectTrigger className="w-full" aria-label="Filter by category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
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
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Sort by</span>
              <Select
                value={filters.sort}
                onValueChange={(v) => onChange({ ...filters, sort: v as TaskFilterState["sort"] })}
              >
                <SelectTrigger className="w-full" aria-label="Sort tasks">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attention">Needs attention first</SelectItem>
                  <SelectItem value="due">Deadline</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="created">Newest first</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              className="h-11"
              onClick={() => onChange({ ...DEFAULT_FILTERS, search: filters.search })}
            >
              Reset filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
