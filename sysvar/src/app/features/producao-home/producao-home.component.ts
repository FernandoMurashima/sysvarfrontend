import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdemProducaoService } from '../../core/services/ordem-producao.service';

@Component({
  selector: 'app-producao-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './producao-home.component.html',
  styleUrls: ['./producao-home.component.css'],
})
export class ProducaoHomeComponent implements OnInit {
  private api = inject(OrdemProducaoService);

  loading = false;
  errorMsg = '';
  painel: any = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.api.painel().subscribe({
      next: res => this.painel = res,
      error: () => this.errorMsg = 'Falha ao carregar o painel de produção.',
      complete: () => this.loading = false,
    });
  }

  money(value: any): string {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  qtd(value: any): string {
    return Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  }

  statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      ABERTA: 'Aberta',
      APROVADA: 'Aprovada',
      EM_PRODUCAO: 'Em produção',
      FINALIZADA: 'Finalizada',
      CANCELADA: 'Cancelada',
      PENDENTE: 'Pendente',
      ENVIADO: 'Enviado',
      RETORNADO: 'Retornado',
    };
    return labels[String(status || '')] || '-';
  }
}
