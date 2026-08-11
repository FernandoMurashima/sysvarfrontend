import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Funcionario } from '../models/funcionario';

@Injectable({ providedIn: 'root' })
export class FuncionariosService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/cadastros/funcionarios/`;

  list(params?: Record<string, string | number | boolean | null | undefined>): Observable<any> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') httpParams = httpParams.set(key, String(value));
    });
    return this.http.get(this.base, { params: httpParams });
  }

  get(id: number): Observable<Funcionario> {
    return this.http.get<Funcionario>(`${this.base}${id}/`);
  }

  create(payload: Funcionario): Observable<Funcionario> {
    return this.http.post<Funcionario>(this.base, payload);
  }

  update(id: number, payload: Funcionario): Observable<Funcionario> {
    return this.http.put<Funcionario>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Funcionario>): Observable<Funcionario> {
    return this.http.patch<Funcionario>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }

  indicadores(params?: Record<string, string | number | boolean | null | undefined>): Observable<any> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') httpParams = httpParams.set(key, String(value));
    });
    return this.http.get(`${this.base}indicadores/`, { params: httpParams });
  }

  historico(id: number): Observable<any> {
    return this.http.get(`${this.base}${id}/historico/`);
  }

  acao(id: number, action: 'afastar' | 'retornar' | 'desligar' | 'recontratar', payload: Record<string, unknown> = {}): Observable<Funcionario> {
    return this.http.post<Funcionario>(`${this.base}${id}/${action}/`, payload);
  }
}
