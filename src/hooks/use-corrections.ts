import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export type CorrectionItem = {
  _id: Id<"corrections">;
  title: string;
  subject: string;
  classGrade: string;
  section?: string;
  assessmentType: string;
  assessmentDate?: string;
  correctionDeadline: string;
  totalPapers: number;
  correctedPapers: number;
  notes?: string;
  priority: string;
  status: string;
  completedAt?: number;
  updatedAt?: number;
  _creationTime: number;
};

export function useCorrections() {
  const corrections = useQuery(api.corrections.listCorrections) as
    | CorrectionItem[]
    | undefined;
  return corrections;
}

export function useCorrectionSummary() {
  const summary = useQuery(api.corrections.getCorrectionSummary);
  return summary;
}

export function useCorrectionMutations() {
  const create = useMutation(api.corrections.createCorrection);
  const update = useMutation(api.corrections.updateCorrection);
  const updateProgress = useMutation(api.corrections.updateCorrectionProgress);
  const remove = useMutation(api.corrections.deleteCorrection);
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
    createCorrection: (input: {
      title: string;
      subject: string;
      classGrade: string;
      section?: string;
      assessmentType: string;
      assessmentDate?: string;
      correctionDeadline: string;
      totalPapers: number;
      correctedPapers?: number;
      notes?: string;
      priority: string;
    }) => run(() => create({ input }), "Correction added"),
    updateCorrection: (
      correctionId: Id<"corrections">,
      patch: {
        title?: string;
        subject?: string;
        classGrade?: string;
        section?: string | null;
        assessmentType?: string;
        assessmentDate?: string | null;
        correctionDeadline?: string;
        totalPapers?: number;
        correctedPapers?: number;
        notes?: string | null;
        priority?: string;
      },
    ) => run(() => update({ correctionId, patch }), "Correction updated"),
    updateCorrectionProgress: (
      correctionId: Id<"corrections">,
      correctedPapers: number,
      successMessage?: string,
    ) => run(() => updateProgress({ correctionId, correctedPapers }), successMessage),
    deleteCorrection: (correctionId: Id<"corrections">) =>
      run(() => remove({ correctionId }), "Correction deleted"),
  };
}