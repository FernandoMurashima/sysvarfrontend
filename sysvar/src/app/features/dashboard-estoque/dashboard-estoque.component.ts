import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardCard } from '../../core/services/dashboard-executivo.service';
import { DashboardEstoque, DashboardEstoqueService } from '../../core/services/dashboard-estoque.service';

@Component({
  selector: 'app-dashboard-estoque',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-estoque.component.html',
  styleUrls: ['./dashboard-estoque.component.css']
})
export class DashboardEstoqueComponent implements OnInit {
  private service = inject(DashboardEstoqueService);
  private router = inject(Router);

  dados: DashboardEstoque | null = null;
  carregando = false;
  erro = '';
  telaCheia = false;
  filtros = {
    inicio: '',
    fim: '',
    comparacao: 'periodo_anterior',
    loja: '',
    grupo: '',
    colecao: '',
    estacao: '',
    status: '',
    q: ''
  };

  cardIcons: Record<string, string> = {
    valor: 'bi-box-seam',
    quantidade: 'bi-stack',
    ativos: 'bi-check2-square',
    giro: 'bi-arrow-repeat',
    cobertura: 'bi-calendar-range',
    sem_venda: 'bi-exclamation-triangle'
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
        this.erro = err?.error?.detail || 'Falha ao carregar dashboard de estoque.';
        this.carregando = false;
      }
    });
  }

  limpar(): void {
    this.filtros = { inicio: '', fim: '', comparacao: 'periodo_anterior', loja: '', grupo: '', colecao: '', estacao: '', status: '', q: '' };
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

  sparkline(): string {
    const points = this.dados?.graficos.evolucao || [];
    if (!points.length) return '';
    const max = Math.max(...points.map(p => p.valor || 0), 1);
    const step = 100 / Math.max(points.length - 1, 1);
    return points.map((p, i) => `${i * step},${38 - ((p.valor || 0) / max) * 30}`).join(' ');
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
