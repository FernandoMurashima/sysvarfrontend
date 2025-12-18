import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PackItemModel } from '../models/pack-item';

@Injectable({ providedIn: 'root' })
export class PackItensService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/produto/pack-item/`;

  list(params?: { pack?: number; ordering?: string }): Observable<PackItemModel[] | any> {
    let httpParams = new HttpParams();
    if (params?.pack != null) httpParams = httpParams.set('pack', String(params.pack));
    if (params?.ordering)      httpParams = httpParams.set('ordering', params.ordering);
    return this.http.get<PackItemModel[] | any>(this.base, { params: httpParams });
  }

  get(id: number) { return this.http.get<PackItemModel>(`${this.base}${id}/`); }
  create(payload: Omit<PackItemModel, 'id'>) { return this.http.post<PackItemModel>(this.base, payload); }
  update(id: number, payload: Partial<PackItemModel>) { return this.http.put<PackItemModel>(`${this.base}${id}/`, payload); }
  remove(id: number) { return this.http.delete(`${this.base}${id}/`); }
}
