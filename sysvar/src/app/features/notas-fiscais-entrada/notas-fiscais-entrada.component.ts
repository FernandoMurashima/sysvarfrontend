import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { FornecedoresService } from '../../core/services/fornecedores.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { LojasService } from '../../core/services/lojas.service';
import { NotaFiscalEntradaIndicadores, NotaFiscalEntradaListParams, NotasFiscaisEntradaService } from '../../core/services/notas-fiscais-entrada.service';
import { PedidoCompra, PedidosCompraService } from '../../core/services/pedidos-compra.service';
import {
  NotaFiscalEntrada,
  NotaFiscalEntradaAnaliseCancelamento,
  NotaFiscalEntradaCobrancaFinanceira,
  NotaFiscalEntradaDivergenciaXml,
  NotaFiscalEntradaItemXml,
  NotaFiscalEntradaPedidoItem,
  NotaFiscalEntradaProdutoCandidato,
  NotaFiscalEntradaResumoConferencia,
  NotaFiscalEntradaResumoConciliacao,
} from '../../core/models/nota-fiscal-entrada';
import { FormaPagamento } from '../../core/models/forma-pagamento';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';

type Option = { id: number; label: string };
type RowAction = { key: string; label: string; icon?: string; disabled?: boolean; visible?: boolean; danger?: boolean; dividerBefore?: boolean };

type ItemRecebimentoUI = NotaFiscalEntradaPedidoItem & {
  qtd_receber: number;
  preco_unit_nf: number;
  desconto_item: number;
  total_item: number;
  confirmado: boolean;
};

type ItemXmlUI = NotaFiscalEntradaItemXml & {
  recebidoInput: number | null;
  salvando?: boolean;
};

@Component({
  selector: 'app-notas-fiscais-entrada',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent, SummaryCardComponent],
  templateUrl: './notas-fiscais-entrada.component.html',
  styleUrls: ['./notas-fiscais-entrada.component.css'],
})
export class NotasFiscaisEntradaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private notasApi = inject(NotasFiscaisEntradaService);
  private pedidosApi = inject(PedidosCompraService);
  private formasPagamentoApi = inject(FormasPagamentoService);
  private lojasApi = inject(LojasService);
  private fornecedoresApi = inject(FornecedoresService);

  view = signal<'list' | 'form'>('list');
  notaAtual = signal<NotaFiscalEntrada | null>(null);
  loading = false;
  saving = false;
  submitted = false;
  mensagem = '';
  erro = '';
  indicatorsVisible = true;
  filtersVisible = true;
  advancedFiltersOpen = false;
  selectedNota: NotaFiscalEntrada | null = null;
  private readonly viewPrefsKey = 'sysvar.ui.preferences.notas-entrada';
  confirmModal: {
    action: 'removerItem' | 'fecharNota' | 'cancelarNota';
    title: string;
    text: string;
    item?: ItemRecebimentoUI;
  } | null = null;
  importModalAberto = false;
  importArquivo: File | null = null;
  importPedido: number | null = null;
  importandoXml = false;
  efetivarModalAberto = false;
  cancelarModalAberto = false;
  cancelamentoAnalise: NotaFiscalEntradaAnaliseCancelamento | null = null;
  motivoCancelamento = '';
  confirmacaoAvisosCancelamento = false;
  analisandoCancelamento = false;
  cancelandoNota = false;

  search = '';
  filtroStatus = '';
  filtroFornecedor: number | null = null;
  filtroLoja: number | null = null;
  filtroEmissaoDe = '';
  filtroEmissaoAte = '';
  filtroEntradaDe = '';
  filtroEntradaAte = '';
  filtroValorMin: number | null = null;
  filtroValorMax: number | null = null;
  notas: NotaFiscalEntrada[] = [];
  notasFiltradas: NotaFiscalEntrada[] = [];
  notasPagina: NotaFiscalEntrada[] = [];
  totalRecords = 0;
  indicadores: NotaFiscalEntradaIndicadores = {
    total: 0,
    abertas: 0,
    fechadas: 0,
    canceladas: 0,
    valor_total: '0.00',
  };

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];

  pedidosAprovados: PedidoCompra[] = [];
  lojas: Option[] = [];
  fornecedores: Option[] = [];
  private lojaMap = new Map<number, string>();
  private fornecedorMap = new Map<number, string>();

  itensPedido: ItemRecebimentoUI[] = [];
  selectedItem: ItemRecebimentoUI | null = null;
  loadingItens = false;
  itensXml: ItemXmlUI[] = [];
  resumoConciliacao: NotaFiscalEntradaResumoConciliacao | null = null;
  resumoConferencia: NotaFiscalEntradaResumoConferencia | null = null;
  divergenciasXml: NotaFiscalEntradaDivergenciaXml[] = [];
  loadingXml = false;
  cobrancaFinanceira: NotaFiscalEntradaCobrancaFinanceira | null = null;
  formasPagamento: FormaPagamento[] = [];
  formaPagamentoModal: { codigoTpag: string; descricaoTpag: string; selecionado: number | null; loading: boolean; saving: boolean } | null = null;
  conciliandoAuto = false;
  conferindoLote = false;
  conciliacaoModal: { item: ItemXmlUI; termo: string; candidatos: NotaFiscalEntradaProdutoCandidato[]; selecionado: number | null; loading: boolean; saving: boolean } | null = null;

  form: FormGroup = this.fb.group({
    pedido_compra: [null],
    modelo: ['55', [Validators.required, Validators.maxLength(2)]],
    serie: [''],
    numero: ['', Validators.required],
    chave_acesso: [''],
    dt_emissao: [this.hojeISO(), Validators.required],
    dt_entrada: [this.hojeISO(), Validators.required],
    valor_frete: [0, [Validators.min(0)]],
    observacoes: [''],
  });

  get total(): number {
    return this.totalRecords;
  }

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
    return this.notasPagina.flatMap(n => [
      String(n.pedido_compra ?? ''),
      n.numero,
      n.serie,
      n.chave_acesso,
      this.statusLabel(n.status),
    ].filter(Boolean));
  }
  get abertas(): number {
    return this.indicadores.abertas;
  }
  get fechadas(): number {
    return this.indicadores.fechadas;
  }
  get canceladas(): number {
    return this.indicadores.canceladas;
  }
  get valorTotalListado(): number {
    return Number(this.indicadores.valor_total || 0);
  }
  get pedidoSelecionado(): PedidoCompra | null {
    const pedidoId = Number(this.form.get('pedido_compra')?.value || 0);
    return this.pedidosAprovados.find(p => p.id === pedidoId) || null;
  }

  ngOnInit(): void {
    this.loadViewPreference();
    this.loadLookups();
    this.loadPedidosAprovados();
    this.loadNotas();
  }

  private hojeISO(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private arrayOrResults<T>(data: any): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && Array.isArray(data.results)) return data.results as T[];
    return [];
  }

  private loadLookups(): void {
    this.lojasApi.list({ ordering: 'nome_loja', page_size: 2000 }).subscribe({
      next: (resp: any) => {
        this.lojas = this.arrayOrResults<any>(resp).map((l: any) => {
          const id = Number(l.id ?? l.Idloja);
          const nome = String(l.nome_loja ?? l.Nome ?? '');
          this.lojaMap.set(id, nome);
          return { id, label: `${id} - ${nome}` };
        }).filter(l => !!l.id);
      },
    });

    this.fornecedoresApi.list({ ordering: 'nome_fornecedor', page_size: 2000 }).subscribe({
      next: (resp: any) => {
        this.fornecedores = this.arrayOrResults<any>(resp).map((f: any) => {
          const id = Number(f.id ?? f.Idfornecedor);
          const nome = String(f.nome_fornecedor ?? f.RazaoSocial ?? f.NomeFantasia ?? '');
          this.fornecedorMap.set(id, nome);
          return { id, label: `${id} - ${nome}` };
        }).filter(f => !!f.id);
      },
    });
  }

  private loadPedidosAprovados(): void {
    this.pedidosApi.listar({ status: 'AP', page_size: 500 }).subscribe({
      next: (resp: any) => {
        this.pedidosAprovados = this.arrayOrResults<PedidoCompra>(resp);
      },
      error: () => {
        this.pedidosAprovados = [];
      },
    });
  }

  loadNotas(): void {
    this.loading = true;
    this.notasApi.listar(this.listParams(true)).subscribe({
      next: (resp: any) => {
        this.notasPagina = this.arrayOrResults<NotaFiscalEntrada>(resp);
        this.notas = this.notasPagina;
        this.notasFiltradas = this.notasPagina;
        this.totalRecords = Array.isArray(resp) ? this.notasPagina.length : Number(resp?.count ?? this.notasPagina.length);
        this.limparSelecaoForaDaPagina();
        this.loading = false;
        this.loadIndicadores();
      },
      error: () => {
        this.notas = [];
        this.notasFiltradas = [];
        this.notasPagina = [];
        this.totalRecords = 0;
        this.loading = false;
        this.erro = 'Não foi possível carregar as notas fiscais.';
      },
    });
  }

  applyFilter(): void {
    this.page = 1;
    this.selectedNota = null;
    this.loadNotas();
  }

  private applyPage(): void {
    this.loadNotas();
  }

  private limparSelecaoForaDaPagina(): void {
    if (this.selectedNota && !this.notasPagina.some(n => n.id === this.selectedNota?.id)) {
      this.selectedNota = null;
    }
  }

  private listParams(includePaging = false): NotaFiscalEntradaListParams {
    const params: NotaFiscalEntradaListParams = {
      search: this.search || undefined,
      status: this.filtroStatus || undefined,
      fornecedor: this.filtroFornecedor || undefined,
      loja: this.filtroLoja || undefined,
      dt_emissao_de: this.filtroEmissaoDe || undefined,
      dt_emissao_ate: this.filtroEmissaoAte || undefined,
      dt_entrada_de: this.filtroEntradaDe || undefined,
      dt_entrada_ate: this.filtroEntradaAte || undefined,
      valor_min: this.filtroValorMin ?? undefined,
      valor_max: this.filtroValorMax ?? undefined,
    };
    if (includePaging) {
      params.page = this.page;
      params.page_size = this.pageSize;
    }
    return params;
  }

  private loadIndicadores(): void {
    this.notasApi.indicadores(this.listParams()).subscribe({
      next: (indicadores) => this.indicadores = indicadores,
      error: () => this.indicadores = { total: this.totalRecords, abertas: 0, fechadas: 0, canceladas: 0, valor_total: '0.00' },
    });
  }

  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.applyFilter();
  }

  clearSearch(): void {
    this.search = '';
    this.filtroStatus = '';
    this.filtroFornecedor = null;
    this.filtroLoja = null;
    this.filtroEmissaoDe = '';
    this.filtroEmissaoAte = '';
    this.filtroEntradaDe = '';
    this.filtroEntradaAte = '';
    this.filtroValorMin = null;
    this.filtroValorMax = null;
    this.applyFilter();
  }

  onPageSizeChange(sizeStr: string): void {
    this.pageSize = Number(sizeStr) || 20;
    this.page = 1;
    localStorage.setItem('sysvar.list.notas-entrada.pageSize', String(this.pageSize));
    this.loadNotas();
  }

  firstPage(): void {
    if (this.page !== 1) {
      this.page = 1;
      this.loadNotas();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadNotas();
    }
  }

  lastPage(): void {
    if (this.page !== this.totalPages) {
      this.page = this.totalPages;
      this.loadNotas();
    }
  }

  selecionarNota(nota: NotaFiscalEntrada): void {
    this.selectedNota = nota;
  }

  notaSelecionada(nota: NotaFiscalEntrada): boolean {
    return !!this.selectedNota && this.selectedNota.id === nota.id;
  }

  executarAcaoSelecionada(action: string): void {
    if (this.selectedNota) this.executarAcao(action, this.selectedNota);
  }

  acaoSelecionadaDesabilitada(action: string): boolean {
    if (!this.selectedNota) return true;
    const config = this.rowActions(this.selectedNota).find(a => a.key === action);
    return !config || config.visible === false || !!config.disabled;
  }

  toggleIndicators(): void {
    this.indicatorsVisible = !this.indicatorsVisible;
    this.saveViewPreference();
  }

  toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
    this.saveViewPreference();
  }

  toggleAdvancedFilters(): void {
    this.advancedFiltersOpen = !this.advancedFiltersOpen;
    this.saveViewPreference();
  }

  restoreViewPreference(): void {
    localStorage.removeItem(this.viewPrefsKey);
    localStorage.removeItem('sysvar.list.notas-entrada.pageSize');
    this.indicatorsVisible = true;
    this.filtersVisible = true;
    this.advancedFiltersOpen = false;
    this.pageSize = 20;
    this.saveViewPreference();
    this.loadNotas();
  }

  @HostListener('window:sysvar-notas-entrada-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-notas-entrada-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-notas-entrada-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadNotas();
    }
  }

  novo(): void {
    this.submitted = false;
    this.mensagem = '';
    this.erro = '';
    this.notaAtual.set(null);
    this.itensPedido = [];
    this.selectedItem = null;
    this.form.reset({
      pedido_compra: null,
      modelo: '55',
      serie: '',
      numero: '',
      chave_acesso: '',
      dt_emissao: this.hojeISO(),
      dt_entrada: this.hojeISO(),
      valor_frete: 0,
      observacoes: '',
    });
    this.form.enable();
    this.view.set('form');
  }

  voltarLista(): void {
    this.view.set('list');
    this.notaAtual.set(null);
    this.itensPedido = [];
    this.selectedItem = null;
    this.loadNotas();
  }

  editar(nota: NotaFiscalEntrada): void {
    this.mensagem = '';
    this.erro = '';
    this.notaAtual.set(nota);
    this.form.reset({
      pedido_compra: nota.pedido_compra,
      modelo: nota.modelo,
      serie: nota.serie,
      numero: nota.numero,
      chave_acesso: nota.chave_acesso,
      dt_emissao: nota.dt_emissao,
      dt_entrada: nota.dt_entrada,
      valor_frete: Number(nota.valor_frete || 0),
      observacoes: nota.observacoes,
    });

    if (nota.status === 'AB') {
      this.form.enable();
    } else {
      this.form.disable();
    }

    this.view.set('form');
    this.selectedItem = null;
    this.itensXml = [];
    this.cobrancaFinanceira = null;
    if (nota.xml_importado) {
      this.carregarFluxoXml(nota.id);
    } else {
      this.carregarItensPedido(nota.id);
    }
  }

  rowActions(nota: NotaFiscalEntrada): RowAction[] {
    return [
      { key: 'abrir', label: 'Abrir', icon: '⌕' },
      { key: 'cancelar', label: 'Cancelar NF', icon: '×', disabled: nota.status === 'CA', danger: true, dividerBefore: true },
    ];
  }

  executarAcao(action: string | Event, nota: NotaFiscalEntrada): void {
    if (action === 'abrir') this.editar(nota);
    if (action === 'cancelar') {
      this.notaAtual.set(nota);
      this.cancelarNota();
    }
  }

  salvarCabecalho(): void {
    this.submitted = true;
    this.mensagem = '';
    this.erro = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.form.get('pedido_compra')?.value) {
      this.erro = 'Selecione um Pedido aprovado para o fluxo manual. Para NF-e sem Pedido, use Importar XML.';
      return;
    }
    if (!this.datasValidas()) {
      this.erro = 'Data de entrada não pode ser anterior à data de emissão.';
      return;
    }

    const payload = this.form.getRawValue();
    const nota = this.notaAtual();
    this.saving = true;

    const req = nota
      ? this.notasApi.atualizar(nota.id, payload)
      : this.notasApi.criar(payload);

    req.subscribe({
      next: (saved) => {
        this.notaAtual.set(saved);
        this.saving = false;
        this.mensagem = 'Nota gravada.';
        this.carregarItensPedido(saved.id);
      },
      error: (err) => {
        this.saving = false;
        this.erro = err?.error?.detail || 'Não foi possível gravar a nota.';
      },
    });
  }

  onPedidoChange(): void {
    const nota = this.notaAtual();
    if (nota) return;

    const pedidoId = Number(this.form.get('pedido_compra')?.value || 0);
    const pedido = this.pedidosAprovados.find(p => p.id === pedidoId);
    if (!pedido) return;

    this.form.patchValue({
      dt_emissao: pedido.emissao || this.hojeISO(),
      valor_frete: Number(pedido.frete || 0),
    });
  }

  private carregarItensPedido(notaId: number): void {
    this.loadingItens = true;
    this.notasApi.itensPedido(notaId).subscribe({
      next: (itens) => {
        this.itensPedido = itens.map(item => {
          const qtdNaNota = Number(item.qtd_na_nota || 0);
          const saldo = Number(item.saldo_total_recebivel || 0);
          const preco = Number(item.preco_unit_pedido || 0);
          const qtdInicial = qtdNaNota > 0 ? qtdNaNota : saldo;
          return {
            ...item,
            qtd_receber: qtdInicial,
            preco_unit_nf: preco,
            desconto_item: 0,
            total_item: qtdInicial * preco,
            confirmado: !!item.nota_item,
          };
        });
        this.preservarSelecaoItem();
        this.loadingItens = false;
      },
      error: () => {
        this.itensPedido = [];
        this.selectedItem = null;
        this.loadingItens = false;
        this.erro = 'Não foi possível carregar os itens do pedido.';
      },
    });
  }

  abrirImportacaoXml(): void {
    this.importModalAberto = true;
    this.importArquivo = null;
    this.importPedido = null;
    this.erro = '';
  }

  fecharImportacaoXml(): void {
    if (this.importandoXml) return;
    this.importModalAberto = false;
  }

  onXmlFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.importArquivo = input.files?.[0] || null;
  }

  importarXml(): void {
    if (!this.importArquivo || this.importandoXml) return;
    this.importandoXml = true;
    this.erro = '';
    this.notasApi.importarXml(this.importArquivo, this.importPedido).subscribe({
      next: (nota) => {
        this.importandoXml = false;
        this.importModalAberto = false;
        this.editar(nota);
        this.mensagem = 'XML importado com sucesso.';
        this.loadNotas();
      },
      error: (err) => {
        this.importandoXml = false;
        this.erro = this.errorText(err, 'Não foi possível importar o XML.');
      },
    });
  }

  private carregarFluxoXml(notaId: number): void {
    this.loadingXml = true;
    this.notasApi.listarItensXml(notaId).subscribe({
      next: (itens) => {
        this.itensXml = itens.map(item => ({ ...item, recebidoInput: item.quantidade_recebida === null ? null : Number(item.quantidade_recebida) }));
        this.loadingXml = false;
      },
      error: (err) => {
        this.loadingXml = false;
        this.erro = this.errorText(err, 'Não foi possível carregar os itens XML.');
      },
    });
    this.notasApi.resumoConciliacao(notaId).subscribe({ next: resumo => this.resumoConciliacao = resumo });
    this.notasApi.resumoConferencia(notaId).subscribe({ next: resumo => this.resumoConferencia = resumo });
    this.notasApi.divergenciasXml(notaId).subscribe({ next: divs => this.divergenciasXml = divs });
    this.notasApi.cobrancaFinanceira(notaId).subscribe({ next: cobranca => this.cobrancaFinanceira = cobranca });
  }

  origemLabel(nota: NotaFiscalEntrada | null): string {
    return nota?.xml_importado ? 'XML' : 'Manual';
  }

  pedidoResumo(nota: NotaFiscalEntrada | null): string {
    if (!nota) return '';
    return nota.pedido_compra ? `Pedido #${nota.pedido_compra}` : 'Sem pedido';
  }

  xmlSomenteLeitura(): boolean {
    return this.notaAtual()?.status !== 'AB';
  }

  situacaoXml(): string {
    const status = this.notaAtual()?.status;
    if (status === 'FE') return 'Efetivada';
    if (status === 'CA') return 'Cancelada';
    if (!this.resumoConciliacao?.nota_conciliada) return 'Aguardando conciliação';
    if (!this.resumoConferencia?.conferencia_completa) return 'Aguardando conferência';
    if ((this.resumoConferencia?.conversoes_pendentes || 0) > 0) return 'Conversão pendente';
    return 'Pronta para efetivar';
  }

  formatarDataPtBr(data: string | null | undefined): string {
    if (!data) return '-';
    const [ano, mes, dia] = String(data).slice(0, 10).split('-');
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : String(data);
  }

  formatarMoeda(valor: string | number | null | undefined): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0));
  }

  formatarQuantidade(valor: string | number | null | undefined): string {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(Number(valor || 0));
  }

  divergenciaItemLabel(div: NotaFiscalEntradaDivergenciaXml): string {
    return `Item ${div.numero_item || div.item_xml_numero || div.item_xml}${div.produto_descricao ? ' - ' + div.produto_descricao : ''}`;
  }

  motivosBloqueioEfetivar(): string[] {
    const motivos: string[] = [];
    const nota = this.notaAtual();
    if (nota?.situacao_fiscal && nota.situacao_fiscal !== 'AUTORIZADA') motivos.push(`Situação fiscal ${this.situacaoFiscalLabel(nota.situacao_fiscal)}`);
    if (nota?.finalidade_nfe && nota.finalidade_nfe !== '1') motivos.push('Finalidade fiscal requer fluxo específico');
    if (!nota?.pedido_compra && this.cobrancaFinanceira?.pendencias?.length) motivos.push(...this.cobrancaFinanceira.pendencias);
    if (!this.resumoConciliacao?.nota_conciliada) motivos.push(`${this.resumoConciliacao?.itens_pendentes || 0} item(ns) sem Produto Sysvar`);
    if (!this.resumoConferencia?.conferencia_completa) motivos.push(`${this.resumoConferencia?.itens_nao_conferidos || 0} item(ns) não conferido(s)`);
    if ((this.resumoConferencia?.conversoes_pendentes || 0) > 0) motivos.push(`${this.resumoConferencia?.conversoes_pendentes || 0} conversão(ões) pendente(s)`);
    return motivos.filter(m => !m.startsWith('0 '));
  }

  podeEfetivarXml(): boolean {
    return this.notaAtual()?.xml_importado === true && this.notaAtual()?.status === 'AB' && this.motivosBloqueioEfetivar().length === 0;
  }

  abrirFormaPagamentoFiscal(): void {
    const pagamento = this.cobrancaFinanceira?.pagamentos?.[0];
    if (!pagamento) return;
    const sugestao = this.cobrancaFinanceira?.sugestoes?.[0];
    this.formaPagamentoModal = {
      codigoTpag: pagamento.codigo_tpag,
      descricaoTpag: pagamento.descricao_tpag,
      selecionado: sugestao?.id || null,
      loading: true,
      saving: false,
    };
    this.formasPagamentoApi.list({ ativo: true }).subscribe({
      next: resp => {
        this.formasPagamento = this.arrayOrResults<FormaPagamento>(resp);
        if (this.formaPagamentoModal) this.formaPagamentoModal.loading = false;
      },
      error: err => {
        if (this.formaPagamentoModal) this.formaPagamentoModal.loading = false;
        this.erro = this.errorText(err, 'Não foi possível carregar as formas de pagamento.');
      },
    });
  }

  confirmarFormaPagamentoFiscal(): void {
    const nota = this.notaAtual();
    const modal = this.formaPagamentoModal;
    if (!nota || !modal?.selecionado || modal.saving) return;
    modal.saving = true;
    this.notasApi.vincularFormaPagamentoFiscal(nota.id, modal.codigoTpag, modal.selecionado).subscribe({
      next: resp => {
        this.cobrancaFinanceira = resp.cobranca;
        this.formaPagamentoModal = null;
        this.mensagem = 'Forma de pagamento fiscal vinculada.';
      },
      error: err => {
        if (this.formaPagamentoModal) this.formaPagamentoModal.saving = false;
        this.erro = this.errorText(err, 'Não foi possível vincular a forma de pagamento.');
      },
    });
  }

  reprocessarConciliacao(): void {
    const nota = this.notaAtual();
    if (!nota || this.conciliandoAuto) return;
    this.conciliandoAuto = true;
    this.notasApi.conciliarAutomaticamente(nota.id).subscribe({
      next: (resp) => {
        this.conciliandoAuto = false;
        this.resumoConciliacao = resp.resumo;
        this.mensagem = 'Conciliação reprocessada.';
        this.carregarFluxoXml(nota.id);
      },
      error: (err) => {
        this.conciliandoAuto = false;
        this.erro = this.errorText(err, 'Não foi possível reprocessar a conciliação.');
      },
    });
  }

  abrirConciliacao(item: ItemXmlUI): void {
    this.conciliacaoModal = { item, termo: item.descricao_produto || item.codigo_produto_fornecedor || '', candidatos: [], selecionado: null, loading: false, saving: false };
    this.buscarCandidatosXml();
  }

  buscarCandidatosXml(): void {
    const nota = this.notaAtual();
    const modal = this.conciliacaoModal;
    if (!nota || !modal) return;
    modal.loading = true;
    this.notasApi.candidatosItemXml(nota.id, modal.item.id, modal.termo).subscribe({
      next: candidatos => { if (this.conciliacaoModal) { this.conciliacaoModal.candidatos = candidatos; this.conciliacaoModal.loading = false; } },
      error: err => { if (this.conciliacaoModal) this.conciliacaoModal.loading = false; this.erro = this.errorText(err, 'Não foi possível buscar produtos.'); },
    });
  }

  confirmarConciliacaoXml(): void {
    const nota = this.notaAtual();
    const modal = this.conciliacaoModal;
    if (!nota || !modal || !modal.selecionado) return;
    modal.saving = true;
    this.notasApi.conciliarItemXml(nota.id, modal.item.id, modal.selecionado).subscribe({
      next: () => {
        this.conciliacaoModal = null;
        this.mensagem = 'Produto vinculado ao item XML.';
        this.carregarFluxoXml(nota.id);
      },
      error: err => {
        if (this.conciliacaoModal) this.conciliacaoModal.saving = false;
        this.erro = this.errorText(err, 'Não foi possível vincular o produto.');
      },
    });
  }

  conferirItemXml(item: ItemXmlUI): void {
    const nota = this.notaAtual();
    if (!nota || this.xmlSomenteLeitura() || item.salvando) return;
    const qtd = item.recebidoInput;
    if (qtd === null || qtd === undefined || Number.isNaN(Number(qtd))) {
      this.erro = 'Informe a quantidade recebida.';
      return;
    }
    if (Number(qtd) < 0 || Number(qtd) > Number(item.quantidade_comercial || 0)) {
      this.erro = 'Quantidade recebida deve ser maior ou igual a zero e menor ou igual à quantidade fiscal.';
      return;
    }
    item.salvando = true;
    this.notasApi.conferirItemXml(nota.id, item.id, qtd).subscribe({
      next: resp => {
        Object.assign(item, resp.item, { recebidoInput: Number(resp.item.quantidade_recebida), salvando: false });
        this.resumoConferencia = resp.resumo;
        this.mensagem = 'Conferência do item gravada.';
        this.notasApi.divergenciasXml(nota.id).subscribe({ next: divs => this.divergenciasXml = divs });
      },
      error: err => {
        item.salvando = false;
        this.erro = this.errorText(err, 'Não foi possível conferir o item.');
      },
    });
  }

  preencherQuantidadeFiscal(item: ItemXmlUI): void {
    item.recebidoInput = Number(item.quantidade_comercial || 0);
  }

  confirmarQuantidadesFiscais(): void {
    const nota = this.notaAtual();
    if (!nota || this.xmlSomenteLeitura() || this.conferindoLote) return;
    const itens = this.itensXml.filter(i => i.conciliado).map(i => ({ item: i.id, quantidade_recebida: i.quantidade_comercial }));
    if (!itens.length) return;
    this.conferindoLote = true;
    this.notasApi.conferirItensXml(nota.id, itens).subscribe({
      next: resp => {
        this.conferindoLote = false;
        this.resumoConferencia = resp.resumo;
        this.mensagem = 'Quantidades fiscais confirmadas.';
        this.carregarFluxoXml(nota.id);
      },
      error: err => {
        this.conferindoLote = false;
        this.erro = this.errorText(err, 'Não foi possível confirmar as quantidades.');
      },
    });
  }

  selecionarItem(item: ItemRecebimentoUI): void {
    this.selectedItem = item;
  }

  itemSelecionado(item: ItemRecebimentoUI): boolean {
    return !!this.selectedItem && this.itemKey(this.selectedItem) === this.itemKey(item);
  }

  podeAlterarItem(item: ItemRecebimentoUI | null): boolean {
    return !!item && this.notaAtual()?.status === 'AB' && !this.saving;
  }

  itemConfirmado(item: ItemRecebimentoUI): boolean {
    return !!item.confirmado;
  }

  alternarConfirmacaoItem(event: Event, item: ItemRecebimentoUI): void {
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    input.checked = this.itemConfirmado(item);
    if (!this.podeAlterarItem(item)) return;
    if (input.checked) {
      this.removerItem(item);
      return;
    }
    this.salvarItem(item);
  }

  private preservarSelecaoItem(): void {
    if (!this.selectedItem) return;
    const selectedKey = this.itemKey(this.selectedItem);
    this.selectedItem = this.itensPedido.find(item => this.itemKey(item) === selectedKey) || null;
  }

  private itemKey(item: ItemRecebimentoUI): number {
    return item.nota_item || item.pedido_item;
  }

  recalcularItem(item: ItemRecebimentoUI): void {
    const bruto = Number(item.qtd_receber || 0) * Number(item.preco_unit_nf || 0);
    item.total_item = Math.max(0, bruto - Number(item.desconto_item || 0));
    if (item.nota_item) item.confirmado = false;
  }

  salvarItem(item: ItemRecebimentoUI): void {
    const nota = this.notaAtual();
    if (!nota || nota.status !== 'AB') return;

    const qtd = Number(item.qtd_receber || 0);
    const saldoTotal = Number(item.saldo_total_recebivel || 0);
    if (qtd < 0 || qtd > saldoTotal) {
      this.erro = 'Quantidade recebida inválida para o saldo do pedido.';
      return;
    }
    const preco = Number(item.preco_unit_nf || 0);
    const desconto = Number(item.desconto_item || 0);
    const bruto = qtd * preco;
    if (preco < 0) {
      this.erro = 'Preço do item deve ser maior ou igual a zero.';
      return;
    }
    if (desconto < 0) {
      this.erro = 'Desconto do item deve ser maior ou igual a zero.';
      return;
    }
    if (desconto > bruto) {
      this.erro = 'Desconto do item não pode ser maior que o valor bruto.';
      return;
    }
    if (!this.quantidadeFechaPack(item, qtd)) {
      const validas = (item.quantidades_validas || []).join(', ');
      this.erro = validas
        ? `A quantidade recebida do item ${item.pedido_item} precisa fechar com o pack. Use: ${validas}.`
        : `A quantidade recebida do item ${item.pedido_item} não fecha com a composição do pack.`;
      return;
    }

    const payload = {
      nota: nota.id,
      pedido_item: item.pedido_item,
      qtd_recebida: String(qtd),
      preco_unit_nf: String(Number(item.preco_unit_nf || 0)),
      desconto_item: String(Number(item.desconto_item || 0)),
    };

    const req = item.nota_item
      ? this.notasApi.atualizarItem(item.nota_item, payload)
      : this.notasApi.criarItem(payload);

    this.saving = true;
    req.subscribe({
      next: (saved) => {
        item.nota_item = saved?.id ?? item.nota_item;
        item.confirmado = true;
        this.saving = false;
        this.mensagem = 'Item gravado.';
        this.erro = '';
        this.notasApi.get(nota.id).subscribe(n => this.notaAtual.set(n));
        this.carregarItensPedido(nota.id);
      },
      error: (err) => {
        item.confirmado = false;
        this.saving = false;
        this.erro = err?.error?.detail || 'Não foi possível gravar o item.';
      },
    });
  }

  descricaoItem(item: ItemRecebimentoUI): string {
    const partes = [
      item.produto_descricao || item.descricao_livre || '',
      item.produto_referencia ? `Ref. ${item.produto_referencia}` : '',
      item.cor_nome || '',
      item.pack_nome || '',
    ].filter(Boolean);
    return partes.join(' · ') || '-';
  }

  private quantidadeFechaPack(item: ItemRecebimentoUI, qtd: number): boolean {
    if (!item.pack || !item.quantidades_validas?.length || qtd <= 0) return true;
    return item.quantidades_validas.some(valor => Number(valor) === qtd);
  }

  removerItem(item: ItemRecebimentoUI): void {
    const nota = this.notaAtual();
    if (!nota || nota.status !== 'AB' || !item.nota_item) return;
    this.confirmModal = {
      action: 'removerItem',
      title: 'Remover item da nota',
      text: 'Confirma a remoção deste item da nota?',
      item,
    };
  }

  confirmarAcao(): void {
    const modal = this.confirmModal;
    if (!modal) return;
    if (modal.action === 'removerItem' && modal.item) {
      this.executarRemocaoItem(modal.item);
      return;
    }
    if (modal.action === 'fecharNota') {
      this.executarFechamentoNota();
      return;
    }
    if (modal.action === 'cancelarNota') {
      this.executarCancelamentoNota();
    }
  }

  fecharConfirmacao(): void {
    this.confirmModal = null;
  }

  private executarRemocaoItem(item: ItemRecebimentoUI): void {
    const nota = this.notaAtual();
    if (!nota || !item.nota_item) return;
    this.notasApi.removerItem(item.nota_item).subscribe({
      next: () => {
        item.confirmado = false;
        item.nota_item = null;
        this.confirmModal = null;
        this.selectedItem = null;
        this.mensagem = 'Item removido.';
        this.notasApi.get(nota.id).subscribe(n => this.notaAtual.set(n));
        this.carregarItensPedido(nota.id);
      },
      error: () => {
        item.confirmado = true;
        this.erro = 'Não foi possível remover o item.';
      },
    });
  }

  fecharNota(): void {
    const nota = this.notaAtual();
    if (!nota || nota.status !== 'AB') return;
    if (nota.xml_importado) {
      this.efetivarModalAberto = true;
      return;
    }
    this.confirmModal = {
      action: 'fecharNota',
      title: 'Fechar nota fiscal',
      text: `Confirma o fechamento da nota ${nota.numero}?`,
    };
  }

  private executarFechamentoNota(): void {
    const nota = this.notaAtual();
    if (!nota || nota.status !== 'AB') return;
    this.notasApi.fechar(nota.id).subscribe({
      next: (n) => {
        this.confirmModal = null;
        this.notaAtual.set(n);
        this.form.disable();
        const fin = n.financeiro as { disponivel?: boolean; titulos_atualizados?: number; titulos_criados?: number; parcelas_efetivadas?: number } | undefined;
        const msgFin = fin?.disponivel
          ? ` Financeiro: ${(fin.titulos_criados || 0) + (fin.titulos_atualizados || 0)} título(s), ${fin.parcelas_efetivadas || 0} parcela(s).`
          : '';
        this.mensagem = `Nota fechada.${msgFin}`;
        this.erro = '';
        this.loadNotas();
        this.loadPedidosAprovados();
        if (n.xml_importado) this.carregarFluxoXml(n.id);
      },
      error: (err) => {
        this.erro = err?.error?.detail || 'Não foi possível fechar a nota.';
      },
    });
  }

  cancelarNota(): void {
    const nota = this.notaAtual();
    if (!nota || nota.status === 'CA') return;
    if (nota.status === 'FE') {
      this.abrirCancelamentoOperacional();
      return;
    }
    this.confirmModal = {
      action: 'cancelarNota',
      title: 'Cancelar nota fiscal',
      text: `Confirma o cancelamento da nota ${nota.numero}?`,
    };
  }

  private executarCancelamentoNota(): void {
    const nota = this.notaAtual();
    if (!nota || nota.status === 'CA') return;
    this.notasApi.cancelar(nota.id, 'Cancelamento operacional', false).subscribe({
      next: (n) => {
        this.confirmModal = null;
        this.notaAtual.set(n);
        this.form.disable();
        this.mensagem = 'Nota cancelada.';
        this.erro = '';
        this.loadNotas();
        this.loadPedidosAprovados();
      },
      error: () => {
        this.erro = 'Não foi possível cancelar a nota.';
      },
    });
  }

  confirmarEfetivacaoXml(): void {
    this.efetivarModalAberto = false;
    this.executarFechamentoNota();
  }

  abrirCancelamentoOperacional(): void {
    const nota = this.notaAtual();
    if (!nota || this.analisandoCancelamento) return;
    this.analisandoCancelamento = true;
    this.cancelamentoAnalise = null;
    this.motivoCancelamento = '';
    this.confirmacaoAvisosCancelamento = false;
    this.notasApi.analisarCancelamento(nota.id).subscribe({
      next: analise => {
        this.analisandoCancelamento = false;
        this.cancelamentoAnalise = {
          ...analise,
          bloqueios: this.consolidarBloqueiosCancelamento(analise.bloqueios),
        };
        this.cancelarModalAberto = true;
      },
      error: err => {
        this.analisandoCancelamento = false;
        this.erro = this.errorText(err, 'Não foi possível analisar o cancelamento.');
      },
    });
  }

  private consolidarBloqueiosCancelamento(bloqueios: string[]): string[] {
    const baixa = bloqueios.find(b => b.includes('possui baixa'));
    const mov = bloqueios.find(b => b.includes('movimentação financeira ativa'));
    if (!baixa || !mov) return Array.from(new Set(bloqueios));
    return [
      baixa,
      ...bloqueios.filter(b => b !== baixa && b !== mov),
    ];
  }

  podeConfirmarCancelamento(): boolean {
    const motivoOk = this.motivoCancelamento.trim().length > 0;
    const analise = this.cancelamentoAnalise;
    if (!motivoOk || !analise || analise.bloqueios.length > 0 || this.cancelandoNota) return false;
    return analise.avisos.length === 0 || this.confirmacaoAvisosCancelamento;
  }

  confirmarCancelamentoOperacional(): void {
    const nota = this.notaAtual();
    const analise = this.cancelamentoAnalise;
    if (!nota || !analise || !this.podeConfirmarCancelamento()) return;
    this.cancelandoNota = true;
    this.notasApi.cancelar(nota.id, this.motivoCancelamento.trim(), analise.avisos.length > 0).subscribe({
      next: n => {
        this.cancelandoNota = false;
        this.cancelarModalAberto = false;
        this.notaAtual.set(n);
        this.form.disable();
        this.mensagem = 'Nota cancelada.';
        this.loadNotas();
        this.loadPedidosAprovados();
        if (n.xml_importado) this.carregarFluxoXml(n.id);
      },
      error: err => {
        this.cancelandoNota = false;
        this.erro = this.errorText(err, 'Não foi possível cancelar a nota.');
      },
    });
  }

  private errorText(err: any, fallback: string): string {
    const data = err?.error;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (typeof data.detail === 'string') return data.detail;
    const firstKey = Object.keys(data)[0];
    const value = firstKey ? data[firstKey] : null;
    if (Array.isArray(value)) return value.join(' ');
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') return JSON.stringify(value);
    return fallback;
  }

  labelLoja(id: number | null | undefined): string {
    if (!id) return '';
    const nome = this.lojaMap.get(id);
    return nome ? `${id} - ${nome}` : String(id);
  }

  labelFornecedor(id: number | null | undefined): string {
    if (!id) return '';
    const nome = this.fornecedorMap.get(id);
    return nome ? `${id} - ${nome}` : String(id);
  }

  pedidoLabel(pedido: PedidoCompra): string {
    return `${pedido.id} - ${this.labelLoja(pedido.loja)} - ${this.labelFornecedor(pedido.fornecedor)}`;
  }

  tipoPedidoLabel(tipo: string | null | undefined): string {
    const labels: Record<string, string> = { '1': 'Revenda', '2': 'Uso/Consumo', '4': 'Insumo' };
    return labels[String(tipo || '')] || 'Não definido';
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = { AB: 'Aberta', FE: 'Fechada', CA: 'Cancelada' };
    return labels[status] || status;
  }

  statusClass(status: string): string {
    if (status === 'FE') return 'badge-ok';
    if (status === 'CA') return 'badge-danger';
    return 'badge-off';
  }

  situacaoFiscalLabel(status: string | null | undefined): string {
    const labels: Record<string, string> = {
      AUTORIZADA: 'Autorizada',
      CANCELADA: 'Cancelada',
      DENEGADA: 'Denegada',
      DESCONHECIDA: 'Desconhecida',
    };
    return labels[String(status || '')] || String(status || '-');
  }

  private normalizeSearch(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private datasValidas(): boolean {
    const emissao = this.form.get('dt_emissao')?.value;
    const entrada = this.form.get('dt_entrada')?.value;
    return !emissao || !entrada || String(entrada) >= String(emissao);
  }

  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey);
    if (raw) {
      try {
        const prefs = JSON.parse(raw);
        this.indicatorsVisible = prefs.indicatorsVisible !== false;
        this.filtersVisible = prefs.filtersVisible !== false;
        this.advancedFiltersOpen = prefs.advancedFiltersOpen === true;
      } catch {
        this.indicatorsVisible = true;
        this.filtersVisible = true;
        this.advancedFiltersOpen = false;
      }
    }
    const size = Number(localStorage.getItem('sysvar.list.notas-entrada.pageSize'));
    if ([10, 20, 50, 100].includes(size)) this.pageSize = size;
  }

  private saveViewPreference(): void {
    localStorage.setItem(this.viewPrefsKey, JSON.stringify({
      indicatorsVisible: this.indicatorsVisible,
      filtersVisible: this.filtersVisible,
      advancedFiltersOpen: this.advancedFiltersOpen,
    }));
  }
}
