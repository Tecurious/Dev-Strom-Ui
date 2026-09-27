/** Short label for idea runs — intents can be multi-paragraph essays. */
export function shortRunTitle(techStack: string, fallback = "Run"): string {
  const text = techStack.replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0] ?? text;
  if (firstSentence.length <= 96) return firstSentence;
  return `${firstSentence.slice(0, 93).trimEnd()}…`;
}
