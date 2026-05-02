<template>
  <div class="seg-diagram">
    <!-- Strip row — segs 1-14 top, left to right -->
    <div class="seg-row strip-row">
      <div
        v-for="n in SEG_STRIP" :key="n"
        class="seg seg-strip"
        :class="segClass(n)"
        :style="segStyle(n)"
        @click="onClick(n)"
        :title="`Seg ${n} (strip)`"
      >{{ n }}</div>
    </div>

    <!-- Middle: left col + screen + right col -->
    <div class="seg-middle">
      <!-- Left bar: 19 at top → 15 at bottom -->
      <div class="seg-col">
        <div
          v-for="n in SEG_LEFT_DISPLAY" :key="n"
          class="seg seg-side"
          :class="segClass(n)"
          :style="segStyle(n)"
          @click="onClick(n)"
          :title="`Seg ${n} (left)`"
        >{{ n }}</div>
      </div>

      <div class="screen-area"><span class="screen-label">SCREEN</span></div>

      <!-- Right bar: 24 at top → 20 at bottom -->
      <div class="seg-col">
        <div
          v-for="n in SEG_RIGHT_DISPLAY" :key="n"
          class="seg seg-side"
          :class="segClass(n)"
          :style="segStyle(n)"
          @click="onClick(n)"
          :title="`Seg ${n} (right)`"
        >{{ n }}</div>
      </div>
    </div>

    <!-- Quick-select buttons -->
    <div class="seg-actions mt-2">
      <button class="btn btn-sm btn-outline-secondary me-1" @click="selectAll">All</button>
      <button class="btn btn-sm btn-outline-secondary me-1" @click="selectNone">None</button>
      <button class="btn btn-sm btn-outline-secondary me-1" @click="toggleGroup(SEG_LEFT)">Left</button>
      <button class="btn btn-sm btn-outline-secondary me-1" @click="toggleGroup(SEG_RIGHT)">Right</button>
      <button class="btn btn-sm btn-outline-secondary"      @click="toggleGroup(SEG_STRIP)">Strip</button>
    </div>
  </div>
</template>

<script>
import { SEG_STRIP, SEG_LEFT, SEG_RIGHT, SEG_ALL } from '../models/Strip.js'

// Display order: high number at top so low number is at bottom
const SEG_LEFT_DISPLAY  = [...SEG_LEFT].reverse()   // ['19','18','17','16','15']
const SEG_RIGHT_DISPLAY = [...SEG_RIGHT].reverse()  // ['24','23','22','21','20']

export default {
  name: 'SegmentDiagram',
  props: {
    selected:     { type: Array,  default: () => [] },
    colors:       { type: Object, default: () => ({}) },
    identifyMode: { type: Boolean, default: false },
  },
  emits: ['update:selected', 'identify'],
  data() {
    return { SEG_STRIP, SEG_LEFT, SEG_RIGHT, SEG_LEFT_DISPLAY, SEG_RIGHT_DISPLAY }
  },
  methods: {
    onClick(n) {
      if (this.identifyMode) {
        this.$emit('identify', n)
        return
      }
      const sel = [...this.selected]
      const idx = sel.indexOf(n)
      if (idx === -1) sel.push(n)
      else sel.splice(idx, 1)
      this.$emit('update:selected', sel)
    },
    selectAll()  { this.$emit('update:selected', [...SEG_ALL]) },
    selectNone() { this.$emit('update:selected', []) },
    toggleGroup(group) {
      const current = new Set(this.selected)
      const allIn = group.every(k => current.has(k))
      const next = this.selected.filter(k => !group.includes(k))
      if (!allIn) group.forEach(k => next.push(k))
      this.$emit('update:selected', next)
    },
    segClass(n) {
      const sel = this.selected.includes(n)
      return {
        'seg-selected':   sel && !this.identifyMode,
        'seg-identified': sel &&  this.identifyMode,
        'seg-has-color':  !!this.colors[n] && !sel,
      }
    },
    segStyle(n) {
      if (this.colors[n] && !this.selected.includes(n)) {
        return { backgroundColor: this.colors[n], borderColor: this.colors[n] }
      }
      return {}
    },
  },
}
</script>

<style scoped>
.seg-diagram { user-select: none; }

.seg {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  color: #fff;
  cursor: pointer;
  border: 2px solid #444;
  border-radius: 3px;
  background: #2a2a2a;
  transition: border-color 0.12s, background 0.12s;
}
.seg:hover        { border-color: #888; }
.seg-selected     { border-color: #0d6efd !important; background: rgba(13,110,253,0.25) !important; }
.seg-identified   { border-color: #ef4444 !important; background: rgba(239,68,68,0.45) !important; }

.strip-row { display: flex; gap: 2px; margin-bottom: 2px; }
.seg-strip  { flex: 1; height: 28px; }

.seg-middle { display: flex; gap: 2px; }
.seg-col    { display: flex; flex-direction: column; gap: 2px; }
.seg-side   { width: 28px; flex: 1; min-height: 28px; }

.screen-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111;
  border: 1px solid #333;
  border-radius: 2px;
  min-height: 130px;
  color: #444;
  font-size: 11px;
  letter-spacing: 2px;
}

.seg-actions { display: flex; flex-wrap: wrap; gap: 2px; }
</style>
