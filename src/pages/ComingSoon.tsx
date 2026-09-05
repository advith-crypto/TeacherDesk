import { DesktopNav, MobileNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Hammer,
  ListChecks,
  Rocket,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";

/** Phase-2+ modules, shown as a roadmap preview. */
const ROADMAP: { label: string; icon: LucideIcon }[] = [
  { label: "Lessons", icon: BookOpen },
  { label: "Corrections", icon: ClipboardCheck },
  { label: "Question Papers", icon: ClipboardList },
  { label: "Timetable", icon: CalendarClock },
  { label: "Exam Seating", icon: ClipboardList },
  { label: "And more", icon: Sparkles },
];

export default function ComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />
      <MobileNav />

      <main className="md:pl-64">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pb-28 pt-10 text-center md:px-8 md:pb-16 md:pt-16">
          <span className="mb-5 flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground shadow-lg shadow-primary/25">
            <Rocket className="size-8" />
          </span>

          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            <Hammer className="size-3.5" />
            Coming in the next phase
          </span>

          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground md:text-base">
            {description ??
              "This module is on the TeacherDesk roadmap and will arrive in a future phase."}
          </p>

          <div className="card-soft mt-8 w-full p-5 text-left">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              TeacherDesk roadmap
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ROADMAP.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground"
                >
                  <item.icon className="size-4 shrink-0 text-primary" />
                  <span className="truncate">{item.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Meanwhile, tasks already cover your daily work — categorize a task as
              Lesson Planning, Corrections, Question Paper, Examination, or Timetable
              to keep everything organized.
            </p>
          </div>

          <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button asChild className="h-11 sm:min-w-44">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 sm:min-w-44">
              <Link to="/tasks?new=1">
                <ListChecks className="size-4" />
                Add a related task
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
