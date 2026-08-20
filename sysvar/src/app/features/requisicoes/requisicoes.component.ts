import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LojasService } from '../../core/services/lojas.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { RequisicoesService } from '../../core/services/requisicoes.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { Produto } from '../../core/models/produto';
import { Requisicao, RequisicaoHistorico, RequisicaoItem, RequisicaoServicoCategoria, RequisicaoSetor } from '../../core/models/requisicao';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

type Option = { id: number; label: string };

@Component({
  selector: 'app-requisicoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './requisicoes.component.html',
  styleUrls: ['./requisicoes.component.css'],
})
export class RequisicoesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(RequisicoesService);
  private lojasApi = inject(LojasService);
  private unidadesApi = inject(UnidadesService);
  private produtosApi = inject(ProdutosService);
  private auth = inject(AuthService);

  view: 'list' | 'form' = 'list';
  requisicoes: Requisicao[] = [];
  filtered: Requisicao[] = [];
  pageRows: Requisicao[] = [];
  itens: RequisicaoItem[] = [];
  historico: RequisicaoHistorico[] = [];
  lojas: Option[] = [];
  unidades: Option[] = [];
  setores: RequisicaoSetor[] = [];
  categorias: RequisicaoServicoCategoria[] = [];
  produtos: Produto[] = [];

  loading = false;
  saving = false;
  successMsg = '';
  errorMsg = '';
  headerErrors: Record<string, string[]> = {};
  itemErrors: Record<string, string[]> = {};
  search = '';
  filterStatus = '';
  filterPrioridade = '';
  page = 1;
  pageSize = 20;
  selected: Requisicao | null = null;
  atual: Requisicao | null = null;
  selectedItem: RequisicaoItem | null = null;
  consultando = false;
  decisaoModal: { acao: 'aprovar' | 'rejeitar' | 'devolver' | 'cancelar'; titulo: string; motivo: string } | null = null;
  atendimentoModal: { item: RequisicaoItem; quantidade: number; observacao: string; disponivel: number } | null = null;

  headerForm = this.fb.group({
    loja: [null as number | null, Validators.required],
    setor: [null as number | null, Validators.required],
    data_necessaria: [''],
    prioridade: ['NORMAL', Validators.required],
    justificativa: [''],
    observacoes: [''],
  });

  itemForm = this.fb.group({
    id: [null as number | null],
    tipo: ['MATERIAL', Validators.required],
    origem: ['PRODUTO', Validators.required],
    produto: [null as number | null],
    descricao: [''],
    categoria: [''],
    unidade: [null as number | null],
    qtd_solicitada: [1, [Validators.required, Validators.min(0.001)]],
    especificacao_tecnica: [''],
    titulo_servico: [''],
    descricao_servico: [''],
    categoria_servico: [null as number | null],
    tipo_servico: [''],
    observacoes: [''],
  });

  get podeEditar(): boolean {
    return this.auth.podeAcessarModulo('compras', true) !== false;
  }

  get podeAprovar(): boolean {
    return ['Admin', 'Diretor', 'Gerente'].includes(this.auth.getUserType() || '') && this.podeEditar;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get aguardandoAprovacao(): number {
    return this.requisicoes.filter(r => r.status === 'AGUARDANDO_APROVACAO').length;
  }

  get concluidas(): number {
    return this.requisicoes.filter(r => r.status === 'CONCLUIDA').length;
  }

  get urgentes(): number {
    return this.requisicoes.filter(r => r.prioridade !== 'NORMAL').length;
  }

  ngOnInit(): void {
    this.loadLookups();
    this.loadRequisicoes();
    this.itemForm.get('tipo')?.valueChanges.subscribe(tipo => {
      this.itemForm.patchValue({ origem: tipo === 'SERVICO' ? 'SERVICO' : 'PRODUTO' }, { emitEvent: false });
      this.syncProdutoUnidade();
    });
    this.itemForm.get('origem')?.valueChanges.subscribe(() => this.syncProdutoUnidade());
    this.itemForm.get('produto')?.valueChanges.subscribe(() => {
      this.syncProdutoUnidade();
    });
  }

  private arrayOrResults<T>(data: any): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data?.results && Array.isArray(data.results)) return data.results as T[];
    return [];
  }

  loadLookups(): void {
    this.lojasApi.list({ page_size: 1000, ordering: 'nome_loja' }).subscribe(resp => {
      this.lojas = this.arrayOrResults<any>(resp).map(l => ({ id: Number(l.id ?? l.Idloja), label: `${l.id ?? l.Idloja} - ${l.nome_loja}` })).filter(l => !!l.id);
    });
    this.unidadesApi.list({ page_size: 1000, ordering: 'Descricao' }).subscribe(resp => {
      this.unidades = this.arrayOrResults<any>(resp).map(u => ({ id: Number(u.Idunidade ?? u.id), label: `${u.Codigo || ''} ${u.Descricao || ''}`.trim() })).filter(u => !!u.id);
    });
    this.api.listarCategorias().subscribe(resp => this.categorias = this.arrayOrResults<RequisicaoServicoCategoria>(resp));
    this.api.listarSetores().subscribe(resp => this.setores = this.arrayOrResults<RequisicaoSetor>(resp));
    this.buscarProdutos();
  }

  buscarProdutos(term = ''): void {
    this.produtosApi.list({ page_size: 50, search: term, tipo_produto: '2', ativo: 'true', ordering: 'descricao' }).subscribe({
      next: resp => this.produtos = this.arrayOrResults<Produto>(resp),
      error: () => this.produtos = [],
    });
  }

  loadRequisicoes(): void {
    this.loading = true;
    this.api.listar({ page_size: 500 }).subscribe({
      next: resp => {
        this.requisicoes = this.arrayOrResults<Requisicao>(resp);
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error('Erro ao carregar requisições.');
        this.loading = false;
      },
    });
  }

  applyFilter(): void {
    const term = this.norm(this.search);
    this.filtered = this.requisicoes.filter(r => {
      const hay = this.norm([r.numero, r.loja_nome, r.setor_nome, r.requisitante_nome, r.prioridade, r.status].join(' '));
      return (!term || hay.includes(term))
        && (!this.filterStatus || r.status === this.filterStatus)
        && (!this.filterPrioridade || r.prioridade === this.filterPrioridade);
    });
    this.page = 1;
    this.applyPage();
  }

  applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    this.pageRows = this.filtered.slice(start, start + this.pageSize);
  }

  novo(): void {
    this.atual = null;
    this.itens = [];
    this.historico = [];
    this.consultando = false;
    this.selectedItem = null;
    this.headerForm.reset({ loja: null, setor: null, data_necessaria: '', prioridade: 'NORMAL', justificativa: '', observacoes: '' });
    this.limparItem();
    this.view = 'form';
  }

  abrir(r: Requisicao, consulta = false): void {
    this.api.get(r.id).subscribe(req => {
      this.atual = req;
      this.consultando = consulta || req.status !== 'RASCUNHO';
      this.headerForm.reset({
        loja: req.loja,
        setor: req.setor,
        data_necessaria: req.data_necessaria || '',
        prioridade: req.prioridade,
        justificativa: req.justificativa,
        observacoes: req.observacoes,
      });
      this.itens = req.itens || [];
      this.historico = req.historico || [];
      this.selectedItem = null;
      this.view = 'form';
    });
  }

  salvarCabecalho(): void {
    this.headerErrors = {};
    if (this.headerForm.invalid) {
      this.error('Preencha os campos obrigatórios da requisição.');
      return;
    }
    const payload = this.headerForm.value as Partial<Requisicao>;
    this.saving = true;
    const obs = this.atual ? this.api.update(this.atual.id, payload) : this.api.create(payload);
    obs.subscribe({
      next: req => {
        this.atual = req;
        this.success('Requisição gravada.');
        this.loadRequisicoes();
        this.saving = false;
      },
      error: err => {
        this.headerErrors = this.extractFieldErrors(err);
        this.error(this.extractApiMessages(err, 'Erro ao gravar requisição.').join(' '));
        this.saving = false;
      },
    });
  }

  salvarItem(): void {
    this.itemErrors = {};
    if (!this.atual) {
      this.error('Grave o cabeçalho antes de incluir itens.');
      return;
    }
    const raw = this.itemForm.value;
    const payload: any = { ...raw, requisicao: this.atual.id };
    if (payload.tipo === 'MATERIAL' && payload.origem === 'PRODUTO') {
      payload.unidade = this.produtoSelecionado()?.unidade || null;
    }
    if (payload.tipo === 'SERVICO') {
      payload.origem = 'SERVICO';
      payload.qtd_solicitada = 1;
      payload.produto = null;
    }
    const obs = raw.id ? this.api.updateItem(raw.id, payload) : this.api.createItem(payload);
    obs.subscribe({
      next: () => {
        this.success('Item gravado.');
        this.recarregarAtual();
        this.limparItem();
      },
      error: err => {
        this.itemErrors = this.extractFieldErrors(err);
        this.error(this.extractApiMessages(err, 'Erro ao gravar item.').join(' '));
      },
    });
  }

  salvarRascunho(): void {
    this.salvarCabecalho();
  }

  salvarEEnviar(): void {
    this.headerErrors = {};
    this.itemErrors = {};
    if (this.headerForm.invalid) {
      this.error('Preencha loja, setor e prioridade antes de enviar.');
      return;
    }
    this.saving = true;
    const salvarCabecalho$ = this.atual ? this.api.update(this.atual.id, this.headerForm.value as Partial<Requisicao>) : this.api.create(this.headerForm.value as Partial<Requisicao>);
    salvarCabecalho$.subscribe({
      next: req => {
        this.atual = req;
        const enviarDepois = () => this.api.salvarEnviar(req.id, this.headerForm.value as Partial<Requisicao>).subscribe({
          next: enviada => {
            this.saving = false;
            this.afterAction(enviada, 'Requisição salva e enviada.');
          },
          error: err => {
            this.saving = false;
            this.headerErrors = this.extractFieldErrors(err);
            this.error(this.extractApiMessages(err, 'Não foi possível enviar a requisição.').join(' '));
          },
        });
        const temItemEmEdicao = this.itemForm.dirty && Boolean(this.itemForm.value.produto || this.itemForm.value.descricao || this.itemForm.value.titulo_servico);
        if (temItemEmEdicao) {
          this.salvarItemAntesDeEnviar(req.id, enviarDepois);
        } else {
          enviarDepois();
        }
      },
      error: err => {
        this.saving = false;
        this.headerErrors = this.extractFieldErrors(err);
        this.error(this.extractApiMessages(err, 'Erro ao salvar cabeçalho.').join(' '));
      },
    });
  }

  private salvarItemAntesDeEnviar(requisicaoId: number, done: () => void): void {
    const raw = this.itemForm.value;
    const payload: any = { ...raw, requisicao: requisicaoId };
    if (payload.tipo === 'MATERIAL' && payload.origem === 'PRODUTO') payload.unidade = this.produtoSelecionado()?.unidade || null;
    if (payload.tipo === 'SERVICO') {
      payload.origem = 'SERVICO';
      payload.qtd_solicitada = 1;
      payload.produto = null;
    }
    const obs = raw.id ? this.api.updateItem(raw.id, payload) : this.api.createItem(payload);
    obs.subscribe({
      next: () => done(),
      error: err => {
        this.saving = false;
        this.itemErrors = this.extractFieldErrors(err);
        this.error(this.extractApiMessages(err, 'Corrija o item antes de enviar.').join(' '));
      },
    });
  }

  editarItem(item: RequisicaoItem): void {
    this.selectedItem = item;
    this.itemForm.reset({
      id: item.id,
      tipo: item.tipo,
      origem: item.origem,
      produto: item.produto,
      descricao: item.descricao,
      categoria: item.categoria,
      unidade: item.unidade,
      qtd_solicitada: Number(item.qtd_solicitada || 1),
      especificacao_tecnica: item.especificacao_tecnica,
      titulo_servico: item.titulo_servico,
      descricao_servico: item.descricao_servico,
      categoria_servico: item.categoria_servico,
      tipo_servico: item.tipo_servico,
      observacoes: item.observacoes,
    });
  }

  limparItem(): void {
    this.itemForm.reset({ id: null, tipo: 'MATERIAL', origem: 'PRODUTO', produto: null, unidade: null, qtd_solicitada: 1 });
    this.selectedItem = null;
  }

  removerItem(item: RequisicaoItem): void {
    this.api.deleteItem(item.id).subscribe({
      next: () => {
        this.success('Item removido.');
        this.recarregarAtual();
      },
      error: () => this.error('Erro ao remover item.'),
    });
  }

  enviar(): void {
    if (!this.atual) return;
    this.api.enviar(this.atual.id).subscribe({ next: req => this.afterAction(req, 'Requisição enviada.'), error: err => this.error(err?.error?.detail || 'Erro ao enviar.') });
  }

  abrirDecisao(acao: 'aprovar' | 'rejeitar' | 'devolver' | 'cancelar'): void {
    const titulos = { aprovar: 'Aprovar requisição', rejeitar: 'Rejeitar requisição', devolver: 'Devolver para ajuste', cancelar: 'Cancelar requisição' };
    this.decisaoModal = { acao, titulo: titulos[acao], motivo: '' };
  }

  confirmarDecisao(): void {
    if (!this.atual || !this.decisaoModal) return;
    const { acao, motivo } = this.decisaoModal;
    const obs = acao === 'aprovar' ? this.api.aprovar(this.atual.id, motivo) : acao === 'rejeitar' ? this.api.rejeitar(this.atual.id, motivo) : acao === 'devolver' ? this.api.devolver(this.atual.id, motivo) : this.api.cancelar(this.atual.id, motivo);
    obs.subscribe({ next: req => { this.decisaoModal = null; this.afterAction(req, 'Ação registrada.'); }, error: err => this.error(err?.error?.detail || 'Erro ao registrar ação.') });
  }

  abrirAtendimento(item: RequisicaoItem): void {
    this.atendimentoModal = { item, quantidade: Number(item.qtd_pendente || 0), observacao: '', disponivel: 0 };
  }

  confirmarAtendimento(): void {
    if (!this.atendimentoModal) return;
    const { item, quantidade, observacao } = this.atendimentoModal;
    this.api.atenderItem(item.id, quantidade, observacao).subscribe({
      next: () => {
        this.atendimentoModal = null;
        this.success('Atendimento registrado.');
        this.recarregarAtual();
        this.loadRequisicoes();
      },
      error: err => this.error(err?.error?.quantidade || err?.error?.detail || 'Erro ao atender item.'),
    });
  }

  marcarCotacao(item: RequisicaoItem): void {
    this.api.aguardarCotacao(item.id).subscribe({ next: () => this.recarregarAtual(), error: err => this.error(err?.error?.detail || 'Erro ao encaminhar item.') });
  }

  recarregarAtual(): void {
    if (!this.atual) return;
    this.api.get(this.atual.id).subscribe(req => {
      this.atual = req;
      this.itens = req.itens || [];
      this.historico = req.historico || [];
    });
  }

  afterAction(req: Requisicao, msg: string): void {
    this.atual = req;
    this.itens = req.itens || [];
    this.historico = req.historico || [];
    this.consultando = req.status !== 'RASCUNHO';
    this.success(msg);
    this.loadRequisicoes();
  }

  produtoLabel(id: number | null): string {
    const p = this.produtos.find(x => Number(x.Idproduto) === Number(id));
    return p ? `${p.referencia || p.Idproduto} - ${p.descricao}` : '-';
  }

  produtoSelecionado(): Produto | undefined {
    const id = this.itemForm.value.produto;
    return this.produtos.find(x => Number(x.Idproduto) === Number(id));
  }

  unidadeProdutoSelecionado(): string {
    const unidade = this.produtoSelecionado()?.unidade;
    return this.unidadeLabel(Number(unidade || 0));
  }

  unidadeLabel(id: number | null): string {
    const u = this.unidades.find(x => Number(x.id) === Number(id));
    return u?.label || '-';
  }

  private syncProdutoUnidade(): void {
    if (this.itemForm.value.tipo === 'MATERIAL' && this.itemForm.value.origem === 'PRODUTO') {
      this.itemForm.patchValue({ unidade: this.produtoSelecionado()?.unidade || null }, { emitEvent: false });
    }
  }

  itemTitulo(item: RequisicaoItem): string {
    if (item.tipo === 'SERVICO') return item.titulo_servico;
    if (item.origem === 'PRODUTO') return item.produto_descricao || this.produtoLabel(item.produto);
    return item.descricao;
  }

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ');
  }

  selecionar(r: Requisicao): void {
    this.selected = r;
  }

  voltar(): void {
    this.view = 'list';
    this.atual = null;
    this.consultando = false;
  }

  private norm(value: unknown): string {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private success(msg: string): void {
    this.successMsg = msg;
    this.errorMsg = '';
  }

  private error(msg: string): void {
    this.errorMsg = msg;
    this.successMsg = '';
  }

  fieldErrors(scope: 'header' | 'item', field: string): string[] {
    return (scope === 'header' ? this.headerErrors : this.itemErrors)[field] || [];
  }

  private extractFieldErrors(err: any): Record<string, string[]> {
    const data = err?.error || {};
    const out: Record<string, string[]> = {};
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'detail' || key === 'non_field_errors') return;
        out[key] = this.flattenMessages(value);
      });
    }
    return out;
  }

  private extractApiMessages(err: any, fallback: string): string[] {
    const data = err?.error;
    const messages = this.flattenMessages(data);
    return messages.length ? messages : [fallback];
  }

  private flattenMessages(value: any): string[] {
    if (!value) return [];
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(v => this.flattenMessages(v));
    if (typeof value === 'object') {
      return Object.entries(value).flatMap(([key, v]) => {
        const msgs = this.flattenMessages(v);
        return msgs.map(m => key === 'detail' || key === 'non_field_errors' ? m : `${this.fieldLabel(key)}: ${m}`);
      });
    }
    return [String(value)];
  }

  private fieldLabel(field: string): string {
    const labels: Record<string, string> = {
      produto: 'Produto',
      quantidade: 'Quantidade',
      qtd_solicitada: 'Quantidade',
      unidade: 'Unidade',
      descricao: 'Descrição',
      categoria_servico: 'Categoria de serviço',
      tipo_servico: 'Tipo de serviço',
      setor: 'Setor',
      loja: 'Loja',
      itens: 'Itens',
    };
    return labels[field] || field;
  }
}
