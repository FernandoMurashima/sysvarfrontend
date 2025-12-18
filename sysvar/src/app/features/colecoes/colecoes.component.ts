import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ColecoesService } from '../../core/services/colecoes.service';
import { Colecao } from '../../core/models/colecao';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-colecoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './colecoes.component.html',
  styleUrls: ['./colecoes.component.css'],
})
export class ColecoesComponent {
  private fb = inject(FormBuilder);
  private api = inject(ColecoesService);

  // UI
  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorOverlayOpen = signal(false);
  submitted = false;
  saving = false;

  // lista/paginação client-side
  colecoes = signal<Colecao[]>([]);
  page = signal(1);
  pageSizeOptions = [10, 20, 50];
  pageSize = signal(20);

  total = computed(() => this.colecoes().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  pageStart = computed(() => (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.colecoes().slice(start, start + this.pageSize());
  });

  // form
  showForm = false;
  editingId: number | null = null;
  form: FormGroup = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Codigo: [null, [Validators.required, Validators.pattern(/^\d{2}$/)]],
    Estacao: [null, [Validators.required]],
    Status: [null, [Validators.required]],
    Contador: [0],
  });

  // selects
  estacoes = [
    { value: '01', label: 'Verão' },
    { value: '02', label: 'Outono' },
    { value: '03', label: 'Inverno' },
    { value: '04', label: 'Primavera' },
  ];
  statusOpts = [
    { value: 'CR', label: 'Criação' },
    { value: 'PD', label: 'Produção' },
    { value: 'AT', label: 'Ativa' },
    { value: 'EN', label: 'Encerrada' },
    { value: 'AR', label: 'Arquivada' },
  ];

  private estacaoMap = new Map(this.estacoes.map(o => [o.value, o.label]));
  private statusMap  = new Map(this.statusOpts.map(o => [o.value, o.label]));
  estLabel(v: string | null | undefined): string { return v ? (this.estacaoMap.get(v) ?? v) : ''; }
  statusLabel(v: string | null | undefined): string { return v ? (this.statusMap.get(v) ?? v) : ''; }

  constructor() {
    effect(() => {
      const tp = this.totalPages();
      if (this.page() > tp) this.page.set(tp);
    });
    this.load();
  }

  // ---------- lista/pager ----------
  load() {
    this.loading.set(true);
    this.api.list(this.search).subscribe({
      next: (rows) => {
        this.colecoes.set(rows);
        this.page.set(1);
      },
      error: () => {
        this.successMsg.set(null);
        this.colecoes.set([]);
        this.openErrorOverlay();  // mostra overlay com mensagens do form se houver
        this.loading.set(false);  // <- garante desligar o spinner em erro
      },
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

  // ---------- form ----------
  novo() {
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.form.reset({ Descricao: '', Codigo: null, Estacao: null, Status: 'CR', Contador: 0 });
  }

  editar(row: Colecao) {
    this.showForm = true;
    this.editingId = row.Idcolecao!;
    this.submitted = false;
    this.form.reset({
      Descricao: row.Descricao ?? '',
      Codigo: row.Codigo ?? null,
      Estacao: row.Estacao ?? null,
      Status: row.Status ?? null,
      Contador: row.Contador ?? 0,
    });
  }

  cancelarEdicao() {
    this.showForm = false;
    this.editingId = null;
    this.form.reset();
  }

  salvar() {
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlay(); return; }

    const body: Partial<Colecao> = this.form.value;
    this.saving = true;

    const req = this.editingId
      ? this.api.update(this.editingId, body)
      : this.api.create(body);

    req.subscribe({
      next: () => {
        this.successMsg.set(this.editingId ? 'Alterações salvas.' : 'Coleção criada.');
        this.cancelarEdicao();
        this.load();
      },
      error: (err) => {
        const controls = this.form.controls as any;
        if (err?.error) {
          Object.entries(err.error).forEach(([k, v]: any) => {
            if (controls[k]) controls[k].setErrors({ server: Array.isArray(v) ? v[0] : v });
          });
        }
        this.openErrorOverlay();
        this.saving = false;
      },
      complete: () => (this.saving = false),
    });
  }

  excluir(row: Colecao) {
    if (!row.Idcolecao) return;
    if (!confirm(`Excluir a coleção "${row.Descricao}"?`)) return;
    this.api.delete(row.Idcolecao).subscribe(() => this.load());
  }

  // ---------- overlay ----------
  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;
    if (f['Descricao']?.invalid) {
      if (f['Descricao'].errors?.['required']) msgs.push('Descrição: obrigatório.');
      if (f['Descricao'].errors?.['maxlength']) msgs.push('Descrição: máx. 100 caracteres.');
    }
    if (f['Codigo']?.invalid) {
      if (f['Codigo'].errors?.['required']) msgs.push('Código: obrigatório (2 dígitos).');
      if (f['Codigo'].errors?.['pattern']) msgs.push('Código: use dois dígitos, ex.: 26.');
    }
    if (f['Estacao']?.invalid) msgs.push('Estação: obrigatória.');
    if (f['Status']?.invalid) msgs.push('Status: obrigatório.');
    for (const k of Object.keys(f)) {
      if ((f as any)[k].errors?.['server']) msgs.push(`${k}: ${(f as any)[k].errors?.['server']}`);
    }
    return msgs;
  }

  openErrorOverlay() { this.errorOverlayOpen.set(true); }
  closeErrorOverlay() { this.errorOverlayOpen.set(false); }
}
