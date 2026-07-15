import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TabelaprecoService } from '../../core/services/tabelapreco.service';
import { TabelaPreco } from '../../core/models/tabelapreco';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-tabelas-preco',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './tabelapreco.component.html',
  styleUrls: ['./tabelapreco.component.css'],
})
export class TabelaprecoComponent {
  private fb = inject(FormBuilder);
  private api = inject(TabelaprecoService);
  private auth = inject(AuthService);

  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorOverlayOpen = signal(false);
  submitted = false;
  saving = false;
  excluirModal: TabelaPreco | null = null;

  items = signal<TabelaPreco[]>([]);
  page = signal(1);
  pageSizeOptions = [10, 20, 50];
  pageSize = signal(20);

  total = computed(() => this.items().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  pageStart = computed(() => (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.items().slice(start, start + this.pageSize());
  });
  searchSuggestions = computed(() => {
    const valores = this.items().flatMap(item => [
      item.NomeTabela,
      item.DataInicio,
      item.DataFim || '',
      item.Promocao ? 'Promoção' : 'Tabela'
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  });

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('produtos', true) !== false;
  }

  showForm = false;
  editingId: number | null = null;
  consultando = false;
  form: FormGroup = this.fb.group({
    NomeTabela: ['', [Validators.required, Validators.maxLength(100)]],
    DataInicio: ['', [Validators.required]],
    Promocao: [false],
    DataFim: [null],
  });

  constructor() {
    effect(() => { const tp = this.totalPages(); if (this.page() > tp) this.page.set(tp); });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.list(this.search).subscribe({
      next: rows => { this.items.set(rows); this.page.set(1); },
      error: () => { this.successMsg.set(null); this.items.set([]); this.openErrorOverlay(); this.loading.set(false); },
      complete: () => this.loading.set(false),
    });
  }
  doSearch() { this.load(); }
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.doSearch(); }
  clearSearch() { this.search = ''; this.load(); }
  onPageSizeChange(v: number) { this.pageSize.set(+v); this.page.set(1); }
  firstPage() { this.page.set(1); }
  prevPage() { this.page.update(p => Math.max(1, p - 1)); }
  nextPage() { this.page.update(p => Math.min(this.totalPages(), p + 1)); }
  lastPage() { this.page.set(this.totalPages()); }

  novo() {
    this.showForm = true; this.editingId = null; this.submitted = false;
    this.consultando = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({ NomeTabela: '', DataInicio: '', Promocao: false, DataFim: null });
  }

  editar(row: TabelaPreco) {
    this.showForm = true; this.editingId = row.Idtabela ?? null; this.submitted = false;
    this.consultando = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      NomeTabela: row.NomeTabela ?? '',
      DataInicio: row.DataInicio ? row.DataInicio.substring(0, 10) : '',
      Promocao: !!row.Promocao,
      DataFim: row.DataFim ? row.DataFim.substring(0, 10) : null,
    });
  }

  consultar(row: TabelaPreco) {
    this.editar(row);
    this.consultando = true;
    this.form.disable({ emitEvent: false });
  }

  cancelarEdicao() { this.showForm = false; this.editingId = null; this.consultando = false; this.form.enable({ emitEvent: false }); this.form.reset(); }

  salvar() {
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlay(); return; }
    const body: Partial<TabelaPreco> = this.form.value;
    this.saving = true;

    const req = this.editingId ? this.api.update(this.editingId, body) : this.api.create(body);
    req.subscribe({
      next: () => { this.successMsg.set(this.editingId ? 'Alterações salvas.' : 'Tabela criada.'); this.cancelarEdicao(); this.load(); },
      error: (err) => {
        const controls = this.form.controls as any;
        if (err?.error) {
          Object.entries(err.error).forEach(([k, v]: any) => { if (controls[k]) controls[k].setErrors({ server: Array.isArray(v) ? v[0] : v }); });
        }
        this.openErrorOverlay(); this.saving = false;
      },
      complete: () => (this.saving = false),
    });
  }

  excluir(row: TabelaPreco) {
    if (!row.Idtabela) return;
    this.excluirModal = row;
  }

  confirmarExclusao(): void {
    const row = this.excluirModal;
    if (!row?.Idtabela) return;
    this.api.delete(row.Idtabela).subscribe(() => {
      this.excluirModal = null;
      this.successMsg.set('Tabela excluída.');
      this.load();
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;
    if (f['NomeTabela']?.invalid) {
      if (f['NomeTabela'].errors?.['required']) msgs.push('Nome: obrigatório.');
      if (f['NomeTabela'].errors?.['maxlength']) msgs.push('Nome: máx. 100 caracteres.');
    }
    if (f['DataInicio']?.invalid) msgs.push('Data início: obrigatória.');
    for (const k of Object.keys(f)) if ((f as any)[k].errors?.['server']) msgs.push(`${k}: ${(f as any)[k].errors?.['server']}`);
    return msgs;
  }

  openErrorOverlay() { this.errorOverlayOpen.set(true); }
  closeErrorOverlay() { this.errorOverlayOpen.set(false); }
}
