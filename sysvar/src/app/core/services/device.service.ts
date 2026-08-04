import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private key = 'sysvar_device_id';

  getDeviceId(): string {
    let id = localStorage.getItem(this.key);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : this.fallbackUuid();
      localStorage.setItem(this.key, id);
    }
    return id;
  }

  private fallbackUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
