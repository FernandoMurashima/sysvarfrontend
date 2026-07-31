import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Distribuicao, DistribuicaoDestino, MercadoriaTransito, PedidoVendaDistribuicao, PerfilDistribuicao, PerfilDistribuicaoItem } from '../models/distribuicao';
import { NotaFiscalSaida } from '../models/nota-fiscal-saida';

type ListResp<T> = T[] | { results: T[]; count: number };

@Injectable({ providedIn: 'root' })
export class DistribuicaoService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/distribuicao`;

  list(params?: Record<string, string | number | null | undefined>): Observable<ListResp<Distribuicao>> {
    return this.http.get<ListResp<Distribuicao>>(`${this.base}/distribuicoes/`, { params: this.params(params) });
  }

  get(id: number): Observable<Distribuicao> {
    return this.http.get<Distribuicao>(`${this.base}/distribuicoes/${id}/`);
  }

  create(payload: Partial<Distribuicao>): Observable<Distribuicao> {
    return this.http.post<Distribuicao>(`${this.base}/distribuicoes/`, payload);
  }

  update(id: number, payload: Partial<Distribuicao>): Observable<Distribuicao> {
    return this.http.patch<Distribuicao>(`${this.base}/distribuicoes/${id}/`, payload);
  }

  carregarEstoque(id: number, payload: { search?: string; quantidade?: number | null; manter_minimo?: number | null }): Observable<{ itens_criados: number; distribuicao: Distribuicao }> {
    return this.http.post<{ itens_criados: number; distribuicao: Distribuicao }>(`${this.base}/distribuicoes/${id}/carregar-estoque/`, payload);
  }

  estoqueDisponivel(params: { origem: number; search?: string }): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/distribuicoes/estoque-disponivel/`, { params: this.params(params) });
  }

  aplicarPerfil(id: number, perfil: number): Observable<Distribuicao> {
    return this.http.post<Distribuicao>(`${this.base}/distribuicoes/${id}/aplicar-perfil/`, { perfil });
  }

  montarMatriz(id: number, lojas_destino?: number[]): Observable<{ lojas: number; distribuicao: Distribuicao }> {
    return this.http.post<{ lojas: number; distribuicao: Distribuicao }>(`${this.base}/distribuicoes/${id}/montar-matriz/`, { lojas_destino: lojas_destino || [] });
  }

  atualizarDestino(id: number, destino: number, quantidade: number, bloqueado_recalculo = true): Observable<DistribuicaoDestino> {
    return this.http.post<DistribuicaoDestino>(`${this.base}/distribuicoes/${id}/atualizar-destino/`, { destino, quantidade, bloqueado_recalculo });
  }

  confirmar(id: number): Observable<Distribuicao> {
    return this.http.post<Distribuicao>(`${this.base}/distribuicoes/${id}/confirmar/`, {});
  }

  gerarPedidos(id: number): Observable<PedidoVendaDistribuicao[]> {
    return this.http.post<PedidoVendaDistribuicao[]>(`${this.base}/distribuicoes/${id}/gerar-pedidos/`, {});
  }

  cancelar(id: number, motivo = ''): Observable<Distribuicao> {
    return this.http.post<Distribuicao>(`${this.base}/distribuicoes/${id}/cancelar/`, { motivo });
  }

  listPerfis(params?: Record<string, string | number | null | undefined>): Observable<ListResp<PerfilDistribuicao>> {
    return this.http.get<ListResp<PerfilDistribuicao>>(`${this.base}/perfis/`, { params: this.params(params) });
  }

  createPerfil(payload: Partial<PerfilDistribuicao>): Observable<PerfilDistribuicao> {
    return this.http.post<PerfilDistribuicao>(`${this.base}/perfis/`, payload);
  }

  updatePerfil(id: number, payload: Partial<PerfilDistribuicao>): Observable<PerfilDistribuicao> {
    return this.http.patch<PerfilDistribuicao>(`${this.base}/perfis/${id}/`, payload);
  }

  createPerfilItem(payload: Partial<PerfilDistribuicaoItem>): Observable<PerfilDistribuicaoItem> {
    return this.http.post<PerfilDistribuicaoItem>(`${this.base}/perfis-itens/`, payload);
  }

  updatePerfilItem(id: number, payload: Partial<PerfilDistribuicaoItem>): Observable<PerfilDistribuicaoItem> {
    return this.http.patch<PerfilDistribuicaoItem>(`${this.base}/perfis-itens/${id}/`, payload);
  }

  listPedidos(params?: Record<string, string | number | null | undefined>): Observable<ListResp<PedidoVendaDistribuicao>> {
    return this.http.get<ListResp<PedidoVendaDistribuicao>>(`${this.base}/pedidos-venda/`, { params: this.params(params) });
  }

  getPedido(id: number): Observable<PedidoVendaDistribuicao> {
    return this.http.get<PedidoVendaDistribuicao>(`${this.base}/pedidos-venda/${id}/`);
  }

  atualizarPedidoItem(id: number, item: number, payload: { quantidade?: number; preco_unitario?: number }): Observable<PedidoVendaDistribuicao> {
    return this.http.post<PedidoVendaDistribuicao>(`${this.base}/pedidos-venda/${id}/atualizar-item/`, { item, ...payload });
  }

  faturarPedido(id: number): Observable<PedidoVendaDistribuicao> {
    return this.http.post<PedidoVendaDistribuicao>(`${this.base}/pedidos-venda/${id}/faturar/`, {});
  }

  gerarNotasPedidos(ids: number[]): Observable<NotaFiscalSaida[]> {
    return this.http.post<NotaFiscalSaida[]>(`${this.base}/pedidos-venda/gerar-notas/`, { pedidos: ids });
  }

  listTransitos(params?: Record<string, string | number | null | undefined>): Observable<ListResp<MercadoriaTransito>> {
    return this.http.get<ListResp<MercadoriaTransito>>(`${this.base}/transitos/`, { params: this.params(params) });
  }

  confirmarRecebimentoNota(payload: { nfe_numero: string; loja_destino?: number | null; itens: Array<{ transito: number; quantidade_recebida: number | string }> }): Observable<MercadoriaTransito[]> {
    return this.http.post<MercadoriaTransito[]>(`${this.base}/transitos/confirmar-nota/`, payload);
  }

  private params(params?: Record<string, string | number | null | undefined>): HttpParams {
    let p = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
    });
    return p;
  }
}
