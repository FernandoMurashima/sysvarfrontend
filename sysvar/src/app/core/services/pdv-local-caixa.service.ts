import { Injectable } from '@angular/core';

export interface PdvCaixaLocal {
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
      loja,
      caixa,
      usuario,
      abertoEm: new Date().toISOString(),
      status: 'ABERTO'
    };
    localStorage.setItem(this.key, JSON.stringify(atual));
    return atual;
  }

  fechar(): PdvCaixaLocal | null {
    const atual = this.obter();
    if (!atual) return null;
    const fechado: PdvCaixaLocal = { ...atual, status: 'FECHADO', fechadoEm: new Date().toISOString() };
    localStorage.setItem(this.key, JSON.stringify(fechado));
    return fechado;
  }
}
