import { MobileNav, DesktopNav } from "@/components/AppNav";
import { SeatingPlanCard } from "@/components/SeatingPlanCard";
import { CreateSeatingPlanDialog, EditSeatingPlanDialog } from "@/components/SeatingPlanFormDialog";
import { SeatingPlanFilters } from "@/components/SeatingPlanFilters";
import { SeatingGrid, type SeatCell } from "@/components/SeatingGrid";
import { SeatAssignDialog } from "@/components/SeatAssignDialog";
import { AutoArrangePanel } from "@/components/AutoArrangePanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { friendlyDate } from "@/lib/attention";
import {
  DEFAULT_SEATING_FILTERS,
  capacity,
  emptySeats,
  filterSeatingPlans,
  seatingSummaryCounts,
  SEATING_STATUS_CHIP,
  SEATING_STATUS_LABELS,
  sortSeatingPlans,
  type SeatingFilterState,
} from "@/lib/exam-seating-shared";
import {
  useSeatingMutations,
  useSeatingPlanDetail,
  useSeatingPlans,
  type SeatingPlanItem,
} from "@/hooks/use-exam-seating";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Pencil,
  Plus,
  RotateCcw,
  SearchX,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";

export default function ExamSeating() {
  const { planId } = useParams();
  if (planId && /^[a-zA-Z0-9]+$/.test(planId)) {
    return <SeatingPlanDetailView planId={planId as Id<"examSeatingPlans">} />;
  }
  return <SeatingPlanListView />;
}

/* ------------------------------------------------------------------ */
/* List view                                                           */
/* ------------------------------------------------------------------ */

function SeatingPlanListView() {
  const plans = useSeatingPlans();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<SeatingFilterState>(
    DEFAULT_SEATING_FILTERS,
  );
  const [sort, setSort] = useState("exam_date");

  // Support /exam-seating?new=1 from dashboard quick actions.
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

  const summary = useMemo(
    () => seatingSummaryCounts(plans ?? []),
    [plans],
  );

  const visible = useMemo(() => {
    const filtered = filterSeatingPlans(plans ?? [], filters);
    return sortSeatingPlans(filtered, sort as Parameters<typeof sortSeatingPlans>[1]);
  }, [plans, filters, sort]);

  const loading = plans === undefined;
  const filtersActive =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.period !== "all";

  const openPlan = (plan: SeatingPlanItem) => {
    navigate(`/exam-seating/${plan._id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />
      <MobileNav />

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
          {/* Header */}
          <header className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Exam Seating</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Who is sitting where for this exam?
              </p>
            </div>
            <Button
              className="hidden h-11 gap-2 md:inline-flex"
              onClick={openCreate}
            >
              <Plus className="size-4" />
              New seating plan
            </Button>
          </header>

          {/* Summary cards */}
          <section
            className="mb-5 grid grid-cols-4 gap-2 sm:gap-3"
            aria-label="Seating plan statistics"
          >
            {[
              { label: "Total", value: summary.total, cls: "text-foreground" },
              { label: "Draft", value: summary.draft, cls: "text-slate-600 dark:text-slate-400" },
              { label: "Ready", value: summary.ready, cls: "text-sky-600 dark:text-sky-400" },
              { label: "Done", value: summary.completed, cls: "text-emerald-600 dark:text-emerald-400" },
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
            <SeatingPlanFilters
              filters={filters}
              onChange={setFilters}
              sort={sort}
              onSortChange={setSort}
            />
          </div>

          {/* Plan list */}
          <div className="mt-4 flex flex-col gap-2">
            {loading ? (
              <>
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </>
            ) : visible.length === 0 ? (
              <EmptyState
                hasPlans={(plans ?? []).length > 0}
                hasFilters={filtersActive}
                onAdd={openCreate}
                onClear={() => setFilters(DEFAULT_SEATING_FILTERS)}
              />
            ) : (
              visible.map((p) => (
                <SeatingPlanCard key={p._id} plan={p} onOpen={openPlan} />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Mobile FAB */}
      <button
        onClick={openCreate}
        aria-label="New seating plan"
        className="fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 active:scale-95 md:hidden"
      >
        <Plus className="size-6" />
      </button>

      <CreateSeatingPlanDialog
        open={createOpen}
        onOpenChange={(o) => (o ? openCreate() : closeCreate())}
      />
    </div>
  );
}

function EmptyState({
  hasPlans,
  hasFilters,
  onAdd,
  onClear,
}: {
  hasPlans: boolean;
  hasFilters: boolean;
  onAdd: () => void;
  onClear: () => void;
}) {
  if (!hasPlans) {
    return (
      <div className="card-soft flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <ClipboardList className="size-7" />
        </span>
        <div>
          <p className="font-semibold">No exam seating plans yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a seating plan to organize exam seats.
          </p>
        </div>
        <Button className="mt-2 h-11" onClick={onAdd}>
          <Plus className="size-4" />
          New seating plan
        </Button>
      </div>
    );
  }
  if (hasFilters) {
    return (
      <div className="card-soft flex flex-col items-center gap-2 p-10 text-center">
        <SearchX className="size-8 text-muted-foreground" />
        <p className="font-semibold">No seating plans match these filters.</p>
        <Button variant="outline" className="mt-1 h-10" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    );
  }
  return (
    <div className="card-soft flex flex-col items-center gap-2 p-10 text-center">
      <SearchX className="size-8 text-muted-foreground" />
      <p className="font-semibold">No seating plans match your search.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plan detail view                                                    */
/* ------------------------------------------------------------------ */

function SeatingPlanDetailView({ planId }: { planId: Id<"examSeatingPlans"> }) {
  const detail = useSeatingPlanDetail(planId);
  const { updatePlan, deletePlan, pending } = useSeatingMutations();
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [seatTarget, setSeatTarget] = useState<SeatCell | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const plan = detail?.plan ?? null;
  const assignments = detail?.assignments ?? [];

  const cap = plan ? capacity(plan.rows, plan.columns) : 0;
  const assigned = plan?.assignedCount ?? 0;
  const empty = plan ? emptySeats(plan.rows, plan.columns, plan.assignedCount) : 0;

  const handleSeatClick = (seat: SeatCell) => {
    setSeatTarget(seat);
    setAssignOpen(true);
  };

  const handleDelete = async () => {
    await deletePlan(planId);
    setConfirmDelete(false);
    navigate("/exam-seating");
  };

  if (detail === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <DesktopNav />
        <MobileNav />
        <main className="md:pl-64">
          <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
            <Link
              to="/exam-seating"
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              All seating plans
            </Link>
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="mt-3 h-4 w-1/2" />
            <div className="mt-6 grid grid-cols-3 gap-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="mt-6 h-40 w-full" />
            <Skeleton className="mt-3 h-40 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-background">
        <DesktopNav />
        <MobileNav />
        <main className="md:pl-64">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-28 pt-16 text-center md:px-8">
            <SearchX className="size-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">Seating plan not found</p>
            <Button asChild className="mt-4 h-11">
              <Link to="/exam-seating">Back to seating plans</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isCompleted = plan.status === "completed";
  const isDraft = plan.status === "draft";

  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />
      <MobileNav />

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
          {/* Back */}
          <Link
            to="/exam-seating"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            All seating plans
          </Link>

          {/* Header */}
          <header className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight tracking-tight">
                {plan.title}
              </h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {plan.examName} · {friendlyDate(plan.examDate)}
                {plan.startTime ? ` · ${plan.startTime}` : ""}
                {plan.room ? ` · ${plan.room}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    SEATING_STATUS_CHIP[plan.status as keyof typeof SEATING_STATUS_CHIP] ??
                      "bg-secondary text-foreground",
                  )}
                >
                  {SEATING_STATUS_LABELS[plan.status as keyof typeof SEATING_STATUS_LABELS] ??
                    plan.status}
                </span>
                {plan.durationMinutes && (
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                    {plan.durationMinutes} min
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-1.5"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete seating plan"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </header>

          {/* Stats */}
          <section
            className="mb-5 grid grid-cols-3 gap-2 sm:gap-3"
            aria-label="Seating statistics"
          >
            {[
              { label: "Capacity", value: cap, cls: "text-foreground" },
              { label: "Assigned", value: assigned, cls: "text-sky-600 dark:text-sky-400" },
              { label: "Empty", value: empty, cls: "text-muted-foreground" },
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

          {/* Status controls */}
          <section className="mb-5 flex gap-2">
            {isDraft && (
              <Button
                variant="outline"
                className="h-11 flex-1"
                disabled={pending}
                onClick={() => updatePlan(planId, { status: "ready" })}
              >
                <Sparkles className="size-4" />
                Mark Ready
              </Button>
            )}
            {!isCompleted ? (
              <Button
                className="h-11 flex-1"
                disabled={pending}
                onClick={() => updatePlan(planId, { status: "completed" })}
              >
                <CheckCircle2 className="size-4" />
                Complete
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-11 flex-1"
                disabled={pending}
                onClick={() => updatePlan(planId, { status: "draft" })}
              >
                <RotateCcw className="size-4" />
                Reopen
              </Button>
            )}
          </section>

          {/* Auto arrange */}
          <section className="mb-6">
            <AutoArrangePanel
              planId={planId}
              rows={plan.rows}
              columns={plan.columns}
              hasAssignments={assignments.length > 0}
            />
          </section>

          {/* Seating grid */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Seating grid</h2>
              <span className="text-xs text-muted-foreground">
                Tap a seat to assign or edit
              </span>
            </div>
            {assignments.length === 0 ? (
              <div className="card-soft flex flex-col items-center gap-2 p-8 text-center">
                <ClipboardList className="size-7 text-muted-foreground" />
                <p className="font-semibold">No students assigned yet</p>
                <p className="text-sm text-muted-foreground">
                  Add students manually by tapping a seat, or use Auto Arrange.
                </p>
              </div>
            ) : (
              <SeatingGrid
                rows={plan.rows}
                columns={plan.columns}
                assignments={assignments}
                onSeatClick={handleSeatClick}
              />
            )}
            {assignments.length > 0 && (
              <p className="mt-1 text-center text-xs text-muted-foreground">
                {assigned} of {cap} seats filled
              </p>
            )}
          </section>

          <footer className="mt-12 text-center text-xs text-muted-foreground">
            TeacherDesk · Built by THOTA ADVITH
          </footer>
        </div>
      </main>

      <EditSeatingPlanDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        plan={plan}
        onSaved={() => setEditOpen(false)}
      />

      <SeatAssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        planId={planId}
        seat={
          seatTarget
            ? { row: seatTarget.row, column: seatTarget.column }
            : null
        }
        assignment={
          seatTarget?.assignment
            ? assignments.find((a) => a._id === seatTarget.assignment?._id) ?? null
            : null
        }
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this seating plan?</AlertDialogTitle>
            <AlertDialogDescription>
              “{plan.title}” and all {assigned} student assignments will be
              permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}