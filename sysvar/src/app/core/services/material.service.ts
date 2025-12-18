import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, expand, map, reduce } from 'rxjs';
import { Material } from '../models/material';

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

@Injectable({ providedIn: 'root' })
export class MateriaisService {
  private baseUrl = `${environment.apiBaseUrl}/produto/material/`;

  constructor(private http: HttpClient) {}

  list(search: string = ''): Observable<Material[]> {
    const first$ = this.http.get<Page<Material>>(`${this.baseUrl}?ordering=Descricao&page_size=100`);
    return first$.pipe(
      expand(p => (p.next ? this.http.get<Page<Material>>(p.next) : [])),
      map(p => p.results),
      reduce((acc, cur) => acc.concat(cur), [] as Material[]),
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

  create(body: Partial<Material>) { return this.http.post<Material>(this.baseUrl, body); }
  update(id: number, body: Partial<Material>) { return this.http.put<Material>(`${this.baseUrl}${id}/`, body); }
  delete(id: number) { return this.http.delete<void>(`${this.baseUrl}${id}/`); }
}
