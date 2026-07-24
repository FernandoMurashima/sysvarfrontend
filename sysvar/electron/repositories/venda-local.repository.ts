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

export interface VendaEmAndamentoContexto {
  loja: number;
  caixa: number;
  cliente: number;
  vendedor: number;
  terminalId?: string;
  operadorId?: number;
  empresaId?: number;
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

  async criarEmAndamento(contexto: VendaEmAndamentoContexto): Promise<string> {
    const uuid = crypto.randomUUID();
    const now = new Date().toISOString();
    const numero = `LOCAL-${now.replace(/\D/g, '').slice(0, 14)}`;
    await this.db.transaction(async () => {
      await this.db.execute(
        `INSERT INTO vendas_locais (
          local_uuid, empresa_id, loja_id, caixa_id, terminal_id, operador_id, vendedor_id,
          cliente_id_servidor, numero_local, numero_documento, data_abertura, status,
          status_fiscal, status_sincronizacao, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid,
          contexto.empresaId ?? null,
          contexto.loja,
          contexto.caixa,
          contexto.terminalId ?? null,
          contexto.operadorId ?? null,
          contexto.vendedor,
          contexto.cliente,
          numero,
          numero,
          now,
          'EM_ANDAMENTO',
          'NAO_GERADA',
          'LOCAL',
          now,
          now
        ]
      );
      await this.audit('VENDA_ABERTA', uuid, contexto);
    });
    return uuid;
  }

  async finalizarLocal(documento: string, payload: FinalizarVendaPdvPayload, terminalId?: string): Promise<string> {
    const uuid = crypto.randomUUID();
    const now = new Date().toISOString();
    const subtotal = payload.itens.reduce((sum, item) => sum + (Number(item.preco_unitario) * Number(item.quantidade)), 0);
    const descontoItens = payload.itens.reduce((sum, item) => sum + Number(item.desconto || 0), 0);
    const descontoTotal = descontoItens + Number(payload.desconto_geral || 0);
    const total = Math.max(0, subtotal - descontoTotal);
    const quantidadeItens = payload.itens.reduce((sum, item) => sum + Number(item.quantidade || 0), 0);

    await this.db.transaction(async () => {
      await this.db.execute(
        `INSERT INTO vendas_locais (
          local_uuid, loja_id, caixa_id, terminal_id, vendedor_id, cliente_id_servidor,
          numero_local, numero_documento, data_abertura, data_finalizacao, status,
          subtotal, desconto_total, acrescimo_total, total, quantidade_itens,
          status_fiscal, status_sincronizacao, payload_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid,
          payload.loja,
          payload.caixa,
          terminalId ?? null,
          payload.vendedor,
          payload.cliente,
          documento,
          documento,
          now,
          now,
          'FINALIZADA',
          subtotal,
          descontoTotal,
          0,
          total,
          quantidadeItens,
          'NAO_GERADA',
          'PENDENTE',
          JSON.stringify(payload),
          now,
          now
        ]
      );
      await this.db.execute(
        `INSERT INTO documentos_fiscais_locais (
          local_uuid, venda_uuid, modelo, serie, numero, tipo_emissao, ambiente, status,
          data_emissao, motivo_contingencia, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          uuid,
          '65',
          1,
          Number(String(documento).replace(/\D/g, '').slice(-9)) || null,
          'CONTINGENCIA_OFFLINE',
          'HOMOLOGACAO',
          'PENDENTE_TRANSMISSAO',
          now,
          'Venda emitida em contingência offline pelo PDV local.',
          now,
          now
        ]
      );

      for (const item of payload.itens) {
        const itemUuid = crypto.randomUUID();
        const quantidade = Number(item.quantidade || 0);
        const preco = Number(item.preco_unitario || 0);
        const desconto = Number(item.desconto || 0);
        const totalItem = Math.max(0, quantidade * preco - desconto);
        const estoqueLocal = await this.db.query<{ sku_id: number; estoque: number }>(
          `SELECT sku_id, estoque
           FROM produto_cache
           WHERE ean = ?
           LIMIT 1`,
          [item.ean]
        );
        if (!estoqueLocal.length) {
          throw new Error(`Produto ${item.ean} não encontrado no catálogo local.`);
        }
        if (Number(estoqueLocal[0].estoque || 0) < quantidade) {
          throw new Error(`Produto ${item.ean} sem saldo local suficiente.`);
        }
        const saldoAnterior = Number(estoqueLocal[0].estoque || 0);
        const saldoPosterior = saldoAnterior - quantidade;
        await this.db.execute(
          `INSERT INTO venda_itens_locais (
            local_uuid, venda_uuid, ean13, descricao, cor_descricao, tamanho_descricao,
            quantidade, unidade, preco_tabela, preco_unitario, desconto_valor, total_item,
            status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemUuid,
            uuid,
            item.ean,
            item.descricao,
            item.cor,
            item.tamanho,
            quantidade,
            'UN',
            preco,
            preco,
            desconto,
            totalItem,
            'ATIVO',
            now,
            now
          ]
        );
        await this.db.execute(
          `UPDATE produto_cache
           SET estoque = estoque - ?, updated_at = ?
           WHERE sku_id = ?`,
          [quantidade, now, estoqueLocal[0].sku_id]
        );
        await this.db.execute(
          `INSERT INTO estoque_movimentos_locais (
            local_uuid, sku_id, tipo_movimento, quantidade, venda_uuid, data, terminal_id,
            saldo_anterior, saldo_posterior, status_sincronizacao, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            estoqueLocal[0].sku_id,
            'SAIDA_VENDA',
            quantidade,
            uuid,
            now,
            terminalId ?? null,
            saldoAnterior,
            saldoPosterior,
            'PENDENTE',
            now
          ]
        );
      }

      for (const pagamento of payload.pagamentos) {
        const valor = Number(pagamento.valor || 0);
        await this.db.execute(
          `INSERT INTO pagamentos_locais (
            local_uuid, venda_uuid, forma_pagamento_descricao, valor, codigo_autorizacao,
            valor_parcela, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            uuid,
            pagamento.descricao || pagamento.forma,
            valor,
            pagamento.autorizacao ?? null,
            valor,
            'CONFIRMADO',
            now,
            now
          ]
        );
      }

      if (descontoTotal > 0) {
        await this.db.execute(
          `INSERT INTO descontos_locais (
            local_uuid, venda_uuid, tipo, valor, created_at
          ) VALUES (?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), uuid, 'VENDA', descontoTotal, now]
        );
      }

      await this.db.execute(
        `INSERT INTO venda_local (local_uuid, documento, payload_json, status, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [uuid, documento, JSON.stringify(payload), 'PENDENTE_SYNC', now]
      );
      await this.db.execute(
        `INSERT INTO sync_queue (tipo, chave, payload_json, status, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        ['VENDA_FINALIZADA', uuid, JSON.stringify(payload), 'PENDENTE', now]
      );
      await this.audit('VENDA_FINALIZADA', uuid, { documento, total, quantidadeItens });
    });

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

  async marcarSincronizada(localUuid: string, servidorId?: number): Promise<void> {
    const now = new Date().toISOString();
    await this.db.transaction(async () => {
      await this.db.execute(
        `UPDATE venda_local
         SET status = ?, venda_servidor_id = ?, synced_at = ?, erro = NULL
         WHERE local_uuid = ?`,
        ['SINCRONIZADA', servidorId ?? null, now, localUuid]
      );
      await this.db.execute(
        `UPDATE vendas_locais
         SET servidor_id = ?, status_sincronizacao = ?, sincronizado_em = ?, updated_at = ?
         WHERE local_uuid = ?`,
        [servidorId ?? null, 'SINCRONIZADA', now, now, localUuid]
      );
      await this.audit('VENDA_SINCRONIZADA', localUuid, { servidorId });
    });
  }

  async registrarErroSincronizacao(localUuid: string, erro: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.transaction(async () => {
      await this.db.execute(
        `UPDATE venda_local
         SET tentativas = tentativas + 1, erro = ?
         WHERE local_uuid = ?`,
        [erro, localUuid]
      );
      await this.db.execute(
        `UPDATE vendas_locais
         SET tentativas_sincronizacao = tentativas_sincronizacao + 1,
             ultimo_erro = ?,
             status_sincronizacao = ?,
             updated_at = ?
         WHERE local_uuid = ?`,
        [erro, 'ERRO', now, localUuid]
      );
      await this.audit('ERRO_SINCRONIZACAO', localUuid, { erro });
    });
  }

  vendasEmAndamento(): Promise<Array<{ local_uuid: string; numero_documento: string; payload_json?: string; updated_at: string }>> {
    return this.db.query(
      `SELECT local_uuid, numero_documento, payload_json, updated_at
       FROM vendas_locais
       WHERE status = ?
       ORDER BY updated_at DESC`,
      ['EM_ANDAMENTO']
    );
  }

  private audit(tipo: string, referencia: string, payload?: unknown): Promise<void> {
    return this.db.execute(
      `INSERT INTO audit_log (tipo, referencia, payload_json, created_at)
       VALUES (?, ?, ?, ?)`,
      [tipo, referencia, payload ? JSON.stringify(payload) : null, new Date().toISOString()]
    );
  }
}
