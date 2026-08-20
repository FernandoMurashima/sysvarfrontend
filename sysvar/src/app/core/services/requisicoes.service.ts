import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Paginated, Requisicao, RequisicaoFinalidadeAquisicao, RequisicaoHistorico, RequisicaoItem, RequisicaoMaterialCategoria, RequisicaoServicoCategoria, RequisicaoSetor } from '../models/requisicao';

@Injectable({ providedIn: 'root' })
export class RequisicoesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/compras/requisicoes/`;
  private itens = `${environment.apiBaseUrl}/compras/requisicao-itens/`;
  private historico = `${environment.apiBaseUrl}/compras/requisicao-historico/`;
  private categorias = `${environment.apiBaseUrl}/compras/requisicao-servico-categorias/`;
  private setores = `${environment.apiBaseUrl}/compras/requisicao-setores/`;
  private categoriasMaterial = `${environment.apiBaseUrl}/compras/requisicao-material-categorias/`;
  private finalidades = `${environment.apiBaseUrl}/compras/requisicao-finalidades-aquisicao/`;

  listar(params?: Record<string, string | number | boolean | null | undefined>): Observable<Requisicao[] | Paginated<Requisicao>> {
    return this.http.get<Requisicao[] | Paginated<Requisicao>>(this.base, { params: this.params(params) });
  }

  get(id: number): Observable<Requisicao> {
    return this.http.get<Requisicao>(`${this.base}${id}/`);
  }

  create(payload: Partial<Requisicao>): Observable<Requisicao> {
    return this.http.post<Requisicao>(this.base, payload);
  }

  update(id: number, payload: Partial<Requisicao>): Observable<Requisicao> {
    return this.http.patch<Requisicao>(`${this.base}${id}/`, payload);
  }

  enviar(id: number, observacao = ''): Observable<Requisicao> {
    return this.http.post<Requisicao>(`${this.base}${id}/enviar/`, { observacao });
  }

  salvarEnviar(id: number, requisicao: Partial<Requisicao>, observacao = ''): Observable<Requisicao> {
    return this.http.post<Requisicao>(`${this.base}${id}/salvar-enviar/`, { requisicao, observacao });
  }

  aprovar(id: number, observacao = ''): Observable<Requisicao> {
    return this.http.post<Requisicao>(`${this.base}${id}/aprovar/`, { observacao });
  }

  rejeitar(id: number, motivo: string): Observable<Requisicao> {
    return this.http.post<Requisicao>(`${this.base}${id}/rejeitar/`, { motivo });
  }

  devolver(id: number, motivo: string): Observable<Requisicao> {
    return this.http.post<Requisicao>(`${this.base}${id}/devolver/`, { motivo });
  }

  cancelar(id: number, motivo: string): Observable<Requisicao> {
    return this.http.post<Requisicao>(`${this.base}${id}/cancelar/`, { motivo });
  }

  listarItens(requisicao: number): Observable<RequisicaoItem[] | Paginated<RequisicaoItem>> {
    return this.http.get<RequisicaoItem[] | Paginated<RequisicaoItem>>(this.itens, { params: new HttpParams().set('requisicao', String(requisicao)) });
  }

  createItem(payload: Partial<RequisicaoItem>): Observable<RequisicaoItem> {
    return this.http.post<RequisicaoItem>(this.itens, payload);
  }

  updateItem(id: number, payload: Partial<RequisicaoItem>): Observable<RequisicaoItem> {
    return this.http.patch<RequisicaoItem>(`${this.itens}${id}/`, payload);
  }

  deleteItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.itens}${id}/`);
  }

  atenderItem(id: number, quantidade: number, observacao = ''): Observable<RequisicaoItem> {
    return this.http.post<RequisicaoItem>(`${this.itens}${id}/atender/`, { quantidade, observacao });
  }

  aguardarCotacao(id: number): Observable<RequisicaoItem> {
    return this.http.post<RequisicaoItem>(`${this.itens}${id}/aguardar-cotacao/`, {});
  }

  listarHistorico(requisicao: number): Observable<RequisicaoHistorico[] | Paginated<RequisicaoHistorico>> {
    return this.http.get<RequisicaoHistorico[] | Paginated<RequisicaoHistorico>>(this.historico, { params: new HttpParams().set('requisicao', String(requisicao)) });
  }

  listarCategorias(): Observable<RequisicaoServicoCategoria[] | Paginated<RequisicaoServicoCategoria>> {
    return this.http.get<RequisicaoServicoCategoria[] | Paginated<RequisicaoServicoCategoria>>(this.categorias, { params: new HttpParams().set('ativo', 'true') });
  }

  listarSetores(): Observable<RequisicaoSetor[] | Paginated<RequisicaoSetor>> {
    let params = new HttpParams().set('ativo', 'true').set('pode_fazer_requisicao', 'true');
    return this.http.get<RequisicaoSetor[] | Paginated<RequisicaoSetor>>(this.setores, { params });
  }

  listarSetoresAdmin(params?: Record<string, string | number | boolean | null | undefined>): Observable<RequisicaoSetor[] | Paginated<RequisicaoSetor>> {
    return this.http.get<RequisicaoSetor[] | Paginated<RequisicaoSetor>>(this.setores, { params: this.params(params) });
  }

  listarCategoriasMaterial(params?: Record<string, string | number | boolean | null | undefined>): Observable<RequisicaoMaterialCategoria[] | Paginated<RequisicaoMaterialCategoria>> {
    return this.http.get<RequisicaoMaterialCategoria[] | Paginated<RequisicaoMaterialCategoria>>(this.categoriasMaterial, { params: this.params(params || { ativo: 'true' }) });
  }

  criarCategoriaMaterial(payload: Partial<RequisicaoMaterialCategoria>): Observable<RequisicaoMaterialCategoria> {
    return this.http.post<RequisicaoMaterialCategoria>(this.categoriasMaterial, payload);
  }

  atualizarCategoriaMaterial(id: number, payload: Partial<RequisicaoMaterialCategoria>): Observable<RequisicaoMaterialCategoria> {
    return this.http.patch<RequisicaoMaterialCategoria>(`${this.categoriasMaterial}${id}/`, payload);
  }

  ativarCategoriaMaterial(id: number): Observable<RequisicaoMaterialCategoria> {
    return this.http.post<RequisicaoMaterialCategoria>(`${this.categoriasMaterial}${id}/ativar/`, {});
  }

  inativarCategoriaMaterial(id: number): Observable<RequisicaoMaterialCategoria> {
    return this.http.post<RequisicaoMaterialCategoria>(`${this.categoriasMaterial}${id}/inativar/`, {});
  }

  listarFinalidadesAquisicao(params?: Record<string, string | number | boolean | null | undefined>): Observable<RequisicaoFinalidadeAquisicao[] | Paginated<RequisicaoFinalidadeAquisicao>> {
    return this.http.get<RequisicaoFinalidadeAquisicao[] | Paginated<RequisicaoFinalidadeAquisicao>>(this.finalidades, { params: this.params(params || { ativo: 'true' }) });
  }

  criarFinalidadeAquisicao(payload: Partial<RequisicaoFinalidadeAquisicao>): Observable<RequisicaoFinalidadeAquisicao> {
    return this.http.post<RequisicaoFinalidadeAquisicao>(this.finalidades, payload);
  }

  atualizarFinalidadeAquisicao(id: number, payload: Partial<RequisicaoFinalidadeAquisicao>): Observable<RequisicaoFinalidadeAquisicao> {
    return this.http.patch<RequisicaoFinalidadeAquisicao>(`${this.finalidades}${id}/`, payload);
  }

  ativarFinalidadeAquisicao(id: number): Observable<RequisicaoFinalidadeAquisicao> {
    return this.http.post<RequisicaoFinalidadeAquisicao>(`${this.finalidades}${id}/ativar/`, {});
  }

  inativarFinalidadeAquisicao(id: number): Observable<RequisicaoFinalidadeAquisicao> {
    return this.http.post<RequisicaoFinalidadeAquisicao>(`${this.finalidades}${id}/inativar/`, {});
  }

  criarSetor(payload: Partial<RequisicaoSetor>): Observable<RequisicaoSetor> {
    return this.http.post<RequisicaoSetor>(this.setores, payload);
  }

  atualizarSetor(id: number, payload: Partial<RequisicaoSetor>): Observable<RequisicaoSetor> {
    return this.http.patch<RequisicaoSetor>(`${this.setores}${id}/`, payload);
  }

  ativarSetor(id: number): Observable<RequisicaoSetor> {
    return this.http.post<RequisicaoSetor>(`${this.setores}${id}/ativar/`, {});
  }

  inativarSetor(id: number): Observable<RequisicaoSetor> {
    return this.http.post<RequisicaoSetor>(`${this.setores}${id}/inativar/`, {});
  }

  private params(input?: Record<string, string | number | boolean | null | undefined>): HttpParams {
    let params = new HttpParams();
    Object.entries(input || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return params;
  }
}
