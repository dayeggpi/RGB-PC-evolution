<template>
  <div>
    <div class="d-flex gap-2 flex-wrap mb-2">
      <select class="form-select form-select-sm bg-dark text-light border-secondary" v-model="scheme" style="max-width:160px">
        <option v-for="s in SCHEMES" :key="s.id" :value="s.id">{{ s.label }}</option>
      </select>
      <select class="form-select form-select-sm bg-dark text-light border-secondary" v-model="combination" style="max-width:190px">
        <option v-for="c in COMBINATIONS" :key="c.id" :value="c.id">{{ c.label }}</option>
      </select>
      <button class="btn btn-sm btn-outline-primary" @click="generate">Generate</button>
    </div>

    <!-- Preview swatches -->
    <div v-if="preview.length" class="mb-2">
      <div class="text-secondary mb-1" style="font-size:10px">Preview ({{ preview.length }} colors across 24 segments):</div>
      <div class="d-flex gap-1 flex-wrap mb-2">
        <div
          v-for="(col, i) in palette"
          :key="i"
          :style="{ background: col, width:'28px', height:'28px', borderRadius:'4px', border:'1px solid #444' }"
          :title="col"
        ></div>
      </div>
      <!-- Strip layout preview (14 strip + 5 left + 5 right) -->
      <div class="d-flex gap-1 mb-1">
        <div
          v-for="i in 14" :key="i"
          :style="{ background: preview[i-1], flex:'1', height:'12px', borderRadius:'2px' }"
          :title="`Seg ${i}`"
        ></div>
      </div>
      <div class="d-flex gap-2">
        <div class="d-flex flex-column gap-1">
          <div v-for="i in 5" :key="i" :style="{ background: preview[13+i], width:'12px', height:'12px', borderRadius:'2px' }" :title="`Seg ${13+i}`"></div>
        </div>
        <div class="flex-grow-1 bg-secondary rounded" style="opacity:0.1;height:60px"></div>
        <div class="d-flex flex-column gap-1">
          <div v-for="i in 5" :key="i" :style="{ background: preview[18+i], width:'12px', height:'12px', borderRadius:'2px' }" :title="`Seg ${18+i}`"></div>
        </div>
      </div>
    </div>

    <div class="d-flex gap-2 align-items-center">
      <button
        v-if="preview.length"
        class="btn btn-sm btn-outline-success"
        :disabled="applying"
        @click="apply"
      >{{ applying ? 'Applying…' : 'Apply' }}</button>
      <span v-if="applied" class="text-success" style="font-size:10px">Applied!</span>
    </div>
  </div>
</template>

<script>
import { SEG_ALL } from '../models/Strip.js'

const SCHEMES = [
  { id: 'work',      label: 'Work',      hue: 210, sat: [20, 55], lit: [40, 70] },
  { id: 'gourmet',   label: 'Gourmet',   hue: 15,  sat: [50, 90], lit: [25, 55] },
  { id: 'calm',      label: 'Calm',      hue: 195, sat: [30, 65], lit: [50, 75] },
  { id: 'happiness', label: 'Happiness', hue: 45,  sat: [80,100], lit: [50, 65] },
  { id: 'party',     label: 'Party',     hue: 300, sat: [80,100], lit: [45, 65] },
  { id: 'leisure',   label: 'Leisure',   hue: 25,  sat: [50, 80], lit: [50, 70] },
  { id: 'joy',       label: 'Joy',       hue: 60,  sat: [75,100], lit: [50, 65] },
  { id: 'warm',      label: 'Warm',      hue: 20,  sat: [70,100], lit: [45, 65] },
  { id: 'in_love',   label: 'In Love',   hue: 350, sat: [60,100], lit: [45, 65] },
  { id: 'lively',    label: 'Lively',    hue: 140, sat: [80,100], lit: [45, 65] },
  { id: 'sports',    label: 'Sports',    hue: 220, sat: [80,100], lit: [40, 60] },
  { id: 'universe',  label: 'Universe',  hue: 260, sat: [60,100], lit: [15, 45] },
]

const COMBINATIONS = [
  { id: 'analogous',         label: 'Analogous' },
  { id: 'complementary',     label: 'Complementary' },
  { id: 'split_comp',        label: 'Split Complementary' },
  { id: 'double_comp',       label: '2 Sets Complementary' },
  { id: 'contrasting',       label: 'Contrasting' },
  { id: 'gradient',          label: 'Gradient' },
  { id: 'random',            label: 'Random' },
]

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h / 30) % 12
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
  }
  return '#' + [0, 8, 4].map(n => Math.round(f(n) * 255).toString(16).padStart(2, '0')).join('')
}

function rnd(min, max) { return min + Math.random() * (max - min) }

function makePalette(schemeId, combinationId, count = 5) {
  const scheme = SCHEMES.find(s => s.id === schemeId)
  const { hue, sat, lit } = scheme
  const colors = []

  const pick = (h) => hslToHex(h, rnd(sat[0], sat[1]), rnd(lit[0], lit[1]))

  switch (combinationId) {
    case 'analogous':
      for (let i = 0; i < count; i++) colors.push(pick(hue + rnd(-45, 45)))
      break
    case 'complementary':
      for (let i = 0; i < count; i++) colors.push(pick(i % 2 === 0 ? hue + rnd(-20,20) : hue + 180 + rnd(-20,20)))
      break
    case 'split_comp': {
      const angles = [0, 150, 210]
      for (let i = 0; i < count; i++) colors.push(pick(hue + angles[i % 3] + rnd(-15,15)))
      break
    }
    case 'double_comp': {
      const angles = [0, 90, 180, 270]
      for (let i = 0; i < count; i++) colors.push(pick(hue + angles[i % 4] + rnd(-15,15)))
      break
    }
    case 'contrasting':
      for (let i = 0; i < count; i++) colors.push(pick(hue + (360 / count) * i + rnd(-10,10)))
      break
    case 'gradient':
      for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0
        colors.push(hslToHex(hue + t * 60, sat[0] + t * (sat[1]-sat[0]), lit[0] + t * (lit[1]-lit[0])))
      }
      break
    default: // random
      for (let i = 0; i < count; i++) colors.push(pick(hue + rnd(-60, 60)))
  }
  return colors
}

function distributeToSegments(palette, segCount = 24) {
  return Array.from({ length: segCount }, (_, i) => palette[i % palette.length])
}

export default {
  name: 'ColorSchemeControls',
  props: { strip: { type: Object, required: true } },
  emits: ['colors-applied'],
  data() {
    return {
      SCHEMES,
      COMBINATIONS,
      scheme: 'warm',
      combination: 'analogous',
      palette: [],
      preview: [],
      applying: false,
      applied: false,
    }
  },
  methods: {
    generate() {
      this.applied = false
      this.palette = makePalette(this.scheme, this.combination, 5)
      this.preview = distributeToSegments(this.palette, 24)
    },

    async apply() {
      if (!this.preview.length) return
      this.applying = true
      this.applied = false
      const segData = {}
      SEG_ALL.forEach((seg, i) => { segData[seg] = this.preview[i] || this.preview[0] })
      await this.strip.setSegments(segData)
      this.$emit('colors-applied', { ...segData })
      this.applying = false
      this.applied = true
      setTimeout(() => { this.applied = false }, 2000)
    },
  },
}
</script>
