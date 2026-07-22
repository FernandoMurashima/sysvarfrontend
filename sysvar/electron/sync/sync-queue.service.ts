import { VendaPdv } from '../../src/app/core/models/venda-pdv';
import { VendaLocalRepository } from '../repositories/venda-local.repository';

export interface SyncClient {
  enviarVenda(payload: unknown, idempotencyKey: string): Promise<VendaPdv>;
}

export class SyncQueueService {
  constructor(
    private readonly vendas: VendaLocalRepository,
    private readonly client: SyncClient
  ) {}

  async executar(): Promise<{ enviados: number; erros: number; pendentes: number }> {
    const pendentes = await this.vendas.pendentes();
    let enviados = 0;
    let erros = 0;

    for (const venda of pendentes) {
      try {
        await this.client.enviarVenda(JSON.parse(venda.payload_json), venda.local_uuid);
        enviados += 1;
      } catch {
        erros += 1;
      }
    }

    return { enviados, erros, pendentes: Math.max(pendentes.length - enviados, 0) };
  }
}

