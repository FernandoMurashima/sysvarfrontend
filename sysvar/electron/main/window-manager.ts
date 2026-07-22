import { BrowserWindow } from 'electron';
import path from 'path';

export function createMainWindow(distPath: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#071426',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  win.loadFile(path.join(distPath, 'index.html'));
  return win;
}

