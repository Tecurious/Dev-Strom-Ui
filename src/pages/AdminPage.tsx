import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  deleteAdminAnalysis,
  deleteAdminRun,
  getAdminRequests,
  getAdminStats,
  getAdminUsers,
  setUserActive,
  setUserRole,
  startImpersonate,
} from "../api/admin";
import type { AdminRequest, AdminUser } from "../api/types";
import { SectionMarker } from "../components/SectionMarker";
import { EmptyState, ErrorState, LoadingState } from "../components/StateBlocks";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { useAsyncData } from "../hooks/useAsyncData";
import { useAuth } from "../hooks/useAuth";
import "./RunDetailPage.css";
import "./AdminPage.css";

const PAGE_SIZE = 50;

export function AdminPage() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [requestPage, setRequestPage] = useState(0);
  const [userPage, setUserPage] = useState(0);
  const [kind, setKind] = useState<"all" | "idea" | "analysis">("all");

  const stats = useAsyncData(getAdminStats, []);
  const requests = useAsyncData(
    () => getAdminRequests(PAGE_SIZE, requestPage * PAGE_SIZE, kind === "all" ? undefined : kind),
    [requestPage, kind],
  );
  const users = useAsyncData(() => getAdminUsers(PAGE_SIZE, userPage * PAGE_SIZE), [userPage]);

  const [, runDeleteRun] = useAsyncAction(deleteAdminRun);
  const [, runDeleteAnalysis] = useAsyncAction(deleteAdminAnalysis);
  const [, runSetRole] = useAsyncAction(setUserRole);
  const [, runSetActive] = useAsyncAction(setUserActive);
  const [, runImpersonate] = useAsyncAction(startImpersonate);

  const handleDelete = async (row: AdminRequest) => {
    const label = row.kind === "idea" ? "idea run" : "analysis";
    if (!window.confirm(`Delete this ${label}? This can't be undone.`)) return;
    const ok = row.kind === "idea" ? await runDeleteRun(row.run_id) : await runDeleteAnalysis(row.run_id);
    if (ok) requests.reload();
  };

  const handleToggleRole = async (u: AdminUser) => {
    const next = u.role === "admin" ? "user" : "admin";
    const verb = next === "admin" ? "Grant" : "Revoke";
    if (!window.confirm(`${verb} admin access for ${u.email}?`)) return;
    const ok = await runSetRole(u.id, next);
    if (ok) users.reload();
  };

  const handleToggleActive = async (u: AdminUser) => {
    const verb = u.is_active ? "Deactivate" : "Reactivate";
    if (!window.confirm(`${verb} ${u.email}?`)) return;
    const ok = await runSetActive(u.id, !u.is_active);
    if (ok) users.reload();
  };

  const handleImpersonate = async (u: AdminUser) => {
    if (
      !window.confirm(
        `View the app as ${u.email}?\n\nYou'll leave Admin and use their account. Use “Back to admin” on the orange banner (or the profile menu) to return.`,
      )
    ) {
      return;
    }
    const ok = await runImpersonate(u.id);
    if (ok) {
      // Full navigation so Admin unmounts and we land in their app view.
      window.location.assign("/ideas");
    }
  };

  const requestHref = (row: AdminRequest) =>
    row.kind === "idea" ? `/history/${encodeURIComponent(row.run_id)}` : `/analysis/${encodeURIComponent(row.run_id)}`;

  return (
    <div className="admin-page">
      <button type="button" onClick={() => navigate(-1)} className="run-detail-page__back mono-label">
        &larr; Back
      </button>
      <SectionMarker label="Admin" />
      <h1 className="admin-page__title">Dashboard</h1>
      <p className="admin-page__lede">Pulse, every request, and people — same paper ledger as the rest of Dev-Strom.</p>

      {stats.status === "loading" && <LoadingState label="Loading stats" />}
      {stats.status === "error" && <ErrorState message={stats.error} onRetry={stats.reload} />}
      {stats.status === "success" && (
        <div className="admin-stats">
          <div className="admin-stat">
            <span className="mono-label">Total users</span>
            <p className="admin-stat__value">{stats.data.total_users}</p>
          </div>
          <div className="admin-stat">
            <span className="mono-label">Idea runs today</span>
            <p className="admin-stat__value">{stats.data.runs_today}</p>
          </div>
          <div className="admin-stat">
            <span className="mono-label">Analyses today</span>
            <p className="admin-stat__value">{stats.data.analyses_today}</p>
          </div>
          <div className="admin-stat">
            <span className="mono-label">Jobs pending / running</span>
            <p className="admin-stat__value">
              {stats.data.jobs_pending} / {stats.data.jobs_running}
            </p>
          </div>
          <div className="admin-stat">
            <span className="mono-label">Jobs failed</span>
            <p className="admin-stat__value">{stats.data.jobs_failed}</p>
          </div>
        </div>
      )}

      <section className="admin-panel" aria-labelledby="admin-requests-heading">
        <div className="admin-panel__head">
          <h2 id="admin-requests-heading" className="admin-panel__title">
            All requests
          </h2>
          <div className="admin-panel__filters" role="group" aria-label="Filter by kind">
            {(["all", "idea", "analysis"] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={"admin-filter" + (kind === k ? " is-active" : "")}
                onClick={() => {
                  setKind(k);
                  setRequestPage(0);
                }}
              >
                {k === "all" ? "All" : k === "idea" ? "Ideas" : "Analyses"}
              </button>
            ))}
          </div>
        </div>
        {requests.status === "loading" && (
          <div className="admin-panel__empty">
            <LoadingState label="Loading requests" />
          </div>
        )}
        {requests.status === "error" && (
          <div className="admin-panel__empty">
            <ErrorState message={requests.error} onRetry={requests.reload} />
          </div>
        )}
        {requests.status === "success" && requests.data.requests.length === 0 && (
          <div className="admin-panel__empty">
            <EmptyState message="No requests yet." />
          </div>
        )}
        {requests.status === "success" && requests.data.requests.length > 0 && (
          <>
            <div className="admin-panel__body">
              <table className="admin-table admin-table--requests">
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">Kind</th>
                    <th scope="col">Summary</th>
                    <th scope="col">Created</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.data.requests.map((r) => (
                    <tr key={`${r.kind}-${r.run_id}`}>
                      <td title={r.email ?? undefined}>{r.email ?? "—"}</td>
                      <td>{r.kind}</td>
                      <td className="admin-table__summary">
                        <Link
                          to={requestHref(r)}
                          className="admin-table__link"
                          title={r.summary ?? r.run_id}
                        >
                          {r.summary ?? r.run_id}
                        </Link>
                      </td>
                      <td>{new Date(r.created_at).toLocaleString()}</td>
                      <td className="admin-table__actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDelete(r)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-panel__foot">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={requestPage === 0}
                onClick={() => setRequestPage((p) => p - 1)}
              >
                &larr; Newer
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={requests.data.requests.length < PAGE_SIZE}
                onClick={() => setRequestPage((p) => p + 1)}
              >
                Older &rarr;
              </button>
            </div>
          </>
        )}
      </section>

      <section className="admin-panel" aria-labelledby="admin-people-heading">
        <div className="admin-panel__head">
          <h2 id="admin-people-heading" className="admin-panel__title">
            People
          </h2>
        </div>
        {users.status === "loading" && (
          <div className="admin-panel__empty">
            <LoadingState label="Loading users" />
          </div>
        )}
        {users.status === "error" && (
          <div className="admin-panel__empty">
            <ErrorState message={users.error} onRetry={users.reload} />
          </div>
        )}
        {users.status === "success" && (
          <>
            <div className="admin-panel__body">
              <table className="admin-table admin-table--people">
                <thead>
                  <tr>
                    <th scope="col">Email</th>
                    <th scope="col">Name</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Joined</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.data.users.map((u) => {
                    const isSelf = u.id === me?.id;
                    return (
                      <tr key={u.id}>
                        <td title={u.email}>{u.email}</td>
                        <td title={u.name ?? undefined}>{u.name ?? "—"}</td>
                        <td>{u.role}</td>
                        <td>{u.is_active ? "Active" : "Deactivated"}</td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="admin-table__actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleToggleRole(u)}
                            title={
                              isSelf && u.role === "admin"
                                ? "Revoking the last admin's own role is blocked server-side"
                                : undefined
                            }
                          >
                            {u.role === "admin" ? "Revoke admin" : "Make admin"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleToggleActive(u)}
                            disabled={isSelf}
                            title={isSelf ? "You can't deactivate your own account" : undefined}
                          >
                            {u.is_active ? "Deactivate" : "Reactivate"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleImpersonate(u)}
                            disabled={isSelf || u.role === "admin" || !u.is_active}
                            title={
                              isSelf
                                ? "Already you"
                                : u.role === "admin"
                                  ? "Cannot view as another admin"
                                  : !u.is_active
                                    ? "Account is deactivated"
                                    : "View the app as this user"
                            }
                          >
                            View as
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="admin-panel__foot">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={userPage === 0}
                onClick={() => setUserPage((p) => p - 1)}
              >
                &larr; Newer
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={users.data.users.length < PAGE_SIZE}
                onClick={() => setUserPage((p) => p + 1)}
              >
                Older &rarr;
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
