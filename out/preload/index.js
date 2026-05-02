"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  send: (channel, data) => electron.ipcRenderer.send(channel, data),
  on: (channel, callback) => {
    const wrapped = (_, ...args) => callback(...args);
    electron.ipcRenderer.on(channel, wrapped);
    return () => electron.ipcRenderer.removeListener(channel, wrapped);
  },
  invoke: (channel, ...args) => electron.ipcRenderer.invoke(channel, ...args)
});
