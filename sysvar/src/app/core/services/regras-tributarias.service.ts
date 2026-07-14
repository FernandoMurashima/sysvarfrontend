import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, expand, map, reduce } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RegraTributaria } from '../models/regra-tributaria';

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

@Injectable({ providedIn: 'root' })
export class RegrasTributariasService {
  private baseUrl = `${environment.apiBaseUrl}/fiscal/regras-tributarias/`;

  constructor(private http: HttpClient) {}

  list(search = ''): Observable<RegraTributaria[]> {
    let params = new HttpParams().set('page_size', '100');
    const q = (search || '').trim();
    if (q) params = params.set('search', q);
    return this.http.get<Page<RegraTributaria>>(this.baseUrl, { params }).pipe(
      expand(p => (p.next ? this.http.get<Page<RegraTributaria>>(p.next) : [])),
      map(p => p.results),
      reduce((acc, cur) => acc.concat(cur), [] as RegraTributaria[]),
    );
  }

  create(body: Partial<RegraTributaria>) { return this.http.post<RegraTributaria>(this.baseUrl, body); }
  update(id: number, body: Partial<RegraTributaria>) { return this.http.put<RegraTributaria>(`${this.baseUrl}${id}/`, body); }
  delete(id: number) { return this.http.delete<void>(`${this.baseUrl}${id}/`); }
}
