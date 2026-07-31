import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PedidoVendaDistribuicao, PedidoVendaDistribuicaoItem } from '../../core/models/distribuicao';
import { DistribuicaoService } from '../../core/services/distribuicao.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-pedidos-venda-distribuicao',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pedidos-venda-distribuicao.component.html',
  styleUrls: ['./pedidos-venda-distribuicao.component.css'],
})
export class PedidosVendaDistribuicaoComponent implements OnInit {
  private api = inject(DistribuicaoService);
  private auth = inject(AuthService);

  loading = false;
  errorMsg = '';
  successMsg = '';
  search = '';
  status = '';
  indicatorsVisible = true;
  filtersVisible = true;
  columnsOpen = false;
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  pedidos: PedidoVendaDistribuicao[] = [];
  selecionado: PedidoVendaDistribuicao | null = null;
  selecionados = new Set<number>();

  readonly viewPrefsKey = 'sysvar.ui.preferences.pedidos-venda-distribuicao';

  get podeEditarModulo(): boolean { return this.auth.podeAcessarModulo('estoque', true) !== false; }
  get totalPedidos(): number { return this.pedidos.length; }
  get aguardando(): number { return this.pedidos.filter(p => p.status === 'AGF' || p.status === 'AB').length; }
  get faturados(): number { return this.pedidos.filter(p => p.status === 'FAT').length; }
  get totalPecas(): number { return this.pedidos.reduce((sum, p) => sum + this.num(p.quantidade_total), 0); }
  get totalValor(): number { return this.pedidos.reduce((sum, p) => sum + this.num(p.valor_total_venda), 0); }
  get filtrados(): PedidoVendaDistribuicao[] {
    const term = this.search.trim().toLowerCase();
    return this.pedidos.filter(p => !term || [p.numero, p.distribuicao_numero, p.loja_destino_nome, p.unidade_origem_nome].some(v => String(v || '').toLowerCase().includes(term)));
  }
  get paginados(): PedidoVendaDistribuicao[] { return this.filtrados.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtrados.length / this.pageSize)); }
  get pageStart(): number { return this.filtrados.length ? (this.page - 1) * this.pageSize + 1 : 0; }
  get pageEnd(): number { return Math.min(this.filtrados.length, this.page * this.pageSize); }

  ngOnInit(): void {
    this.loadViewPreference();
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.listPedidos({ search: this.search, status: this.status, page_size: 500 }).subscribe({
      next: resp => {
        this.pedidos = this.unwrap<PedidoVendaDistribuicao>(resp);
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMsg = this.errorText(err, 'Falha ao carregar pedidos de venda.');
      },
    });
  }

  selecionar(pedido: PedidoVendaDistribuicao): void {
    if (!pedido.id) return;
    this.api.getPedido(pedido.id).subscribe({
      next: full => this.selecionado = full,
      error: err => this.errorMsg = this.errorText(err, 'Falha ao consultar pedido.'),
    });
  }

  atualizarItem(item: PedidoVendaDistribuicaoItem): void {
    if (!this.selecionado?.id || !item.id || !this.podeEditarModulo) return;
    this.api.atualizarPedidoItem(this.selecionado.id, item.id, {
      quantidade: this.num(item.quantidade),
      preco_unitario: this.num(item.preco_unitario),
    }).subscribe({
      next: pedido => {
        this.selecionado = pedido;
        this.successMsg = 'Item atualizado.';
        this.load();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao atualizar item.'),
    });
  }

  togglePedido(pedido: PedidoVendaDistribuicao, event?: Event): void {
    event?.stopPropagation();
    if (!pedido.id || !['AB', 'AGF'].includes(pedido.status) || pedido.nfe_numero) return;
    if (this.selecionados.has(pedido.id)) this.selecionados.delete(pedido.id);
    else this.selecionados.add(pedido.id);
  }

  gerarNotas(): void {
    if (!this.podeEditarModulo || !this.selecionados.size) return;
    this.api.gerarNotasPedidos(Array.from(this.selecionados)).subscribe({
      next: notas => {
        this.successMsg = `${notas.length} NF-e gerada(s) para faturamento.`;
        this.selecionados.clear();
        this.load();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao gerar NF-e.'),
    });
  }

  faturar(): void {
    if (!this.selecionado?.id || !this.podeEditarModulo) return;
    this.api.faturarPedido(this.selecionado.id).subscribe({
      next: pedido => {
        this.selecionado = pedido;
        this.successMsg = `Pedido faturado. NF-e ${pedido.nfe_numero || ''}`;
        this.load();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao faturar pedido.'),
    });
  }

  doSearch(): void { this.page = 1; this.load(); }
  clearSearch(): void { this.search = ''; this.status = ''; this.page = 1; this.load(); }
  firstPage(): void { this.page = 1; }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }
  lastPage(): void { this.page = this.totalPages; }
  onPageSizeChange(size: string): void { this.pageSize = Number(size) || 20; this.page = 1; localStorage.setItem('sysvar.list.pedidos-venda-distribuicao.pageSize', String(this.pageSize)); }
  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; this.saveViewPreference(); }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; this.saveViewPreference(); }
  restoreViewPreference(): void { localStorage.removeItem(this.viewPrefsKey); this.indicatorsVisible = true; this.filtersVisible = true; this.pageSize = 20; }
  isSelected(p: PedidoVendaDistribuicao): boolean { return this.selecionado?.id === p.id; }
  isMarked(p: PedidoVendaDistribuicao): boolean { return !!p.id && this.selecionados.has(p.id); }
  statusLabel(status: string): string { return ({ AB: 'Aberto', AGF: 'Aguardando faturamento', FAT: 'Faturado', CANC: 'Cancelado' } as Record<string, string>)[status] || status; }
  statusClass(status: string): string { return `st-${status.toLowerCase()}`; }
  num(v: unknown): number { return Number(v || 0); }
  qty(v: unknown): string { return this.num(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 }); }
  money(v: unknown): string { return this.num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  trackByPedido(_: number, item: PedidoVendaDistribuicao): number | string { return item.id || item.numero; }
  trackByItem(_: number, item: PedidoVendaDistribuicaoItem): number | string { return item.id || item.ean13; }

  @HostListener('window:sysvar-pedidos-venda-distribuicao-toggle-indicators') onToggleIndicators() { this.toggleIndicators(); }
  @HostListener('window:sysvar-pedidos-venda-distribuicao-toggle-filters') onToggleFilters() { this.toggleFilters(); }
  @HostListener('window:sysvar-pedidos-venda-distribuicao-restore-view') onRestoreView() { this.restoreViewPreference(); }

  private unwrap<T>(resp: T[] | { results: T[] } | any): T[] { return Array.isArray(resp) ? resp : (resp?.results || []); }
  private loadViewPreference(): void {
    try {
      const raw = JSON.parse(localStorage.getItem(this.viewPrefsKey) || '{}');
      this.indicatorsVisible = raw.indicatorsVisible !== false;
      this.filtersVisible = raw.filtersVisible !== false;
      this.pageSize = Number(localStorage.getItem('sysvar.list.pedidos-venda-distribuicao.pageSize') || 20);
    } catch {}
  }
  private saveViewPreference(): void { localStorage.setItem(this.viewPrefsKey, JSON.stringify({ indicatorsVisible: this.indicatorsVisible, filtersVisible: this.filtersVisible })); }
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
