// src/app/features/pedidos-revenda/pedidos-revenda.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';

import { LojasService } from '../../core/services/lojas.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { PedidosCompraService } from '../../core/services/pedidos-compra.service';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { CoresService } from '../../core/services/cores.service';
import { PacksService } from '../../core/services/pack.service';
import { PackItensService } from '../../core/services/pack-item.service';
import { environment } from '../../../environments/environment';

type Option = { id: number; label: string };
type FormaOption = { codigo: string; label: string };
type CorOption = { id: number; label: string };

interface PedidoCompraItemUI {
  id: number | null;
  pedido: number;
  produto: number | null;
  produto_referencia: string;
  cor: number | null;
  cor_nome: string;
  pack: number | null;
  pack_nome: string;
  n_packs: number;
  quantidade: number;
  preco_unit: number;
  desconto_valor: number;
  total_item: number;
  observacoes?: string | null;
}

@Component({
  selector: 'app-pedidos-revenda',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './pedidos-revenda.component.html',
  styleUrls: ['./pedidos-revenda.component.css'],
})
export class PedidosRevendaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private lojasApi = inject(LojasService);
  private formasApi = inject(FormasPagamentoService);
  private pedidosApi = inject(PedidosCompraService);
  private fornecedoresApi = inject(FornecedoresService);
  private produtosApi = inject(ProdutosService);
  private coresApi = inject(CoresService);
  private packsApi = inject(PacksService);
  private packItensApi = inject(PackItensService);
  private http = inject(HttpClient);

  // navegação: list / form
  view = signal<'list' | 'form'>('list');
  setViewList() {
    this.view.set('list');
    this.pedidoAtualId.set(null);
  }
  setViewForm() {
    this.view.set('form');
  }

  // estado geral
  submitted = false;
  saving = false;
  loadingLookups = signal(false);
  loadingPedidos = false;

  // lookups
  lojas: Option[] = [];
  fornecedores: Option[] = [];
  formas: FormaOption[] = [];

  private lojaMap = new Map<number, string>();
  private fornecedorMap = new Map<number, string>();

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

  // ===== Itens =====
  itemForm: FormGroup = this.fb.group({
    id: [null],
    produto_input: ['', Validators.required], // ref ou ID
    produto: [null, Validators.required],
    cor: [null, Validators.required],
    pack: [null, Validators.required],
    n_packs: [1, [Validators.required, Validators.min(1)]],
    quantidade: [{ value: 0, disabled: false }],
    preco_unit: [0, [Validators.required, Validators.min(0)]],
    desconto_valor: [0],
    total_item: [{ value: 0, disabled: false }],
    observacoes: [''],
  });

  itens: PedidoCompraItemUI[] = [];
  loadingItens = false;
  savingItem = false;

  // produto / cor / pack auxiliares
  produtoDescricaoAtual = '';
  coresAll: CorOption[] = [];
  coresProduto: CorOption[] = [];

  // quantidade de 1 pack (somatório dos itens do pack)
  private packQtdUnit = 0;

  // ===== lista de pedidos (client-side) =====
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
    this.loadAllCores();
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
  }

  // ===== Cores (todas) =====
  private loadAllCores() {
    this.coresApi.list({ ordering: 'Descricao', page_size: 2000 }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        this.coresAll = arr
          .map((c: any) => {
            const id = (c.Idcor ?? c.id) as number;
            const nome = (c.Descricao ?? c.Cor ?? '').toString();
            return { id, label: nome } as CorOption;
          })
          .filter(c => !!c.id);
        // fallback: enquanto não escolher produto, deixa todas
        this.coresProduto = this.coresAll.slice();
      },
      error: () => {
        this.coresAll = [];
        this.coresProduto = [];
      },
    });
  }

  // ===== Lista de pedidos (Revenda) =====
  private loadPedidos() {
    this.loadingPedidos = true;

    this.pedidosApi
      .listar({ tipo: '1', page_size: 500 })
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
    this.setViewForm();
  }

  cancelar() {
    this.resetForm();
    this.setViewList();
  }

  // ===== PRODUTO (ref ou ID) → produto + cores do produto =====
  onProdutoBlur() {
    const input = (this.itemForm.get('produto_input')?.value || '').toString().trim();
    if (!input) {
      this.itemForm.patchValue({ produto: null }, { emitEvent: false });
      this.produtoDescricaoAtual = '';
      this.coresProduto = this.coresAll.slice();
      return;
    }

    const maybeId = Number(input);
    const isId = !isNaN(maybeId);

    if (isId) {
      this.produtosApi.get(maybeId).subscribe({
        next: (prod) => this.setProdutoFromApi(prod as any),
        error: () => this.buscarProdutoPorReferencia(input),
      });
    } else {
      this.buscarProdutoPorReferencia(input);
    }
  }

  private buscarProdutoPorReferencia(refOrDesc: string) {
    this.produtosApi.list({ search: refOrDesc, page_size: 5 }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        if (!arr.length) {
          alert('Produto não encontrado.');
          this.itemForm.patchValue({ produto: null }, { emitEvent: false });
          this.produtoDescricaoAtual = '';
          this.coresProduto = this.coresAll.slice();
          return;
        }
        this.setProdutoFromApi(arr[0]);
      },
      error: () => {
        alert('Erro ao buscar produto.');
      },
    });
  }

  private setProdutoFromApi(prod: any) {
    const id = (prod.Idproduto ?? prod.id) as number;
    const referencia = (prod.referencia ?? '').toString();
    const descricao = (prod.descricao ?? '').toString();

    this.itemForm.patchValue(
      {
        produto: id,
        produto_input: referencia || String(id),
      },
      { emitEvent: false }
    );

    this.produtoDescricaoAtual = descricao;
    this.carregarCoresDoProduto(id);
  }

  // ===== CORES DO PRODUTO (filtradas via produto_produtodetalhe) =====
  private carregarCoresDoProduto(produtoId: number) {
    if (!produtoId) {
      this.coresProduto = this.coresAll.slice();
      this.itemForm.patchValue({ cor: null }, { emitEvent: false });
      return;
    }

    const url = `${environment.apiBaseUrl}/produto/produto-detalhe/`;
    let params = new HttpParams().set('produto', String(produtoId));
    params = params.set('page_size', '2000');

    this.http.get<any>(url, { params }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        const corIds = new Set<number>();
        arr.forEach((det: any) => {
          const cid = (det.idcor ?? det.Idcor ?? det.idcor_id ?? det.idcor_id_id) as number | undefined;
          if (cid) corIds.add(cid);
        });

        if (!corIds.size) {
          // se por algum motivo não vier nada, não trava: mostra todas
          this.coresProduto = this.coresAll.slice();
        } else {
          this.coresProduto = this.coresAll.filter(c => corIds.has(c.id));
        }

        const currentCor = this.itemForm.get('cor')?.value as number | null;
        if (currentCor && !this.coresProduto.some(c => c.id === currentCor)) {
          this.itemForm.patchValue({ cor: null }, { emitEvent: false });
        }
      },
      error: () => {
        // fallback: todas as cores
        this.coresProduto = this.coresAll.slice();
      },
    });
  }

  // ===== PACK → quantidade correta (1 pack) =====
  onPackBlur() {
    const raw = this.itemForm.get('pack')?.value;
    const packId = Number(raw);
    if (!packId) {
      this.packQtdUnit = 0;
      this.recalcularQuantidadeETotal();
      return;
    }

    // carrega itens do pack para calcular a quantidade de UM pack
    this.packItensApi.list({ pack: packId }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        this.packQtdUnit = arr.reduce(
          (sum: number, it: any) => sum + Number(it.qtd || 0),
          0
        );
        this.recalcularQuantidadeETotal();
      },
      error: () => {
        this.packQtdUnit = 0;
        this.recalcularQuantidadeETotal();
      },
    });
  }

  private setupItemFormRecalc() {
    this.itemForm.get('n_packs')?.valueChanges.subscribe(() => {
      this.recalcularQuantidadeETotal();
    });
    this.itemForm.get('preco_unit')?.valueChanges.subscribe(() => {
      this.recalcularQuantidadeETotal();
    });
    this.itemForm.get('desconto_valor')?.valueChanges.subscribe(() => {
      this.recalcularQuantidadeETotal();
    });
  }

  private recalcularQuantidadeETotal() {
    const n_packs = Number(this.itemForm.get('n_packs')?.value || 0);
    const preco = Number(this.itemForm.get('preco_unit')?.value || 0);
    const desc = Number(this.itemForm.get('desconto_valor')?.value || 0);

    const qtd = this.packQtdUnit > 0 && n_packs > 0 ? this.packQtdUnit * n_packs : 0;
    const totalBruto = qtd * preco;
    const total = totalBruto - desc;

    this.itemForm.patchValue(
      {
        quantidade: qtd,
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
      cor: null,
      pack: null,
      n_packs: 1,
      quantidade: 0,
      preco_unit: 0,
      desconto_valor: 0,
      total_item: 0,
      observacoes: '',
    });
    this.produtoDescricaoAtual = '';
    this.packQtdUnit = 0;
  }

  editarItem(it: PedidoCompraItemUI) {
    this.itemForm.reset({
      id: it.id,
      produto_input: it.produto_referencia || String(it.produto || ''),
      produto: it.produto,
      cor: it.cor,
      pack: it.pack,
      n_packs: it.n_packs,
      quantidade: it.quantidade,
      preco_unit: it.preco_unit,
      desconto_valor: it.desconto_valor,
      total_item: it.total_item,
      observacoes: it.observacoes || '',
    });

    this.packQtdUnit = it.n_packs ? it.quantidade / it.n_packs : 0;
    if (it.produto) {
      this.carregarCoresDoProduto(it.produto);
    }
  }

  removerItem(it: PedidoCompraItemUI) {
    if (!it.id) return;
    if (!confirm('Remover este item?')) return;

    this.pedidosApi.deleteItem(it.id).subscribe({
      next: () => {
        const pedidoId = this.pedidoAtualId();
        if (pedidoId) this.carregarItensPedido(pedidoId);
      },
      error: () => {
        alert('Erro ao remover item.');
      },
    });
  }

  // ===== Itens – adicionar (cria pedido se precisar) =====
  adicionarItem() {
    this.submitted = true;

    if (this.headerForm.invalid) {
      alert('Preencha o cabeçalho (loja, fornecedor, emissão, forma) antes de adicionar itens.');
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
      tipo: '1',
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
              alert('Pedido criado, mas houve erro ao aplicar a forma de pagamento.');
            },
          });
        } else {
          this.salvarItemNoBackend(idPedido);
        }
      },
      error: () => {
        this.savingItem = false;
        alert('Erro ao criar o pedido.');
      },
    });
  }

  private salvarItemNoBackend(pedidoId: number) {
    const raw = this.itemForm.getRawValue();

    const payload: any = {
      pedido: pedidoId,
      produto: raw.produto,
      cor: raw.cor,
      pack: raw.pack,
      n_packs: raw.n_packs,
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
        this.recalcularQuantidadeETotal(); // garante quantidade/total coerentes na tela
        this.limparItem();
      },
      error: () => {
        this.savingItem = false;
        alert('Erro ao salvar item.');
      },
    });
  }

  private carregarItensPedido(pedidoId: number) {
    this.loadingItens = true;
    this.pedidosApi.listItensByPedido(pedidoId).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        this.itens = arr.map((it: any) => {
          const produtoId = it.produto as number;
          const corId = it.cor as number;
          const packId = it.pack as number;

          const corNome = this.coresAll.find(c => c.id === corId)?.label || String(corId || '');
          const packNomeBackend = (it.pack_nome ?? it.pack_descricao ?? '') as string;
          const packNome = packNomeBackend
            ? packNomeBackend.substring(0, 15)
            : String(packId || '');

          const ref = (it.produto_referencia ?? it.referencia ?? '') as string;

          return {
            id: it.id,
            pedido: pedidoId,
            produto: produtoId,
            produto_referencia: ref || String(produtoId || ''),
            cor: corId,
            cor_nome: corNome,
            pack: packId,
            pack_nome: packNome,
            n_packs: Number(it.n_packs || 0),
            quantidade: Number(it.qtd || it.quantidade || 0),
            preco_unit: Number(it.preco_unit || 0),
            desconto_valor: Number(it.desconto_valor || 0),
            total_item: Number(it.total_item || 0),
            observacoes: it.observacoes ?? null,
          } as PedidoCompraItemUI;
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
      alert('Pedidos Aprovados ou Cancelados não podem ser editados.');
      return;
    }

    this.submitted = false;
    this.pedidoAtualId.set(p.id);

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
  }

  excluirPedido(p: any) {
    if (!this.isAberto(p)) {
      alert('Só é permitido excluir pedidos em aberto (AB).');
      return;
    }
    if (!confirm(`Confirma a exclusão do pedido ${p.id}?`)) return;

    this.pedidosApi.delete(p.id).subscribe({
      next: () => {
        alert('Pedido excluído com sucesso.');
        this.loadPedidos();
        if (this.pedidoAtualId() === p.id) {
          this.resetForm();
          this.setViewList();
        }
      },
      error: () => {
        alert('Erro ao excluir pedido.');
      },
    });
  }

  aprovarPedido(p: any) {
    if (!this.isAberto(p)) {
      alert('Só é possível aprovar pedidos em aberto (AB).');
      return;
    }

    const raw = prompt('Informe o ID da natureza para aprovação:');
    if (!raw) return;

    const idnatureza = Number(raw);
    if (!idnatureza || Number.isNaN(idnatureza)) {
      alert('ID de natureza inválido.');
      return;
    }

    this.pedidosApi.aprovar(p.id, idnatureza).subscribe({
      next: () => {
        alert('Pedido aprovado com sucesso.');
        this.loadPedidos();
        // se estiver editando este pedido, volta para a lista
        if (this.pedidoAtualId() === p.id) {
          this.resetForm();
          this.setViewList();
        }
      },
      error: () => {
        alert('Erro ao aprovar pedido.');
      },
    });
  }

  cancelarPedido(p: any) {
    if (!this.isAberto(p)) {
      alert('Só é possível cancelar pedidos em aberto (AB).');
      return;
    }
    if (!confirm(`Confirma o cancelamento do pedido ${p.id}?`)) return;

    this.pedidosApi.cancelar(p.id).subscribe({
      next: () => {
        alert('Pedido cancelado com sucesso.');
        this.loadPedidos();
        if (this.pedidoAtualId() === p.id) {
          this.resetForm();
          this.setViewList();
        }
      },
      error: () => {
        alert('Erro ao cancelar pedido.');
      },
    });
  }

  // ===== Salvar pedido (finalizar) =====
  salvarPedido() {
    this.submitted = true;

    if (this.headerForm.invalid) {
      alert('Preencha o cabeçalho antes de gravar o pedido.');
      return;
    }
    const v = this.headerForm.value;
    if (!v.forma_pagamento_codigo) {
      alert('Informe a forma de pagamento.');
      return;
    }
    if (!this.itens.length) {
      alert('Inclua pelo menos um item antes de gravar o pedido.');
      return;
    }

    const pedidoId = this.pedidoAtualId();
    if (!pedidoId) {
      alert('Inclua pelo menos um item para gerar o pedido (cabeçalho + itens).');
      return;
    }

    this.saving = true;
    this.pedidosApi.setFormaPagamento(pedidoId, v.forma_pagamento_codigo).subscribe({
      next: () => {
        this.saving = false;
        alert('Pedido gravado com sucesso.');
        this.loadPedidos();
        this.resetForm();
        this.setViewList();
      },
      error: () => {
        this.saving = false;
        alert('Pedido gravado, mas houve erro ao recalcular as parcelas.');
      },
    });
  }
}
