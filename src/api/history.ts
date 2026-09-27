import { apiClient } from "./client";
import type { HistoryResponse, RunDetail } from "./types";

export async function getHistory(limit = 20, offset = 0): Promise<HistoryResponse> {
  return apiClient.get<HistoryResponse>("/history", { limit, offset });
}

export async function getRun(runId: string): Promise<RunDetail> {
  return apiClient.get<RunDetail>(`/runs/${encodeURIComponent(runId)}`);
}
