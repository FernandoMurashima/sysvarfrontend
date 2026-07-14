import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProdutoSku {
  IdprodutoDetalhe?: number;
  id?: number;
  produto: number;
  idcor: number;
  idtamanho: number;
  codigo_item_ref?: string;
  ean13: string;
  cor_descricao?: string;
  tamanho_descricao?: string;
  custo_original?: number | string;
  custo_ultima_compra?: number | string;
  custo_medio?: number | string;
  preco_venda?: number | string;
  margem_valor?: number | string;
  margem_percentual?: number | string;
  estoque_total?: number;
  ativo?: boolean;
  bloqueado_venda?: boolean;
}

type ListResp = ProdutoSku[] | { results: ProdutoSku[]; count: number };

@Injectable({ providedIn: 'root' })
export class ProdutoDetalheService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/produto/produto-detalhe/`;

  list(params?: { produto?: number; idcor?: number; idtamanho?: number; page_size?: number }): Observable<ListResp> {
    let p = new HttpParams();
    if (params?.produto) p = p.set('produto', String(params.produto));
    if (params?.idcor) p = p.set('idcor', String(params.idcor));
    if (params?.idtamanho) p = p.set('idtamanho', String(params.idtamanho));
    if (params?.page_size) p = p.set('page_size', String(params.page_size));
    return this.http.get<ListResp>(this.base, { params: p });
  }
}
