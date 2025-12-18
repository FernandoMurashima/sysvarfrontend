import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, expand, map, reduce } from 'rxjs';
import { TabelaPreco } from '../models/tabelapreco';

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

@Injectable({ providedIn: 'root' })
export class TabelaprecoService {
  private baseUrl = `${environment.apiBaseUrl}/produto/tabela-preco/`;

  constructor(private http: HttpClient) {}

  list(search: string = ''): Observable<TabelaPreco[]> {
    const first$ = this.http.get<Page<TabelaPreco>>(`${this.baseUrl}?ordering=-DataInicio&page_size=100`);
    return first$.pipe(
      expand(p => (p.next ? this.http.get<Page<TabelaPreco>>(p.next) : [])),
      map(p => p.results),
      reduce((acc, cur) => acc.concat(cur), [] as TabelaPreco[]),
      map(rows => {
        const q = (search || '').trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(r => (r.NomeTabela || '').toLowerCase().includes(q));
      })
    );
  }

  create(body: Partial<TabelaPreco>) { return this.http.post<TabelaPreco>(this.baseUrl, body); }
  update(id: number, body: Partial<TabelaPreco>) { return this.http.put<TabelaPreco>(`${this.baseUrl}${id}/`, body); }
  delete(id: number) { return this.http.delete<void>(`${this.baseUrl}${id}/`); }
}
