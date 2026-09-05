import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-tasks";
import { GraduationCap, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

/** Chip-based tag input for subjects and classes. */
function TagInput({
  label,
  hint,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    if (!values.some((v) => v.toLowerCase() === t.toLowerCase())) {
      onChange([...values, t]);
    }
    setDraft("");
  };

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`tag-${label}`}>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="rounded-full p-0.5 hover:bg-accent/60"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          id={`tag-${label}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="secondary" onClick={add} aria-label={`Add ${label}`}>
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const { user } = useAuth();
  const profile = useProfile();
  const saveProfile = useMutation(api.profiles.saveProfile);
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [board, setBoard] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [saving, setSaving] = useState(false);

  // Prefill from profile if editing, else from auth user name.
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? user?.name ?? "");
      setSchoolName(profile.schoolName ?? "");
      setBoard(profile.board ?? "");
      setSubjects(profile.subjects ?? []);
      setGrades(profile.grades ?? []);
      setWorkStart(profile.workStartTime ?? "09:00");
      setWorkEnd(profile.workEndTime ?? "17:00");
    } else if (user?.name) {
      setFullName(user.name);
    }
  }, [profile, user?.name]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setSaving(true);
    try {
      await saveProfile({
        fullName: fullName.trim(),
        schoolName: schoolName.trim() || undefined,
        board: board.trim() || undefined,
        subjects,
        grades,
        workStartTime: workStart,
        workEndTime: workEnd,
        workDay: "Mon-Fri",
      });
      toast.success("You're all set!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="mx-auto w-full max-w-lg px-5 py-10">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap className="size-6" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            {profile ? "Edit your profile" : "Set up your TeacherDesk"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Tell us a little about your teaching context. You can change this anytime in
            Settings.
          </p>
        </div>

        <form onSubmit={handleSave} className="card-soft flex flex-col gap-5 p-5">
          <div className="grid gap-1.5">
            <Label htmlFor="ob-name">Full name</Label>
            <Input
              id="ob-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              required
              maxLength={120}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ob-school">School / institution</Label>
            <Input
              id="ob-school"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g. Greenwood High School"
              maxLength={160}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ob-board">Board / curriculum (optional)</Label>
            <Input
              id="ob-board"
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              placeholder="e.g. State Board, IB, GCSE, any curriculum"
              maxLength={120}
            />
          </div>

          <TagInput
            label="Subjects you teach"
            hint="Press Enter or + to add each subject"
            values={subjects}
            onChange={setSubjects}
            placeholder="e.g. Mathematics"
          />

          <TagInput
            label="Classes / grades you teach"
            hint="Any naming works: Grade 8, Class 10-B, Year 7…"
            values={grades}
            onChange={setGrades}
            placeholder="e.g. Grade 8"
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ob-start">Workday starts</Label>
              <Input
                id="ob-start"
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ob-end">Workday ends</Label>
              <Input
                id="ob-end"
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="h-12 w-full text-base" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save and continue"
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
