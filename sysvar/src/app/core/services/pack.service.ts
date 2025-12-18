import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PackModel } from '../models/pack';

@Injectable({ providedIn: 'root' })
export class PacksService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/produto/pack/`;

  list(params?: { search?: string; grade?: number; ordering?: string }): Observable<PackModel[] | any> {
    let httpParams = new HttpParams();
    if (params?.search)   httpParams = httpParams.set('search', params.search);
    if (params?.grade)    httpParams = httpParams.set('grade', String(params.grade));
    if (params?.ordering) httpParams = httpParams.set('ordering', params.ordering);
    return this.http.get<PackModel[] | any>(this.base, { params: httpParams });
  }

  get(id: number) { return this.http.get<PackModel>(`${this.base}${id}/`); }
  create(payload: Omit<PackModel, 'id' | 'data_cadastro' | 'atualizado_em'>) { return this.http.post<PackModel>(this.base, payload); }
  update(id: number, payload: Partial<PackModel>) { return this.http.put<PackModel>(`${this.base}${id}/`, payload); }
  patch(id: number, payload: Partial<PackModel>) { return this.http.patch<PackModel>(`${this.base}${id}/`, payload); }
  remove(id: number) { return this.http.delete(`${this.base}${id}/`); }
}
