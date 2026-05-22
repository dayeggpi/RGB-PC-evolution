class AudioSync {
  constructor(strip) {
    this.strip = strip
    this.ctx = null
    this.analyser = null
    this.stream = null
    this.running = false
    this._pending = false
    this.effect = 'energetic'
    this.sensitivity = 80
    this.level = 0

    // Beat state — updated by _detectBeat(), used by effects via _fade()
    this._beatTime = 0
    this._beatHue = 0
    this._rollAccum = 0   // fractional accumulator so rolling speed is continuous

    // Circular buffer of bass energy for dynamic beat threshold
    this._energyBuf = new Float32Array(43).fill(50)
    this._energyIdx = 0
    this._freqBuf = null  // allocated once after analyser is ready
  }

  async start(deviceId) {
    this.stop()
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false,
    })
    this.ctx = new AudioContext()
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 512
    // 0.4: smooth enough for nice visuals, fast enough to catch transients
    this.analyser.smoothingTimeConstant = 0.4
    this.ctx.createMediaStreamSource(this.stream).connect(this.analyser)
    this.running = true
    this._schedule()
  }

  stop() {
    this.running = false
    this.stream?.getTracks().forEach(t => t.stop())
    this.ctx?.close().catch(() => {})
    this.stream = this.ctx = this.analyser = this._freqBuf = null
    this.level = 0
  }

  _schedule() {
    if (!this.running) return
    setTimeout(() => {
      if (!this.running) return
      if (this.analyser) {
        if (!this._freqBuf) this._freqBuf = new Uint8Array(this.analyser.frequencyBinCount)
        const freq = this._freqBuf
        this.analyser.getByteFrequencyData(freq)
        // Level for UI indicator — always updated
        this.level = Math.min(1, this._avg(freq, 0, freq.length) / 75)
        // Beat detection always runs at full 25fps regardless of BLE queue
        this._detectBeat(freq)
        // Visual update only when BLE queue is free
        if (!this._pending) {
          this._pending = true
          this._apply(freq).catch(console.warn).finally(() => { this._pending = false })
        }
      }
      this._schedule()
    }, 40)
  }

  // Dynamic threshold: beat fires when bass spikes notably above recent average.
  // Sensitivity scales how easily the threshold is cleared.
  _detectBeat(freq) {
    const bass = this._avg(freq, 0, 10)
    this._energyBuf[this._energyIdx++ % 43] = bass
    const avg = this._energyBuf.reduce((a, b) => a + b, 0) / 43
    const s = this.sensitivity / 40   // 40% → 1x, 80% → 2x, 160% → 4x
    const threshold = avg * Math.max(1.1, 1.7 / Math.min(s, 3))
    if (bass > threshold && bass > 15 && (Date.now() - this._beatTime) > 120) {
      this._beatTime = Date.now()
      this._beatHue = (this._beatHue + 60 + Math.random() * 60) % 360
    }
  }

  // 1.0 right after a beat, decays linearly to 0 over `ms` milliseconds
  _fade(ms) {
    return Math.max(0, 1 - (Date.now() - this._beatTime) / ms)
  }

  async _apply(freq) {
    const s = this.sensitivity / 40
    switch (this.effect) {
      case 'energetic':  return this._energetic(freq, s)
      case 'spectrum':   return this._spectrum(freq, s)
      case 'rhythm':     return this._rhythm(freq, s)
      case 'rolling':    return this._rolling(freq, s)
      case 'separation': return this._separation(freq, s)
    }
  }

  _avg(arr, a, b) {
    let sum = 0; for (let i = a; i < b; i++) sum += arr[i]; return sum / (b - a)
  }

  _hsl(h, sl, l) {
    sl /= 100; l /= 100
    const k = n => (n + h / 30) % 12
    const a = sl * Math.min(l, 1 - l)
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
  }

  // Continuously cycling hue wave, brightness surges on beat
  async _energetic(freq, s) {
    const bass = this._avg(freq, 0, 10)
    const ambient   = Math.min(0.65, (bass / 255) * s)   // always-on bass glow
    const beatBurst = this._fade(260) * 0.55              // beat pulse on top
    const brightness = Math.min(1, ambient + beatBurst)
    if (brightness < 0.03) { await this.strip.setColor('#000000'); return }
    const hue = (Date.now() / 40) % 360
    await this.strip.setColor(this._hsl(hue, 100, brightness * 50))
  }

  // 14-segment frequency spectrum, brightens on beat
  async _spectrum(freq, s) {
    const segs = 14
    const bins = Math.floor(freq.length * 0.55)   // ~0-12kHz usable range
    const beatBoost = 1 + this._fade(200) * 0.9
    const segData = {}
    for (let i = 0; i < segs; i++) {
      const from = Math.floor((i / segs) * bins)
      const to   = Math.max(from + 1, Math.floor(((i + 1) / segs) * bins))
      const amp  = Math.min(1, (this._avg(freq, from, to) / 255) * s * beatBoost)
      segData[String(i + 1)] = amp < 0.04 ? '#000000' : this._hsl(240 - (i / (segs - 1)) * 240, 100, amp * 50)
    }
    await this.strip.setSegments(segData)
  }

  // Color held from last beat, next beat = new hue; ambient glow keeps it visible
  async _rhythm(freq, s) {
    const bass = this._avg(freq, 0, 20)
    const ambient    = Math.min(0.45, (bass / 255) * s * 0.6)  // dim ambient from bass
    const beatFade   = this._fade(330)
    const brightness = Math.max(ambient, beatFade) * 50
    await this.strip.setColor(this._hsl(this._beatHue, 100, brightness))
  }

  // Rainbow rolls continuously; speed + brightness surge on beat
  async _rolling(freq, s) {
    const energy = this._avg(freq, 0, 30)
    const amp      = (energy / 255) * s
    const beatKick = this._fade(250)
    // Rolling speed: proportional to energy + extra kick on beat
    this._rollAccum += amp * 0.6 + beatKick * 0.4
    const offset = Math.floor(this._rollAccum) % 14
    const brightness = Math.min(1, amp * 0.8 + beatKick * 0.5)
    const segData = {}
    for (let i = 1; i <= 14; i++) {
      const pos = (i - 1 + offset) % 14
      segData[String(i)] = this._hsl((pos / 14) * 360, 100, brightness * 45)
    }
    await this.strip.setSegments(segData)
  }

  // Strip=bass, left bar=mids, right bar=treble; all three zones beat-boosted
  async _separation(freq, s) {
    const beatBoost = 1 + this._fade(230) * 0.7
    const b = Math.min(1, (this._avg(freq, 0, 8)    / 255) * s * beatBoost)
    const m = Math.min(1, (this._avg(freq, 8, 45)   / 255) * s * beatBoost)
    const t = Math.min(1, (this._avg(freq, 45, 120) / 255) * s * beatBoost)
    const segData = {}
    for (let i = 1;  i <= 14; i++) segData[String(i)] = this._hsl(0,   100, b * 50)
    for (let i = 15; i <= 19; i++) segData[String(i)] = this._hsl(120, 100, m * 50)
    for (let i = 20; i <= 24; i++) segData[String(i)] = this._hsl(240, 100, t * 50)
    await this.strip.setSegments(segData)
  }
}

export default AudioSync
