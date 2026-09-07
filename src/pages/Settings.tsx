import { DesktopNav, MobileNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import { TagInput } from "@/pages/Onboarding";
import {
  Check,
  Loader2,
  LogOut,
  MailCheck,
  Monitor,
  Moon,
  Palette,
  Save,
  ShieldCheck,
  Sun,
  Trash2,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

type ThemeChoice = (typeof THEMES)[number]["value"];

/** Applies the chosen theme to <html> (light is the default in CSS). */
function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof UserRound;
  children: React.ReactNode;
}) {
  return (
    <section className="card-soft p-5">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <span className="flex size-8 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Teacher profile form. The parent keys this component on the profile
 * identity, so it prefills from server data at mount instead of syncing
 * state in an effect.
 */
function ProfileForm({
  profile,
  fallbackName,
}: {
  profile: Doc<"teacherProfiles"> | null | undefined;
  fallbackName?: string;
}) {
  const saveProfile = useMutation(api.profiles.saveProfile);

  const [fullName, setFullName] = useState(
    profile?.fullName ?? fallbackName ?? "",
  );
  const [schoolName, setSchoolName] = useState(profile?.schoolName ?? "");
  const [board, setBoard] = useState(profile?.board ?? "");
  const [subjects, setSubjects] = useState<string[]>(profile?.subjects ?? []);
  const [grades, setGrades] = useState<string[]>(profile?.grades ?? []);
  const [workStart, setWorkStart] = useState(profile?.workStartTime ?? "09:00");
  const [workEnd, setWorkEnd] = useState(profile?.workEndTime ?? "17:00");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      toast.success("Profile saved");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="st-name">Full name</Label>
        <Input
          id="st-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
          required
          maxLength={120}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="st-school">School / institution</Label>
        <Input
          id="st-school"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="e.g. Greenwood High School"
          maxLength={160}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="st-board">Board / curriculum (optional)</Label>
        <Input
          id="st-board"
          value={board}
          onChange={(e) => setBoard(e.target.value)}
          placeholder="e.g. State Board, IB, GCSE…"
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
          <Label htmlFor="st-start">Workday starts</Label>
          <Input
            id="st-start"
            type="time"
            value={workStart}
            onChange={(e) => setWorkStart(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="st-end">Workday ends</Label>
          <Input
            id="st-end"
            type="time"
            value={workEnd}
            onChange={(e) => setWorkEnd(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={saving}>
        {saving ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : saved ? (
          <Check className="mr-2 size-4" />
        ) : (
          <Save className="mr-2 size-4" />
        )}
        {saving ? "Saving…" : saved ? "Saved" : "Save profile"}
      </Button>
    </form>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const profile = useProfile();
  const settings = useQuery(api.profiles.getSettings);
  const saveTheme = useMutation(api.profiles.saveTheme);
  const clearMyData = useMutation(api.profiles.clearMyData);
  const { signIn } = useAuthActions();
  const navigate = useNavigate();

  const [haptics, setHaptics] = useState(true);

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const theme = (settings?.theme ?? "system") as ThemeChoice;
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleThemeChange = async (next: ThemeChoice) => {
    applyTheme(next);
    try {
      await saveTheme({ theme: next });
    } catch {
      toast.error("Could not save theme preference");
    }
  };

  const startEmailVerification = async () => {
    const email = user?.email;
    if (!email) {
      toast.error("This account has no email to verify (guest sign-in).");
      return;
    }
    setVerifyEmail(email);
    setVerifyCode("");
    setVerifyError(null);
    setVerifyLoading(true);
    setVerifyOpen(true);
    try {
      await signIn("email-otp", { email });
    } catch {
      setVerifyError("Could not send the verification code. Try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      await signIn("email-otp", { email: verifyEmail, code: verifyCode });
      toast.success("Email verified");
      setVerifyOpen(false);
    } catch {
      setVerifyError("The code you entered is incorrect.");
      setVerifyCode("");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch {
      toast.error("Could not sign out");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteBusy(true);
    try {
      // Remove profile + tasks first so the deleted user leaves no orphan data.
      await clearMyData({});
      // Sign out locally. The auth row itself is cleaned up by the platform.
      await signOut();
      toast.success("Account data deleted");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete account");
      setDeleteBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />
      <MobileNav />

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
          <header className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Your profile, preferences, and account.
            </p>
          </header>

          <div className="flex flex-col gap-5">
            {/* Account */}
            <SectionCard title="Account" icon={ShieldCheck}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {user?.email ?? user?.name ?? "Guest account"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {user?.email ? "Signed in with email" : "Anonymous guest session"}
                    </p>
                  </div>
                  {user?.email &&
                    (user.emailVerificationTime ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <MailCheck className="size-3.5" />
                        Verified
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={startEmailVerification}
                      >
                        Verify email
                      </Button>
                    ))}
                </div>
                <Separator />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    className="h-10 flex-1"
                    onClick={handleSignOut}
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-10 flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    Delete account data
                  </Button>
                </div>
              </div>
            </SectionCard>

            {/* Profile — keyed on profile identity so it re-prefills on load */}
            <SectionCard title="Teacher profile" icon={UserRound}>
              <ProfileForm
                key={profile?._id ?? (profile === undefined ? "loading" : "none")}
                profile={profile}
                fallbackName={user?.name}
              />
            </SectionCard>

            {/* Appearance */}
            <SectionCard title="Appearance" icon={Palette}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-1.5">
                  <Label>Theme</Label>
                  <p className="text-xs text-muted-foreground">
                    Saved to your account and applied on every device.
                  </p>
                  <div
                    role="radiogroup"
                    aria-label="Theme"
                    className="mt-1 grid grid-cols-3 gap-2"
                  >
                    {THEMES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        role="radio"
                        aria-checked={theme === t.value}
                        onClick={() => handleThemeChange(t.value)}
                        className={cn(
                          "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
                          theme === t.value
                            ? "border-primary bg-accent text-accent-foreground"
                            : "border-border text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        <t.icon className="size-4" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Haptic feedback</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Subtle vibration on supported mobile devices.
                    </p>
                  </div>
                  <Switch
                    checked={haptics}
                    onCheckedChange={setHaptics}
                    aria-label="Toggle haptic feedback"
                  />
                </div>
              </div>
            </SectionCard>

            <p className="pb-2 text-center text-xs text-muted-foreground">
              TeacherDesk · Built by THOTA ADVITH
            </p>
          </div>
        </div>
      </main>

      {/* Email verification dialog */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Verify your email</DialogTitle>
            <DialogDescription>
              We sent a 6-digit code to {verifyEmail}. Enter it below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitVerification} className="flex flex-col gap-4">
            <input type="hidden" name="email" value={verifyEmail} />
            <input type="hidden" name="code" value={verifyCode} />
            <div className="flex justify-center">
              <InputOTP
                value={verifyCode}
                onChange={setVerifyCode}
                maxLength={6}
                disabled={verifyLoading}
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            {verifyError && (
              <p className="text-center text-sm text-destructive">{verifyError}</p>
            )}
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => setVerifyOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={verifyLoading || verifyCode.length !== 6}
              >
                {verifyLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Verify
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete-account confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-5 text-destructive" />
              Delete your account data?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes your profile, tasks, lessons, corrections,
              question papers, timetable, exam seating plans, and activity history
              from TeacherDesk. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="delete-confirm">
              Type <span className="font-semibold">DELETE</span> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteBusy || deleteConfirmText !== "DELETE"}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
            >
              {deleteBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
