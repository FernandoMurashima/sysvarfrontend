import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { FinalizarVendaPdvPayload, VendaPdv } from '../models/venda-pdv';
import { VendaPdvService } from './venda-pdv.service';

export interface PdvVendaPendente {
  localUuid: string;
  documento: string;
  payload: FinalizarVendaPdvPayload;
  criadaEm: string;
  tentativas: number;
  erro?: string;
}

@Injectable({ providedIn: 'root' })
export class PdvOfflineQueueService {
  private readonly key = 'sysvar.pdv.offline.queue';
  private vendasApi = inject(VendaPdvService);

  listar(): PdvVendaPendente[] {
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

  adicionar(payload: FinalizarVendaPdvPayload): PdvVendaPendente {
    const venda: PdvVendaPendente = {
      localUuid: this.uuid(),
      documento: this.documentoLocal(),
      payload,
      criadaEm: new Date().toISOString(),
      tentativas: 0
    };
    this.salvar([...this.listar(), venda]);
    return venda;
  }

  async sincronizar(): Promise<{ enviados: number; pendentes: number; erros: number; vendas: VendaPdv[]; erro?: string }> {
    const fila = this.listar();
    const restantes: PdvVendaPendente[] = [];
    const vendas: VendaPdv[] = [];
    let enviados = 0;
    let erros = 0;

    for (const venda of fila) {
      try {
        const enviada = await firstValueFrom(this.vendasApi.finalizar(venda.payload));
        vendas.push(enviada);
        enviados += 1;
      } catch (error: any) {
        erros += 1;
        restantes.push({
          ...venda,
          tentativas: venda.tentativas + 1,
          erro: error?.error?.detail || error?.message || 'Falha ao sincronizar venda.'
        });
      }
    }

    this.salvar(restantes);
    return { enviados, pendentes: restantes.length, erros, vendas, erro: restantes[0]?.erro };
  }

  private salvar(vendas: PdvVendaPendente[]): void {
    localStorage.setItem(this.key, JSON.stringify(vendas));
  }

  private uuid(): string {
    return crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private documentoLocal(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `LOCAL-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }
}
