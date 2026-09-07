import { DesktopNav, MobileNav } from "@/components/AppNav";
import { AiGeneratorForm } from "@/components/AiGeneratorForm";
import { AiPaperPreview } from "@/components/AiPaperPreview";
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
import {
  AI_PAPER_STATUS_LABELS,
  formatDuration,
  type AiSection,
} from "@/lib/ai-papers-shared";
import {
  DEFAULT_AI_GENERATOR_VALUES,
  useAiPaper,
  useAiPaperMeta,
  useAiPaperMutations,
  useAiPaperSummary,
  type AiGenerateRequest,
  type AiGeneratorFormValues,
  type AiPaperMeta,
  type GeneratedPaper,
} from "@/hooks/use-ai-papers";
import { friendlyDate } from "@/lib/attention";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";

const ID_RE = /^[a-zA-Z0-9]+$/;

export default function AiPaperGenerator() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const view = viewParam === "saved" ? "saved" : "generate";
  const paperParam = searchParams.get("paper");
  const openedPaperId =
    view === "saved" && paperParam && ID_RE.test(paperParam)
      ? (paperParam as Id<"aiGeneratedPapers">)
      : null;

  const [values, setValues] = useState<AiGeneratorFormValues>(
    DEFAULT_AI_GENERATOR_VALUES,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "generating" | "preview">("form");
  const [lastRequest, setLastRequest] = useState<AiGenerateRequest | null>(null);
  const [generated, setGenerated] = useState<GeneratedPaper | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const meta = useAiPaperMeta();
  const summary = useAiPaperSummary();
  const opened = useAiPaper(openedPaperId);
  const {
    generating,
    saving,
    generatePaper,
    saveAiPaper,
    updateAiPaperStatus,
    deleteAiPaper,
  } = useAiPaperMutations();

  const patchValues = (patch: Partial<AiGeneratorFormValues>) =>
    setValues((v) => ({ ...v, ...patch }));

  const setView = (next: "generate" | "saved") => {
    const p = new URLSearchParams(searchParams);
    if (next === "generate") {
      p.delete("view");
    } else {
      p.set("view", "saved");
    }
    p.delete("paper");
    setSearchParams(p, { replace: true });
    setFormError(null);
  };

  const openSavedPaper = (id: Id<"aiGeneratedPapers">) => {
    const p = new URLSearchParams(searchParams);
    p.set("view", "saved");
    p.set("paper", id);
    setSearchParams(p, { replace: true });
  };

  const closeSavedPaper = () => {
    const p = new URLSearchParams(searchParams);
    p.delete("paper");
    setSearchParams(p, { replace: true });
  };

  const runGeneration = async (request: AiGenerateRequest) => {
    setFormError(null);
    setLastRequest(request);
    setGenerated(null);
    setPhase("generating");
    const result = await generatePaper(request);
    if (result) {
      setGenerated(result);
      setPhase("preview");
    } else {
      // The hook already toasts the real error; keep the form (with all the
      // teacher's entries intact) and surface a visible inline notice too.
      setFormError(
        "Generation didn't complete. Review the error above, fix anything that needs fixing, and try again.",
      );
      setPhase("form");
    }
  };

  const handleSave = async () => {
    if (!generated || !lastRequest) return;
    const id = await saveAiPaper({
      title: generated.title,
      subject: lastRequest.subject,
      classGrade: lastRequest.classGrade,
      section: lastRequest.section,
      examType: lastRequest.examType,
      topics: lastRequest.topics,
      durationMinutes: lastRequest.durationMinutes,
      difficulty: lastRequest.difficulty,
      questionTypes: lastRequest.questionTypes,
      additionalInstructions: lastRequest.additionalInstructions,
      totalMarksRequested: lastRequest.totalMarks,
      questionCountRequested: lastRequest.questionCount,
      content: generated.sections,
    });
    if (id) {
      setGenerated(null);
      setLastRequest(null);
      setPhase("form");
      openSavedPaper(id);
    }
  };

  const handleDeleteSaved = async () => {
    if (!openedPaperId) return;
    const ok = await deleteAiPaper(openedPaperId);
    if (ok !== undefined) {
      setDeleteOpen(false);
      closeSavedPaper();
    }
  };

  const savedCount = summary?.total;

  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />
      <MobileNav />

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
          {/* Header */}
          <header className="mb-5">
            <Link
              to="/question-papers"
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Question papers tracker
            </Link>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground">
                    <WandSparkles className="size-5" />
                  </span>
                  AI Question Paper Generator
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Describe the exam and get a complete, structured paper —
                  then review it and save it as a draft.
                </p>
              </div>
            </div>
          </header>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="AI question paper generator sections"
            className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-secondary/40 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "generate"}
              onClick={() => setView("generate")}
              className={cn(
                "flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
                view === "generate"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Sparkles className="size-4" />
              Generate
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "saved"}
              onClick={() => setView("saved")}
              className={cn(
                "flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
                view === "saved"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText className="size-4" />
              Saved
              {summary !== undefined && savedCount !== undefined && savedCount > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
                  {savedCount}
                </span>
              )}
            </button>
          </div>

          {view === "generate" ? (
            <GenerateTab
              phase={phase}
              values={values}
              onChange={patchValues}
              request={lastRequest}
              formError={formError}
              onFormErrorChange={setFormError}
              generated={generated}
              generating={generating}
              saving={saving}
              onGenerate={runGeneration}
              onRegenerate={() =>
                lastRequest ? runGeneration(lastRequest) : undefined
              }
              onEdit={() => setPhase("form")}
              onSave={handleSave}
            />
          ) : openedPaperId ? (
            <SavedPaperDetail
              paper={opened}
              busy={saving}
              onBack={closeSavedPaper}
              onStatusChange={(status) =>
                updateAiPaperStatus(openedPaperId, status)
              }
              onRequestDelete={() => setDeleteOpen(true)}
            />
          ) : (
            <SavedList
              meta={meta}
              onOpen={openSavedPaper}
              onGoGenerate={() => setView("generate")}
            />
          )}

          {/* Delete saved paper confirmation */}
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this AI question paper?</AlertDialogTitle>
                <AlertDialogDescription>
                  The saved paper and its questions will be permanently removed
                  from TeacherDesk. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  disabled={saving}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteSaved();
                  }}
                >
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Delete paper
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generate tab: form → generating → preview
// ---------------------------------------------------------------------------

function GenerateTab({
  phase,
  values,
  onChange,
  request,
  formError,
  onFormErrorChange,
  generated,
  generating,
  saving,
  onGenerate,
  onRegenerate,
  onEdit,
  onSave,
}: {
  phase: "form" | "generating" | "preview";
  values: AiGeneratorFormValues;
  onChange: (patch: Partial<AiGeneratorFormValues>) => void;
  request: AiGenerateRequest | null;
  formError: string | null;
  onFormErrorChange: (error: string | null) => void;
  generated: GeneratedPaper | null;
  generating: boolean;
  saving: boolean;
  onGenerate: (request: AiGenerateRequest) => void;
  onRegenerate: () => void;
  onEdit: () => void;
  onSave: () => void;
}) {
  if (phase === "generating") {
    return (
      <div className="card-soft flex flex-col items-center gap-4 p-10 text-center">
        <span className="relative flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <WandSparkles className="size-7" />
          <Loader2 className="absolute size-8 animate-spin text-primary/40" />
        </span>
        <div>
          <p className="font-semibold">Generating your question paper…</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            The AI is writing questions for{" "}
            <span className="font-medium text-foreground">
              {values.subject || "your subject"}
            </span>
            . This usually takes 15–45 seconds.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Don't close this tab — your requirements stay safe if anything goes
          wrong.
        </p>
      </div>
    );
  }

  if (phase === "preview" && generated && request) {
    const paperForPreview = {
      title: generated.title,
      subject: request.subject,
      classGrade: request.classGrade,
      section: request.section,
      examType: request.examType,
      durationMinutes: request.durationMinutes,
      difficulty: request.difficulty,
      totalMarksRequested: request.totalMarks,
      questionCountRequested: request.questionCount,
      sections: generated.sections as AiSection[],
    };
    return (
      <div className="flex flex-col gap-4">
        {/* Actions */}
        <div className="card-soft flex flex-col gap-2 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="h-11 flex-1 gap-2" onClick={onSave} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save draft
            </Button>
            <Button
              variant="outline"
              className="h-11 flex-1 gap-2"
              onClick={onRegenerate}
              disabled={generating}
            >
              <RefreshCw className="size-4" />
              Regenerate
            </Button>
          </div>
          <Button
            variant="ghost"
            className="h-10 gap-2"
            onClick={onEdit}
            disabled={generating}
          >
            <ArrowLeft className="size-4" />
            Edit requirements
          </Button>
          <p className="text-center text-[11px] text-muted-foreground sm:text-left">
            Nothing is saved yet — “Save draft” keeps this paper in your saved
            library. Generated with {generated.provider} ({generated.model}).
          </p>
        </div>

        <AiPaperPreview
          paper={paperForPreview}
          reviewNotes={generated.reviewNotes}
        />
      </div>
    );
  }

  // phase === "form"
  return (
    <div className="card-soft p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <ClipboardList className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Exam requirements</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Fill in what the paper must cover. The generator never uses
            anything outside these requirements.
          </p>
        </div>
      </div>
      <AiGeneratorForm
        values={values}
        onChange={onChange}
        error={formError}
        onErrorChange={onFormErrorChange}
        submitting={generating}
        onSubmit={onGenerate}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Saved library
// ---------------------------------------------------------------------------

function SavedList({
  meta,
  onOpen,
  onGoGenerate,
}: {
  meta: AiPaperMeta[] | undefined;
  onOpen: (id: Id<"aiGeneratedPapers">) => void;
  onGoGenerate: () => void;
}) {
  if (meta === undefined) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (meta.length === 0) {
    return (
      <div className="card-soft flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <FileText className="size-7" />
        </span>
        <div>
          <p className="font-semibold">No AI question papers saved yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Generate a paper, review it, then save it as a draft to keep it
            here for later.
          </p>
        </div>
        <Button className="mt-2 h-11 gap-2" onClick={onGoGenerate}>
          <WandSparkles className="size-4" />
          Generate a paper
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] text-muted-foreground">
        {meta.length} {meta.length === 1 ? "saved paper" : "saved papers"} —
        tap one to open the full paper.
      </p>
      {meta.map((paper) => (
        <SavedPaperCard key={paper._id} paper={paper} onOpen={onOpen} />
      ))}
    </div>
  );
}

function SavedPaperCard({
  paper,
  onOpen,
}: {
  paper: AiPaperMeta;
  onOpen: (id: Id<"aiGeneratedPapers">) => void;
}) {
  const isReady = paper.status === "ready";
  const metaLine = formatDuration(paper.durationMinutes);
  const reqLine = `${paper.totalMarksRequested} marks · ${paper.questionCountRequested} questions`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`AI question paper: ${paper.title}`}
      onClick={() => onOpen(paper._id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(paper._id);
        }
      }}
      className="card-soft card-soft-hover flex w-full cursor-pointer flex-col gap-2 p-4 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium leading-5">{paper.title}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {paper.subject} · {paper.classGrade}
            {paper.section ? ` · Section ${paper.section}` : ""} ·{" "}
            {paper.examType}
          </p>
        </div>
        <span
          aria-label={`Status: ${AI_PAPER_STATUS_LABELS[paper.status as "draft" | "ready"] ?? paper.status}`}
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            isReady ? "bg-emerald-500" : "bg-amber-500",
          )}
        />
      </div>

      <p className="truncate text-[13px] text-muted-foreground">
        {paper.topics}
      </p>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
          {AI_PAPER_STATUS_LABELS[paper.status as "draft" | "ready"] ?? paper.status}
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
          {paper.difficulty}
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
          {reqLine}
        </span>
        {metaLine && (
          <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
            {metaLine}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {friendlyDate(new Date(paper.updatedAt ?? paper._creationTime).toISOString().slice(0, 10))}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Saved paper detail (full content)
// ---------------------------------------------------------------------------

function SavedPaperDetail({
  paper,
  busy,
  onBack,
  onStatusChange,
  onRequestDelete,
}: {
  paper:
    | {
        title: string;
        subject: string;
        classGrade: string;
        section?: string;
        examType: string;
        durationMinutes?: number;
        difficulty: string;
        topics: string;
        additionalInstructions?: string;
        totalMarksRequested: number;
        questionCountRequested: number;
        content: AiSection[];
        status: string;
      }
    | null
    | undefined;
  busy: boolean;
  onBack: () => void;
  onStatusChange: (status: string) => void;
  onRequestDelete: () => void;
}) {
  if (paper === undefined) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (paper === null) {
    return (
      <div className="card-soft flex flex-col items-center gap-3 p-10 text-center">
        <FileText className="size-8 text-muted-foreground" />
        <div>
          <p className="font-semibold">Paper not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            It may have been deleted.
          </p>
        </div>
        <Button variant="outline" className="mt-1 h-10" onClick={onBack}>
          Back to saved papers
        </Button>
      </div>
    );
  }

  const isReady = paper.status === "ready";

  return (
    <div className="flex flex-col gap-4">
      <div className="card-soft flex flex-col gap-3 p-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Saved papers
        </button>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              isReady
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
            )}
          >
            {isReady && <Check className="size-3.5" />}
            {AI_PAPER_STATUS_LABELS[paper.status as "draft" | "ready"] ?? paper.status}
          </span>
        </div>
        {paper.additionalInstructions && (
          <p className="rounded-lg bg-secondary/60 px-3 py-2 text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">Teacher instructions: </span>
            {paper.additionalInstructions}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {isReady ? (
            <Button
              variant="outline"
              className="h-11 flex-1 gap-2"
              disabled={busy}
              onClick={() => onStatusChange("draft")}
            >
              Back to draft
            </Button>
          ) : (
            <Button
              className="h-11 flex-1 gap-2"
              disabled={busy}
              onClick={() => onStatusChange("ready")}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Mark as ready
            </Button>
          )}
          <Button
            variant="ghost"
            className="h-11 flex-1 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={busy}
            onClick={onRequestDelete}
          >
            <Trash2 className="size-4" />
            Delete paper
          </Button>
        </div>
      </div>

      <AiPaperPreview
        paper={{
          title: paper.title,
          subject: paper.subject,
          classGrade: paper.classGrade,
          section: paper.section,
          examType: paper.examType,
          durationMinutes: paper.durationMinutes,
          difficulty: paper.difficulty,
          totalMarksRequested: paper.totalMarksRequested,
          questionCountRequested: paper.questionCountRequested,
          sections: paper.content,
        }}
      />
    </div>
  );
}
