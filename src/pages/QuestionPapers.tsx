import { MobileNav, DesktopNav } from "@/components/AppNav";
import { QuestionPaperCard } from "@/components/QuestionPaperCard";
import { QuestionPaperDetailDrawer } from "@/components/QuestionPaperDetailDrawer";
import { CreateQuestionPaperDialog } from "@/components/QuestionPaperFormDialog";
import { QuestionPaperFilters } from "@/components/QuestionPaperFilters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_QUESTION_PAPER_FILTERS,
  filterQuestionPapers,
  questionPaperSummaryCounts,
  sortQuestionPapers,
  uniqueQuestionPaperValues,
  type QuestionPaperFilterState,
} from "@/lib/question-papers-shared";
import {
  useQuestionPapers,
  type QuestionPaperItem,
} from "@/hooks/use-question-papers";
import { useAiPaperSummary } from "@/hooks/use-ai-papers";
import { ClipboardList, Plus, SearchX, Sparkles, WandSparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";

export default function QuestionPapers() {
  const papers = useQuestionPapers();
  const aiSummary = useAiPaperSummary();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<QuestionPaperFilterState>(
    DEFAULT_QUESTION_PAPER_FILTERS,
  );
  const [sort, setSort] = useState("attention");
  const [detailPaper, setDetailPaper] = useState<QuestionPaperItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Support /question-papers?new=1 from dashboard quick actions. The URL is the
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
    () => questionPaperSummaryCounts(papers ?? [], today),
    [papers, today],
  );

  const visible = useMemo(() => {
    const all = papers ?? [];
    const filtered = filterQuestionPapers(all, filters, today);
    return sortQuestionPapers(filtered, sort as Parameters<typeof sortQuestionPapers>[1], today);
  }, [papers, filters, sort, today]);

  const options = useMemo(() => uniqueQuestionPaperValues(papers ?? []), [papers]);

  const openDetail = (p: QuestionPaperItem) => {
    setDetailPaper(p);
    setDetailOpen(true);
  };

  const loading = papers === undefined;

  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />
      <MobileNav />

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
          {/* Header */}
          <header className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Question Papers</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Organize paper preparation and keep upcoming exams on track.
              </p>
            </div>
            <Button
              className="hidden h-11 gap-2 md:inline-flex"
              onClick={openCreate}
            >
              <Plus className="size-4" />
              Create paper
            </Button>
          </header>

          {/* Summary cards */}
          <section
            className="mb-5 grid grid-cols-5 gap-1.5 sm:gap-2"
            aria-label="Question paper statistics"
          >
            {[
              { label: "Total", value: summary.total, cls: "text-foreground" },
              { label: "Not started", value: summary.notStarted, cls: "text-slate-500 dark:text-slate-400" },
              { label: "Draft", value: summary.draft, cls: "text-amber-600 dark:text-amber-400" },
              { label: "Ready", value: summary.ready, cls: "text-sky-600 dark:text-sky-400" },
              { label: "Done", value: summary.completed, cls: "text-emerald-600 dark:text-emerald-400" },
            ].map((s) => (
              <div key={s.label} className="card-soft px-1 py-3 text-center sm:px-2">
                <p className={`text-lg font-bold tabular-nums sm:text-2xl ${s.cls}`}>
                  {s.value}
                </p>
                <p className="mt-0.5 break-words text-[10px] font-medium leading-tight text-muted-foreground sm:text-xs">
                  {s.label}
                </p>
              </div>
            ))}
          </section>

          {/* AI generator entry — distinct from the tracker above */}
          <section className="card-soft mb-5 overflow-hidden bg-gradient-to-br from-primary/10 via-indigo-500/10 to-transparent p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground">
                  <WandSparkles className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="flex flex-wrap items-center gap-1.5 font-semibold">
                    AI Question Paper Generator
                    {aiSummary && aiSummary.total > 0 && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {aiSummary.total} saved
                      </span>
                    )}
                  </h2>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    Generate a complete paper from your syllabus with AI, then
                    review and save it as a draft.
                  </p>
                </div>
              </div>
              <Link
                to="/question-papers/ai-generator"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <Sparkles className="size-4" />
                Open generator
              </Link>
            </div>
          </section>

          {/* Search + filters + sort */}
          <div className="sticky top-0 z-10 -mx-4 bg-background/90 px-4 py-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0">
            <QuestionPaperFilters
              filters={filters}
              onChange={setFilters}
              subjects={options.subjects}
              classGrades={options.classGrades}
              examTypes={options.examTypes}
              sort={sort}
              onSortChange={setSort}
            />
          </div>

          {/* List */}
          <div className="mt-4 flex flex-col gap-2">
            {loading ? (
              <>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </>
            ) : visible.length === 0 ? (
              <EmptyState
                hasPapers={(papers ?? []).length > 0}
                hasFilters={
                  filters.search !== "" ||
                  filters.status !== "all" ||
                  filters.subject !== "all" ||
                  filters.classGrade !== "all" ||
                  filters.examType !== "all" ||
                  filters.priority !== "all" ||
                  filters.period !== "all"
                }
                onAdd={openCreate}
                onClear={() => setFilters(DEFAULT_QUESTION_PAPER_FILTERS)}
              />
            ) : (
              visible.map((p) => (
                <QuestionPaperCard key={p._id} paper={p} onOpen={openDetail} />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Mobile FAB */}
      <button
        onClick={openCreate}
        aria-label="Create question paper"
        className="fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 active:scale-95 md:hidden"
      >
        <Plus className="size-6" />
      </button>

      <QuestionPaperDetailDrawer
        paper={detailPaper}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <CreateQuestionPaperDialog
        open={createOpen}
        onOpenChange={(o) => (o ? openCreate() : closeCreate())}
      />
    </div>
  );
}

function EmptyState({
  hasPapers,
  hasFilters,
  onAdd,
  onClear,
}: {
  hasPapers: boolean;
  hasFilters: boolean;
  onAdd: () => void;
  onClear: () => void;
}) {
  if (!hasPapers) {
    return (
      <div className="card-soft flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <ClipboardList className="size-7" />
        </span>
        <div>
          <p className="font-semibold">No question papers yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize your question-paper preparation and keep upcoming exams on track.
          </p>
        </div>
        <Button className="mt-2 h-11" onClick={onAdd}>
          <Plus className="size-4" />
          Create question paper
        </Button>
      </div>
    );
  }
  if (hasFilters) {
    return (
      <div className="card-soft flex flex-col items-center gap-2 p-10 text-center">
        <SearchX className="size-8 text-muted-foreground" />
        <p className="font-semibold">No question papers match these filters.</p>
        <Button variant="outline" className="mt-1 h-10" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    );
  }
  return (
    <div className="card-soft flex flex-col items-center gap-2 p-10 text-center">
      <SearchX className="size-8 text-muted-foreground" />
      <p className="font-semibold">No question papers match your search.</p>
    </div>
  );
}