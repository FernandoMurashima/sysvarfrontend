import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GradeModel } from '../models/grade';

@Injectable({ providedIn: 'root' })
export class GradesService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/produto/grade/`;

  list(params?: { ordering?: string }): Observable<GradeModel[] | any> {
    let hp = new HttpParams();
    if (params?.ordering) hp = hp.set('ordering', params.ordering);
    return this.http.get<GradeModel[] | any>(this.baseUrl, { params: hp });
  }
  create(payload: Omit<GradeModel, 'Idgrade'>) { return this.http.post<GradeModel>(this.baseUrl, payload); }
  update(id: number, payload: Partial<GradeModel>) { return this.http.patch<GradeModel>(`${this.baseUrl}${id}/`, payload); }
  remove(id: number) { return this.http.delete<void>(`${this.baseUrl}${id}/`); }
}
