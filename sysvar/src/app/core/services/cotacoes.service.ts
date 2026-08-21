import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cotacao, CotacaoComparativo, CotacaoFornecedor, CotacaoItem, CotacaoItemApoioDecisao, CotacaoNecessidade, CotacaoProposta, CotacaoRequisicaoDisponivel, Paginated } from '../models/cotacao';

@Injectable({ providedIn: 'root' })
export class CotacoesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/compras/cotacoes/`;
  private itensBase = `${environment.apiBaseUrl}/compras/cotacao-itens/`;
  private fornecedoresBase = `${environment.apiBaseUrl}/compras/cotacao-fornecedores/`;
  private propostasBase = `${environment.apiBaseUrl}/compras/cotacao-propostas/`;

  listar(params?: { loja?: number; status?: string; page?: number; page_size?: number }): Observable<Cotacao[] | Paginated<Cotacao>> {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) hp = hp.set(key, String(value));
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

  listarFornecedores(cotacao: number): Observable<CotacaoFornecedor[] | Paginated<CotacaoFornecedor>> {
    const params = new HttpParams().set('cotacao', String(cotacao));
    return this.http.get<CotacaoFornecedor[] | Paginated<CotacaoFornecedor>>(this.fornecedoresBase, { params });
  }

  adicionarFornecedor(payload: Partial<CotacaoFornecedor>): Observable<CotacaoFornecedor> {
    return this.http.post<CotacaoFornecedor>(this.fornecedoresBase, payload);
  }

  atualizarFornecedor(id: number, payload: Partial<CotacaoFornecedor>): Observable<CotacaoFornecedor> {
    return this.http.patch<CotacaoFornecedor>(`${this.fornecedoresBase}${id}/`, payload);
  }

  removerFornecedor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.fornecedoresBase}${id}/`);
  }

  listarPropostas(params?: { cotacao?: number; cotacao_fornecedor?: number }): Observable<CotacaoProposta[] | Paginated<CotacaoProposta>> {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) hp = hp.set(key, String(value));
    });
    return this.http.get<CotacaoProposta[] | Paginated<CotacaoProposta>>(this.propostasBase, { params: hp });
  }

  criarProposta(payload: Partial<CotacaoProposta>): Observable<CotacaoProposta> {
    return this.http.post<CotacaoProposta>(this.propostasBase, payload);
  }

  atualizarProposta(id: number, payload: Partial<CotacaoProposta>): Observable<CotacaoProposta> {
    return this.http.patch<CotacaoProposta>(`${this.propostasBase}${id}/`, payload);
  }

  comparativo(cotacao: number): Observable<CotacaoComparativo> {
    return this.http.get<CotacaoComparativo>(`${this.base}${cotacao}/comparativo/`);
  }

  selecionarVencedor(cotacao: number, proposta: number, justificativa?: string): Observable<Cotacao> {
    return this.http.post<Cotacao>(`${this.base}${cotacao}/selecionar-vencedor/`, { proposta, justificativa: justificativa || '' });
  }

  enviarAprovacao(cotacao: number): Observable<Cotacao> {
    return this.http.post<Cotacao>(`${this.base}${cotacao}/enviar-aprovacao/`, {});
  }

  aprovar(cotacao: number): Observable<Cotacao> {
    return this.http.post<Cotacao>(`${this.base}${cotacao}/aprovar/`, {});
  }

  rejeitar(cotacao: number, motivo: string): Observable<Cotacao> {
    return this.http.post<Cotacao>(`${this.base}${cotacao}/rejeitar/`, { motivo });
  }

  apoioDecisaoItem(id: number): Observable<CotacaoItemApoioDecisao> {
    return this.http.get<CotacaoItemApoioDecisao>(`${this.itensBase}${id}/apoio-decisao/`);
  }

  requisicoesDisponiveis(): Observable<CotacaoRequisicaoDisponivel[]> {
    return this.http.get<CotacaoRequisicaoDisponivel[]>(`${this.base}requisicoes-disponiveis/`);
  }

  necessidades(params?: { categoria?: number | string; search?: string; loja?: number | string; setor?: number | string }): Observable<CotacaoNecessidade[]> {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') hp = hp.set(key, String(value));
    });
    return this.http.get<CotacaoNecessidade[]>(`${this.base}necessidades/`, { params: hp });
  }

  adicionarRequisicoes(cotacao: number, requisicoes: number[]): Observable<Cotacao> {
    return this.http.post<Cotacao>(`${this.base}${cotacao}/adicionar-requisicoes/`, { requisicoes });
  }

  removerRequisicao(cotacao: number, requisicao: number): Observable<Cotacao> {
    return this.http.post<Cotacao>(`${this.base}${cotacao}/remover-requisicao/`, { requisicao });
  }
}
