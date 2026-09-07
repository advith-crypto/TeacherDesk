import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { EXAM_TYPES } from "@/lib/question-papers-shared";
import {
  AI_DIFFICULTIES,
  AI_MAX_MARKS,
  AI_MAX_QUESTIONS,
  type AiDifficulty,
  type AiQuestionType,
} from "@/lib/ai-papers-shared";
import type {
  AiGeneratorFormValues,
  AiGenerateRequest,
} from "@/hooks/use-ai-papers";
import { Loader2, WandSparkles } from "lucide-react";
import { useState } from "react";

type Props = {
  values: AiGeneratorFormValues;
  onChange: (patch: Partial<AiGeneratorFormValues>) => void;
  /** Parent-level error (provider/config failures) shown under the form. */
  error?: string | null;
  onErrorChange?: (error: string | null) => void;
  submitting: boolean;
  onSubmit: (request: AiGenerateRequest) => void;
};

/** Whole-number positive int (with an optional cap) or an error message. */
function parsePositiveInt(
  raw: string,
  label: string,
  max?: number,
): { ok: true; value: number } | { ok: false; message: string } {
  const t = raw.trim();
  if (!t) return { ok: false, message: `${label} is required.` };
  const n = Number(t);
  if (!Number.isInteger(n) || n <= 0)
    return { ok: false, message: `${label} must be a positive whole number.` };
  if (max !== undefined && n > max)
    return { ok: false, message: `${label} can't exceed ${max}.` };
  return { ok: true, value: n };
}

/** Requirements form for the AI generator — controlled, keyboard friendly. */
export function AiGeneratorForm({
  values,
  onChange,
  error,
  onErrorChange,
  submitting,
  onSubmit,
}: Props) {
  const [validationError, setValidationError] = useState<string | null>(null);

  const showError = validationError ?? error;

  const toggleType = (type: AiQuestionType) => {
    const next = values.questionTypes.includes(type)
      ? values.questionTypes.filter((t) => t !== type)
      : [...values.questionTypes, type];
    onChange({ questionTypes: next });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    onErrorChange?.(null);

    if (!values.subject.trim()) return setValidationError("Subject is required.");
    if (!values.classGrade.trim())
      return setValidationError("Class / grade is required.");
    if (!values.examType.trim()) return setValidationError("Exam type is required.");
    if (!values.topics.trim())
      return setValidationError(
        "Add the topics/syllabus the paper should cover — the AI only uses what you supply.",
      );

    const marks = parsePositiveInt(values.totalMarks, "Total marks", AI_MAX_MARKS);
    if (!marks.ok) return setValidationError(marks.message);
    const count = parsePositiveInt(
      values.questionCount,
      "Number of questions",
      AI_MAX_QUESTIONS,
    );
    if (!count.ok) return setValidationError(count.message);

    let duration: number | undefined;
    if (values.durationMinutes.trim()) {
      const d = parsePositiveInt(values.durationMinutes, "Duration", 720);
      if (!d.ok) return setValidationError(d.message);
      duration = d.value;
    }

    if (values.questionTypes.length === 0)
      return setValidationError("Select at least one question type.");

    onSubmit({
      subject: values.subject.trim(),
      classGrade: values.classGrade.trim(),
      section: values.section.trim() || undefined,
      examType: values.examType,
      topics: values.topics.trim(),
      totalMarks: marks.value,
      questionCount: count.value,
      durationMinutes: duration,
      difficulty: values.difficulty,
      questionTypes: [...values.questionTypes],
      additionalInstructions:
        values.additionalInstructions.trim() || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      aria-label="Question paper generator requirements"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="ai-subject">Subject *</Label>
          <Input
            id="ai-subject"
            value={values.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            placeholder="e.g. Science"
            autoCapitalize="words"
            autoComplete="off"
            maxLength={120}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ai-class">Class / Grade *</Label>
          <Input
            id="ai-class"
            value={values.classGrade}
            onChange={(e) => onChange({ classGrade: e.target.value })}
            placeholder="e.g. Grade 9"
            autoCapitalize="words"
            autoComplete="off"
            maxLength={120}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="ai-section">Section (optional)</Label>
          <Input
            id="ai-section"
            value={values.section}
            onChange={(e) => onChange({ section: e.target.value })}
            placeholder="e.g. B"
            maxLength={120}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ai-exam-type">Exam type *</Label>
          <Select
            value={values.examType}
            onValueChange={(v) => onChange({ examType: v })}
          >
            <SelectTrigger className="w-full" aria-label="Exam type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXAM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="ai-topics">Topics / syllabus *</Label>
        <Textarea
          id="ai-topics"
          value={values.topics}
          onChange={(e) => onChange({ topics: e.target.value })}
          placeholder={
            "Chapters or topics the paper must cover, e.g.\nChapter 3: Nutrition in Plants\nChapter 4: Respiration in Organisms"
          }
          rows={4}
          maxLength={4000}
          required
        />
        <p className="text-xs text-muted-foreground">
          The generator only uses what you list here — it never invents
          syllabus or curriculum requirements.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="ai-marks">Total marks *</Label>
          <Input
            id="ai-marks"
            type="number"
            inputMode="numeric"
            min={1}
            max={AI_MAX_MARKS}
            step={1}
            value={values.totalMarks}
            onChange={(e) => onChange({ totalMarks: e.target.value })}
            placeholder="e.g. 40"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ai-questions">Questions *</Label>
          <Input
            id="ai-questions"
            type="number"
            inputMode="numeric"
            min={1}
            max={AI_MAX_QUESTIONS}
            step={1}
            value={values.questionCount}
            onChange={(e) => onChange({ questionCount: e.target.value })}
            placeholder="e.g. 20"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ai-duration">Duration (min)</Label>
          <Input
            id="ai-duration"
            type="number"
            inputMode="numeric"
            min={1}
            max={720}
            step={1}
            value={values.durationMinutes}
            onChange={(e) => onChange({ durationMinutes: e.target.value })}
            placeholder="e.g. 90"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label>Difficulty *</Label>
        <div className="grid grid-cols-4 gap-2">
          {AI_DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={values.difficulty === d}
              onClick={() => onChange({ difficulty: d as AiDifficulty })}
              className={cn(
                "min-h-11 rounded-xl border px-1 text-sm font-medium transition-colors",
                values.difficulty === d
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5">
        <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Question types *
        </span>
        <div
          role="group"
          aria-label="Question types"
          className="flex flex-wrap gap-2"
        >
          {(
            [
              "MCQ",
              "Very Short Answer",
              "Short Answer",
              "Long Answer",
              "Fill in the Blanks",
              "True / False",
            ] as const
          ).map((type) => {
            const active = values.questionTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => toggleType(type)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
                  active
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground hover:bg-secondary",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-4 items-center justify-center rounded border text-[10px]",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {active ? "✓" : ""}
                </span>
                {type}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="ai-instructions">Additional instructions (optional)</Label>
        <Textarea
          id="ai-instructions"
          value={values.additionalInstructions}
          onChange={(e) => onChange({ additionalInstructions: e.target.value })}
          placeholder={
            "e.g. Include one application-based question. Use simple language suitable for slow learners."
          }
          rows={2}
          maxLength={2000}
        />
      </div>

      {showError && (
        <p role="alert" className="text-sm text-destructive">
          {showError}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12 gap-2" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Generating your paper…
          </>
        ) : (
          <>
            <WandSparkles className="size-5" />
            Generate question paper
          </>
        )}
      </Button>
    </form>
  );
}
