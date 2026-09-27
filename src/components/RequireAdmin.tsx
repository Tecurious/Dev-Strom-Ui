import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/** Gate for /admin: renders children only for an admin role, otherwise
 *  bounces to /ideas — the visitor is already authenticated (this sits
 *  inside RequireAuth), just not authorized, so /login would be wrong.
 *
 *  This is UX only. The real boundary is server-side: every /admin/* call
 *  is independently gated by require_admin, so a non-admin hitting the URL
 *  directly still gets 403s from the API even if this guard were bypassed. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <Navigate to="/ideas" replace />;
  }

  return <>{children}</>;
}
