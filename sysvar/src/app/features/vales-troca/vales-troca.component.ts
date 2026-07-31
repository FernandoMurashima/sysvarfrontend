import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Cliente } from '../../core/models/clientes';
import { Loja } from '../../core/models/loja';
import { ValeTroca, ValeTrocaMovimento } from '../../core/models/vale-troca';
import { ClientesService } from '../../core/services/clientes.service';
import { LojasService } from '../../core/services/lojas.service';
import { ValeTrocaService } from '../../core/services/vale-troca.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-vales-troca',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSuggestComponent],
  templateUrl: './vales-troca.component.html',
  styleUrls: ['./vales-troca.component.css']
})
export class ValesTrocaComponent implements OnInit {
  private valesApi = inject(ValeTrocaService);
  private lojasApi = inject(LojasService);
  private clientesApi = inject(ClientesService);
  private router = inject(Router);

  loading = false;
  loadingBase = false;
  errorMsg = '';
  successMsg = '';

  lojas: Loja[] = [];
  clientes: Cliente[] = [];
  vales: ValeTroca[] = [];
  selecionado: ValeTroca | null = null;

  lojaId: number | null = null;
  clienteId: number | null = null;
  status = 'ABERTO';
  documento = '';
  advancedOpen = false;
  columnsOpen = false;
  exportOpen = false;
  indicatorsVisible = true;
  filtersVisible = true;
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  private readonly columnsStorageKey = 'sysvar.list.vales-troca.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.vales-troca';
  columns = [
    { key: 'cupom', label: 'Cupom', visible: true, required: true },
    { key: 'cliente', label: 'Cliente', visible: true, required: false },
    { key: 'loja', label: 'Loja', visible: true, required: false },
    { key: 'origem', label: 'Origem', visible: true, required: false },
    { key: 'saldo', label: 'Saldo', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];

  get documentoSuggestions(): string[] {
    const valores = this.vales.flatMap(vale => [
      vale.documento,
      vale.cliente_nome,
      vale.venda_origem_documento,
      vale.devolucao_documento
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadViewPreference();
    this.carregarBase();
  }

  carregarBase(): void {
    this.loadingBase = true;
    forkJoin({
      lojas: this.lojasApi.list({ page_size: 1000 }),
      clientes: this.clientesApi.list({ ativo: 'true', page_size: 1000 })
    }).subscribe({
      next: data => {
        this.lojas = this.unwrap<Loja>(data.lojas);
        this.clientes = this.unwrap<Cliente>(data.clientes).filter(cliente => cliente.ativo !== false);
        this.loadingBase = false;
        this.consultar();
      },
      error: () => {
        this.loadingBase = false;
        this.errorMsg = 'Falha ao carregar filtros.';
        this.consultar();
      }
    });
  }

  consultar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.valesApi.list({
      loja: this.lojaId,
      cliente: this.clienteId,
      status: this.status,
      documento: this.documento.trim()
    }).subscribe({
      next: resp => {
        this.vales = this.unwrap<ValeTroca>(resp);
        this.selecionado = this.vales[0] ?? null;
        this.page = 1;
        this.loading = false;
      },
      error: err => {
        this.vales = [];
        this.selecionado = null;
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'Falha ao consultar vales-troca.';
      }
    });
  }

  limpar(): void {
    this.lojaId = null;
    this.clienteId = null;
    this.status = 'ABERTO';
    this.documento = '';
    this.consultar();
  }

  selecionar(vale: ValeTroca): void {
    this.selecionado = this.selecionado?.Idvaletroca === vale.Idvaletroca ? null : vale;
  }

  irHome(): void {
    this.router.navigate(['/home']);
  }

  totalSaldo(): number {
    return this.vales.reduce((total, vale) => total + Number(vale.saldo || 0), 0);
  }

  get abertos(): number { return this.vales.filter(v => v.status === 'ABERTO').length; }
  get usados(): number { return this.vales.filter(v => v.status === 'USADO').length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.vales.length / this.pageSize)); }
  get pageStart(): number { return this.vales.length ? (this.page - 1) * this.pageSize + 1 : 0; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.vales.length); }
  get valesPaginados(): ValeTroca[] { return this.vales.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  onPageSizeChange(size: string): void { this.pageSize = Number(size) || 20; localStorage.setItem('sysvar.list.vales-troca.pageSize', String(this.pageSize)); this.page = 1; }
  firstPage(): void { this.page = 1; }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }
  lastPage(): void { this.page = this.totalPages; }
  visibleColumn(key: string): boolean { return this.columns.find(c => c.key === key)?.visible !== false; }
  toggleColumn(key: string, checked: boolean): void { const col = this.columns.find(c => c.key === key); if (!col || col.required) return; col.visible = checked; this.saveColumnsPreference(); }
  isSelected(v: ValeTroca): boolean { return this.selecionado?.Idvaletroca === v.Idvaletroca; }
  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; this.saveViewPreference(); }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; this.saveViewPreference(); }
  restoreViewPreference(): void { localStorage.removeItem(this.viewPrefsKey); localStorage.removeItem('sysvar.list.vales-troca.pageSize'); this.indicatorsVisible = true; this.filtersVisible = true; this.pageSize = 20; this.columns = this.columns.map(c => ({ ...c, visible: true })); this.saveColumnsPreference(); }
  @HostListener('window:sysvar-vales-troca-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-vales-troca-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-vales-troca-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

  tipoMovimentoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      CREDITO: 'Crédito',
      USO: 'Uso em venda',
      ESTORNO: 'Estorno'
    };
    return labels[tipo] || tipo;
  }

  documentoMovimento(mov: ValeTrocaMovimento): string {
    return mov.venda_documento || '-';
  }

  private unwrap<T>(resp: T[] | { results: T[] } | any): T[] {
    return Array.isArray(resp) ? resp : (resp?.results ?? []);
  }
  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.vales-troca.pageSize'));
    if ([10, 20, 50, 100].includes(size)) this.pageSize = size;
    const raw = localStorage.getItem(this.columnsStorageKey);
    if (!raw) return;
    try { const saved = JSON.parse(raw) as Record<string, boolean>; this.columns = this.columns.map(c => c.required ? c : { ...c, visible: saved[c.key] ?? c.visible }); } catch {}
  }
  private saveColumnsPreference(): void { localStorage.setItem(this.columnsStorageKey, JSON.stringify(Object.fromEntries(this.columns.map(c => [c.key, c.visible])))); }
  private loadViewPreference(): void { const raw = localStorage.getItem(this.viewPrefsKey); if (!raw) return; try { const pref = JSON.parse(raw) as { indicatorsVisible?: boolean; filtersVisible?: boolean }; this.indicatorsVisible = pref.indicatorsVisible !== false; this.filtersVisible = pref.filtersVisible !== false; } catch {} }
  private saveViewPreference(): void { localStorage.setItem(this.viewPrefsKey, JSON.stringify({ indicatorsVisible: this.indicatorsVisible, filtersVisible: this.filtersVisible })); }
}
