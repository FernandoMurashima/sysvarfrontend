import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject, fromEvent, merge } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ElectronBridgeService } from '../electron/electron-bridge.service';
import { PdvDesktopStatus } from '../electron/sysvar-pdv-api';

@Injectable({ providedIn: 'root' })
export class PdvConnectivityService {
  private bridge = inject(ElectronBridgeService);
  private zone = inject(NgZone);
  private readonly healthUrl = `${environment.apiBaseUrl.replace(/\/$/, '')}/health/`;
  private readonly checkIntervalMs = 10000;
  private readonly checkTimeoutMs = 3000;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private checkSeq = 0;
  private subject = new BehaviorSubject<PdvDesktopStatus>({
    runtime: 'browser',
    online: false,
    apiReachable: false,
    pendencias: 0
  });

  readonly status$ = this.subject.asObservable();

  constructor() {
    if (typeof window !== 'undefined') {
      this.zone.runOutsideAngular(() => {
        merge(fromEvent(window, 'online'), fromEvent(window, 'offline')).subscribe(() => this.refresh());
        this.intervalId = setInterval(() => this.refresh(), this.checkIntervalMs);
      });
    }
    this.refresh();
  }

  refresh(): void {
    const seq = ++this.checkSeq;
    const navegadorOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

    Promise.all([
      this.bridge.status().catch(() => this.subject.value),
      navegadorOnline ? this.pingBackend() : Promise.resolve(false)
    ]).then(([status, apiReachable]) => {
      if (seq !== this.checkSeq) return;
      this.zone.run(() => this.subject.next({
        ...status,
        online: navegadorOnline && apiReachable,
        apiReachable,
        atualizadoEm: new Date().toISOString()
      }));
    });
  }

  snapshot(): PdvDesktopStatus {
    return this.subject.value;
  }

  private pingBackend(): Promise<boolean> {
    if (typeof fetch === 'undefined') return Promise.resolve(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.checkTimeoutMs);
    const separator = this.healthUrl.includes('?') ? '&' : '?';
    const url = `${this.healthUrl}${separator}_pdv=${Date.now()}`;

    return fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' }
    })
      .then(response => response.ok)
      .catch(() => false)
      .finally(() => clearTimeout(timeoutId));
  }
}
