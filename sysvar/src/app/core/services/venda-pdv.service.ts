import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CupomPdv, FinalizarVendaPdvPayload, RelatorioVendas, VendaPdv } from '../models/venda-pdv';

@Injectable({ providedIn: 'root' })
export class VendaPdvService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/fiscal`;

  finalizar(payload: FinalizarVendaPdvPayload): Observable<VendaPdv> {
    return this.http.post<VendaPdv>(`${this.base}/vendas-pdv/finalizar/`, payload);
  }

  cupom(nfceId: number): Observable<CupomPdv> {
    return this.http.get<CupomPdv>(`${this.base}/nfce/${nfceId}/cupom/`);
  }

  relatorioVendas(params?: Record<string, string | number | null | undefined>): Observable<RelatorioVendas> {
    const query: Record<string, string> = {};
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') query[key] = String(value);
    });
    return this.http.get<RelatorioVendas>(`${this.base}/vendas-pdv/relatorio-vendas/`, { params: query });
  }
}
