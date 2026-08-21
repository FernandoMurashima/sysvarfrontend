import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cotacao, CotacaoItem, Paginated } from '../models/cotacao';

@Injectable({ providedIn: 'root' })
export class CotacoesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/compras/cotacoes/`;
  private itensBase = `${environment.apiBaseUrl}/compras/cotacao-itens/`;
  private lojasBase = `${environment.apiBaseUrl}/compras/requisicoes/lojas-permitidas/`;

  listar(params?: { loja?: number; status?: string; page?: number; page_size?: number }): Observable<Cotacao[] | Paginated<Cotacao>> {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') hp = hp.set(key, String(value));
    });
    return this.http.get<Cotacao[] | Paginated<Cotacao>>(this.base, { params: hp });
  }

  get(id: number): Observable<Cotacao> {
    return this.http.get<Cotacao>(`${this.base}${id}/`);
  }

  criar(payload: Partial<Cotacao>): Observable<Cotacao> {
    return this.http.post<Cotacao>(this.base, payload);
  }

  atualizar(id: number, payload: Partial<Cotacao>): Observable<Cotacao> {
    return this.http.patch<Cotacao>(`${this.base}${id}/`, payload);
  }

  lojasPermitidas(): Observable<any[] | Paginated<any>> {
    return this.http.get<any[] | Paginated<any>>(this.lojasBase);
  }

  listarItens(cotacao: number): Observable<CotacaoItem[] | Paginated<CotacaoItem>> {
    const params = new HttpParams().set('cotacao', String(cotacao));
    return this.http.get<CotacaoItem[] | Paginated<CotacaoItem>>(this.itensBase, { params });
  }

  criarItem(payload: Partial<CotacaoItem>): Observable<CotacaoItem> {
    return this.http.post<CotacaoItem>(this.itensBase, payload);
  }

  atualizarItem(id: number, payload: Partial<CotacaoItem>): Observable<CotacaoItem> {
    return this.http.patch<CotacaoItem>(`${this.itensBase}${id}/`, payload);
  }

  excluirItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.itensBase}${id}/`);
  }
}
