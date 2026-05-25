// Placeholder data for the Peec-style overview composition. Real endpoints
// can replace these by passing props into the cards; until then the cards
// render representative data so the layout is fully populated.

export const AVATAR_COLORS = ['#FF385C', '#00A699', '#FC642D', '#484848', '#767676', '#008489', '#5B8DEF']

export function fallbackBrands(activeName) {
  return [
    { rank: 1, name: activeName || 'Your Brand', category: 'Your brand', visibility: 65, sov: 95, sentiment: 58, position: 6.7, trend: 14.2, up: true },
    { rank: 2, name: 'Northwind', category: 'Competitor', visibility: 6, sov: 2, sentiment: 61, position: 4.1, trend: 8.1, up: true },
    { rank: 3, name: 'Acme Corp', category: 'Competitor', visibility: 3, sov: 1, sentiment: 63, position: 4.3, trend: 5.3, up: true },
    { rank: 4, name: 'Globex', category: 'Competitor', visibility: 3, sov: 1, sentiment: 62, position: 5.8, trend: 2.6, up: true },
    { rank: 5, name: 'Initech', category: 'Competitor', visibility: 3, sov: 1, sentiment: 63, position: 3.6, trend: 1.1, up: true },
    { rank: 6, name: 'Umbrella', category: 'Competitor', visibility: 3, sov: 1, sentiment: 62, position: 4.1, trend: 1.2, up: false },
    { rank: 7, name: 'Soylent', category: 'Competitor', visibility: 2, sov: 0, sentiment: 60, position: 5.3, trend: 3.4, up: false },
  ]
}

export function fallbackDomains() {
  return [
    { domain: 'highradius.com', retrieved: 33.8, citation: 0.5, type: 'Corporate' },
    { domain: 'reddit.com', retrieved: 30.0, citation: 1.7, type: 'UGC' },
    { domain: 'linkedin.com', retrieved: 24.1, citation: 0.3, type: 'UGC' },
    { domain: 'youtube.com', retrieved: 22.1, citation: 0.0, type: 'UGC' },
    { domain: 'g2.com', retrieved: 18.4, citation: 0.9, type: 'Reference' },
    { domain: 'forbes.com', retrieved: 12.7, citation: 0.4, type: 'Reference' },
  ]
}

export function fallbackDomainTypes() {
  return {
    total: '10.3k',
    types: [
      { label: 'Corporate', pct: 63, color: 'var(--chart-1)' },
      { label: 'UGC', pct: 15, color: 'var(--chart-2)' },
      { label: 'Reference', pct: 6, color: 'var(--chart-4)' },
      { label: 'Other', pct: 6, color: 'var(--chart-3)' },
    ],
  }
}
