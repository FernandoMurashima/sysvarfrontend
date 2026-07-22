import { app } from 'electron';

export function registerLifecycle(onReady: () => void): void {
  const singleInstance = app.requestSingleInstanceLock();
  if (!singleInstance) {
    app.quit();
    return;
  }

  app.whenReady().then(onReady);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

