<!--
  A chart inside an assistant answer.

  The model emits a small JSON spec in a ```chart fence; utils/answerParts.js
  validates it and this renders it with the app's existing chart.js stack
  (chart.js + vue-chartjs), themed from CSS variables so it follows light and
  dark like every other chart in the product.

  The prose around it always carries the same numbers -- the chart is the
  glance, not the source of truth.
-->
<template>
  <figure class="answer-chart">
    <figcaption v-if="spec.title" class="answer-chart-title">{{ spec.title }}</figcaption>
    <div ref="boxEl" class="answer-chart-canvas">
      <!-- Only mount once the box has a real width. chart.js measures its
           container on init and caches the result; if it initialises at
           zero width (mounted in a collapsed panel, mid route transition,
           or a background tab with no layout) the canvas stays 0px wide
           forever, even after the container is laid out. -->
      <component
        v-if="boxWidth > 0"
        :is="chartComponent"
        :key="boxWidth"
        :data="chartData"
        :options="chartOptions"
      />
    </div>
  </figure>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Bar, Line, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend,
  BarElement, LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale, Filler,
} from 'chart.js'

import { cssVar } from '@/lib/theme'

ChartJS.register(
  Title, Tooltip, Legend,
  BarElement, LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale, Filler,
)

const props = defineProps({
  // Already validated by utils/answerParts.js::parseChartSpec.
  spec: { type: Object, required: true },
})

// Width of the chart box, watched so the chart mounts (and remounts) only
// against a real measurement. Bucketed to 24px steps so ordinary resizing
// does not thrash the key and rebuild the chart on every pixel.
const boxEl = ref(null)
const boxWidth = ref(0)
let observer = null

function setWidth(raw) {
  const w = Math.round(raw || 0)
  // Bucket so ordinary resizing does not rebuild the chart every pixel.
  const bucket = w > 0 ? Math.max(24, Math.round(w / 24) * 24) : 0
  if (bucket !== boxWidth.value) boxWidth.value = bucket
}

onMounted(() => {
  // Measure synchronously first. ResizeObserver notifications are delivered
  // at the end of a rendering frame, and a tab that is not compositing
  // produces none -- relying on the observer alone means the chart never
  // appears there at all.
  setWidth(boxEl.value?.getBoundingClientRect().width)

  if (typeof ResizeObserver === 'undefined') {
    if (!boxWidth.value) boxWidth.value = 24  // no observer: render anyway
    return
  }
  observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
  observer.observe(boxEl.value)
})

onBeforeUnmount(() => observer?.disconnect())

const COMPONENTS = { bar: Bar, line: Line, doughnut: Doughnut }
const chartComponent = computed(() => COMPONENTS[props.spec.type] || Bar)

// Categorical series colours. Pulled from the app's chart tokens so the
// palette matches the dashboards rather than introducing a second one.
const palette = computed(() => [
  cssVar('--chart-1', '#6d5efc'),
  cssVar('--chart-2', '#22c55e'),
  cssVar('--chart-3', '#f59e0b'),
  cssVar('--chart-4', '#3b82f6'),
  cssVar('--chart-5', '#ec4899'),
])

const isDoughnut = computed(() => props.spec.type === 'doughnut')

const chartData = computed(() => {
  const colors = palette.value
  return {
    labels: props.spec.labels,
    datasets: props.spec.datasets.map((d, i) => {
      // A doughnut colours each SLICE; bar and line colour each SERIES.
      const color = isDoughnut.value
        ? props.spec.labels.map((_, n) => colors[n % colors.length])
        : colors[i % colors.length]
      return {
        label: d.label,
        data: d.data,
        backgroundColor: color,
        borderColor: color,
        borderWidth: props.spec.type === 'line' ? 2 : 0,
        borderRadius: props.spec.type === 'bar' ? 4 : 0,
        pointRadius: props.spec.type === 'line' ? 3 : 0,
        tension: 0.35,
        fill: false,
      }
    }),
  }
})

const unitSuffix = (v) => `${v}${props.spec.unit || ''}`

const chartOptions = computed(() => {
  const grid = cssVar('--border', '#e5e5e5')
  const text = cssVar('--muted-foreground', '#6b7280')
  const single = props.spec.datasets.length === 1

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      // One unlabelled series needs no legend; the caption already says
      // what it is.
      legend: {
        display: isDoughnut.value || !single,
        position: isDoughnut.value ? 'right' : 'top',
        labels: { color: text, boxWidth: 10, boxHeight: 10, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const name = ctx.dataset.label || ctx.label || ''
            const value = unitSuffix(ctx.parsed.y ?? ctx.parsed)
            return name ? `${name}: ${value}` : value
          },
        },
      },
    },
    scales: isDoughnut.value ? {} : {
      x: {
        grid: { display: false },
        ticks: { color: text, font: { size: 11 } },
        border: { color: grid },
      },
      y: {
        beginAtZero: true,
        grid: { color: grid },
        ticks: { color: text, font: { size: 11 }, callback: unitSuffix },
        border: { display: false },
      },
    },
  }
})
</script>

<style scoped>
.answer-chart {
  margin: 6px 0 16px;
  padding: 14px 16px 10px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--card);
}
.answer-chart-title {
  margin-bottom: 10px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--foreground);
}
/* Fixed height because chart.js needs a bounded parent to size against;
   maintainAspectRatio is off so it fills this box. */
.answer-chart-canvas {
  position: relative;
  height: 220px;
}
</style>
