import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cliente, ClienteBloqueioPayload, ClienteComprasFiltros, ClienteComprasResponse, ClienteFiltros, ClienteHistoricoResponse, ClienteIndicadores, PaginatedResponse } from '../../core/models/clientes';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/cadastros/clientes/`;

  list(params?: ClienteFiltros): Observable<PaginatedResponse<Cliente>> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<PaginatedResponse<Cliente>>(this.base, { params: httpParams });
  }

  indicadores(params?: ClienteFiltros): Observable<ClienteIndicadores> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<ClienteIndicadores>(`${this.base}indicadores/`, { params: httpParams });
  }

  get(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.base}${id}/`);
  }

  create(payload: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(this.base, payload);
  }

  update(id: number, payload: Cliente): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Cliente>): Observable<Cliente> {
    return this.http.patch<Cliente>(`${this.base}${id}/`, payload);
  }

  ativar(id: number): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.base}${id}/ativar/`, {});
  }

  inativar(id: number): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.base}${id}/inativar/`, {});
  }

  bloquear(id: number, payload: ClienteBloqueioPayload): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.base}${id}/bloquear/`, payload);
  }

  desbloquear(id: number): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.base}${id}/desbloquear/`, {});
  }

  historico(id: number, page = 1, pageSize = 10): Observable<ClienteHistoricoResponse> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('page_size', String(pageSize));
    return this.http.get<ClienteHistoricoResponse>(`${this.base}${id}/historico/`, { params });
  }

  compras(id: number, filtros?: ClienteComprasFiltros): Observable<ClienteComprasResponse> {
    let params = new HttpParams();
    Object.entries(filtros || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ClienteComprasResponse>(`${this.base}${id}/compras/`, { params });
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}

