import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { EMPTY, Subscription, catchError, finalize, interval, startWith, switchMap } from 'rxjs';

import { HubSincronizacaoLoja } from '../../core/models/hub-sincronizacao';
import { HubSincronizacaoService } from '../../core/services/hub-sincronizacao.service';

@Component({
  selector: 'app-hub-sincronizacao',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './hub-sincronizacao.component.html',
  styleUrls: ['./hub-sincronizacao.component.css'],
})
export class HubSincronizacaoComponent implements OnInit, OnDestroy {
  private api = inject(HubSincronizacaoService);
  private polling?: Subscription;

  linhas: HubSincronizacaoLoja[] = [];
  loading = false;
  syncingAll = false;
  syncingLojaId: number | null = null;
  errorMsg = '';
  successMsg = '';

  ngOnInit(): void {
    this.polling = interval(10000).pipe(
      startWith(0),
      switchMap(() => {
        this.loading = this.linhas.length === 0;
        return this.api.listarPainel().pipe(
          catchError(() => {
            this.errorMsg = 'Não foi possível carregar o painel de sincronização.';
            return EMPTY;
          }),
          finalize(() => this.loading = false),
        );
      }),
    ).subscribe({
      next: linhas => {
        this.linhas = linhas;
        if (this.errorMsg === 'Não foi possível carregar o painel de sincronização.') {
          this.errorMsg = '';
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
  }

  sincronizarTodas(): void {
    this.syncingAll = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.api.sincronizarTodas().pipe(
      finalize(() => this.syncingAll = false),
    ).subscribe({
      next: res => {
        this.successMsg = `${res.criadas} solicitação(ões) criada(s).`;
        this.recarregar();
      },
      error: err => this.errorMsg = this.backendError(err, 'Não foi possível solicitar sincronização.'),
    });
  }

  sincronizarLoja(linha: HubSincronizacaoLoja): void {
    this.syncingLojaId = linha.loja_id;
    this.errorMsg = '';
    this.successMsg = '';
    this.api.sincronizarLoja(linha.loja_id).pipe(
      finalize(() => this.syncingLojaId = null),
    ).subscribe({
      next: () => {
        this.successMsg = 'Sincronização solicitada.';
        this.recarregar();
      },
      error: err => this.errorMsg = this.backendError(err, 'Não foi possível solicitar sincronização da loja.'),
    });
  }

  podeSincronizar(linha: HubSincronizacaoLoja): boolean {
    return linha.hub_ativo && linha.sincronizacao_status !== 'PENDENTE' && linha.sincronizacao_status !== 'PROCESSANDO';
  }

  situacaoTexto(linha: HubSincronizacaoLoja): string {
    if (linha.status_visual === 'VERDE') return 'Sincronizado';
    if (linha.status_visual === 'AMARELO') return linha.sincronizacao_status === 'PROCESSANDO' ? 'Sincronizando' : 'Aguardando';
    return linha.sincronizacao_status === 'ERRO' ? 'Erro' : 'Não sincronizado';
  }

  ultimaSincronizacao(linha: HubSincronizacaoLoja): string | null {
    return linha.concluido_em || linha.iniciado_em || linha.solicitado_em;
  }

  private recarregar(): void {
    this.api.listarPainel().subscribe({
      next: linhas => this.linhas = linhas,
      error: () => {},
    });
  }

  private backendError(err: any, fallback: string): string {
    const data = err?.error;
    if (typeof data?.detail === 'string') return data.detail;
    if (data && typeof data === 'object') {
      const first = Object.values(data)[0] as any;
      if (Array.isArray(first) && first.length) return String(first[0]);
      if (typeof first === 'string') return first;
    }
    return fallback;
  }
}
