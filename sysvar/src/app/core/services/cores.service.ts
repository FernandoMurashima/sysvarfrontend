import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cor } from '../models/cor';

@Injectable({ providedIn: 'root' })
export class CoresService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/produto/cor/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<Cor[] | any> {
    let httpParams = new HttpParams();
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    if (params?.page)      httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));
    return this.http.get<Cor[] | any>(this.base, { params: httpParams });
  }

  get(id: number): Observable<Cor> {
    return this.http.get<Cor>(`${this.base}${id}/`);
  }

  create(payload: Cor): Observable<Cor> {
    return this.http.post<Cor>(this.base, payload);
  }

  update(id: number, payload: Cor): Observable<Cor> {
    return this.http.put<Cor>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Cor>): Observable<Cor> {
    return this.http.patch<Cor>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
