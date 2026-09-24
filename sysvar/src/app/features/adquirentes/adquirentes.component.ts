import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Adquirente } from '../../core/models/forma-pagamento';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-adquirentes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './adquirentes.component.html',
  styleUrls: ['../formas-pagamento/formas-pagamento.component.css']
})
export class AdquirentesComponent implements OnInit {
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
  selected: Adquirente | null = null;
  excluirModal: Adquirente | null = null;

  adquirentesAll: Adquirente[] = [];
  adquirentes: Adquirente[] = [];
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  form: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(20)]],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    ativo: [true],
  });

  get podeEditarModulo(): boolean { return this.auth.podeAcessarModulo('financeiro', true) !== false; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageStart(): number { return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }
  get searchSuggestions(): string[] {
    return Array.from(new Set(this.adquirentesAll.flatMap(a => [a.codigo, a.descricao, a.ativo ? 'Ativo' : 'Inativo']).filter((v): v is string => !!v)));
  }
  get indicadores() {
    const total = this.adquirentesAll.length;
    return { total, ativas: this.adquirentesAll.filter(a => a.ativo !== false).length, inativas: this.adquirentesAll.filter(a => a.ativo === false).length, filtradas: this.total };
  }
  get filtrados(): Adquirente[] {
    const term = this.search.trim().toLowerCase();
    return this.adquirentesAll.filter(a => {
      const matchesSearch = !term || (a.codigo || '').toLowerCase().includes(term) || (a.descricao || '').toLowerCase().includes(term);
      const matchesStatus = !this.filterStatus || (this.filterStatus === 'ativo' && a.ativo !== false) || (this.filterStatus === 'inativo' && a.ativo === false);
      return matchesSearch && matchesStatus;
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.api.listAdquirentes().subscribe({
      next: res => {
        this.adquirentesAll = Array.isArray(res) ? res : (res.results ?? []);
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => { this.loading = false; this.errorMsg = 'Falha ao carregar adquirentes.'; }
    });
  }

  applyPage(): void {
    const filtered = this.filtrados;
    this.total = filtered.length;
    if (this.page > this.totalPages) this.page = this.totalPages;
    const start = (this.page - 1) * this.pageSize;
    this.adquirentes = filtered.slice(start, start + this.pageSize);
    if (this.selected && !filtered.some(a => this.id(a) === this.id(this.selected))) this.selected = null;
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
    this.form.reset({ codigo: '', descricao: '', ativo: true });
  }

  editar(row: Adquirente, modoConsulta = false): void {
    if (!modoConsulta && !this.podeEditarModulo) return;
    const id = this.id(row);
    if (!id) return;
    this.showForm = true;
    this.editingId = id;
    this.consultando = modoConsulta;
    this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({ codigo: row.codigo ?? '', descricao: row.descricao ?? '', ativo: row.ativo !== false });
    if (modoConsulta) this.form.disable({ emitEvent: false });
  }

  salvar(): void {
    if (!this.podeEditarModulo) return;
    this.submitted = true;
    if (this.form.invalid) return;
    const f = this.form.value;
    const payload = { codigo: (f.codigo || '').trim(), descricao: (f.descricao || '').trim(), ativo: !!f.ativo };
    this.saving = true;
    const req = this.editingId ? this.api.updateAdquirente(this.editingId, payload) : this.api.createAdquirente(payload);
    req.subscribe({
      next: () => { this.saving = false; this.successMsg = this.editingId ? 'Alterações salvas.' : 'Adquirente criado.'; this.cancelarEdicao(); this.load(); },
      error: err => { this.saving = false; this.errorMsg = this.serverMsg(err, 'Falha ao salvar adquirente.'); }
    });
  }

  excluir(item: Adquirente): void { if (this.podeEditarModulo) this.excluirModal = item; }
  confirmarExclusao(): void {
    const id = this.excluirModal ? this.id(this.excluirModal) : null;
    if (!id || !this.podeEditarModulo) return;
    this.saving = true;
    this.api.deleteAdquirente(id).subscribe({
      next: () => { this.saving = false; this.excluirModal = null; this.successMsg = 'Adquirente excluído.'; this.load(); },
      error: err => { this.saving = false; this.errorMsg = this.serverMsg(err, 'Falha ao excluir adquirente.'); }
    });
  }

  cancelarEdicao(): void { this.showForm = false; this.editingId = null; this.consultando = false; this.form.enable({ emitEvent: false }); }
  fecharExclusao(): void { this.excluirModal = null; }
  id(item: Adquirente | null): number | null { return item ? (item.Idadquirente ?? item.id ?? null) : null; }
  selecionar(item: Adquirente): void { this.selected = this.id(this.selected) === this.id(item) ? null : item; }
  isSelected(item: Adquirente): boolean { return this.id(this.selected) === this.id(item); }
  consultarSelecionado(): void { if (this.selected) this.editar(this.selected, true); }
  editarSelecionado(): void { if (this.selected) this.editar(this.selected); }
  excluirSelecionado(): void { if (this.selected) this.excluir(this.selected); }
  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; }
  restoreViewPreference(): void { this.indicatorsVisible = true; this.filtersVisible = true; this.pageSize = 20; this.applyPage(); }
  @HostListener('window:sysvar-adquirentes-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-adquirentes-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-adquirentes-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

  private serverMsg(err: any, fallback: string): string {
    const error = err?.error;
    if (!error || typeof error !== 'object') return fallback;
    return Object.entries(error).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' ');
  }
}
