import { Injectable } from '@angular/core';

export interface PdvAuditoriaLocal {
  id: string;
  dataHora: string;
  acao: string;
  usuario?: string;
  loja?: number | null;
  caixa?: number | null;
  documento?: string;
  detalhe?: string;
  valor?: number;
}

@Injectable({ providedIn: 'root' })
export class PdvLocalAuditoriaService {
  private readonly key = 'sysvar-pdv-auditoria';

  registrar(evento: Omit<PdvAuditoriaLocal, 'id' | 'dataHora'>): void {
    const registro: PdvAuditoriaLocal = {
      id: this.uuid(),
      dataHora: new Date().toISOString(),
      ...evento
    };
    const lista = [registro, ...this.listar()].slice(0, 1000);
    localStorage.setItem(this.key, JSON.stringify(lista));
  }

  listar(): PdvAuditoriaLocal[] {
    try {
      const data = JSON.parse(localStorage.getItem(this.key) || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  private uuid(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
