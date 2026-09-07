import { MobileNav, DesktopNav } from "@/components/AppNav";
import { TimetablePeriodCard } from "@/components/TimetablePeriodCard";
import { TimetableDetailDrawer } from "@/components/TimetableDetailDrawer";
import { CreateTimetablePeriodDialog } from "@/components/TimetableFormDialog";
import { TimetableFilters } from "@/components/TimetableFilters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  currentNextClass,
  DAYS_OF_WEEK,
  DAY_SHORT,
  DEFAULT_TIMETABLE_FILTERS,
  filterTimetableEntries,
  formatTime12,
  sortTimetableEntries,
  uniqueTimetableValues,
  type TimetableFilterState,
} from "@/lib/timetable-shared";
import {
  useTimetableEntries,
  type TimetableEntryItem,
} from "@/hooks/use-timetable";
import { CalendarClock, Plus, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

export default function Timetable() {
  const entries = useTimetableEntries();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDay());
  const [filters, setFilters] = useState<TimetableFilterState>(
    DEFAULT_TIMETABLE_FILTERS,
  );
  const [detailEntry, setDetailEntry] = useState<TimetableEntryItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Support /timetable?new=1 from dashboard quick actions. The URL is the
  // source of truth: quick actions set the ?new=1 param, closing strips it.
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

  const now = useMemo(() => new Date(), []);
  const todayDay = now.getDay();

  const summary = useMemo(() => {
    const all = entries ?? [];
    const todayCount = all.filter((e) => e.dayOfWeek === todayDay).length;
    const subjects = new Set(all.map((e) => e.subject)).size;
    return { todayCount, total: all.length, subjects };
  }, [entries, todayDay]);

  const options = useMemo(() => uniqueTimetableValues(entries ?? []), [entries]);

  const dayEntries = useMemo(() => {
    const dayList = (entries ?? []).filter((e) => e.dayOfWeek === selectedDay);
    return sortTimetableEntries(dayList);
  }, [entries, selectedDay]);

  const visible = useMemo(
    () => filterTimetableEntries(dayEntries, filters),
    [dayEntries, filters],
  );

  const nowNext = useMemo(() => {
    if (selectedDay !== todayDay) return null;
    return currentNextClass(dayEntries, now.getHours() * 60 + now.getMinutes());
  }, [selectedDay, todayDay, dayEntries, now]);

  const isToday = selectedDay === todayDay;
  const hasAnyEntries = (entries ?? []).length > 0;
  const filtersActive =
    filters.search.trim() !== "" ||
    filters.subject !== "all" ||
    filters.classGrade !== "all";

  const openDetail = (e: TimetableEntryItem) => {
    setDetailEntry(e);
    setDetailOpen(true);
  };

  const loading = entries === undefined;

  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />
      <MobileNav />

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
          {/* Header */}
          <header className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Timetable</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                What classes do I have, where, and when?
              </p>
            </div>
            <Button
              className="hidden h-11 gap-2 md:inline-flex"
              onClick={openCreate}
            >
              <Plus className="size-4" />
              Add period
            </Button>
          </header>

          {/* Summary cards */}
          <section
            className="mb-5 grid grid-cols-3 gap-1.5 sm:gap-2"
            aria-label="Timetable statistics"
          >
            {[
              { label: "Today", value: summary.todayCount, cls: "text-primary" },
              { label: "Periods", value: summary.total, cls: "text-foreground" },
              { label: "Subjects", value: summary.subjects, cls: "text-sky-600 dark:text-sky-400" },
            ].map((s) => (
              <div key={s.label} className="card-soft px-2 py-3 text-center sm:px-3">
                <p className={`text-lg font-bold tabular-nums sm:text-2xl ${s.cls}`}>
                  {s.value}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground sm:text-xs">
                  {s.label}
                </p>
              </div>
            ))}
          </section>

          {/* Day switcher */}
          <div
            className="mb-4 -mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Day of the week"
          >
            <div className="flex min-w-max gap-1.5">
              {DAYS_OF_WEEK.map((day, i) => {
                const selected = i === selectedDay;
                return (
                  <button
                    key={day}
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setSelectedDay(i)}
                    className={cn(
                      "flex h-12 min-w-16 flex-col items-center justify-center rounded-xl px-3 text-[11px] font-semibold transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : i === todayDay
                          ? "bg-primary/10 text-primary"
                          : "card-soft text-muted-foreground",
                    )}
                  >
                    <span>{DAY_SHORT[i]}</span>
                    <span
                      className={cn(
                        "text-[10px] font-normal",
                        selected ? "text-primary-foreground/80" : "opacity-70",
                      )}
                    >
                      {i === todayDay ? "Today" : day}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Now / Next banner for today */}
          {isToday && nowNext && (nowNext.current || nowNext.next) && (
            <div
              className={cn(
                "card-soft mb-4 flex items-center gap-3 p-4",
                nowNext.current &&
                  "border-primary/40 bg-primary/[0.05]",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  nowNext.current
                    ? "bg-primary text-primary-foreground"
                    : "bg-sky-500/15 text-sky-700 dark:text-sky-400",
                )}
              >
                <CalendarClock className="size-5" />
              </span>
              <div className="min-w-0">
                {nowNext.current ? (
                  <>
                    <p className="text-sm font-semibold">
                      Now — {nowNext.current.subject}, {nowNext.current.classGrade}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Until {formatTime12(nowNext.current.endTime)}
                      {nowNext.current.room ? ` · ${nowNext.current.room}` : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold">
                      Next — {nowNext.next!.subject}, {nowNext.next!.classGrade}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatTime12(nowNext.next!.startTime)}
                      {nowNext.next!.room ? ` · ${nowNext.next!.room}` : ""}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Search + filters */}
          <TimetableFilters
            filters={filters}
            onChange={setFilters}
            subjects={options.subjects}
            classGrades={options.classGrades}
          />

          {/* Period list */}
          <div className="mt-4 flex flex-col gap-2">
            {loading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : visible.length === 0 ? (
              <EmptyState
                hasEntries={hasAnyEntries}
                hasFilters={filtersActive}
                dayLabel={DAYS_OF_WEEK[selectedDay]}
                onAdd={openCreate}
                onClear={() => setFilters(DEFAULT_TIMETABLE_FILTERS)}
              />
            ) : (
              visible.map((e) => (
                <TimetablePeriodCard
                  key={e._id}
                  entry={e}
                  highlight={
                    nowNext?.current?._id === e._id
                      ? "now"
                      : nowNext?.next?._id === e._id
                        ? "next"
                        : undefined
                  }
                  onOpen={openDetail}
                />
              ))
            )}
            {!loading && visible.length > 0 && isToday && !nowNext?.current && (
              <p className="mt-1 text-center text-xs text-muted-foreground">
                {nowNext?.next
                  ? "No more classes after this today."
                  : "Your schedule for today is complete."}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Mobile FAB */}
      <button
        onClick={openCreate}
        aria-label="Add period"
        className="fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 active:scale-95 md:hidden"
      >
        <Plus className="size-6" />
      </button>

      <TimetableDetailDrawer
        entry={detailEntry}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <CreateTimetablePeriodDialog
        open={createOpen}
        onOpenChange={(o) => (o ? openCreate() : closeCreate())}
        defaultDay={selectedDay}
      />
    </div>
  );
}

function EmptyState({
  hasEntries,
  hasFilters,
  dayLabel,
  onAdd,
  onClear,
}: {
  hasEntries: boolean;
  hasFilters: boolean;
  dayLabel: string;
  onAdd: () => void;
  onClear: () => void;
}) {
  if (!hasEntries) {
    return (
      <div className="card-soft flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <CalendarClock className="size-7" />
        </span>
        <div>
          <p className="font-semibold">Your timetable is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your teaching periods to see your daily and weekly schedule here.
          </p>
        </div>
        <Button className="mt-2 h-11" onClick={onAdd}>
          <Plus className="size-4" />
          Add period
        </Button>
      </div>
    );
  }
  if (hasFilters) {
    return (
      <div className="card-soft flex flex-col items-center gap-2 p-10 text-center">
        <SearchX className="size-8 text-muted-foreground" />
        <p className="font-semibold">No periods match these filters.</p>
        <Button variant="outline" className="mt-1 h-10" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    );
  }
  return (
    <div className="card-soft flex flex-col items-center gap-2 p-10 text-center">
      <CalendarClock className="size-8 text-muted-foreground" />
      <p className="font-semibold">No periods on {dayLabel}</p>
      <p className="text-sm text-muted-foreground">
        Add a period to start building your weekly schedule.
      </p>
    </div>
  );
}