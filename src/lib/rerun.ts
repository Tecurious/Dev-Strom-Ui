/** sessionStorage key for prior ideas when rerunning from history. */
export const RERUN_PRIORS_KEY = "devstrom.rerunPriors";

export type RerunPrior = { name: string; problem_statement: string };

export function takeRerunPriors(): RerunPrior[] | undefined {
  try {
    const raw = sessionStorage.getItem(RERUN_PRIORS_KEY);
    sessionStorage.removeItem(RERUN_PRIORS_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
    return parsed.filter(
      (p): p is RerunPrior =>
        !!p &&
        typeof p === "object" &&
        typeof (p as RerunPrior).name === "string" &&
        typeof (p as RerunPrior).problem_statement === "string",
    );
  } catch {
    return undefined;
  }
}
