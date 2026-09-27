import { apiClient } from "./client";
import type { Analysis, AnalysisHistoryResponse, AnalyzeRequest } from "./types";

/**
 * POST /analyze — deterministic ingestion + evidence-first analysis of a repo.
 * Returns the unified Analysis domain object that powers the Repository
 * Intelligence view. Async variant (?async=true -> job polling) is deferred to
 * the caller; this is the synchronous path.
 */
export async function postAnalyze(body: AnalyzeRequest): Promise<Analysis> {
  return apiClient.post<Analysis>("/analyze", body);
}

/** GET /analyze/{run_id} — reload a previously computed Analysis (e.g. from History). */
export async function getAnalysis(runId: string): Promise<Analysis> {
  return apiClient.get<Analysis>(`/analyze/${encodeURIComponent(runId)}`);
}

/**
 * GET /analyses — list past repository analyses for the History page.
 * Optional backend feature: callers should degrade gracefully (hide the
 * section) if the endpoint isn't available yet.
 */
export async function getAnalyses(limit = 20, offset = 0): Promise<AnalysisHistoryResponse> {
  return apiClient.get<AnalysisHistoryResponse>("/analyses", { limit, offset });
}
