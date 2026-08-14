import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Colecao } from '../models/colecao';
import { Observable, map } from 'rxjs';
import { HttpParams } from '@angular/common/http';

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

@Injectable({ providedIn: 'root' })
export class ColecoesService {
  private baseUrl = `${environment.apiBaseUrl}/produto/colecao/`;

  constructor(private http: HttpClient) {}

  list(params: Record<string, string | number | null | undefined> | string = {}): Observable<Page<Colecao> | Colecao[]> {
    if (typeof params === 'string') {
      const hp = new HttpParams()
        .set('search', params)
        .set('ordering', '-Codigo')
        .set('page_size', '200');
      return this.http.get<Page<Colecao>>(this.baseUrl, { params: hp }).pipe(map(resp => resp.results ?? []));
    }
    let hp = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') hp = hp.set(key, String(value));
    });
    return this.http.get<Page<Colecao> | Colecao[]>(this.baseUrl, { params: hp });
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
