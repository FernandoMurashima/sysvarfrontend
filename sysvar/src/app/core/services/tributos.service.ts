import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, expand, map, reduce } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tributo } from '../models/tributo';

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

@Injectable({ providedIn: 'root' })
export class TributosService {
  private baseUrl = `${environment.apiBaseUrl}/fiscal/tributos/`;

  constructor(private http: HttpClient) {}

  list(search = ''): Observable<Tributo[]> {
    let params = new HttpParams().set('page_size', '100');
    const q = (search || '').trim();
    if (q) params = params.set('search', q);
    return this.http.get<Page<Tributo>>(this.baseUrl, { params }).pipe(
      expand(p => (p.next ? this.http.get<Page<Tributo>>(p.next) : [])),
      map(p => p.results),
      reduce((acc, cur) => acc.concat(cur), [] as Tributo[]),
    );
  }

  create(body: Partial<Tributo>) { return this.http.post<Tributo>(this.baseUrl, body); }
  update(id: number, body: Partial<Tributo>) { return this.http.put<Tributo>(`${this.baseUrl}${id}/`, body); }
  delete(id: number) { return this.http.delete<void>(`${this.baseUrl}${id}/`); }
}
