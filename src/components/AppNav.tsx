import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  CalendarClock,
  LayoutDashboard,
  ListChecks,
  Plus,
  Settings as SettingsIcon,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { CreateTaskDialog } from "./TaskFormDialog";

type NavItem = {
  to: string;
  label: string;
  short: string;
  icon: typeof LayoutDashboard;
  primary?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard, primary: true },
  { to: "/tasks", label: "Tasks", short: "Tasks", icon: ListChecks, primary: true },
  { to: "/lessons", label: "Lessons", short: "Lessons", icon: BookOpen },
  { to: "/corrections", label: "Corrections", short: "Fixes", icon: ClipboardCheck },
  { to: "/question-papers", label: "Question Papers", short: "Papers", icon: ClipboardList },
  { to: "/timetable", label: "Timetable", short: "Time", icon: CalendarClock },
  { to: "/exam-seating", label: "Exam Seating", short: "Exams", icon: ClipboardList },
  { to: "/settings", label: "Settings", short: "More", icon: SettingsIcon, primary: true },
];

const MOBILE_PRIMARY = NAV_ITEMS.filter((i) => i.primary);

/** Mobile bottom navigation with a floating quick-add action. */
export function MobileNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {MOBILE_PRIMARY.slice(0, 2).map((item) => (
            <NavItemButton key={item.to} item={item} />
          ))}
          <div className="flex items-center justify-center">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setQuickOpen(true)}
              aria-label="Quick add task"
              className="-mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
            >
              <Plus className="size-6" />
            </motion.button>
          </div>
          {MOBILE_PRIMARY.slice(2).map((item) => (
            <NavItemButton key={item.to} item={item} />
          ))}
        </div>
      </nav>

      <CreateTaskDialog
        open={quickOpen}
        onOpenChange={setQuickOpen}
        onCreated={() => navigate("/tasks")}
      />
      {/* keep user referenced for future avatar menu */}
      <span className="hidden">{user?.name}</span>
    </>
  );
}

function NavItemButton({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-2 py-2 text-[11px] font-medium",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
        )
      }
      aria-label={item.label}
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-colors",
              isActive && "bg-accent",
            )}
          >
            <item.icon className="size-5" />
          </span>
          {item.short}
        </>
      )}
    </NavLink>
  );
}

/** Desktop/tablet sidebar navigation (secondary layout). */
export function DesktopNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/60 bg-card/50 px-4 py-6 md:flex">
      <NavLink to="/dashboard" className="mb-8 flex items-center gap-2 px-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <LayoutDashboard className="size-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight">TeacherDesk</span>
      </NavLink>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )
            }
          >
            <item.icon className="size-4.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <p className="px-3 text-[11px] leading-4 text-muted-foreground">
        Built by THOTA ADVITH
      </p>
    </aside>
  );
}

/** Route transition helper shared by pages. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
