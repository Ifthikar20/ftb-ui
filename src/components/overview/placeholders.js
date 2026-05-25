// Placeholder data for the Peec-style overview composition. Real endpoints
// can replace these by passing props into the cards; until then the cards
// render representative data so the layout is fully populated.

export function fallbackBrands(activeName) {
  return [
    { rank: 1, name: activeName || 'Your Brand', visibility: 65, sov: 95, sentiment: 58, position: 6.7 },
    { rank: 2, name: 'Northwind', visibility: 6, sov: 2, sentiment: 61, position: 4.1 },
    { rank: 3, name: 'Acme Corp', visibility: 3, sov: 1, sentiment: 63, position: 4.3 },
    { rank: 4, name: 'Globex', visibility: 3, sov: 1, sentiment: 62, position: 5.8 },
    { rank: 5, name: 'Initech', visibility: 3, sov: 1, sentiment: 63, position: 3.6 },
    { rank: 6, name: 'Umbrella', visibility: 3, sov: 1, sentiment: 62, position: 4.1 },
    { rank: 7, name: 'Soylent', visibility: 2, sov: 0, sentiment: 60, position: 5.3 },
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
