import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { Material } from '../models/material';

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

@Injectable({ providedIn: 'root' })
export class MateriaisService {
  private baseUrl = `${environment.apiBaseUrl}/produto/material/`;

  constructor(private http: HttpClient) {}

  list(params: string): Observable<Material[]>;
  list(params?: Record<string, string | number | null | undefined>): Observable<Page<Material> | Material[]>;
  list(params: Record<string, string | number | null | undefined> | string = {}): Observable<Page<Material> | Material[]> {
    if (typeof params === 'string') {
      const hp = new HttpParams()
        .set('search', params)
        .set('ordering', 'Descricao')
        .set('page_size', '200');
      return this.http.get<Page<Material>>(this.baseUrl, { params: hp }).pipe(map(resp => resp.results ?? []));
    }
    let hp = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') hp = hp.set(key, String(value));
    });
    return this.http.get<Page<Material> | Material[]>(this.baseUrl, { params: hp });
  }

  create(body: Partial<Material>) { return this.http.post<Material>(this.baseUrl, body); }
  update(id: number, body: Partial<Material>) { return this.http.put<Material>(`${this.baseUrl}${id}/`, body); }
  delete(id: number) { return this.http.delete<void>(`${this.baseUrl}${id}/`); }
}
