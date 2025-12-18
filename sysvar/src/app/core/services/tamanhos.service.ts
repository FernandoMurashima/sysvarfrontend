import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TamanhoModel } from '../models/tamanho';

type Paginated<T> = { results: T[]; count?: number; next?: string | null; previous?: string | null };

@Injectable({ providedIn: 'root' })
export class TamanhosService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/produto/tamanho/`;

  /** Sempre retorna array normalizado */
  list(params?: { idgrade?: number; ordering?: string }): Observable<TamanhoModel[]> {
    let hp = new HttpParams();
    if (params?.idgrade != null) hp = hp.set('idgrade', String(params.idgrade));
    if (params?.ordering) hp = hp.set('ordering', params.ordering);
    return this.http.get<TamanhoModel[] | Paginated<TamanhoModel>>(this.baseUrl, { params: hp }).pipe(
      map((data) => (Array.isArray(data) ? data : data?.results ?? []))
    );
  }

  /** Alias por grade – também normalizado para array */
  listByGrade(idgrade: number): Observable<TamanhoModel[]> {
    const params = new HttpParams().set('idgrade', String(idgrade));
    return this.http.get<TamanhoModel[] | Paginated<TamanhoModel>>(this.baseUrl, { params }).pipe(
      map((data) => (Array.isArray(data) ? data : data?.results ?? []))
    );
  }

  create(payload: Omit<TamanhoModel, 'Idtamanho'>): Observable<TamanhoModel> {
    return this.http.post<TamanhoModel>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<TamanhoModel>): Observable<TamanhoModel> {
    return this.http.patch<TamanhoModel>(`${this.baseUrl}${id}/`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }
}
