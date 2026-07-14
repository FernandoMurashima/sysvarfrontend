import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { LojasService } from '../../core/services/lojas.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { PedidosCompraService } from '../../core/services/pedidos-compra.service';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { NatLancamentosService } from '../../core/services/natureza-lancamento.service';
import { NatLancamento } from '../../core/models/natureza-lancamento';
import { UnidadesService } from '../../core/services/unidades.service';
import { Unidade } from '../../core/models/unidade';
import { AuthService } from '../../core/auth.service';

type Option = { id: number; label: string };
type FormaOption = { codigo: string; label: string };

interface PedidoUsoItemUI {
  id: number | null;
  pedido: number;
  produto: number | null;
  produto_label: string;
  quantidade: number;
  preco_unit: number;
  desconto_valor: number;
  total_item: number;
  observacoes?: string | null;
}

@Component({
  selector: 'app-pedidos-uso-consumo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './pedidos-uso-consumo.component.html',
  styleUrls: ['./pedidos-uso-consumo.component.css'],
})
export class PedidosUsoConsumoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private lojasApi = inject(LojasService);
  private formasApi = inject(FormasPagamentoService);
  private pedidosApi = inject(PedidosCompraService);
  private fornecedoresApi = inject(FornecedoresService);
  private produtosApi = inject(ProdutosService);
  private naturezasApi = inject(NatLancamentosService);
  private unidadesApi = inject(UnidadesService);
  private auth = inject(AuthService);

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('compras', true) !== false;
  }

  // navegação: list / form
  view = signal<'list' | 'form'>('list');
  setViewList() {
    this.view.set('list');
    this.pedidoAtualId.set(null);
    this.consultando = false;
    this.headerForm.enable({ emitEvent: false });
    this.itemForm.enable({ emitEvent: false });
  }
  setViewForm() {
    this.view.set('form');
  }

  // estado geral
  submitted = false;
  saving = false;
  consultando = false;
  loadingLookups = signal(false);
  loadingPedidos = false;
  successMsg = '';
  errorMsg = '';
  confirmModal: {
    action: 'removerItem' | 'excluirPedido' | 'cancelarPedido';
    title: string;
    text: string;
    item?: PedidoUsoItemUI;
    pedido?: any;
  } | null = null;
  aprovarModal: { pedido: any; idnatureza: number | null } | null = null;
  naturezaModal: { pedido: any; idnatureza: number | null } | null = null;

  // lookups
  lojas: Option[] = [];
  fornecedores: Option[] = [];
  formas: FormaOption[] = [];
  naturezasCompra: NatLancamento[] = [];
  unidades: Unidade[] = [];

  private lojaMap = new Map<number, string>();
  private fornecedorMap = new Map<number, string>();
  private unidadeMap = new Map<number, Unidade>();

  // Pedido atual
  pedidoAtualId = signal<number | null>(null);

  // form de cabeçalho
  headerForm: FormGroup = this.fb.group({
    loja: [null, Validators.required],
    fornecedor: [null, Validators.required],
    emissao: [this.hojeISO(), Validators.required],
    previsao_entrega: [null],
    forma_pagamento_codigo: [null, Validators.required],
    observacoes: [''],
  });

  // ===== Itens Uso/Consumo (sem cor / pack) =====
  itemForm: FormGroup = this.fb.group({
    id: [null],
    produto_input: ['', Validators.required], // ID ou parte da descrição
    produto: [null, Validators.required],
    quantidade: [0, [Validators.required, Validators.min(0.001)]],
    preco_unit: [0, [Validators.required, Validators.min(0)]],
    desconto_valor: [0],
    total_item: [{ value: 0, disabled: false }],
    observacoes: [''],
  });

  itens: PedidoUsoItemUI[] = [];
  loadingItens = false;
  savingItem = false;

  produtoDescricaoAtual = '';
  produtosSugestoes: any[] = [];
  produtoSugestoesAbertas = false;
  carregandoProdutosSugestoes = false;
  produtoConsultaAberta = false;
  produtoConsultaSearch = '';
  produtosConsulta: any[] = [];
  carregandoProdutosConsulta = false;
  produtoSelecionado: any | null = null;

  // ===== lista de pedidos (Uso/Consumo – tipo=2) =====
  search = '';
  pedidosAll: any[] = [];
  pedidosFiltered: any[] = [];
  pedidos: any[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];

  get total(): number {
    return this.pedidosFiltered.length;
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

  ngOnInit(): void {
    this.loadLookups();
    this.loadNaturezasCompra();
    this.loadPedidos();
    this.setupItemFormRecalc();
  }

  // util
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

  // ===== Lookups: lojas / fornecedores / formas =====
  private loadLookups() {
    this.loadingLookups.set(true);

    // LOJAS
    this.lojasApi.list({ ordering: 'nome_loja', page_size: 2000 }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        const list = arr
          .slice()
          .sort((a, b) => (a.nome_loja || '').localeCompare(b.nome_loja || ''))
          .map((l: any) => {
            const id = (l.id ?? l.Idloja) as number;
            const nome = (l.nome_loja || '').toString();
            return {
              id,
              label: `${id} - ${nome}`,
            } as Option;
          })
          .filter(o => !!o.id);

        this.lojas = list;
        this.lojaMap.clear();
        list.forEach(o => {
          const nome = o.label.split(' - ').slice(1).join(' - ') || o.label;
          this.lojaMap.set(o.id, nome);
        });
      },
      error: () => {
        this.lojas = [];
      },
      complete: () => this.loadingLookups.set(false),
    });

    // FORNECEDORES
    this.fornecedoresApi.list({ ordering: 'nome_fornecedor', page_size: 2000 }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        const list = arr
          .slice()
          .sort((a, b) => (a.nome_fornecedor || '').localeCompare(b.nome_fornecedor || ''))
          .map((f: any) => {
            const id = (f.id ?? f.Idfornecedor) as number;
            const nome = (f.nome_fornecedor || '').toString();
            return {
              id,
              label: `${id} - ${nome}`,
            } as Option;
          })
          .filter(o => !!o.id);

        this.fornecedores = list;
        this.fornecedorMap.clear();
        list.forEach(o => {
          const nome = o.label.split(' - ').slice(1).join(' - ') || o.label;
          this.fornecedorMap.set(o.id, nome);
        });
      },
      error: () => {
        this.fornecedores = [];
      },
    });

    // FORMAS DE PAGAMENTO
    this.formasApi.list({ ativo: true }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        this.formas = arr
          .slice()
          .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''))
          .map((f: any) => {
            const codigo = (f.codigo ?? f.Codigo ?? '').toString();
            const desc = (f.descricao ?? f.Descricao ?? '').toString();
            return {
              codigo,
              label: desc ? `${codigo} — ${desc}` : codigo,
            } as FormaOption;
          })
          .filter(o => !!o.codigo);
      },
      error: () => {
        this.formas = [];
      },
    });

    this.unidadesApi.list({ ordering: 'Descricao', page_size: 1000 }).subscribe({
      next: (resp: any) => {
        this.unidades = this.arrayOrResults<Unidade>(resp);
        this.unidadeMap.clear();
        this.unidades.forEach(unidade => {
          const id = Number(unidade.Idunidade || 0);
          if (id) this.unidadeMap.set(id, unidade);
        });
      },
      error: () => {
        this.unidades = [];
        this.unidadeMap.clear();
      },
    });
  }

  private loadNaturezasCompra(): void {
    this.naturezasApi.list({
      page_size: 500,
      ordering: 'codigo',
      natureza_operacao: 'DESPESA',
      ativo: true,
    }).subscribe({
      next: (resp: any) => {
        this.naturezasCompra = this.arrayOrResults<NatLancamento>(resp)
          .filter(n => (n.ativo ?? true) && (n.natureza_operacao || '').toUpperCase() === 'DESPESA')
          .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      },
      error: () => {
        this.naturezasCompra = [];
      },
    });
  }

  naturezaLabel(n: NatLancamento): string {
    const conta = n.plano_contabil_codigo
      ? ` · Conta ${n.plano_contabil_codigo} - ${n.plano_contabil_descricao || ''}`.trim()
      : '';
    return `${n.codigo} - ${n.descricao}${conta}`;
  }

  private sugerirNaturezaUsoConsumo(): number | null {
    const textoPreferido = ['uso', 'consumo', 'material', 'administrativa', 'despesa'];
    const encontrada = this.naturezasCompra.find(n => {
      const alvo = `${n.codigo} ${n.descricao} ${n.categoria_principal} ${n.subcategoria} ${n.categoria_gerencial || ''}`.toLowerCase();
      return textoPreferido.some(term => alvo.includes(term));
    });
    return encontrada?.idnatureza ?? this.naturezasCompra[0]?.idnatureza ?? null;
  }

  // ===== Lista de pedidos (Uso/Consumo – tipo 2) =====
  private loadPedidos() {
    this.loadingPedidos = true;

    this.pedidosApi
      .listar({ tipo: '2', page_size: 500 })
      .subscribe({
        next: (resp: any) => {
          const arr = this.arrayOrResults<any>(resp);
          this.pedidosAll = arr;
          this.applyFilter();
          this.loadingPedidos = false;
        },
        error: () => {
          this.pedidosAll = [];
          this.pedidosFiltered = [];
          this.pedidos = [];
          this.loadingPedidos = false;
        },
      });
  }

  private applyFilter() {
    const term = (this.search || '').toLowerCase().trim();
    let base = this.pedidosAll.slice();

    if (term) {
      base = base.filter(p => {
        const id = String(p.id ?? '');
        const lojaId = Number(p.loja ?? 0);
        const fornId = Number(p.fornecedor ?? 0);

        const lojaNome = (this.lojaMap.get(lojaId) || '').toLowerCase();
        const fornNome = (this.fornecedorMap.get(fornId) || '').toLowerCase();

        return (
          id.includes(term) ||
          lojaNome.includes(term) ||
          fornNome.includes(term)
        );
      });
    }

    this.pedidosFiltered = base;
    this.page = 1;
    this.applyPage();
  }

  private applyPage() {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pedidos = this.pedidosFiltered.slice(start, end);
  }

  onPageSizeChange(sizeStr: string): void {
    const size = Number(sizeStr) || 10;
    this.pageSize = size;
    this.page = 1;
    this.applyPage();
  }
  firstPage(): void {
    if (this.page !== 1) {
      this.page = 1;
      this.applyPage();
    }
  }
  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.applyPage();
    }
  }
  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.applyPage();
    }
  }
  lastPage(): void {
    if (this.page !== this.totalPages) {
      this.page = this.totalPages;
      this.applyPage();
    }
  }

  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.doSearch();
  }
  doSearch(): void {
    this.applyFilter();
  }
  clearSearch(): void {
    this.search = '';
    this.applyFilter();
  }

  // ===== helpers de label =====
  labelLoja(id: number | null | undefined): string {
    if (!id) return '';
    return this.lojaMap.get(id) ? `${id} - ${this.lojaMap.get(id)}` : String(id);
  }

  labelFornecedor(id: number | null | undefined): string {
    if (!id) return '';
    return this.fornecedorMap.get(id) ? `${id} - ${this.fornecedorMap.get(id)}` : String(id);
  }

  // ===== validação do form =====
  isInvalid(controlName: string): boolean {
    const c = this.headerForm.get(controlName);
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.headerForm.controls as any;

    if (f['loja']?.invalid) msgs.push('Loja: obrigatória.');
    if (f['fornecedor']?.invalid) msgs.push('Fornecedor: obrigatório.');
    if (f['emissao']?.invalid) msgs.push('Emissão: obrigatória.');
    if (f['forma_pagamento_codigo']?.invalid) msgs.push('Forma de pagamento: obrigatória.');

    return msgs;
  }

  // ===== ações do form =====
  resetForm() {
    this.submitted = false;
    this.pedidoAtualId.set(null);
    this.headerForm.reset({
      loja: null,
      fornecedor: null,
      emissao: this.hojeISO(),
      previsao_entrega: null,
      forma_pagamento_codigo: null,
      observacoes: '',
    });
    this.itens = [];
    this.limparItem();
  }

  novo() {
    this.resetForm();
    this.consultando = false;
    this.headerForm.enable({ emitEvent: false });
    this.itemForm.enable({ emitEvent: false });
    this.setViewForm();
  }

  cancelar() {
    this.resetForm();
    this.setViewList();
  }

  // ===== PRODUTO (ID ou descrição) =====
  onProdutoBlur() {
    const input = (this.itemForm.get('produto_input')?.value || '').toString().trim();
    if (!input) {
      this.itemForm.patchValue({ produto: null }, { emitEvent: false });
      this.produtoDescricaoAtual = '';
      this.produtoSelecionado = null;
      return;
    }

    const maybeId = Number(input);
    const isId = !isNaN(maybeId);

    if (isId) {
      this.produtosApi.get(maybeId).subscribe({
        next: (prod) => this.setProdutoFromApi(prod as any),
        error: () => this.buscarProdutoPorDescricao(input),
      });
    } else {
      this.buscarProdutoPorDescricao(input);
    }
  }

  private buscarProdutoPorDescricao(texto: string) {
    this.produtosApi.list({ search: texto, page_size: 5, ativo: 'true', tipo_produto: '2,4' }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp).filter(p => ['2', '4'].includes(String(p.tipo_produto)));
        if (!arr.length) {
          this.showError('Produto de uso/consumo ou insumo não encontrado.');
          this.itemForm.patchValue({ produto: null }, { emitEvent: false });
          this.produtoDescricaoAtual = '';
          this.produtoSelecionado = null;
          return;
        }
        this.setProdutoFromApi(arr[0]);
      },
      error: () => {
        this.showError('Erro ao buscar produto.');
      },
    });
  }

  buscarSugestoesProduto(): void {
    const search = (this.itemForm.get('produto_input')?.value || '').toString().trim();
    const produtoAtual = this.itemForm.get('produto')?.value;
    if (search.length < 2) {
      this.produtosSugestoes = [];
      this.produtoSugestoesAbertas = false;
      if (!search) {
        this.itemForm.patchValue({ produto: null }, { emitEvent: false });
        this.produtoDescricaoAtual = '';
        this.produtoSelecionado = null;
      }
      return;
    }

    if (produtoAtual && search === this.produtoDescricaoAtual) {
      this.produtoSugestoesAbertas = false;
      return;
    }

    this.carregandoProdutosSugestoes = true;
    this.produtosApi.list({ search, page_size: 8, ativo: 'true', tipo_produto: '2,4' }).subscribe({
      next: (resp: any) => {
        this.produtosSugestoes = this.arrayOrResults<any>(resp).filter(p => ['2', '4'].includes(String(p.tipo_produto)));
        this.produtoSugestoesAbertas = this.produtosSugestoes.length > 0;
        this.carregandoProdutosSugestoes = false;
      },
      error: () => {
        this.produtosSugestoes = [];
        this.produtoSugestoesAbertas = false;
        this.carregandoProdutosSugestoes = false;
      },
    });
  }

  selecionarProdutoSugestao(prod: any): void {
    this.setProdutoFromApi(prod);
    this.produtosSugestoes = [];
    this.produtoSugestoesAbertas = false;
  }

  abrirConsultaProdutos(): void {
    this.produtoConsultaAberta = !this.produtoConsultaAberta;
    if (this.produtoConsultaAberta && !this.produtosConsulta.length) {
      this.produtoConsultaSearch = (this.itemForm.get('produto_input')?.value || '').toString();
      this.buscarConsultaProdutos();
    }
  }

  buscarConsultaProdutos(): void {
    this.carregandoProdutosConsulta = true;
    this.produtosApi.list({
      search: this.produtoConsultaSearch,
      page_size: 30,
      ativo: 'true',
      tipo_produto: '2,4',
    }).subscribe({
      next: (resp: any) => {
        this.produtosConsulta = this.arrayOrResults<any>(resp)
          .filter(p => ['2', '4'].includes(String(p.tipo_produto)))
          .sort((a, b) => (a.descricao || '').localeCompare(b.descricao || ''));
        this.carregandoProdutosConsulta = false;
      },
      error: () => {
        this.produtosConsulta = [];
        this.carregandoProdutosConsulta = false;
      },
    });
  }

  selecionarProdutoConsulta(prod: any): void {
    this.setProdutoFromApi(prod);
    this.produtoConsultaAberta = false;
    this.produtosConsulta = [];
  }

  fecharSugestoesProdutoComAtraso(): void {
    window.setTimeout(() => {
      this.produtoSugestoesAbertas = false;
    }, 150);
  }

  private setProdutoFromApi(prod: any) {
    if (!['2', '4'].includes((prod.tipo_produto ?? '').toString())) {
      this.showError('Este produto não é de uso/consumo nem insumo de produção.');
      this.itemForm.patchValue({ produto: null }, { emitEvent: false });
      this.produtoDescricaoAtual = '';
      this.produtoSelecionado = null;
      return;
    }

    const id = (prod.Idproduto ?? prod.id) as number;
    const descricao = (prod.descricao ?? '').toString();

    this.itemForm.patchValue(
      {
        produto: id,
        produto_input: descricao,
      },
      { emitEvent: false }
    );

    this.produtoDescricaoAtual = descricao;
    this.produtoSelecionado = prod;
  }

  produtoTipoLabel(prod: any): string {
    return String(prod?.tipo_produto) === '4' ? 'Insumo' : 'Uso/Consumo';
  }

  unidadeProdutoSelecionadoLabel(): string {
    const unidade = this.unidadeProdutoSelecionado();
    if (!unidade) return '';
    return `${unidade.Descricao}${unidade.permite_decimal ? ' - aceita decimal' : ' - somente inteiro'}`;
  }

  // ===== Recalcular total do item =====
  private setupItemFormRecalc() {
    this.itemForm.get('quantidade')?.valueChanges.subscribe(() => {
      this.recalcularTotalItem();
    });
    this.itemForm.get('preco_unit')?.valueChanges.subscribe(() => {
      this.recalcularTotalItem();
    });
    this.itemForm.get('desconto_valor')?.valueChanges.subscribe(() => {
      this.recalcularTotalItem();
    });
  }

  private recalcularTotalItem() {
    const qtd = Number(this.itemForm.get('quantidade')?.value || 0);
    const preco = Number(this.itemForm.get('preco_unit')?.value || 0);
    const desc = Number(this.itemForm.get('desconto_valor')?.value || 0);

    const totalBruto = qtd * preco;
    const total = totalBruto - desc;

    this.itemForm.patchValue(
      {
        total_item: total,
      },
      { emitEvent: false }
    );
  }

  // ===== Itens – limpar / editar / remover =====
  limparItem() {
    this.itemForm.reset({
      id: null,
      produto_input: '',
      produto: null,
      quantidade: 0,
      preco_unit: 0,
      desconto_valor: 0,
      total_item: 0,
      observacoes: '',
    });
    this.produtoDescricaoAtual = '';
    this.produtoSelecionado = null;
    this.produtosSugestoes = [];
    this.produtoSugestoesAbertas = false;
    this.produtoConsultaAberta = false;
    this.produtoConsultaSearch = '';
    this.produtosConsulta = [];
  }

  editarItem(it: PedidoUsoItemUI) {
    this.itemForm.reset({
      id: it.id,
      produto_input: it.produto_label || '',
      produto: it.produto,
      quantidade: it.quantidade,
      preco_unit: it.preco_unit,
      desconto_valor: it.desconto_valor,
      total_item: it.total_item,
      observacoes: it.observacoes || '',
    });

    this.produtoDescricaoAtual = it.produto_label;
    this.produtoSelecionado = null;
    if (it.produto) {
      this.produtosApi.get(it.produto).subscribe({
        next: prod => this.produtoSelecionado = prod as any,
        error: () => this.produtoSelecionado = null,
      });
    }
  }

  removerItem(it: PedidoUsoItemUI) {
    if (!it.id) return;
    this.confirmModal = {
      action: 'removerItem',
      title: 'Remover item',
      text: 'Confirma a remoção deste item do pedido?',
      item: it,
    };
  }

  confirmarAcao(): void {
    const modal = this.confirmModal;
    if (!modal) return;
    if (modal.action === 'removerItem' && modal.item) {
      this.executarRemocaoItem(modal.item);
      return;
    }
    if (modal.action === 'excluirPedido' && modal.pedido) {
      this.executarExclusaoPedido(modal.pedido);
      return;
    }
    if (modal.action === 'cancelarPedido' && modal.pedido) {
      this.executarCancelamentoPedido(modal.pedido);
    }
  }

  fecharConfirmacao(): void {
    this.confirmModal = null;
  }

  private executarRemocaoItem(it: PedidoUsoItemUI): void {
    this.pedidosApi.deleteItem(it.id!).subscribe({
      next: () => {
        this.confirmModal = null;
        const pedidoId = this.pedidoAtualId();
        if (pedidoId) this.carregarItensPedido(pedidoId);
      },
      error: () => {
        this.showError('Erro ao remover item.');
      },
    });
  }

  // ===== Itens – adicionar (cria pedido se precisar) =====
  adicionarItem() {
    this.submitted = true;

    if (this.headerForm.invalid) {
      this.showError('Preencha o cabeçalho (loja, fornecedor, emissão, forma) antes de adicionar itens.');
      return;
    }

    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    const pedidoIdAtual = this.pedidoAtualId();
    if (!pedidoIdAtual) {
      this.criarPedidoEAdicionarItem();
    } else {
      this.salvarItemNoBackend(pedidoIdAtual);
    }
  }

  private criarPedidoEAdicionarItem() {
    const v = this.headerForm.value;
    const payloadHeader: any = {
      tipo: '2', // USO/CONSUMO
      loja: v.loja,
      fornecedor: v.fornecedor,
      emissao: v.emissao,
      previsao_entrega: v.previsao_entrega,
      observacoes: v.observacoes,
    };

    this.savingItem = true;

    this.pedidosApi.createHeader(payloadHeader).subscribe({
      next: (pedido: any) => {
        const idPedido = (pedido.id ?? pedido.Id) as number;
        this.pedidoAtualId.set(idPedido);

        const codigoForma = v.forma_pagamento_codigo;
        if (codigoForma) {
          this.pedidosApi.setFormaPagamento(idPedido, codigoForma).subscribe({
            next: () => this.salvarItemNoBackend(idPedido),
            error: () => {
              this.savingItem = false;
              this.showError('Pedido criado, mas houve erro ao aplicar a forma de pagamento.');
            },
          });
        } else {
          this.salvarItemNoBackend(idPedido);
        }
      },
      error: () => {
        this.savingItem = false;
        this.showError('Erro ao criar o pedido.');
      },
    });
  }

  private salvarItemNoBackend(pedidoId: number) {
    const raw = this.itemForm.getRawValue();
    if (!this.validarQuantidadePorUnidade()) {
      this.savingItem = false;
      return;
    }

    const payload: any = {
      pedido: pedidoId,
      produto: raw.produto,
      descricao_livre: this.produtoDescricaoAtual || raw.produto_input || null,
      qtd: raw.quantidade,
      preco_unit: raw.preco_unit || 0,
      desconto_valor: raw.desconto_valor || 0,
      observacoes: raw.observacoes || null,
    };

    const itemId = raw.id as number | null;

    const obs = itemId
      ? this.pedidosApi.updateItem(itemId, payload)
      : this.pedidosApi.createItem(payload);

    this.savingItem = true;
    obs.subscribe({
      next: () => {
        this.savingItem = false;
        this.carregarItensPedido(pedidoId);
        this.recalcularTotalItem();
        this.limparItem();
      },
      error: () => {
        this.savingItem = false;
        this.showError('Erro ao salvar item.');
      },
    });
  }

  private unidadeProdutoSelecionado(): Unidade | null {
    const produto = this.produtoSelecionado;
    const unidadeId = Number(produto?.unidade || 0);
    return unidadeId ? (this.unidadeMap.get(unidadeId) || null) : null;
  }

  private validarQuantidadePorUnidade(): boolean {
    const unidade = this.unidadeProdutoSelecionado();
    const quantidade = Number(this.itemForm.get('quantidade')?.value || 0);
    if (unidade && !unidade.permite_decimal && !Number.isInteger(quantidade)) {
      this.showError(`A unidade ${unidade.Descricao} não aceita quantidade decimal.`);
      return false;
    }
    return true;
  }

  private carregarItensPedido(pedidoId: number) {
    this.loadingItens = true;
    this.pedidosApi.listItensByPedido(pedidoId).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        this.itens = arr.map((it: any) => {
          const produtoId = it.produto as number;

          const ref = (it.produto_referencia ?? it.referencia ?? '') as string;
          const desc = (it.produto_descricao ?? it.descricao ?? '') as string;
          const livre = (it.descricao_livre ?? '') as string;
          const label = livre || desc || ref || String(produtoId || '');

          return {
            id: it.id,
            pedido: pedidoId,
            produto: produtoId,
            produto_label: label,
            quantidade: Number(it.qtd || it.quantidade || 0),
            preco_unit: Number(it.preco_unit || 0),
            desconto_valor: Number(it.desconto_valor || 0),
            total_item: Number(it.total_item || 0),
            observacoes: it.observacoes ?? null,
          } as PedidoUsoItemUI;
        });
        this.loadingItens = false;
      },
      error: () => {
        this.itens = [];
        this.loadingItens = false;
      },
    });
  }

  // ===== Ações na LISTA: editar / excluir / aprovar / cancelar =====

  private isAberto(p: any): boolean {
    return (p.status ?? '').toUpperCase() === 'AB';
  }

  editarPedido(p: any) {
    if (!this.isAberto(p)) {
      this.showError('Pedidos aprovados ou cancelados não podem ser editados.');
      return;
    }

    this.abrirPedido(p, false);
  }

  consultarPedido(p: any) {
    this.abrirPedido(p, true);
  }

  private abrirPedido(p: any, somenteConsulta: boolean) {
    this.submitted = false;
    this.consultando = somenteConsulta;
    this.pedidoAtualId.set(p.id);
    this.headerForm.enable({ emitEvent: false });
    this.itemForm.enable({ emitEvent: false });

    this.headerForm.reset({
      loja: p.loja ?? null,
      fornecedor: p.fornecedor ?? null,
      emissao: p.emissao ?? this.hojeISO(),
      previsao_entrega: p.previsao_entrega ?? null,
      forma_pagamento_codigo: p.forma_pagamento ?? null,
      observacoes: p.observacoes ?? '',
    });

    this.itens = [];
    this.carregarItensPedido(p.id);
    this.setViewForm();

    if (somenteConsulta) {
      this.headerForm.disable({ emitEvent: false });
      this.itemForm.disable({ emitEvent: false });
    }
  }

  excluirPedido(p: any) {
    if (!this.isAberto(p)) {
      this.showError('Só é permitido excluir pedidos em aberto (AB).');
      return;
    }
    this.confirmModal = {
      action: 'excluirPedido',
      title: 'Excluir pedido',
      text: `Confirma a exclusão do pedido ${p.id}?`,
      pedido: p,
    };
  }

  private executarExclusaoPedido(p: any): void {
    this.pedidosApi.delete(p.id).subscribe({
      next: () => {
        this.confirmModal = null;
        this.showSuccess('Pedido excluído com sucesso.');
        this.loadPedidos();
        if (this.pedidoAtualId() === p.id) {
          this.resetForm();
          this.setViewList();
        }
      },
      error: () => {
        this.showError('Erro ao excluir pedido.');
      },
    });
  }

  aprovarPedido(p: any) {
    if (!this.isAberto(p)) {
      this.showError('Só é possível aprovar pedidos em aberto (AB).');
      return;
    }
    this.aprovarModal = { pedido: p, idnatureza: this.sugerirNaturezaUsoConsumo() };
  }

  confirmarAprovacao(): void {
    const p = this.aprovarModal?.pedido;
    const idnatureza = Number(this.aprovarModal?.idnatureza || 0);
    if (!p) return;
    if (!idnatureza || Number.isNaN(idnatureza)) {
      this.showError('Selecione a natureza de lançamento para aprovar o pedido.');
      return;
    }

    this.pedidosApi.aprovar(p.id, idnatureza).subscribe({
      next: () => {
        this.aprovarModal = null;
        this.showSuccess('Pedido aprovado com sucesso.');
        this.loadPedidos();
        if (this.pedidoAtualId() === p.id) {
          this.resetForm();
          this.setViewList();
        }
      },
      error: () => {
        this.showError('Erro ao aprovar pedido.');
      },
    });
  }

  fecharAprovacao(): void {
    this.aprovarModal = null;
  }

  editarNaturezaPedido(p: any): void {
    if (!['AP', 'AT'].includes((p.status || '').toUpperCase())) {
      this.showError('A natureza só pode ser editada em pedido aprovado ou atendido.');
      return;
    }
    this.naturezaModal = {
      pedido: p,
      idnatureza: p.idnatureza ?? this.sugerirNaturezaUsoConsumo(),
    };
  }

  confirmarNatureza(): void {
    const p = this.naturezaModal?.pedido;
    const idnatureza = Number(this.naturezaModal?.idnatureza || 0);
    if (!p) return;
    if (!idnatureza || Number.isNaN(idnatureza)) {
      this.showError('Selecione a natureza de lançamento.');
      return;
    }

    this.pedidosApi.alterarNatureza(p.id, idnatureza).subscribe({
      next: () => {
        this.naturezaModal = null;
        this.showSuccess('Natureza do pedido atualizada.');
        this.loadPedidos();
      },
      error: (err) => {
        this.showError(err?.error?.detail || 'Erro ao alterar natureza do pedido.');
      },
    });
  }

  fecharNatureza(): void {
    this.naturezaModal = null;
  }

  cancelarPedido(p: any) {
    if (!this.isAberto(p)) {
      this.showError('Só é possível cancelar pedidos em aberto (AB).');
      return;
    }
    this.confirmModal = {
      action: 'cancelarPedido',
      title: 'Cancelar pedido',
      text: `Confirma o cancelamento do pedido ${p.id}?`,
      pedido: p,
    };
  }

  private executarCancelamentoPedido(p: any): void {
    this.pedidosApi.cancelar(p.id).subscribe({
      next: () => {
        this.confirmModal = null;
        this.showSuccess('Pedido cancelado com sucesso.');
        this.loadPedidos();
        if (this.pedidoAtualId() === p.id) {
          this.resetForm();
          this.setViewList();
        }
      },
      error: () => {
        this.showError('Erro ao cancelar pedido.');
      },
    });
  }

  // ===== Salvar pedido (finalizar) =====
  salvarPedido() {
    this.submitted = true;

    if (this.headerForm.invalid) {
      this.showError('Preencha o cabeçalho antes de gravar o pedido.');
      return;
    }
    const v = this.headerForm.value;
    if (!v.forma_pagamento_codigo) {
      this.showError('Informe a forma de pagamento.');
      return;
    }
    if (!this.itens.length) {
      this.showError('Inclua pelo menos um item antes de gravar o pedido.');
      return;
    }

    const pedidoId = this.pedidoAtualId();
    if (!pedidoId) {
      this.showError('Inclua pelo menos um item para gerar o pedido (cabeçalho + itens).');
      return;
    }

    this.saving = true;
    this.pedidosApi.setFormaPagamento(pedidoId, v.forma_pagamento_codigo).subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess('Pedido gravado com sucesso.');
        this.loadPedidos();
        this.resetForm();
        this.setViewList();
      },
      error: () => {
        this.saving = false;
        this.showError('Pedido gravado, mas houve erro ao recalcular as parcelas.');
      },
    });
  }

  private showSuccess(message: string): void {
    this.successMsg = message;
    this.errorMsg = '';
  }

  private showError(message: string): void {
    this.errorMsg = message;
    this.successMsg = '';
  }
}
