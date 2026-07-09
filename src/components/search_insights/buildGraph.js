/**
 * Pure scan-detail -> vue-flow {nodes, edges} transform for the Search
 * Insights pathway graph.
 *
 * Columns, left to right:
 *   query -> sources (SERP results) -> brands (share of voice) -> leaves
 * Opportunity nodes ("your brand is absent here, chip in") hang directly
 * below their source node so the pathway reads query -> thread -> action.
 */

const X_QUERY = 0
const X_SOURCE = 320
const X_BRAND = 680
const X_LEAF = 1010

const MAX_BRANDS = 10
const MAX_ISSUE_LEAVES = 2

export function sentimentColor(s) {
  if (s > 0.25) return 'var(--chart-2)'
  if (s < -0.25) return 'var(--destructive)'
  return 'var(--muted-foreground)'
}

function brandKey(name) {
  return (name || '').trim().toLowerCase()
}

export function buildGraph(scan) {
  const nodes = []
  const edges = []
  if (!scan) return { nodes, edges }

  const running = scan.status === 'pending' || scan.status === 'running'
  const rows = (scan.rows || []).filter((r) => r.relevant !== false)
  const opportunities = scan.opportunities || []
  const oppByRank = new Map(opportunities.map((o) => [o.rank, o]))

  // -- Brand column (from the scan-level rollup) ------------------------------
  const brands = (scan.brands || []).slice(0, MAX_BRANDS)
  const maxScore = Math.max(...brands.map((b) => b.weighted_score || 0), 0.0001)

  let brandY = 0
  const brandLayouts = []
  for (const brand of brands) {
    // Only real issues as leaves. Quotes used to sit as a terminal
    // node too but that turned every path into a dead-end quote; the
    // quote still lives in the right-hand detail panel where it has
    // context.
    const leaves = (brand.issues || [])
      .slice(0, MAX_ISSUE_LEAVES)
      .map((text) => ({ kind: 'issue', text }))
    const slot = Math.max(104, leaves.length * 84)
    brandLayouts.push({ brand, leaves, y: brandY + slot / 2, slot })
    brandY += slot
  }

  // -- Source column -----------------------------------------------------------
  // Opportunity is now a badge inside the source node, not a separate
  // graph node, so every source slot is the same fixed height.
  let sourceY = 0
  const sourceLayouts = []
  for (const row of rows) {
    const opp = oppByRank.get(row.rank)
    const slot = 116
    sourceLayouts.push({ row, opp, y: sourceY + slot / 2, slot })
    sourceY += slot
  }

  // Center the shorter column against the taller one.
  const totalHeight = Math.max(brandY, sourceY, 1)
  const brandOffset = (totalHeight - brandY) / 2
  const sourceOffset = (totalHeight - sourceY) / 2

  // -- Query node ----------------------------------------------------------------
  nodes.push({
    id: 'query',
    type: 'query',
    position: { x: X_QUERY, y: totalHeight / 2 - 32 },
    data: { label: scan.query, running },
  })

  // -- Source nodes + edges from query ---------------------------------------
  for (const { row, opp, y } of sourceLayouts) {
    const id = `source-${row.rank}`
    // Opportunity info rides on the source node itself now — the node
    // shows a small "Post here" tag when opp is present, and the
    // detail panel renders the reason + CTA when the source is clicked.
    nodes.push({
      id,
      type: 'source',
      position: { x: X_SOURCE, y: y + sourceOffset - 34 },
      data: { row, isOpportunity: Boolean(opp), opportunity: opp || null },
    })
    edges.push({
      id: `e-query-${id}`,
      source: 'query',
      target: id,
      animated: running,
      style: { stroke: 'var(--border)', strokeWidth: 0.9, opacity: 0.55 },
    })
  }

  // -- Brand nodes, leaves, and source->brand edges ---------------------------
  for (const { brand, leaves, y } of brandLayouts) {
    const id = `brand-${brandKey(brand.name)}`
    const size = 48 + Math.round(44 * ((brand.weighted_score || 0) / maxScore))
    nodes.push({
      id,
      type: 'brand',
      position: { x: X_BRAND, y: y + brandOffset - size / 2 },
      data: { brand, size, color: sentimentColor(brand.sentiment || 0) },
    })

    leaves.forEach((leaf, i) => {
      const leafId = `${id}-leaf-${i}`
      nodes.push({
        id: leafId,
        type: 'leaf',
        position: {
          x: X_LEAF,
          y: y + brandOffset - (leaves.length * 84) / 2 + i * 84,
        },
        // Carry the parent brand name so the leaf detail panel can
        // find engageable sources that discuss this brand and offer
        // "chip in here" links, instead of just dead-ending on the
        // negative framing.
        data: { ...leaf, brand: brand.name },
      })
      edges.push({
        id: `e-${id}-${leafId}`,
        source: id,
        target: leafId,
        style: {
          stroke: leaf.kind === 'issue' ? 'var(--destructive)' : 'var(--border)',
          strokeWidth: 0.8,
          opacity: 0.4,
        },
      })
    })

    // Connect each source that actually mentions this brand. One edge
    // per (source, brand) pair — Vue Flow routes them into the brand's
    // left handle so a brand referenced by many sources gets a natural
    // fan of thin lines converging to a single node.
    for (const { row } of sourceLayouts) {
      const rowBrand = (row.brands || []).find(
        (b) => brandKey(b.name) === brandKey(brand.name),
      )
      if (!rowBrand) continue
      edges.push({
        id: `e-source-${row.rank}-${id}`,
        source: `source-${row.rank}`,
        target: id,
        animated: running,
        style: {
          // Weight modulates thickness gently. Cap ~1.4 px so even the
          // most-cited brand doesn't dominate the canvas visually.
          stroke: sentimentColor(rowBrand.sentiment || 0),
          strokeWidth: 0.7 + 0.7 * Math.min(rowBrand.weight || 0, 1),
          opacity: 0.42,
        },
      })
    }
  }

  return { nodes, edges }
}
