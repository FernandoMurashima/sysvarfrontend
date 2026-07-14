import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ParcelaFinanceira, TipoTituloFinanceiro, TituloFinanceiro } from '../models/financeiro-titulo';

type ListResp<T> = T[] | { results: T[]; count: number };

@Injectable({ providedIn: 'root' })
export class FinanceiroTitulosService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/financeiro`;

  list(tipo: TipoTituloFinanceiro, params?: Record<string, string | number | boolean | null | undefined>): Observable<ListResp<TituloFinanceiro>> {
    return this.http.get<ListResp<TituloFinanceiro>>(`${this.base}/${tipo}/`, { params: this.toParams(params) });
  }

  get(tipo: TipoTituloFinanceiro, id: number): Observable<TituloFinanceiro> {
    return this.http.get<TituloFinanceiro>(`${this.base}/${tipo}/${id}/`);
  }

  create(tipo: TipoTituloFinanceiro, payload: Partial<TituloFinanceiro>): Observable<TituloFinanceiro> {
    return this.http.post<TituloFinanceiro>(`${this.base}/${tipo}/`, payload);
  }

  update(tipo: TipoTituloFinanceiro, id: number, payload: Partial<TituloFinanceiro>): Observable<TituloFinanceiro> {
    return this.http.put<TituloFinanceiro>(`${this.base}/${tipo}/${id}/`, payload);
  }

  remove(tipo: TipoTituloFinanceiro, id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${tipo}/${id}/`);
  }

  createParcela(tipo: TipoTituloFinanceiro, payload: Partial<ParcelaFinanceira>): Observable<ParcelaFinanceira> {
    return this.http.post<ParcelaFinanceira>(`${this.base}/${this.itemPath(tipo)}/`, payload);
  }

  baixarParcela(tipo: TipoTituloFinanceiro, id: number, payload: {
    valor_baixa: number;
    data_baixa: string;
    juros?: number;
    multa?: number;
    tarifa?: number;
    desconto?: number;
  }): Observable<ParcelaFinanceira> {
    return this.http.post<ParcelaFinanceira>(`${this.base}/${this.itemPath(tipo)}/${id}/baixar/`, payload);
  }

  cancelarParcela(tipo: TipoTituloFinanceiro, id: number, motivo = ''): Observable<ParcelaFinanceira> {
    return this.http.post<ParcelaFinanceira>(`${this.base}/${this.itemPath(tipo)}/${id}/cancelar/`, { motivo });
  }

  reabrirParcela(tipo: TipoTituloFinanceiro, id: number, motivo = ''): Observable<ParcelaFinanceira> {
    return this.http.post<ParcelaFinanceira>(`${this.base}/${this.itemPath(tipo)}/${id}/reabrir/`, { motivo });
  }

  private itemPath(tipo: TipoTituloFinanceiro): string {
    return tipo === 'pagar' ? 'pagar-item' : 'receber-item';
  }

  private toParams(params?: Record<string, string | number | boolean | null | undefined>): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }
}
