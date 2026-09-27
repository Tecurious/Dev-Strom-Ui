import { useNavigate, useParams } from "react-router-dom";
import { getRun } from "../api/history";
import { IdeaCard } from "../components/IdeaCard";
import { SectionMarker } from "../components/SectionMarker";
import { EmptyState, ErrorState, LoadingState } from "../components/StateBlocks";
import { useAsyncData } from "../hooks/useAsyncData";
import { RERUN_PRIORS_KEY } from "../lib/rerun";
import { shortRunTitle } from "../lib/runTitle";
import "./RunDetailPage.css";

export function RunDetailPage() {
  const { runId = "" } = useParams();
  const navigate = useNavigate();
  const state = useAsyncData(() => getRun(runId), [runId]);
  const ideas = state.status === "success" && Array.isArray(state.data.ideas) ? state.data.ideas : [];

  const goIdeas = (mode: "fresh" | "more") => {
    if (state.status !== "success") return;
    const intent = state.data.tech_stack;
    if (mode === "more" && ideas.length > 0) {
      sessionStorage.setItem(
        RERUN_PRIORS_KEY,
        JSON.stringify(
          ideas.map((idea) => ({
            name: idea.name,
            problem_statement: idea.problem_statement,
          })),
        ),
      );
    } else {
      sessionStorage.removeItem(RERUN_PRIORS_KEY);
    }
    const q = new URLSearchParams({
      intent,
      autostart: mode === "more" ? "more" : "1",
    });
    navigate(`/ideas?${q.toString()}`);
  };

  return (
    <div className="run-detail-page">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="run-detail-page__back mono-label"
      >
        &larr; Back
      </button>
      <SectionMarker label="Run Detail" />
      <h1 className="run-detail-page__title">
        {state.status === "success" ? shortRunTitle(state.data.tech_stack, runId) : runId}
      </h1>

      {state.status === "success" && (
        <div className="run-detail-page__actions">
          <button type="button" className="btn btn-primary" onClick={() => goIdeas("fresh")}>
            Rerun
          </button>
          {ideas.length > 0 && (
            <button type="button" className="btn btn-secondary" onClick={() => goIdeas("more")}>
              Generate more from this
            </button>
          )}
        </div>
      )}

      {state.status === "loading" && <LoadingState label="Loading run" />}
      {state.status === "error" && <ErrorState message={state.error} onRetry={state.reload} />}

      {state.status === "success" && (
        <>
          <div className="card run-detail-page__meta">
            <div className="run-detail-page__intent">
              <span className="mono-label">Intent</span>
              <p>{state.data.tech_stack}</p>
            </div>
            <div>
              <span className="mono-label">Created</span>
              <p>{new Date(state.data.created_at).toLocaleString()}</p>
            </div>
          </div>

          {ideas.length > 0 ? (
            <div className="ideas-grid">
              {ideas.map((idea) => (
                <IdeaCard key={idea.pid} idea={idea} runId={runId} />
              ))}
            </div>
          ) : (
            <EmptyState message="No ideas were saved for this run." />
          )}
        </>
      )}
    </div>
  );
}
