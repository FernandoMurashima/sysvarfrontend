import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { FinalizarDevolucaoVendaPayload, VendaDevolucao } from '../models/venda-pdv';
import { VendaPdvService } from './venda-pdv.service';

export interface PdvDevolucaoPendente {
  localUuid: string;
  documento: string;
  payload: FinalizarDevolucaoVendaPayload;
  criadaEm: string;
  tentativas: number;
  erro?: string;
}

@Injectable({ providedIn: 'root' })
export class PdvOfflineDevolucaoQueueService {
  private readonly key = 'sysvar.pdv.offline.devolucoes';
  private vendasApi = inject(VendaPdvService);

  listar(): PdvDevolucaoPendente[] {
    try {
      const raw = localStorage.getItem(this.key);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  quantidade(): number {
    return this.listar().length;
  }

  adicionar(payload: FinalizarDevolucaoVendaPayload): PdvDevolucaoPendente {
    const localUuid = this.uuid();
    const documento = this.documentoLocal();
    const devolucao: PdvDevolucaoPendente = {
      localUuid,
      documento,
      payload: { ...payload, documento, local_uuid: localUuid },
      criadaEm: new Date().toISOString(),
      tentativas: 0
    };
    this.salvar([...this.listar(), devolucao]);
    return devolucao;
  }

  async sincronizar(): Promise<{ enviados: number; pendentes: number; erros: number; devolucoes: VendaDevolucao[]; erro?: string }> {
    const fila = this.listar();
    const restantes: PdvDevolucaoPendente[] = [];
    const devolucoes: VendaDevolucao[] = [];
    let enviados = 0;
    let erros = 0;

    for (const devolucao of fila) {
      try {
        const enviada = await firstValueFrom(this.vendasApi.finalizarDevolucao(devolucao.payload));
        devolucoes.push(enviada);
        enviados += 1;
      } catch (error: any) {
        erros += 1;
        restantes.push({
          ...devolucao,
          tentativas: devolucao.tentativas + 1,
          erro: error?.error?.detail || error?.message || 'Falha ao sincronizar devolução.'
        });
      }
    }

    this.salvar(restantes);
    return { enviados, pendentes: restantes.length, erros, devolucoes, erro: restantes[0]?.erro };
  }

  private salvar(devolucoes: PdvDevolucaoPendente[]): void {
    localStorage.setItem(this.key, JSON.stringify(devolucoes));
  }

  private uuid(): string {
    return crypto?.randomUUID?.() || `dev-local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private documentoLocal(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `DEV-LOCAL-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }
}
