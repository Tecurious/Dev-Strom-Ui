function plainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function normalizedDiagnostic(diagnostic) {
  return {
    code: String(diagnostic?.code || 'internal/unclassified'),
    severity: diagnostic?.severity === 'warning' ? 'warning' : 'error',
    message: String(diagnostic?.message || 'The renderer could not classify this failure.').trim(),
    subject: plainObject(diagnostic?.subject),
    evidence: plainObject(diagnostic?.evidence),
    supportedFixes: Array.isArray(diagnostic?.supportedFixes)
      ? [...new Set(diagnostic.supportedFixes.map((fix) => String(fix).trim()).filter(Boolean))]
      : [],
  };
}

// Upstream records advisory diagnostics for its CLI receipt; the browser
// build only surfaces them through thrown errors and render warnings.
export function recordDiagnostic() {}

export function throwDiagnosticError(message, diagnostics) {
  const error = new Error(message);
  error.diagnostics = (diagnostics || []).map(normalizedDiagnostic);
  throw error;
}

export function throwDiagnosticProblems(prefix, problems, { code = 'layout/constraint', subject = {} } = {}) {
  const messages = (problems || []).map((problem) => String(problem));
  const diagnostics = messages.map((message) => ({ code, severity: 'error', message, subject }));
  throwDiagnosticError(`${prefix}:\n- ${messages.join('\n- ')}`, diagnostics);
}
