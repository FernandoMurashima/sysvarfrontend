import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cfop } from '../../core/models/cfop';
import { CfopsService } from '../../core/services/cfops.service';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-cfops',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './cfops.component.html',
  styleUrls: ['./cfops.component.css'],
})
export class CfopsComponent {
  private fb = inject(FormBuilder);
  private api = inject(CfopsService);
  private auth = inject(AuthService);

  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorOverlayOpen = signal(false);
  submitted = false;
  saving = false;
  excluirModal: Cfop | null = null;

  items = signal<Cfop[]>([]);
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

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('fiscal', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('fiscal');
  }

  searchSuggestions = computed(() => {
    const valores = this.items().flatMap(item => [
      item.codigo,
      item.descricao,
      item.tipo_operacao,
      item.destino
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  });

  showForm = false;
  editingId: number | null = null;
  consultando = false;
  form: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    descricao: ['', [Validators.required, Validators.maxLength(255)]],
    tipo_operacao: ['VENDA', Validators.required],
    destino: ['DENTRO_UF', Validators.required],
    movimenta_estoque: [true],
    gera_financeiro: [true],
    ativo: [true],
    observacoes: ['', Validators.maxLength(255)],
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
    this.showForm = true; this.editingId = null; this.submitted = false; this.consultando = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({ codigo: '', descricao: '', tipo_operacao: 'VENDA', destino: 'DENTRO_UF', movimenta_estoque: true, gera_financeiro: true, ativo: true, observacoes: '' });
  }

  editar(row: Cfop) {
    this.showForm = true; this.editingId = row.id ?? null; this.submitted = false; this.consultando = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      codigo: row.codigo ?? '',
      descricao: row.descricao ?? '',
      tipo_operacao: row.tipo_operacao ?? 'VENDA',
      destino: row.destino ?? 'DENTRO_UF',
      movimenta_estoque: row.movimenta_estoque !== false,
      gera_financeiro: row.gera_financeiro !== false,
      ativo: row.ativo !== false,
      observacoes: row.observacoes ?? '',
    });
  }

  consultar(row: Cfop) {
    this.editar(row);
    this.consultando = true;
    this.form.disable({ emitEvent: false });
  }

  cancelarEdicao() {
    this.showForm = false; this.editingId = null; this.consultando = false;
    this.form.enable({ emitEvent: false }); this.form.reset();
  }

  salvar() {
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlay(); return; }
    const body: Partial<Cfop> = this.form.getRawValue();
    this.saving = true;
    const req = this.editingId ? this.api.update(this.editingId, body) : this.api.create(body);
    req.subscribe({
      next: () => { this.successMsg.set(this.editingId ? 'Alterações salvas.' : 'CFOP criado.'); this.cancelarEdicao(); this.load(); },
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

  excluir(row: Cfop) {
    if (!this.podeExcluirModulo) return;
    if (!row.id) return;
    this.excluirModal = row;
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const row = this.excluirModal;
    if (!row?.id) return;
    this.api.delete(row.id).subscribe(() => {
      this.excluirModal = null;
      this.successMsg.set('CFOP excluído.');
      this.load();
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  tipoLabel(v: string): string {
    return ({ VENDA: 'Venda', COMPRA: 'Compra', DEVOLUCAO: 'Devolução', TRANSFERENCIA: 'Transferência', OUTROS: 'Outros' } as any)[v] || v;
  }

  destinoLabel(v: string): string {
    return ({ DENTRO_UF: 'Dentro do estado', FORA_UF: 'Fora do estado', AMBOS: 'Ambos' } as any)[v] || v;
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;
    if (f['codigo']?.invalid) {
      if (f['codigo'].errors?.['required']) msgs.push('CFOP: obrigatório.');
      if (f['codigo'].errors?.['pattern']) msgs.push('CFOP: use 4 dígitos.');
    }
    if (f['descricao']?.invalid) msgs.push('Descrição: obrigatória ou acima do limite.');
    if (f['tipo_operacao']?.invalid) msgs.push('Tipo de operação: obrigatório.');
    if (f['destino']?.invalid) msgs.push('Destino: obrigatório.');
    for (const k of Object.keys(f)) if ((f as any)[k].errors?.['server']) msgs.push(`${k}: ${(f as any)[k].errors?.['server']}`);
    return msgs;
  }

  openErrorOverlay() { this.errorOverlayOpen.set(true); }
  closeErrorOverlay() { this.errorOverlayOpen.set(false); }
}
