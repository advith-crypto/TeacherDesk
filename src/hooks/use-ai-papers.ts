import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type {
  AiDifficulty,
  AiQuestionType,
  AiSection,
} from "@/lib/ai-papers-shared";

// ---------------------------------------------------------------------------
// Shared input shapes
// ---------------------------------------------------------------------------

/** Raw values entered in the generator form (before parsing numbers). */
export type AiGeneratorFormValues = {
  subject: string;
  classGrade: string;
  section: string;
  examType: string;
  topics: string;
  totalMarks: string;
  questionCount: string;
  durationMinutes: string;
  difficulty: AiDifficulty;
  questionTypes: AiQuestionType[];
  additionalInstructions: string;
};

export const DEFAULT_AI_GENERATOR_VALUES: AiGeneratorFormValues = {
  subject: "",
  classGrade: "",
  section: "",
  examType: "Unit Test",
  topics: "",
  totalMarks: "",
  questionCount: "",
  durationMinutes: "",
  difficulty: "Medium",
  questionTypes: ["MCQ", "Short Answer", "Long Answer"],
  additionalInstructions: "",
};

/** Parsed generation request sent to the backend. */
export type AiGenerateRequest = {
  subject: string;
  classGrade: string;
  section?: string;
  examType: string;
  topics: string;
  totalMarks: number;
  questionCount: number;
  durationMinutes?: number;
  difficulty: string;
  questionTypes: string[];
  additionalInstructions?: string;
};

export type GeneratedPaper = {
  ok: true;
  title: string;
  sections: AiSection[];
  actualMarks: number;
  actualQuestions: number;
  marksMatch: boolean;
  questionsMatch: boolean;
  reviewNotes: string[];
  provider: string;
  model: string;
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export type AiPaperMeta = {
  _id: Id<"aiGeneratedPapers">;
  _creationTime: number;
  title: string;
  subject: string;
  classGrade: string;
  section?: string;
  examType: string;
  difficulty: string;
  topics: string;
  durationMinutes?: number;
  status: string;
  totalMarksRequested: number;
  questionCountRequested: number;
  updatedAt?: number;
};

/** Light saved-papers list — never contains question content. */
export function useAiPaperMeta() {
  const meta = useQuery(api.aiPapers.listAiPaperMeta) as AiPaperMeta[] | undefined;
  return meta;
}

export function useAiPaperSummary() {
  return useQuery(api.aiPapers.aiPaperSummary);
}

/** Full saved paper (with content) — load only for the opened paper. */
export function useAiPaper(paperId: Id<"aiGeneratedPapers"> | null) {
  return useQuery(
    api.aiPapers.getAiPaper,
    paperId ? { paperId } : "skip",
  );
}

// ---------------------------------------------------------------------------
// Mutations + action
// ---------------------------------------------------------------------------

export function useAiPaperMutations() {
  const generate = useAction(api.aiGenerate.generateAiPaper);
  const save = useMutation(api.aiPapers.saveAiPaper);
  const setStatus = useMutation(api.aiPapers.updateAiPaperStatus);
  const remove = useMutation(api.aiPapers.deleteAiPaper);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const run = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      setBusy: (b: boolean) => void,
      successMessage?: string,
    ): Promise<T | undefined> => {
      setBusy(true);
      try {
        const result = await fn();
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (err) {
        // Never silently fail — surface provider/config errors verbatim.
        toast.error(err instanceof Error ? err.message : "Something went wrong");
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return {
    generating,
    saving,
    generatePaper: (input: AiGenerateRequest) =>
      run(
        () => generate({ input }) as Promise<GeneratedPaper>,
        setGenerating,
      ),
    saveAiPaper: (input: {
      title: string;
      subject: string;
      classGrade: string;
      section?: string;
      examType: string;
      topics: string;
      durationMinutes?: number;
      difficulty: string;
      questionTypes: string[];
      additionalInstructions?: string;
      totalMarksRequested: number;
      questionCountRequested: number;
      content: AiSection[];
    }) => run(() => save({ input }), setSaving, "AI question paper saved as Draft"),
    updateAiPaperStatus: (paperId: Id<"aiGeneratedPapers">, status: string) =>
      run(
        () => setStatus({ paperId, status }),
        setSaving,
        status === "ready"
          ? "Marked as Ready"
          : "Reopened as Draft",
      ),
    deleteAiPaper: (paperId: Id<"aiGeneratedPapers">) =>
      run(() => remove({ paperId }), setSaving, "AI question paper deleted"),
  };
}
