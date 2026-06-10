import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ValeTroca, ValeTrocaSaldo } from '../models/vale-troca';

@Injectable({ providedIn: 'root' })
export class ValeTrocaService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/financeiro/vales-troca/`;

  saldo(cliente: number): Observable<ValeTrocaSaldo> {
    return this.http.get<ValeTrocaSaldo>(`${this.base}saldo/`, { params: { cliente } as any });
  }

  list(params?: Record<string, string | number | null | undefined>): Observable<ValeTroca[] | { results: ValeTroca[] }> {
    const query: Record<string, string> = {};
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') query[key] = String(value);
    });
    return this.http.get<ValeTroca[] | { results: ValeTroca[] }>(this.base, { params: query });
  }

  disponiveis(cliente: number): Observable<ValeTroca[]> {
    return this.http.get<ValeTroca[]>(`${this.base}disponiveis/`, { params: { cliente } as any });
  }
}
