import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NotaFiscalSaida } from '../../core/models/nota-fiscal-saida';
import { NotasFiscaisSaidaService } from '../../core/services/notas-fiscais-saida.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-faturamento',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './faturamento.component.html',
  styleUrls: ['./faturamento.component.css'],
})
export class FaturamentoComponent implements OnInit {
  private api = inject(NotasFiscaisSaidaService);
  private auth = inject(AuthService);

  loading = false;
  errorMsg = '';
  successMsg = '';
  search = '';
  status = '';
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  notas: NotaFiscalSaida[] = [];
  selecionada: NotaFiscalSaida | null = null;

  get podeEditarModulo(): boolean { return this.auth.podeAcessarModulo('fiscal', true) !== false; }
  get totalNotas(): number { return this.notas.length; }
  get prontas(): number { return this.notas.filter(n => n.status === 'PR' || n.status === 'DI').length; }
  get autorizadas(): number { return this.notas.filter(n => n.status === 'AU').length; }
  get valorTotal(): number { return this.notas.reduce((sum, n) => sum + this.num(n.valor_total), 0); }
  get filtradas(): NotaFiscalSaida[] {
    const term = this.search.trim().toLowerCase();
    return this.notas.filter(n => !term || [n.numero, n.serie, n.chave_acesso, n.documento_origem, n.loja_destino_nome].some(v => String(v || '').toLowerCase().includes(term)));
  }
  get paginadas(): NotaFiscalSaida[] { return this.filtradas.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtradas.length / this.pageSize)); }
  get pageStart(): number { return this.filtradas.length ? (this.page - 1) * this.pageSize + 1 : 0; }
  get pageEnd(): number { return Math.min(this.filtradas.length, this.page * this.pageSize); }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, status: this.status, origem: 'TRANSFERENCIA', page_size: 500 }).subscribe({
      next: resp => {
        this.notas = this.unwrap<NotaFiscalSaida>(resp);
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMsg = this.errorText(err, 'Falha ao carregar faturamento.');
      },
    });
  }

  selecionar(nota: NotaFiscalSaida): void {
    this.api.get(nota.id).subscribe({
      next: full => this.selecionada = full,
      error: err => this.errorMsg = this.errorText(err, 'Falha ao consultar NF-e.'),
    });
  }

  autorizar(): void {
    if (!this.selecionada?.id || !this.podeEditarModulo) return;
    this.api.autorizar(this.selecionada.id).subscribe({
      next: nota => {
        this.selecionada = nota;
        this.successMsg = `NF-e ${nota.numero} autorizada.`;
        this.load();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao autorizar NF-e.'),
    });
  }

  doSearch(): void { this.page = 1; this.load(); }
  clearSearch(): void { this.search = ''; this.status = ''; this.page = 1; this.load(); }
  firstPage(): void { this.page = 1; }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }
  lastPage(): void { this.page = this.totalPages; }
  onPageSizeChange(size: string): void { this.pageSize = Number(size) || 20; this.page = 1; }
  isSelected(nota: NotaFiscalSaida): boolean { return this.selecionada?.id === nota.id; }
  statusLabel(status: string): string { return ({ DI: 'Digitada', PR: 'Pronta', AU: 'Autorizada', CA: 'Cancelada' } as Record<string, string>)[status] || status; }
  statusClass(status: string): string { return `st-${status.toLowerCase()}`; }
  num(v: unknown): number { return Number(v || 0); }
  qty(v: unknown): string { return this.num(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 }); }
  money(v: unknown): string { return this.num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  trackByNota(_: number, item: NotaFiscalSaida): number { return item.id; }
  trackByItem(_: number, item: any): number { return item.id; }

  private unwrap<T>(resp: T[] | { results: T[] } | any): T[] { return Array.isArray(resp) ? resp : (resp?.results || []); }
  private errorText(err: any, fallback: string): string {
    const data = err?.error;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    return String(first || fallback);
  }
}
