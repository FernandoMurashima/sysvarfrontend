import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AntecipacaoRecebivel, RecebivelAntecipacao } from '../../core/models/antecipacao-recebivel';
import { ContaBancaria } from '../../core/models/conta-bancaria';
import { FormaPagamento } from '../../core/models/forma-pagamento';
import { Loja } from '../../core/models/loja';
import { AntecipacoesRecebiveisService } from '../../core/services/antecipacoes-recebiveis.service';
import { ContasBancariasService } from '../../core/services/contas-bancarias.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { LojasService } from '../../core/services/lojas.service';

@Component({
  selector: 'app-antecipacao-recebiveis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './antecipacao-recebiveis.component.html',
  styleUrls: ['./antecipacao-recebiveis.component.css']
})
export class AntecipacaoRecebiveisComponent implements OnInit {
  private api = inject(AntecipacoesRecebiveisService);
  private lojasApi = inject(LojasService);
  private contasApi = inject(ContasBancariasService);
  private formasApi = inject(FormasPagamentoService);

  lojas: Loja[] = [];
  contas: ContaBancaria[] = [];
  formas: FormaPagamento[] = [];
  recebiveis: RecebivelAntecipacao[] = [];
  antecipacoes: AntecipacaoRecebivel[] = [];
  selecionados: Record<number, boolean> = {};

  lojaFiltro: number | null = null;
  contaFiltro: number | null = null;
  formaFiltro = '';
  vencInicio = '';
  vencFim = '';
  dataAntecipacao = this.today();
  documento = '';
  taxaPercentual = 1.5;
  observacao = '';
  indicatorsVisible = true;
  filtersVisible = true;
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  columnsOpen = false;
  exportOpen = false;
  columns = [
    { key: 'loja', label: 'Loja', visible: true, required: false },
    { key: 'conta', label: 'Conta', visible: true, required: false },
    { key: 'forma', label: 'Forma', visible: true, required: false },
    { key: 'historico', label: 'Histórico', visible: true, required: false },
    { key: 'valor', label: 'Valor', visible: true, required: false }
  ];
  private readonly columnsStorageKey = 'sysvar.list.antecipacoes-recebiveis.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.antecipacoes-recebiveis';

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  ngOnInit(): void {
    this.loadViewPreference();
    this.loadColumnPreference();
    this.loadInicial();
  }

  get recebiveisPaginados(): RecebivelAntecipacao[] {
    const start = (this.page - 1) * this.pageSize;
    return this.recebiveis.slice(start, start + this.pageSize);
  }

  get totalFiltrado(): number {
    return this.recebiveis.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalFiltrado / this.pageSize));
  }

  get pageStart(): number {
    return this.totalFiltrado ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalFiltrado);
  }

  get indicadores() {
    return {
      disponiveis: this.recebiveis.length,
      selecionados: this.qtdSelecionada(),
      antecipacoes: this.antecipacoes.length,
      bruto: this.totalBruto(),
      liquido: this.totalLiquido()
    };
  }

  loadInicial(): void {
    this.loading = true;
    forkJoin({
      lojas: this.lojasApi.list(),
      contas: this.contasApi.list({ ativo: true }),
      formas: this.formasApi.list({ ativo: true }),
      antecipacoes: this.api.list({ page_size: 100 })
    }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.contas = this.unwrap<ContaBancaria>(res.contas);
        this.formas = this.unwrap<FormaPagamento>(res.formas).filter(f => !!f.gera_recebivel_bancario);
        this.antecipacoes = this.unwrap<AntecipacaoRecebivel>(res.antecipacoes);
        this.formaFiltro = this.formas[0]?.codigo || '';
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar dados de antecipação.';
      }
    });
  }

  buscarRecebiveis(): void {
    this.errorMsg = '';
    this.successMsg = '';
    this.loading = true;
    this.api.recebiveis({
      loja: this.lojaFiltro,
      conta_bancaria: this.contaFiltro,
      forma_pagamento: this.formaFiltro,
      data_ini: this.vencInicio,
      data_fim: this.vencFim
    }).subscribe({
      next: res => {
        this.recebiveis = res;
        this.page = 1;
        this.selecionados = {};
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'Falha ao buscar recebíveis.';
      }
    });
  }

  executar(): void {
    const ids = this.idsSelecionados();
    if (!ids.length) {
      this.errorMsg = 'Selecione ao menos um recebível para antecipar.';
      return;
    }
    if (!this.dataAntecipacao) {
      this.errorMsg = 'Informe a data da antecipação.';
      return;
    }
    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.api.executar({
      movimentacoes: ids,
      data_antecipacao: this.dataAntecipacao,
      taxa_percentual: Number(this.taxaPercentual || 0),
      documento: this.documento.trim() || null,
      observacao: this.observacao.trim() || null
    }).subscribe({
      next: res => {
        this.saving = false;
        this.successMsg = `Antecipação registrada: ${res.documento}`;
        this.documento = '';
        this.observacao = '';
        this.buscarRecebiveis();
        this.loadAntecipacoes();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = err?.error?.detail || 'Falha ao registrar antecipação.';
      }
    });
  }

  loadAntecipacoes(): void {
    this.api.list({ page_size: 100 }).subscribe({
      next: res => this.antecipacoes = this.unwrap<AntecipacaoRecebivel>(res)
    });
  }

  marcarTodos(): void {
    const selected: Record<number, boolean> = {};
    this.recebiveis.forEach(item => {
      if (item.Idmovimentacao) selected[item.Idmovimentacao] = true;
    });
    this.selecionados = selected;
  }

  limparSelecao(): void {
    this.selecionados = {};
  }

  alternar(item: RecebivelAntecipacao, checked: boolean): void {
    if (!item.Idmovimentacao) return;
    this.selecionados[item.Idmovimentacao] = checked;
  }

  selecionado(item: RecebivelAntecipacao): boolean {
    return !!item.Idmovimentacao && !!this.selecionados[item.Idmovimentacao];
  }

  totalBruto(): number {
    return this.recebiveis
      .filter(item => this.selecionado(item))
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);
  }

  taxaValor(): number {
    return this.totalBruto() * Number(this.taxaPercentual || 0) / 100;
  }

  totalLiquido(): number {
    return this.totalBruto() - this.taxaValor();
  }

  qtdSelecionada(): number {
    return this.idsSelecionados().length;
  }

  lojaNome(id: number): string {
    return this.lojas.find(loja => loja.id === id)?.nome_loja || `Loja #${id}`;
  }

  contaNome(id?: number | null): string {
    const conta = this.contas.find(item => item.Idconta === id);
    return conta ? `${conta.descricao} - ${conta.banco}` : '-';
  }

  visibleColumn(key: string): boolean {
    return this.columns.find(c => c.key === key)?.visible !== false;
  }

  toggleColumn(key: string, visible: boolean): void {
    const col = this.columns.find(c => c.key === key);
    if (!col || col.required) return;
    col.visible = visible;
    this.saveColumnPreference();
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value) || 20;
    this.page = 1;
  }

  firstPage(): void { this.page = 1; }
  prevPage(): void { this.page = Math.max(1, this.page - 1); }
  nextPage(): void { this.page = Math.min(this.totalPages, this.page + 1); }
  lastPage(): void { this.page = this.totalPages; }

  @HostListener('window:sysvar-antecipacoes-recebiveis-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-antecipacoes-recebiveis-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-antecipacoes-recebiveis-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

  private idsSelecionados(): number[] {
    return Object.entries(this.selecionados)
      .filter(([, checked]) => checked)
      .map(([id]) => Number(id))
      .filter(id => Number.isFinite(id));
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toggleIndicators(): void {
    this.indicatorsVisible = !this.indicatorsVisible;
    this.saveViewPreference();
  }

  private toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
    this.saveViewPreference();
  }

  private restoreViewPreference(): void {
    this.indicatorsVisible = true;
    this.filtersVisible = true;
    this.columns.forEach(col => col.visible = true);
    localStorage.removeItem(this.viewPrefsKey);
    localStorage.removeItem(this.columnsStorageKey);
  }

  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey);
    if (!raw) return;
    try {
      const prefs = JSON.parse(raw);
      this.indicatorsVisible = prefs.indicatorsVisible !== false;
      this.filtersVisible = prefs.filtersVisible !== false;
    } catch {}
  }

  private saveViewPreference(): void {
    localStorage.setItem(this.viewPrefsKey, JSON.stringify({ indicatorsVisible: this.indicatorsVisible, filtersVisible: this.filtersVisible }));
  }

  private loadColumnPreference(): void {
    const raw = localStorage.getItem(this.columnsStorageKey);
    if (!raw) return;
    try {
      const state = JSON.parse(raw) as Record<string, boolean>;
      this.columns.forEach(col => {
        if (!col.required && state[col.key] !== undefined) col.visible = state[col.key];
      });
    } catch {}
  }

  private saveColumnPreference(): void {
    const state = Object.fromEntries(this.columns.map(col => [col.key, col.visible]));
    localStorage.setItem(this.columnsStorageKey, JSON.stringify(state));
  }
}
