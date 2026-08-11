import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cargo } from '../models/cargo';

@Injectable({ providedIn: 'root' })
export class CargosService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/cadastros/cargos/`;

  list(params?: Record<string, string | number | boolean | null | undefined>): Observable<any> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') httpParams = httpParams.set(key, String(value));
    });
    return this.http.get(this.base, { params: httpParams });
  }

  get(id: number): Observable<Cargo> {
    return this.http.get<Cargo>(`${this.base}${id}/`);
  }

  create(payload: Cargo): Observable<Cargo> {
    return this.http.post<Cargo>(this.base, payload);
  }

  update(id: number, payload: Cargo): Observable<Cargo> {
    return this.http.put<Cargo>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Cargo>): Observable<Cargo> {
    return this.http.patch<Cargo>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}${id}/`);
  }
}
