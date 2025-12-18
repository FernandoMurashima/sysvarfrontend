import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MateriaisService } from '../../core/services/material.service';
import { Material } from '../../core/models/material';

@Component({
  selector: 'app-materiais',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './materiais.component.html',
  styleUrls: ['./materiais.component.css'],
})
export class MateriaisComponent {
  private fb = inject(FormBuilder);
  private api = inject(MateriaisService);

  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorOverlayOpen = signal(false);
  submitted = false;
  saving = false;

  items = signal<Material[]>([]);
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
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Codigo: [null, [Validators.maxLength(10)]],
    Status: [null, [Validators.maxLength(10)]],
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
    this.form.reset({ Descricao: '', Codigo: null, Status: null });
  }

  editar(row: Material) {
    this.showForm = true; this.editingId = row.Idmaterial ?? null; this.submitted = false;
    this.form.reset({
      Descricao: row.Descricao ?? '',
      Codigo: row.Codigo ?? null,
      Status: row.Status ?? null,
    });
  }

  cancelarEdicao() { this.showForm = false; this.editingId = null; this.form.reset(); }

  salvar() {
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlay(); return; }
    const body: Partial<Material> = this.form.value;
    this.saving = true;

    const req = this.editingId ? this.api.update(this.editingId, body) : this.api.create(body);
    req.subscribe({
      next: () => { this.successMsg.set(this.editingId ? 'Alterações salvas.' : 'Material criado.'); this.cancelarEdicao(); this.load(); },
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

  excluir(row: Material) {
    if (!row.Idmaterial) return;
    if (!confirm(`Excluir o material "${row.Descricao}"?`)) return;
    this.api.delete(row.Idmaterial).subscribe(() => this.load());
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;
    if (f['Descricao']?.invalid) {
      if (f['Descricao'].errors?.['required']) msgs.push('Descrição: obrigatória.');
      if (f['Descricao'].errors?.['maxlength']) msgs.push('Descrição: máx. 100 caracteres.');
    }
    if (f['Codigo']?.invalid && f['Codigo'].errors?.['maxlength']) msgs.push('Código: máx. 10 caracteres.');
    if (f['Status']?.invalid && f['Status'].errors?.['maxlength']) msgs.push('Status: máx. 10 caracteres.');
    for (const k of Object.keys(f)) if ((f as any)[k].errors?.['server']) msgs.push(`${k}: ${(f as any)[k].errors?.['server']}`);
    return msgs;
  }

  openErrorOverlay() { this.errorOverlayOpen.set(true); }
  closeErrorOverlay() { this.errorOverlayOpen.set(false); }
}
