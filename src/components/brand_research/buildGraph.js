/**
 * Pure scan-detail -> vue-flow {nodes, edges} transform for the Brand
 * Research graph.
 *
 * Columns, left to right:
 *
 *   query -> channels -> brands -> issues -> chip-in
 *
 * The channel column is three labelled lanes stacked vertically, because a
 * brand can be recommended by three different kinds of thing and conflating
 * them loses the point:
 *
 *   AI engines  what ChatGPT/Claude/Perplexity actually answer
 *   Community   Reddit and forum threads, where real people argue
 *   Web         articles, guides, reviews that rank
 *
 * The graph ends on the chip-in column rather than on a complaint, so the
 * last thing the user reads is somewhere they can act.
 */

const X_QUERY = 0
const X_CHANNEL = 300
const X_BRAND = 720
const X_ISSUE = 1040
const X_ACTION = 1360

const MAX_BRANDS = 10
const MAX_ISSUE_LEAVES = 2
const MAX_ACTIONS = 6

// Never draw more placeholders than a screen can hold; past a handful they
// stop reading as "loading" and start reading as clutter.
const SKELETON_CAP = 4

// Vertical slots. Engine cards are shorter than source cards.
const SLOT_SOURCE = 116
const SLOT_ENGINE = 92
const SLOT_ACTION = 104
const LANE_HEADER_H = 38
const LANE_GAP = 26

export function sentimentColor(s) {
  if (s > 0.25) return 'var(--chart-2)'
  if (s < -0.25) return 'var(--destructive)'
  return 'var(--muted-foreground)'
}

function brandKey(name) {
  return (name || '').trim().toLowerCase()
}

// A lane is "working" when its backend stage has not settled. Scans that
// predate the stages field send {}, in which case we fall back to the
// scan-level status so old scans still render sensibly.
function laneStatus(scan, key) {
  const stages = scan?.stages || {}
  const entry = stages[key]
  if (entry && entry.status) return entry.status
  return ['pending', 'running'].includes(scan?.status) ? 'running' : 'complete'
}

function isWorking(status) {
  return status === 'pending' || status === 'running'
}

/** Rows belong to the community lane when discovery says so, or when the
 *  source class has a reply surface. The second clause keeps scans that
 *  predate the discovery field from dumping everything into Web. */
const COMMUNITY_CLASSES = new Set(['reddit', 'forum', 'quora', 'youtube', 'stackoverflow'])

function laneOf(row) {
  const lane = row?.platform_meta?.lane
  if (lane === 'community' || lane === 'web') return lane
  return COMMUNITY_CLASSES.has(row?.source_class) ? 'community' : 'web'
}

export function buildGraph(scan) {
  const nodes = []
  const edges = []
  if (!scan) return { nodes, edges }

  const running = scan.status === 'pending' || scan.status === 'running'
  const rows = (scan.rows || []).filter((r) => r.relevant !== false)
  const engines = scan.engines || []
  const opportunities = (scan.opportunities || []).slice(0, MAX_ACTIONS)
  const oppByRank = new Map(
    (scan.opportunities || []).filter((o) => o.rank != null).map((o) => [o.rank, o]),
  )

  const engineStage = laneStatus(scan, 'engines')
  const communityStage = laneStatus(scan, 'community')
  const webStage = laneStatus(scan, 'web')
  const analysisStage = laneStatus(scan, 'analysis')

  const communityRows = rows.filter((r) => laneOf(r) === 'community')
  const webRows = rows.filter((r) => laneOf(r) === 'web')

  // -- Brand column -----------------------------------------------------------
  const brands = (scan.brands || []).slice(0, MAX_BRANDS)
  const maxScore = Math.max(...brands.map((b) => b.weighted_score || 0), 0.0001)

  let brandY = 0
  const brandLayouts = []
  for (const brand of brands) {
    // Only real issues become leaves. Quotes used to sit as a terminal node
    // too, but that turned every path into a dead-end complaint; quotes live
    // in the detail panel where they have context.
    const leaves = (brand.issues || [])
      .slice(0, MAX_ISSUE_LEAVES)
      .map((text) => ({ kind: 'issue', text }))
    const slot = Math.max(104, leaves.length * 84)
    brandLayouts.push({ brand, leaves, y: brandY + slot / 2, slot })
    brandY += slot
  }

  // -- Channel column: three stacked lanes ------------------------------------
  let channelY = 0
  const laneLayouts = []
  const engineLayouts = []
  const sourceLayouts = []
  const skeletonLayouts = []

  function openLane(key, label, status, count) {
    laneLayouts.push({ id: `lane-${key}`, key, label, status, count, y: channelY })
    channelY += LANE_HEADER_H
  }

  function addSkeletons(laneKey, n, slot) {
    for (let i = 0; i < n; i += 1) {
      skeletonLayouts.push({
        id: `skeleton-${laneKey}-${i}`,
        y: channelY,
        variant: laneKey === 'engines' ? 'engine' : 'source',
      })
      channelY += slot
    }
  }

  // AI engines. Rendered whenever the lane has anything to say — including
  // "not connected" rows, which is information rather than an absence.
  if (engines.length || isWorking(engineStage)) {
    const answered = engines.filter((e) => e.status === 'ok').length
    openLane('engines', 'AI engines', engineStage, answered)
    for (const engine of engines) {
      engineLayouts.push({ engine, y: channelY })
      channelY += SLOT_ENGINE
    }
    if (isWorking(engineStage)) {
      addSkeletons('engines', engines.length ? 1 : 3, SLOT_ENGINE)
    }
    channelY += LANE_GAP
  }

  // Community.
  if (communityRows.length || isWorking(communityStage)) {
    openLane('community', 'Community', communityStage, communityRows.length)
    for (const row of communityRows) {
      sourceLayouts.push({ row, opp: oppByRank.get(row.rank), y: channelY })
      channelY += SLOT_SOURCE
    }
    if (isWorking(communityStage)) {
      addSkeletons('community', communityRows.length ? 1 : 2, SLOT_SOURCE)
    }
    channelY += LANE_GAP
  }

  // Web. Always shown: it is the lane that always has something.
  openLane('web', 'Web', webStage, webRows.length)
  for (const row of webRows) {
    sourceLayouts.push({ row, opp: oppByRank.get(row.rank), y: channelY })
    channelY += SLOT_SOURCE
  }
  // While the analysis loop runs, results_count tells us how many rows are
  // still coming, so we can hold their space instead of letting the canvas
  // jump as each one lands.
  const announced = (scan.results_count || 0) - rows.length
  const pendingWeb = isWorking(webStage) || isWorking(analysisStage)
    ? Math.max(0, Math.min(SKELETON_CAP, announced || (webRows.length ? 0 : 3)))
    : 0
  addSkeletons('web', pendingWeb, SLOT_SOURCE)

  // -- Action column ----------------------------------------------------------
  let actionY = 0
  const actionLayouts = []
  if (opportunities.length) {
    actionLayouts.push({ isLabel: true, y: actionY })
    actionY += LANE_HEADER_H
    for (const opp of opportunities) {
      actionLayouts.push({ opp, y: actionY })
      actionY += SLOT_ACTION
    }
  }

  // -- Vertical centring ------------------------------------------------------
  const totalHeight = Math.max(channelY, brandY, actionY, 1)
  const brandOffset = (totalHeight - brandY) / 2
  const channelOffset = (totalHeight - channelY) / 2
  const actionOffset = (totalHeight - actionY) / 2

  // -- Query ------------------------------------------------------------------
  nodes.push({
    id: 'query',
    type: 'query',
    position: { x: X_QUERY, y: totalHeight / 2 - 32 },
    data: { label: scan.query, running },
  })

  // -- Lane labels ------------------------------------------------------------
  for (const lane of laneLayouts) {
    nodes.push({
      id: lane.id,
      type: 'lane',
      position: { x: X_CHANNEL, y: lane.y + channelOffset },
      selectable: false,
      draggable: false,
      data: { label: lane.label, status: lane.status, count: lane.count },
    })
  }

  // -- Engine nodes -----------------------------------------------------------
  for (const { engine, y } of engineLayouts) {
    const id = `engine-${engine.provider}`
    nodes.push({
      id,
      type: 'engine',
      position: { x: X_CHANNEL, y: y + channelOffset },
      data: { engine },
    })
    edges.push({
      id: `e-query-${id}`,
      source: 'query',
      target: id,
      animated: running,
      style: { stroke: 'var(--border)', strokeWidth: 0.9, opacity: 0.55 },
    })
  }

  // -- Source nodes -----------------------------------------------------------
  for (const { row, opp, y } of sourceLayouts) {
    const id = `source-${row.rank}`
    nodes.push({
      id,
      type: 'source',
      position: { x: X_CHANNEL, y: y + channelOffset },
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

  // -- Placeholders -----------------------------------------------------------
  for (const { id, y, variant } of skeletonLayouts) {
    nodes.push({
      id,
      type: 'skeleton',
      position: { x: X_CHANNEL, y: y + channelOffset },
      selectable: false,
      data: { variant },
    })
    edges.push({
      id: `e-query-${id}`,
      source: 'query',
      target: id,
      animated: true,
      style: {
        stroke: 'var(--border)',
        strokeWidth: 0.9,
        opacity: 0.28,
        strokeDasharray: '4 4',
      },
    })
  }

  // -- Engine -> source citation back-edges -----------------------------------
  // The dots the whole feature is named for: this is the page that taught
  // the model to recommend what it recommended. Dashed, so it reads as a
  // different kind of relationship than "this source mentions this brand".
  const sourceRanks = new Set(sourceLayouts.map(({ row }) => row.rank))
  for (const engine of engines) {
    for (const rank of engine.cited_ranks || []) {
      if (!sourceRanks.has(rank)) continue
      edges.push({
        id: `e-engine-${engine.provider}-cites-${rank}`,
        source: `engine-${engine.provider}`,
        target: `source-${rank}`,
        style: {
          stroke: 'var(--muted-foreground)',
          strokeWidth: 0.8,
          opacity: 0.35,
          strokeDasharray: '3 5',
        },
      })
    }
  }

  // -- Brands, issue leaves, and everything that points at a brand ------------
  const leafIdsByBrand = new Map()

  for (const { brand, leaves, y } of brandLayouts) {
    const id = `brand-${brandKey(brand.name)}`
    const size = 48 + Math.round(44 * ((brand.weighted_score || 0) / maxScore))
    nodes.push({
      id,
      type: 'brand',
      position: { x: X_BRAND, y: y + brandOffset - size / 2 },
      data: { brand, size, color: sentimentColor(brand.sentiment || 0) },
    })

    const brandLeafIds = []
    leaves.forEach((leaf, i) => {
      const leafId = `${id}-leaf-${i}`
      brandLeafIds.push(leafId)
      nodes.push({
        id: leafId,
        type: 'leaf',
        position: {
          x: X_ISSUE,
          y: y + brandOffset - (leaves.length * 84) / 2 + i * 84,
        },
        // Carry the parent brand so the leaf panel can find engageable
        // sources discussing it, instead of dead-ending on the complaint.
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
    leafIdsByBrand.set(brandKey(brand.name), brandLeafIds)

    // One edge per (source, brand) pair. Vue Flow routes them into the
    // brand's left handle, so a brand cited by many sources gets a natural
    // fan of thin lines converging on one node.
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
          // Weight modulates thickness gently. Capped around 1.4px so even
          // the most-cited brand does not dominate the canvas.
          stroke: sentimentColor(rowBrand.sentiment || 0),
          strokeWidth: 0.7 + 0.7 * Math.min(rowBrand.weight || 0, 1),
          opacity: 0.42,
        },
      })
    }

    // Engines that recommended this brand. Solid and slightly heavier than
    // a source edge: an engine naming you in its answer is a stronger claim
    // than a page mentioning you somewhere in its body.
    for (const engine of engines) {
      if (engine.status !== 'ok') continue
      const named = (engine.brands || []).find(
        (b) => brandKey(b.name) === brandKey(brand.name),
      )
      if (!named) continue
      edges.push({
        id: `e-engine-${engine.provider}-${id}`,
        source: `engine-${engine.provider}`,
        target: id,
        animated: running,
        style: {
          stroke: sentimentColor(named.sentiment || 0),
          strokeWidth: 1.4,
          opacity: 0.6,
        },
      })
    }
  }

  // -- Action column ----------------------------------------------------------
  for (const item of actionLayouts) {
    if (item.isLabel) {
      nodes.push({
        id: 'lane-actions',
        type: 'lane',
        position: { x: X_ACTION, y: item.y + actionOffset },
        selectable: false,
        draggable: false,
        data: { label: 'Where you can chip in', status: 'complete', count: opportunities.length },
      })
      continue
    }
    const { opp, y } = item
    const id = `action-${opp.kind}-${opp.rank ?? ''}-${opp.url}`
    nodes.push({
      id,
      type: 'action',
      position: { x: X_ACTION, y: y + actionOffset },
      data: { opportunity: opp },
    })

    // Wire each opening back to what makes it one. A thread connects to the
    // issue leaves of the competitors it names; a PAA question has no brand
    // behind it, so it hangs off the query.
    const parents = []
    for (const competitor of opp.competitors || []) {
      const leafIds = leafIdsByBrand.get(brandKey(competitor))
      if (leafIds && leafIds.length) parents.push(leafIds[0])
    }
    if (!parents.length) parents.push('query')

    for (const parent of parents.slice(0, 2)) {
      edges.push({
        id: `e-${parent}-${id}`,
        source: parent,
        target: id,
        style: {
          stroke: 'var(--chart-3)',
          strokeWidth: 1,
          opacity: 0.45,
        },
      })
    }
  }

  return { nodes, edges }
}
