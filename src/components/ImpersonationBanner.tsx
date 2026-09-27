import { stopImpersonate } from "../api/admin";
import { useAuth } from "../hooks/useAuth";
import { refreshAuth } from "../lib/auth";
import "../pages/AdminPage.css";

/** Persistent strip while an admin is viewing the app as another user. */
export function ImpersonationBanner() {
  const { user } = useAuth();
  const admin = user?.impersonator;
  if (!user || !admin) return null;

  const stop = async () => {
    try {
      await stopImpersonate();
    } finally {
      await refreshAuth();
      window.location.assign("/admin");
    }
  };

  return (
    <div className="admin-impersonation-banner" role="status">
      <p className="admin-impersonation-banner__text">
        Viewing as <strong>{user.email}</strong>
        <span className="mono-label"> · signed in as {admin.email}</span>
      </p>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void stop()}>
        Stop viewing as
      </button>
    </div>
  );
}
