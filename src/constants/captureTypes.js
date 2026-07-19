// Capture types shown on the Brand Security findings page.
//
// The backend classifies every finding with a fine-grained `issue` code;
// the UI groups those codes into a handful of capture types a brand owner
// can act on without knowing the detection internals. `issues` is the set
// of backend codes each type covers — used both to label a finding and to
// build the `issue` filter param when a type chip is selected.
export const CAPTURE_TYPES = [
  {
    key: 'narrative',
    label: 'Narrative watch',
    blurb: 'A storyline forming around your brand across posts and discussions',
    issues: ['emerging_narrative'],
    badgeClass: 'bg-violet-50 text-violet-700',
  },
  {
    key: 'sentiment',
    label: 'Sentiment issue',
    blurb: 'Negative tone in mentions of your brand',
    issues: ['sentiment_drop', 'negative'],
    badgeClass: 'bg-amber-50 text-amber-800',
  },
  {
    key: 'claim',
    label: 'Inaccurate claim',
    blurb: 'A wrong, unverified or outdated statement about your brand, checked against your Brand Input material',
    issues: ['hallucination', 'unverified', 'outdated'],
    badgeClass: 'bg-red-50 text-red-700',
  },
  {
    key: 'harmful',
    label: 'Harmful mention',
    blurb: 'Your brand mentioned in a damaging context',
    issues: ['harmful'],
    badgeClass: 'bg-rose-50 text-rose-700',
  },
  {
    key: 'lookalike',
    label: 'Look-alike brand',
    blurb: 'A brand or site that could be mistaken for yours',
    issues: ['impersonation'],
    badgeClass: 'bg-orange-50 text-orange-800',
  },
  {
    key: 'search',
    label: 'Search visibility',
    blurb: 'What search results and AI overviews show for keywords about your brand',
    issues: ['negative_outranking', 'ranking_for_bad_query', 'sge_misrepresentation'],
    badgeClass: 'bg-sky-50 text-sky-700',
  },
]

const FALLBACK = {
  key: 'mention',
  label: 'Brand mention',
  blurb: 'Your brand was mentioned somewhere we monitor',
  issues: [],
  badgeClass: 'bg-slate-100 text-slate-700',
}

const BY_ISSUE = new Map(
  CAPTURE_TYPES.flatMap((t) => t.issues.map((issue) => [issue, t])),
)

export function captureTypeForIssue(issue) {
  return BY_ISSUE.get(issue) || FALLBACK
}

// Friendly labels for where a finding was captured.
export const SOURCE_LABELS = {
  llm: 'LLM answer',
  serp: 'Search results',
  reddit: 'Reddit',
  x: 'X',
  trends: 'Google Trends',
  web: 'Web',
}

export function sourceLabel(source) {
  return SOURCE_LABELS[source] || (source ? source.toUpperCase() : '-')
}
