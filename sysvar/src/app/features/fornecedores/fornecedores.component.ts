import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import {
  Fornecedor,
  FornecedorCategoria,
  FornecedorContato,
  FornecedorEndereco,
  FornecedorHistoricoItem,
} from '../../core/models/fornecedor';
import { PrazoPagamento } from '../../core/models/forma-pagamento';
import { NatLancamento } from '../../core/models/natureza-lancamento';
import { PlanoContabil } from '../../core/models/plano-contabil';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { NatLancamentosService } from '../../core/services/natureza-lancamento.service';
import { PlanoContabilService } from '../../core/services/plano-contabil.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

type ConsultaTab = 'dados' | 'compras' | 'financeiro' | 'historico';

@Component({
  selector: 'app-fornecedores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './fornecedores.component.html',
  styleUrls: ['./fornecedores.component.css']
})
export class FornecedoresComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(FornecedoresService);
  private auth = inject(AuthService);
  private prazosApi = inject(FormasPagamentoService);
  private planoApi = inject(PlanoContabilService);
  private naturezaApi = inject(NatLancamentosService);

  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;
  consultando = false;
  successMsg = '';
  errorMsg = '';

  search = '';
  filterCategoria = '';
  filterCidade = '';
  filterStatus = '';
  filterEstado = '';
  filterDocumento = '';
  filterTipoPessoa = '';
  advancedOpen = false;
  indicatorsVisible = true;
  filtersVisible = true;
  columnsOpen = false;
  exportOpen = false;

  selectedFornecedor: Fornecedor | null = null;
  excluirModal: Fornecedor | null = null;
  bloqueioModal = false;
  desbloqueioModal = false;
  duplicateModal = false;
  duplicateCandidates: Fornecedor[] = [];
  pendingPayload: Fornecedor | null = null;

  fornecedores: Fornecedor[] = [];
  indicadores = {
    total: 0,
    ativos: 0,
    inativos: 0,
    bloqueados: 0,
    pessoas_fisicas: 0,
    pessoas_juridicas: 0,
    sem_documento: 0,
    com_compras: 0,
    saldo_a_pagar: '0.00',
  };
  searchSuggestions: string[] = [];
  cidadesOptions: string[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;
  ordering = 'nome_fornecedor';

  activeTab: ConsultaTab = 'dados';
  consultaFornecedor: Fornecedor | null = null;
  consultaLoading = false;
  comprasRows: any[] = [];
  financeiroRows: any[] = [];
  historicoRows: FornecedorHistoricoItem[] = [];
  comprasPage = 1;
  comprasTotal = 0;
  financeiroPage = 1;
  financeiroTotal = 0;
  historicoPage = 1;
  historicoTotal = 0;
  detailPageSize = 10;
  contatoEditingId: number | null = null;
  enderecoEditingId: number | null = null;

  readonly columnsStorageKey = 'sysvar.list.fornecedores.columns';
  readonly viewPrefsKey = 'sysvar.ui.preferences.fornecedores';
  columns = [
    { key: 'apelido', label: 'Apelido', visible: true, required: false },
    { key: 'categoria', label: 'Categoria', visible: true, required: false },
    { key: 'documento', label: 'Documento', visible: true, required: false },
    { key: 'cidade', label: 'Cidade/UF', visible: true, required: false },
    { key: 'email', label: 'E-mail', visible: true, required: false },
    { key: 'telefone', label: 'Telefone', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];

  form: FormGroup = this.fb.group({
    tipo_pessoa: ['PJ'],
    documento: ['', [this.documentoValidator.bind(this)]],
    nome_fornecedor: ['', [Validators.required, Validators.maxLength(50)]],
    apelido: ['', [Validators.maxLength(18)]],
    email: ['', [Validators.email]],
    telefone1: ['', [this.phoneValidator]],
    telefone2: ['', [this.phoneValidator]],
    mala_direta: [false],
    inscricao_estadual: [''],
    inscricao_municipal: [''],
    contribuinte_icms: [''],
    site: [''],
    prazo_padrao_pagamento: [null],
    prazo_padrao_pagamento_ref: [null],
    observacoes_comerciais: [''],
    conta_contabil: [''],
    conta_contabil_padrao: [null],
    natureza_padrao: [null],
    banco: [''],
    agencia: [''],
    conta: [''],
    tipo_conta: [''],
    chave_pix: [''],
    favorecido: [''],
    documento_favorecido: [''],
    observacao_bancaria: [''],
  });

  contatoForm: FormGroup = this.fb.group({
    id: [null],
    nome: ['', Validators.required],
    cargo_funcao: [''],
    tipo: ['COMERCIAL'],
    telefone: ['', [this.phoneValidator]],
    whatsapp: ['', [this.phoneValidator]],
    email: ['', [Validators.email]],
    observacao: [''],
    principal: [false],
  });

  enderecoForm: FormGroup = this.fb.group({
    id: [null],
    tipo: ['FISCAL'],
    logradouro: ['Rua'],
    endereco: ['', Validators.required],
    numero: [''],
    complemento: [''],
    cep: [''],
    bairro: [''],
    cidade: [''],
    estado: [''],
    principal: [false],
    observacao: [''],
  });

  bloqueioForm: FormGroup = this.fb.group({
    motivo: ['', Validators.required],
    observacao: [''],
  });

  categoriasSelecionadas = new Set<FornecedorCategoria>();
  categoriaOptions: { value: FornecedorCategoria; label: string }[] = [
    { value: 'MATERIA_PRIMA', label: 'Matéria-prima' },
    { value: 'AVIAMENTO', label: 'Aviamento' },
    { value: 'REVENDA', label: 'Produto de revenda' },
    { value: 'FACCAO', label: 'Facção' },
    { value: 'PRESTADOR', label: 'Prestador de serviço' },
    { value: 'TRANSPORTADORA', label: 'Transportadora' },
    { value: 'OUTROS', label: 'Outros' },
  ];
  contatoTipoOptions = [
    ['COMERCIAL', 'Comercial'],
    ['FINANCEIRO', 'Financeiro'],
    ['FISCAL', 'Fiscal'],
    ['PRODUCAO_FACCAO', 'Produção/Facção'],
    ['LOGISTICA', 'Logística'],
    ['OUTRO', 'Outro'],
  ];
  enderecoTipoOptions = [
    ['FISCAL', 'Fiscal'],
    ['COMERCIAL', 'Comercial'],
    ['COBRANCA', 'Cobrança'],
    ['RETIRADA_COLETA', 'Retirada/Coleta'],
    ['ENTREGA', 'Entrega'],
    ['UNIDADE_FABRIL', 'Unidade fabril'],
    ['OUTRO', 'Outro'],
  ];
  logradouroOptions = ['Rua', 'Avenida', 'Travessa', 'Alameda', 'Praça', 'Rodovia', 'Estrada', 'Largo', 'Viela'];
  contribuinteIcmsOptions = [
    { value: '', label: 'Não informado' },
    { value: 'SIM', label: 'Sim' },
    { value: 'NAO', label: 'Não' },
    { value: 'ISENTO', label: 'Isento' },
  ];
  tipoContaOptions = [
    { value: '', label: 'Não informado' },
    { value: 'CORRENTE', label: 'Conta corrente' },
    { value: 'POUPANCA', label: 'Conta poupança' },
    { value: 'PAGAMENTO', label: 'Conta de pagamento' },
    { value: 'OUTRA', label: 'Outra' },
  ];
  prazosPagamento: PrazoPagamento[] = [];
  planoContabil: PlanoContabil[] = [];
  naturezas: NatLancamento[] = [];

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('cadastros', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('cadastros');
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get pageStart(): number {
    return this.total ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadViewPreference();
    this.loadLookups();
    this.load();
    this.loadIndicadores();
  }

  loadLookups(): void {
    forkJoin({
      prazos: this.prazosApi.listPrazos({ ativo: true }),
      plano: this.planoApi.list({ ativa: true, analitica: true, page_size: 50 }),
      naturezas: this.naturezaApi.list({ ativo: true, movimenta_financeiro: true, page_size: 50 }),
    }).subscribe({
      next: res => {
        this.prazosPagamento = this.unwrap<PrazoPagamento>(res.prazos)
          .filter(p => p.ativo !== false)
          .sort((a, b) => this.prazoLabel(a).localeCompare(this.prazoLabel(b), 'pt-BR'));
        this.planoContabil = this.unwrap<PlanoContabil>(res.plano)
          .filter(conta => conta.ativa !== false && conta.analitica !== false)
          .sort((a, b) => `${a.codigo || ''}`.localeCompare(`${b.codigo || ''}`, 'pt-BR'));
        this.naturezas = this.unwrap<NatLancamento>(res.naturezas)
          .filter(n => n.ativo !== false)
          .sort((a, b) => this.naturezaLabel(a).localeCompare(this.naturezaLabel(b), 'pt-BR'));
      },
      error: () => {
        this.errorMsg = 'Falha ao carregar prazos, contas contábeis ou naturezas.';
      }
    });
  }

  load(): void {
    this.loading = true;
    this.api.list(this.listParams()).subscribe({
      next: res => {
        this.fornecedores = res.results || [];
        this.total = res.count || 0;
        this.loading = false;
        this.errorMsg = '';
        this.refreshLocalHints();
        if (this.selectedFornecedor && !this.fornecedores.some(f => f.id === this.selectedFornecedor?.id)) {
          this.selectedFornecedor = null;
        }
      },
      error: err => {
        this.loading = false;
        this.fornecedores = [];
        this.total = 0;
        this.errorMsg = this.extractApiMessage(err, 'Falha ao carregar fornecedores.');
      }
    });
  }

  loadIndicadores(): void {
    this.api.indicadores().subscribe({
      next: data => this.indicadores = { ...this.indicadores, ...(data as any) },
      error: () => this.indicadores = { ...this.indicadores },
    });
  }

  private listParams(): any {
    const params: any = {
      page: this.page,
      page_size: this.pageSize,
      ordering: this.ordering,
    };
    if (this.search.trim()) params.search = this.search.trim();
    if (this.filterCategoria) params.categoria = this.filterCategoria;
    if (this.filterCidade.trim()) params.cidade = this.filterCidade.trim();
    if (this.filterEstado.trim()) params.estado = this.filterEstado.trim().toUpperCase();
    if (this.filterDocumento.trim()) params.documento = this.onlyDigits(this.filterDocumento);
    if (this.filterTipoPessoa) params.tipo_pessoa = this.filterTipoPessoa;
    if (this.filterStatus === 'ATIVO') params.ativo = true;
    if (this.filterStatus === 'INATIVO') params.ativo = false;
    if (this.filterStatus === 'BLOQUEADO') params.bloqueio = true;
    return params;
  }

  private refreshLocalHints(): void {
    this.searchSuggestions = this.fornecedores.flatMap(f => [
      f.nome_fornecedor,
      f.apelido,
      f.documento || f.cnpj,
      f.email,
      this.cidadePrincipal(f),
      this.estadoPrincipal(f),
      ...this.categoriasFornecedor(f).map(c => this.categoriaLabel(c)),
    ].filter((v): v is string => !!v));
    this.cidadesOptions = Array.from(new Set(this.fornecedores.map(f => (this.cidadePrincipal(f) || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  doSearch(): void {
    this.page = 1;
    this.load();
    this.loadIndicadores();
  }

  clearSearch(): void {
    this.search = '';
    this.filterCategoria = '';
    this.filterCidade = '';
    this.filterStatus = '';
    this.filterEstado = '';
    this.filterDocumento = '';
    this.filterTipoPessoa = '';
    this.page = 1;
    this.load();
    this.loadIndicadores();
  }

  onPageSizeChange(sizeStr: string): void {
    const size = Number(sizeStr) || 20;
    this.pageSize = size;
    localStorage.setItem('sysvar.list.fornecedores.pageSize', String(size));
    this.page = 1;
    this.load();
  }

  firstPage(): void { if (this.page !== 1) { this.page = 1; this.load(); } }
  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.load(); } }
  lastPage(): void { if (this.page !== this.totalPages) { this.page = this.totalPages; this.load(); } }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.consultaFornecedor = null;
    this.selectedFornecedor = null;
    this.form.enable({ emitEvent: false });
    this.resetForms();
  }

  editar(row: Fornecedor): void {
    const id = row.id;
    if (!id) return;
    this.showForm = true;
    this.editingId = id;
    this.consultando = false;
    this.submitted = false;
    this.activeTab = 'dados';
    this.form.enable({ emitEvent: false });
    this.carregarFornecedor(id);
  }

  consultar(row: Fornecedor): void {
    const id = row.id;
    if (!id) return;
    this.showForm = true;
    this.editingId = id;
    this.consultando = true;
    this.submitted = false;
    this.activeTab = 'dados';
    this.form.disable({ emitEvent: false });
    this.carregarFornecedor(id);
  }

  private carregarFornecedor(id: number): void {
    this.consultaLoading = true;
    this.api.get(id).pipe(
      switchMap(fornecedor => forkJoin({
        fornecedor: of(fornecedor),
        contatos: this.api.contatos(id),
        enderecos: this.api.enderecos(id),
      }))
    ).subscribe({
      next: ({ fornecedor, contatos, enderecos }) => {
        fornecedor.contatos = contatos;
        fornecedor.enderecos = enderecos;
        this.consultaFornecedor = fornecedor;
        this.selectedFornecedor = fornecedor;
        this.patchFornecedorForm(fornecedor);
        this.consultaLoading = false;
        if (this.consultando) this.loadConsultaTab('dados');
      },
      error: err => {
        this.consultaLoading = false;
        this.errorMsg = this.extractApiMessage(err, 'Falha ao carregar fornecedor.');
      }
    });
  }

  private patchFornecedorForm(row: Fornecedor): void {
    this.form.reset({
      tipo_pessoa: row.tipo_pessoa ?? 'PJ',
      documento: row.documento ?? row.cnpj ?? '',
      nome_fornecedor: row.nome_fornecedor ?? '',
      apelido: row.apelido ?? '',
      email: row.email ?? '',
      telefone1: this.formatPhone(row.telefone1 ?? ''),
      telefone2: this.formatPhone(row.telefone2 ?? ''),
      mala_direta: !!row.mala_direta,
      inscricao_estadual: row.inscricao_estadual ?? '',
      inscricao_municipal: row.inscricao_municipal ?? '',
      contribuinte_icms: row.contribuinte_icms ?? '',
      site: row.site ?? '',
      prazo_padrao_pagamento: row.prazo_padrao_pagamento ?? null,
      prazo_padrao_pagamento_ref: row.prazo_padrao_pagamento_ref ?? row.prazo_padrao_pagamento ?? null,
      observacoes_comerciais: row.observacoes_comerciais ?? '',
      conta_contabil: row.conta_contabil ?? '',
      conta_contabil_padrao: row.conta_contabil_padrao ?? null,
      natureza_padrao: row.natureza_padrao ?? null,
      banco: row.banco ?? '',
      agencia: row.agencia ?? '',
      conta: row.conta ?? '',
      tipo_conta: row.tipo_conta ?? '',
      chave_pix: row.chave_pix ?? '',
      favorecido: row.favorecido ?? '',
      documento_favorecido: row.documento_favorecido ?? '',
      observacao_bancaria: row.observacao_bancaria ?? '',
    });
    this.categoriasSelecionadas = new Set(this.categoriasFornecedor(row));
    if (row.dados_bancarios_ocultos) {
      ['banco', 'agencia', 'conta', 'tipo_conta', 'chave_pix', 'favorecido', 'documento_favorecido', 'observacao_bancaria'].forEach(field => this.form.get(field)?.disable({ emitEvent: false }));
    }
  }

  private resetForms(): void {
    this.form.reset({
      tipo_pessoa: 'PJ',
      documento: '',
      nome_fornecedor: '',
      apelido: '',
      email: '',
      telefone1: '',
      telefone2: '',
      mala_direta: false,
      contribuinte_icms: '',
      prazo_padrao_pagamento: null,
      prazo_padrao_pagamento_ref: null,
      conta_contabil: '',
      conta_contabil_padrao: null,
      natureza_padrao: null,
      tipo_conta: '',
    });
    this.form.enable({ emitEvent: false });
    this.categoriasSelecionadas.clear();
    this.contatoForm.reset({ tipo: 'COMERCIAL', principal: false });
    this.enderecoForm.reset({ tipo: 'FISCAL', logradouro: 'Rua', principal: false });
  }

  salvar(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    const payload = this.buildPayload();
    if (!this.editingId) {
      this.api.possiveisDuplicados({ nome: payload.nome_fornecedor }).subscribe({
        next: duplicados => {
          if (duplicados.length) {
            this.pendingPayload = payload;
            this.duplicateCandidates = duplicados;
            this.duplicateModal = true;
          } else {
            this.persistir(payload);
          }
        },
        error: () => this.persistir(payload),
      });
      return;
    }
    this.persistir(payload);
  }

  continuarMesmoDuplicado(): void {
    const payload = this.pendingPayload;
    this.duplicateModal = false;
    this.pendingPayload = null;
    if (payload) this.persistir(payload);
  }

  cancelarDuplicidade(): void {
    this.duplicateModal = false;
    this.pendingPayload = null;
  }

  private persistir(payload: Fornecedor): void {
    this.saving = true;
    const req$ = this.editingId ? this.api.update(this.editingId, payload) : this.api.create(payload);
    req$.subscribe({
      next: fornecedor => {
        this.saving = false;
        this.successMsg = this.editingId ? 'Alterações salvas com sucesso.' : 'Fornecedor criado com sucesso.';
        this.errorMsg = '';
        this.showForm = false;
        this.editingId = null;
        this.consultando = false;
        this.selectedFornecedor = fornecedor;
        this.load();
        this.loadIndicadores();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = this.extractApiMessage(err, 'Falha ao salvar fornecedor.');
        this.applyServerErrors(err);
      }
    });
  }

  private buildPayload(): Fornecedor {
    const raw = this.form.getRawValue();
    const documento = this.onlyDigits(raw.documento);
    const categorias = Array.from(this.categoriasSelecionadas);
    const payload: any = {
      ...raw,
      documento: documento || null,
      cnpj: raw.tipo_pessoa === 'PJ' && documento ? documento : null,
      categorias,
      telefone1: this.onlyDigits(raw.telefone1),
      telefone2: this.onlyDigits(raw.telefone2),
      contribuinte_icms: raw.contribuinte_icms || null,
      prazo_padrao_pagamento_ref: raw.prazo_padrao_pagamento_ref || null,
      conta_contabil_padrao: raw.conta_contabil_padrao || null,
      natureza_padrao: raw.natureza_padrao || null,
      tipo_conta: raw.tipo_conta || null,
    };
    delete payload.prazo_padrao_pagamento;
    delete payload.conta_contabil;
    if (this.consultaFornecedor?.dados_bancarios_ocultos) {
      ['banco', 'agencia', 'conta', 'tipo_conta', 'chave_pix', 'favorecido', 'documento_favorecido', 'observacao_bancaria'].forEach(field => delete payload[field]);
    }
    return payload;
  }

  salvarContato(): void {
    const fornecedorId = this.editingId;
    if (!fornecedorId || this.consultando) return;
    if (this.contatoForm.invalid) {
      this.contatoForm.markAllAsTouched();
      this.errorMsg = this.getContatoFormErrors().join(' ');
      return;
    }
    const raw = this.contatoForm.value;
    const payload: FornecedorContato = {
      ...raw,
      telefone: this.onlyDigits(raw.telefone),
      whatsapp: this.onlyDigits(raw.whatsapp),
    };
    const id = raw.id;
    const req$ = id ? this.api.atualizarContato(fornecedorId, id, payload) : this.api.criarContato(fornecedorId, payload);
    req$.subscribe({
      next: () => {
        this.successMsg = 'Contato salvo com sucesso.';
        this.errorMsg = '';
        this.limparContatoForm();
        this.carregarFornecedor(fornecedorId);
      },
      error: err => this.errorMsg = this.extractApiMessage(err, 'Falha ao salvar contato.'),
    });
  }

  editarContato(contato: FornecedorContato): void {
    if (this.consultando) return;
    this.contatoEditingId = contato.id ?? null;
    this.contatoForm.reset({ ...contato, telefone: this.formatPhone(contato.telefone || ''), whatsapp: this.formatPhone(contato.whatsapp || '') });
  }

  limparContatoForm(): void {
    this.contatoEditingId = null;
    this.contatoForm.reset({ tipo: 'COMERCIAL', principal: false });
  }

  toggleContato(contato: FornecedorContato): void {
    const fornecedorId = this.editingId;
    if (!fornecedorId || !contato.id || this.consultando) return;
    const req$ = contato.ativo === false ? this.api.reativarContato(fornecedorId, contato.id) : this.api.inativarContato(fornecedorId, contato.id);
    req$.subscribe({
      next: () => {
        this.successMsg = contato.ativo === false ? 'Contato reativado.' : 'Contato inativado.';
        this.errorMsg = '';
        this.carregarFornecedor(fornecedorId);
      },
      error: err => this.errorMsg = this.extractApiMessage(err, 'Falha ao alterar contato.')
    });
  }

  salvarEndereco(): void {
    const fornecedorId = this.editingId;
    if (!fornecedorId || this.enderecoForm.invalid || this.consultando) return;
    const raw = this.enderecoForm.value;
    const payload: FornecedorEndereco = { ...raw, cep: this.onlyDigits(raw.cep), estado: (raw.estado || '').toUpperCase() };
    const id = raw.id;
    const req$ = id ? this.api.atualizarEndereco(fornecedorId, id, payload) : this.api.criarEndereco(fornecedorId, payload);
    req$.subscribe({
      next: () => {
        this.successMsg = 'Endereço salvo com sucesso.';
        this.errorMsg = '';
        this.limparEnderecoForm();
        this.carregarFornecedor(fornecedorId);
        this.load();
      },
      error: err => this.errorMsg = this.extractApiMessage(err, 'Falha ao salvar endereço.'),
    });
  }

  editarEndereco(endereco: FornecedorEndereco): void {
    if (this.consultando) return;
    this.enderecoEditingId = endereco.id ?? null;
    this.enderecoForm.reset(endereco);
  }

  limparEnderecoForm(): void {
    this.enderecoEditingId = null;
    this.enderecoForm.reset({ tipo: 'FISCAL', logradouro: 'Rua', principal: false });
  }

  toggleEndereco(endereco: FornecedorEndereco): void {
    const fornecedorId = this.editingId;
    if (!fornecedorId || !endereco.id || this.consultando) return;
    const req$ = endereco.ativo === false ? this.api.reativarEndereco(fornecedorId, endereco.id) : this.api.inativarEndereco(fornecedorId, endereco.id);
    req$.subscribe({
      next: () => {
        this.successMsg = endereco.ativo === false ? 'Endereço reativado.' : 'Endereço inativado.';
        this.errorMsg = '';
        this.carregarFornecedor(fornecedorId);
      },
      error: err => this.errorMsg = this.extractApiMessage(err, 'Falha ao alterar endereço.')
    });
  }

  selecionarTab(tab: ConsultaTab): void {
    this.activeTab = tab;
    this.loadConsultaTab(tab);
  }

  loadConsultaTab(tab: ConsultaTab): void {
    const id = this.editingId;
    if (!id) return;
    if (tab === 'compras') {
      this.api.compras(id, { page: this.comprasPage, page_size: this.detailPageSize }).subscribe(res => {
        this.comprasRows = res.results || [];
        this.comprasTotal = res.count || 0;
      });
    }
    if (tab === 'financeiro') {
      this.api.financeiro(id, { page: this.financeiroPage, page_size: this.detailPageSize }).subscribe(res => {
        this.financeiroRows = res.results || [];
        this.financeiroTotal = res.count || 0;
      });
    }
    if (tab === 'historico') {
      this.api.historico(id, { page: this.historicoPage, page_size: this.detailPageSize }).subscribe(res => {
        this.historicoRows = res.results || [];
        this.historicoTotal = res.count || 0;
      });
    }
  }

  ativarSelecionado(): void {
    const id = this.selectedFornecedor?.id;
    if (!id || !this.podeEditarModulo) return;
    this.api.ativar(id).subscribe({ next: f => this.afterLifecycle(f, 'Fornecedor ativado.'), error: err => this.errorMsg = this.extractApiMessage(err, 'Falha ao ativar fornecedor.') });
  }

  inativarSelecionado(): void {
    const id = this.selectedFornecedor?.id;
    if (!id || !this.podeEditarModulo) return;
    this.api.inativar(id).subscribe({ next: f => this.afterLifecycle(f, 'Fornecedor inativado.'), error: err => this.errorMsg = this.extractApiMessage(err, 'Falha ao inativar fornecedor.') });
  }

  abrirBloqueio(): void {
    this.bloqueioForm.reset({ motivo: '', observacao: '' });
    this.bloqueioModal = !!this.selectedFornecedor?.id && this.podeEditarModulo;
  }

  confirmarBloqueio(): void {
    const id = this.selectedFornecedor?.id;
    if (!id || this.bloqueioForm.invalid) return;
    this.api.bloquear(id, this.bloqueioForm.value).subscribe({
      next: f => {
        this.bloqueioModal = false;
        this.afterLifecycle(f, 'Fornecedor bloqueado.');
      },
      error: err => this.errorMsg = this.extractApiMessage(err, 'Falha ao bloquear fornecedor.'),
    });
  }

  abrirDesbloqueio(): void {
    this.desbloqueioModal = !!this.selectedFornecedor?.id && this.podeEditarModulo;
  }

  confirmarDesbloqueio(): void {
    const id = this.selectedFornecedor?.id;
    if (!id) return;
    this.api.desbloquear(id).subscribe({
      next: f => {
        this.desbloqueioModal = false;
        this.afterLifecycle(f, 'Fornecedor desbloqueado.');
      },
      error: err => this.errorMsg = this.extractApiMessage(err, 'Falha ao desbloquear fornecedor.'),
    });
  }

  private afterLifecycle(fornecedor: Fornecedor, message: string): void {
    this.successMsg = message;
    this.errorMsg = '';
    this.selectedFornecedor = fornecedor;
    this.load();
    this.loadIndicadores();
    if (this.editingId === fornecedor.id) this.carregarFornecedor(fornecedor.id!);
  }

  excluir(item: Fornecedor): void {
    if (this.podeExcluirModulo && item.id) this.excluirModal = item;
  }

  confirmarExclusao(): void {
    const id = this.excluirModal?.id;
    if (!id || !this.podeExcluirModulo) return;
    this.api.remove(id).subscribe({
      next: () => {
        this.excluirModal = null;
        this.successMsg = 'Fornecedor excluído.';
        this.load();
        this.loadIndicadores();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: err => {
        this.errorMsg = this.extractApiMessage(err, 'Falha ao excluir.');
        this.excluirModal = null;
      }
    });
  }

  selecionarFornecedor(row: Fornecedor): void {
    this.selectedFornecedor = this.isSelected(row) ? null : row;
  }

  isSelected(row: Fornecedor): boolean {
    return !!this.selectedFornecedor && this.selectedFornecedor.id === row.id;
  }

  consultarSelecionado(): void { if (this.selectedFornecedor) this.consultar(this.selectedFornecedor); }
  editarSelecionado(): void { if (this.selectedFornecedor && this.podeEditarModulo) this.editar(this.selectedFornecedor); }
  excluirSelecionado(): void { if (this.selectedFornecedor) this.excluir(this.selectedFornecedor); }
  fecharExclusao(): void { this.excluirModal = null; }
  cancelarEdicao(): void { this.showForm = false; this.editingId = null; this.consultando = false; this.form.enable({ emitEvent: false }); }

  toggleCategoria(categoria: FornecedorCategoria, checked: boolean): void {
    if (checked) this.categoriasSelecionadas.add(categoria);
    else this.categoriasSelecionadas.delete(categoria);
  }

  categoriaSelecionada(categoria: FornecedorCategoria): boolean {
    return this.categoriasSelecionadas.has(categoria);
  }

  categoriasFornecedor(f: Fornecedor): FornecedorCategoria[] {
    const categorias = f.categorias_lista?.length ? f.categorias_lista : (f.categorias?.length ? f.categorias : (f.categoria ? [f.categoria as FornecedorCategoria] : []));
    return categorias as FornecedorCategoria[];
  }

  categoriaLabel(value?: string | null): string {
    if (!value) return '';
    return this.categoriaOptions.find(opt => opt.value === value)?.label || value;
  }

  categoriasLabel(f: Fornecedor): string {
    return this.categoriasFornecedor(f).map(c => this.categoriaLabel(c)).filter(Boolean).join(', ');
  }

  tipoContatoLabel(value?: string | null): string { return this.contatoTipoOptions.find(opt => opt[0] === value)?.[1] || value || ''; }
  tipoEnderecoLabel(value?: string | null): string { return this.enderecoTipoOptions.find(opt => opt[0] === value)?.[1] || value || ''; }
  contribuinteIcmsLabel(value?: string | null): string { return this.contribuinteIcmsOptions.find(opt => opt.value === (value || ''))?.label || value || 'Não informado'; }
  tipoContaLabel(value?: string | null): string { return this.tipoContaOptions.find(opt => opt.value === (value || ''))?.label || value || 'Não informado'; }
  prazoId(prazo: PrazoPagamento | null | undefined): number | null { return prazo ? (prazo.Idprazo ?? prazo.id ?? null) : null; }
  prazoLabel(prazo: PrazoPagamento): string { return [prazo.codigo, prazo.descricao].filter(Boolean).join(' - '); }
  contaContabilLabel(conta: PlanoContabil): string { return [conta.codigo, conta.descricao].filter(Boolean).join(' - '); }
  naturezaLabel(natureza: NatLancamento): string { return [natureza.codigo, natureza.descricao].filter(Boolean).join(' - '); }
  fornecedorPrazoLabel(f: Fornecedor): string { return f.prazo_padrao_descricao || this.prazosPagamento.find(p => this.prazoId(p) === f.prazo_padrao_pagamento_ref)?.descricao || '-'; }
  fornecedorContaContabilLabel(f: Fornecedor): string {
    if (f.conta_contabil_codigo || f.conta_contabil_descricao) return [f.conta_contabil_codigo, f.conta_contabil_descricao].filter(Boolean).join(' - ');
    return this.planoContabil.find(c => c.id === f.conta_contabil_padrao) ? this.contaContabilLabel(this.planoContabil.find(c => c.id === f.conta_contabil_padrao)!) : '-';
  }
  fornecedorNaturezaLabel(f: Fornecedor): string {
    if (f.natureza_padrao_codigo || f.natureza_padrao_descricao) return [f.natureza_padrao_codigo, f.natureza_padrao_descricao].filter(Boolean).join(' - ');
    return this.naturezas.find(n => n.idnatureza === f.natureza_padrao) ? this.naturezaLabel(this.naturezas.find(n => n.idnatureza === f.natureza_padrao)!) : '-';
  }
  private enderecoPrincipal(f: Fornecedor): FornecedorEndereco | undefined {
    const enderecos = f.enderecos || [];
    return enderecos.find(e => e.ativo !== false && e.principal)
      || enderecos.find(e => e.ativo !== false)
      || enderecos[0];
  }

  private cidadePrincipal(f: Fornecedor): string {
    return (f.cidade || this.enderecoPrincipal(f)?.cidade || '').trim();
  }

  private estadoPrincipal(f: Fornecedor): string {
    return (f.estado || this.enderecoPrincipal(f)?.estado || '').trim().toUpperCase();
  }

  cidadeUf(f: Fornecedor): string { return [this.cidadePrincipal(f), this.estadoPrincipal(f)].filter(Boolean).join('/') || '-'; }
  statusLabel(f: Fornecedor): string { return f.bloqueio ? 'Bloqueado' : (f.ativo === false ? 'Inativo' : 'Ativo'); }
  visibleColumn(key: string): boolean { return this.columns.find(c => c.key === key)?.visible !== false; }
  trackFornecedor(_: number, f: Fornecedor): number | string { return f.id ?? f.documento ?? f.nome_fornecedor; }
  trackById(_: number, row: any): number | string { return row.id ?? row.Idpagaritem ?? row.titulo_id ?? row.nome ?? row.endereco; }

  private unwrap<T>(res: T[] | { results?: T[] } | any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }

  formatPhone(value?: string | null): string {
    const d = this.onlyDigits(value).slice(0, 11);
    if (d.length <= 2) return d;
    const ddd = d.slice(0, 2);
    const number = d.slice(2);
    if (d.length < 10) return `(${ddd}) ${number}`;
    return d.length === 10 ? `(${ddd}) ${d.slice(2, 6)}-${d.slice(6)}` : `(${ddd}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  onPhoneInput(field: 'telefone1' | 'telefone2'): void {
    const ctrl = this.form.get(field);
    ctrl?.setValue(this.formatPhone(ctrl.value), { emitEvent: false });
  }

  onContatoPhoneInput(field: 'telefone' | 'whatsapp'): void {
    const ctrl = this.contatoForm.get(field);
    ctrl?.setValue(this.formatPhone(ctrl.value), { emitEvent: false });
  }

  formatDocumento(value?: string | null, tipo?: string | null): string {
    const d = this.onlyDigits(value);
    if (!d) return '-';
    if (tipo === 'PF' || d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
    if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
    return value || '-';
  }

  money(value: any): string {
    const n = Number(value || 0);
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  documentoValidator(ctrl: AbstractControl): ValidationErrors | null {
    const digits = this.onlyDigits(ctrl.value);
    if (!digits) return null;
    const tipo = this.form?.get('tipo_pessoa')?.value || 'PJ';
    if (tipo === 'PF') {
      if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return { cpf: true };
      const calc = (base: string, factor: number) => {
        let total = 0;
        for (let i = 0; i < base.length; i++) total += Number(base[i]) * (factor - i);
        const rest = (total * 10) % 11;
        return rest === 10 ? 0 : rest;
      };
      return calc(digits.slice(0, 9), 10) === Number(digits[9]) && calc(digits.slice(0, 10), 11) === Number(digits[10]) ? null : { cpf: true };
    }
    return this.cnpjValidator(ctrl);
  }

  cnpjValidator(ctrl: AbstractControl): ValidationErrors | null {
    const digits = this.onlyDigits(ctrl.value);
    if (!digits) return null;
    if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return { cnpj: true };
    const calc = (base: string, factors: number[]) => {
      const sum = base.split('').map((n, i) => parseInt(n, 10) * factors[i]).reduce((a, b) => a + b, 0);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };
    const base12 = digits.slice(0, 12);
    const d1 = calc(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = calc(base12 + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return digits === base12 + d1 + d2 ? null : { cnpj: true };
  }

  phoneValidator(ctrl: AbstractControl): ValidationErrors | null {
    const digits = (ctrl.value ?? '').toString().replace(/\D/g, '');
    if (!digits) return null;
    return digits.length === 10 || digits.length === 11 ? null : { phone: true };
  }

  getContatoFormErrors(): string[] {
    const msgs: string[] = [];
    if (this.contatoForm.get('nome')?.hasError('required')) msgs.push('Nome do contato é obrigatório.');
    if (this.contatoForm.get('telefone')?.hasError('phone')) msgs.push('Telefone inválido. Informe DDD + telefone com 10 ou 11 dígitos.');
    if (this.contatoForm.get('whatsapp')?.hasError('phone')) msgs.push('WhatsApp inválido. Informe DDD + telefone com 10 ou 11 dígitos.');
    return msgs;
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    if (this.form.get('nome_fornecedor')?.hasError('required')) msgs.push('Nome do fornecedor é obrigatório.');
    if (this.form.get('documento')?.hasError('cpf')) msgs.push('CPF inválido.');
    if (this.form.get('documento')?.hasError('cnpj')) msgs.push('CNPJ inválido.');
    Object.keys(this.form.controls).forEach(field => {
      const err = this.form.get(field)?.errors?.['server'];
      if (err) msgs.push(`${field}: ${err}`);
    });
    return msgs;
  }

  private applyServerErrors(err: any): void {
    const error = err?.error;
    if (!error || typeof error !== 'object') return;
    Object.keys(error).forEach(field => {
      const ctrl = this.form.get(field);
      if (ctrl) ctrl.setErrors({ ...(ctrl.errors || {}), server: Array.isArray(error[field]) ? error[field].join(' ') : String(error[field]) });
    });
  }

  private extractApiMessage(err: any, fallback: string): string {
    const error = err?.error;
    if (typeof error === 'string') return error;
    if (error?.detail) return Array.isArray(error.detail) ? error.detail.join(' ') : String(error.detail);
    if (error?.message) return String(error.message);
    if (error && typeof error === 'object') {
      const firstKey = Object.keys(error)[0];
      const value = firstKey ? error[firstKey] : null;
      if (Array.isArray(value)) return value.join(' ');
      if (value) return String(value);
    }
    return fallback;
  }

  exportarCsv(): void {
    const headers = ['Fornecedor', 'Apelido', 'Categorias', 'Documento', 'Cidade/UF', 'Email', 'Telefone', 'Status'];
    const body = this.fornecedores.map(f => [
      f.nome_fornecedor,
      f.apelido || '',
      this.categoriasLabel(f),
      this.formatDocumento(f.documento || f.cnpj, f.tipo_pessoa),
      this.cidadeUf(f),
      f.email || '',
      this.formatPhone(f.telefone1 || ''),
      this.statusLabel(f),
    ]);
    const csv = [headers, ...body].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fornecedores.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.exportOpen = false;
  }

  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; this.saveViewPreference(); }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; this.saveViewPreference(); }
  toggleColumn(key: string, checked: boolean): void {
    const col = this.columns.find(c => c.key === key);
    if (!col || col.required) return;
    col.visible = checked;
    this.saveColumnsPreference();
  }

  restoreViewPreference(): void {
    localStorage.removeItem(this.viewPrefsKey);
    localStorage.removeItem('sysvar.list.fornecedores.pageSize');
    this.indicatorsVisible = true;
    this.filtersVisible = true;
    this.pageSize = 20;
    this.columns = this.columns.map(c => ({ ...c, visible: true }));
    this.saveColumnsPreference();
    this.load();
  }

  @HostListener('window:sysvar-fornecedores-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-fornecedores-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-fornecedores-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.fornecedores.pageSize'));
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
    localStorage.setItem(this.columnsStorageKey, JSON.stringify(Object.fromEntries(this.columns.map(c => [c.key, c.visible]))));
  }

  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey);
    if (!raw) return;
    try {
      const pref = JSON.parse(raw) as { indicatorsVisible?: boolean; filtersVisible?: boolean };
      this.indicatorsVisible = pref.indicatorsVisible ?? true;
      this.filtersVisible = pref.filtersVisible ?? true;
    } catch {
      return;
    }
  }

  private saveViewPreference(): void {
    localStorage.setItem(this.viewPrefsKey, JSON.stringify({ indicatorsVisible: this.indicatorsVisible, filtersVisible: this.filtersVisible }));
  }
}
