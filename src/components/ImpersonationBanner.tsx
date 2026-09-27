import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { endImpersonation } from "../lib/impersonation";
import "../pages/AdminPage.css";

/** Persistent strip while an admin is viewing the app as another user. */
export function ImpersonationBanner() {
  const { user } = useAuth();
  const admin = user?.impersonator;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user || !admin) return null;

  const stop = async () => {
    setBusy(true);
    setError(null);
    try {
      await endImpersonation();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Could not return to admin.");
    }
  };

  return (
    <div className="admin-impersonation-banner" role="status">
      <p className="admin-impersonation-banner__text">
        Viewing as <strong>{user.email}</strong>
        <span className="mono-label"> · return via this banner (not anonymous mode)</span>
        {error ? <span className="mono-label"> · {error}</span> : null}
      </p>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={busy}
        onClick={() => void stop()}
      >
        {busy ? "Returning…" : "Back to admin"}
      </button>
    </div>
  );
}
