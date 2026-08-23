import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Cotacao, CotacaoComparativo, CotacaoFornecedor, CotacaoFornecedorStatus, CotacaoItem, CotacaoItemApoioDecisao, CotacaoNecessidade, CotacaoProposta, CotacaoPropostaItem, CotacaoRequisicaoDisponivel, CotacaoTipoCompra } from '../../core/models/cotacao';
import { Fornecedor } from '../../core/models/fornecedor';
import { Produto } from '../../core/models/produto';
import { CotacoesService } from '../../core/services/cotacoes.service';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { RequisicoesService } from '../../core/services/requisicoes.service';
import { UnidadesService } from '../../core/services/unidades.service';

type Option = { id: number; label: string };

@Component({
  selector: 'app-cotacoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './cotacoes.component.html',
  styleUrls: ['./cotacoes.component.css'],
})
export class CotacoesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CotacoesService);
  private fornecedoresApi = inject(FornecedoresService);
  private produtosApi = inject(ProdutosService);
  private requisicoesApi = inject(RequisicoesService);
  private unidadesApi = inject(UnidadesService);
  private auth = inject(AuthService);

  view: 'list' | 'form' = 'list';
  cotacoes: Cotacao[] = [];
  lojas: Option[] = [];
  produtos: Produto[] = [];
  unidades: Option[] = [];
  itens: CotacaoItem[] = [];
  fornecedoresCotacao: CotacaoFornecedor[] = [];
  fornecedoresDisponiveis: Fornecedor[] = [];
  propostasPorFornecedor: Record<number, CotacaoProposta> = {};
  comparativoCotacao: CotacaoComparativo | null = null;
  apoioItens: Record<number, CotacaoItemApoioDecisao> = {};
  apoioExpandido = new Set<number>();
  requisicoesDisponiveis: CotacaoRequisicaoDisponivel[] = [];
  necessidades: CotacaoNecessidade[] = [];
  necessidadesExpandidas = new Set<string>();
  modalNecessidadesAberto = false;
  modalItensCotacaoAberto = false;
  modalFornecedoresCotacaoAberto = false;
  modalComparativoCotacaoAberto = false;
  categoriasMaterial: any[] = [];
  filtroNecessidades = { categoria: '', search: '', loja: '', setor: '' };
  requisicoesSelecionadas = new Set<number>();
  requisicoesExpandidas = new Set<number>();
  modalRequisicoesAberto = false;
  modalFornecedorAberto = false;
  fornecedorEditando: CotacaoFornecedor | null = null;
  fornecedorSelecionado: number | null = null;
  fornecedorStatus: CotacaoFornecedorStatus = 'CONVIDADO';
  fornecedorObservacao = '';
  fornecedorMotivo = '';
  modalPropostaAberto = false;
  propostaFornecedor: CotacaoFornecedor | null = null;
  propostaEditando: CotacaoProposta | null = null;
  propostaHeader: Partial<CotacaoProposta> = {};
  propostaItens: CotacaoPropostaItem[] = [];
  justificativaVencedor = '';
  motivoRejeicao = '';
  modalCancelarAberto = false;
  motivoCancelamento = '';
  itemEditando: CotacaoItem | null = null;
  atual: Cotacao | null = null;
  loading = false;
  saving = false;
  successMsg = '';
  errorMsg = '';

  form = this.fb.group({
    loja: [null as number | null, Validators.required],
    data_limite_propostas: [''],
    prioridade: ['NORMAL', Validators.required],
    tipo_compra: ['OUTRO' as CotacaoTipoCompra, Validators.required],
    observacao: [''],
  });

  itemForm = this.fb.group({
    modo: ['PRODUTO' as 'PRODUTO' | 'AVULSO'],
    produto: [null as number | null],
    descricao: [''],
    quantidade_cotar: [1, [Validators.required, Validators.min(0.001)]],
    unidade: [null as number | null],
    especificacao_tecnica: [''],
    marca_desejada: [''],
    modelo_referencia: [''],
    permite_alternativo: [true],
    observacao: [''],
  });

  ngOnInit(): void {
    this.loadLojas();
    this.loadProdutos();
    this.loadUnidades();
    this.loadCategoriasMaterial();
    this.loadCotacoes();
  }

  get podeEditar(): boolean {
    return this.auth.podeAcessarModulo('compras', true) === true;
  }

  get currentUser(): any {
    return this.auth.getCurrentUser();
  }

  get podeEditarItens(): boolean {
    return this.podeEditar && this.atual?.status === 'EM_ELABORACAO';
  }

  get podeEditarFornecedores(): boolean {
    return this.podeEditar && !!this.atual && !['AGUARDANDO_APROVACAO', 'APROVADA', 'REJEITADA', 'CANCELADA', 'PEDIDO_GERADO', 'ENCERRADA'].includes(this.atual.status);
  }

  get podeAprovarCotacao(): boolean {
    return this.auth.podeProcesso('cotacao.aprovar');
  }

  get podeCancelarCotacao(): boolean {
    return this.podeEditar && !!this.atual && !['CANCELADA', 'ENCERRADA'].includes(this.atual.status);
  }

  loadCotacoes(): void {
    this.loading = true;
    this.api.listar({ page_size: 500 }).subscribe({
      next: resp => {
        this.cotacoes = Array.isArray(resp) ? resp : resp.results || [];
        this.loading = false;
      },
      error: err => {
        this.errorMsg = this.errorText(err, 'Falha ao carregar cotações.');
        this.loading = false;
      },
    });
  }

  loadLojas(): void {
    this.requisicoesApi.lojasPermitidas().subscribe({
      next: resp => {
        this.lojas = (Array.isArray(resp) ? resp : resp.results || [])
          .map(l => ({ id: Number(l.id ?? l.Idloja), label: `${l.id ?? l.Idloja} - ${l.nome_loja}` }))
          .filter(l => !!l.id);
        this.selecionarLojaUnica();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao carregar lojas permitidas.'),
    });
  }

  selecionarLojaUnica(): void {
    if (this.lojas.length === 1 && !this.form.value.loja) {
      this.form.patchValue({ loja: this.lojas[0].id });
    }
  }

  loadProdutos(): void {
    this.produtosApi.list({ page_size: 500, ordering: 'descricao' }).subscribe({
      next: resp => this.produtos = Array.isArray(resp) ? resp : resp.results || [],
      error: err => this.errorMsg = this.errorText(err, 'Falha ao carregar produtos.'),
    });
  }

  loadUnidades(): void {
    this.unidadesApi.list({ page_size: 500, ordering: 'Descricao' }).subscribe({
      next: resp => {
        this.unidades = (Array.isArray(resp) ? resp : resp.results || [])
          .map((u: any) => ({ id: Number(u.Idunidade ?? u.id), label: u.Descricao || u.descricao || u.Codigo || u.codigo }))
          .filter((u: Option) => !!u.id);
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao carregar unidades.'),
    });
  }

  loadCategoriasMaterial(): void {
    this.requisicoesApi.listarCategoriasMaterial({ ativo: 'true' }).subscribe({
      next: resp => this.categoriasMaterial = Array.isArray(resp) ? resp : resp.results || [],
      error: err => this.errorMsg = this.errorText(err, 'Falha ao carregar categorias.'),
    });
  }

  nova(): void {
    this.atual = null;
    this.itens = [];
    this.fornecedoresCotacao = [];
    this.comparativoCotacao = null;
    this.limparItem();
    this.form.reset({ loja: null, data_limite_propostas: '', prioridade: 'NORMAL', tipo_compra: 'OUTRO', observacao: '' });
    this.selecionarLojaUnica();
    this.view = 'form';
  }

  abrir(cotacao: Cotacao): void {
    this.atual = cotacao;
    this.form.reset({
      loja: cotacao.loja,
      data_limite_propostas: cotacao.data_limite_propostas || '',
      prioridade: cotacao.prioridade || 'NORMAL',
      tipo_compra: cotacao.tipo_compra || 'OUTRO',
      observacao: cotacao.observacao || '',
    });
    this.justificativaVencedor = cotacao.justificativa_vencedor || '';
    this.motivoRejeicao = '';
    this.view = 'form';
    this.loadItens(cotacao.id);
    this.loadFornecedoresCotacao(cotacao.id);
    this.loadComparativo(cotacao.id);
  }

  voltar(): void {
    this.view = 'list';
    this.atual = null;
    this.errorMsg = '';
    this.fecharSobretelasCotacao();
  }

  abrirModalItensCotacao(): void {
    if (!this.atual) return;
    this.modalItensCotacaoAberto = true;
  }

  fecharModalItensCotacao(): void {
    this.modalItensCotacaoAberto = false;
  }

  abrirModalFornecedoresCotacao(): void {
    if (!this.atual) return;
    this.modalFornecedoresCotacaoAberto = true;
  }

  fecharModalFornecedoresCotacao(): void {
    this.modalFornecedoresCotacaoAberto = false;
  }

  abrirModalComparativoCotacao(): void {
    if (!this.atual) return;
    this.modalComparativoCotacaoAberto = true;
  }

  fecharModalComparativoCotacao(): void {
    this.modalComparativoCotacaoAberto = false;
  }

  private fecharSobretelasCotacao(): void {
    this.modalItensCotacaoAberto = false;
    this.modalFornecedoresCotacaoAberto = false;
    this.modalComparativoCotacaoAberto = false;
  }

  salvar(): void {
    if (!this.podeEditar || this.form.invalid || this.saving) return;
    this.saving = true;
    this.errorMsg = '';
    const raw = this.form.getRawValue();
    const payload: Partial<Cotacao> = {
      loja: raw.loja || undefined,
      data_limite_propostas: raw.data_limite_propostas || null,
      prioridade: raw.prioridade as any,
      tipo_compra: raw.tipo_compra as CotacaoTipoCompra,
      observacao: raw.observacao || '',
    };
    const req = this.atual ? this.api.atualizar(this.atual.id, payload) : this.api.criar(payload);
    req.subscribe({
      next: cotacao => {
        this.saving = false;
        this.successMsg = 'Cotação salva.';
        this.atual = cotacao;
        this.view = 'form';
        this.loadItens(cotacao.id);
        this.loadFornecedoresCotacao(cotacao.id);
        this.loadComparativo(cotacao.id);
        this.loadCotacoes();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = this.errorText(err, 'Falha ao salvar cotação.');
      },
    });
  }

  loadItens(cotacaoId: number): void {
    this.api.listarItens(cotacaoId).subscribe({
      next: resp => {
        this.itens = Array.isArray(resp) ? resp : resp.results || [];
        this.apoioItens = {};
        this.apoioExpandido.clear();
      },
      error: err => {
        if (this.isOptionalEmpty(err)) {
          this.itens = [];
          this.apoioItens = {};
          this.apoioExpandido.clear();
          return;
        }
        this.errorMsg = this.errorText(err, 'Falha ao carregar itens.');
      },
    });
  }

  loadFornecedoresCotacao(cotacaoId: number): void {
    this.api.listarFornecedores(cotacaoId).subscribe({
      next: resp => {
        this.fornecedoresCotacao = Array.isArray(resp) ? resp : resp.results || [];
        this.loadPropostasCotacao(cotacaoId);
      },
      error: err => {
        if (this.isOptionalEmpty(err)) {
          this.fornecedoresCotacao = [];
          this.propostasPorFornecedor = {};
          return;
        }
        this.errorMsg = this.errorText(err, 'Falha ao carregar fornecedores da cotação.');
      },
    });
  }

  loadPropostasCotacao(cotacaoId: number): void {
    this.api.listarPropostas({ cotacao: cotacaoId }).subscribe({
      next: resp => {
        const rows = Array.isArray(resp) ? resp : resp.results || [];
        this.propostasPorFornecedor = {};
        rows.filter(p => p.ativa !== false).forEach(p => this.propostasPorFornecedor[p.cotacao_fornecedor] = p);
      },
      error: err => {
        this.propostasPorFornecedor = {};
        if (!this.isOptionalEmpty(err)) this.errorMsg = this.errorText(err, 'Falha ao carregar propostas.');
      },
    });
  }

  loadComparativo(cotacaoId: number): void {
    this.api.comparativo(cotacaoId).subscribe({
      next: resp => this.comparativoCotacao = resp,
      error: err => {
        this.comparativoCotacao = { cotacao: cotacaoId, itens: [], propostas: [] };
        if (!this.isOptionalEmpty(err)) this.errorMsg = this.errorText(err, 'Falha ao carregar comparativo.');
      },
    });
  }

  abrirModalFornecedor(row?: CotacaoFornecedor): void {
    if (!this.atual || !this.podeEditarFornecedores) return;
    this.modalFornecedorAberto = true;
    this.fornecedorEditando = row || null;
    this.fornecedorSelecionado = row?.fornecedor || null;
    this.fornecedorStatus = row?.status_participacao || 'CONVIDADO';
    this.fornecedorObservacao = row?.observacao || '';
    this.fornecedorMotivo = row?.motivo_desclassificacao || '';
    if (!row) {
      this.fornecedoresApi.list({ page_size: 500, ordering: 'nome_fornecedor', ativo: true, utilizavel: true }).subscribe({
        next: resp => this.fornecedoresDisponiveis = Array.isArray(resp as any) ? resp as any : resp.results || [],
        error: err => this.errorMsg = this.errorText(err, 'Falha ao carregar fornecedores.'),
      });
    }
  }

  fecharModalFornecedor(): void {
    this.modalFornecedorAberto = false;
    this.fornecedorEditando = null;
    this.fornecedorSelecionado = null;
    this.fornecedorStatus = 'CONVIDADO';
    this.fornecedorObservacao = '';
    this.fornecedorMotivo = '';
  }

  fornecedoresParaAdicionar(): Fornecedor[] {
    const usados = new Set(this.fornecedoresCotacao.map(f => Number(f.fornecedor)));
    return this.fornecedoresDisponiveis.filter(f => f.id && !usados.has(Number(f.id)));
  }

  salvarFornecedor(): void {
    if (!this.atual || !this.podeEditarFornecedores) return;
    if (this.fornecedorStatus === 'DESCLASSIFICADO' && !this.fornecedorMotivo.trim()) {
      this.errorMsg = 'Informe o motivo da desclassificação.';
      return;
    }
    const payload: Partial<CotacaoFornecedor> = {
      cotacao: this.atual.id,
      fornecedor: this.fornecedorSelecionado || undefined,
      status_participacao: this.fornecedorStatus,
      observacao: this.fornecedorObservacao || '',
      motivo_desclassificacao: this.fornecedorMotivo || '',
    };
    const req = this.fornecedorEditando
      ? this.api.atualizarFornecedor(this.fornecedorEditando.id, payload)
      : this.api.adicionarFornecedor(payload);
    req.subscribe({
      next: fornecedor => {
        this.errorMsg = '';
        this.successMsg = 'Fornecedor salvo.';
        if (fornecedor) {
          const idx = this.fornecedoresCotacao.findIndex(f => f.id === fornecedor.id);
          if (idx >= 0) this.fornecedoresCotacao[idx] = fornecedor;
          else this.fornecedoresCotacao = [...this.fornecedoresCotacao, fornecedor];
        }
        this.fecharModalFornecedor();
        this.loadFornecedoresCotacao(this.atual!.id);
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao salvar fornecedor.'),
    });
  }

  removerFornecedor(row: CotacaoFornecedor): void {
    if (!this.podeEditarFornecedores) return;
    this.api.removerFornecedor(row.id).subscribe({
      next: () => this.loadFornecedoresCotacao(this.atual!.id),
      error: err => this.errorMsg = this.errorText(err, 'Falha ao remover fornecedor.'),
    });
  }

  abrirModalProposta(row: CotacaoFornecedor): void {
    if (!this.atual || !this.podeEditarFornecedores) return;
    this.propostaFornecedor = row;
    this.propostaEditando = this.propostasPorFornecedor[row.id] || null;
    const hoje = new Date().toISOString().slice(0, 10);
    this.propostaHeader = this.propostaEditando ? { ...this.propostaEditando } : {
      data_proposta: hoje,
      validade_proposta: null,
      prazo_entrega: '',
      condicao_pagamento: '',
      frete: 0,
      outras_despesas: 0,
      desconto_geral: 0,
      observacao: '',
    };
    const existentes = new Map((this.propostaEditando?.itens || []).map(i => [Number(i.cotacao_item), i]));
    this.propostaItens = this.itens.map(item => {
      const existente = existentes.get(item.id);
      return existente ? { ...existente } : {
        cotacao_item: item.id,
        cotacao_item_descricao: item.produto_descricao || item.descricao,
        quantidade_cotar: item.quantidade_cotar,
        quantidade_ofertada: null,
        preco_unitario: null,
        desconto_item: 0,
        marca: '',
        modelo_referencia: '',
        garantia: '',
        prazo_entrega_item: '',
        observacao: '',
      };
    });
    this.modalPropostaAberto = true;
  }

  fecharModalProposta(): void {
    this.modalPropostaAberto = false;
    this.propostaFornecedor = null;
    this.propostaEditando = null;
    this.propostaHeader = {};
    this.propostaItens = [];
  }

  totalItemProposta(item: CotacaoPropostaItem): number {
    const qtd = Number(item.quantidade_ofertada || 0);
    const preco = Number(item.preco_unitario || 0);
    const desconto = Number(item.desconto_item || 0);
    return Math.max(qtd * preco - desconto, 0);
  }

  totalProposta(): number {
    const totalItens = this.propostaItens.reduce((acc, item) => acc + this.totalItemProposta(item), 0);
    return Math.max(totalItens - Number(this.propostaHeader.desconto_geral || 0) + Number(this.propostaHeader.frete || 0) + Number(this.propostaHeader.outras_despesas || 0), 0);
  }

  salvarProposta(): void {
    if (!this.atual || !this.propostaFornecedor || !this.podeEditarFornecedores) return;
    const itens = this.propostaItens
      .filter(item => Number(item.quantidade_ofertada || 0) > 0 || Number(item.preco_unitario || 0) > 0)
      .map(item => ({
        cotacao_item: item.cotacao_item,
        quantidade_ofertada: item.quantidade_ofertada || 0,
        preco_unitario: item.preco_unitario || 0,
        desconto_item: item.desconto_item || 0,
        marca: item.marca || '',
        modelo_referencia: item.modelo_referencia || '',
        garantia: item.garantia || '',
        prazo_entrega_item: item.prazo_entrega_item || '',
        observacao: item.observacao || '',
      }));
    const payload: Partial<CotacaoProposta> = {
      ...this.propostaHeader,
      cotacao: this.atual.id,
      cotacao_fornecedor: this.propostaFornecedor.id,
      frete: this.propostaHeader.frete || 0,
      outras_despesas: this.propostaHeader.outras_despesas || 0,
      desconto_geral: this.propostaHeader.desconto_geral || 0,
      itens,
    };
    const req = this.propostaEditando ? this.api.atualizarProposta(this.propostaEditando.id, payload) : this.api.criarProposta(payload);
    req.subscribe({
      next: () => {
        this.fecharModalProposta();
        this.loadFornecedoresCotacao(this.atual!.id);
        this.loadComparativo(this.atual!.id);
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao salvar proposta.'),
    });
  }

  justificativaObrigatoria(proposta: CotacaoProposta | any): boolean {
    const propostas = this.comparativoCotacao?.propostas || [];
    if (propostas.length <= 1) return true;
    return !proposta?.menor_total_geral;
  }

  selecionarVencedor(proposta: any): void {
    if (!this.atual || !this.podeEditar || this.atual.status === 'AGUARDANDO_APROVACAO' || ['APROVADA', 'REJEITADA', 'CANCELADA', 'PEDIDO_GERADO', 'ENCERRADA'].includes(this.atual.status)) return;
    if (this.justificativaObrigatoria(proposta) && !this.justificativaVencedor.trim()) {
      this.errorMsg = 'Informe a justificativa da escolha.';
      return;
    }
    this.api.selecionarVencedor(this.atual.id, proposta.proposta, this.justificativaVencedor).subscribe({
      next: cotacao => {
        this.atual = cotacao;
        this.justificativaVencedor = cotacao.justificativa_vencedor || '';
        this.loadComparativo(cotacao.id);
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao selecionar vencedor.'),
    });
  }

  enviarAprovacao(): void {
    if (!this.atual || !this.podeEditar) return;
    this.api.enviarAprovacao(this.atual.id).subscribe({
      next: cotacao => {
        this.atual = cotacao;
        this.loadCotacoes();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao enviar para aprovação.'),
    });
  }

  aprovarCotacao(): void {
    if (!this.atual || !this.podeAprovarCotacao) return;
    this.api.aprovar(this.atual.id).subscribe({
      next: cotacao => {
        this.atual = cotacao;
        this.loadCotacoes();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao aprovar cotação.'),
    });
  }

  rejeitarCotacao(): void {
    if (!this.atual || !this.podeAprovarCotacao) return;
    if (!this.motivoRejeicao.trim()) {
      this.errorMsg = 'Informe o motivo da rejeição.';
      return;
    }
    this.api.rejeitar(this.atual.id, this.motivoRejeicao).subscribe({
      next: cotacao => {
        this.atual = cotacao;
        this.loadCotacoes();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao rejeitar cotação.'),
    });
  }

  abrirModalCancelar(): void {
    if (!this.podeCancelarCotacao) return;
    this.motivoCancelamento = '';
    this.modalCancelarAberto = true;
  }

  fecharModalCancelar(): void {
    this.modalCancelarAberto = false;
    this.motivoCancelamento = '';
  }

  cancelarCotacao(): void {
    if (!this.atual || !this.podeCancelarCotacao) return;
    if (!this.motivoCancelamento.trim()) {
      this.errorMsg = 'Informe o motivo do cancelamento.';
      return;
    }
    this.api.cancelar(this.atual.id, this.motivoCancelamento).subscribe({
      next: cotacao => {
        this.atual = cotacao;
        this.fecharModalCancelar();
        this.loadCotacoes();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao cancelar cotação.'),
    });
  }

  toggleApoioItem(item: CotacaoItem): void {
    if (this.apoioExpandido.has(item.id)) {
      this.apoioExpandido.delete(item.id);
      return;
    }
    this.apoioExpandido.add(item.id);
    if (this.apoioItens[item.id]) return;
    this.api.apoioDecisaoItem(item.id).subscribe({
      next: apoio => this.apoioItens[item.id] = apoio,
      error: err => this.errorMsg = this.errorText(err, 'Falha ao carregar apoio do item.'),
    });
  }

  moeda(valor: string | number | null | undefined): string {
    if (valor === null || valor === undefined || valor === '') return '-';
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  abrirModalRequisicoes(): void {
    if (!this.atual) return;
    this.modalRequisicoesAberto = true;
    this.requisicoesSelecionadas.clear();
    this.requisicoesExpandidas.clear();
    this.api.requisicoesDisponiveis().subscribe({
      next: rows => this.requisicoesDisponiveis = rows,
      error: err => this.errorMsg = this.errorText(err, 'Falha ao carregar requisições disponíveis.'),
    });
  }

  fecharModalRequisicoes(): void {
    this.modalRequisicoesAberto = false;
  }

  abrirModalNecessidades(): void {
    if (!this.atual) return;
    this.modalNecessidadesAberto = true;
    this.necessidadesExpandidas.clear();
    this.loadNecessidades();
  }

  fecharModalNecessidades(): void {
    this.modalNecessidadesAberto = false;
  }

  loadNecessidades(): void {
    this.api.necessidades({
      categoria: this.filtroNecessidades.categoria,
      search: this.filtroNecessidades.search,
      loja: this.filtroNecessidades.loja,
      setor: this.filtroNecessidades.setor,
    }).subscribe({
      next: rows => this.necessidades = rows,
      error: err => this.errorMsg = this.errorText(err, 'Falha ao carregar necessidades.'),
    });
  }

  toggleNecessidade(row: CotacaoNecessidade): void {
    this.necessidadesExpandidas.has(row.key) ? this.necessidadesExpandidas.delete(row.key) : this.necessidadesExpandidas.add(row.key);
  }

  selecionarRequisicoesDaNecessidade(row: CotacaoNecessidade): void {
    row.requisicoes_ids.forEach(id => this.requisicoesSelecionadas.add(id));
  }

  toggleRequisicao(req: CotacaoRequisicaoDisponivel, checked: boolean): void {
    checked ? this.requisicoesSelecionadas.add(req.id) : this.requisicoesSelecionadas.delete(req.id);
  }

  toggleExpandir(req: CotacaoRequisicaoDisponivel): void {
    this.requisicoesExpandidas.has(req.id) ? this.requisicoesExpandidas.delete(req.id) : this.requisicoesExpandidas.add(req.id);
  }

  adicionarRequisicoes(): void {
    if (!this.atual || !this.podeEditarItens || !this.requisicoesSelecionadas.size) return;
    this.api.adicionarRequisicoes(this.atual.id, Array.from(this.requisicoesSelecionadas)).subscribe({
      next: cotacao => {
        this.atual = cotacao;
        this.modalRequisicoesAberto = false;
        this.modalNecessidadesAberto = false;
        this.loadItens(cotacao.id);
        this.loadCotacoes();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao adicionar requisições.'),
    });
  }

  removerRequisicao(requisicao: number): void {
    if (!this.atual || !this.podeEditarItens) return;
    this.api.removerRequisicao(this.atual.id, requisicao).subscribe({
      next: cotacao => {
        this.atual = cotacao;
        this.loadItens(cotacao.id);
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao remover requisição.'),
    });
  }

  requisicoesVinculadas(): number[] {
    return Array.from(new Set(this.itens.map(i => Number((i as any).requisicao_item_origem ? i.requisicao_origem_numero : 0)).filter(Boolean)));
  }

  origemItem(item: CotacaoItem): string {
    return item.origem === 'REQUISICAO' ? `REQ-${item.requisicao_origem_numero || item.requisicao_item_origem}` : 'Avulso';
  }

  produtoSelecionado(): void {
    const id = Number(this.itemForm.value.produto || 0);
    const produto = this.produtos.find(p => Number(p.Idproduto) === id);
    if (!produto) return;
    this.itemForm.patchValue({ descricao: produto.descricao || '', unidade: produto.unidade || null });
  }

  limparItem(): void {
    this.itemEditando = null;
    this.itemForm.reset({ modo: 'PRODUTO', produto: null, descricao: '', quantidade_cotar: 1, unidade: null, especificacao_tecnica: '', marca_desejada: '', modelo_referencia: '', permite_alternativo: true, observacao: '' });
  }

  editarItem(item: CotacaoItem): void {
    this.itemEditando = item;
    this.itemForm.reset({
      modo: item.produto ? 'PRODUTO' : 'AVULSO',
      produto: item.produto || null,
      descricao: item.descricao || '',
      quantidade_cotar: Number(item.quantidade_cotar || 0),
      unidade: item.unidade || null,
      especificacao_tecnica: item.especificacao_tecnica || '',
      marca_desejada: item.marca_desejada || '',
      modelo_referencia: item.modelo_referencia || '',
      permite_alternativo: item.permite_alternativo !== false,
      observacao: item.observacao || '',
    });
  }

  salvarItem(): void {
    if (!this.atual || !this.podeEditarItens || this.itemForm.invalid) return;
    const raw = this.itemForm.getRawValue();
    const produtoId = raw.modo === 'PRODUTO' ? raw.produto : null;
    const payload: Partial<CotacaoItem> = {
      cotacao: this.atual.id,
      origem: 'AVULSO',
      produto: produtoId || null,
      descricao: produtoId ? '' : raw.descricao || '',
      quantidade_cotar: raw.quantidade_cotar || 0,
      unidade: raw.unidade || undefined,
      especificacao_tecnica: raw.especificacao_tecnica || '',
      marca_desejada: raw.marca_desejada || '',
      modelo_referencia: raw.modelo_referencia || '',
      permite_alternativo: raw.permite_alternativo !== false,
      observacao: raw.observacao || '',
    };
    const req = this.itemEditando ? this.api.atualizarItem(this.itemEditando.id, payload) : this.api.criarItem(payload);
    req.subscribe({
      next: item => {
        this.errorMsg = '';
        this.successMsg = 'Item salvo.';
        if (item) {
          const idx = this.itens.findIndex(i => i.id === item.id);
          if (idx >= 0) this.itens[idx] = item;
          else this.itens = [...this.itens, item];
        }
        this.limparItem();
        this.loadItens(this.atual!.id);
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao salvar item.'),
    });
  }

  excluirItem(item: CotacaoItem): void {
    if (!this.podeEditarItens) return;
    this.api.excluirItem(item.id).subscribe({
      next: () => this.loadItens(this.atual!.id),
      error: err => this.errorMsg = this.errorText(err, 'Falha ao excluir item.'),
    });
  }

  statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      EM_ELABORACAO: 'Em elaboração',
      ABERTA: 'Aberta',
      PROPOSTAS_RECEBIDAS: 'Propostas recebidas',
      EM_ANALISE: 'Em análise',
      AGUARDANDO_APROVACAO: 'Aguardando aprovação',
      APROVADA: 'Aprovada',
      REJEITADA: 'Rejeitada',
      CANCELADA: 'Cancelada',
      PEDIDO_GERADO: 'Pedido gerado',
      ENCERRADA: 'Encerrada',
    };
    return labels[status || 'EM_ELABORACAO'] || status || '';
  }

  tipoLabel(tipo?: string): string {
    const labels: Record<string, string> = { REVENDA: 'Revenda', USO_CONSUMO: 'Uso/Consumo', INSUMO: 'Insumo', SERVICO: 'Serviço', OUTRO: 'Outro' };
    return labels[tipo || 'OUTRO'] || tipo || '';
  }

  statusFornecedorLabel(status?: string): string {
    const labels: Record<string, string> = {
      CONVIDADO: 'Convidado',
      PROPOSTA_RECEBIDA: 'Proposta recebida',
      NAO_RESPONDEU: 'Não respondeu',
      RECUSOU: 'Recusou participar',
      DESCLASSIFICADO: 'Desclassificado',
    };
    return labels[status || 'CONVIDADO'] || status || '';
  }

  private errorText(err: any, fallback: string): string {
    if (typeof err?.error === 'string') return err.error;
    if (err?.error?.detail) return err.error.detail;
    const first = err?.error && Object.values(err.error)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (first) return String(first);
    return fallback;
  }

  private isOptionalEmpty(err: any): boolean {
    return Number(err?.status) === 404;
  }
}
