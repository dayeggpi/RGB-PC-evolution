const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Physical H604A BT segment mapping (confirmed via testing):
//   Segs 1-14  → strip (14 segments, left to right)
//   Segs 15-19 → left bar (15=bottom … 19=top)
//   Segs 20-24 → right bar (20=bottom … 24=top)  [experimental 3-byte protocol]
const segMap2 = {
  1:  '0100', 2:  '0200', 3:  '0400', 4:  '0800',
  5:  '1000', 6:  '2000', 7:  '4000', 8:  '8000',
  9:  '0001', 10: '0002', 11: '0004', 12: '0008',
  13: '0010', 14: '0020', 15: '0040', 16: '0080',
}
const segMap3 = {
  17: '000001', 18: '000002', 19: '000004',
  20: '000008', 21: '000010', 22: '000020', 23: '000040', 24: '000080',
}

class Strip {
  constructor(device) {
    this.device = device
    this.server = null
    this.service = null
    this.characteristic = null
    this.colorMode = false
    this.polling = false
    this.lastColorCommand = null
    this.currentColor = null
    this.syncMode = false
    this.segmentDuration = 0
    // Serialize all characteristic writes to prevent GATT concurrency errors
    this._writeChain = Promise.resolve()
    this.createServer()
  }

  // Enqueue a write so it never overlaps with keepAlive or other writes
  _enqueue(fn) {
    this._writeChain = this._writeChain
      .then(() => fn())
      .catch(e => console.warn('[BT write error]', e))
    return this._writeChain
  }

  async createServer() {
    const { device } = this
    try {
      this.server = await device.gatt.connect()
      this.service = await this.server.getPrimaryService(
        '00010203-0405-0607-0809-0a0b0c0d1910'
      )
      this.characteristic = await this.service.getCharacteristic(
        '00010203-0405-0607-0809-0a0b0c0d2b11'
      )
    } catch (ex) {
      console.log('[CreateServer]: Error', ex)
      await sleep(100)
      return this.createServer()
    }

    while (this.server) {
      if (!this.server.connected) {
        console.log('[CreateServer]: Reconnecting')
        return this.createServer()
      }
      try {
        await this.keepAlive()
      } catch (e) {
        console.log('[CreateServer]: keepAlive failed', e)
      }
      await sleep(2000)
    }
  }

  async turnOn() {
    this.colorMode = false
    await this._enqueue(() => this.characteristic.writeValue(commands.get('turnOn')))
  }

  async turnOff() {
    this.colorMode = false
    await this._enqueue(() => this.characteristic.writeValue(commands.get('turnOff')))
  }

  async keepAlive() {
    await this._enqueue(() =>
      this.characteristic.writeValueWithoutResponse(commands.get('keepAlive'))
    )
  }

  async setColorMode() {
    if (this.colorMode) return
    await this._enqueue(() =>
      this.characteristic.writeValueWithoutResponse(commands.convert('3305150100000000000000000000000000000022'))
    )
    this.colorMode = true
  }

  async setColor(hexColor) {
    await this.setColorMode()
    this.lastColorCommand = hexColor
    if (this.polling) return
    try {
      while (this.lastColorCommand !== this.currentColor || this.currentColor == null) {
        this.polling = true
        this.currentColor = this.lastColorCommand
        const rgb = this.lastColorCommand.slice(1)
        let hexBytes = `33051501${rgb}0000000000ff7f0000000000`
        hexBytes += this.getChecksum(hexBytes)
        await this._enqueue(() =>
          this.characteristic.writeValueWithoutResponse(commands.convert(hexBytes))
        )
      }
    } catch (ex) {
      console.log('[setColor]: Error', ex)
    }
    this.polling = false
  }

  // segNum: integer or string 1-24
  async setSegment(segNum, hexColor) {
    await this.setColorMode()
    const n = parseInt(segNum)
    const rgb = hexColor.slice(1)

    if (segMap2[n]) {
      let hexBytes = `33051501${rgb}0000000000${segMap2[n]}0000000000`
      hexBytes += this.getChecksum(hexBytes)
      await this._enqueue(() =>
        this.characteristic.writeValueWithoutResponse(commands.convert(hexBytes))
      )
    } else if (segMap3[n]) {
      let hexBytes = `33051501${rgb}0000000000${segMap3[n]}00000000`
      hexBytes += this.getChecksum(hexBytes)
      await this._enqueue(() =>
        this.characteristic.writeValueWithoutResponse(commands.convert(hexBytes))
      )
    } else {
      console.warn(`[setSegment]: No mapping for segment ${segNum}`)
    }
  }

  // segData: { "1": "#ff0000", "5": "#00ff00", ... }
  async setSegments(segData) {
    for (const [key, color] of Object.entries(segData)) {
      await this.setSegment(key, color)
    }
  }

  async setBrightness(value) {
    const eightbit = Math.floor(value / 100 * 100)
    const hex = eightbit.toString(16).padStart(2, '0')
    let hexBytes = `3304${hex}00000000000000000000000000000000`
    hexBytes += this.getChecksum(hexBytes)
    await this._enqueue(() =>
      this.characteristic.writeValueWithoutResponse(commands.convert(hexBytes))
    )
  }

  async sendRaw(bytes) {
    await this._enqueue(() =>
      this.characteristic.writeValueWithoutResponse(bytes)
    )
  }

  async setScene(command) {
    this.colorMode = false
    const hex = commands[command]
    if (!hex) return
    await this._enqueue(() =>
      this.characteristic.writeValueWithoutResponse(commands.convert(hex))
    )
  }

  stopSync() {
    this.syncMode = false
  }

  async consumeSegData() {
    const cap = window.cap
    this.syncMode = true
    while (this.syncMode) {
      try {
        const start = Date.now()
        await this.setSegments(cap.segData)
        this.segmentDuration = Date.now() - start
      } catch (ex) {
        console.warn(ex)
      }
      await sleep(500)
    }
  }

  getChecksum(bytes) {
    let xor = 0
    const numChunks = bytes.length / 2
    for (let i = 0; i < numChunks; i++) {
      xor ^= parseInt(bytes.slice(i * 2, (i + 1) * 2), 16)
    }
    return xor.toString(16).padStart(2, '0')
  }
}

const commands = {
  turnOn:     '3301010000000000000000000000000000000033',
  turnOff:    '3301000000000000000000000000000000000032',
  keepAlive:  'aa010000000000000000000000000000000000ab',
  energetic:  '3305130563000000000000000000000000000043',
  spectrum:   '3305130463000000000000000000000000000042',
  rythm:      '3305130363000000000000000000000000000045',
  separation: '3305133263000000000000000000000000000074',
  rolling:    '3305130663000000000000000000000000000040',
  sunrise:    '3305040000000000000000000000000000000032',
  sunset:     '3305040100000000000000000000000000000033',
  movie:      '3305040400000000000000000000000000000036',
  dating:     '3305040500000000000000000000000000000037',
  romantic:   '3305040700000000000000000000000000000035',
  blinking:   '330504080000000000000000000000000000003a',
  candlelight:'330504090000000000000000000000000000003b',
  snowflake:  '3305040f0000000000000000000000000000003d',
  rainbow:    '3305041600000000000000000000000000000024',
  get(command) {
    return new Uint8Array(this[command].match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)))
  },
  convert(string) {
    return new Uint8Array(string.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)))
  }
}

export const SEG_STRIP = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14']
export const SEG_LEFT  = ['15','16','17','18','19']
export const SEG_RIGHT = ['20','21','22','23','24']
export const SEG_ALL   = [...SEG_STRIP, ...SEG_LEFT, ...SEG_RIGHT]

export default Strip
