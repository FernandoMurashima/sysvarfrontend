import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { finalize } from 'rxjs';

import { CodigoAtivacaoAgenteLocal } from '../../core/models/agente-local';
import { AgenteLocalService } from '../../core/services/agente-local.service';

@Component({
  selector: 'app-agente-local',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './agente-local.component.html',
  styleUrls: ['./agente-local.component.css'],
})
export class AgenteLocalComponent {
  private api = inject(AgenteLocalService);

  codigoAtual: CodigoAtivacaoAgenteLocal | null = null;
  loading = false;
  errorMsg = '';
  successMsg = '';

  gerarCodigo(): void {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.api.gerarCodigoAtivacao().pipe(
      finalize(() => this.loading = false),
    ).subscribe({
      next: (res) => {
        this.codigoAtual = res;
        this.successMsg = 'Código de ativação gerado.';
      },
      error: (err) => {
        this.codigoAtual = null;
        this.errorMsg = err?.status === 401 || err?.status === 403
          ? 'Você não possui permissão para gerar códigos de ativação.'
          : 'Não foi possível gerar o código de ativação. Tente novamente.';
      },
    });
  }

  copiarCodigo(): void {
    const codigo = this.codigoAtual?.codigo;
    if (!codigo || !navigator?.clipboard?.writeText) {
      this.errorMsg = 'Não foi possível copiar o código automaticamente.';
      return;
    }
    navigator.clipboard.writeText(codigo).then(
      () => {
        this.errorMsg = '';
        this.successMsg = 'Código copiado.';
      },
      () => {
        this.errorMsg = 'Não foi possível copiar o código automaticamente.';
      },
    );
  }
}
