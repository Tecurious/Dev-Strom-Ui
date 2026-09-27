import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/** Gate for /admin: only the admin's own session.
 *
 *  While "viewing as" another user, bounce to /ideas — the point of
 *  impersonation is to see the app as they do, not keep the dashboard.
 *  Return via the banner / profile "Back to admin".
 *
 *  UX only. Server-side require_admin still allows the impersonator for
 *  stop-impersonate and break-glass; the UI simply doesn't show the dash.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (user?.impersonator) {
    return <Navigate to="/ideas" replace />;
  }
  if (user?.role !== "admin") {
    return <Navigate to="/ideas" replace />;
  }

  return <>{children}</>;
}
