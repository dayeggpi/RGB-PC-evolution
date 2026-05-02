<template>
  <div class="card bg-dark border-secondary">
    <div class="card-body">

      <div class="d-flex align-items-center mb-3">
        <h6 class="card-title mb-0 text-light">Light Controls</h6>
        <div class="ms-auto d-flex gap-2">
          <button @click="turnOff" class="btn btn-sm btn-outline-danger">Off</button>
          <button @click="turnOn"  class="btn btn-sm btn-outline-success">On</button>
        </div>
      </div>

      <ul class="nav nav-tabs nav-tabs-dark mb-3">
        <li class="nav-item">
          <a class="nav-link" :class="{active: tab==='color'}"    href="#" @click.prevent="tab='color'">Color</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" :class="{active: tab==='identify'}" href="#" @click.prevent="tab='identify'">Identify</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" :class="{active: tab==='palettes'}" href="#" @click.prevent="tab='palettes'">Palettes</a>
        </li>
      </ul>

      <!-- ── COLOR TAB ── -->
      <div v-if="tab==='color'">
        <SegmentDiagram
          v-model:selected="selectedSegments"
          :colors="segmentColors"
          :identifyMode="false"
          class="mb-3"
        />
        <div class="mb-3">
          <label class="form-label text-light small">Color</label>
          <div class="d-flex align-items-center gap-2">
            <input type="color" class="form-control form-control-color" v-model="pickedColor" />
            <input
              type="text"
              class="form-control form-control-sm bg-dark text-light border-secondary font-monospace"
              v-model="pickedColor"
              style="width:90px"
            />
            <button class="btn btn-sm btn-primary" @click="applyColor">
              Apply{{ selectedSegments.length ? ` (${selectedSegments.length})` : ' all' }}
            </button>
          </div>
        </div>
        <div>
          <label class="form-label text-light small">Brightness: {{ brightness }}%</label>
          <input type="range" min="1" max="100" class="form-range" v-model.number="brightness" @change="applyBrightness" />
          <div class="d-flex align-items-center gap-2 mt-1 flex-wrap">
            <span class="text-secondary" style="font-size:10px">Brightness shortcuts:</span>
            <div class="d-flex align-items-center gap-1">
              <span class="text-secondary" style="font-size:10px">+10%</span>
              <button
                class="btn btn-xs"
                :class="assigningBrightnessFor==='up' ? 'btn-warning' : 'btn-outline-secondary'"
                @click="startAssignBrightnessHotkey('up')"
              >{{ assigningBrightnessFor==='up' ? 'Press…' : (brightnessUpHotkey || '+ key') }}</button>
              <button
                v-if="assigningBrightnessFor==='up' || brightnessUpHotkey"
                class="btn btn-xs btn-outline-secondary"
                @click="cancelOrClearBrightnessHotkey('up')"
              >×</button>
            </div>
            <div class="d-flex align-items-center gap-1">
              <span class="text-secondary" style="font-size:10px">−10%</span>
              <button
                class="btn btn-xs"
                :class="assigningBrightnessFor==='down' ? 'btn-warning' : 'btn-outline-secondary'"
                @click="startAssignBrightnessHotkey('down')"
              >{{ assigningBrightnessFor==='down' ? 'Press…' : (brightnessDownHotkey || '+ key') }}</button>
              <button
                v-if="assigningBrightnessFor==='down' || brightnessDownHotkey"
                class="btn btn-xs btn-outline-secondary"
                @click="cancelOrClearBrightnessHotkey('down')"
              >×</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── IDENTIFY TAB ── -->
      <div v-if="tab==='identify'">
        <p class="text-secondary small mb-2">
          Click a segment to toggle it red on the device — use this to map BT numbers to physical positions.<br>
          Segs 1–14 = strip · 15–19 = left (15=bottom) · 20–24 = right (20=bottom).
        </p>
        <SegmentDiagram
          v-model:selected="identifiedSegments"
          :colors="{}"
          :identifyMode="true"
          @identify="toggleIdentify"
          class="mb-2"
        />
        <button class="btn btn-sm btn-outline-secondary mt-1" @click="clearIdentified">Clear all</button>
      </div>

      <!-- ── PALETTES TAB ── -->
      <div v-if="tab==='palettes'">
        <div class="d-flex align-items-baseline gap-2 mb-2">
          <p class="text-secondary small mb-0">Save current segment colors. Hotkeys are system-wide (e.g. Shift+Alt+H).</p>
          <span v-if="palettesPath" class="text-secondary ms-auto" style="font-size:9px;white-space:nowrap;opacity:0.6" :title="palettesPath">{{ palettesPath }}</span>
        </div>
        <div class="palette-grid">
          <div
            v-for="(palette, idx) in palettes" :key="idx"
            class="palette-card"
            :class="{ 'palette-active': activePalette === idx }"
          >
            <div class="palette-swatches mb-1">
              <template v-if="palette.allColor">
                <span class="palette-swatch" :style="{ background: palette.allColor }"></span>
              </template>
              <template v-else>
                <span
                  v-for="(color, seg) in palette.segments" :key="seg"
                  class="palette-swatch"
                  :style="{ background: color }"
                ></span>
              </template>
              <span v-if="!palette.allColor && !Object.keys(palette.segments).length"
                class="text-secondary" style="font-size:9px">empty</span>
            </div>
            <input
              type="text"
              class="form-control form-control-sm bg-dark text-light border-secondary mb-1"
              v-model="palette.name"
              @change="savePalettes"
              style="font-size:11px;padding:2px 4px"
            />
            <div class="d-flex gap-1 flex-wrap">
              <button class="btn btn-xs btn-outline-primary"   @click="loadPalette(idx)">Load</button>
              <button class="btn btn-xs btn-outline-secondary" @click="saveToPalette(idx)">Save</button>
              <button class="btn btn-xs btn-outline-danger"    @click="clearPalette(idx)">Clear</button>
              <button
                class="btn btn-xs"
                :class="assigningFor === idx ? 'btn-warning' : 'btn-outline-secondary'"
                @click="startAssignHotkey(idx)"
                :title="palette.hotkey || 'No hotkey assigned'"
              >{{ assigningFor === idx ? 'Press…' : (palette.hotkey || '+ key') }}</button>
              <!-- Cancel assignment OR clear saved hotkey -->
              <button
                v-if="assigningFor === idx || palette.hotkey"
                class="btn btn-xs btn-outline-secondary"
                @click="cancelOrClearHotkey(idx)"
                title="Clear hotkey"
              >×</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import SegmentDiagram from './SegmentDiagram.vue'
import { SEG_ALL } from '../models/Strip.js'

function defaultPalettes() {
  return Array.from({ length: 10 }, (_, i) => ({
    name: `Palette ${i + 1}`,
    hotkey: null,
    brightness: 100,
    allColor: null,
    segments: {},
  }))
}

// Only return a combo string when a real (non-modifier) key is part of it
function formatHotkey(e) {
  const key = e.key
  // Ignore standalone modifier keydowns — wait for the actual key
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return null
  const parts = []
  if (e.ctrlKey)  parts.push('Ctrl')
  if (e.altKey)   parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey)  parts.push('Meta')
  parts.push(key.length === 1 ? key.toUpperCase() : key)
  return parts.join('+')
}


export default {
  name: 'LightControls',
  components: { SegmentDiagram },
  props: {
    strip: { type: Object, required: true },
  },
  data: () => ({
    tab: 'color',
    selectedSegments:   [],
    identifiedSegments: [],
    segmentColors:      {},
    pickedColor:        '#ff0000',
    brightness:         100,
    palettes:           defaultPalettes(),
    activePalette:      null,
    assigningFor:           null,
    brightnessUpHotkey:     null,
    brightnessDownHotkey:   null,
    assigningBrightnessFor: null,
    palettesPath:           null,
  }),
  watch: {
    // When group buttons (All/None/Left/Right/Strip) change identifiedSegments,
    // send BT commands for newly added/removed segments
    identifiedSegments(newVal, oldVal) {
      const added   = newVal.filter(n => !oldVal.includes(n))
      const removed = oldVal.filter(n => !newVal.includes(n))
      added.forEach(n   => this.strip.setSegment(n, '#ff0000').catch(() => {}))
      removed.forEach(n => this.strip.setSegment(n, '#000000').catch(() => {}))
    },
  },
  methods: {
    async turnOn()  { await this.strip.turnOn() },
    async turnOff() { await this.strip.turnOff() },

    async applyColor() {
      const color = this.pickedColor
      if (this.selectedSegments.length === 0) {
        await this.strip.setColor(color)
        const updated = {}
        SEG_ALL.forEach(k => { updated[k] = color })
        this.segmentColors = updated
      } else {
        const updated = { ...this.segmentColors }
        for (const n of this.selectedSegments) {
          await this.strip.setSegment(n, color)
          updated[n] = color
        }
        this.segmentColors = updated
      }
    },

    async applyBrightness() {
      await this.strip.setBrightness(this.brightness)
    },

    // Called by individual segment click in identify mode
    async toggleIdentify(n) {
      const idx = this.identifiedSegments.indexOf(n)
      if (idx === -1) {
        this.identifiedSegments = [...this.identifiedSegments, n]
        // BT command sent by the watcher
      } else {
        this.identifiedSegments = this.identifiedSegments.filter(x => x !== n)
        // BT command (black) sent by the watcher
      }
    },

    clearIdentified() {
      // Send black to all identified before clearing (watcher handles it)
      this.identifiedSegments = []
    },

    saveToPalette(idx) {
      this.palettes[idx].segments   = { ...this.segmentColors }
      this.palettes[idx].allColor   = null
      this.palettes[idx].brightness = this.brightness
      this.savePalettes()
    },

    async loadPalette(idx) {
      const p = this.palettes[idx]
      this.activePalette = idx
      if (p.allColor) {
        await this.strip.setColor(p.allColor)
        const updated = {}
        SEG_ALL.forEach(k => { updated[k] = p.allColor })
        this.segmentColors = updated
      } else {
        await this.strip.setSegments(p.segments)
        this.segmentColors = { ...p.segments }
      }
      if (p.brightness != null) {
        this.brightness = p.brightness
        await this.strip.setBrightness(p.brightness)
      }
    },

    clearPalette(idx) {
      this.palettes[idx].segments  = {}
      this.palettes[idx].allColor  = null
      this.palettes[idx].hotkey    = null
      this.savePalettes()
    },

    startAssignHotkey(idx) {
      this.assigningFor = idx
    },

    cancelOrClearHotkey(idx) {
      if (this.assigningFor === idx) {
        this.assigningFor = null  // cancel pending assignment
      } else {
        this.palettes[idx].hotkey = null  // remove saved hotkey
        this.savePalettes()
      }
    },

    handleKeydown(e) {
      if (this.assigningFor !== null) {
        if (e.key === 'Escape') { this.assigningFor = null; return }
        const combo = formatHotkey(e)
        if (!combo) return
        e.preventDefault()
        this.palettes[this.assigningFor].hotkey = combo
        this.assigningFor = null
        this.savePalettes()
        return
      }
      if (this.assigningBrightnessFor !== null) {
        if (e.key === 'Escape') { this.assigningBrightnessFor = null; return }
        const combo = formatHotkey(e)
        if (!combo) return
        e.preventDefault()
        if (this.assigningBrightnessFor === 'up') this.brightnessUpHotkey = combo
        else this.brightnessDownHotkey = combo
        this.assigningBrightnessFor = null
        this.savePalettes()
      }
    },

    registerGlobalShortcuts() {
      const shortcuts = []
      this.palettes.forEach((p, idx) => {
        if (p.hotkey) shortcuts.push({ combo: p.hotkey, action: { type: 'palette', idx } })
      })
      if (this.brightnessUpHotkey)   shortcuts.push({ combo: this.brightnessUpHotkey,   action: { type: 'brightnessUp'   } })
      if (this.brightnessDownHotkey) shortcuts.push({ combo: this.brightnessDownHotkey, action: { type: 'brightnessDown' } })
      window.electronAPI.invoke('registerGlobalShortcuts', shortcuts).catch(() => {})
    },

    async adjustBrightness(delta) {
      this.brightness = Math.min(100, Math.max(1, this.brightness + delta))
      await this.strip.setBrightness(this.brightness)
    },

    startAssignBrightnessHotkey(dir) {
      this.assigningBrightnessFor = dir
    },

    cancelOrClearBrightnessHotkey(dir) {
      if (this.assigningBrightnessFor === dir) {
        this.assigningBrightnessFor = null
      } else {
        if (dir === 'up') this.brightnessUpHotkey = null
        else this.brightnessDownHotkey = null
        this.savePalettes()
      }
    },

    savePalettes() {
      // JSON round-trip strips Vue Proxy wrappers before structured-clone over IPC
      const plain = JSON.parse(JSON.stringify(this.palettes))
      const data = {
        palettes: plain,
        settings: { brightnessUpHotkey: this.brightnessUpHotkey, brightnessDownHotkey: this.brightnessDownHotkey },
      }
      window.electronAPI.invoke('savePalettes', data)
        .then(savedPath => { if (savedPath) this.palettesPath = savedPath })
        .catch(e => alert(`Failed to save palettes:\n${e?.message || e}`))
      this.registerGlobalShortcuts()
    },
  },
  async mounted() {
    try {
      const [loaded, path] = await Promise.all([
        window.electronAPI.invoke('loadPalettes'),
        window.electronAPI.invoke('getPalettesPath'),
      ])
      if (loaded) {
        const palettesData = Array.isArray(loaded) ? loaded : loaded.palettes
        const settings     = Array.isArray(loaded) ? {} : (loaded.settings || {})
        if (Array.isArray(palettesData) && palettesData.length === 10) this.palettes = palettesData
        this.brightnessUpHotkey   = settings.brightnessUpHotkey   || null
        this.brightnessDownHotkey = settings.brightnessDownHotkey || null
      }
      this.palettesPath = path
    } catch { /**/ }
    this.registerGlobalShortcuts()
    this._shortcutOff = window.electronAPI.on('shortcutTriggered', (action) => {
      if (action.type === 'palette')       this.loadPalette(action.idx)
      else if (action.type === 'brightnessUp')   this.adjustBrightness(10)
      else if (action.type === 'brightnessDown') this.adjustBrightness(-10)
    })
    this._keyHandler = this.handleKeydown.bind(this)
    document.addEventListener('keydown', this._keyHandler)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this._keyHandler)
    if (this._shortcutOff) this._shortcutOff()
  },
}
</script>

<style scoped>
.nav-tabs-dark .nav-link        { color: #aaa; border-color: transparent; }
.nav-tabs-dark .nav-link.active { color: #fff; background: #2a2a2a; border-color: #444 #444 #2a2a2a; }
.nav-tabs                       { border-bottom-color: #444; }

.palette-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.palette-card {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 6px;
}
.palette-card.palette-active { border-color: #0d6efd; }

.palette-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  min-height: 16px;
}
.palette-swatch {
  width: 8px;
  height: 8px;
  border-radius: 1px;
  border: 1px solid rgba(255,255,255,0.15);
  flex-shrink: 0;
}

.btn-xs {
  padding: 1px 5px;
  font-size: 10px;
  line-height: 1.5;
  border-radius: 3px;
}
</style>
