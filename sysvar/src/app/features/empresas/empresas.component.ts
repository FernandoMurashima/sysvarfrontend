import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Empresa } from '../../core/models/empresa';
import { EmpresasService } from '../../core/services/empresas.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent],
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
  consultando = false;

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
    licenca_master: [false],
    usa_vendas: [false],
    usa_compras: [false],
    usa_estoque: [false],
    usa_financeiro: [false],
    usa_fiscal: [false],
    usa_producao: [false],
  });

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageStart(): number { return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }
  get searchSuggestions(): string[] {
    const valores = this.empresasAll.flatMap(e => [
      e.nome,
      e.nome_fantasia,
      e.documento
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

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
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });
    this.form.reset({
      nome: '',
      nome_fantasia: '',
      documento: '',
      ativo: true,
      licenca_master: false,
      usa_vendas: false,
      usa_compras: false,
      usa_estoque: false,
      usa_financeiro: false,
      usa_fiscal: false,
      usa_producao: false,
    });
    this.aplicarMaster(false);
  }

  editar(row: Empresa): void {
    if (!row.id) return;
    this.showForm = true;
    this.editingId = row.id;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });
    this.form.reset({
      nome: row.nome ?? '',
      nome_fantasia: row.nome_fantasia ?? '',
      documento: row.documento ?? '',
      ativo: row.ativo !== false,
      licenca_master: row.licenca_master === true,
      usa_vendas: row.usa_vendas === true,
      usa_compras: row.usa_compras === true,
      usa_estoque: row.usa_estoque === true,
      usa_financeiro: row.usa_financeiro === true,
      usa_fiscal: row.usa_fiscal === true,
      usa_producao: row.usa_producao === true,
    });
    this.aplicarMaster(row.licenca_master === true);
  }

  consultar(row: Empresa): void {
    this.editar(row);
    this.consultando = true;
    this.form.disable({ emitEvent: false });
  }

  cancelar(): void {
    this.showForm = false;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      nome: '',
      nome_fantasia: '',
      documento: '',
      ativo: true,
      licenca_master: false,
      usa_vendas: false,
      usa_compras: false,
      usa_estoque: false,
      usa_financeiro: false,
      usa_fiscal: false,
      usa_producao: false,
    });
  }

  salvar(): void {
    this.submitted = true;
    this.successMsg = '';
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: Partial<Empresa> = {
      nome: (raw.nome || '').trim(),
      nome_fantasia: this.blankToNull(raw.nome_fantasia),
      documento: this.blankToNull(raw.documento),
      ativo: raw.ativo !== false,
      licenca_master: raw.licenca_master === true,
      usa_vendas: raw.usa_vendas === true,
      usa_compras: raw.usa_compras === true,
      usa_estoque: raw.usa_estoque === true,
      usa_financeiro: raw.usa_financeiro === true,
      usa_fiscal: raw.usa_fiscal === true,
      usa_producao: raw.usa_producao === true,
      usa_ficha_tecnica: raw.usa_producao === true,
      usa_faccao: raw.usa_producao === true,
      usa_distribuicao_producao: raw.usa_producao === true,
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

  onMasterChange(): void {
    this.aplicarMaster(this.form.get('licenca_master')?.value === true);
  }

  private aplicarMaster(master: boolean): void {
    const campos = ['usa_vendas', 'usa_compras', 'usa_estoque', 'usa_financeiro', 'usa_fiscal', 'usa_producao'];
    for (const campo of campos) {
      const ctrl = this.form.get(campo);
      if (!ctrl) continue;
      if (master) {
        ctrl.setValue(true, { emitEvent: false });
        ctrl.disable({ emitEvent: false });
      } else {
        ctrl.enable({ emitEvent: false });
      }
    }
  }

  modulosLabel(empresa: Empresa): string[] {
    if (empresa.licenca_master) return ['Master'];
    const tags: string[] = [];
    if (empresa.usa_vendas) tags.push('Vendas');
    if (empresa.usa_compras) tags.push('Compras');
    if (empresa.usa_estoque) tags.push('Estoque');
    if (empresa.usa_financeiro) tags.push('Financeiro');
    if (empresa.usa_fiscal) tags.push('Fiscal');
    if (empresa.usa_producao) tags.push('Produção');
    return tags;
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
