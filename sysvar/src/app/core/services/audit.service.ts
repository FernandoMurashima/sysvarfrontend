import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuditFilters, AuditIndicators, AuditLogDetail, PaginatedAuditLogs } from '../models/audit';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/auditoria/logs`;

  list(filters: AuditFilters = {}) {
    return this.http.get<PaginatedAuditLogs>(`${this.baseUrl}/`, { params: this.params(filters) });
  }

  get(id: number) {
    return this.http.get<AuditLogDetail>(`${this.baseUrl}/${id}/`);
  }

  getIndicators(filters: AuditFilters = {}) {
    return this.http.get<AuditIndicators>(`${this.baseUrl}/indicadores/`, { params: this.params(filters, false) });
  }

  exportCsv(filters: AuditFilters = {}) {
    return this.http.get(`${this.baseUrl}/exportar/`, {
      params: this.params(filters, false),
      responseType: 'blob',
    });
  }

  private params(filters: AuditFilters, includePaging = true): HttpParams {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (!includePaging && ['page', 'page_size'].includes(key)) return;
      params = params.set(key, String(value));
    });
    return params;
  }
}
