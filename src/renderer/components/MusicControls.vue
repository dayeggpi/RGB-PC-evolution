<template>
  <div>
    <!-- Style selector + on/off -->
    <div class="d-flex align-items-center gap-2 mb-2">
      <select
        class="form-select form-select-sm bg-dark text-light border-secondary"
        v-model="selectedStyleId"
        @change="onStyleChange"
      >
        <option v-for="s in MUSIC_STYLES" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <button
        class="btn btn-sm"
        :class="isOn ? 'btn-danger' : 'btn-outline-success'"
        @click="toggleOn"
      >{{ isOn ? 'Off' : 'On' }}</button>
      <button
        v-if="isOn && isDirty"
        class="btn btn-sm btn-outline-warning"
        @click="save"
      >Save</button>
    </div>

    <!-- Hotkey for selected style -->
    <div class="d-flex align-items-center gap-2 mb-2" style="font-size:11px">
      <span class="text-secondary">Hotkey:</span>
      <button
        class="btn btn-xs"
        :class="assigningFor === selectedStyleId ? 'btn-warning' : 'btn-outline-secondary'"
        @click="startAssign(selectedStyleId)"
      >{{ assigningFor === selectedStyleId ? 'Press…' : (hotkeys[selectedStyleId] || '+ key') }}</button>
      <button
        v-if="assigningFor === selectedStyleId || hotkeys[selectedStyleId]"
        class="btn btn-xs btn-outline-secondary"
        @click="clearHotkey(selectedStyleId)"
      >×</button>
    </div>

    <!-- Style-specific options -->
    <div class="d-flex align-items-center gap-3 mb-2 flex-wrap" style="font-size:11px">
      <label class="d-flex align-items-center gap-1 text-light" style="cursor:pointer">
        <input type="checkbox" v-model="heavyBass" @change="markDirty" />
        Heavy Bass
      </label>
      <template v-if="currentStyle?.hasCalm">
        <span class="text-secondary">Mode:</span>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-xs" :class="rhythmMode==='dynamic'?'btn-primary':'btn-outline-secondary'" @click="rhythmMode='dynamic'; markDirty()">Dynamic</button>
          <button class="btn btn-xs" :class="rhythmMode==='calm'?'btn-primary':'btn-outline-secondary'" @click="rhythmMode='calm'; markDirty()">Calm</button>
        </div>
      </template>
      <template v-if="currentStyle?.hasWindmill">
        <span class="text-secondary">Direction:</span>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-xs" :class="windmillDir==='clockwise'?'btn-primary':'btn-outline-secondary'" @click="windmillDir='clockwise'; markDirty()">CW</button>
          <button class="btn btn-xs" :class="windmillDir==='counterclockwise'?'btn-primary':'btn-outline-secondary'" @click="windmillDir='counterclockwise'; markDirty()">CCW</button>
        </div>
      </template>
    </div>

    <!-- Sensitivity -->
    <div class="mb-2 d-flex align-items-center gap-2">
      <span class="text-secondary" style="font-size:11px;white-space:nowrap">Sensitivity: {{ sensitivity }}%</span>
      <input
        type="range" min="0" max="100" step="1"
        class="form-range flex-grow-1"
        v-model.number="sensitivity"
        @change="markDirty"
        style="height:4px"
      />
    </div>

    <!-- Brightness -->
    <div class="mb-2 d-flex align-items-center gap-2">
      <span class="text-secondary" style="font-size:11px;white-space:nowrap">Brightness: {{ brightness }}%</span>
      <input
        type="range" min="1" max="100" step="1"
        class="form-range flex-grow-1"
        v-model.number="brightness"
        @change="markDirty"
        style="height:4px"
      />
    </div>

    <!-- Colors (2-8) -->
    <div class="mb-2">
      <div class="d-flex align-items-center gap-2 mb-1">
        <span class="text-secondary" style="font-size:11px">Colors ({{ colors.length }}/8):</span>
        <button v-if="colors.length < 8" class="btn btn-xs btn-outline-secondary" @click="addColor">+ Add</button>
      </div>
      <div class="d-flex gap-1 flex-wrap">
        <div v-for="(col, idx) in colors" :key="idx" class="d-flex align-items-center gap-1">
          <input
            type="color"
            :value="col"
            @input="setColor(idx, $event.target.value)"
            class="form-control form-control-color form-control-sm"
            style="width:28px;height:22px;padding:1px 2px;cursor:pointer"
          />
          <button
            v-if="colors.length > 2"
            class="btn btn-xs btn-outline-secondary"
            @click="removeColor(idx)"
            style="padding:0 4px;font-size:10px"
          >×</button>
        </div>
      </div>
    </div>

    <!-- Assigned hotkeys overview -->
    <div v-if="Object.keys(hotkeys).length" class="mb-1">
      <div class="text-secondary mb-1" style="font-size:10px">Assigned hotkeys:</div>
      <div class="d-flex flex-wrap gap-1">
        <span
          v-for="(combo, styleId) in hotkeys" :key="styleId"
          class="badge bg-secondary font-monospace"
          style="font-size:9px;cursor:pointer"
          :title="styleName(styleId)"
          @click="selectedStyleId = styleId"
        >{{ styleName(styleId) }}: {{ combo }}</span>
      </div>
    </div>

    <div v-if="shortcutFailed.length" class="text-warning" style="font-size:10px">
      Conflict: {{ shortcutFailed.join(', ') }} already taken.
    </div>
  </div>
</template>

<script>
import { MUSIC_STYLES, buildMusicPackets } from '../data/music.js'

function formatHotkey(e) {
  if (['Control','Alt','Shift','Meta'].includes(e.key)) return null
  const parts = []
  if (e.ctrlKey)  parts.push('Ctrl')
  if (e.altKey)   parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey)  parts.push('Meta')
  parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)
  return parts.join('+')
}

const TURN_OFF = new Uint8Array(
  '3301000000000000000000000000000000000032'.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16))
)

export default {
  name: 'MusicControls',
  props: {
    strip:              { type: Object, required: true },
    savedHotkeys:       { type: Object, default: () => ({}) },
    savedStyleSettings: { type: Object, default: () => ({}) },
  },
  emits: ['hotkeys-changed', 'settings-changed'],
  data() {
    return {
      MUSIC_STYLES,
      selectedStyleId: 'rhythm',
      prevStyleId: 'rhythm',
      isOn: false,
      isDirty: false,
      activating: false,
      heavyBass: false,
      rhythmMode: 'dynamic',
      windmillDir: 'clockwise',
      sensitivity: 100,
      brightness: 100,
      colors: [...MUSIC_STYLES[0].defaultColors],
      hotkeys: {},
      styleSettings: {},
      assigningFor: null,
      shortcutFailed: [],
    }
  },
  computed: {
    currentStyle() { return MUSIC_STYLES.find(s => s.id === this.selectedStyleId) || null },
    styleOption() {
      if (this.currentStyle?.hasCalm)     return this.rhythmMode === 'calm' ? 1 : 0
      if (this.currentStyle?.hasWindmill) return this.windmillDir === 'counterclockwise' ? 3 : 2
      return 0
    },
  },
  watch: {
    savedHotkeys: {
      immediate: true,
      handler(v) {
        this.hotkeys = { ...v }
        this.registerShortcuts()
      },
    },
    savedStyleSettings: {
      immediate: true,
      handler(v) {
        this.styleSettings = { ...v }
        const saved = v[this.selectedStyleId]
        if (saved) {
          this.colors      = [...saved.colors]
          this.heavyBass   = saved.heavyBass   ?? false
          this.rhythmMode  = saved.rhythmMode  ?? 'dynamic'
          this.windmillDir = saved.windmillDir ?? 'clockwise'
          this.sensitivity = saved.sensitivity ?? 100
          this.brightness  = saved.brightness  ?? 100
        }
      },
    },
  },
  methods: {
    styleName(id) { return MUSIC_STYLES.find(s => s.id === id)?.name || id },

    onStyleChange() {
      this._saveCurrentStyle(this.prevStyleId)
      this.prevStyleId = this.selectedStyleId
      const saved = this.styleSettings[this.selectedStyleId]
      if (saved) {
        this.colors      = [...saved.colors]
        this.heavyBass   = saved.heavyBass   ?? false
        this.rhythmMode  = saved.rhythmMode  ?? 'dynamic'
        this.windmillDir = saved.windmillDir ?? 'clockwise'
        this.sensitivity = saved.sensitivity ?? 100
        this.brightness  = saved.brightness  ?? 100
      } else {
        if (this.currentStyle) this.colors = [...this.currentStyle.defaultColors]
        this.heavyBass   = false
        this.rhythmMode  = 'dynamic'
        this.windmillDir = 'clockwise'
        this.sensitivity = 100
        this.brightness  = 100
      }
      this.isDirty = false
      this.isOn = false
    },

    markDirty() { this.isDirty = true },

    async toggleOn() {
      if (this.activating) return
      if (this.isOn) {
        this.isOn = false
        this.isDirty = false
        await this.strip.sendRaw(TURN_OFF)
      } else {
        this.activating = true
        await this.sendPackets()
        this.isOn = true
        this.isDirty = false
        this.activating = false
      }
    },

    async save() {
      this.isDirty = false
      this._saveCurrentStyle(this.selectedStyleId)
      this.$emit('settings-changed', { ...this.styleSettings })
      await this.sendPackets()
    },

    async sendPackets() {
      if (!this.currentStyle) return
      await this.strip.setBrightness(this.brightness)
      const pkts = buildMusicPackets(
        this.currentStyle.styleId,
        this.colors,
        this.heavyBass,
        this.styleOption,
        this.sensitivity,
      )
      for (const pkt of pkts) {
        await this.strip.sendRaw(pkt)
        await new Promise(r => setTimeout(r, 80))
      }
    },

    _saveCurrentStyle(styleId) {
      if (!styleId) return
      this.styleSettings = {
        ...this.styleSettings,
        [styleId]: {
          colors:      [...this.colors],
          heavyBass:   this.heavyBass,
          rhythmMode:  this.rhythmMode,
          windmillDir: this.windmillDir,
          sensitivity: this.sensitivity,
          brightness:  this.brightness,
        },
      }
    },

    addColor() {
      if (this.colors.length < 8) { this.colors = [...this.colors, '#ffffff']; this.markDirty() }
    },
    removeColor(idx) {
      if (this.colors.length > 2) { const c=[...this.colors]; c.splice(idx,1); this.colors=c; this.markDirty() }
    },
    setColor(idx, val) {
      const c = [...this.colors]; c[idx] = val; this.colors = c; this.markDirty()
    },

    startAssign(styleId) { this.assigningFor = styleId },

    clearHotkey(styleId) {
      if (this.assigningFor === styleId) { this.assigningFor = null; return }
      const h = { ...this.hotkeys }
      delete h[styleId]
      this.hotkeys = h
      this.saveAndRegister()
    },

    async registerShortcuts() {
      const shortcuts = Object.entries(this.hotkeys).map(([styleId, combo]) => ({
        combo,
        action: { type: 'music', styleId },
      }))
      try {
        const result = await window.electronAPI.invoke('registerGlobalShortcuts', 'music', shortcuts)
        this.shortcutFailed = result?.failed || []
      } catch { this.shortcutFailed = [] }
    },

    async saveAndRegister() {
      this._saveCurrentStyle(this.selectedStyleId)
      this.$emit('hotkeys-changed', { ...this.hotkeys })
      this.$emit('settings-changed', { ...this.styleSettings })
      await this.registerShortcuts()
    },

    async activateStyle(styleId) {
      if (this.activating) return
      const style = MUSIC_STYLES.find(s => s.id === styleId)
      if (!style) return
      if (this.isOn && this.selectedStyleId === styleId) {
        this.isOn = false
        this.isDirty = false
        await this.strip.sendRaw(TURN_OFF)
      } else {
        const saved = this.styleSettings[styleId] || {}
        this.prevStyleId     = styleId
        this.selectedStyleId = styleId
        this.colors      = [...(saved.colors || style.defaultColors)]
        this.heavyBass   = saved.heavyBass   ?? false
        this.rhythmMode  = saved.rhythmMode  ?? 'dynamic'
        this.windmillDir = saved.windmillDir ?? 'clockwise'
        this.sensitivity = saved.sensitivity ?? 100
        this.brightness  = saved.brightness  ?? 100
        this.isDirty = false
        this.activating = true
        await this.sendPackets()
        this.isOn = true
        this.activating = false
      }
    },

    _keyHandler(e) {
      if (!this.assigningFor) return
      if (e.key === 'Escape') { this.assigningFor = null; return }
      const combo = formatHotkey(e)
      if (!combo) return
      e.preventDefault()
      this.hotkeys = { ...this.hotkeys, [this.assigningFor]: combo }
      this.assigningFor = null
      this.saveAndRegister()
    },
  },
  mounted() {
    this._kb = this._keyHandler.bind(this)
    document.addEventListener('keydown', this._kb)
    this._off = window.electronAPI.on('shortcutTriggered', (action) => {
      if (action.type === 'music' && !this.activating) this.activateStyle(action.styleId)
    })
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this._kb)
    if (this._off) this._off()
  },
}
</script>
