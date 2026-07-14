import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Tributo } from '../../core/models/tributo';
import { TributosService } from '../../core/services/tributos.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-tributos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './tributos.component.html',
  styleUrls: ['./tributos.component.css'],
})
export class TributosComponent {
  private fb = inject(FormBuilder);
  private api = inject(TributosService);
  private auth = inject(AuthService);

  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  submitted = false;
  saving = false;
  excluirModal: Tributo | null = null;
  items = signal<Tributo[]>([]);
  page = signal(1);
  pageSizeOptions = [10, 20, 50];
  pageSize = signal(20);
  total = computed(() => this.items().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  pageStart = computed(() => (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));
  paged = computed(() => this.items().slice((this.page() - 1) * this.pageSize(), this.page() * this.pageSize()));

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('fiscal', true) !== false;
  }

  showForm = false;
  editingId: number | null = null;
  consultando = false;
  form: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(20)]],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    esfera: ['FEDERAL', Validators.required],
    atual: [true],
    ativo: [true],
    observacoes: ['', Validators.maxLength(255)],
  });

  constructor() {
    effect(() => { if (this.page() > this.totalPages()) this.page.set(this.totalPages()); });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.list(this.search).subscribe({
      next: rows => { this.items.set(rows); this.page.set(1); },
      error: () => { this.items.set([]); },
      complete: () => this.loading.set(false),
    });
  }
  doSearch() { this.load(); }
  clearSearch() { this.search = ''; this.load(); }
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.doSearch(); }
  onPageSizeChange(v: number) { this.pageSize.set(+v); this.page.set(1); }
  firstPage() { this.page.set(1); }
  prevPage() { this.page.update(p => Math.max(1, p - 1)); }
  nextPage() { this.page.update(p => Math.min(this.totalPages(), p + 1)); }
  lastPage() { this.page.set(this.totalPages()); }

  novo() {
    if (!this.podeEditarModulo) return;
    this.showForm = true; this.editingId = null; this.consultando = false; this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({ codigo: '', descricao: '', esfera: 'FEDERAL', atual: true, ativo: true, observacoes: '' });
  }
  editar(row: Tributo) {
    if (!this.podeEditarModulo) return;
    this.showForm = true; this.editingId = row.id ?? null; this.consultando = false; this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({ codigo: row.codigo, descricao: row.descricao, esfera: row.esfera, atual: row.atual, ativo: row.ativo, observacoes: row.observacoes || '' });
  }
  consultar(row: Tributo) { this.editar(row); this.consultando = true; this.form.disable({ emitEvent: false }); }
  cancelarEdicao() { this.showForm = false; this.editingId = null; this.consultando = false; this.form.enable({ emitEvent: false }); this.form.reset(); }
  salvar() {
    if (!this.podeEditarModulo) return;
    this.submitted = true;
    if (this.form.invalid) return;
    this.saving = true;
    const req = this.editingId ? this.api.update(this.editingId, this.form.getRawValue()) : this.api.create(this.form.getRawValue());
    req.subscribe({
      next: () => { this.successMsg.set(this.editingId ? 'Alterações salvas.' : 'Tributo criado.'); this.cancelarEdicao(); this.load(); },
      complete: () => this.saving = false,
      error: () => this.saving = false,
    });
  }
  excluir(row: Tributo) { if (this.podeEditarModulo) this.excluirModal = row; }
  confirmarExclusao() {
    if (!this.podeEditarModulo) return;
    if (!this.excluirModal?.id) return;
    this.api.delete(this.excluirModal.id).subscribe(() => { this.excluirModal = null; this.successMsg.set('Tributo excluído.'); this.load(); });
  }
  fecharExclusao() { this.excluirModal = null; }
}
