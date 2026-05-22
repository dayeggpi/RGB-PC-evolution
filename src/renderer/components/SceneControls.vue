<template>
  <div>
    <!-- Scene selector -->
    <div class="d-flex align-items-center gap-2 mb-2">
      <select
        class="form-select form-select-sm bg-dark text-light border-secondary"
        v-model="selectedKey"
      >
        <option value="">— choose scene —</option>
        <template v-for="cat in SCENE_CATEGORIES" :key="cat.key">
          <optgroup :label="cat.label">
            <option v-for="s in cat.scenes" :key="s.key" :value="s.key">{{ s.name }}</option>
          </optgroup>
        </template>
      </select>

      <button
        class="btn btn-sm"
        :class="isActive ? 'btn-danger' : 'btn-outline-success'"
        :disabled="!selectedKey || sending"
        @click="toggle"
      >{{ sending ? '…' : isActive ? 'Disable' : 'Enable' }}</button>
    </div>

    <!-- Active indicator -->
    <div v-if="isActive" class="text-success mb-2" style="font-size:10px">
      Active: {{ activeName }}
    </div>

    <!-- Hotkey for selected scene -->
    <div v-if="selectedKey" class="d-flex align-items-center gap-2 mb-2" style="font-size:11px">
      <span class="text-secondary">Hotkey:</span>
      <button
        class="btn btn-xs"
        :class="assigningFor === selectedKey ? 'btn-warning' : 'btn-outline-secondary'"
        @click="startAssign(selectedKey)"
      >{{ assigningFor === selectedKey ? 'Press…' : (hotkeys[selectedKey] || '+ key') }}</button>
      <button
        v-if="assigningFor === selectedKey || hotkeys[selectedKey]"
        class="btn btn-xs btn-outline-secondary"
        @click="clearHotkey(selectedKey)"
      >×</button>
    </div>

    <!-- Brightness -->
    <div class="mb-2 d-flex align-items-center gap-2">
      <span class="text-secondary" style="font-size:11px;white-space:nowrap">Brightness: {{ brightness }}%</span>
      <input
        type="range" min="1" max="100" step="1"
        class="form-range flex-grow-1"
        v-model.number="brightness"
        @change="onBrightnessChange"
        style="height:4px"
      />
    </div>

    <!-- All assigned hotkeys overview -->
    <div v-if="Object.keys(hotkeys).length" class="mb-1">
      <div class="text-secondary mb-1" style="font-size:10px">Assigned hotkeys:</div>
      <div class="d-flex flex-wrap gap-1">
        <span
          v-for="(combo, key) in hotkeys" :key="key"
          class="badge bg-secondary font-monospace"
          style="font-size:9px;cursor:pointer"
          :title="sceneName(key)"
          @click="selectedKey = key"
        >{{ sceneName(key) }}: {{ combo }}</span>
      </div>
    </div>

    <div v-if="shortcutFailed.length" class="text-warning mt-1" style="font-size:10px">
      Conflict: {{ shortcutFailed.join(', ') }} already taken.
    </div>
  </div>
</template>

<script>
import { SCENE_CATEGORIES, ALL_SCENES } from '../data/scenes.js'

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

const TURN_OFF = new Uint8Array('3301000000000000000000000000000000000032'.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)))

export default {
  name: 'SceneControls',
  props: {
    strip:           { type: Object, required: true },
    savedHotkeys:    { type: Object, default: () => ({}) },
    savedBrightness: { type: Number, default: 100 },
  },
  emits: ['hotkeys-changed', 'brightness-changed'],
  data() {
    return {
      SCENE_CATEGORIES,
      selectedKey: '',
      activeKey: null,
      sending: false,
      brightness: 100,
      assigningFor: null,
      hotkeys: {},
      shortcutFailed: [],
    }
  },
  computed: {
    isActive() { return !!this.activeKey && this.activeKey === this.selectedKey },
    activeName() { return ALL_SCENES.find(s => s.key === this.activeKey)?.name || '' },
  },
  watch: {
    savedHotkeys: {
      immediate: true,
      handler(v) {
        this.hotkeys = { ...v }
        this.registerShortcuts()
      },
    },
    savedBrightness: {
      immediate: true,
      handler(v) { this.brightness = v ?? 100 },
    },
  },
  methods: {
    sceneName(key) { return ALL_SCENES.find(s => s.key === key)?.name || key },

    async toggle() {
      if (this.isActive) {
        await this.disable()
      } else {
        await this.enable(this.selectedKey)
      }
    },

    async enable(key) {
      const scene = ALL_SCENES.find(s => s.key === key)
      if (!scene || this.sending) return
      this.sending = true
      await this.strip.setBrightness(this.brightness)
      for (const hex of scene.packets) {
        const bytes = new Uint8Array(hex.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)))
        await this.strip.sendRaw(bytes)
        await new Promise(r => setTimeout(r, 80))
      }
      this.activeKey = key
      this.sending = false
    },

    onBrightnessChange() {
      this.$emit('brightness-changed', this.brightness)
    },

    async disable() {
      this.activeKey = null
      await this.strip.sendRaw(TURN_OFF)
    },

    startAssign(key) { this.assigningFor = key },

    clearHotkey(key) {
      if (this.assigningFor === key) { this.assigningFor = null; return }
      const h = { ...this.hotkeys }
      delete h[key]
      this.hotkeys = h
      this.saveAndRegister()
    },

    async registerShortcuts() {
      const shortcuts = Object.entries(this.hotkeys).map(([key, combo]) => ({
        combo,
        action: { type: 'scene', key },
      }))
      try {
        const result = await window.electronAPI.invoke('registerGlobalShortcuts', 'scenes', shortcuts)
        this.shortcutFailed = result?.failed || []
      } catch { this.shortcutFailed = [] }
    },

    async saveAndRegister() {
      this.$emit('hotkeys-changed', { ...this.hotkeys })
      await this.registerShortcuts()
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
      if (action.type !== 'scene' || this.sending) return
      this.selectedKey = action.key
      if (this.activeKey === action.key) this.disable()
      else this.enable(action.key)
    })
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this._kb)
    if (this._off) this._off()
  },
}
</script>
