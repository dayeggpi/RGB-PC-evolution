"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
electron.app.setName("RGB-PC");
const isDev = process.env.NODE_ENV === "development";
electron.Menu.setApplicationMenu(null);
let bluetoothCallback = null;
let tray = null;
let forceQuit = false;
electron.ipcMain.on("deviceSelected", (_, deviceId) => {
  if (bluetoothCallback) {
    const cb = bluetoothCallback;
    bluetoothCallback = null;
    cb(deviceId);
  }
});
const palettesDir = () => path.join(electron.app.getPath("appData"), "RGB-PC");
const palettesFile = () => path.join(palettesDir(), "palettes.json");
electron.ipcMain.handle("getPalettesPath", () => palettesFile());
electron.ipcMain.handle("loadPalettes", () => {
  const file = palettesFile();
  console.log("[loadPalettes] reading", file);
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    console.log("[loadPalettes] ok, entries:", data?.length);
    return data;
  } catch (e) {
    console.log("[loadPalettes] not found or parse error:", e.message);
    return null;
  }
});
electron.ipcMain.handle("savePalettes", (_, data) => {
  const dir = palettesDir();
  const file = palettesFile();
  console.log("[savePalettes] writing", file);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    console.log("[savePalettes] ok");
    return file;
  } catch (e) {
    console.error("[savePalettes] FAILED:", e);
    throw e;
  }
});
electron.ipcMain.handle("getDesktopSources", async () => {
  const sources = await electron.desktopCapturer.getSources({ types: ["screen"] });
  return sources.map((s) => ({ id: s.id, name: s.name, display_id: s.display_id }));
});
electron.ipcMain.handle("processFrame", async (_, { frameBase64, crops }) => {
  const buffer = Buffer.from(frameBase64, "base64");
  const hex = (c) => c.toString(16).padStart(2, "0");
  const segData = {};
  for (const [segKey, { left, top, width, height }] of Object.entries(crops)) {
    try {
      const cropped = await sharp(buffer).extract({ left, top, width, height }).toBuffer();
      const { dominant } = await sharp(cropped).stats();
      segData[segKey] = `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`;
    } catch {
      segData[segKey] = "#000000";
    }
  }
  return segData;
});
electron.ipcMain.handle("openExternal", (_, url) => electron.shell.openExternal(url));
function getIconPath() {
  return electron.app.isPackaged ? path.join(process.resourcesPath, "rgb.ico") : path.join(__dirname, "../../rgb.ico");
}
async function createWindow() {
  const win = new electron.BrowserWindow({
    width: 900,
    height: 750,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false
    }
  });
  win.webContents.on("before-input-event", (event, input) => {
    const ctrl = input.control || input.meta;
    const k = input.key.toLowerCase();
    if (ctrl && k === "r" || ctrl && k === "f5" || k === "f5" || k === "f12" || ctrl && input.shift && k === "i" || ctrl && input.shift && k === "j") {
      event.preventDefault();
    }
  });
  win.webContents.on("select-bluetooth-device", (event, deviceList, callback) => {
    event.preventDefault();
    bluetoothCallback = callback;
    win.webContents.send("deviceList", deviceList);
  });
  const icon = electron.nativeImage.createFromPath(getIconPath());
  tray = new electron.Tray(icon);
  tray.setToolTip("RGB-PC");
  const trayMenu = electron.Menu.buildFromTemplate([
    {
      label: "Show",
      click: () => {
        win.show();
        win.focus();
      }
    },
    { type: "separator" },
    {
      label: "Exit",
      click: () => {
        forceQuit = true;
        electron.app.quit();
      }
    }
  ]);
  tray.setContextMenu(trayMenu);
  tray.on("click", () => {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
  win.on("close", (e) => {
    if (!forceQuit) {
      e.preventDefault();
      win.hide();
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
});
electron.app.whenReady().then(createWindow);
if (isDev) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        forceQuit = true;
        electron.app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      forceQuit = true;
      electron.app.quit();
    });
  }
}
