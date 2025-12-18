import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TabelaprecoService } from '../../core/services/tabelapreco.service';
import { TabelaPreco } from '../../core/models/tabelapreco';

@Component({
  selector: 'app-tabelas-preco',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './tabelapreco.component.html',
  styleUrls: ['./tabelapreco.component.css'],
})
export class TabelaprecoComponent {
  private fb = inject(FormBuilder);
  private api = inject(TabelaprecoService);

  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorOverlayOpen = signal(false);
  submitted = false;
  saving = false;

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

  showForm = false;
  editingId: number | null = null;
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
    this.form.reset({ NomeTabela: '', DataInicio: '', Promocao: false, DataFim: null });
  }

  editar(row: TabelaPreco) {
    this.showForm = true; this.editingId = row.Idtabela ?? null; this.submitted = false;
    this.form.reset({
      NomeTabela: row.NomeTabela ?? '',
      DataInicio: row.DataInicio ? row.DataInicio.substring(0, 10) : '',
      Promocao: !!row.Promocao,
      DataFim: row.DataFim ? row.DataFim.substring(0, 10) : null,
    });
  }

  cancelarEdicao() { this.showForm = false; this.editingId = null; this.form.reset(); }

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
    if (!confirm(`Excluir a tabela "${row.NomeTabela}"?`)) return;
    this.api.delete(row.Idtabela).subscribe(() => this.load());
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
