import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NcmsService } from '../../core/services/ncms.service';
import { Ncm } from '../../core/models/ncm';

@Component({
  selector: 'app-ncms',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './ncms.component.html',
  styleUrls: ['./ncms.component.css'],
})
export class NcmsComponent {
  private fb = inject(FormBuilder);
  private api = inject(NcmsService);

  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorOverlayOpen = signal(false);
  submitted = false;
  saving = false;

  items = signal<Ncm[]>([]);
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
    ncm: [null, [Validators.required, Validators.pattern(/^\d{4}\.\d{2}\.\d{2}$/)]],
    descricao: ['', [Validators.required, Validators.maxLength(1000)]],
    aliquota: [null],
    campo1: [null, [Validators.maxLength(25)]],
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
    this.form.reset({ ncm: null, descricao: '', aliquota: null, campo1: null });
  }

  editar(row: Ncm) {
    this.showForm = true; this.editingId = row.id ?? null; this.submitted = false;
    this.form.reset({
      ncm: row.ncm ?? null,
      descricao: row.descricao ?? '',
      aliquota: row.aliquota ?? null,
      campo1: row.campo1 ?? null,
    });
  }

  cancelarEdicao() {
    this.showForm = false; this.editingId = null; this.form.reset();
  }

  salvar() {
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlay(); return; }
    const body: Partial<Ncm> = this.form.value;
    this.saving = true;

    const req = this.editingId ? this.api.update(this.editingId, body) : this.api.create(body);
    req.subscribe({
      next: () => { this.successMsg.set(this.editingId ? 'Alterações salvas.' : 'NCM criado.'); this.cancelarEdicao(); this.load(); },
      error: (err) => {
        const controls = this.form.controls as any;
        if (err?.error) {
          Object.entries(err.error).forEach(([k, v]: any) => {
            if (controls[k]) controls[k].setErrors({ server: Array.isArray(v) ? v[0] : v });
          });
        }
        this.openErrorOverlay(); this.saving = false;
      },
      complete: () => (this.saving = false),
    });
  }

  excluir(row: Ncm) {
    if (!row.id) return;
    if (!confirm(`Excluir o NCM "${row.ncm} - ${row.descricao.substring(0, 40)}..."?`)) return;
    this.api.delete(row.id).subscribe(() => this.load());
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;
    if (f['ncm']?.invalid) {
      if (f['ncm'].errors?.['required']) msgs.push('NCM: obrigatório.');
      if (f['ncm'].errors?.['pattern']) msgs.push('NCM: use ####.##.##.');
    }
    if (f['descricao']?.invalid) {
      if (f['descricao'].errors?.['required']) msgs.push('Descrição: obrigatória.');
      if (f['descricao'].errors?.['maxlength']) msgs.push('Descrição: máx. 1000 caracteres.');
    }
    if (f['campo1']?.invalid && f['campo1'].errors?.['maxlength']) msgs.push('Campo1: máx. 25 caracteres.');
    for (const k of Object.keys(f)) if ((f as any)[k].errors?.['server']) msgs.push(`${k}: ${(f as any)[k].errors?.['server']}`);
    return msgs;
  }

  openErrorOverlay() { this.errorOverlayOpen.set(true); }
  closeErrorOverlay() { this.errorOverlayOpen.set(false); }
}
