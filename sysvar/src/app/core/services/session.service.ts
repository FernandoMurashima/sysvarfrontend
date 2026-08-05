import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

type SessionListResponse<T> = T[] | { count?: number; results?: T[] };
export type SessionListResult<T = any> = { count: number; results: T[] };

@Injectable({ providedIn: 'root' })
export class SessionService {
  private http = inject(HttpClient);
  private timer: any = null;
  private base = `${environment.apiBaseUrl}/accounts/sessoes`;

  heartbeat() {
    return this.http.post<any>(`${this.base}/heartbeat/`, {});
  }

  listActiveSessions() {
    return this.http.get<any>(`${this.base}/`, { params: { ativa: 'true' } });
  }

  listSessions(params?: { empresa?: number; usuario?: number; ativa?: boolean | string; [key: string]: any }) {
    return this.listSessionsWithCount(params).pipe(map(response => response.results));
  }

  listSessionsWithCount(params?: { empresa?: number; usuario?: number; ativa?: boolean | string; [key: string]: any }) {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') httpParams = httpParams.set(key, String(value));
    });
    return this.http.get<SessionListResponse<any>>(`${this.base}/`, { params: httpParams })
      .pipe(map(response => this.normalizeListResult(response)));
  }

  normalizeListResponse<T>(response: SessionListResponse<T> | null | undefined): T[] {
    return this.normalizeListResult(response).results;
  }

  normalizeListResult<T>(response: SessionListResponse<T> | null | undefined): SessionListResult<T> {
    if (Array.isArray(response)) return { count: response.length, results: response };
    const results = Array.isArray(response?.results) ? response.results : [];
    const count = typeof response?.count === 'number' ? response.count : results.length;
    return { count, results };
  }

  terminateSession(id: number) {
    return this.http.post<any>(`${this.base}/${id}/encerrar/`, {});
  }

  startHeartbeat(onInvalid: () => void): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.heartbeat().subscribe({ error: () => { this.stopHeartbeat(); onInvalid(); } });
    }, 120000);
  }

  stopHeartbeat(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
