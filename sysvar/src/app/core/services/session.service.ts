import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
