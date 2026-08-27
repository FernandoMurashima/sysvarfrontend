import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PaginatedProdutoFornecedor, ProdutoFornecedor, ProdutoFornecedorPayload, ProdutoFornecedorUpdatePayload } from '../models/produto-fornecedor';

@Injectable({ providedIn: 'root' })
export class ProdutoFornecedorService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/produto/produto-fornecedor/`;

  list(params?: {
    fornecedor?: number | string | null;
    produto?: number | string | null;
    codigo?: string;
    search?: string;
    ativo?: 'true' | 'false' | '';
    page?: number;
    page_size?: number;
    ordering?: string;
  }): Observable<ProdutoFornecedor[] | PaginatedProdutoFornecedor> {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') hp = hp.set(key, String(value));
    });
    return this.http.get<ProdutoFornecedor[] | PaginatedProdutoFornecedor>(this.base, { params: hp });
  }

  create(payload: ProdutoFornecedorPayload): Observable<ProdutoFornecedor> {
    return this.http.post<ProdutoFornecedor>(this.base, payload);
  }

  update(id: number, payload: ProdutoFornecedorUpdatePayload): Observable<ProdutoFornecedor> {
    return this.http.patch<ProdutoFornecedor>(`${this.base}${id}/`, payload);
  }

  ativar(id: number): Observable<ProdutoFornecedor> {
    return this.http.post<ProdutoFornecedor>(`${this.base}${id}/ativar/`, {});
  }

  inativar(id: number): Observable<ProdutoFornecedor> {
    return this.http.post<ProdutoFornecedor>(`${this.base}${id}/inativar/`, {});
  }
}
