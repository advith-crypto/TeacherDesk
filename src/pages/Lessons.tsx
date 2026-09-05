import { MobileNav, DesktopNav } from "@/components/AppNav";
import { LessonCard } from "@/components/LessonCard";
import { LessonDetailDrawer } from "@/components/LessonDetailDrawer";
import { CreateLessonDialog } from "@/components/LessonFormDialog";
import { LessonFilters } from "@/components/LessonFilters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_LESSON_FILTERS,
  filterLessons,
  lessonSummaryCounts,
  sortLessons,
  uniqueValues,
  type LessonFilterState,
} from "@/lib/lessons-shared";
import { useLessons, type LessonItem } from "@/hooks/use-lessons";
import { BookOpen, Plus, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

export default function Lessons() {
  const lessons = useLessons();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<LessonFilterState>(DEFAULT_LESSON_FILTERS);
  const [detailLesson, setDetailLesson] = useState<LessonItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Support /lessons?new=1 from dashboard quick actions. The URL is the source
  // of truth: "Plan lesson" actions set the ?new=1 param, and closing the dialog
  // strips it. Fully derived state — no effects, no render-phase navigation.
  const createOpen = searchParams.get("new") === "1";
  const openCreate = () => {
    const next = new URLSearchParams(searchParams);
    next.set("new", "1");
    setSearchParams(next, { replace: true });
  };
  const closeCreate = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
  };

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const summary = useMemo(
    () => lessonSummaryCounts(lessons ?? [], today),
    [lessons, today],
  );

  const visible = useMemo(() => {
    const all = lessons ?? [];
    const filtered = filterLessons(all, filters, today);
    return sortLessons(filtered, today);
  }, [lessons, filters, today]);

  const options = useMemo(() => uniqueValues(lessons ?? []), [lessons]);

  const openDetail = (l: LessonItem) => {
    setDetailLesson(l);
    setDetailOpen(true);
  };

  const loading = lessons === undefined;

  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />
      <MobileNav />

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
          {/* Header */}
          <header className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Lesson Planner</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Plan what to teach, when to teach it, and what needs to be prepared.
              </p>
            </div>
            <Button
              className="hidden h-11 gap-2 md:inline-flex"
              onClick={openCreate}
            >
              <Plus className="size-4" />
              Plan lesson
            </Button>
          </header>

          {/* Summary cards */}
          <section
            className="mb-5 grid grid-cols-4 gap-2 sm:gap-3"
            aria-label="Lesson statistics"
          >
            {[
              { label: "Planned", value: summary.planned, cls: "text-foreground" },
              { label: "Active", value: summary.inProgress, cls: "text-sky-600 dark:text-sky-400" },
              { label: "Done", value: summary.completed, cls: "text-emerald-600 dark:text-emerald-400" },
              { label: "Upcoming", value: summary.upcoming, cls: "text-amber-600 dark:text-amber-400" },
            ].map((s) => (
              <div key={s.label} className="card-soft px-2 py-3 text-center sm:px-3">
                <p className={`text-xl font-bold tabular-nums sm:text-2xl ${s.cls}`}>
                  {s.value}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground sm:text-xs">
                  {s.label}
                </p>
              </div>
            ))}
          </section>

          {/* Search + filters */}
          <div className="sticky top-0 z-10 -mx-4 bg-background/90 px-4 py-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0">
            <LessonFilters
              filters={filters}
              onChange={setFilters}
              subjects={options.subjects}
              classGrades={options.classGrades}
            />
          </div>

          {/* List */}
          <div className="mt-4 flex flex-col gap-2">
            {loading ? (
              <>
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </>
            ) : visible.length === 0 ? (
              <EmptyState
                hasLessons={(lessons ?? []).length > 0}
                hasFilters={
                  filters.search !== "" ||
                  filters.status !== "all" ||
                  filters.subject !== "all" ||
                  filters.classGrade !== "all" ||
                  filters.priority !== "all" ||
                  filters.period !== "all"
                }
                onAdd={openCreate}
                onClear={() => setFilters(DEFAULT_LESSON_FILTERS)}
              />
            ) : (
              visible.map((l) => (
                <LessonCard key={l._id} lesson={l} onOpen={openDetail} />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Mobile FAB */}
      <button
        onClick={openCreate}
        aria-label="Plan lesson"
        className="fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 active:scale-95 md:hidden"
      >
        <Plus className="size-6" />
      </button>

      <LessonDetailDrawer
        lesson={detailLesson}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <CreateLessonDialog
        open={createOpen}
        onOpenChange={(o) => (o ? openCreate() : closeCreate())}
      />
    </div>
  );
}

function EmptyState({
  hasLessons,
  hasFilters,
  onAdd,
  onClear,
}: {
  hasLessons: boolean;
  hasFilters: boolean;
  onAdd: () => void;
  onClear: () => void;
}) {
  if (!hasLessons) {
    return (
      <div className="card-soft flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <BookOpen className="size-7" />
        </span>
        <div>
          <p className="font-semibold">No lessons planned yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start planning your next class.
          </p>
        </div>
        <Button className="mt-2 h-11" onClick={onAdd}>
          <Plus className="size-4" />
          Plan lesson
        </Button>
      </div>
    );
  }
  if (hasFilters) {
    return (
      <div className="card-soft flex flex-col items-center gap-2 p-10 text-center">
        <SearchX className="size-8 text-muted-foreground" />
        <p className="font-semibold">No lessons match these filters.</p>
        <Button variant="outline" className="mt-1 h-10" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    );
  }
  return (
    <div className="card-soft flex flex-col items-center gap-2 p-10 text-center">
      <SearchX className="size-8 text-muted-foreground" />
      <p className="font-semibold">No lessons match your search.</p>
    </div>
  );
}
