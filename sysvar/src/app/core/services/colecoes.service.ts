import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Colecao } from '../models/colecao';
import { Observable, expand, map, reduce } from 'rxjs';

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

@Injectable({ providedIn: 'root' })
export class ColecoesService {
  private baseUrl = `${environment.apiBaseUrl}/produto/colecao/`;

  constructor(private http: HttpClient) {}

  /** Busca todas as páginas do DRF e filtra no client (padrão Loja). */
  list(search: string = ''): Observable<Colecao[]> {
    const first$ = this.http.get<Page<Colecao>>(
      `${this.baseUrl}?ordering=-Codigo&page_size=100`
    );

    return first$.pipe(
      expand(page => (page.next ? this.http.get<Page<Colecao>>(page.next) : [])),
      map(page => page.results),
      reduce((acc, cur) => acc.concat(cur), [] as Colecao[]),
      map(rows => {
        const q = (search || '').trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(r => {
          const d = (r.Descricao || '').toLowerCase();
          const c = (r.Codigo || '').toLowerCase();
          return d.includes(q) || c.includes(q);
        });
      })
    );
  }

  create(body: Partial<Colecao>) {
    return this.http.post<Colecao>(this.baseUrl, body);
  }

  update(id: number, body: Partial<Colecao>) {
    return this.http.put<Colecao>(`${this.baseUrl}${id}/`, body);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }
}
