import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('database', {
  getUsers: () => ipcRenderer.invoke('database:getUsers'),
  createUser: (data: { email: string; name?: string }) =>
    ipcRenderer.invoke('database:createUser', data)
})
