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
        <li class="nav-item">
          <a class="nav-link" :class="{active: tab==='scenes'}" href="#" @click.prevent="tab='scenes'">Scenes</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" :class="{active: tab==='music'}" href="#" @click.prevent="tab='music'">Music</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" :class="{active: tab==='schemes'}" href="#" @click.prevent="tab='schemes'">Schemes</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" :class="{active: tab==='ambilight'}" href="#" @click.prevent="tab='ambilight'">Ambilight</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" :class="{active: tab==='debug'}" href="#" @click.prevent="tab='debug'">Debug</a>
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
          <div class="d-flex align-items-center gap-2 mt-1 flex-wrap">
            <span class="text-secondary" style="font-size:10px">Light shortcuts:</span>
            <div class="d-flex align-items-center gap-1">
              <span class="text-secondary" style="font-size:10px">On</span>
              <button
                class="btn btn-xs"
                :class="assigningLightFor==='on' ? 'btn-warning' : 'btn-outline-secondary'"
                @click="startAssignLightHotkey('on')"
              >{{ assigningLightFor==='on' ? 'Press…' : (lightOnHotkey || '+ key') }}</button>
              <button
                v-if="assigningLightFor==='on' || lightOnHotkey"
                class="btn btn-xs btn-outline-secondary"
                @click="cancelOrClearLightHotkey('on')"
              >×</button>
            </div>
            <div class="d-flex align-items-center gap-1">
              <span class="text-secondary" style="font-size:10px">Off</span>
              <button
                class="btn btn-xs"
                :class="assigningLightFor==='off' ? 'btn-warning' : 'btn-outline-secondary'"
                @click="startAssignLightHotkey('off')"
              >{{ assigningLightFor==='off' ? 'Press…' : (lightOffHotkey || '+ key') }}</button>
              <button
                v-if="assigningLightFor==='off' || lightOffHotkey"
                class="btn btn-xs btn-outline-secondary"
                @click="cancelOrClearLightHotkey('off')"
              >×</button>
            </div>
          </div>
        </div>
        <div v-if="shortcutFailed.length" class="mt-2 text-warning" style="font-size:10px">
          Shortcut conflict (already taken by another app): {{ shortcutFailed.join(', ') }}. Choose a different combo.
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
              <button class="btn btn-xs btn-outline-secondary" @click="confirmSaveToPalette(idx)">Save</button>
              <button class="btn btn-xs btn-outline-danger"    @click="confirmClearPalette(idx)">Clear</button>
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

      <!-- ── SCENES TAB ── kept mounted (v-show) so global shortcuts stay registered -->
      <div v-show="tab==='scenes'">
        <SceneControls :strip="strip" :saved-hotkeys="sceneHotkeys" @hotkeys-changed="onSceneHotkeys" />
      </div>

      <!-- ── MUSIC TAB ── kept mounted (v-show) so global shortcuts stay registered -->
      <div v-show="tab==='music'">
        <MusicControls :strip="strip" :saved-hotkeys="musicHotkeys" @hotkeys-changed="onMusicHotkeys" />
      </div>

      <!-- ── SCHEMES TAB ── -->
      <div v-if="tab==='schemes'">
        <ColorSchemeControls :strip="strip" />
      </div>

      <!-- ── AMBILIGHT TAB ── -->
      <div v-if="tab==='ambilight'">
        <LightSync :strip="strip" :inline="true" />
      </div>

      <!-- ── DEBUG TAB ── -->
      <div v-if="tab==='debug'">
        <p class="text-secondary small mb-2">
          Send raw BT packets. Checksum auto-appended if missing (XOR = 0 check). Supports plain hex,
          <code>0xNN, ...</code> format, and tokens <code>RED</code> <code>GREEN</code> <code>BLUE</code> <code>XOR</code>.
        </p>
        <div class="d-flex align-items-center gap-2 mb-2">
          <label class="form-label text-light small mb-0">Color for RED/GREEN/BLUE tokens</label>
          <input type="color" class="form-control form-control-color form-control-sm" v-model="debugColor" style="width:36px;height:24px;padding:1px 2px" />
          <span class="font-monospace text-secondary" style="font-size:10px">{{ debugColor }}</span>
        </div>
        <div class="mb-2">
          <div class="d-flex gap-2">
            <input
              type="text"
              class="form-control form-control-sm bg-dark text-light border-secondary font-monospace"
              v-model="debugPacket"
              placeholder="3305040100000000000000000000000000000033"
              @keydown.enter="sendDebugPacket"
              spellcheck="false"
            />
            <button class="btn btn-sm btn-outline-warning" @click="sendDebugPacket" :disabled="!debugPacket.trim()">
              Send
            </button>
          </div>
        </div>
        <div class="mb-2">
          <label class="form-label text-light small mb-1">Batch (one instruction per line, # = comment)</label>
          <textarea
            class="form-control form-control-sm bg-dark text-light border-secondary font-monospace mb-1"
            v-model="batchPackets"
            rows="4"
            placeholder="3301010000000000000000000000000000000033&#10;aa010000000000000000000000000000000000ab&#10;3305040100000000000000000000000000000033"
            spellcheck="false"
            style="resize:vertical;font-size:11px"
          ></textarea>
          <button
            class="btn btn-sm btn-outline-info"
            @click="sendBatchPackets"
            :disabled="!batchPackets.trim() || batchRunning"
          >{{ batchRunning ? 'Sending…' : 'Send Batch' }}</button>
        </div>
        <div class="d-flex gap-1 flex-wrap mb-2">
          <button class="btn btn-xs btn-outline-secondary" @click="debugPacket='3301010000000000000000000000000000000033'">On</button>
          <button class="btn btn-xs btn-outline-secondary" @click="debugPacket='3301000000000000000000000000000000000032'">Off</button>
          <button class="btn btn-xs btn-outline-secondary" @click="debugPacket='aa010000000000000000000000000000000000ab'">KeepAlive</button>
        </div>
        <div v-if="debugLog.length" class="debug-log">
          <div
            v-for="(entry, i) in debugLog"
            :key="i"
            class="debug-entry"
            :class="entry.ok ? 'text-success' : 'text-danger'"
          >
            <div class="d-flex align-items-baseline gap-1">
              <span class="text-secondary" style="font-size:9px;flex-shrink:0">{{ entry.ts }}</span>
              <span>{{ entry.ok ? '✓' : '✗' }}</span>
              <span v-if="entry.hex" class="font-monospace debug-hex text-info">{{ entry.hex }}</span>
              <span v-if="!entry.ok" class="text-danger" style="font-size:9px">{{ entry.error }}</span>
            </div>
            <div v-if="entry.hex && entry.raw.replace(/\s/g,'').toLowerCase() !== entry.hex.replace(/\s/g,'')" class="text-secondary font-monospace" style="font-size:9px;padding-left:1em">↳ {{ entry.raw }}</div>
          </div>
        </div>
        <div v-if="debugLog.length" class="mt-1">
          <button class="btn btn-xs btn-outline-secondary" @click="debugLog=[]">Clear log</button>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import SegmentDiagram from './SegmentDiagram.vue'
import SceneControls from './SceneControls.vue'
import MusicControls from './MusicControls.vue'
import ColorSchemeControls from './ColorSchemeControls.vue'
import LightSync from './LightSync.vue'
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
  components: { SegmentDiagram, SceneControls, MusicControls, ColorSchemeControls, LightSync },
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
    lightOnHotkey:          null,
    lightOffHotkey:         null,
    assigningLightFor:      null,
    palettesPath:           null,
    debugPacket:            '',
    debugColor:             '#ff0000',
    debugLog:               [],
    batchPackets:           '',
    batchRunning:           false,
    shortcutFailed:         [],
    sceneHotkeys:           {},
    musicHotkeys:           {},
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
    parseDebugPacket(rawInput, hexColor) {
      const input = rawInput.trim().replace(/^\(|\)$/g, '')
      const r = parseInt(hexColor.slice(1, 3), 16)
      const g = parseInt(hexColor.slice(3, 5), 16)
      const b = parseInt(hexColor.slice(5, 7), 16)
      const bytes = []
      let hasXorToken = false

      if (/0x[0-9a-f]/i.test(input) || /\b(RED|GREEN|BLUE|XOR)\b/.test(input)) {
        for (const token of input.split(',').map(t => t.trim()).filter(Boolean)) {
          const up = token.toUpperCase()
          if (up === 'RED')   { bytes.push(r); continue }
          if (up === 'GREEN') { bytes.push(g); continue }
          if (up === 'BLUE')  { bytes.push(b); continue }
          if (up === 'XOR') {
            hasXorToken = true
            bytes.push(bytes.reduce((a, x) => a ^ x, 0))
            continue
          }
          const clean = token.replace(/^0x/i, '')
          if (!/^[0-9a-f]{1,2}$/i.test(clean)) throw new Error(`Unknown token: "${token}"`)
          bytes.push(parseInt(clean, 16))
        }
      } else {
        const clean = input.replace(/\s/g, '')
        if (!/^[0-9a-f]+$/i.test(clean) || clean.length % 2 !== 0)
          throw new Error('Invalid hex — must be even-length hex string')
        for (const pair of clean.match(/[\da-f]{2}/gi)) bytes.push(parseInt(pair, 16))
      }

      if (!hasXorToken) {
        const xor = bytes.reduce((a, x) => a ^ x, 0)
        if (xor !== 0) bytes.push(xor)
      }

      return new Uint8Array(bytes)
    },

    async sendDebugPacket() {
      const raw = this.debugPacket.trim()
      if (!raw) return
      const ts = new Date().toLocaleTimeString('en-GB', { hour12: false })
      let bytes
      try {
        bytes = this.parseDebugPacket(raw, this.debugColor)
      } catch (e) {
        this.debugLog.unshift({ ts, raw, hex: null, ok: false, error: e.message })
        return
      }
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ')
      try {
        await this.strip.sendRaw(bytes)
        this.debugLog.unshift({ ts, raw, hex, ok: true })
      } catch (e) {
        this.debugLog.unshift({ ts, raw, hex, ok: false, error: e.message })
      }
    },

    async sendBatchPackets() {
      const lines = this.batchPackets.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
      if (!lines.length || this.batchRunning) return
      this.batchRunning = true
      for (const line of lines) {
        const ts = new Date().toLocaleTimeString('en-GB', { hour12: false })
        let bytes
        try {
          bytes = this.parseDebugPacket(line, this.debugColor)
        } catch (e) {
          this.debugLog.unshift({ ts, raw: line, hex: null, ok: false, error: e.message })
          continue
        }
        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ')
        try {
          await this.strip.sendRaw(bytes)
          this.debugLog.unshift({ ts, raw: line, hex, ok: true })
        } catch (e) {
          this.debugLog.unshift({ ts, raw: line, hex, ok: false, error: e.message })
        }
        await new Promise(r => setTimeout(r, 150))
      }
      this.batchRunning = false
    },

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

    confirmSaveToPalette(idx) {
      const name = this.palettes[idx].name || `Palette ${idx + 1}`
      if (!confirm(`Overwrite "${name}" with current colors?`)) return
      this.saveToPalette(idx)
    },

    confirmClearPalette(idx) {
      const name = this.palettes[idx].name || `Palette ${idx + 1}`
      if (!confirm(`Clear "${name}"? This cannot be undone.`)) return
      this.clearPalette(idx)
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
        return
      }
      if (this.assigningLightFor !== null) {
        if (e.key === 'Escape') { this.assigningLightFor = null; return }
        const combo = formatHotkey(e)
        if (!combo) return
        e.preventDefault()
        if (this.assigningLightFor === 'on') this.lightOnHotkey = combo
        else this.lightOffHotkey = combo
        this.assigningLightFor = null
        this.savePalettes()
      }
    },

    async registerGlobalShortcuts() {
      const shortcuts = []
      this.palettes.forEach((p, idx) => {
        if (p.hotkey) shortcuts.push({ combo: p.hotkey, action: { type: 'palette', idx } })
      })
      if (this.brightnessUpHotkey)   shortcuts.push({ combo: this.brightnessUpHotkey,   action: { type: 'brightnessUp'   } })
      if (this.brightnessDownHotkey) shortcuts.push({ combo: this.brightnessDownHotkey, action: { type: 'brightnessDown' } })
      if (this.lightOnHotkey)        shortcuts.push({ combo: this.lightOnHotkey,         action: { type: 'lightOn'        } })
      if (this.lightOffHotkey)       shortcuts.push({ combo: this.lightOffHotkey,        action: { type: 'lightOff'       } })
      try {
        const result = await window.electronAPI.invoke('registerGlobalShortcuts', 'controls', shortcuts)
        this.shortcutFailed = result?.failed || []
      } catch { this.shortcutFailed = [] }
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

    startAssignLightHotkey(dir) {
      this.assigningLightFor = dir
    },

    cancelOrClearLightHotkey(dir) {
      if (this.assigningLightFor === dir) {
        this.assigningLightFor = null
      } else {
        if (dir === 'on') this.lightOnHotkey = null
        else this.lightOffHotkey = null
        this.savePalettes()
      }
    },

    onSceneHotkeys(hotkeys) {
      this.sceneHotkeys = hotkeys
      this.saveHotkeySettings()
    },

    onMusicHotkeys(hotkeys) {
      this.musicHotkeys = hotkeys
      this.saveHotkeySettings()
    },

    async saveHotkeySettings() {
      let current = {}
      try {
        const loaded = await window.electronAPI.invoke('loadPalettes')
        if (loaded && !Array.isArray(loaded)) current = loaded.settings || {}
      } catch {}
      try {
        const data = {
          palettes: this.palettes,
          settings: { ...current, sceneHotkeys: this.sceneHotkeys, musicHotkeys: this.musicHotkeys },
        }
        await window.electronAPI.invoke('savePalettes', JSON.parse(JSON.stringify(data)))
      } catch {}
    },

    async savePalettes() {
      // JSON round-trip strips Vue Proxy wrappers before structured-clone over IPC
      const plain = JSON.parse(JSON.stringify(this.palettes))
      // Always re-read current settings so we don't overwrite fields we don't own (e.g. syncMapping written by LightSync)
      let currentSettings = {}
      try {
        const current = await window.electronAPI.invoke('loadPalettes')
        if (current && !Array.isArray(current)) currentSettings = current.settings || {}
      } catch { /* ignore — proceed with empty base */ }
      const data = {
        palettes: plain,
        settings: {
          ...currentSettings,
          brightnessUpHotkey:   this.brightnessUpHotkey,
          brightnessDownHotkey: this.brightnessDownHotkey,
          lightOnHotkey:        this.lightOnHotkey,
          lightOffHotkey:       this.lightOffHotkey,
          sceneHotkeys:         this.sceneHotkeys,
          musicHotkeys:         this.musicHotkeys,
        },
      }
      try {
        const savedPath = await window.electronAPI.invoke('savePalettes', JSON.parse(JSON.stringify(data)))
        if (savedPath) this.palettesPath = savedPath
      } catch (e) {
        alert(`Failed to save palettes:\n${e?.message || e}`)
      }
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
        this.lightOnHotkey        = settings.lightOnHotkey        || null
        this.lightOffHotkey       = settings.lightOffHotkey       || null
        this.sceneHotkeys         = settings.sceneHotkeys         || {}
        this.musicHotkeys         = settings.musicHotkeys         || {}
      }
      this.palettesPath = path
    } catch { /**/ }
    this.registerGlobalShortcuts()
    this._shortcutOff = window.electronAPI.on('shortcutTriggered', (action) => {
      if      (action.type === 'palette')       this.loadPalette(action.idx)
      else if (action.type === 'brightnessUp')  this.adjustBrightness(10)
      else if (action.type === 'brightnessDown') this.adjustBrightness(-10)
      else if (action.type === 'lightOn')       this.turnOn()
      else if (action.type === 'lightOff')      this.turnOff()
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

.debug-log {
  max-height: 180px;
  overflow-y: auto;
  background: #111;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 4px 6px;
}
.debug-entry {
  font-size: 10px;
  line-height: 1.6;
  border-bottom: 1px solid #222;
  padding: 1px 0;
  word-break: break-all;
}
.debug-entry:last-child { border-bottom: none; }
.debug-hex { opacity: 0.85; margin-left: 4px; }
</style>
