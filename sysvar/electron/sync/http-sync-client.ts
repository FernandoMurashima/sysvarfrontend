import { VendaPdv } from '../../src/app/core/models/venda-pdv';
import { SyncClient } from './sync-queue.service';

export interface SyncAuthContext {
  apiBaseUrl: string;
  token: string;
}

export class HttpSyncClient implements SyncClient {
  constructor(private readonly context: SyncAuthContext) {}

  async enviarVenda(payload: unknown): Promise<VendaPdv> {
    const base = this.context.apiBaseUrl.replace(/\/$/, '');
    const response = await fetch(`${base}/fiscal/vendas-pdv/finalizar/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${this.context.token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || data?.non_field_errors?.[0] || 'Falha ao sincronizar venda.');
    }
    return data as VendaPdv;
  }
}
