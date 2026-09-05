import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export type LessonItem = {
  _id: Id<"lessons">;
  title: string;
  subject: string;
  classGrade: string;
  section?: string;
  topic: string;
  lessonDate: string;
  durationMinutes?: number;
  objectives?: string;
  teachingActivities?: string;
  materials?: string;
  homework?: string;
  notes?: string;
  status: string;
  priority: string;
  completedAt?: number;
  _creationTime: number;
};

export function useLessons() {
  const lessons = useQuery(api.lessons.listLessons) as LessonItem[] | undefined;
  return lessons;
}

export function useLessonSummary() {
  const summary = useQuery(api.lessons.getLessonSummary);
  return summary;
}

export function useLessonMutations() {
  const create = useMutation(api.lessons.createLesson);
  const update = useMutation(api.lessons.updateLesson);
  const remove = useMutation(api.lessons.deleteLesson);
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
    createLesson: (input: {
      title: string;
      subject: string;
      classGrade: string;
      section?: string;
      topic: string;
      lessonDate: string;
      durationMinutes?: number;
      objectives?: string;
      teachingActivities?: string;
      materials?: string;
      homework?: string;
      notes?: string;
      status: string;
      priority: string;
    }) => run(() => create({ input }), "Lesson planned"),
    updateLesson: (
      lessonId: Id<"lessons">,
      patch: {
        title?: string;
        subject?: string;
        classGrade?: string;
        section?: string | null;
        topic?: string;
        lessonDate?: string;
        durationMinutes?: number | null;
        objectives?: string | null;
        teachingActivities?: string | null;
        materials?: string | null;
        homework?: string | null;
        notes?: string | null;
        status?: string;
        priority?: string;
      },
    ) => run(() => update({ lessonId, patch })),
    deleteLesson: (lessonId: Id<"lessons">) =>
      run(() => remove({ lessonId }), "Lesson deleted"),
  };
}
