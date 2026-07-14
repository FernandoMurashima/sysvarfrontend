import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrdemProducao, OrdemProducaoItem } from '../models/ordem-producao';

type ListResp<T> = T[] | { results: T[]; count?: number; next?: string | null; previous?: string | null };

@Injectable({ providedIn: 'root' })
export class OrdemProducaoService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/produto/ordem-producao/`;
  private itensBase = `${environment.apiBaseUrl}/produto/ordem-producao-item/`;

  list(params?: Record<string, string | number | boolean | null | undefined>): Observable<ListResp<OrdemProducao>> {
    return this.http.get<ListResp<OrdemProducao>>(this.base, { params: this.params(params) });
  }

  painel(): Observable<any> {
    return this.http.get<any>(`${this.base}painel/`);
  }

  create(body: Partial<OrdemProducao>) {
    return this.http.post<OrdemProducao>(this.base, body);
  }

  update(id: number, body: Partial<OrdemProducao>) {
    return this.http.put<OrdemProducao>(`${this.base}${id}/`, body);
  }

  aprovar(id: number) {
    return this.http.post<OrdemProducao>(`${this.base}${id}/aprovar/`, {});
  }

  iniciar(id: number) {
    return this.http.post<OrdemProducao>(`${this.base}${id}/iniciar/`, {});
  }

  finalizar(id: number) {
    return this.http.post<OrdemProducao>(`${this.base}${id}/finalizar/`, {});
  }

  validarEstoque(id: number) {
    return this.http.get<{
      ok: boolean;
      loja: string;
      faltas: Array<{ produto: string; referencia: string; codigo: string; loja: string; necessario: number; saldo: number; falta: number }>;
    }>(`${this.base}${id}/validar-estoque/`);
  }

  distribuir(id: number, body: { loja_destino: number; documento?: string; itens: Array<{ sku_final: number; quantidade: number }> }) {
    return this.http.post<any>(`${this.base}${id}/distribuir/`, body);
  }

  cancelar(id: number) {
    return this.http.post<OrdemProducao>(`${this.base}${id}/cancelar/`, {});
  }

  itens(ordem: number) {
    return this.http.get<ListResp<OrdemProducaoItem>>(this.itensBase, { params: this.params({ ordem }) });
  }

  enviarFaccao(itemId: number, body: { quantidade: number; documento?: string; data_envio?: string }) {
    return this.http.post<OrdemProducaoItem>(`${this.itensBase}${itemId}/enviar-faccao/`, body);
  }

  retornarFaccao(itemId: number, body: { quantidade: number; custo_unitario_real?: number; data_retorno?: string }) {
    return this.http.post<OrdemProducaoItem>(`${this.itensBase}${itemId}/retornar-faccao/`, body);
  }

  private params(params?: Record<string, string | number | boolean | null | undefined>) {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') hp = hp.set(key, String(value));
    });
    return hp;
  }
}
