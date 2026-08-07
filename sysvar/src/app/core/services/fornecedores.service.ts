import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Fornecedor,
  FornecedorBloqueioPayload,
  FornecedorContato,
  FornecedorEndereco,
  FornecedorHistoricoItem,
  PaginatedResponse,
} from '../models/fornecedor';

@Injectable({ providedIn: 'root' })
export class FornecedoresService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/cadastros/fornecedores/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number; categoria?: string; utilizavel?: boolean }): Observable<PaginatedResponse<Fornecedor> | Fornecedor[]> {
    let httpParams = new HttpParams();
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    if (params?.page)      httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));
    if (params?.categoria) httpParams = httpParams.set('categoria', params.categoria);
    if (params?.utilizavel !== undefined) httpParams = httpParams.set('utilizavel', String(params.utilizavel));
    return this.http.get<PaginatedResponse<Fornecedor> | Fornecedor[]>(this.base, { params: httpParams });
  }

  get(id: number): Observable<Fornecedor> {
    return this.http.get<Fornecedor>(`${this.base}${id}/`);
  }

  create(payload: Fornecedor): Observable<Fornecedor> {
    return this.http.post<Fornecedor>(this.base, payload);
  }

  update(id: number, payload: Fornecedor): Observable<Fornecedor> {
    return this.http.put<Fornecedor>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Fornecedor>): Observable<Fornecedor> {
    return this.http.patch<Fornecedor>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }

  indicadores(): Observable<Record<string, number | string>> {
    return this.http.get<Record<string, number | string>>(`${this.base}indicadores/`);
  }

  historico(id: number, params?: { page?: number; page_size?: number }): Observable<PaginatedResponse<FornecedorHistoricoItem>> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));
    return this.http.get<PaginatedResponse<FornecedorHistoricoItem>>(`${this.base}${id}/historico/`, { params: httpParams });
  }

  compras(id: number, params?: { page?: number; page_size?: number; status?: string; loja?: number }): Observable<PaginatedResponse<any>> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.loja) httpParams = httpParams.set('loja', String(params.loja));
    return this.http.get<PaginatedResponse<any>>(`${this.base}${id}/compras/`, { params: httpParams });
  }

  financeiro(id: number, params?: { page?: number; page_size?: number }): Observable<PaginatedResponse<any>> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));
    return this.http.get<PaginatedResponse<any>>(`${this.base}${id}/financeiro/`, { params: httpParams });
  }

  ativar(id: number): Observable<Fornecedor> {
    return this.http.post<Fornecedor>(`${this.base}${id}/ativar/`, {});
  }

  inativar(id: number): Observable<Fornecedor> {
    return this.http.post<Fornecedor>(`${this.base}${id}/inativar/`, {});
  }

  bloquear(id: number, payload: FornecedorBloqueioPayload): Observable<Fornecedor> {
    return this.http.post<Fornecedor>(`${this.base}${id}/bloquear/`, payload);
  }

  desbloquear(id: number): Observable<Fornecedor> {
    return this.http.post<Fornecedor>(`${this.base}${id}/desbloquear/`, {});
  }

  contatos(id: number): Observable<FornecedorContato[]> {
    return this.http.get<FornecedorContato[]>(`${this.base}${id}/contatos/`);
  }

  criarContato(id: number, payload: FornecedorContato): Observable<FornecedorContato> {
    return this.http.post<FornecedorContato>(`${this.base}${id}/contatos/`, payload);
  }

  atualizarContato(id: number, contatoId: number, payload: Partial<FornecedorContato>): Observable<FornecedorContato> {
    return this.http.patch<FornecedorContato>(`${this.base}${id}/contatos/${contatoId}/`, payload);
  }

  enderecos(id: number): Observable<FornecedorEndereco[]> {
    return this.http.get<FornecedorEndereco[]>(`${this.base}${id}/enderecos/`);
  }

  criarEndereco(id: number, payload: FornecedorEndereco): Observable<FornecedorEndereco> {
    return this.http.post<FornecedorEndereco>(`${this.base}${id}/enderecos/`, payload);
  }

  atualizarEndereco(id: number, enderecoId: number, payload: Partial<FornecedorEndereco>): Observable<FornecedorEndereco> {
    return this.http.patch<FornecedorEndereco>(`${this.base}${id}/enderecos/${enderecoId}/`, payload);
  }
}
