import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, finalize } from 'rxjs';

import { Fornecedor } from '../../core/models/fornecedor';
import { Loja } from '../../core/models/loja';
import {
  StatusOperacionalXmlFornecedor,
  SituacaoFiscalXmlFornecedor,
  XmlFornecedorRecebido,
  XmlFornecedorRecebidoIndicadores,
  XmlFornecedorRecebidoListParams,
} from '../../core/models/xml-fornecedor-recebido';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { LojasService } from '../../core/services/lojas.service';
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
  loading = false;
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
      error: () => this.errorMsg = 'Não foi possível carregar as NF-e detectadas.',
    });
  }

  buscar(): void {
    this.page = 1;
    this.carregar();
  }

  limparFiltros(): void {
    this.filtros = { loja: '', fornecedor: '', status_operacional: '', situacao_fiscal: '', search: '', detectado_de: '', detectado_ate: '' };
    this.page = 1;
    this.carregar();
  }

  detalhes(row: XmlFornecedorRecebido): void {
    this.selecionado = row;
  }

  fecharDetalhes(): void {
    this.selecionado = null;
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

  fornecedorNome(row: XmlFornecedorRecebido): string {
    return row.fornecedor_nome || row.emitente_nome || 'Fornecedor não identificado';
  }

  fornecedorDetalhe(row: XmlFornecedorRecebido): string {
    return row.fornecedor_nome || 'Fornecedor não identificado';
  }

  lojaNome(row: XmlFornecedorRecebido): string {
    return row.loja_nome || row.destinatario_nome || 'Estabelecimento não identificado';
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
}
