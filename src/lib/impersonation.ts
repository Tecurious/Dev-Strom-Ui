import { stopImpersonate } from "../api/admin";
import { refreshAuth } from "./auth";

/** Restore the admin session and return to the dashboard. */
export async function endImpersonation(): Promise<void> {
  await stopImpersonate();
  await refreshAuth();
  window.location.assign("/admin");
}
