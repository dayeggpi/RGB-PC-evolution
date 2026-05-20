<template>
  <div class="container-fluid mt-3 px-3">
    <h4 class="text-center rainbow rainbow_text_animated mb-3">Govee H604A Control</h4>

    <!-- Connection bar -->
    <div class="connection-bar d-flex align-items-center gap-2 mb-3 p-2 rounded bg-dark">
      <span class="status-dot" :class="statusClass" :title="statusLabel"></span>
      <span class="text-light small">{{ statusLabel }}</span>
      <span v-if="strip" class="text-secondary small">— {{ strip.device.name }}</span>
      <span
        v-if="strip && realMac"
        class="text-secondary small font-monospace ms-1"
        :title="macCopied ? 'Copied!' : 'Click to copy MAC'"
        style="cursor:pointer; opacity:0.6"
        @click="copyMac"
      >{{ realMac }}</span>
      <div class="ms-auto d-flex gap-2 align-items-center">
        <button
          v-if="!strip"
          @click="scan"
          class="btn btn-sm btn-primary"
          :disabled="scanning"
        >{{ scanning ? 'Scanning…' : 'Scan' }}</button>
        <button
          v-if="strip"
          @click="disconnect"
          class="btn btn-sm btn-outline-danger"
        >Disconnect</button>
      </div>
    </div>

    <!-- Device list (shown when scanning returns devices, before connect) -->
    <div v-if="devices.length && !strip" class="mb-3">
      <label class="form-label text-light small">Select device:</label>
      <div class="d-flex gap-2 align-items-center">
        <select class="form-select form-select-sm bg-dark text-light border-secondary" v-model="selectedDeviceId">
          <option value="">— choose —</option>
          <option v-for="d in devices" :key="d.deviceId" :value="d.deviceId">
            {{ d.deviceName || d.deviceId }}
          </option>
        </select>
        <button class="btn btn-sm btn-success" @click="connectSelected" :disabled="!selectedDeviceId">
          Connect
        </button>
      </div>
    </div>

    <template v-if="strip">
      <LightControls :strip="strip" />
    </template>
  </div>
</template>

<script>
import LightControls from './components/LightControls.vue'
import Strip from './models/Strip'

const { electronAPI } = window
const LAST_DEVICE_KEY = 'govee_last_device'

export default {
  name: 'App',
  components: { LightControls },
  data: () => ({
    devices: [],
    selectedDeviceId: '',
    strip: null,
    scanning: false,
    connected: false,
    macCopied: false,
    realMac: null,
  }),
  computed: {
    statusClass() {
      if (this.strip && this.connected) return 'dot-green'
      if (this.scanning) return 'dot-yellow'
      return 'dot-red'
    },
    statusLabel() {
      if (this.strip && this.connected) return 'Connected'
      if (this.scanning) return 'Scanning…'
      return 'Disconnected'
    },
  },
  methods: {
    async scan() {
      this.devices = []
      this.selectedDeviceId = ''
      this.scanning = true
      try {
        const device = await navigator.bluetooth.requestDevice({
          optionalServices: [
            'f000ffc0-0451-4000-b000-000000000000',
            '00010203-0405-0607-0809-0a0b0c0d1910',
            '00001800-0000-1000-8000-00805f9b34fb',
          ],
          acceptAllDevices: true,
        })
        this.createStrip(device)
      } catch (e) {
        console.log('[scan] cancelled or failed', e)
      }
      this.scanning = false
    },
    connectSelected() {
      this.realMac = this.selectedDeviceId
      electronAPI.send('deviceSelected', this.selectedDeviceId)
    },
    createStrip(device) {
      const strip = new Strip(device)
      window.strip = strip
      this.strip = strip
      this.connected = true
      if (!this.realMac) {
        const found = this.devices.find(d => d.deviceName === device.name)
        this.realMac = found ? found.deviceId : null
      }
      localStorage.setItem(LAST_DEVICE_KEY, JSON.stringify({
        id: this.realMac || device.id,
        name: device.name,
      }))
      // Watch for disconnection
      device.addEventListener('gattserverdisconnected', () => {
        this.connected = false
      })
      device.addEventListener('gattserverconnected', () => {
        this.connected = true
      })
    },
    copyMac() {
      navigator.clipboard.writeText(this.realMac || this.strip.device.id)
      this.macCopied = true
      setTimeout(() => { this.macCopied = false }, 1500)
    },
    disconnect() {
      if (this.strip?.server?.connected) {
        this.strip.server.disconnect()
      }
      this.strip = null
      this.connected = false
      this.scanning = false
      this.devices = []
      this.selectedDeviceId = ''
      this.realMac = null
      window.strip = null
    },
  },
  mounted() {
    // When main process finds devices via select-bluetooth-device event
    electronAPI.on('deviceList', (devices) => {
      this.devices = devices
      if (!devices.length) return

      // Auto-connect if last device is in list
      const saved = localStorage.getItem(LAST_DEVICE_KEY)
      if (saved) {
        try {
          const { id, name } = JSON.parse(saved)
          const match = devices.find(d => d.deviceId === id) || devices.find(d => d.deviceName === name)
          if (match) {
            this.selectedDeviceId = match.deviceId
            this.realMac = match.deviceId
            electronAPI.send('deviceSelected', match.deviceId)
            return
          }
        } catch { /**/ }
      }

      // No saved match — pre-select first device so Connect is immediately enabled
      if (!this.selectedDeviceId) {
        this.selectedDeviceId = devices[0].deviceId
      }
    })
  },
}
</script>

<style>
body {
  background: #1a1a1a;
  color: #e0e0e0;
}

.connection-bar {
  border: 1px solid #333;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.dot-green  { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
.dot-yellow { background: #eab308; box-shadow: 0 0 6px #eab308; }
.dot-red    { background: #ef4444; }

.rainbow_text_animated {
  background: linear-gradient(to right, #6666ff, #0099ff, #00ff00, #ff3399, #6666ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: rainbow_animation 3s ease-in-out infinite;
  background-size: 400% 100%;
}

@keyframes rainbow_animation {
  0%, 100% { background-position: 0 0; }
  50%       { background-position: 100% 0; }
}

.form-select option {
  background: #2a2a2a;
}
</style>
