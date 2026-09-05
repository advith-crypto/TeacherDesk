import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-tasks";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

const ONBOARDING_SKIP_KEY = "teacherdesk-onboarding-skipped";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const profile = useProfile();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  // First-run: guide the teacher through profile setup once.
  // profile === undefined means the query is still loading; null means none.
  const skipped =
    typeof window !== "undefined" &&
    window.localStorage.getItem(ONBOARDING_SKIP_KEY) === "1";

  if (
    profile === null &&
    !skipped &&
    location.pathname !== "/onboarding" &&
    location.pathname !== "/settings"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

export function markOnboardingSkipped() {
  try {
    window.localStorage.setItem(ONBOARDING_SKIP_KEY, "1");
  } catch {
    /* private mode etc. — non-critical UI flag */
  }
}
