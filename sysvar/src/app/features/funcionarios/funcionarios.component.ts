import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { FuncionariosService } from '../../core/services/funcionarios.service';
import { CargosService } from '../../core/services/cargos.service';
import { LojasService } from '../../core/services/lojas.service';
import { UsersService } from '../../core/services/users.service';
import { Funcionario } from '../../core/models/funcionario';
import { Cargo } from '../../core/models/cargo';
import { Loja } from '../../core/models/loja';
import { User } from '../../core/models/user';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';

@Component({
  selector: 'app-funcionarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent, SummaryCardComponent],
  templateUrl: './funcionarios.component.html',
  styleUrls: ['./funcionarios.component.css']
})
export class FuncionariosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(FuncionariosService);
  private cargosApi = inject(CargosService);
  private lojasApi = inject(LojasService);
  private usersApi = inject(UsersService);
  private auth = inject(AuthService);

  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;
  consultando = false;

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('cadastros', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('cadastros');
  }

  search = '';
  filterLoja: number | '' = '';
  filterCargo: number | '' = '';
  filterStatus = '';
  filterParticipaVendas: '' | 'true' | 'false' = '';
  filterComissionado: '' | 'true' | 'false' = '';
  advancedOpen = false;
  successMsg = '';
  errorMsg = '';
  excluirModal: Funcionario | null = null;
  errorOverlayOpen = false;
  columnsOpen = false;
  exportOpen = false;
  selectedFuncionario: Funcionario | null = null;
  indicatorsVisible = true;
  filtersVisible = true;
  private readonly columnsStorageKey = 'sysvar.list.funcionarios.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.funcionarios';
  columns = [
    { key: 'apelido', label: 'Apelido', visible: true, required: false },
    { key: 'matricula', label: 'Matrícula', visible: true, required: true },
    { key: 'cpf', label: 'CPF', visible: true, required: false },
    { key: 'loja', label: 'Loja', visible: true, required: false },
    { key: 'cargo', label: 'Cargo', visible: true, required: false },
    { key: 'comissao', label: 'Comissão %', visible: true, required: false },
    { key: 'salario', label: 'Salário', visible: true, required: false },
    { key: 'situacao', label: 'Situação', visible: true, required: false },
    { key: 'cadastro', label: 'Cadastro', visible: true, required: false },
  ];

  lojasOptions: { id: number; nome: string }[] = [];
  cargosOptions: Cargo[] = [];
  usuariosOptions: User[] = [];
  historicoAtual: any[] = [];

  get podeVerSalario(): boolean {
    const user = this.auth.getCurrentUser();
    const permissao = this.auth.permissaoCampo('funcionario.salario');
    if (permissao !== null) return permissao;
    const tipo = String(this.auth.getUserType() || user?.type || '').toLowerCase();
    return !!user?.is_superuser || tipo === 'admin' || tipo === 'diretor';
  }

  form: FormGroup = this.fb.group({
    matricula: [''],
    nomefuncionario: ['', [Validators.required, Validators.maxLength(50)]],
    apelido: ['',[Validators.maxLength(20)]],
    cpf: ['', [Validators.required, this.cpfValidator]],

    inicio: [''],
    fim: [''],

    cargo: [null, [Validators.required]],
    situacao: ['ATIVO'],
    participa_vendas: [false],
    comissionado: [false],
    comissao_percentual: [0, []],
    salario: [0, []],

    idloja: [null],
    todas_lojas_da_empresa: [false],
    lojas_supervisionadas: [[]],
    usuario: [null],
    telefone: [''],
    whatsapp: [''],
    email: [''],
    data_nascimento: [''],
    endereco: [''],
    observacoes: [''],
    ativo: [true],
  });

  funcionarios: Funcionario[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }
  get pageStart(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }
  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }
  get searchSuggestions(): string[] {
    return this.funcionarios.flatMap(f => [
      f.matricula,
      f.nomefuncionario,
      f.apelido,
      f.cpf,
      f.cargo_nome,
      f.loja_nome,
    ].filter((v): v is string => !!v));
  }

  indicadores = { total: 0, ativos: 0, afastados: 0, desligados: 0, participantes_vendas: 0 };

  get funcionariosFiltrados(): Funcionario[] {
    return this.funcionarios;
  }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadViewPreference();
    this.load();
    this.loadLojas();
    this.loadCargos();
    this.loadUsuarios();
  }

  loadLojas(): void {
    this.lojasApi.list({ page_size: 2000, ordering: 'nome_loja' }).subscribe({
      next: (res: any) => {
        const arr: Loja[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.lojasOptions = arr.map(l => ({ id: (l as any).Idloja ?? (l as any).id ?? (l as any).pk ?? 0, nome: l.nome_loja }));
      },
      error: () => { this.lojasOptions = []; }
    });
  }

  // ====== Validadores / formatações ======
  cpfValidator(ctrl: AbstractControl): ValidationErrors | null {
    const raw: string = (ctrl.value || '').toString().trim();
    if (!raw) return null; // opcional
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 11) return { cpf: true };
    // rejeita sequências
    if (/^(\d)\1{10}$/.test(digits)) return { cpf: true };

    const calc = (base: string, factorStart: number) => {
      let sum = 0;
      for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (factorStart - i);
      const mod = (sum * 10) % 11;
      return mod === 10 ? 0 : mod;
    };
    const d1 = calc(digits.slice(0, 9), 10);
    const d2 = calc(digits.slice(0,10), 11);
    const ok = (d1 === parseInt(digits[9],10)) && (d2 === parseInt(digits[10],10));
    return ok ? null : { cpf: true };
  }

  onCpfInput(): void {
    const ctrl = this.form.get('cpf');
    if (!ctrl) return;
    const d = (ctrl.value || '').toString().replace(/\D/g, '').slice(0, 11);
    let out = d;
    if (d.length > 3) out = d.slice(0,3) + '.' + d.slice(3);
    if (d.length > 6) out = out.slice(0,7) + '.' + d.slice(6);
    if (d.length > 9) out = out.slice(0,11) + '-' + d.slice(9);
    ctrl.setValue(out, { emitEvent: false });
  }

  loadCargos(): void {
    this.cargosApi.list({ page_size: 500, ordering: 'descricao' }).subscribe({
      next: (res: any) => { this.cargosOptions = Array.isArray(res) ? res : (res?.results ?? []); },
      error: () => { this.cargosOptions = []; }
    });
  }

  loadUsuarios(): void {
    this.usersApi.list({ page_size: 500, ordering: 'username', is_active: 'true' }).subscribe({
      next: (res: any) => { this.usuariosOptions = Array.isArray(res) ? res : (res?.results ?? []); },
      error: () => { this.usuariosOptions = []; }
    });
  }

  private onlyDigits(value: string): string {
    return (value || '').replace(/\D/g, '');
  }

  // ========= Ações =========
  load(): void {
    this.loading = true;
    const params: Record<string, string | number> = { page: this.page, page_size: this.pageSize, ordering: 'matricula,nomefuncionario' };
    if (this.search) params['search'] = this.search;
    if (this.filterLoja !== '') params['idloja'] = this.filterLoja;
    if (this.filterCargo !== '') params['cargo'] = this.filterCargo;
    if (this.filterStatus) params['situacao'] = this.filterStatus;
    if (this.filterParticipaVendas) params['participa_vendas'] = this.filterParticipaVendas;
    if (this.filterComissionado) params['comissionado'] = this.filterComissionado;
    this.api.list(params).subscribe({
      next: (res: any) => {
        this.funcionarios = Array.isArray(res) ? res : (res?.results ?? []);
        this.total = Array.isArray(res) ? this.funcionarios.length : (res?.count ?? 0);
        this.loading = false;
        this.errorMsg = '';
        if (this.selectedFuncionario && !this.funcionarios.some(f => f.id === this.selectedFuncionario?.id)) this.selectedFuncionario = null;
        this.loadIndicadores();
      },
      error: () => {
        this.funcionarios = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar funcionários.';
      }
    });
  }

  applyPage(): void {
    if (this.page > this.totalPages) this.page = this.totalPages;
    this.load();
  }

  onPageSizeChange(sizeStr: string): void {
    this.pageSize = Number(sizeStr) || 10;
    localStorage.setItem('sysvar.list.funcionarios.pageSize', String(this.pageSize));
    this.page = 1;
    this.applyPage();
  }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.load(); } }
  prevPage(): void  { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void  { if (this.page < this.totalPages) { this.page++; this.load(); } }
  lastPage(): void  { if (this.page !== this.totalPages) { this.page = this.totalPages; this.load(); } }

  onSearchKeyup(ev: KeyboardEvent): void { if (ev.key === 'Enter') this.doSearch(); }
  doSearch(): void { this.page = 1; this.load(); }
  clearSearch(): void {
    this.search = '';
    this.filterLoja = '';
    this.filterCargo = '';
    this.filterStatus = '';
    this.filterParticipaVendas = '';
    this.filterComissionado = '';
    this.page = 1;
    this.load();
  }

  selecionarFuncionario(row: Funcionario): void {
    this.selectedFuncionario = this.isSelected(row) ? null : row;
  }

  isSelected(row: Funcionario): boolean {
    return !!this.selectedFuncionario && this.selectedFuncionario.id === row.id;
  }

  consultarSelecionado(): void {
    if (this.selectedFuncionario) this.consultar(this.selectedFuncionario);
  }

  editarSelecionado(): void {
    if (this.selectedFuncionario && this.podeEditarModulo) this.editar(this.selectedFuncionario);
  }

  excluirSelecionado(): void {
    if (this.selectedFuncionario && this.podeExcluirModulo) this.excluir(this.selectedFuncionario);
  }

  toggleIndicators(): void {
    this.indicatorsVisible = !this.indicatorsVisible;
    this.saveViewPreference();
  }

  toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
    this.saveViewPreference();
  }

  restoreViewPreference(): void {
    localStorage.removeItem(this.viewPrefsKey);
    localStorage.removeItem('sysvar.list.funcionarios.pageSize');
    this.indicatorsVisible = true;
    this.filtersVisible = true;
    this.pageSize = 20;
    this.columns = this.columns.map(c => ({ ...c, visible: true }));
    this.saveColumnsPreference();
    this.load();
  }

  @HostListener('window:sysvar-funcionarios-toggle-indicators')
  onToggleIndicatorsEvent(): void {
    this.toggleIndicators();
  }

  @HostListener('window:sysvar-funcionarios-toggle-filters')
  onToggleFiltersEvent(): void {
    this.toggleFilters();
  }

  @HostListener('window:sysvar-funcionarios-restore-view')
  onRestoreViewEvent(): void {
    this.restoreViewPreference();
  }

  lojaNome(id: number | null | undefined): string {
    if (!id) return '';
    return this.lojasOptions.find(l => l.id === id)?.nome || '';
  }

  usuarioLabel(user: User | null | undefined): string {
    if (!user) return '';
    const nome = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    if (nome && user.username) return `${nome} (${user.username})`;
    return nome || user.username || `Usuário ${user.id}`;
  }

  usuarioNome(id: number | null | undefined): string {
    if (!id) return 'Nenhum';
    const user = this.usuariosOptions.find(u => Number(u.id) === Number(id));
    return user ? this.usuarioLabel(user) : 'Usuário vinculado';
  }

  usuariosDisponiveis(): User[] {
    const atual = Number(this.form.get('usuario')?.value || 0) || null;
    const vinculados = new Set(
      this.funcionarios
        .filter(f => Number(f.usuario || 0) && (!this.editingId || f.id !== this.editingId))
        .map(f => Number(f.usuario))
    );
    return this.usuariosOptions.filter(user => {
      const id = Number(user.id || 0);
      return !!id && (id === atual || !vinculados.has(id));
    });
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
      nomefuncionario: '',
      matricula: '',
      apelido: '',
      cpf: '',
      inicio: '',
      fim: '',
      cargo: null,
      situacao: 'ATIVO',
      participa_vendas: false,
      comissionado: false,
      comissao_percentual: 0,
      salario: this.podeVerSalario ? 0 : null,
      idloja: null,
      todas_lojas_da_empresa: false,
      lojas_supervisionadas: [],
      usuario: null,
      telefone: '',
      whatsapp: '',
      email: '',
      data_nascimento: '',
      endereco: '',
      observacoes: '',
      ativo: true,
    });
    if (!this.podeVerSalario) this.form.get('salario')?.disable({ emitEvent: false });
  }

  editar(row: Funcionario): void {
    this.showForm = true;
    this.editingId = (row as any).id ?? null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });

    this.form.reset({
      matricula: row.matricula ?? '',
      nomefuncionario: row.nomefuncionario ?? '',
      apelido: row.apelido ?? '',
      cpf: row.cpf ?? '',
      inicio: row.inicio ?? '',
      fim: row.fim ?? '',
      cargo: row.cargo ?? null,
      situacao: row.situacao ?? 'ATIVO',
      participa_vendas: row.participa_vendas ?? false,
      comissionado: row.comissionado ?? false,
      comissao_percentual: row.comissao_percentual ?? 0,
      salario: row.salario_oculto ? null : (row.salario ?? 0),
      idloja: (row as any).idloja ?? null,
      todas_lojas_da_empresa: row.todas_lojas_da_empresa ?? false,
      lojas_supervisionadas: row.lojas_supervisionadas ?? [],
      usuario: row.usuario ?? null,
      telefone: row.telefone ?? '',
      whatsapp: row.whatsapp ?? '',
      email: row.email ?? '',
      data_nascimento: row.data_nascimento ?? '',
      endereco: row.endereco ?? '',
      observacoes: row.observacoes ?? '',
      ativo: row.ativo ?? true,
    });
    if (!this.podeVerSalario || row.salario_oculto) this.form.get('salario')?.disable({ emitEvent: false });
  }

  consultar(row: Funcionario): void {
    this.editar(row);
    this.consultando = true;
    this.form.disable({ emitEvent: false });
    if (row.id) this.api.historico(row.id).subscribe({ next: (res: any) => this.historicoAtual = res?.results ?? res ?? [], error: () => this.historicoAtual = [] });
  }

  rowActions(row: Funcionario): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'afastar', label: 'Afastar', icon: '⏸', visible: this.podeEditarModulo && row.situacao === 'ATIVO' },
      { key: 'retornar', label: 'Retornar', icon: '↩', visible: this.podeEditarModulo && row.situacao === 'AFASTADO' },
      { key: 'desligar', label: 'Desligar', icon: '⏹', visible: this.podeEditarModulo && row.situacao !== 'DESLIGADO' },
      { key: 'recontratar', label: 'Recontratar', icon: '↻', visible: this.podeEditarModulo && row.situacao === 'DESLIGADO' },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo, danger: true, dividerBefore: true },
    ];
  }

  executarAcao(action: string, row: Funcionario): void {
    if (action === 'consultar') this.consultar(row);
    if (action === 'editar') this.editar(row);
    if (action === 'excluir') this.excluir(row);
    if (['afastar', 'retornar', 'desligar', 'recontratar'].includes(action) && row.id) this.executarCiclo(row.id, action as any);
  }

  visibleColumn(key: string): boolean {
    return this.columns.find(c => c.key === key)?.visible !== false;
  }

  toggleColumn(key: string, checked: boolean): void {
    const col = this.columns.find(c => c.key === key);
    if (!col || col.required) return;
    col.visible = checked;
    this.saveColumnsPreference();
  }

  exportarCsv(): void {
    const headers = ['Matrícula', 'Funcionário', 'Apelido', 'CPF', 'Loja', 'Cargo', 'Comissão %', 'Situação', 'Cadastro'];
    const body = this.funcionariosFiltrados.map(f => [
      f.matricula || '',
      f.nomefuncionario,
      f.apelido || '',
      this.formatCpf(f.cpf),
      f.loja_nome || this.lojaNome((f as any).idloja) || '',
      f.cargo_nome || '',
      f.comissao_percentual || 0,
      f.situacao_descricao || f.situacao || '',
      this.formatDate(f.data_cadastro),
    ]);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'funcionarios.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.exportOpen = false;
  }

  formatCpf(value?: string | null): string {
    const d = (value || '').replace(/\D/g, '').slice(0, 11);
    if (d.length !== 11) return value || '-';
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }

  formatMoney(value: number | string | null | undefined): string {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  percentual(valor: number): string {
    const total = this.indicadores.total || 0;
    if (!total) return '0% do total';
    return `${((valor / total) * 100).toFixed(0)}% do total`;
  }

  private normalize(value: string): string {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  trackFuncionario(_: number, funcionario: Funcionario): number | string {
    return funcionario.id ?? funcionario.cpf ?? funcionario.nomefuncionario;
  }

  cancelarEdicao(): void {
    this.showForm = false;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.errorOverlayOpen = false;
    this.form.enable({ emitEvent: false });
  }

  salvar(): void {
    this.submitted = true;
    const cargo = this.cargoSelecionado();
    if (cargo?.autoridade_operacional_loja && !this.form.value.idloja) {
      const current = this.form.get('idloja')?.errors || {};
      this.form.get('idloja')?.setErrors({ ...current, required: true });
    }
    if (this.form.invalid) {
      this.openErrorOverlayIfNeeded();
      return;
    }

    // normalizações simples
    const raw = this.form.getRawValue();
    const payload: Funcionario = {
      ...raw,
      comissao_percentual: raw.comissao_percentual === '' || raw.comissao_percentual === null ? 0 : Number(raw.comissao_percentual),
      salario: raw.salario === '' || raw.salario === null ? 0 : Number(raw.salario),
      idloja: raw.idloja === '' ? null : raw.idloja,
      inicio: raw.inicio ? raw.inicio : null as any,
      fim: raw.fim ? raw.fim : null as any,
      cpf: raw.cpf ? String(raw.cpf) : null as any,
      data_nascimento: raw.data_nascimento || null,
      usuario: raw.usuario === '' ? null : raw.usuario,
    };
    if (!this.podeVerSalario) {
      delete payload.salario;
    }
    if (this.editingId) {
      delete payload.situacao;
      delete payload.ativo;
      delete payload.fim;
    }

    this.saving = true;
    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId ? 'Alterações salvas.' : 'Funcionário criado.';
        this.cancelarEdicao();
        this.page = 1;
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.successMsg = '';
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

  excluir(item: Funcionario): void {
    if (!this.podeExcluirModulo) return;
    const id = (item as any).id;
    if (!id) return;
    this.excluirModal = item;
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const item = this.excluirModal;
    const id = item ? (item as any).id : null;
    if (!id) return;
    this.api.remove(id).subscribe({
      next: () => {
        this.excluirModal = null;
        this.successMsg = 'Funcionário excluído.';
        const eraUltimo = this.funcionarios.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: (err) => { this.errorMsg = err?.error?.detail || 'Falha ao excluir.'; }
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  // Overlay de erros
  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const P = (c: boolean, m: string) => { if (c) msgs.push(m); };

    P(f.get('nomefuncionario')?.hasError('required') || false, 'Nome é obrigatório.');
    P(f.get('nomefuncionario')?.hasError('maxlength') || false, 'Nome: máx. 50 caracteres.');
    P(f.get('apelido')?.hasError('maxlength') || false, 'Apelido: máx. 20 caracteres.');
    P(f.get('cpf')?.hasError('required') || false, 'CPF é obrigatório.');
    P(f.get('cpf')?.hasError('cpf') || false, 'CPF inválido.');
    P(f.get('cargo')?.hasError('required') || false, 'Cargo é obrigatório.');
    P(f.get('idloja')?.hasError('required') || false, 'Loja é obrigatória para este cargo.');

    ['matricula','nomefuncionario','apelido','cpf','inicio','fim','cargo','situacao','participa_vendas','comissionado','comissao_percentual','salario','idloja','lojas_supervisionadas','usuario','telefone','whatsapp','email','data_nascimento','endereco','observacoes']
      .forEach(field => {
        const err = f.get(field)?.errors?.['server'];
        if (err) msgs.push(`${field}: ${err}`);
      });

    return msgs;
  }

  openErrorOverlayIfNeeded(): void {
    this.errorOverlayOpen = this.getFormErrors().length > 0;
  }
  closeErrorOverlay(): void { this.errorOverlayOpen = false; }

  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.funcionarios.pageSize'));
    if ([10, 20, 50, 100].includes(size)) this.pageSize = size;
    const raw = localStorage.getItem(this.columnsStorageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Record<string, boolean>;
      this.columns = this.columns.map(c => c.required ? c : { ...c, visible: saved[c.key] ?? c.visible });
    } catch {
      return;
    }
  }

  private saveColumnsPreference(): void {
    const state = Object.fromEntries(this.columns.map(c => [c.key, c.visible]));
    localStorage.setItem(this.columnsStorageKey, JSON.stringify(state));
  }

  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey);
    if (!raw) return;
    try {
      const pref = JSON.parse(raw) as { indicatorsVisible?: boolean; filtersVisible?: boolean };
      this.indicatorsVisible = pref.indicatorsVisible !== false;
      this.filtersVisible = pref.filtersVisible !== false;
    } catch {
      return;
    }
  }

  private saveViewPreference(): void {
    localStorage.setItem(this.viewPrefsKey, JSON.stringify({
      indicatorsVisible: this.indicatorsVisible,
      filtersVisible: this.filtersVisible,
    }));
  }

  cargoSelecionado(): Cargo | undefined {
    return this.cargosOptions.find(c => Number(c.id) === Number(this.form.get('cargo')?.value));
  }

  showAbrangencia(): boolean {
    return !!this.cargoSelecionado()?.permite_multiplas_lojas;
  }

  executarCiclo(id: number, action: 'afastar' | 'retornar' | 'desligar' | 'recontratar'): void {
    this.api.acao(id, action).subscribe({
      next: () => { this.successMsg = 'Situação atualizada.'; this.load(); },
      error: (err) => { this.errorMsg = err?.error?.detail || 'Falha ao atualizar situação.'; }
    });
  }

  executarCicloSelecionado(action: 'afastar' | 'retornar' | 'desligar' | 'recontratar'): void {
    const id = this.selectedFuncionario?.id;
    if (!id) return;
    this.executarCiclo(id, action);
  }

  private loadIndicadores(): void {
    this.api.indicadores().subscribe({
      next: (res: any) => this.indicadores = {
        total: res?.total ?? 0,
        ativos: res?.ativos ?? 0,
        afastados: res?.afastados ?? 0,
        desligados: res?.desligados ?? 0,
        participantes_vendas: res?.participantes_vendas ?? 0,
      },
      error: () => this.indicadores = { total: 0, ativos: 0, afastados: 0, desligados: 0, participantes_vendas: 0 },
    });
  }
}
