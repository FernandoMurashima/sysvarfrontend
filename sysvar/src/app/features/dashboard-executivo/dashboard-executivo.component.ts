import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardCard, DashboardExecutivo, DashboardExecutivoService } from '../../core/services/dashboard-executivo.service';

@Component({
  selector: 'app-dashboard-executivo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-executivo.component.html',
  styleUrls: ['./dashboard-executivo.component.css']
})
export class DashboardExecutivoComponent implements OnInit {
  private service = inject(DashboardExecutivoService);
  private router = inject(Router);

  dados: DashboardExecutivo | null = null;
  carregando = false;
  erro = '';
  telaCheia = false;

  filtros = {
    empresa: '',
    inicio: '',
    fim: '',
    comparacao: 'periodo_anterior',
    loja: '',
    vendedor: '',
    canal: ''
  };

  cardIcons: Record<string, string> = {
    faturamento: 'bi-currency-dollar',
    receita_liquida: 'bi-graph-up-arrow',
    ticket_medio: 'bi-receipt',
    quantidade_vendas: 'bi-cart-check',
    margem_bruta: 'bi-percent',
    lucro_bruto: 'bi-cash-coin',
    cmv: 'bi-box-seam',
    descontos: 'bi-tag',
    devolucoes: 'bi-arrow-counterclockwise',
    cancelamentos: 'bi-x-circle',
    saldo_caixa: 'bi-safe',
    contas_pagar: 'bi-credit-card',
    contas_receber: 'bi-wallet2',
    valor_estoque: 'bi-boxes'
  };

  ngOnInit(): void {
    this.definirPeriodoPadrao();
    this.carregar();
    document.addEventListener('fullscreenchange', () => {
      this.telaCheia = !!document.fullscreenElement;
    });
  }

  definirPeriodoPadrao(): void {
    const hoje = new Date();
    const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    this.filtros.inicio = this.toInputDate(primeiro);
    this.filtros.fim = this.toInputDate(hoje);
  }

  carregar(): void {
    this.carregando = true;
    this.erro = '';
    this.service.get(this.filtros).subscribe({
      next: dados => {
        this.dados = dados;
        this.carregando = false;
      },
      error: err => {
        this.erro = err?.error?.detail || 'Falha ao carregar dashboard executivo.';
        this.carregando = false;
      }
    });
  }

  limpar(): void {
    this.filtros = { empresa: '', inicio: '', fim: '', comparacao: 'periodo_anterior', loja: '', vendedor: '', canal: '' };
    this.definirPeriodoPadrao();
    this.carregar();
  }

  home(): void {
    this.router.navigateByUrl('/home');
  }

  alternarTelaCheia(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      return;
    }
    document.exitFullscreen?.();
  }

  formatar(card: DashboardCard): string {
    if (card.kind === 'money') return this.moeda(card.value);
    if (card.kind === 'percent') return `${this.numero(card.value)}%`;
    return this.numero(card.value);
  }

  moeda(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }

  numero(value: number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value || 0);
  }

  data(value: string): string {
    if (!value) return '-';
    const [ano, mes, dia] = value.slice(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }

  percentual(value: number): string {
    return `${this.numero(value)}%`;
  }

  sparkline(points: Array<{ atual: number }>): string {
    if (!points.length) return '';
    const values = points.map(p => p.atual || 0);
    const max = Math.max(...values, 1);
    const step = 100 / Math.max(values.length - 1, 1);
    return values.map((value, index) => `${index * step},${42 - (value / max) * 34}`).join(' ');
  }

  linePath(key: 'atual' | 'anterior'): string {
    const points = this.dados?.graficos.faturamento_diario || [];
    if (!points.length) return '';
    const values = points.map(p => p[key] || 0);
    const max = Math.max(...points.flatMap(p => [p.atual || 0, p.anterior || 0]), 1);
    const step = 460 / Math.max(values.length - 1, 1);
    return values.map((value, index) => `${index * step},${190 - (value / max) * 170}`).join(' ');
  }

  maxLoja(): number {
    return Math.max(...(this.dados?.graficos.lojas || []).map(l => l.total), 1);
  }

  pagamentoColor(index: number): string {
    return ['#16a34a', '#2563eb', '#f59e0b', '#7c3aed', '#ef4444', '#06b6d4'][index % 6];
  }

  goalWidth(value: number): string {
    return `${Math.min(Math.max(value || 0, 0), 100)}%`;
  }

  alertaIcon(tipo: string): string {
    if (tipo === 'critico') return 'bi-exclamation-triangle-fill';
    if (tipo === 'atencao') return 'bi-exclamation-circle-fill';
    if (tipo === 'ok') return 'bi-check-circle-fill';
    return 'bi-info-circle-fill';
  }

  private toInputDate(value: Date): string {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
