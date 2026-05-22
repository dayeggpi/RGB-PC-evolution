const { electronAPI } = window
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class Capture {
  constructor(screenId, videoElement) {
    this.stream = null
    this.screenId = screenId
    this.videoElement = videoElement || null
    this.segData = {}
    this.segments = { left: [], right: [], top: [], bottom: [] }
    this._canvas = null
    this._ctx = null
    this.startVideoStream()
  }

  async refresh() {
    while (this.stream) {
      await this.getSegmentColors()
      await sleep(100)
    }
  }

  stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop())
      this.stream = null
    }
    this._canvas = null
    this._ctx = null
  }

  async startVideoStream() {
    if (this.stream) return
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: this.screenId,
          maxWidth: 100,
        }
      }
    })
    if (!this.videoElement) {
      this.videoElement = document.querySelector('video')
    }
    this.videoElement.srcObject = this.stream
    this.videoElement.onloadedmetadata = () => {
      this.videoElement.play()
      this.refresh()
    }
  }

  getVideoFrameBase64() {
    const w = this.videoElement.videoWidth
    const h = this.videoElement.videoHeight
    if (!this._canvas) {
      this._canvas = document.createElement('canvas')
      this._ctx = this._canvas.getContext('2d')
    }
    if (this._canvas.width !== w) this._canvas.width = w
    if (this._canvas.height !== h) this._canvas.height = h
    this._ctx.drawImage(this.videoElement, 0, 0)
    return this._canvas.toDataURL('image/jpeg', 0.7).split('base64,')[1]
  }

  async getSegmentColors() {
    if (!this.videoElement || !this.videoElement.videoWidth) return
    const frameBase64 = this.getVideoFrameBase64()
    const width = this.videoElement.videoWidth
    const height = this.videoElement.videoHeight

    const crops = {}
    this.buildCrops(crops, this.segments.left,   width, height, 'left')
    this.buildCrops(crops, this.segments.right,  width, height, 'right')
    this.buildCrops(crops, this.segments.top,    width, height, 'top')
    this.buildCrops(crops, this.segments.bottom, width, height, 'bottom')

    if (Object.keys(crops).length === 0) return
    this.segData = await electronAPI.invoke('processFrame', { frameBase64, crops })
  }

  buildCrops(crops, segments, width, height, side) {
    if (!segments || segments.length === 0) return
    if (side === 'left') {
      const cropH = Math.floor(height / segments.length)
      const cropW = Math.floor(0.3 * width)
      segments.forEach((seg, i) => {
        crops[seg] = { left: 0, top: i * cropH, width: cropW, height: cropH }
      })
    } else if (side === 'right') {
      const cropH = Math.floor(height / segments.length)
      const cropW = Math.floor(0.3 * width)
      segments.forEach((seg, i) => {
        crops[seg] = { left: width - cropW, top: i * cropH, width: cropW, height: cropH }
      })
    } else if (side === 'top') {
      const cropH = Math.floor(height * 0.3)
      const cropW = Math.floor(width / segments.length)
      segments.forEach((seg, i) => {
        crops[seg] = { left: i * cropW, top: 0, width: cropW, height: cropH }
      })
    } else if (side === 'bottom') {
      const cropH = Math.floor(height * 0.3)
      const cropW = Math.floor(width / segments.length)
      segments.forEach((seg, i) => {
        crops[seg] = { left: i * cropW, top: height - cropH, width: cropW, height: cropH }
      })
    }
  }
}

export default Capture
