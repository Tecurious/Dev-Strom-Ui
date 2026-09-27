import { ApiError, apiClient } from "./client";
import { subscribeJob } from "./jobs";
import type {
  ExpandRequest,
  ExpandResponse,
  ExportRequest,
  IdeasRequest,
  IdeasResponse,
  JobAcceptedResponse,
} from "./types";

/**
 * Generate ideas via the async job pipeline: POST /ideas?async=true → 202
 * {job_id, status}, then stream GET /jobs/{job_id}/events (SSE) until the
 * terminal `done` event carries the {ideas, run_id} result. This avoids the
 * long-held sync request that upstream proxies (Cloudflare Tunnel) kill with
 * 524s.
 *
 * Falls back to the synchronous call in exactly one case: the scheduling POST
 * itself returned 503, the backend's signal that the job runner is
 * unavailable and no job was created. Every other failure is surfaced. That
 * asymmetry is deliberate — once the scheduling request has left, a job may
 * already be running and burning an LLM call, and a blanket fallback would
 * quietly run the whole pipeline (and pay for it) a second time.
 */
export async function postIdeas(body: IdeasRequest): Promise<IdeasResponse> {
  let accepted: JobAcceptedResponse | undefined;
  try {
    accepted = await apiClient.post<JobAcceptedResponse>("/ideas", body, {
      query: { async: true },
    });
  } catch (err) {
    // 503 is the one unambiguous "no job was created" signal, so the sync
    // path is safe. A network error (ApiError status 0) is NOT: the request
    // may well have reached the server and started a job, and we must not
    // run the pipeline twice on a guess.
    if (err instanceof ApiError && err.status === 503) {
      return apiClient.post<IdeasResponse>("/ideas", body);
    }
    throw err;
  }
  if (!accepted?.job_id) {
    throw new ApiError(502, "Job was scheduled but no job id came back.");
  }
  // Deliberately outside the try: a stream failure is a real job/pipeline
  // error and must never re-enter the fallback.
  return subscribeJob<IdeasResponse>(accepted.job_id);
}

export async function postExpand(body: ExpandRequest): Promise<ExpandResponse> {
  return apiClient.post<ExpandResponse>("/expand", body);
}

export async function postExport(body: ExportRequest): Promise<string> {
  return apiClient.postText("/export", body);
}
