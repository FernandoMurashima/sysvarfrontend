import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';

import { Fornecedor } from '../../core/models/fornecedor';
import { Loja } from '../../core/models/loja';
import {
  StatusOperacionalXmlFornecedor,
  SituacaoFiscalXmlFornecedor,
  TipoTratamentoXmlFornecedor,
  XmlFornecedorRecebido,
  XmlFornecedorRecebidoIndicadores,
  XmlFornecedorRecebidoListParams,
} from '../../core/models/xml-fornecedor-recebido';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { LojasService } from '../../core/services/lojas.service';
import { RecebimentoMercadoriaService } from '../../core/services/recebimento-mercadoria.service';
import { XmlFornecedorRecebidoService } from '../../core/services/xml-fornecedor-recebido.service';

@Component({
  selector: 'app-nfe-detectadas',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, CurrencyPipe],
  templateUrl: './nfe-detectadas.component.html',
  styleUrls: ['./nfe-detectadas.component.css'],
})
export class NfeDetectadasComponent implements OnInit {
  private api = inject(XmlFornecedorRecebidoService);
  private lojasApi = inject(LojasService);
  private fornecedoresApi = inject(FornecedoresService);
  private recebimentosApi = inject(RecebimentoMercadoriaService);
  private router = inject(Router);

  rows: XmlFornecedorRecebido[] = [];
  lojas: Loja[] = [];
  fornecedores: Fornecedor[] = [];
  indicadores: XmlFornecedorRecebidoIndicadores = {
    total: 0,
    detectadas: 0,
    aguardando_recebimento: 0,
    em_recebimento: 0,
    recebidas_processadas: 0,
    pendentes: 0,
  };
  selecionado: XmlFornecedorRecebido | null = null;
  tratamentoSelecionado: XmlFornecedorRecebido | null = null;
  tratamentoForm: TipoTratamentoXmlFornecedor | '' = '';
  salvandoTratamento = false;
  loading = false;
  iniciandoId: number | null = null;
  encaminhandoFiscalId: number | null = null;
  errorMsg = '';
  filtersVisible = true;
  page = 1;
  pageSize = 25;
  count = 0;

  filtros = {
    loja: '',
    fornecedor: '',
    status_operacional: '',
    situacao_fiscal: '',
    tipo_tratamento: '',
    search: '',
    detectado_de: '',
    detectado_ate: '',
  };

  readonly statusOptions: Array<{ value: StatusOperacionalXmlFornecedor; label: string }> = [
    { value: 'DETECTADO', label: 'Detectado' },
    { value: 'AGUARDANDO_RECEBIMENTO', label: 'Aguardando recebimento' },
    { value: 'EM_RECEBIMENTO', label: 'Em recebimento' },
    { value: 'RECEBIDO', label: 'Recebido' },
    { value: 'PROCESSADO', label: 'Processado' },
    { value: 'IGNORADO', label: 'Ignorado' },
  ];

  readonly situacaoOptions: Array<{ value: SituacaoFiscalXmlFornecedor; label: string }> = [
    { value: 'AUTORIZADA', label: 'Autorizada' },
    { value: 'CANCELADA', label: 'Cancelada' },
    { value: 'DENEGADA', label: 'Denegada' },
    { value: 'DESCONHECIDA', label: 'Desconhecida' },
  ];

  readonly tratamentoOptions: Array<{ value: TipoTratamentoXmlFornecedor; label: string }> = [
    { value: 'NAO_DEFINIDO', label: 'Não definido' },
    { value: 'ESTOQUE', label: 'Mercadoria para estoque' },
    { value: 'USO_CONSUMO', label: 'Uso e consumo' },
    { value: 'INSUMO_PRODUCAO', label: 'Insumo / produção' },
    { value: 'FISCAL_SEM_ESTOQUE', label: 'Entrada fiscal sem estoque' },
  ];

  readonly tratamentoOperacionalOptions = this.tratamentoOptions.filter(item => item.value !== 'NAO_DEFINIDO');

  ngOnInit(): void {
    this.carregarLookups();
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.errorMsg = '';
    const params = this.params();
    forkJoin({
      lista: this.api.listar(params),
      indicadores: this.api.indicadores(params),
    }).pipe(
      finalize(() => this.loading = false),
    ).subscribe({
      next: ({ lista, indicadores }) => {
        if (Array.isArray(lista)) {
          this.rows = lista;
          this.count = lista.length;
        } else {
          this.rows = lista.results || [];
          this.count = lista.count || 0;
        }
        this.indicadores = indicadores;
      },
      error: () => this.errorMsg = 'Não foi possível carregar as NF-e.',
    });
  }

  buscar(): void {
    this.page = 1;
    this.carregar();
  }

  limparFiltros(): void {
    this.filtros = { loja: '', fornecedor: '', status_operacional: '', situacao_fiscal: '', tipo_tratamento: '', search: '', detectado_de: '', detectado_ate: '' };
    this.page = 1;
    this.carregar();
  }

  detalhes(row: XmlFornecedorRecebido): void {
    this.selecionado = row;
  }

  podeIniciarRecebimento(row: XmlFornecedorRecebido): boolean {
    return row.tipo_tratamento === 'ESTOQUE' && ['DETECTADO', 'AGUARDANDO_RECEBIMENTO'].includes(row.status_operacional);
  }

  podeEncaminharFiscal(row: XmlFornecedorRecebido): boolean {
    return ['USO_CONSUMO', 'INSUMO_PRODUCAO', 'FISCAL_SEM_ESTOQUE'].includes(row.tipo_tratamento);
  }

  iniciarRecebimento(row: XmlFornecedorRecebido): void {
    if (!this.podeIniciarRecebimento(row)) return;
    if (this.iniciandoId === row.id) return;
    this.iniciandoId = row.id;
    this.errorMsg = '';
    this.recebimentosApi.iniciarPorXml(row.id).pipe(finalize(() => this.iniciandoId = null)).subscribe({
      next: recebimento => this.router.navigate(['/estoque/recebimentos-mercadoria', recebimento.id]),
      error: () => this.errorMsg = 'Não foi possível iniciar o recebimento.',
    });
  }

  encaminharFiscal(row: XmlFornecedorRecebido): void {
    if (!this.podeEncaminharFiscal(row) || this.encaminhandoFiscalId === row.id) return;
    this.encaminhandoFiscalId = row.id;
    this.errorMsg = '';
    this.api.encaminharFiscal(row.id).pipe(finalize(() => this.encaminhandoFiscalId = null)).subscribe({
      next: nota => this.router.navigate(['/compras/notas-entrada'], { queryParams: { nota: nota.id } }),
      error: error => this.errorMsg = this.extrairMensagemErroEncaminhamento(error),
    });
  }

  fecharDetalhes(): void {
    this.selecionado = null;
  }

  abrirDefinirTratamento(row: XmlFornecedorRecebido): void {
    this.tratamentoSelecionado = row;
    this.tratamentoForm = row.tipo_tratamento === 'NAO_DEFINIDO' ? '' : row.tipo_tratamento;
    this.errorMsg = '';
  }

  fecharDefinirTratamento(): void {
    if (this.salvandoTratamento) return;
    this.tratamentoSelecionado = null;
    this.tratamentoForm = '';
  }

  confirmarTratamento(): void {
    if (!this.tratamentoSelecionado || !this.tratamentoForm || this.salvandoTratamento) return;
    const id = this.tratamentoSelecionado.id;
    this.salvandoTratamento = true;
    this.errorMsg = '';
    this.api.definirTratamento(id, this.tratamentoForm).pipe(finalize(() => this.salvandoTratamento = false)).subscribe({
      next: xml => {
        this.rows = this.rows.map(row => row.id === xml.id ? xml : row);
        if (this.selecionado?.id === xml.id) this.selecionado = xml;
        this.tratamentoSelecionado = null;
        this.tratamentoForm = '';
      },
      error: error => this.errorMsg = this.extrairMensagemErroTratamento(error),
    });
  }

  nextPage(): void {
    if (this.page * this.pageSize >= this.count) return;
    this.page += 1;
    this.carregar();
  }

  prevPage(): void {
    if (this.page <= 1) return;
    this.page -= 1;
    this.carregar();
  }

  statusLabel(value: string): string {
    return this.statusOptions.find(item => item.value === value)?.label || value || '-';
  }

  situacaoLabel(value: string): string {
    return this.situacaoOptions.find(item => item.value === value)?.label || value || '-';
  }

  tratamentoLabel(row: XmlFornecedorRecebido | null): string {
    if (!row) return '-';
    return row.tipo_tratamento_display || this.tratamentoOptions.find(item => item.value === row.tipo_tratamento)?.label || 'Não definido';
  }

  fornecedorNome(row: XmlFornecedorRecebido): string {
    return row.fornecedor_nome || 'Fornecedor não identificado';
  }

  fornecedorDetalhe(row: XmlFornecedorRecebido): string {
    return row.fornecedor_nome || 'Fornecedor não identificado';
  }

  lojaNome(row: XmlFornecedorRecebido): string {
    return row.loja_nome || 'Estabelecimento não identificado';
  }

  lojaDetalhe(row: XmlFornecedorRecebido): string {
    return row.loja_nome || 'Estabelecimento não identificado';
  }

  nfe(row: XmlFornecedorRecebido): string {
    return `${row.numero || '-'} / ${row.serie || '-'}`;
  }

  trackById(_: number, row: XmlFornecedorRecebido): number {
    return row.id;
  }

  @HostListener('window:sysvar-nfe-detectadas-toggle-filters')
  toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
  }

  @HostListener('window:sysvar-nfe-detectadas-toggle-indicators')
  toggleIndicators(): void {}

  @HostListener('window:sysvar-nfe-detectadas-restore-view')
  restoreView(): void {
    this.filtersVisible = true;
    this.limparFiltros();
  }

  private carregarLookups(): void {
    forkJoin({
      lojas: this.lojasApi.list({ ordering: 'nome_loja', page_size: 500 }),
      fornecedores: this.fornecedoresApi.list({ ordering: 'nome_fornecedor', page_size: 500 }),
    }).subscribe({
      next: ({ lojas, fornecedores }) => {
        this.lojas = this.unwrap<Loja>(lojas);
        this.fornecedores = this.unwrap<Fornecedor>(fornecedores);
      },
      error: () => {},
    });
  }

  private params(): XmlFornecedorRecebidoListParams {
    return {
      loja: this.filtros.loja,
      fornecedor: this.filtros.fornecedor,
      status_operacional: this.filtros.status_operacional,
      situacao_fiscal: this.filtros.situacao_fiscal,
      tipo_tratamento: this.filtros.tipo_tratamento,
      search: this.filtros.search.trim(),
      detectado_de: this.filtros.detectado_de,
      detectado_ate: this.filtros.detectado_ate,
      page: this.page,
      page_size: this.pageSize,
    };
  }

  private unwrap<T>(resp: T[] | { results: T[] }): T[] {
    return Array.isArray(resp) ? resp : (resp?.results ?? []);
  }

  private extrairMensagemErroTratamento(error: any): string {
    const data = error?.error || {};
    const value = data.detail || data.tipo_tratamento || data.non_field_errors;
    if (Array.isArray(value)) return value.join(' ');
    return value || 'Não foi possível definir o tratamento da NF-e.';
  }

  private extrairMensagemErroEncaminhamento(error: any): string {
    const data = error?.error || {};
    for (const key of ['detail', 'tipo_tratamento', 'dados_fiscais', 'itens_fiscais', 'fornecedor', 'loja', 'chave_acesso', 'dt_emissao', 'non_field_errors']) {
      const value = data[key];
      if (Array.isArray(value)) return value.join(' ');
      if (typeof value === 'string' && value) return value;
    }
    return 'Não foi possível encaminhar a NF-e para a Entrada Fiscal.';
  }
}
