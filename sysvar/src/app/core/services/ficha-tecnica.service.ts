import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FichaTecnica, FichaTecnicaItem } from '../models/ficha-tecnica';

type ListResp<T> = T[] | { results: T[]; count?: number; next?: string | null; previous?: string | null };

@Injectable({ providedIn: 'root' })
export class FichaTecnicaService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/produto/ficha-tecnica/`;
  private itensBase = `${environment.apiBaseUrl}/produto/ficha-tecnica-item/`;

  list(params?: Record<string, string | number | boolean | null | undefined>): Observable<ListResp<FichaTecnica>> {
    return this.http.get<ListResp<FichaTecnica>>(this.base, { params: this.params(params) });
  }

  create(body: Partial<FichaTecnica>) {
    return this.http.post<FichaTecnica>(this.base, body);
  }

  update(id: number, body: Partial<FichaTecnica>) {
    return this.http.put<FichaTecnica>(`${this.base}${id}/`, body);
  }

  remove(id: number) {
    return this.http.delete<void>(`${this.base}${id}/`);
  }

  aprovar(id: number) {
    return this.http.post<FichaTecnica>(`${this.base}${id}/aprovar/`, {});
  }

  createItem(body: Partial<FichaTecnicaItem>) {
    return this.http.post<FichaTecnicaItem>(this.itensBase, body);
  }

  updateItem(id: number, body: Partial<FichaTecnicaItem>) {
    return this.http.put<FichaTecnicaItem>(`${this.itensBase}${id}/`, body);
  }

  removeItem(id: number) {
    return this.http.delete<void>(`${this.itensBase}${id}/`);
  }

  private params(params?: Record<string, string | number | boolean | null | undefined>) {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') hp = hp.set(key, String(value));
    });
    return hp;
  }
}
