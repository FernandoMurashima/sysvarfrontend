import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Empresa } from '../../core/models/empresa';
import { EmpresasService } from '../../core/services/empresas.service';

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './empresas.component.html',
  styleUrls: ['./empresas.component.css']
})
export class EmpresasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(EmpresasService);

  loading = false;
  saving = false;
  showForm = false;
  submitted = false;
  editingId: number | null = null;

  search = '';
  successMsg = '';
  errorMsg = '';
  excluirModal: Empresa | null = null;
  private successTimer: any = null;

  empresasAll: Empresa[] = [];
  empresas: Empresa[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    nome_fantasia: ['', [Validators.maxLength(120)]],
    documento: ['', [Validators.maxLength(18)]],
    ativo: [true],
  });

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageStart(): number { return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.list({ ordering: 'nome', page_size: 1000 }).subscribe({
      next: (res: any) => {
        const rows: Empresa[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.empresasAll = this.filterRows(rows);
        this.total = this.empresasAll.length;
        this.page = 1;
        this.applyPage();
        this.errorMsg = '';
        this.loading = false;
      },
      error: () => {
        this.empresasAll = [];
        this.empresas = [];
        this.total = 0;
        this.errorMsg = 'Falha ao carregar empresas.';
        this.loading = false;
      }
    });
  }

  doSearch(): void {
    this.load();
  }

  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.doSearch();
  }

  clearSearch(): void {
    this.search = '';
    this.load();
  }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.reset({ nome: '', nome_fantasia: '', documento: '', ativo: true });
  }

  editar(row: Empresa): void {
    if (!row.id) return;
    this.showForm = true;
    this.editingId = row.id;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.reset({
      nome: row.nome ?? '',
      nome_fantasia: row.nome_fantasia ?? '',
      documento: row.documento ?? '',
      ativo: row.ativo !== false,
    });
  }

  cancelar(): void {
    this.showForm = false;
    this.editingId = null;
    this.submitted = false;
    this.form.reset({ nome: '', nome_fantasia: '', documento: '', ativo: true });
  }

  salvar(): void {
    this.submitted = true;
    this.successMsg = '';
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: Partial<Empresa> = {
      nome: (this.form.value.nome || '').trim(),
      nome_fantasia: this.blankToNull(this.form.value.nome_fantasia),
      documento: this.blankToNull(this.form.value.documento),
      ativo: this.form.value.ativo !== false,
    };

    this.saving = true;
    const req = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.setSuccess(this.editingId ? 'Empresa atualizada.' : 'Empresa cadastrada.');
        this.search = '';
        this.cancelar();
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = this.errorText(err);
      }
    });
  }

  getFormErrors(): string[] {
    const errors: string[] = [];
    const nome = this.form.get('nome');
    const fantasia = this.form.get('nome_fantasia');
    const documento = this.form.get('documento');

    if (nome?.errors?.['required']) errors.push('Informe a razão social.');
    if (nome?.errors?.['maxlength']) errors.push('Razão social deve ter no máximo 120 caracteres.');
    if (fantasia?.errors?.['maxlength']) errors.push('Nome fantasia deve ter no máximo 120 caracteres.');
    if (documento?.errors?.['maxlength']) errors.push('Documento deve ter no máximo 18 caracteres.');
    return errors;
  }

  alternarAtivo(row: Empresa): void {
    if (!row.id) return;
    this.api.patch(row.id, { ativo: row.ativo === false }).subscribe({
      next: () => this.load(),
      error: () => this.errorMsg = 'Não foi possível alterar o status da empresa.'
    });
  }

  excluir(row: Empresa): void {
    if (!row.id) return;
    this.excluirModal = row;
  }

  confirmarExclusao(): void {
    const row = this.excluirModal;
    if (!row?.id) return;
    this.api.remove(row.id).subscribe({
      next: () => {
        this.excluirModal = null;
        this.setSuccess('Empresa excluída.');
        this.load();
      },
      error: () => this.errorMsg = 'Não foi possível excluir. Pode haver lojas ou usuários vinculados.'
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  onPageSizeChange(size: string): void {
    this.pageSize = Number(size) || 20;
    this.page = 1;
    this.applyPage();
  }

  firstPage(): void { this.page = 1; this.applyPage(); }
  prevPage(): void { if (this.page > 1) { this.page--; this.applyPage(); } }
  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.applyPage(); } }
  lastPage(): void { this.page = this.totalPages; this.applyPage(); }

  private filterRows(rows: Empresa[]): Empresa[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(e =>
      (e.nome || '').toLowerCase().includes(q) ||
      (e.nome_fantasia || '').toLowerCase().includes(q) ||
      (e.documento || '').toLowerCase().includes(q)
    );
  }

  private applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    this.empresas = this.empresasAll.slice(start, start + this.pageSize);
  }

  private blankToNull(value: any): string | null {
    const text = String(value ?? '').trim();
    return text ? text : null;
  }

  private errorText(err: any): string {
    if (err?.status === 403) return 'Você não tem permissão para cadastrar empresa.';
    if (err?.status === 401) return 'Sessão expirada. Faça login novamente.';
    const data = err?.error;
    if (!data) return 'Não foi possível salvar a empresa.';
    if (typeof data === 'string') return data;
    const firstKey = Object.keys(data)[0];
    const value = firstKey ? data[firstKey] : null;
    if (Array.isArray(value)) return `${firstKey}: ${value.join(', ')}`;
    if (value) return `${firstKey}: ${value}`;
    return 'Não foi possível salvar a empresa.';
  }

  private setSuccess(message: string): void {
    this.successMsg = message;
    if (this.successTimer) clearTimeout(this.successTimer);
    this.successTimer = setTimeout(() => {
      this.successMsg = '';
      this.successTimer = null;
    }, 3500);
  }
}
