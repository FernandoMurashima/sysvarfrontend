import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Caixa } from '../models/caixa';

type ListResp = Caixa[] | { results: Caixa[]; count: number };

@Injectable({ providedIn: 'root' })
export class CaixasService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/financeiro/caixas/`;

  list(params?: { loja?: number; ativo?: boolean; tipo_caixa?: 'LOJA' | 'MASTER' }): Observable<ListResp> {
    let p = new HttpParams();
    if (params?.loja) p = p.set('loja', String(params.loja));
    if (typeof params?.ativo === 'boolean') p = p.set('ativo', params.ativo ? 'true' : 'false');
    if (params?.tipo_caixa) p = p.set('tipo_caixa', params.tipo_caixa);
    return this.http.get<ListResp>(this.base, { params: p });
  }

  create(payload: Partial<Caixa>): Observable<Caixa> {
    return this.http.post<Caixa>(this.base, payload);
  }

  update(id: number, payload: Partial<Caixa>): Observable<Caixa> {
    return this.http.put<Caixa>(`${this.base}${id}/`, payload);
  }

  transferir(payload: {
    caixa_origem: number;
    caixa_destino: number;
    documento?: string | null;
    valor: number;
    data_movimento: string;
    observacao?: string | null;
  }): Observable<any> {
    return this.http.post<any>(`${this.base}transferir/`, payload);
  }

  lancarDespesa(id: number, payload: {
    tipo_despesa?: number | null;
    natureza?: number | null;
    valor: number;
    documento?: string | null;
    historico?: string | null;
    data_movimento?: string | null;
  }): Observable<any> {
    return this.http.post<any>(`${this.base}${id}/lancar-despesa/`, payload);
  }

  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
