import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export type QuestionPaperItem = {
  _id: Id<"questionPapers">;
  title: string;
  subject: string;
  classGrade: string;
  section?: string;
  examType: string;
  examDate?: string;
  preparationDeadline?: string;
  durationMinutes?: number;
  totalMarks?: number;
  status: string;
  priority: string;
  syllabusTopics?: string;
  questionCount?: number;
  notes?: string;
  completedAt?: number;
  updatedAt?: number;
  _creationTime: number;
};

export function useQuestionPapers() {
  const papers = useQuery(api.questionPapers.listQuestionPapers) as
    | QuestionPaperItem[]
    | undefined;
  return papers;
}

export function useQuestionPaperSummary() {
  const summary = useQuery(api.questionPapers.getQuestionPaperSummary);
  return summary;
}

export function useQuestionPaperMutations() {
  const create = useMutation(api.questionPapers.createQuestionPaper);
  const update = useMutation(api.questionPapers.updateQuestionPaper);
  const remove = useMutation(api.questionPapers.deleteQuestionPaper);
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, successMessage?: string): Promise<T | undefined> => {
      setPending(true);
      try {
        const result = await fn();
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [],
  );

  return {
    pending,
    createQuestionPaper: (input: {
      title: string;
      subject: string;
      classGrade: string;
      section?: string;
      examType: string;
      examDate?: string;
      preparationDeadline?: string;
      durationMinutes?: number;
      totalMarks?: number;
      status: string;
      priority: string;
      syllabusTopics?: string;
      questionCount?: number;
      notes?: string;
    }) => run(() => create({ input }), "Question paper created"),
    updateQuestionPaper: (
      paperId: Id<"questionPapers">,
      patch: {
        title?: string;
        subject?: string;
        classGrade?: string;
        section?: string | null;
        examType?: string;
        examDate?: string | null;
        preparationDeadline?: string | null;
        durationMinutes?: number | null;
        totalMarks?: number | null;
        status?: string;
        priority?: string;
        syllabusTopics?: string | null;
        questionCount?: number | null;
        notes?: string | null;
      },
    ) => run(() => update({ paperId, patch }), "Question paper updated"),
    deleteQuestionPaper: (paperId: Id<"questionPapers">) =>
      run(() => remove({ paperId }), "Question paper deleted"),
  };
}