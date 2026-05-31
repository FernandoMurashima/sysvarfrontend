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
  ean13: string;
  ativo?: boolean;
  bloqueado_venda?: boolean;
}

type ListResp = ProdutoSku[] | { results: ProdutoSku[]; count: number };

@Injectable({ providedIn: 'root' })
export class ProdutoDetalheService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/produto/produto-detalhe/`;

  list(params?: { produto?: number; idcor?: number; idtamanho?: number }): Observable<ListResp> {
    let p = new HttpParams();
    if (params?.produto) p = p.set('produto', String(params.produto));
    if (params?.idcor) p = p.set('idcor', String(params.idcor));
    if (params?.idtamanho) p = p.set('idtamanho', String(params.idtamanho));
    return this.http.get<ListResp>(this.base, { params: p });
  }
}
