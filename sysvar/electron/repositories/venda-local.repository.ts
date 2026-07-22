import { FinalizarVendaPdvPayload } from '../../src/app/core/models/venda-pdv';
import { LocalDatabase } from '../database/connection';

export interface VendaLocalRow {
  local_uuid: string;
  documento: string;
  payload_json: string;
  status: string;
  tentativas: number;
  erro?: string;
  venda_servidor_id?: number;
  created_at: string;
  synced_at?: string;
}

export class VendaLocalRepository {
  constructor(private readonly db: LocalDatabase) {}

  async criar(documento: string, payload: FinalizarVendaPdvPayload): Promise<string> {
    const uuid = crypto.randomUUID();
    await this.db.execute(
      `INSERT INTO venda_local (local_uuid, documento, payload_json, status, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [uuid, documento, JSON.stringify(payload), 'PENDENTE_SYNC', new Date().toISOString()]
    );
    return uuid;
  }

  pendentes(): Promise<VendaLocalRow[]> {
    return this.db.query<VendaLocalRow>(
      `SELECT local_uuid, documento, payload_json, status, tentativas, erro, venda_servidor_id, created_at, synced_at
       FROM venda_local
       WHERE status = ?
       ORDER BY created_at`,
      ['PENDENTE_SYNC']
    );
  }
}

