import { MobileNav, DesktopNav } from "@/components/AppNav";
import { CorrectionCard } from "@/components/CorrectionCard";
import { CorrectionDetailDrawer } from "@/components/CorrectionDetailDrawer";
import { CreateCorrectionDialog } from "@/components/CorrectionFormDialog";
import { CorrectionFilters } from "@/components/CorrectionFilters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_CORRECTION_FILTERS,
  correctionSummaryCounts,
  filterCorrections,
  sortCorrections,
  uniqueCorrectionValues,
  type CorrectionFilterState,
} from "@/lib/corrections-shared";
import { useCorrections, type CorrectionItem } from "@/hooks/use-corrections";
import { ClipboardCheck, Plus, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

export default function Corrections() {
  const corrections = useCorrections();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<CorrectionFilterState>(
    DEFAULT_CORRECTION_FILTERS,
  );
  const [sort, setSort] = useState("attention");
  const [detailCorrection, setDetailCorrection] = useState<CorrectionItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Support /corrections?new=1 from dashboard quick actions. The URL is the
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

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const summary = useMemo(
    () => correctionSummaryCounts(corrections ?? [], today),
    [corrections, today],
  );

  const visible = useMemo(() => {
    const all = corrections ?? [];
    const filtered = filterCorrections(all, filters, today);
    return sortCorrections(filtered, sort as Parameters<typeof sortCorrections>[1], today);
  }, [corrections, filters, sort, today]);

  const options = useMemo(() => uniqueCorrectionValues(corrections ?? []), [corrections]);

  const openDetail = (c: CorrectionItem) => {
    setDetailCorrection(c);
    setDetailOpen(true);
  };

  const loading = corrections === undefined;

  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />
      <MobileNav />

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
          {/* Header */}
          <header className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Corrections</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Track papers, deadlines, and correction progress without manual counting.
              </p>
            </div>
            <Button
              className="hidden h-11 gap-2 md:inline-flex"
              onClick={openCreate}
            >
              <Plus className="size-4" />
              Add correction
            </Button>
          </header>

          {/* Summary cards */}
          <section
            className="mb-5 grid grid-cols-4 gap-2 sm:gap-3"
            aria-label="Correction statistics"
          >
            {[
              { label: "Active", value: summary.active, cls: "text-foreground" },
              { label: "Remaining", value: summary.papersRemaining, cls: "text-sky-600 dark:text-sky-400" },
              { label: "Done", value: summary.completed, cls: "text-emerald-600 dark:text-emerald-400" },
              { label: "Due soon", value: summary.dueSoon, cls: "text-amber-600 dark:text-amber-400" },
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

          {/* Search + filters + sort */}
          <div className="sticky top-0 z-10 -mx-4 bg-background/90 px-4 py-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0">
            <CorrectionFilters
              filters={filters}
              onChange={setFilters}
              subjects={options.subjects}
              classGrades={options.classGrades}
              assessmentTypes={options.assessmentTypes}
              sort={sort}
              onSortChange={setSort}
            />
          </div>

          {/* List */}
          <div className="mt-4 flex flex-col gap-2">
            {loading ? (
              <>
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-36 w-full" />
              </>
            ) : visible.length === 0 ? (
              <EmptyState
                hasCorrections={(corrections ?? []).length > 0}
                hasFilters={
                  filters.search !== "" ||
                  filters.status !== "all" ||
                  filters.subject !== "all" ||
                  filters.classGrade !== "all" ||
                  filters.assessmentType !== "all" ||
                  filters.priority !== "all" ||
                  filters.period !== "all"
                }
                onAdd={openCreate}
                onClear={() => setFilters(DEFAULT_CORRECTION_FILTERS)}
              />
            ) : (
              visible.map((c) => (
                <CorrectionCard key={c._id} correction={c} onOpen={openDetail} />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Mobile FAB */}
      <button
        onClick={openCreate}
        aria-label="Add correction"
        className="fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 active:scale-95 md:hidden"
      >
        <Plus className="size-6" />
      </button>

      <CorrectionDetailDrawer
        correction={detailCorrection}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <CreateCorrectionDialog
        open={createOpen}
        onOpenChange={(o) => (o ? openCreate() : closeCreate())}
      />
    </div>
  );
}

function EmptyState({
  hasCorrections,
  hasFilters,
  onAdd,
  onClear,
}: {
  hasCorrections: boolean;
  hasFilters: boolean;
  onAdd: () => void;
  onClear: () => void;
}) {
  if (!hasCorrections) {
    return (
      <div className="card-soft flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <ClipboardCheck className="size-7" />
        </span>
        <div>
          <p className="font-semibold">No corrections yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your paper-correction batches and see what remains.
          </p>
        </div>
        <Button className="mt-2 h-11" onClick={onAdd}>
          <Plus className="size-4" />
          Add correction
        </Button>
      </div>
    );
  }
  if (hasFilters) {
    return (
      <div className="card-soft flex flex-col items-center gap-2 p-10 text-center">
        <SearchX className="size-8 text-muted-foreground" />
        <p className="font-semibold">No corrections match these filters.</p>
        <Button variant="outline" className="mt-1 h-10" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    );
  }
  return (
    <div className="card-soft flex flex-col items-center gap-2 p-10 text-center">
      <SearchX className="size-8 text-muted-foreground" />
      <p className="font-semibold">No corrections match your search.</p>
    </div>
  );
}