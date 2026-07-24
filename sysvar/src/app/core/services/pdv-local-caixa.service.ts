import { Injectable } from '@angular/core';

export interface PdvCaixaLocal {
  id: string;
  loja: number;
  caixa: number;
  usuario: string;
  abertoEm: string;
  fechadoEm?: string;
  status: 'ABERTO' | 'FECHADO';
}

@Injectable({ providedIn: 'root' })
export class PdvLocalCaixaService {
  private readonly key = 'sysvar.pdv.local.caixa';
  private readonly historicoKey = 'sysvar.pdv.local.caixa.historico';

  obter(): PdvCaixaLocal | null {
    try {
      const data = JSON.parse(localStorage.getItem(this.key) || 'null');
      return data?.status ? data : null;
    } catch {
      return null;
    }
  }

  aberto(loja: number | null, caixa: number | null): boolean {
    const atual = this.obter();
    return !!atual && atual.status === 'ABERTO' && atual.loja === loja && atual.caixa === caixa;
  }

  abrir(loja: number, caixa: number, usuario: string): PdvCaixaLocal {
    const atual: PdvCaixaLocal = {
      id: this.uuid(),
      loja,
      caixa,
      usuario,
      abertoEm: new Date().toISOString(),
      status: 'ABERTO'
    };
    localStorage.setItem(this.key, JSON.stringify(atual));
    this.registrarHistorico(atual);
    return atual;
  }

  fechar(): PdvCaixaLocal | null {
    const atual = this.obter();
    if (!atual) return null;
    const fechado: PdvCaixaLocal = { ...atual, id: atual.id || this.uuid(), status: 'FECHADO', fechadoEm: new Date().toISOString() };
    localStorage.setItem(this.key, JSON.stringify(fechado));
    this.registrarHistorico(fechado);
    return fechado;
  }

  historico(): PdvCaixaLocal[] {
    try {
      const rows = JSON.parse(localStorage.getItem(this.historicoKey) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }

  private registrarHistorico(registro: PdvCaixaLocal): void {
    const rows = this.historico().filter(row => row.id !== registro.id);
    rows.unshift(registro);
    localStorage.setItem(this.historicoKey, JSON.stringify(rows.slice(0, 200)));
  }

  private uuid(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `caixa-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
