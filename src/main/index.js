import { app, BrowserWindow, ipcMain, shell, desktopCapturer, Menu, Tray, nativeImage, globalShortcut } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import sharp from 'sharp'

app.setName('RGB-PC')

const isDev = process.env.NODE_ENV === 'development'

Menu.setApplicationMenu(null)

let bluetoothCallback = null
let tray = null
let forceQuit = false   // set true when user chooses Exit from tray

// ── IPC handlers — registered once at module level ───────────────────────────

ipcMain.on('deviceSelected', (_, deviceId) => {
  if (bluetoothCallback) {
    const cb = bluetoothCallback
    bluetoothCallback = null
    cb(deviceId)
  }
})

const palettesDir  = () => join(app.getPath('appData'), 'RGB-PC')
const palettesFile = () => join(palettesDir(), 'palettes.json')

ipcMain.handle('getPalettesPath', () => palettesFile())

ipcMain.handle('loadPalettes', () => {
  const file = palettesFile()
  console.log('[loadPalettes] reading', file)
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'))
    console.log('[loadPalettes] ok, entries:', data?.length)
    return data
  } catch (e) {
    console.log('[loadPalettes] not found or parse error:', e.message)
    return null
  }
})

ipcMain.handle('savePalettes', (_, data) => {
  const dir  = palettesDir()
  const file = palettesFile()
  console.log('[savePalettes] writing', file)
  try {
    mkdirSync(dir, { recursive: true })
    writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
    console.log('[savePalettes] ok')
    return file
  } catch (e) {
    console.error('[savePalettes] FAILED:', e)
    throw e
  }
})

ipcMain.handle('getDesktopSources', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] })
  return sources.map(s => ({ id: s.id, name: s.name, display_id: s.display_id }))
})

ipcMain.handle('processFrame', async (_, { frameBase64, crops }) => {
  const buffer = Buffer.from(frameBase64, 'base64')
  const hex = (c) => c.toString(16).padStart(2, '0')
  const segData = {}
  for (const [segKey, { left, top, width, height }] of Object.entries(crops)) {
    try {
      const cropped = await sharp(buffer).extract({ left, top, width, height }).toBuffer()
      const boosted = await sharp(cropped).modulate({ saturation: 2.5 }).toBuffer()
      const { dominant } = await sharp(boosted).stats()
      segData[segKey] = `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`
    } catch {
      segData[segKey] = '#000000'
    }
  }
  return segData
})

ipcMain.handle('openExternal', (_, url) => shell.openExternal(url))

// Convert app hotkey format (from DOM events) to Electron accelerator format
function toAccelerator(hotkey) {
  const map = { Meta: 'Super', Enter: 'Return', ' ': 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' }
  return hotkey.split('+').map(p => map[p] ?? p).join('+')
}

ipcMain.handle('registerGlobalShortcuts', (_, shortcuts) => {
  globalShortcut.unregisterAll()
  for (const { combo, action } of shortcuts) {
    if (!combo) continue
    try {
      globalShortcut.register(toAccelerator(combo), () => {
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('shortcutTriggered', action))
      })
    } catch { /* invalid accelerator — skip */ }
  }
})

// ─────────────────────────────────────────────────────────────────────────────

function getIconPath() {
  // In dev: two levels up from out/main/ → project root
  // In prod: electron-builder copies rgb.ico to resources/ via extraResources
  return app.isPackaged
    ? join(process.resourcesPath, 'rgb.ico')
    : join(__dirname, '../../rgb.ico')
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 750,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    }
  })

  // Block reload / devtools shortcuts
  win.webContents.on('before-input-event', (event, input) => {
    const ctrl = input.control || input.meta
    const k = input.key.toLowerCase()
    if (
      (ctrl && k === 'r') || (ctrl && k === 'f5') ||
      k === 'f5' || k === 'f12' ||
      (ctrl && input.shift && k === 'i') ||
      (ctrl && input.shift && k === 'j')
    ) {
      event.preventDefault()
    }
  })

  win.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault()
    bluetoothCallback = callback
    win.webContents.send('deviceList', deviceList)
  })

  // ── Tray ────────────────────────────────────────────────────────────────────
  const icon = nativeImage.createFromPath(getIconPath())
  tray = new Tray(icon)
  tray.setToolTip('RGB-PC')

  const trayMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => { win.show(); win.focus() },
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => { forceQuit = true; app.quit() },
    },
  ])
  tray.setContextMenu(trayMenu)

  // Left-click on tray icon: toggle window visibility
  tray.on('click', () => {
    if (win.isVisible()) {
      win.hide()
    } else {
      win.show()
      win.focus()
    }
  })
  // ────────────────────────────────────────────────────────────────────────────

  // Close button hides to tray instead of quitting
  win.on('close', (e) => {
    if (!forceQuit) {
      e.preventDefault()
      win.hide()
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.on('will-quit', () => globalShortcut.unregisterAll())

// Window is hidden, not closed — this event won't fire during normal use
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.whenReady().then(createWindow)

if (isDev) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') { forceQuit = true; app.quit() }
    })
  } else {
    process.on('SIGTERM', () => { forceQuit = true; app.quit() })
  }
}
