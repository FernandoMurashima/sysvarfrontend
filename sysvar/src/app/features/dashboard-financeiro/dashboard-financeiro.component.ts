import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardCard } from '../../core/services/dashboard-executivo.service';
import { DashboardFinanceiro, DashboardFinanceiroService } from '../../core/services/dashboard-financeiro.service';

@Component({
  selector: 'app-dashboard-financeiro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-financeiro.component.html',
  styleUrls: ['./dashboard-financeiro.component.css']
})
export class DashboardFinanceiroComponent implements OnInit {
  private service = inject(DashboardFinanceiroService);
  private router = inject(Router);

  dados: DashboardFinanceiro | null = null;
  carregando = false;
  erro = '';
  telaCheia = false;
  filtros = {
    inicio: '',
    fim: '',
    comparacao: 'periodo_anterior',
    loja: '',
    conta: '',
    natureza: '',
    status: '',
    q: ''
  };

  cardIcons: Record<string, string> = {
    saldo: 'bi-arrow-up-right',
    entradas: 'bi-arrow-down-circle',
    saidas: 'bi-arrow-up-circle',
    resultado: 'bi-pie-chart',
    pagar: 'bi-wallet2',
    receber: 'bi-cash-coin'
  };

  ngOnInit(): void {
    this.definirPeriodoPadrao();
    this.carregar();
    document.addEventListener('fullscreenchange', () => this.telaCheia = !!document.fullscreenElement);
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
        this.erro = err?.error?.detail || 'Falha ao carregar dashboard financeiro.';
        this.carregando = false;
      }
    });
  }

  limpar(): void {
    this.filtros = { inicio: '', fim: '', comparacao: 'periodo_anterior', loja: '', conta: '', natureza: '', status: '', q: '' };
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

  exportar(): void {
    window.print();
  }

  definirPeriodoPadrao(): void {
    const hoje = new Date();
    const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    this.filtros.inicio = this.toInputDate(primeiro);
    this.filtros.fim = this.toInputDate(hoje);
  }

  formatar(card: DashboardCard): string {
    if (card.kind === 'money') return this.moeda(card.value);
    if (card.kind === 'percent') return this.percentual(card.value);
    return this.numero(card.value);
  }

  moeda(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }

  numero(value: number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value || 0);
  }

  percentual(value: number): string {
    return `${this.numero(value)}%`;
  }

  max(list: any[], key: string): number {
    return Math.max(...(list || []).map(row => Number(row[key] || 0)), 1);
  }

  barWidth(value: number, max: number): string {
    return `${Math.min(100, Math.round(((value || 0) / max) * 100))}%`;
  }

  fluxoMax(): number {
    const rows = this.dados?.graficos.fluxo_caixa || [];
    return Math.max(
      ...rows.flatMap(row => [Number(row.entradas || 0), Number(row.saidas || 0), Math.abs(Number(row.saldo || 0))]),
      1
    );
  }

  fluxoX(index: number): number {
    const total = this.dados?.graficos.fluxo_caixa?.length || 1;
    return total <= 1 ? 50 : 8 + (index * 84) / (total - 1);
  }

  fluxoBarY(value: number): number {
    const max = this.fluxoMax();
    return 82 - (Math.abs(value || 0) / max) * 56;
  }

  fluxoBarHeight(value: number): number {
    const max = this.fluxoMax();
    return Math.max(1, (Math.abs(value || 0) / max) * 56);
  }

  fluxoSaldoPoints(): string {
    const rows = this.dados?.graficos.fluxo_caixa || [];
    const max = this.fluxoMax();
    return rows.map((row, index) => `${this.fluxoX(index)},${82 - (Math.abs(Number(row.saldo || 0)) / max) * 56}`).join(' ');
  }

  fluxoTotal(key: 'entradas' | 'saidas'): number {
    return (this.dados?.graficos.fluxo_caixa || []).reduce((total, row) => total + Number(row[key] || 0), 0);
  }

  sparkline(key = 'saldo'): string {
    const points = this.dados?.graficos.evolucao_saldo || [];
    if (!points.length) return '';
    const max = Math.max(...points.map(p => Number((p as any)[key] || 0)), 1);
    const step = 100 / Math.max(points.length - 1, 1);
    return points.map((p, i) => `${i * step},${38 - (Number((p as any)[key] || 0) / max) * 30}`).join(' ');
  }

  alertClass(tipo: string): string {
    if (tipo === 'critico') return 'danger';
    if (tipo === 'atencao') return 'warn';
    if (tipo === 'positivo') return 'good';
    return 'info';
  }

  private toInputDate(value: Date): string {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
