import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { Ncm } from '../models/ncm';

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };
type ListResponse<T> = Page<T> | T[];

@Injectable({ providedIn: 'root' })
export class NcmsService {
  private baseUrl = `${environment.apiBaseUrl}/produto/ncm/`;

  constructor(private http: HttpClient) {}

  list(search: string = ''): Observable<Ncm[]> {
    const first$ = this.http.get<ListResponse<Ncm>>(`${this.baseUrl}?ordering=ncm&page_size=100`);
    return first$.pipe(
      expand(p => {
        const next = Array.isArray(p) ? null : p.next;
        return next ? this.http.get<ListResponse<Ncm>>(next) : EMPTY;
      }),
      map(p => Array.isArray(p) ? p : (p.results ?? [])),
      reduce((acc, cur) => acc.concat(cur), [] as Ncm[]),
      map(rows => {
        const q = (search || '').trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(r => {
          const n = (r.ncm || '').toLowerCase();
          const d = (r.descricao || '').toLowerCase();
          return n.includes(q) || d.includes(q);
        });
      })
    );
  }

  create(body: Partial<Ncm>) { return this.http.post<Ncm>(this.baseUrl, body); }
  update(id: number, body: Partial<Ncm>) { return this.http.put<Ncm>(`${this.baseUrl}${id}/`, body); }
  delete(id: number) { return this.http.delete<void>(`${this.baseUrl}${id}/`); }
}
