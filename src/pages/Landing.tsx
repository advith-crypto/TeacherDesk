import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Sparkles,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

const FEATURES = [
  {
    icon: ListChecks,
    title: "One place for your work",
    body: "Tasks, deadlines and follow-ups across every class and subject — no more sticky notes.",
  },
  {
    icon: Sparkles,
    title: "Know what matters today",
    body: "Overdue, due-today and urgent work is surfaced first, with a clear reason why.",
  },
  {
    icon: ClipboardCheck,
    title: "Built for teaching work",
    body: "Categories for lesson planning, corrections, question papers, exams and more.",
  },
  {
    icon: Bell,
    title: "Never miss a deadline",
    body: "Upcoming deadlines stay visible so nothing slips through the week.",
  },
] as const;

const MODULES = [
  { icon: ListChecks, label: "Tasks" },
  { icon: BookOpen, label: "Lessons" },
  { icon: ClipboardCheck, label: "Corrections" },
  { icon: ClipboardList, label: "Question Papers" },
  { icon: CalendarClock, label: "Timetable" },
  { icon: Users, label: "Exam Seating" },
  { icon: LayoutDashboard, label: "Dashboard" },
] as const;

export default function Landing() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">TeacherDesk</span>
        </div>
        <Link
          to="/auth"
          className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 text-center sm:pt-16">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
        >
          <Sparkles className="size-3.5 text-primary" />
          A personal work assistant for teachers
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto max-w-2xl text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl"
        >
          Your teaching day,{" "}
          <span className="bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">
            finally organized
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mx-auto mt-4 max-w-xl text-balance text-base leading-7 text-muted-foreground sm:text-lg"
        >
          TeacherDesk answers one question every morning:{" "}
          <em className="text-foreground">“What needs my attention today?”</em>{" "}
          Track tasks, corrections and deadlines in one calm, focused place.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            to="/auth"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98] sm:w-auto"
          >
            Get started free
            <ArrowRight className="size-4" />
          </Link>
          <button
            onClick={() => navigate("/auth")}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-medium transition-colors hover:bg-secondary sm:w-auto"
          >
            I already have an account
          </button>
        </motion.div>
        <p className="mt-4 text-xs text-muted-foreground">
          Free to start · Works on your phone · Your data stays yours
        </p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05 }}
              className="card-soft card-soft-hover p-6"
            >
              <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <f.icon className="size-5" />
              </span>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-y border-border/60 bg-card/50 py-16">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            Made for the real workflow of teaching
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-muted-foreground">
            Not a school ERP. Not a generic to-do app. TeacherDesk is built around the
            daily rhythm of teachers — from any school, board or subject.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {MODULES.map((m) => (
              <span
                key={m.label}
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-accent px-4 py-2 text-sm text-accent-foreground"
              >
                <m.icon className="size-4" />
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-5 py-20 text-center">
        <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
          Start with tomorrow morning
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-balance text-muted-foreground">
          Sign up, set your subjects and classes once, and let TeacherDesk keep your
          teaching work in order.
        </p>
        <Link
          to="/auth"
          className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25"
        >
          Create your free account
          <ArrowRight className="size-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TeacherDesk
          </p>
          <p className="text-xs text-muted-foreground">
            Built by <span className="font-medium text-foreground/80">THOTA ADVITH</span>
          </p>
        </div>
      </footer>
    </motion.div>
  );
}
