import { IpcMain, dialog } from 'electron'

export function setupDialogHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })

    if (result.canceled) {
      return null
    } else {
      return result.filePaths[0]
    }
  })
}
