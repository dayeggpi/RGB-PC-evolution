<template>
  <div class="card bg-dark border-secondary">
    <div
      class="card-header d-flex align-items-center"
      style="cursor:pointer"
      @click="expanded = !expanded"
    >
      <span class="text-light">Ambilight Sync</span>
      <span class="ms-2 text-secondary small" v-if="strip.syncMode">● active</span>
      <span class="ms-auto text-secondary small">{{ expanded ? '▲' : '▼' }}</span>
    </div>

    <div v-if="expanded" class="card-body">
      <video ref="videoEl" style="display:none"></video>

      <div class="d-flex gap-2 align-items-center mb-3">
        <select class="form-select form-select-sm bg-dark text-light border-secondary" v-model="screenId">
          <option value="">Select screen</option>
          <option v-for="s in screens" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <button v-if="!strip.syncMode" class="btn btn-sm btn-primary" :disabled="!screenId" @click="startSync">Sync</button>
        <button v-else class="btn btn-sm btn-danger" @click="stopSync">Stop</button>
      </div>

      <!-- Square frame preview — always visible when expanded -->
      <div class="frame-preview mb-3">
        <div class="frame-grid">
          <!-- Top: 6 chips, cols 2-7, row 1 -->
          <div v-for="i in 6" :key="`pt${i}`"
            class="fchip"
            :style="{ ...chipStyle('top', i-1), gridColumn: i+1, gridRow: 1 }"
            :title="`Top slot ${i}${mapping.top[i-1] != null ? ': seg '+mapping.top[i-1] : ''}`"
          ></div>
          <!-- Left: 6 chips, col 1, rows 2-7 -->
          <div v-for="i in 6" :key="`pl${i}`"
            class="fchip"
            :style="{ ...chipStyle('left', i-1), gridColumn: 1, gridRow: i+1 }"
            :title="`Left slot ${i}${mapping.left[i-1] != null ? ': seg '+mapping.left[i-1] : ''}`"
          ></div>
          <!-- Right: 6 chips, col 8, rows 2-7 -->
          <div v-for="i in 6" :key="`pr${i}`"
            class="fchip"
            :style="{ ...chipStyle('right', i-1), gridColumn: 8, gridRow: i+1 }"
            :title="`Right slot ${i}${mapping.right[i-1] != null ? ': seg '+mapping.right[i-1] : ''}`"
          ></div>
          <!-- Bottom: 6 chips, cols 2-7, row 8 -->
          <div v-for="i in 6" :key="`pb${i}`"
            class="fchip"
            :style="{ ...chipStyle('bottom', i-1), gridColumn: i+1, gridRow: 8 }"
            :title="`Bottom slot ${i}${mapping.bottom[i-1] != null ? ': seg '+mapping.bottom[i-1] : ''}`"
          ></div>
          <!-- Screen center: rows 2-7, cols 2-7 -->
          <div class="frame-screen" style="grid-row:2/8;grid-column:2/8"></div>
        </div>
      </div>

      <!-- Mapping: 6 fixed slots per border -->
      <div class="mapping-section">
        <div class="d-flex align-items-center gap-2 mb-2">
          <p class="text-secondary small mb-0">
            Enter BT segment numbers (1–24) per border. Each slot samples its own screen region.
          </p>
          <button class="btn btn-sm btn-outline-danger ms-auto flex-shrink-0" @click="clearSlots">Clear all</button>
        </div>

        <div class="mapping-layout">
          <div v-for="side in ['top','left','right','bottom']" :key="side" class="mapping-row">
            <span class="border-label">{{ side.charAt(0).toUpperCase() + side.slice(1) }}</span>
            <div class="slots">
              <input
                v-for="i in 6" :key="`${side}${i}`"
                type="number" min="1" max="24"
                class="slot-input"
                :value="slotVal(side, i-1)"
                @change="setSlot(side, i-1, $event.target.value)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Capture from '../models/Capture'

const { electronAPI } = window
const MAPPING_KEY = 'govee_sync_v3'

function emptySlots() {
  // 6 null slots per border — fixed positions, no shifting
  return { top: Array(6).fill(null), left: Array(6).fill(null), right: Array(6).fill(null), bottom: Array(6).fill(null) }
}

export default {
  name: 'LightSync',
  props: {
    strip: { type: Object, required: true },
  },
  data: () => ({
    expanded: false,
    screens: [],
    screenId: '',
    cap: null,
    previewColors: {},
    mapping: emptySlots(),
  }),
  methods: {
    // Value of slot i for side (empty string if null)
    slotVal(side, i) {
      const v = this.mapping[side][i]
      return v != null ? v : ''
    },

    // Update a single slot; value '' → null
    setSlot(side, i, val) {
      const parsed = parseInt(val)
      const arr = [...this.mapping[side]]
      arr[i] = (isNaN(parsed) || val === '') ? null : parsed
      this.mapping[side] = arr
      this.saveMapping()
    },

    // Non-null slots as string array for Capture
    filledSlots(side) {
      return this.mapping[side].filter(v => v != null).map(String)
    },

    // Color for a preview frame chip
    chipStyle(side, idx) {
      const segNum = this.mapping[side][idx]
      if (segNum == null) return { background: '#1a1a1a' }            // empty slot
      if (!this.strip.syncMode) return { background: '#3a3a3a' }      // filled but not syncing
      return { background: this.previewColors[String(segNum)] || '#2a2a2a' }
    },

    async startSync() {
      this.cap = new Capture(this.screenId, this.$refs.videoEl)
      window.cap = this.cap
      this.applyMapping()
      this._previewInterval = setInterval(() => {
        if (this.cap) this.previewColors = { ...this.cap.segData }
      }, 400)
      await this.strip.consumeSegData()
    },

    stopSync() {
      this.strip.stopSync()
      if (this.cap) this.cap.stopStream()
      clearInterval(this._previewInterval)
    },

    applyMapping() {
      if (!this.cap) return
      this.cap.segments.left   = this.filledSlots('left')
      this.cap.segments.top    = this.filledSlots('top')
      this.cap.segments.right  = this.filledSlots('right')
      this.cap.segments.bottom = this.filledSlots('bottom')
    },

    saveMapping() {
      localStorage.setItem(MAPPING_KEY, JSON.stringify(this.mapping))
      this.applyMapping()
    },

    loadMapping() {
      const saved = localStorage.getItem(MAPPING_KEY)
      if (saved) {
        try {
          const m = JSON.parse(saved)
          // Migrate: ensure each side is a 6-element array
          const empty = emptySlots()
          for (const side of ['top','left','right','bottom']) {
            if (Array.isArray(m[side])) {
              const arr = Array(6).fill(null)
              m[side].forEach((v, i) => { if (i < 6) arr[i] = v })
              empty[side] = arr
            }
          }
          this.mapping = empty
        } catch { /**/ }
      }
    },

    clearSlots() {
      this.mapping = emptySlots()
      this.saveMapping()
    },

    async getScreens() {
      this.screens = await electronAPI.invoke('getDesktopSources')
    },
  },
  mounted() {
    this.loadMapping()
    this.getScreens()
  },
  beforeUnmount() {
    clearInterval(this._previewInterval)
  },
}
</script>

<style scoped>
/* Square frame preview */
.frame-preview { display: flex; justify-content: center; }

.frame-grid {
  display: grid;
  grid-template-columns: 22px repeat(6, 1fr) 22px;
  grid-template-rows:    22px repeat(6, 1fr) 22px;
  gap: 3px;
  width: 220px;
  height: 220px;
}

.fchip {
  border-radius: 3px;
  transition: background 0.3s;
}

.frame-screen {
  background: #111;
  border-radius: 3px;
}

/* Mapping inputs */
.mapping-layout { display: flex; flex-direction: column; gap: 6px; }

.mapping-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.border-label {
  color: #aaa;
  font-size: 11px;
  width: 48px;
  flex-shrink: 0;
}

.slots { display: flex; gap: 4px; }

.slot-input {
  width: 36px;
  padding: 2px 0;
  font-size: 11px;
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 3px;
  color: #e0e0e0;
  text-align: center;
}
.slot-input:focus { outline: 1px solid #0d6efd; border-color: #0d6efd; }
.slot-input::-webkit-outer-spin-button,
.slot-input::-webkit-inner-spin-button { -webkit-appearance: none; }
.slot-input[type=number] { -moz-appearance: textfield; }
</style>
