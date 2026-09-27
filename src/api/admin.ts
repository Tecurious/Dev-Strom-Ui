import { apiClient } from "./client";
import type { AdminRequestsResponse, AdminStats, AdminUser, AdminUsersResponse } from "./types";

/** GET /admin/stats — summary counts for the dashboard's stat cards. */
export async function getAdminStats(): Promise<AdminStats> {
  return apiClient.get<AdminStats>("/admin/stats");
}

/** GET /admin/requests — merged idea-run + analysis feed across every user. */
export async function getAdminRequests(
  limit = 50,
  offset = 0,
  kind?: "idea" | "analysis",
): Promise<AdminRequestsResponse> {
  return apiClient.get<AdminRequestsResponse>("/admin/requests", { limit, offset, kind });
}

/** GET /admin/users — every user account, newest first. */
export async function getAdminUsers(limit = 50, offset = 0): Promise<AdminUsersResponse> {
  return apiClient.get<AdminUsersResponse>("/admin/users", { limit, offset });
}

// Each of the four mutations below resolves to a truthy value on success
// (the updated user, or `true`) rather than `void` — useAsyncAction's run()
// resolves to `undefined` on *both* success-with-void and its own caught
// error, so callers need a non-void success value to tell them apart when
// deciding whether to reload a list.

/** PUT /admin/users/{id}/role — grant or revoke admin. */
export async function setUserRole(userId: string, role: "user" | "admin"): Promise<AdminUser> {
  return apiClient.put<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/role`, { role });
}

/** PUT /admin/users/{id}/active — deactivate/reactivate an account. */
export async function setUserActive(userId: string, isActive: boolean): Promise<AdminUser> {
  return apiClient.put<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/active`, { is_active: isActive });
}

/** DELETE /admin/runs/{id} — remove an idea-generation run. */
export async function deleteAdminRun(runId: string): Promise<true> {
  await apiClient.del(`/admin/runs/${encodeURIComponent(runId)}`);
  return true;
}

/** DELETE /admin/analyses/{id} — remove a repo analysis. */
export async function deleteAdminAnalysis(runId: string): Promise<true> {
  await apiClient.del(`/admin/analyses/${encodeURIComponent(runId)}`);
  return true;
}

/** POST /admin/users/{id}/impersonate — view the app as that user. */
export async function startImpersonate(userId: string): Promise<AdminUser> {
  return apiClient.post<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/impersonate`);
}

/** POST /admin/impersonate/stop — restore the admin session. */
export async function stopImpersonate(): Promise<AdminUser> {
  return apiClient.post<AdminUser>("/admin/impersonate/stop");
}
