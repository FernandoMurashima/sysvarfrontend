import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { LancamentoContabil, LancamentoContabilListResp, StatusLancamentoContabil } from '../../core/models/lancamento-contabil';
import { Loja } from '../../core/models/loja';
import { LancamentosContabeisService } from '../../core/services/lancamentos-contabeis.service';
import { LojasService } from '../../core/services/lojas.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-lancamentos-contabeis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, SearchSuggestComponent],
  templateUrl: './lancamentos-contabeis.component.html',
  styleUrls: ['./lancamentos-contabeis.component.css'],
})
export class LancamentosContabeisComponent implements OnInit {
  private api = inject(LancamentosContabeisService);
  private lojasApi = inject(LojasService);

  loading = false;
  errorMsg = '';
  search = '';
  columnsOpen = false;
  exportOpen = false;
  advancedOpen = false;
  private readonly columnsStorageKey = 'sysvar.list.lancamentos-contabeis.columns';
  columns = [
    { key: 'data', label: 'Data', visible: true, required: true },
    { key: 'loja', label: 'Loja', visible: true, required: false },
    { key: 'documento', label: 'Documento', visible: true, required: false },
    { key: 'origem', label: 'Origem', visible: true, required: false },
    { key: 'historico', label: 'Histórico', visible: true, required: true },
    { key: 'natureza', label: 'Natureza', visible: true, required: false },
    { key: 'debito', label: 'Débito', visible: true, required: false },
    { key: 'credito', label: 'Crédito', visible: true, required: false },
    { key: 'valor', label: 'Valor', visible: true, required: true },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];
  lojas: Loja[] = [];
  lancamentos: LancamentoContabil[] = [];
  totalRegistrosApi = 0;

  filtros = {
    loja: '',
    status: '',
    origem: '',
    data_ini: '',
    data_fim: '',
  };

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.definirPeriodoPadrao();
    this.carregarBase();
  }

  carregarBase(): void {
    this.loading = true;
    forkJoin({
      lojas: this.lojasApi.list({ page_size: 5000 }),
      lancamentos: this.api.list(this.queryParams()),
    }).subscribe({
      next: ({ lojas, lancamentos }) => {
        this.lojas = this.unwrap<Loja>(lojas);
        this.aplicarLista(lancamentos);
        this.loading = false;
      },
      error: err => {
        this.errorMsg = this.extractError(err);
        this.loading = false;
      },
    });
  }

  consultar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.api.list(this.queryParams()).subscribe({
      next: res => {
        this.aplicarLista(res);
        this.loading = false;
      },
      error: err => {
        this.errorMsg = this.extractError(err);
        this.loading = false;
      },
    });
  }

  limpar(): void {
    this.filtros.loja = '';
    this.filtros.status = '';
    this.filtros.origem = '';
    this.definirPeriodoPadrao();
    this.consultar();
  }

  verPendentes(): void {
    this.filtros.status = 'PENDENTE';
    this.consultar();
  }

  clearSearch(): void {
    this.search = '';
  }

  alternarTelaCheia(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      return;
    }
    document.exitFullscreen?.();
  }

  lojaId(loja: Loja): number | null {
    return loja.Idloja ?? loja.id ?? null;
  }

  money(value: string | number | null | undefined): string {
    const n = Number(value || 0);
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  statusClass(status: StatusLancamentoContabil | string): string {
    const value = String(status || '').toUpperCase();
    if (value === 'GERADO') return 'badge ok';
    if (value === 'PENDENTE') return 'badge warn';
    if (value === 'ESTORNADO') return 'badge off';
    return 'badge';
  }

  contaLabel(codigo?: string | null, descricao?: string | null): string {
    if (!codigo && !descricao) return '-';
    if (!codigo) return descricao || '-';
    if (!descricao) return codigo;
    return `${codigo} - ${descricao}`;
  }

  get totalValor(): number {
    return this.listaVisivel.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  }

  get totalGerados(): number {
    return this.listaVisivel.filter(item => item.status === 'GERADO').length;
  }

  get totalPendentes(): number {
    return this.listaVisivel.filter(item => item.status === 'PENDENTE').length;
  }

  get totalEstornados(): number {
    return this.listaVisivel.filter(item => item.status === 'ESTORNADO').length;
  }

  get listaVisivel(): LancamentoContabil[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.lancamentos;
    return this.lancamentos.filter(item => [
      item.loja_nome,
      item.documento,
      item.origem,
      item.historico,
      item.natureza_descricao,
      item.conta_debito_codigo,
      item.conta_debito_descricao,
      item.conta_credito_codigo,
      item.conta_credito_descricao,
      item.status,
    ].some(value => String(value || '').toLowerCase().includes(term)));
  }

  get searchSuggestions(): string[] {
    const valores = this.lancamentos.flatMap(item => [
      item.loja_nome,
      item.documento,
      item.origem,
      item.historico,
      item.natureza_descricao,
      item.conta_debito_codigo,
      item.conta_debito_descricao,
      item.conta_credito_codigo,
      item.conta_credito_descricao,
      item.status,
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  visibleColumn(key: string): boolean {
    return this.columns.find(c => c.key === key)?.visible !== false;
  }

  toggleColumn(key: string, checked: boolean): void {
    const col = this.columns.find(c => c.key === key);
    if (!col || col.required) return;
    col.visible = checked;
    this.saveColumnsPreference();
  }

  exportarCsv(): void {
    const headers = ['Data', 'Loja', 'Documento', 'Origem', 'Histórico', 'Natureza', 'Débito', 'Crédito', 'Valor', 'Status'];
    const body = this.listaVisivel.map(item => [
      item.data_lancamento || '',
      item.loja_nome || item.idloja || '',
      item.documento || '',
      item.origem || '',
      item.historico || '',
      item.natureza_descricao || '',
      this.contaLabel(item.conta_debito_codigo, item.conta_debito_descricao),
      this.contaLabel(item.conta_credito_codigo, item.conta_credito_descricao),
      this.money(item.valor),
      item.status || '',
    ]);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lancamentos-contabeis.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  private definirPeriodoPadrao(): void {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    this.filtros.data_ini = this.toInputDate(primeiroDia);
    this.filtros.data_fim = this.toInputDate(hoje);
  }

  private toInputDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private unwrap<T>(resp: unknown): T[] {
    if (Array.isArray(resp)) return resp as T[];
    const obj = resp as { results?: T[] };
    return Array.isArray(obj?.results) ? obj.results : [];
  }

  private aplicarLista(resp: LancamentoContabilListResp): void {
    this.lancamentos = this.unwrap<LancamentoContabil>(resp);
    this.totalRegistrosApi = Array.isArray(resp) ? resp.length : Number(resp.count || this.lancamentos.length);
  }

  private queryParams(): Record<string, string | number> {
    return {
      ...this.filtros,
      page_size: 5000,
    };
  }

  private extractError(err: unknown): string {
    const detail = (err as { error?: { detail?: string } })?.error?.detail;
    return detail || 'Nao foi possivel carregar os lancamentos contabeis.';
  }

  private loadColumnsPreference(): void {
    const raw = localStorage.getItem(this.columnsStorageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Record<string, boolean>;
      this.columns = this.columns.map(c => c.required ? c : { ...c, visible: saved[c.key] ?? c.visible });
    } catch {
      return;
    }
  }

  private saveColumnsPreference(): void {
    const state: Record<string, boolean> = {};
    this.columns.forEach(c => state[c.key] = c.visible);
    localStorage.setItem(this.columnsStorageKey, JSON.stringify(state));
  }
}
