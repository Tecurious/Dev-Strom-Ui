import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useDemoMode } from "../../hooks/useDemoMode";
import { initials } from "../../lib/auth";

export function ProfileBlock({ collapsed }: { collapsed: boolean }) {
  const { user, signOut } = useAuth();
  const { demoMode, forced, setDemoMode } = useDemoMode();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // App routes are gated by RequireAuth, so `user` is always set here.
  const name = user?.name || user?.email || "Account";
  const email = user?.email ?? "";

  return (
    <div className="profile-block" ref={wrapRef}>
      <button
        type="button"
        className="profile-block__trigger"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title={`${name} · ${email}`}
      >
        {user?.avatar_url ? (
          <img className="profile-block__avatar" src={user.avatar_url} alt="" width="30" height="30" />
        ) : (
          <span className="profile-block__avatar">{initials(name)}</span>
        )}
        {!collapsed && (
          <span className="profile-block__id">
            <span className="profile-block__name">{name}</span>
            <span className="profile-block__sub">{email}</span>
          </span>
        )}
      </button>

      {menuOpen && (
        <div className="profile-menu" role="menu">
          <div className="profile-menu__header">
            <span className="profile-block__name">{name}</span>
            <span className="profile-block__sub">{email}</span>
          </div>

          <button
            type="button"
            className="profile-menu__row"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              navigate("/profile");
            }}
          >
            <span>View profile</span>
          </button>

          <button
            type="button"
            className="profile-menu__row"
            role="menuitemcheckbox"
            aria-checked={demoMode}
            onClick={() => !forced && setDemoMode(!demoMode)}
            disabled={forced}
            title={forced ? "Forced on via VITE_DEMO_MODE" : undefined}
          >
            <span>Demo mode</span>
            <span className={"profile-menu__pill" + (demoMode ? " is-on" : "")}>
              {demoMode ? "On" : "Off"}
            </span>
          </button>

          <div className="profile-menu__divider" />

          <button
            type="button"
            className="profile-menu__row"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              void signOut();
            }}
          >
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
