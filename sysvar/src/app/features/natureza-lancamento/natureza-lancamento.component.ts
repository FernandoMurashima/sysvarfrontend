import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { NatLancamentosService } from '../../core/services/natureza-lancamento.service';
import { NatLancamento } from '../../core/models/natureza-lancamento';
import { EmpresasService } from '../../core/services/empresas.service';
import { Empresa } from '../../core/models/empresa';
import { AuthService } from '../../core/auth.service';
import { PlanoContabil } from '../../core/models/plano-contabil';
import { PlanoContabilService } from '../../core/services/plano-contabil.service';

@Component({
  selector: 'app-nat-lancamentos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './natureza-lancamento.component.html',
  styleUrls: ['./natureza-lancamento.component.css']
})
export class NatLancamentosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(NatLancamentosService);
  private empresasApi = inject(EmpresasService);
  private auth = inject(AuthService);
  private planoApi = inject(PlanoContabilService);

  search = '';
  loading = false;
  saving = false;
  submitted = false;

  showForm = false;
  editingId: number | null = null;

  successMsg = '';
  errorMsg = '';
  excluirModal: NatLancamento | null = null;
  errorOverlayOpen = false;
  empresas: Empresa[] = [];
  planoContabil: PlanoContabil[] = [];

  readonly operacoes = [
    { value: 'RECEITA', label: 'Receita' },
    { value: 'DESPESA', label: 'Despesa' },
    { value: 'TRANSFERENCIA', label: 'Transferência' },
    { value: 'AJUSTE', label: 'Ajuste' },
  ];
  readonly tiposNatureza = [
    { value: 'CREDITO', label: 'Crédito' },
    { value: 'DEBITO', label: 'Débito' },
    { value: 'NEUTRO', label: 'Neutro' },
  ];
  readonly statusOptions = [
    { value: 'ATIVO', label: 'Ativo' },
    { value: 'INATIVO', label: 'Inativo' },
  ];
  readonly tiposOptions = [
    { value: 'OPERACIONAL', label: 'Operacional' },
    { value: 'FINANCEIRO', label: 'Financeiro' },
    { value: 'INVESTIMENTO', label: 'Investimento' },
    { value: 'FISCAL', label: 'Fiscal/Impostos' },
    { value: 'TRANSFERENCIA', label: 'Transferência' },
    { value: 'AJUSTE', label: 'Ajuste' },
    { value: 'RECEITA', label: 'Receita' },
    { value: 'DESPESA', label: 'Despesa' },
  ];

  form: FormGroup = this.fb.group({
    empresa: [null as number | null],
    codigo: ['', [Validators.required, Validators.maxLength(10)]],
    categoria_principal: ['', [Validators.required, Validators.maxLength(50)]],
    subcategoria: ['', [Validators.required, Validators.maxLength(50)]],
    descricao: ['', [Validators.required, Validators.maxLength(255)]],
    tipo: ['', [Validators.required, Validators.maxLength(20)]],
    status: ['', [Validators.required, Validators.maxLength(10)]],
    tipo_natureza: ['', [Validators.required, Validators.maxLength(10)]],
    natureza_operacao: ['DESPESA', [Validators.required, Validators.maxLength(20)]],
    categoria_gerencial: ['', [Validators.maxLength(50)]],
    movimenta_financeiro: [true],
    entra_dre: [true],
    plano_contabil: [null as number | null],
    conta_contabil: ['', [Validators.maxLength(50)]],
    ativo: [true],
  });

  // lista + paginação client-side
  itensAll: NatLancamento[] = [];
  itens: NatLancamento[] = [];
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageStart(): number { return this.total ? (this.page - 1) * this.pageSize + 1 : 0; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }

  get isSuperUser(): boolean { return !!this.auth.getCurrentUser()?.is_superuser; }

  ngOnInit(): void {
    this.loadEmpresas();
    this.loadPlanoContabil();
    this.load();
  }

  loadEmpresas(): void {
    this.empresasApi.list({ page_size: 500, ordering: 'nome' }).subscribe({
      next: res => {
        this.empresas = Array.isArray(res) ? res : (res?.results ?? []);
        if (this.isSuperUser && !this.form.get('empresa')?.value && this.empresas.length === 1) {
          this.form.patchValue({ empresa: this.empresas[0].id ?? null });
        }
      },
      error: () => { this.empresas = []; }
    });
  }

  loadPlanoContabil(): void {
    this.planoApi.list({ page_size: 3000, ordering: 'codigo', ativa: true }).subscribe({
      next: res => {
        this.planoContabil = Array.isArray(res) ? res : (res?.results ?? []);
      },
      error: () => { this.planoContabil = []; }
    });
  }

  contasContabeisDisponiveis(): PlanoContabil[] {
    const empresa = this.form.get('empresa')?.value;
    return this.planoContabil.filter(conta =>
      conta.ativa !== false &&
      conta.analitica !== false &&
      (!this.isSuperUser || !empresa || Number(conta.empresa) === Number(empresa))
    );
  }

  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000, ordering: 'codigo' }).subscribe({
      next: (res: any) => {
        const arr: NatLancamento[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.itensAll = arr;
        this.total = (res && typeof res === 'object' && typeof res.count === 'number') ? res.count : arr.length;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => {
        this.itensAll = []; this.itens = []; this.total = 0;
        this.loading = false; this.errorMsg = 'Falha ao carregar.';
      }
    });
  }

  applyPage(): void {
    const a = (this.page - 1) * this.pageSize;
    const b = a + this.pageSize;
    this.itens = this.itensAll.slice(a, b);
  }

  onPageSizeChange(v: string): void { this.pageSize = Number(v) || 10; this.page = 1; this.applyPage(); }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.applyPage(); } }
  prevPage(): void { if (this.page > 1) { this.page--; this.applyPage(); } }
  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.applyPage(); } }
  lastPage(): void { if (this.page !== this.totalPages) { this.page = this.totalPages; this.applyPage(); } }

  onSearchKeyup(ev: KeyboardEvent): void { if (ev.key === 'Enter') this.doSearch(); }
  doSearch(): void { this.page = 1; this.load(); }
  clearSearch(): void { this.search = ''; this.page = 1; this.load(); }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';
    this.form.reset({
      codigo: '', categoria_principal: '', subcategoria: '',
      descricao: '', tipo: 'OPERACIONAL', status: 'ATIVO', tipo_natureza: 'DEBITO',
      natureza_operacao: 'DESPESA', categoria_gerencial: '', movimenta_financeiro: true,
      entra_dre: true, plano_contabil: null, conta_contabil: '', ativo: true,
      empresa: this.isSuperUser && this.empresas.length === 1 ? this.empresas[0].id ?? null : null
    });
  }

  editar(row: NatLancamento): void {
    this.showForm = true;
    this.editingId = row.idnatureza ?? null;
    this.submitted = false;
    this.successMsg = '';
    this.form.reset({
      codigo: row.codigo ?? '',
      categoria_principal: row.categoria_principal ?? '',
      subcategoria: row.subcategoria ?? '',
      descricao: row.descricao ?? '',
      tipo: row.tipo ?? '',
      status: row.status ?? '',
      tipo_natureza: row.tipo_natureza ?? '',
      natureza_operacao: row.natureza_operacao ?? 'DESPESA',
      categoria_gerencial: row.categoria_gerencial ?? '',
      movimenta_financeiro: row.movimenta_financeiro ?? true,
      entra_dre: row.entra_dre ?? true,
      plano_contabil: row.plano_contabil ?? null,
      conta_contabil: row.conta_contabil ?? '',
      ativo: row.ativo ?? true,
      empresa: row.empresa ?? null
    });
  }

  cancelarEdicao(): void {
    this.showForm = false;
    this.editingId = null;
    this.submitted = false;
    this.errorOverlayOpen = false;
  }

  salvar(): void {
    this.submitted = true;
    if (this.isSuperUser && !this.form.get('empresa')?.value) {
      this.form.get('empresa')?.setErrors({ required: true });
    }
    if (this.form.invalid) { this.openErrorOverlayIfNeeded(); return; }

    const payload = this.form.value as NatLancamento;
    if (!this.isSuperUser) delete (payload as any).empresa;
    this.saving = true;

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId ? 'Alterações salvas.' : 'Registro criado.';
        this.cancelarEdicao();
        this.page = 1;
        this.load();
      },
      error: (err) => {
        this.saving = false;
        if (err?.error && typeof err.error === 'object') {
          Object.keys(err.error).forEach(field => {
            const ctrl = this.form.get(field);
            if (ctrl) {
              ctrl.setErrors({
                ...(ctrl.errors || {}),
                server: Array.isArray(err.error[field]) ? err.error[field].join(' ') : String(err.error[field])
              });
            }
          });
        }
        this.openErrorOverlayIfNeeded();
      }
    });
  }

  excluir(row: NatLancamento): void {
    const id = row.idnatureza;
    if (!id) return;
    this.excluirModal = row;
  }

  confirmarExclusao(): void {
    const row = this.excluirModal;
    const id = row?.idnatureza;
    if (!id) return;
    this.api.delete(id).subscribe({
      next: () => { 
        this.excluirModal = null;
        const eraUltimo = this.itens.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
        this.successMsg = 'Excluído.';
      },
      error: () => { this.errorMsg = 'Falha ao excluir.'; }
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const req = (name: string, label: string, max?: number) => {
      const c = f.get(name);
      if (!c) return;
      if (c.hasError('required')) msgs.push(`${label} é obrigatório.`);
      if (max && c.hasError('maxlength')) msgs.push(`${label}: máx. ${max} caracteres.`);
      const s = c.errors?.['server']; if (s) msgs.push(`${label}: ${s}`);
    };
    req('codigo', 'Código', 10);
    req('categoria_principal', 'Categoria', 50);
    req('subcategoria', 'Subcategoria', 50);
    req('descricao', 'Descrição', 255);
    req('tipo', 'Tipo', 20);
    req('status', 'Status', 10);
    req('tipo_natureza', 'Tipo de Natureza', 10);
    req('natureza_operacao', 'Operação', 20);
    req('categoria_gerencial', 'Categoria gerencial', 50);
    req('conta_contabil', 'Conta contábil', 50);
    if (this.isSuperUser) req('empresa', 'Empresa');
    return msgs;
  }

  contaLabel(n: NatLancamento): string {
    if (n.plano_contabil_codigo) return `${n.plano_contabil_codigo} - ${n.plano_contabil_descricao || ''}`.trim();
    return n.conta_contabil || '-';
  }

  openErrorOverlayIfNeeded(): void { this.errorOverlayOpen = this.getFormErrors().length > 0; }
  closeErrorOverlay(): void { this.errorOverlayOpen = false; }
}
