import { useNavigate } from "react-router-dom";
import { SectionMarker } from "../components/SectionMarker";
import { useAuth } from "../hooks/useAuth";
import { initials } from "../lib/auth";
import "./RunDetailPage.css"; // shared .run-detail-page__back link style
import "./ProfilePage.css";

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  mock: "Email",
  system: "None (local dev)",
};

export function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth(); // non-null: RequireAuth already gated this route
  if (!user) return null;

  const name = user.name || user.email;

  return (
    <div className="profile-page">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="run-detail-page__back mono-label"
      >
        &larr; Back
      </button>
      <SectionMarker label="Profile" />
      <h1 className="profile-page__title">Your account</h1>

      <div className="card profile-page__card">
        {user.avatar_url ? (
          <img className="profile-page__avatar" src={user.avatar_url} alt="" width="64" height="64" />
        ) : (
          <span className="profile-page__avatar">{initials(name)}</span>
        )}
        <div className="profile-page__fields">
          <div>
            <span className="mono-label">Name</span>
            <p>{name}</p>
          </div>
          <div>
            <span className="mono-label">Email</span>
            <p>{user.email}</p>
          </div>
          <div>
            <span className="mono-label">Sign-in provider</span>
            <p>{PROVIDER_LABEL[user.auth_provider] ?? user.auth_provider}</p>
          </div>
          {user.created_at && (
            <div>
              <span className="mono-label">Member since</span>
              <p>{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
