import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, expand, map, reduce } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cfop } from '../models/cfop';

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

@Injectable({ providedIn: 'root' })
export class CfopsService {
  private baseUrl = `${environment.apiBaseUrl}/fiscal/cfop/`;

  constructor(private http: HttpClient) {}

  list(search = ''): Observable<Cfop[]> {
    let params = new HttpParams().set('page_size', '100');
    const q = (search || '').trim();
    if (q) params = params.set('search', q);
    return this.http.get<Page<Cfop>>(this.baseUrl, { params }).pipe(
      expand(p => (p.next ? this.http.get<Page<Cfop>>(p.next) : [])),
      map(p => p.results),
      reduce((acc, cur) => acc.concat(cur), [] as Cfop[]),
    );
  }

  create(body: Partial<Cfop>) { return this.http.post<Cfop>(this.baseUrl, body); }
  update(id: number, body: Partial<Cfop>) { return this.http.put<Cfop>(`${this.baseUrl}${id}/`, body); }
  delete(id: number) { return this.http.delete<void>(`${this.baseUrl}${id}/`); }
}
