import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Adquirente, CondicaoAdquirente, FormaPagamento, PrazoPagamento } from '../../core/models/forma-pagamento';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-condicoes-adquirente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './condicoes-adquirente.component.html',
  styleUrls: ['../formas-pagamento/formas-pagamento.component.css']
})
export class CondicoesAdquirenteComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(FormasPagamentoService);
  private auth = inject(AuthService);

  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;
  consultando = false;
  search = '';
  filterStatus = '';
  successMsg = '';
  errorMsg = '';
  indicatorsVisible = true;
  filtersVisible = true;
  selected: CondicaoAdquirente | null = null;
  excluirModal: CondicaoAdquirente | null = null;

  condicoesAll: CondicaoAdquirente[] = [];
  condicoes: CondicaoAdquirente[] = [];
  adquirentes: Adquirente[] = [];
  formas: FormaPagamento[] = [];
  prazos: PrazoPagamento[] = [];
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  form: FormGroup = this.fb.group({
    adquirente: [null as number | null, Validators.required],
    forma_pagamento: [null as number | null, Validators.required],
    prazo_pagamento: [null as number | null, Validators.required],
    taxa_percentual: [0, [Validators.required, Validators.min(0)]],
    taxa_fixa: [0, [Validators.required, Validators.min(0)]],
    ativo: [true],
  });

  get podeEditarModulo(): boolean { return this.auth.podeAcessarModulo('financeiro', true) !== false; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageStart(): number { return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }
  get searchSuggestions(): string[] {
    return Array.from(new Set(this.condicoesAll.flatMap(c => [this.adquirenteLabel(c), this.formaLabel(c), this.prazoLabel(c)]).filter(Boolean)));
  }
  get indicadores() {
    const total = this.condicoesAll.length;
    return { total, ativas: this.condicoesAll.filter(c => c.ativo !== false).length, inativas: this.condicoesAll.filter(c => c.ativo === false).length, filtradas: this.total };
  }
  get filtrados(): CondicaoAdquirente[] {
    const term = this.search.trim().toLowerCase();
    return this.condicoesAll.filter(c => {
      const text = `${this.adquirenteLabel(c)} ${this.formaLabel(c)} ${this.prazoLabel(c)}`.toLowerCase();
      const matchesSearch = !term || text.includes(term);
      const matchesStatus = !this.filterStatus || (this.filterStatus === 'ativo' && c.ativo !== false) || (this.filterStatus === 'inativo' && c.ativo === false);
      return matchesSearch && matchesStatus;
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    forkJoin({
      condicoes: this.api.listCondicoesAdquirente(),
      adquirentes: this.api.listAdquirentes({ ativo: true }),
      formas: this.api.list({ ativo: true }),
      prazos: this.api.listPrazos({ ativo: true, finalidade: 'RECEBER' }),
    }).subscribe({
      next: (res: any) => {
        this.condicoesAll = Array.isArray(res.condicoes) ? res.condicoes : (res.condicoes?.results ?? []);
        this.adquirentes = Array.isArray(res.adquirentes) ? res.adquirentes : (res.adquirentes?.results ?? []);
        this.formas = Array.isArray(res.formas) ? res.formas : (res.formas?.results ?? []);
        this.prazos = Array.isArray(res.prazos) ? res.prazos : (res.prazos?.results ?? []);
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => { this.loading = false; this.errorMsg = 'Falha ao carregar condições de adquirente.'; }
    });
  }

  applyPage(): void {
    const filtered = this.filtrados;
    this.total = filtered.length;
    if (this.page > this.totalPages) this.page = this.totalPages;
    const start = (this.page - 1) * this.pageSize;
    this.condicoes = filtered.slice(start, start + this.pageSize);
    if (this.selected && !filtered.some(c => this.id(c) === this.id(this.selected))) this.selected = null;
  }

  doSearch(): void { this.page = 1; this.applyPage(); }
  clearSearch(): void { this.search = ''; this.filterStatus = ''; this.doSearch(); }
  onPageSizeChange(size: string | number): void { this.pageSize = Number(size) || 20; this.doSearch(); }
  firstPage(): void { this.page = 1; this.applyPage(); }
  prevPage(): void { if (this.page > 1) { this.page--; this.applyPage(); } }
  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.applyPage(); } }
  lastPage(): void { this.page = this.totalPages; this.applyPage(); }

  novo(): void {
    if (!this.podeEditarModulo) return;
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({ adquirente: null, forma_pagamento: null, prazo_pagamento: null, taxa_percentual: 0, taxa_fixa: 0, ativo: true });
  }

  editar(row: CondicaoAdquirente, modoConsulta = false): void {
    if (!modoConsulta && !this.podeEditarModulo) return;
    const id = this.id(row);
    if (!id) return;
    this.showForm = true;
    this.editingId = id;
    this.consultando = modoConsulta;
    this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      adquirente: row.adquirente,
      forma_pagamento: row.forma_pagamento,
      prazo_pagamento: row.prazo_pagamento,
      taxa_percentual: Number(row.taxa_percentual || 0),
      taxa_fixa: Number(row.taxa_fixa || 0),
      ativo: row.ativo !== false,
    });
    if (modoConsulta) this.form.disable({ emitEvent: false });
  }

  salvar(): void {
    if (!this.podeEditarModulo) return;
    this.submitted = true;
    if (this.form.invalid) return;
    const f = this.form.value;
    const payload = {
      adquirente: Number(f.adquirente),
      forma_pagamento: Number(f.forma_pagamento),
      prazo_pagamento: Number(f.prazo_pagamento),
      taxa_percentual: String(f.taxa_percentual ?? 0),
      taxa_fixa: String(f.taxa_fixa ?? 0),
      ativo: !!f.ativo,
    };
    this.saving = true;
    const req = this.editingId ? this.api.updateCondicaoAdquirente(this.editingId, payload) : this.api.createCondicaoAdquirente(payload);
    req.subscribe({
      next: () => { this.saving = false; this.successMsg = this.editingId ? 'Alterações salvas.' : 'Condição criada.'; this.cancelarEdicao(); this.load(); },
      error: err => { this.saving = false; this.errorMsg = this.serverMsg(err, 'Falha ao salvar condição.'); }
    });
  }

  excluir(item: CondicaoAdquirente): void { if (this.podeEditarModulo) this.excluirModal = item; }
  confirmarExclusao(): void {
    const id = this.excluirModal ? this.id(this.excluirModal) : null;
    if (!id || !this.podeEditarModulo) return;
    this.saving = true;
    this.api.deleteCondicaoAdquirente(id).subscribe({
      next: () => { this.saving = false; this.excluirModal = null; this.successMsg = 'Condição excluída.'; this.load(); },
      error: err => { this.saving = false; this.errorMsg = this.serverMsg(err, 'Falha ao excluir condição.'); }
    });
  }

  cancelarEdicao(): void { this.showForm = false; this.editingId = null; this.consultando = false; this.form.enable({ emitEvent: false }); }
  fecharExclusao(): void { this.excluirModal = null; }
  id(item: CondicaoAdquirente | null): number | null { return item ? (item.Idcondicaoadquirente ?? item.id ?? null) : null; }
  selecionar(item: CondicaoAdquirente): void { this.selected = this.id(this.selected) === this.id(item) ? null : item; }
  isSelected(item: CondicaoAdquirente): boolean { return this.id(this.selected) === this.id(item); }
  consultarSelecionado(): void { if (this.selected) this.editar(this.selected, true); }
  editarSelecionado(): void { if (this.selected) this.editar(this.selected); }
  excluirSelecionado(): void { if (this.selected) this.excluir(this.selected); }
  adquirenteLabel(c: CondicaoAdquirente): string { return c.adquirente_descricao || this.adquirentes.find(a => (a.Idadquirente ?? a.id) === c.adquirente)?.descricao || 'Adquirente'; }
  formaLabel(c: CondicaoAdquirente): string { return c.forma_descricao || this.formas.find(f => (f.Idformapagamento ?? f.id) === c.forma_pagamento)?.descricao || 'Forma'; }
  prazoLabel(c: CondicaoAdquirente): string { return c.prazo_descricao || this.prazos.find(p => (p.Idprazo ?? p.id) === c.prazo_pagamento)?.descricao || 'Prazo'; }
  taxaLabel(c: CondicaoAdquirente): string {
    const percentual = Number(c.taxa_percentual || 0);
    const fixa = Number(c.taxa_fixa || 0);
    return `${percentual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}% + R$ ${fixa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; }
  restoreViewPreference(): void { this.indicatorsVisible = true; this.filtersVisible = true; this.pageSize = 20; this.applyPage(); }
  @HostListener('window:sysvar-condicoes-adquirente-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-condicoes-adquirente-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-condicoes-adquirente-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

  private serverMsg(err: any, fallback: string): string {
    const error = err?.error;
    if (!error || typeof error !== 'object') return fallback;
    return Object.entries(error).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' ');
  }
}
