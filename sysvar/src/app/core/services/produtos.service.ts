import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Produto } from '../models/produto';

type Paginated<T> = { results: T[]; count?: number; next?: string | null; previous?: string | null };

@Injectable({ providedIn: 'root' })
export class ProdutosService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/produto/produto/`;
  private imagensBase = `${environment.apiBaseUrl}/produto/produto-imagem/`;

  list(params?: { search?: string; referencia?: string; codigo?: string; ordering?: string; page?: number; page_size?: number; ativo?: 'all' | 'true' | 'false'; tipo_produto?: '1' | '2' | '3' | '4' | string; grupo?: number | string; colecao?: number | string; subgrupo?: number | string; bloqueado_venda?: 'true' | 'false' | string }): Observable<Produto[] | Paginated<Produto>> {
    let hp = new HttpParams();
    if (params?.search)    hp = hp.set('search', params.search);
    if (params?.referencia) hp = hp.set('referencia', params.referencia);
    if (params?.codigo)    hp = hp.set('codigo', params.codigo);
    if (params?.ordering)  hp = hp.set('ordering', params.ordering);
    if (params?.page)      hp = hp.set('page', String(params.page));
    if (params?.page_size) hp = hp.set('page_size', String(params.page_size));
    if (params?.ativo)     hp = hp.set('ativo', params.ativo);
    if (params?.tipo_produto) hp = hp.set('tipo_produto', params.tipo_produto);
    if (params?.grupo) hp = hp.set('grupo', String(params.grupo));
    if (params?.colecao) hp = hp.set('colecao', String(params.colecao));
    if (params?.subgrupo) hp = hp.set('subgrupo', String(params.subgrupo));
    if (params?.bloqueado_venda) hp = hp.set('bloqueado_venda', params.bloqueado_venda);
    return this.http.get<Produto[] | Paginated<Produto>>(this.base, { params: hp });
  }

  get(id: number) { return this.http.get<Produto>(`${this.base}${id}/`); }
  create(body: Partial<Produto>) { return this.http.post<Produto>(this.base, body); }
  update(id: number, body: Partial<Produto>) { return this.http.put<Produto>(`${this.base}${id}/`, body); }
  patch(id: number, body: Partial<Produto>) { return this.http.patch<Produto>(`${this.base}${id}/`, body); }
  remove(id: number) { return this.http.delete<void>(`${this.base}${id}/`); }

  // Ações custom do backend
  ativarProduto(id: number) {
    return this.http.post<Produto>(`${this.base}${id}/ativar/`, {});
  }
  inativarProduto(id: number, motivo: string, senha: string) {
    return this.http.post<Produto>(`${this.base}${id}/inativar/`, { motivo, senha });
  }
  bloquearVenda(id: number, motivo: string, senha: string) {
    return this.http.post<Produto>(`${this.base}${id}/bloquear-venda/`, { motivo, senha });
  }
  desbloquearVenda(id: number) {
    return this.http.post<Produto>(`${this.base}${id}/desbloquear-venda/`, {});
  }
  gerarSkus(id: number, cores: number[], tamanhos?: number[]) {
    const body: any = { cores };
    if (tamanhos && tamanhos.length) body.tamanhos = tamanhos;
    return this.http.post(`${this.base}${id}/gerar-skus/`, body);
  }

  inicializarEstoque(id: number, lojas: number[]) {
    return this.http.post(`${this.base}${id}/inicializar-estoque/`, { lojas });
  }

  historico(id: number, params?: { page?: number; page_size?: number }) {
    let hp = new HttpParams();
    if (params?.page) hp = hp.set('page', String(params.page));
    if (params?.page_size) hp = hp.set('page_size', String(params.page_size));
    return this.http.get(`${this.base}${id}/historico/`, { params: hp });
  }

  imagens(id: number) {
    const params = new HttpParams().set('produto', String(id));
    return this.http.get(`${this.imagensBase}`, { params });
  }

  criarImagem(produtoId: number, arquivo: File, principal: boolean, ordem: number) {
    const body = new FormData();
    body.append('produto', String(produtoId));
    body.append('imagem', arquivo);
    body.append('principal', String(principal));
    body.append('ordem', String(ordem));
    return this.http.post(`${this.imagensBase}`, body);
  }

  marcarImagemPrincipal(id: number) {
    return this.http.post(`${this.imagensBase}${id}/marcar-principal/`, {});
  }

  removerImagem(id: number) {
    return this.http.delete(`${this.imagensBase}${id}/`);
  }
}
