import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isAdminActor } from "../lib/auth";

/** Gate for /admin: renders children for an admin, or while an admin is
 *  viewing as another user (so they can open the dashboard / exit).
 *  Otherwise bounces to /ideas — already authenticated (inside RequireAuth),
 *  so /login would be wrong.
 *
 *  UX only. Server-side require_admin is the real boundary. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (!isAdminActor(user)) {
    return <Navigate to="/ideas" replace />;
  }

  return <>{children}</>;
}
