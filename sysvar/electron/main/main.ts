import { app, ipcMain } from 'electron';
import path from 'path';

import { registerLifecycle } from './app-lifecycle';
import { createMainWindow } from './window-manager';

const distPath = path.join(__dirname, '../../dist/sysvar/browser');

registerLifecycle(() => {
  createMainWindow(distPath);
});

ipcMain.handle('sysvar:status', async () => ({
  runtime: 'desktop',
  online: true,
  apiReachable: true,
  pendencias: 0,
  atualizadoEm: new Date().toISOString()
}));

ipcMain.handle('sysvar:ping', async () => true);
ipcMain.handle('sysvar:produtos:pesquisar', async () => []);
ipcMain.handle('sysvar:vendas:finalizar', async () => {
  throw new Error('PDV local ainda nao ativado neste terminal.');
});
ipcMain.handle('sysvar:sync:status', async () => ({ status: 'idle', pendentes: 0, enviados: 0, erros: 0 }));
ipcMain.handle('sysvar:sync:executar', async () => ({ status: 'idle', pendentes: 0, enviados: 0, erros: 0 }));

