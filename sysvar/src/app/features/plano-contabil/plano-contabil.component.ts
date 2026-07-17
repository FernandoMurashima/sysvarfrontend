import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Empresa } from '../../core/models/empresa';
import { PlanoContabil } from '../../core/models/plano-contabil';
import { EmpresasService } from '../../core/services/empresas.service';
import { PlanoContabilService } from '../../core/services/plano-contabil.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-plano-contabil',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './plano-contabil.component.html',
  styleUrls: ['./plano-contabil.component.css']
})
export class PlanoContabilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(PlanoContabilService);
  private empresasApi = inject(EmpresasService);
  private auth = inject(AuthService);

  search = '';
  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;
  consultando = false;
  successMsg = '';
  errorMsg = '';

  empresas: Empresa[] = [];
  contasAll: PlanoContabil[] = [];
  contas: PlanoContabil[] = [];
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  readonly classes = [
    { value: 'ATIVO', label: 'Ativo' },
    { value: 'PASSIVO', label: 'Passivo' },
    { value: 'PATRIMONIO', label: 'Patrimônio líquido' },
    { value: 'RECEITA', label: 'Receita' },
    { value: 'CUSTO', label: 'Custo' },
    { value: 'DESPESA', label: 'Despesa' },
    { value: 'RESULTADO', label: 'Resultado' },
  ];
  readonly naturezas = [
    { value: 'DEBITO', label: 'Débito' },
    { value: 'CREDITO', label: 'Crédito' },
  ];

  form = this.fb.group({
    empresa: [null as number | null],
    codigo: ['', [Validators.required, Validators.maxLength(30)]],
    descricao: ['', [Validators.required, Validators.maxLength(160)]],
    classe: ['ATIVO', [Validators.required]],
    natureza: ['DEBITO', [Validators.required]],
    conta_pai: [null as number | null],
    nivel: [1, [Validators.required, Validators.min(1)]],
    analitica: [true],
    ativa: [true],
  });

  get isSuperUser(): boolean { return !!this.auth.getCurrentUser()?.is_superuser; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageStart(): number { return this.total ? (this.page - 1) * this.pageSize + 1 : 0; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }
  get podeEditarModulo(): boolean { return this.auth.podeAcessarModulo('financeiro', true) !== false; }
  get podeExcluirModulo(): boolean { return this.auth.podeExcluirModulo('financeiro'); }
  get searchSuggestions(): string[] {
    const valores = this.contasAll.flatMap(item => [
      item.codigo,
      item.descricao,
      item.classe,
      item.natureza,
      item.conta_pai_codigo || '',
      item.conta_pai_descricao || ''
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  ngOnInit(): void {
    this.loadEmpresas();
    this.load();
  }

  loadEmpresas(): void {
    this.empresasApi.list({ page_size: 500, ordering: 'nome' }).subscribe({
      next: res => {
        this.empresas = Array.isArray(res) ? res : (res?.results ?? []);
        if (this.isSuperUser && this.empresas.length === 1) this.form.patchValue({ empresa: this.empresas[0].id ?? null });
      },
      error: () => this.empresas = []
    });
  }

  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000, ordering: 'codigo' }).subscribe({
      next: res => {
        const arr = Array.isArray(res) ? res : (res?.results ?? []);
        this.contasAll = arr;
        this.total = arr.length;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => {
        this.contasAll = [];
        this.contas = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar plano contábil.';
      }
    });
  }

  contasPaiDisponiveis(): PlanoContabil[] {
    const empresa = this.form.value.empresa;
    return this.contasAll.filter(c =>
      c.id !== this.editingId &&
      c.analitica === false &&
      (!this.isSuperUser || !empresa || Number(c.empresa) === Number(empresa))
    );
  }

  novo(): void {
    if (!this.podeEditarModulo) return;
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.form.enable({ emitEvent: false });
    this.form.reset({
      empresa: this.isSuperUser && this.empresas.length === 1 ? this.empresas[0].id ?? null : null,
      codigo: '',
      descricao: '',
      classe: 'ATIVO',
      natureza: 'DEBITO',
      conta_pai: null,
      nivel: 1,
      analitica: true,
      ativa: true,
    });
  }

  editar(row: PlanoContabil, modoConsulta = false): void {
    if (!modoConsulta && !this.podeEditarModulo) return;
    this.showForm = true;
    this.editingId = row.id ?? null;
    this.consultando = modoConsulta;
    this.submitted = false;
    this.successMsg = '';
    this.form.enable({ emitEvent: false });
    this.form.reset({
      empresa: row.empresa ?? null,
      codigo: row.codigo ?? '',
      descricao: row.descricao ?? '',
      classe: row.classe ?? 'ATIVO',
      natureza: row.natureza ?? 'DEBITO',
      conta_pai: row.conta_pai ?? null,
      nivel: row.nivel ?? 1,
      analitica: row.analitica ?? true,
      ativa: row.ativa ?? true,
    });
  }

  consultar(row: PlanoContabil): void {
    this.editar(row, true);
    this.form.disable({ emitEvent: false });
  }

  salvar(): void {
    if (!this.podeEditarModulo) return;
    this.submitted = true;
    if (this.isSuperUser && !this.form.value.empresa) this.form.get('empresa')?.setErrors({ required: true });
    if (this.form.invalid) return;
    const raw = this.form.value;
    const payload: Partial<PlanoContabil> = {
      empresa: raw.empresa ?? null,
      codigo: String(raw.codigo || '').trim(),
      descricao: String(raw.descricao || '').trim(),
      classe: String(raw.classe || 'ATIVO'),
      natureza: String(raw.natureza || 'DEBITO'),
      conta_pai: raw.conta_pai ?? null,
      nivel: Number(raw.nivel || 1),
      analitica: raw.analitica ?? true,
      ativa: raw.ativa ?? true,
    };
    if (!this.isSuperUser) delete (payload as any).empresa;
    this.saving = true;
    const req$ = this.editingId ? this.api.update(this.editingId, payload) : this.api.create(payload);
    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId ? 'Conta contábil alterada.' : 'Conta contábil criada.';
        this.cancelar();
        this.load();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = this.extractError(err);
      }
    });
  }

  excluir(row: PlanoContabil): void {
    if (!this.podeExcluirModulo) return;
    if (!row.id || !confirm(`Excluir a conta ${row.codigo} - ${row.descricao}?`)) return;
    this.api.remove(row.id).subscribe({
      next: () => { this.successMsg = 'Conta excluída.'; this.load(); },
      error: () => this.errorMsg = 'Não foi possível excluir. Verifique se a conta já está vinculada.'
    });
  }

  cancelar(): void {
    this.showForm = false;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.form.enable({ emitEvent: false });
  }

  applyPage(): void {
    const a = (this.page - 1) * this.pageSize;
    this.contas = this.contasAll.slice(a, a + this.pageSize);
  }
  onPageSizeChange(v: string): void { this.pageSize = Number(v) || 20; this.page = 1; this.applyPage(); }
  firstPage(): void { this.page = 1; this.applyPage(); }
  prevPage(): void { if (this.page > 1) { this.page--; this.applyPage(); } }
  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.applyPage(); } }
  lastPage(): void { this.page = this.totalPages; this.applyPage(); }
  doSearch(): void { this.load(); }
  clearSearch(): void { this.search = ''; this.load(); }
  onSearchKeyup(ev: KeyboardEvent): void { if (ev.key === 'Enter') this.doSearch(); }

  private extractError(err: any): string {
    if (err?.error && typeof err.error === 'object') {
      return Object.entries(err.error).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' | ');
    }
    return 'Falha ao salvar.';
  }
}
