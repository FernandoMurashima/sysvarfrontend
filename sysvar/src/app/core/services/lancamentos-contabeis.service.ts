import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LancamentoContabil, LancamentoContabilListResp } from '../models/lancamento-contabil';

@Injectable({ providedIn: 'root' })
export class LancamentosContabeisService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/financeiro/lancamentos-contabeis/`;

  list(params?: Record<string, string | number | null | undefined>): Observable<LancamentoContabilListResp> {
    return this.http.get<LancamentoContabilListResp>(this.base, { params: this.toParams(params) });
  }

  pendentes(params?: Record<string, string | number | null | undefined>): Observable<LancamentoContabil[]> {
    return this.http.get<LancamentoContabil[]>(`${this.base}pendentes/`, { params: this.toParams(params) });
  }

  private toParams(params?: Record<string, string | number | null | undefined>): HttpParams {
    let p = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
    });
    return p;
  }
}
