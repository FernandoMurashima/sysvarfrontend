import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';

import { Cliente } from '../../core/models/clientes';
import { Fornecedor } from '../../core/models/fornecedor';
import { Loja } from '../../core/models/loja';
import { NatLancamento } from '../../core/models/natureza-lancamento';
import { ParcelaFinanceira, TipoTituloFinanceiro, TituloFinanceiro } from '../../core/models/financeiro-titulo';
import { ClientesService } from '../../core/services/clientes.service';
import { FinanceiroTitulosService } from '../../core/services/financeiro-titulos.service';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { LojasService } from '../../core/services/lojas.service';
import { NatLancamentosService } from '../../core/services/natureza-lancamento.service';
import { FormaPagamento } from '../../core/models/forma-pagamento';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-financeiro-titulos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './financeiro-titulos.component.html',
  styleUrls: ['./financeiro-titulos.component.css']
})
export class FinanceiroTitulosComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private api = inject(FinanceiroTitulosService);
  private lojasApi = inject(LojasService);
  private fornecedoresApi = inject(FornecedoresService);
  private clientesApi = inject(ClientesService);
  private naturezaApi = inject(NatLancamentosService);
  private formasApi = inject(FormasPagamentoService);
  private auth = inject(AuthService);
  private sub?: Subscription;

  tipo: TipoTituloFinanceiro = 'pagar';
  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  search = '';
  filterLoja = '';
  filterStatus = '';
  filterEmissaoIni = '';
  filterEmissaoFim = '';
  filterVencimentoIni = '';
  filterVencimentoFim = '';
  advancedOpen = false;
  columnsOpen = false;
  exportOpen = false;
  indicatorsVisible = true;
  filtersVisible = true;
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  selectedLinha: { titulo: TituloFinanceiro; parcela: ParcelaFinanceira } | null = null;
  columns = [
    { key: 'parceiro', label: 'Parceiro', visible: true, required: false },
    { key: 'loja', label: 'Loja', visible: true, required: false },
    { key: 'emissao', label: 'Emissão', visible: true, required: false },
    { key: 'total', label: 'Total', visible: true, required: false },
    { key: 'forma', label: 'Forma', visible: true, required: false },
    { key: 'vencimento', label: 'Vencimento', visible: true, required: false },
    { key: 'valor', label: 'Valor', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false }
  ];
  private readonly columnsStorageKeyBase = 'sysvar.list.financeiro-titulos.columns';
  private readonly viewPrefsKeyBase = 'sysvar.ui.preferences.financeiro-titulos';
  successMsg = '';
  errorMsg = '';

  titulos: TituloFinanceiro[] = [];
  lojas: Loja[] = [];
  fornecedores: Fornecedor[] = [];
  clientes: Cliente[] = [];
  naturezas: NatLancamento[] = [];
  formas: FormaPagamento[] = [];
  baixaModal: {
    parcela: ParcelaFinanceira;
    valor_base: number;
    valor_baixa: number;
    data_baixa: string;
    juros: number;
    multa: number;
    tarifa: number;
    desconto: number;
  } | null = null;
  cancelarModal: ParcelaFinanceira | null = null;
  reabrirModal: { titulo: TituloFinanceiro; parcela: ParcelaFinanceira } | null = null;
  detalheModal: TituloFinanceiro | null = null;
  excluirModal: TituloFinanceiro | null = null;

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('financeiro', true) !== false;
  }

  get searchSuggestions(): string[] {
    const valores = [
      ...this.titulos.flatMap(t => [
        t.Titulo,
        t.Documento,
        this.parceiroNome(t),
        t.idloja ? this.lojaNome(t.idloja) : ''
      ]),
      ...this.fornecedores.flatMap(f => [
        f.nome_fornecedor,
        f.apelido,
        f.cnpj
      ]),
      ...this.clientes.flatMap(c => [
        c.nome_cliente,
        c.apelido,
        c.cpf,
        c.email
      ])
    ].filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  form: FormGroup = this.fb.group({
    idloja: [null, Validators.required],
    parceiro: [null, Validators.required],
    Titulo: ['', [Validators.required, Validators.maxLength(60)]],
    Documento: [''],
    Data_emissao: [this.today(), Validators.required],
    Valor_total: [0, [Validators.required, Validators.min(0.01)]],
    Previsao: [false],
    FormaPagamento: [''],
    Idnatureza: [null, Validators.required],
    conta_contabil: [''],
    parcelas: this.fb.array([])
  });

  get parcelasFA(): FormArray {
    return this.form.get('parcelas') as FormArray;
  }

  get tituloPagina(): string {
    return this.tipo === 'pagar' ? 'Contas a Pagar' : 'Contas a Receber';
  }

  get parceiroLabel(): string {
    return this.tipo === 'pagar' ? 'Fornecedor' : 'Cliente';
  }

  get linhasFiltradas(): Array<{ titulo: TituloFinanceiro; parcela: ParcelaFinanceira }> {
    const q = this.normalize(this.search);
    return this.titulos
      .flatMap(titulo => (titulo.itens || []).map(parcela => ({ titulo, parcela })))
      .filter(row => {
        const lojaOk = !this.filterLoja || String(row.titulo.idloja) === this.filterLoja;
        const statusOk = !this.filterStatus || row.parcela.status === this.filterStatus;
        const emissao = String(row.titulo.Data_emissao || '');
        const vencimento = String(row.parcela.Data_vencimento || '');
        const emissaoOk = (!this.filterEmissaoIni || emissao >= this.filterEmissaoIni) &&
          (!this.filterEmissaoFim || emissao <= this.filterEmissaoFim);
        const vencimentoOk = (!this.filterVencimentoIni || vencimento >= this.filterVencimentoIni) &&
          (!this.filterVencimentoFim || vencimento <= this.filterVencimentoFim);
        const buscaOk = !q || [
          row.titulo.Titulo,
          row.titulo.Documento,
          this.parceiroNome(row.titulo),
          this.lojaNome(row.titulo.idloja),
          row.parcela.FormaPagamento,
          this.parcelaTitulo(row.titulo, row.parcela)
        ].some(value => this.normalize(value).includes(q));
        return lojaOk && statusOk && emissaoOk && vencimentoOk && buscaOk;
      });
  }

  get linhasPaginadas(): Array<{ titulo: TituloFinanceiro; parcela: ParcelaFinanceira }> {
    const start = (this.page - 1) * this.pageSize;
    return this.linhasFiltradas.slice(start, start + this.pageSize);
  }

  get totalFiltrado(): number {
    return this.linhasFiltradas.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalFiltrado / this.pageSize));
  }

  get pageStart(): number {
    return this.totalFiltrado ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalFiltrado);
  }

  get indicadores() {
    const linhas = this.titulos.flatMap(t => t.itens || []);
    return {
      total: this.titulos.length,
      parcelas: linhas.length,
      abertas: linhas.filter(p => p.status === 'PREVISTO' || p.status === 'EFETIVO').length,
      baixadas: linhas.filter(p => p.status === 'BAIXADO').length,
      vencidas: linhas.filter(p => this.parcelaVencida(p)).length
    };
  }

  ngOnInit(): void {
    this.loadAuxiliares();
    this.sub = this.route.data.subscribe(data => {
      this.tipo = (data['tipo'] as TipoTituloFinanceiro) || 'pagar';
      this.loadViewPreference();
      this.loadColumnPreference();
      this.cancelar();
      this.selectedLinha = null;
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  loadAuxiliares(): void {
    forkJoin({
      lojas: this.lojasApi.list({ page_size: 500 }),
      fornecedores: this.fornecedoresApi.list({ page_size: 500, ordering: 'nome_fornecedor' }),
      clientes: this.clientesApi.list({ page_size: 500, ordering: 'nome_cliente' }),
      naturezas: this.naturezaApi.list({ page_size: 500, ordering: 'codigo' }),
      formas: this.formasApi.list({ ativo: true })
    }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.fornecedores = this.unwrap<Fornecedor>(res.fornecedores);
        this.clientes = this.unwrap<Cliente>(res.clientes);
        this.naturezas = this.unwrap<NatLancamento>(res.naturezas).filter(n => n.ativo !== false);
        this.formas = this.unwrap<FormaPagamento>(res.formas);
      },
      error: () => {
        this.errorMsg = 'Falha ao carregar cadastros auxiliares.';
      }
    });
  }

  load(): void {
    this.loading = true;
    this.api.list(this.tipo).subscribe({
      next: res => {
        this.titulos = this.unwrap<TituloFinanceiro>(res);
        this.page = 1;
        this.selectedLinha = null;
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => {
        this.titulos = [];
        this.loading = false;
        this.errorMsg = `Falha ao carregar ${this.tituloPagina.toLowerCase()}.`;
      }
    });
  }

  novo(): void {
    this.showForm = true;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.reset({
      idloja: this.lojas[0]?.id ?? null,
      parceiro: null,
      Titulo: '',
      Documento: '',
      Data_emissao: this.today(),
      Valor_total: 0,
      Previsao: false,
      FormaPagamento: '',
      Idnatureza: this.naturezasTitulo[0]?.idnatureza ?? null,
      conta_contabil: ''
    });
    this.clearParcelas();
    this.addParcela();
  }

  cancelar(): void {
    this.showForm = false;
    this.submitted = false;
    this.clearParcelas();
  }

  addParcela(): void {
    this.parcelasFA.push(this.fb.group({
      parcela_n: [this.parcelasFA.length + 1, [Validators.required, Validators.min(1)]],
      Data_vencimento: [this.today(), Validators.required],
      valor_parcela: [0, [Validators.required, Validators.min(0.01)]]
    }));
  }

  removeParcela(index: number): void {
    this.parcelasFA.removeAt(index);
    this.parcelasFA.controls.forEach((ctrl, i) => ctrl.get('parcela_n')?.setValue(i + 1));
  }

  gerarParcelas(qtd: number): void {
    const total = Number(this.form.get('Valor_total')?.value || 0);
    const emissao = String(this.form.get('Data_emissao')?.value || this.today());
    if (!qtd || qtd < 1 || total <= 0) return;
    this.clearParcelas();
    const base = Math.floor((total / qtd) * 100) / 100;
    let acumulado = 0;
    for (let i = 1; i <= qtd; i++) {
      const valor = i === qtd ? Number((total - acumulado).toFixed(2)) : base;
      acumulado = Number((acumulado + valor).toFixed(2));
      this.parcelasFA.push(this.fb.group({
        parcela_n: [i, [Validators.required, Validators.min(1)]],
        Data_vencimento: [this.addDays(emissao, i === 1 ? 0 : 30 * (i - 1)), Validators.required],
        valor_parcela: [valor, [Validators.required, Validators.min(0.01)]]
      }));
    }
  }

  salvar(): void {
    this.submitted = true;
    if (this.form.invalid || this.parcelasFA.length === 0) {
      this.errorMsg = 'Revise os campos obrigatórios antes de salvar.';
      return;
    }

    const raw = this.form.value as Record<string, any>;
    const payload: Partial<TituloFinanceiro> = {
      idloja: Number(raw['idloja']),
      Titulo: String(raw['Titulo']).trim(),
      Documento: this.blankToNull(raw['Documento']),
      Data_emissao: String(raw['Data_emissao']),
      Valor_total: Number(raw['Valor_total']),
      Previsao: !!raw['Previsao'],
      FormaPagamento: this.blankToNull(raw['FormaPagamento']),
      Idnatureza: Number(raw['Idnatureza']),
      conta_contabil: this.blankToNull(raw['conta_contabil'])
    };

    if (this.tipo === 'pagar') {
      payload.idfornecedor = Number(raw['parceiro']);
    } else {
      payload.idcliente = Number(raw['parceiro']);
    }

    this.saving = true;
    this.api.create(this.tipo, payload).subscribe({
      next: created => this.salvarParcelas(created),
      error: () => {
        this.saving = false;
        this.errorMsg = 'Falha ao salvar o título.';
      }
    });
  }

  baixar(parcela: ParcelaFinanceira): void {
    const id = this.parcelaId(parcela);
    if (!id) return;
    const valorAtual = Number(parcela.valor_parcela || 0);
    this.baixaModal = {
      parcela,
      valor_base: valorAtual,
      valor_baixa: valorAtual,
      data_baixa: this.today(),
      juros: Number(parcela.juros || 0),
      multa: Number(parcela.multa || 0),
      tarifa: Number(parcela.tarifa || 0),
      desconto: Number(parcela.desconto || 0)
    };
  }

  recalcularBaixa(): void {
    if (!this.baixaModal) return;
    const base = Number(this.baixaModal.valor_base || 0);
    const juros = Number(this.baixaModal.juros || 0);
    const multa = Number(this.baixaModal.multa || 0);
    const tarifa = this.tipo === 'pagar' ? Number(this.baixaModal.tarifa || 0) : 0;
    const desconto = Number(this.baixaModal.desconto || 0);
    this.baixaModal.valor_baixa = Number((base + juros + multa + tarifa - desconto).toFixed(2));
  }

  confirmarBaixa(): void {
    const id = this.baixaModal ? this.parcelaId(this.baixaModal.parcela) : null;
    if (!id) return;
    const valor = Number(this.baixaModal?.valor_baixa || 0);
    if (valor <= 0) return;
    this.api.baixarParcela(this.tipo, id, {
      valor_baixa: valor,
      data_baixa: String(this.baixaModal?.data_baixa || this.today()),
      juros: Number(this.baixaModal?.juros || 0),
      multa: Number(this.baixaModal?.multa || 0),
      tarifa: this.tipo === 'pagar' ? Number(this.baixaModal?.tarifa || 0) : 0,
      desconto: Number(this.baixaModal?.desconto || 0)
    }).subscribe({
      next: () => {
        this.successMsg = 'Parcela baixada.';
        this.baixaModal = null;
        this.load();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao baixar parcela.')
    });
  }

  fecharBaixa(): void {
    this.baixaModal = null;
  }

  cancelarParcela(parcela: ParcelaFinanceira): void {
    const id = this.parcelaId(parcela);
    if (!id) return;
    this.cancelarModal = parcela;
  }

  confirmarCancelamentoParcela(): void {
    const id = this.cancelarModal ? this.parcelaId(this.cancelarModal) : null;
    if (!id) return;
    this.api.cancelarParcela(this.tipo, id, 'Cancelado pela tela financeira').subscribe({
      next: () => {
        this.successMsg = 'Parcela cancelada.';
        this.cancelarModal = null;
        this.load();
      },
      error: () => this.errorMsg = 'Falha ao cancelar parcela.'
    });
  }

  fecharCancelamentoParcela(): void {
    this.cancelarModal = null;
  }

  reabrirParcela(parcela: ParcelaFinanceira): void {
    const row = this.selectedLinha;
    if (!row || this.parcelaId(row.parcela) !== this.parcelaId(parcela)) return;
    this.reabrirModal = row;
  }

  confirmarReaberturaParcela(): void {
    const parcela = this.reabrirModal?.parcela;
    if (!parcela) return;
    const id = this.parcelaId(parcela);
    if (!id) return;
    this.api.reabrirParcela(this.tipo, id, 'Reaberto pela tela financeira').subscribe({
      next: () => {
        this.successMsg = 'Parcela reaberta.';
        this.reabrirModal = null;
        this.load();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao reabrir parcela.')
    });
  }

  fecharReaberturaParcela(): void {
    this.reabrirModal = null;
  }

  abrirDetalheTitulo(titulo: TituloFinanceiro): void {
    this.detalheModal = titulo;
  }

  fecharDetalheTitulo(): void {
    this.detalheModal = null;
  }

  excluir(titulo: TituloFinanceiro): void {
    const id = this.tituloId(titulo);
    if (!id) return;
    this.excluirModal = titulo;
  }

  confirmarExclusaoTitulo(): void {
    const id = this.excluirModal ? this.tituloId(this.excluirModal) : null;
    if (!id) return;
    this.api.remove(this.tipo, id).subscribe({
      next: () => {
        this.successMsg = 'Título excluído.';
        this.excluirModal = null;
        this.load();
      },
      error: () => this.errorMsg = 'Falha ao excluir título.'
    });
  }

  fecharExclusaoTitulo(): void {
    this.excluirModal = null;
  }

  doSearch(): void {
    this.page = 1;
  }

  clearSearch(): void {
    this.search = '';
    this.filterLoja = '';
    this.filterStatus = '';
    this.filterEmissaoIni = '';
    this.filterEmissaoFim = '';
    this.filterVencimentoIni = '';
    this.filterVencimentoFim = '';
    this.page = 1;
  }

  selecionarLinha(row: { titulo: TituloFinanceiro; parcela: ParcelaFinanceira }): void {
    this.selectedLinha = this.isSelected(row) ? null : row;
  }

  isSelected(row: { titulo: TituloFinanceiro; parcela: ParcelaFinanceira }): boolean {
    return !!this.selectedLinha && this.rowKey(this.selectedLinha) === this.rowKey(row);
  }

  baixarSelecionada(): void {
    if (this.selectedLinha) this.baixar(this.selectedLinha.parcela);
  }

  cancelarSelecionada(): void {
    if (this.selectedLinha) this.cancelarParcela(this.selectedLinha.parcela);
  }

  reabrirSelecionada(): void {
    if (this.selectedLinha) this.reabrirParcela(this.selectedLinha.parcela);
  }

  detalharSelecionado(): void {
    if (this.selectedLinha) this.abrirDetalheTitulo(this.selectedLinha.titulo);
  }

  excluirSelecionado(): void {
    if (this.selectedLinha) this.excluir(this.selectedLinha.titulo);
  }

  visibleColumn(key: string): boolean {
    return this.columns.find(c => c.key === key)?.visible !== false;
  }

  toggleColumn(key: string, visible: boolean): void {
    const col = this.columns.find(c => c.key === key);
    if (!col || col.required) return;
    col.visible = visible;
    this.saveColumnPreference();
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value) || 20;
    this.page = 1;
  }

  firstPage(): void { this.page = 1; }
  prevPage(): void { this.page = Math.max(1, this.page - 1); }
  nextPage(): void { this.page = Math.min(this.totalPages, this.page + 1); }
  lastPage(): void { this.page = this.totalPages; }

  @HostListener('window:sysvar-financeiro-receber-toggle-indicators')
  @HostListener('window:sysvar-financeiro-pagar-toggle-indicators')
  onToggleIndicatorsEvent(): void { this.toggleIndicators(); }

  @HostListener('window:sysvar-financeiro-receber-toggle-filters')
  @HostListener('window:sysvar-financeiro-pagar-toggle-filters')
  onToggleFiltersEvent(): void { this.toggleFilters(); }

  @HostListener('window:sysvar-financeiro-receber-restore-view')
  @HostListener('window:sysvar-financeiro-pagar-restore-view')
  onRestoreViewEvent(): void { this.restoreViewPreference(); }

  tituloId(titulo: TituloFinanceiro): number | null {
    return this.tipo === 'pagar' ? (titulo.Idpagar ?? null) : (titulo.Idreceber ?? null);
  }

  parcelaId(parcela: ParcelaFinanceira): number | null {
    return this.tipo === 'pagar' ? (parcela.Idpagaritem ?? null) : (parcela.Idreceberitem ?? null);
  }

  parceiroNome(titulo: TituloFinanceiro): string {
    if (this.tipo === 'pagar') {
      const fornecedor = this.fornecedores.find(f => f.id === titulo.idfornecedor);
      return fornecedor?.nome_fornecedor || `Fornecedor #${titulo.idfornecedor ?? ''}`;
    }
    const cliente = this.clientes.find(c => c.id === titulo.idcliente);
    return cliente?.nome_cliente || `Cliente #${titulo.idcliente ?? ''}`;
  }

  lojaNome(id: number): string {
    return this.lojas.find(l => l.id === id)?.nome_loja || `Loja #${id}`;
  }

  parcelaTitulo(titulo: TituloFinanceiro, parcela: ParcelaFinanceira): string {
    const base = this.tituloBase(titulo);
    return `${base}-${parcela.parcela_n || 1}`;
  }

  tituloBase(titulo: TituloFinanceiro): string {
    const documento = (titulo.Documento || '').trim();
    if (documento) {
      const partes = documento.split('/').filter(Boolean);
      return partes[partes.length - 1] || documento;
    }

    const tituloTexto = (titulo.Titulo || '').trim();
    const match = tituloTexto.match(/^(.+)-\d+$/);
    return match?.[1] || tituloTexto || String(this.tituloId(titulo) || '');
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  podeReabrirParcela(parcela: ParcelaFinanceira | null | undefined): boolean {
    return !!parcela && parcela.status === 'BAIXADO';
  }

  divergenciaTitulo(titulo: TituloFinanceiro | null | undefined): boolean {
    return this.tipo === 'pagar' && !!titulo?.alerta_divergencia_mercadoria;
  }

  valorDivergenciaTitulo(titulo: TituloFinanceiro | null | undefined): number {
    return Number(titulo?.valor_divergencia_mercadoria || 0);
  }

  rowKey(row: { titulo: TituloFinanceiro; parcela: ParcelaFinanceira }): string {
    return `${this.tituloId(row.titulo) || 0}-${this.parcelaId(row.parcela) || row.parcela.parcela_n}`;
  }

  get naturezasTitulo(): NatLancamento[] {
    const operacoes = this.tipo === 'pagar' ? ['DESPESA', 'AJUSTE'] : ['RECEITA', 'AJUSTE'];
    return this.naturezas
      .filter(n => operacoes.includes(String(n.natureza_operacao || '').toUpperCase()))
      .sort((a, b) => `${a.codigo || ''} ${a.descricao || ''}`.localeCompare(`${b.codigo || ''} ${b.descricao || ''}`));
  }

  naturezaId(natureza: NatLancamento): number | null {
    return natureza.idnatureza ? Number(natureza.idnatureza) : null;
  }

  onParceiroChange(): void {
    if (this.tipo !== 'pagar') return;
    const fornecedorId = Number(this.form.get('parceiro')?.value || 0);
    const fornecedor = this.fornecedores.find(f => Number(f.id) === fornecedorId);
    const textoFornecedor = `${fornecedor?.categoria || ''} ${fornecedor?.nome_fornecedor || ''} ${fornecedor?.apelido || ''}`.toLowerCase();
    if (!textoFornecedor.includes('aluguel')) return;
    const aluguel = this.naturezasTitulo.find(n =>
      String(n.codigo || '') === '3201' || String(n.descricao || '').toLowerCase().includes('aluguel')
    );
    if (aluguel?.idnatureza) {
      this.form.patchValue({ Idnatureza: Number(aluguel.idnatureza) });
    }
  }

  private salvarParcelas(created: TituloFinanceiro): void {
    const tituloId = this.tituloId(created);
    if (!tituloId) {
      this.saving = false;
      this.errorMsg = 'Título salvo, mas não foi possível criar as parcelas.';
      return;
    }

    const raw = this.form.value as Record<string, any>;
    const parcelas = this.parcelasFA.controls.map(ctrl => {
      const value = ctrl.value as Record<string, any>;
      const payload: Partial<ParcelaFinanceira> = {
        parcela_n: Number(value['parcela_n']),
        Data_vencimento: String(value['Data_vencimento']),
        valor_parcela: Number(value['valor_parcela']),
        FormaPagamento: this.blankToNull(raw['FormaPagamento']),
        Previsao: !!raw['Previsao'],
        Idnatureza: Number(raw['Idnatureza']),
        status: raw['Previsao'] ? 'PREVISTO' : 'EFETIVO'
      };
      if (this.tipo === 'pagar') {
        payload.Idpagar = tituloId;
      } else {
        payload.Idreceber = tituloId;
      }
      return this.api.createParcela(this.tipo, payload);
    });

    forkJoin(parcelas).subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Título salvo com parcelas.';
        this.cancelar();
        this.load();
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Título salvo, mas houve falha ao criar parcelas.';
      }
    });
  }

  private clearParcelas(): void {
    while (this.parcelasFA.length) {
      this.parcelasFA.removeAt(0);
    }
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }

  private blankToNull(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text ? text : null;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private addDays(dateText: string, days: number): string {
    const date = new Date(`${dateText}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private parcelaVencida(parcela: ParcelaFinanceira): boolean {
    if (parcela.status === 'BAIXADO' || parcela.status === 'CANCELADO') return false;
    return String(parcela.Data_vencimento || '') < this.today();
  }

  private normalize(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private errorText(err: any, fallback: string): string {
    const data = err?.error;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    return String(first || fallback);
  }

  private toggleIndicators(): void {
    this.indicatorsVisible = !this.indicatorsVisible;
    this.saveViewPreference();
  }

  private toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
    this.saveViewPreference();
  }

  private restoreViewPreference(): void {
    this.indicatorsVisible = true;
    this.filtersVisible = true;
    this.columns.forEach(col => col.visible = true);
    localStorage.removeItem(this.viewPrefsKey());
    localStorage.removeItem(this.columnsStorageKey());
  }

  private viewPrefsKey(): string {
    return `${this.viewPrefsKeyBase}.${this.tipo}`;
  }

  private columnsStorageKey(): string {
    return `${this.columnsStorageKeyBase}.${this.tipo}`;
  }

  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey());
    if (!raw) return;
    try {
      const prefs = JSON.parse(raw);
      this.indicatorsVisible = prefs.indicatorsVisible !== false;
      this.filtersVisible = prefs.filtersVisible !== false;
    } catch {}
  }

  private saveViewPreference(): void {
    localStorage.setItem(this.viewPrefsKey(), JSON.stringify({
      indicatorsVisible: this.indicatorsVisible,
      filtersVisible: this.filtersVisible
    }));
  }

  private loadColumnPreference(): void {
    const raw = localStorage.getItem(this.columnsStorageKey());
    if (!raw) return;
    try {
      const state = JSON.parse(raw) as Record<string, boolean>;
      this.columns.forEach(col => {
        if (!col.required && state[col.key] !== undefined) col.visible = state[col.key];
      });
    } catch {}
  }

  private saveColumnPreference(): void {
    const state = Object.fromEntries(this.columns.map(col => [col.key, col.visible]));
    localStorage.setItem(this.columnsStorageKey(), JSON.stringify(state));
  }
}
