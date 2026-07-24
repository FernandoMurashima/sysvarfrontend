import { app, ipcMain, net } from 'electron';
import path from 'path';

import { BetterSqliteDatabaseFactory } from '../database/better-sqlite-factory';
import { LocalDatabaseConnection } from '../database/connection';
import { runMigrations } from '../database/migrations/migration-runner';
import { ProdutoCacheRepository } from '../repositories/produto-cache.repository';
import { PdvStatusLocalRepository } from '../repositories/pdv-status-local.repository';
import { TerminalConfigInput, TerminalConfigRepository, TerminalConfigRow } from '../repositories/terminal-config.repository';
import { VendaLocalRepository } from '../repositories/venda-local.repository';
import { DocumentoLocalService } from '../services/documento-local.service';
import { HttpSyncClient, SyncAuthContext } from '../sync/http-sync-client';
import { SyncQueueService } from '../sync/sync-queue.service';
import { registerLifecycle } from './app-lifecycle';
import { createMainWindow } from './window-manager';

const distPath = path.join(__dirname, '../../dist/sysvar/browser');

let produtosRepository: ProdutoCacheRepository | null = null;
let vendasRepository: VendaLocalRepository | null = null;
let statusRepository: PdvStatusLocalRepository | null = null;
let terminalRepository: TerminalConfigRepository | null = null;
let documentoLocal: DocumentoLocalService | null = null;
let databaseError: string | null = null;

registerLifecycle(() => {
  createMainWindow(distPath);
});

async function ensureLocalRuntime(): Promise<void> {
  if (produtosRepository && vendasRepository) return;
  if (databaseError) throw new Error(databaseError);

  try {
    const dbPath = path.join(app.getPath('userData'), 'sysvar-pdv.sqlite');
    const connection = new LocalDatabaseConnection(new BetterSqliteDatabaseFactory(), dbPath);
    const db = await connection.open();
    await runMigrations(db);
    produtosRepository = new ProdutoCacheRepository(db);
    vendasRepository = new VendaLocalRepository(db);
    statusRepository = new PdvStatusLocalRepository(db);
    terminalRepository = new TerminalConfigRepository(db);
    documentoLocal = new DocumentoLocalService(db);
  } catch (error) {
    databaseError = error instanceof Error ? error.message : 'Falha ao abrir base local do PDV.';
    throw new Error(databaseError);
  }
}

function mapTerminal(row: TerminalConfigRow | null) {
  if (!row) return null;
  return {
    terminalUuid: row.terminal_uuid,
    empresaId: row.empresa_id ?? null,
    lojaId: row.loja_id ?? null,
    caixaId: row.caixa_id ?? null,
    usuarioId: row.usuario_id ?? null,
    apiBaseUrl: row.api_base_url,
    ativo: row.ativo === 1,
    updatedAt: row.updated_at
  };
}

async function getPendencias(): Promise<number> {
  try {
    await ensureLocalRuntime();
    const resumo = await statusRepository!.resumo();
    return resumo.vendasPendentes + resumo.documentosFiscaisPendentes + resumo.movimentosEstoquePendentes;
  } catch {
    return 0;
  }
}

ipcMain.handle('sysvar:status', async () => {
  const online = net.isOnline();
  let resumoLocal = null;
  let terminal = null;
  try {
    await ensureLocalRuntime();
    resumoLocal = await statusRepository!.resumo();
    terminal = await terminalRepository!.obter();
  } catch {
    resumoLocal = null;
    terminal = null;
  }
  const terminalMap = mapTerminal(terminal);
  return {
    runtime: 'desktop',
    online,
    apiReachable: online,
    terminalId: terminalMap?.terminalUuid,
    terminalAtivo: terminalMap?.ativo,
    lojaId: terminalMap?.lojaId ?? undefined,
    caixaId: terminalMap?.caixaId ?? undefined,
    terminal: terminalMap,
    pendencias: resumoLocal
      ? resumoLocal.vendasPendentes + resumoLocal.documentosFiscaisPendentes + resumoLocal.movimentosEstoquePendentes
      : 0,
    resumoLocal,
    databaseReady: !databaseError,
    databaseError,
    atualizadoEm: new Date().toISOString()
  };
});

ipcMain.handle('sysvar:ping', async () => true);
ipcMain.handle('sysvar:terminal:configurar', async (_event, config: TerminalConfigInput) => {
  await ensureLocalRuntime();
  return mapTerminal(await terminalRepository!.salvar(config));
});
ipcMain.handle('sysvar:produtos:pesquisar', async (_event, termo: string) => {
  await ensureLocalRuntime();
  return produtosRepository!.pesquisar(String(termo || ''));
});
ipcMain.handle('sysvar:produtos:atualizar-catalogo', async (_event, produtos) => {
  await ensureLocalRuntime();
  const total = await produtosRepository!.salvarCatalogo(Array.isArray(produtos) ? produtos : []);
  return { total, atualizadoEm: new Date().toISOString() };
});
ipcMain.handle('sysvar:vendas:finalizar', async (_event, payload) => {
  await ensureLocalRuntime();
  const terminal = await terminalRepository!.obter();
  const documento = await documentoLocal!.gerarSequencial('PDV', payload?.loja, payload?.caixa);
  const localUuid = await vendasRepository!.finalizarLocal(documento, payload, terminal?.terminal_uuid);
  return {
    localUuid,
    documento,
    status: 'PENDENTE_SYNC',
    sincronizado: false
  };
});
ipcMain.handle('sysvar:vendas:em-andamento', async () => {
  await ensureLocalRuntime();
  return (await vendasRepository!.vendasEmAndamento()).map(venda => ({
    localUuid: venda.local_uuid,
    numeroDocumento: venda.numero_documento,
    updatedAt: venda.updated_at
  }));
});
ipcMain.handle('sysvar:sync:status', async () => ({
  status: 'idle',
  pendentes: await getPendencias(),
  resumoLocal: statusRepository ? await statusRepository.resumo() : null,
  enviados: 0,
  erros: 0
}));
ipcMain.handle('sysvar:sync:executar', async (_event, contexto: SyncAuthContext) => {
  await ensureLocalRuntime();
  if (!contexto?.apiBaseUrl || !contexto?.token) {
    throw new Error('Token de autenticação ausente para sincronizar.');
  }
  const service = new SyncQueueService(vendasRepository!, new HttpSyncClient(contexto));
  const resumo = await service.executar();
  return { status: resumo.erros ? 'error' : 'idle', ...resumo };
});
