import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => ipcRenderer.on(channel, (_, ...args) => callback(...args)),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
})
