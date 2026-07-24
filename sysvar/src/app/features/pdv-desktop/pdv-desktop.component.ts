import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { Caixa } from '../../core/models/caixa';
import { Cliente } from '../../core/models/clientes';
import { Funcionario } from '../../core/models/funcionario';
import { Loja } from '../../core/models/loja';
import { Produto } from '../../core/models/produto';
import { CaixasService } from '../../core/services/caixas.service';
import { ClientesService } from '../../core/services/clientes.service';
import { FuncionariosService } from '../../core/services/funcionarios.service';
import { LojasService } from '../../core/services/lojas.service';
import { ProdutoDetalheService, ProdutoSku } from '../../core/services/produto-detalhe.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { PdvOfflineCatalogService } from '../../core/services/pdv-offline-catalog.service';
import { PdvOfflineQueueService } from '../../core/services/pdv-offline-queue.service';
import { PdvLocalCaixaService } from '../../core/services/pdv-local-caixa.service';
import { VendaPdvService } from '../../core/services/venda-pdv.service';
import { RelatorioPagamentoVenda, RelatorioVendedor } from '../../core/models/venda-pdv';
import { ElectronBridgeService } from '../../core/electron/electron-bridge.service';
import { PdvConnectivityService } from '../../core/connectivity/pdv-connectivity.service';
import { PdvDesktopStatus, PdvProdutoLocal } from '../../core/electron/sysvar-pdv-api';
import { TipoDespesaPdv } from '../../core/models/tipo-despesa-pdv';
import { TipoDespesaPdvService } from '../../core/services/tipo-despesa-pdv.service';
import { MovimentacaoFinanceira } from '../../core/models/movimentacao-financeira';
import { MovimentacoesFinanceirasService } from '../../core/services/movimentacoes-financeiras.service';

interface PdvProdutoLinha {
  item: number;
  produto: Produto;
  sku?: ProdutoSku;
  codigo: string;
  descricao: string;
  qtd: number;
  unidade: string;
  valorUnitario: number;
  total: number;
  estoque: number;
}

interface PdvCarrinhoItem {
  produto: Produto;
  sku?: ProdutoSku;
  codigo: string;
  descricao: string;
  cor: string;
  tamanho: string;
  qtd: number;
  valorUnitario: number;
  desconto: number;
  total: number;
  imagem: string;
  estoque: number;
}

interface PdvPagamentoLinha {
  forma: 'DINHEIRO' | 'CARTAO' | 'PIX';
  descricao: string;
  valor: number;
  autorizacao?: string;
}

@Component({
  selector: 'app-pdv-desktop',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pdv-desktop.component.html',
  styleUrls: ['./pdv-desktop.component.css']
})
export class PdvDesktopComponent implements OnInit {
  private auth = inject(AuthService);
  private produtosApi = inject(ProdutosService);
  private skusApi = inject(ProdutoDetalheService);
  private lojasApi = inject(LojasService);
  private caixasApi = inject(CaixasService);
  private clientesApi = inject(ClientesService);
  private funcionariosApi = inject(FuncionariosService);
  private vendasApi = inject(VendaPdvService);
  private offlineCatalog = inject(PdvOfflineCatalogService);
  private offlineQueue = inject(PdvOfflineQueueService);
  private caixaLocal = inject(PdvLocalCaixaService);
  private bridge = inject(ElectronBridgeService);
  private connectivity = inject(PdvConnectivityService);
  private tiposDespesaApi = inject(TipoDespesaPdvService);
  private movimentacoesApi = inject(MovimentacoesFinanceirasService);

  busca = '';
  cliente = 'F2 - CONSUMIDOR FINAL';
  vendedor = 'FERNANDO';
  tabela = 'VAREJO';
  caixa = 'Caixa 01';
  hora = '';
  data = '';
  modoLista: 'grade' | 'lista' = 'lista';
  status: PdvDesktopStatus | null = null;
  carregando = false;
  produtos: PdvProdutoLinha[] = [];
  carrinho: PdvCarrinhoItem[] = [];
  produtoSelecionado: PdvProdutoLinha | null = null;
  itemSelecionado: PdvCarrinhoItem | null = null;
  desconto = 0;
  totalRecebido = 0;
  mensagem = '';
  mensagemAlerta = '';
  finalizando = false;
  formaPagamento: 'DINHEIRO' | 'CARTAO' | 'PIX' = 'DINHEIRO';
  tipoCartao: 'CREDITO' | 'DEBITO' = 'CREDITO';
  autorizacaoCartao = '';
  valorPagamento = 0;
  pagamentosVenda: PdvPagamentoLinha[] = [];
  numeroVendaAtual = 'Venda em aberto';
  lojas: Loja[] = [];
  caixas: Caixa[] = [];
  clientes: Cliente[] = [];
  vendedores: Funcionario[] = [];
  lojaId: number | null = null;
  caixaId: number | null = null;
  clienteId: number | null = null;
  buscaCliente = '';
  mostrarSugestoesCliente = false;
  vendedorId: number | null = null;
  pendentesOffline = 0;
  sincronizacaoOffline = '';
  atualizandoCatalogo = false;
  caixaLocalAberto = false;
  private buscaTimer: ReturnType<typeof setTimeout> | null = null;
  modalAtalho: '' | 'cliente' | 'vendedor' | 'resumo' | 'pagamentos' | 'preco' | 'cancelar-venda' | 'despesa' | 'pendentes' | 'fechamento' = '';
  buscaModal = '';
  resumoVendedores: RelatorioVendedor[] = [];
  resumoPagamentos: RelatorioPagamentoVenda[] = [];
  despesasCaixaDia: MovimentacaoFinanceira[] = [];
  resumoCarregando = false;
  resumoPagamentosCarregando = false;
  produtosPreco: PdvProdutoLinha[] = [];
  tiposDespesaPdv: TipoDespesaPdv[] = [];
  private readonly vendaRascunhoKey = 'sysvar-pdv-venda-em-andamento';
  private readonly despesasOfflineKey = 'sysvar-pdv-despesas-offline';
  despesaForm = {
    operacao: 'DESPESA' as 'DESPESA' | 'SANGRIA' | 'SUPRIMENTO',
    tipoDespesa: null as number | null,
    valor: 0,
    documento: '',
    historico: ''
  };

  @HostListener('document:keydown.enter', ['$event'])
  fecharMensagemPorEnter(event: KeyboardEvent): void {
    if (!this.mensagemAlerta) return;
    event.preventDefault();
    event.stopPropagation();
    this.mensagemAlerta = '';
  }

  @HostListener('document:keydown.f10', ['$event'])
  fecharCaixaPorTecla(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.fecharCaixaAtalho();
  }

  @HostListener('document:keydown.f2', ['$event'])
  atalhoF2(event: KeyboardEvent): void { this.abrirAtalho(event, 'cliente'); }

  @HostListener('document:keydown.f3', ['$event'])
  atalhoF3(event: KeyboardEvent): void { this.abrirAtalho(event, 'vendedor'); }

  @HostListener('document:keydown.f4', ['$event'])
  atalhoF4(event: KeyboardEvent): void { this.abrirAtalho(event, 'resumo'); }

  @HostListener('document:keydown.f5', ['$event'])
  atalhoF5(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.cancelarItemSelecionado();
  }

  @HostListener('document:keydown.f6', ['$event'])
  atalhoF6(event: KeyboardEvent): void { this.abrirAtalho(event, 'cancelar-venda'); }

  @HostListener('document:keydown.f7', ['$event'])
  atalhoF7(event: KeyboardEvent): void { this.abrirAtalho(event, 'preco'); }

  @HostListener('document:keydown.f8', ['$event'])
  atalhoF8(event: KeyboardEvent): void { this.abrirAtalho(event, 'despesa'); }

  @HostListener('document:keydown.f9', ['$event'])
  atalhoF9(event: KeyboardEvent): void { this.abrirAtalho(event, 'pagamentos'); }

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.vendedor = user?.first_name || user?.username || 'FERNANDO';
    this.atualizarRelogio();
    setInterval(() => this.atualizarRelogio(), 1000);
    this.connectivity.status$.subscribe(s => this.status = s);
    this.carregarContexto();
    this.atualizarPendentesOffline();
    this.carregarTiposDespesa();
    this.buscarProdutos();
  }

  carregarContexto(): void {
    forkJoin({
      lojas: this.lojasApi.list({ page_size: 100 }),
      caixas: this.caixasApi.list({ ativo: true }),
      clientes: this.clientesApi.list({ page_size: 100, ativo: 'true' }),
      vendedores: this.funcionariosApi.list({ page_size: 200 })
    }).subscribe({
      next: data => {
        this.lojas = this.unwrap<Loja>(data.lojas);
        this.caixas = this.unwrap<Caixa>(data.caixas);
        this.clientes = this.unwrap<Cliente>(data.clientes);
        this.vendedores = this.unwrap<Funcionario>(data.vendedores).filter(f => {
          const cat = String(f.categoria || '').toLowerCase();
          return f.ativo !== false && cat.includes('vendedor');
        });

        const user: any = this.auth.getCurrentUser();
        const lojasPermitidas = this.idsLojasPermitidasUsuario(user);
        if (lojasPermitidas.length) {
          this.lojas = this.lojas.filter(l => lojasPermitidas.includes(this.lojaIdValor(l)));
        }
        const lojaUsuario = Number(user?.Idloja || user?.loja_id || user?.loja?.Idloja || user?.loja?.id || 0) || null;
        this.lojaId = lojasPermitidas.includes(Number(lojaUsuario)) ? lojaUsuario : this.lojaIdValor(this.lojas[0]) || null;
        const caixaDaLoja = this.caixasDaLoja()[0];
        this.caixaId = caixaDaLoja?.Idcaixa || this.caixas.find(c => c.tipo_caixa !== 'MASTER')?.Idcaixa || null;
        this.clienteId = this.clientes.find(c => String(c.apelido || '').toUpperCase().includes('CONSUMIDOR'))?.id || this.clientes[0]?.id || null;
        this.vendedorId = this.vendedores.find(v => Number(v.idloja) === Number(this.lojaId))?.id || this.vendedores[0]?.id || null;

        this.cliente = this.clientes.find(c => c.id === this.clienteId)?.nome_cliente || this.cliente;
        this.buscaCliente = this.cliente;
        this.vendedor = this.vendedores.find(v => v.id === this.vendedorId)?.nomefuncionario || this.vendedor;
        this.caixa = this.caixas.find(c => c.Idcaixa === this.caixaId)?.codigo || this.caixa;
        this.atualizarCaixaLocal();
        this.configurarTerminalLocal();
        this.restaurarRascunhoLocal();
      },
      error: () => this.mensagem = 'Falha ao carregar loja, caixa, cliente ou vendedor.'
    });
  }

  vendedoresDaLoja(): Funcionario[] {
    if (!this.lojaId) return this.vendedores;
    return this.vendedores.filter(v => Number(v.idloja) === Number(this.lojaId));
  }

  caixasDaLoja(): Caixa[] {
    return this.caixas
      .filter(c => c.tipo_caixa !== 'MASTER')
      .filter(c => !this.lojaId || Number(c.idloja) === Number(this.lojaId));
  }

  selecionarCliente(id: number | null): void {
    this.clienteId = Number(id) || null;
    this.cliente = this.clientes.find(c => Number(c.id) === Number(this.clienteId))?.nome_cliente || 'Consumidor Final';
    this.buscaCliente = this.cliente;
    this.mostrarSugestoesCliente = false;
  }

  clientesFiltrados(): Cliente[] {
    const termo = this.buscaCliente.trim().toLowerCase();
    if (!termo) return this.clientes.slice(0, 8);
    const digitos = termo.replace(/\D/g, '');
    return this.clientes.filter(c => {
      const texto = [
        c.nome_cliente,
        c.apelido,
        c.email,
        c.cidade,
        c.telefone1,
        c.telefone2
      ].join(' ').toLowerCase();
      const doc = String(c.cpf || '').replace(/\D/g, '');
      return texto.includes(termo) || (!!digitos && doc.includes(digitos));
    }).slice(0, 8);
  }

  aoDigitarCliente(): void {
    this.mostrarSugestoesCliente = true;
    const exato = this.clientes.find(c => (c.nome_cliente || '').toLowerCase() === this.buscaCliente.trim().toLowerCase());
    this.clienteId = exato?.id || null;
    this.cliente = exato?.nome_cliente || this.buscaCliente || 'Consumidor Final';
  }

  selecionarClienteBusca(cliente: Cliente): void {
    this.selecionarCliente(cliente.id || null);
  }

  selecionarVendedor(id: number | null): void {
    this.vendedorId = Number(id) || null;
    this.vendedor = this.vendedores.find(v => Number(v.id) === Number(this.vendedorId))?.nomefuncionario || this.vendedor;
  }

  selecionarLoja(id: number | null): void {
    this.lojaId = Number(id) || null;
    const caixaDaLoja = this.caixasDaLoja()[0];
    this.caixaId = caixaDaLoja?.Idcaixa || null;
    this.caixa = caixaDaLoja?.codigo || 'Caixa';
    const vendedorDaLoja = this.vendedoresDaLoja()[0];
    if (vendedorDaLoja?.id) this.selecionarVendedor(vendedorDaLoja.id);
    this.atualizarCaixaLocal();
    this.configurarTerminalLocal();
    this.buscarProdutos();
  }

  selecionarCaixa(id: number | null): void {
    this.caixaId = Number(id) || null;
    this.caixa = this.caixas.find(c => Number(c.Idcaixa) === Number(this.caixaId))?.codigo || 'Caixa';
    this.atualizarCaixaLocal();
    this.configurarTerminalLocal();
  }

  lojaIdValor(loja: Loja | undefined): number {
    return Number(loja?.id || loja?.Idloja || 0);
  }

  private idsLojasPermitidasUsuario(user: any): number[] {
    const ids = [
      ...(Array.isArray(user?.Idlojas) ? user.Idlojas : []),
      ...(Array.isArray(user?.lojas) ? user.lojas.map((l: any) => l?.Idloja || l?.id) : []),
      user?.Idloja,
      user?.loja_id,
      user?.loja?.Idloja,
      user?.loja?.id
    ].map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0);
    return Array.from(new Set(ids));
  }

  buscarProdutos(adicionarExato = false): void {
    const termo = this.busca.trim();
    this.carregando = true;
    this.mensagem = '';

    if (this.bridge.isDesktop && termo.length >= 2) {
      this.bridge.pesquisarProdutos(termo).then(rows => {
        this.produtos = rows.map((row, index) => this.localParaLinha(row, index + 1));
        this.offlineCatalog.salvarProdutos(this.produtos);
        if (adicionarExato && !this.produtos.length) this.finalizarLeitura('Produto não encontrado.');
        if (adicionarExato) this.adicionarSeBuscaExata(termo);
        this.carregando = false;
      });
      return;
    }

    if (this.status?.online === false) {
      this.produtos = this.offlineCatalog.pesquisar<PdvProdutoLinha>(termo);
      this.avaliarEstoqueDaBusca(termo);
      if (adicionarExato && !this.produtos.length) this.finalizarLeitura('Produto não encontrado no catálogo offline.');
      if (adicionarExato) this.adicionarSeBuscaExata(termo);
      this.carregando = false;
      if (!this.produtos.length && !adicionarExato) this.mensagem = 'Produto não encontrado no catálogo offline.';
      return;
    }

    this.skusApi.list({ search: termo, page_size: 40 } as any).subscribe({
      next: respSkuBusca => {
        const skusBusca = (Array.isArray(respSkuBusca) ? respSkuBusca : respSkuBusca.results)
          .filter(sku => sku.ativo !== false && sku.bloqueado_venda !== true && (sku.produto_tipo === '1' || sku.produto_tipo === '3'));
        if (skusBusca.length) {
          this.produtos = skusBusca.map((sku, index) => this.skuParaLinha(sku, index + 1));
          this.offlineCatalog.salvarProdutos(this.produtos);
          this.avaliarEstoqueDaBusca(termo);
          if (adicionarExato) this.adicionarSeBuscaExata(termo);
          this.carregando = false;
          return;
        }

        this.produtosApi.list({ search: termo, page_size: 30, ativo: 'true' }).subscribe({
          next: resp => {
            const lista = Array.isArray(resp) ? resp : resp.results;
            const vendaveis = lista.filter(p => p.tipo_produto === '1' || p.tipo_produto === '3');
            if (!vendaveis.length) {
              this.produtos = [];
              if (adicionarExato) this.finalizarLeitura('Produto não encontrado.');
              this.carregando = false;
              return;
            }
            forkJoin(vendaveis.map(p => this.skusApi.list({ produto: p.Idproduto, page_size: 200 } as any))).subscribe({
              next: skusResp => {
                const linhas: PdvProdutoLinha[] = [];
                vendaveis.forEach((produto, produtoIndex) => {
                  const respSku = skusResp[produtoIndex];
                  const skus = Array.isArray(respSku) ? respSku : respSku.results;
                  skus
                    .filter(sku => sku.ativo !== false && sku.bloqueado_venda !== true)
                    .forEach(sku => linhas.push(this.skuParaLinha(sku, linhas.length + 1, produto)));
                });
                this.produtos = linhas;
                this.offlineCatalog.salvarProdutos(this.produtos);
                this.avaliarEstoqueDaBusca(termo);
                if (adicionarExato) this.adicionarSeBuscaExata(termo);
                this.carregando = false;
              },
              error: () => {
                this.produtos = vendaveis.map((produto, index) => ({
                  item: index + 1,
                  produto,
                  codigo: produto.referencia || '',
                  descricao: produto.descricao,
                  qtd: 1,
                  unidade: 'UN',
                  valorUnitario: this.precoFallback(produto),
                  total: this.precoFallback(produto),
                  estoque: 0
                }));
                this.offlineCatalog.salvarProdutos(this.produtos);
                this.avaliarEstoqueDaBusca(termo);
                if (adicionarExato) this.adicionarSeBuscaExata(termo);
                this.carregando = false;
              }
            });
          },
          error: () => {
            this.mensagem = 'Falha ao buscar produtos.';
            this.carregando = false;
          }
        });
      },
      error: () => {
        this.produtosApi.list({ search: termo, page_size: 30, ativo: 'true' }).subscribe({
          next: resp => {
            const lista = Array.isArray(resp) ? resp : resp.results;
            const vendaveis = lista.filter(p => p.tipo_produto === '1' || p.tipo_produto === '3');
            if (!vendaveis.length) {
              this.produtos = [];
              if (adicionarExato) this.finalizarLeitura('Produto não encontrado.');
              this.carregando = false;
              return;
            }
            this.produtos = vendaveis.map((produto, index) => ({
              item: index + 1,
              produto,
              codigo: produto.referencia || '',
              descricao: produto.descricao,
              qtd: 1,
              unidade: 'UN',
              valorUnitario: this.precoFallback(produto),
              total: this.precoFallback(produto),
              estoque: 0
            }));
            this.avaliarEstoqueDaBusca(termo);
            if (adicionarExato) this.adicionarSeBuscaExata(termo);
            this.carregando = false;
          },
          error: () => {
            this.mensagem = 'Falha ao buscar produtos.';
            this.carregando = false;
          }
        });
      }
    });
  }

  adicionarProduto(linha: PdvProdutoLinha): void {
    if (!this.caixaLocalAberto) {
      this.finalizarLeitura('Caixa não está aberto.');
      return;
    }
    this.produtoSelecionado = linha;
    const existente = this.carrinho.find(i => i.codigo === linha.codigo);
    const qtdAtual = existente?.qtd || 0;
    if (linha.estoque <= qtdAtual) {
      this.finalizarLeitura(`Produto sem saldo disponível para venda. Saldo atual: ${linha.estoque}.`);
      return;
    }
    if (existente) {
      existente.qtd += 1;
      this.atualizarItem(existente);
      this.itemSelecionado = existente;
      this.mensagem = '';
      this.busca = '';
      this.produtos = [];
      this.atualizarValorPagamento();
      this.salvarRascunhoLocal();
      return;
    }
    const novoItem: PdvCarrinhoItem = {
      produto: linha.produto,
      sku: linha.sku,
      codigo: linha.codigo,
      descricao: linha.descricao,
      cor: linha.sku?.cor_descricao || '-',
      tamanho: linha.sku?.tamanho_descricao || '-',
      qtd: 1,
      valorUnitario: linha.valorUnitario,
      desconto: 0,
      total: linha.valorUnitario,
      imagem: 'assets/sem-foto.png',
      estoque: linha.estoque
    };
    this.carrinho.push(novoItem);
    this.itemSelecionado = novoItem;
    this.mensagem = '';
    this.busca = '';
    this.produtos = [];
    this.atualizarValorPagamento();
    this.salvarRascunhoLocal();
  }

  selecionarItem(item: PdvCarrinhoItem): void {
    this.itemSelecionado = item;
    this.produtoSelecionado = {
      item: 0,
      produto: item.produto,
      sku: item.sku,
      codigo: item.codigo,
      descricao: item.descricao,
      qtd: item.qtd,
      unidade: 'UN',
      valorUnitario: item.valorUnitario,
      total: item.total,
      estoque: item.estoque
    };
  }

  aoDigitarBusca(): void {
    if (this.buscaTimer) clearTimeout(this.buscaTimer);
    const termo = this.busca.trim();
    if (termo.length < 2) {
      this.produtos = [];
      this.mensagem = '';
      return;
    }
    this.buscaTimer = setTimeout(() => this.buscarProdutos(false), 250);
  }

  aoEnterBusca(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.mensagemAlerta) {
      this.mensagemAlerta = '';
      return;
    }
    if (!this.caixaLocalAberto) {
      this.finalizarLeitura('Caixa não está aberto.');
      return;
    }
    this.buscarProdutos(true);
  }

  private adicionarSeBuscaExata(termo: string): void {
    const normalizado = termo.trim().toLowerCase();
    const digitos = normalizado.replace(/\D/g, '');
    const encontrados = this.produtos.filter(p =>
      String(p.codigo || '').toLowerCase() === normalizado ||
      String(p.codigo || '').replace(/\D/g, '') === digitos ||
      String(p.sku?.ean13 || '').toLowerCase() === normalizado ||
      String(p.sku?.ean13 || '').replace(/\D/g, '') === digitos ||
      String(p.produto.referencia || '').toLowerCase() === normalizado ||
      String(p.sku?.codigo_item_ref || '').toLowerCase() === normalizado
    );
    if (!encontrados.length) {
      this.finalizarLeitura('Produto não encontrado.');
      return;
    }
    if (encontrados.length > 1) {
      this.finalizarLeitura('Mais de um produto encontrado para este código.');
      return;
    }
    this.produtoSelecionado = encontrados[0];
    this.adicionarProduto(encontrados[0]);
  }

  alterarQuantidade(item: PdvCarrinhoItem, delta: number): void {
    if (delta > 0 && item.qtd >= item.estoque) {
      this.finalizarLeitura(`Quantidade maior que o saldo disponível. Saldo atual: ${item.estoque}.`);
      return;
    }
    item.qtd = Math.max(1, item.qtd + delta);
    this.atualizarItem(item);
    this.mensagem = '';
    this.atualizarValorPagamento();
  }

  atualizarItem(item: PdvCarrinhoItem): void {
    item.qtd = Math.max(1, Math.floor(this.numero(item.qtd)));
    if (item.qtd > item.estoque) {
      item.qtd = item.estoque;
      this.finalizarLeitura(`Quantidade maior que o saldo disponível. Saldo atual: ${item.estoque}.`);
    }
    item.desconto = Math.max(0, this.numero(item.desconto));
    const bruto = item.qtd * item.valorUnitario;
    if (item.desconto > bruto) {
      item.desconto = bruto;
      this.finalizarLeitura('Desconto do item limitado ao valor total do item.');
    }
    item.total = Math.max(bruto - item.desconto, 0);
    this.atualizarValorPagamento();
    this.salvarRascunhoLocal();
  }

  remover(item: PdvCarrinhoItem): void {
    this.carrinho = this.carrinho.filter(i => i !== item);
    if (this.itemSelecionado === item) this.itemSelecionado = this.carrinho[0] || null;
    this.atualizarValorPagamento();
    this.salvarRascunhoLocal();
  }

  cancelarItemSelecionado(): void {
    const item = this.itemSelecionado || this.carrinho[this.carrinho.length - 1];
    if (!item) {
      this.finalizarLeitura('Nenhum item para cancelar.');
      return;
    }
    this.remover(item);
    this.finalizarLeitura('Item cancelado.');
  }

  limpar(): void {
    this.carrinho = [];
    this.itemSelecionado = null;
    this.produtoSelecionado = null;
    this.desconto = 0;
    this.totalRecebido = 0;
    this.valorPagamento = 0;
    this.autorizacaoCartao = '';
    this.pagamentosVenda = [];
    this.numeroVendaAtual = 'Venda em aberto';
    this.removerRascunhoLocal();
  }

  subtotal(): number {
    return this.carrinho.reduce((total, item) => total + item.total, 0);
  }

  quantidadeTotal(): number {
    return this.carrinho.reduce((total, item) => total + this.numero(item.qtd), 0);
  }

  total(): number {
    return Math.max(this.subtotal() - this.desconto, 0);
  }

  troco(): number {
    return Math.max(this.totalPago() - this.total(), 0);
  }

  formatar(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatarQuantidade(valor: number): string {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  }

  totalPago(): number {
    return this.pagamentosVenda.reduce((total, pagamento) => total + this.numero(pagamento.valor), 0);
  }

  pendente(): number {
    return Math.max(this.total() - this.totalPago(), 0);
  }

  atualizarValorPagamento(): void {
    const pendente = this.pendente();
    this.valorPagamento = Number((pendente > 0 ? pendente : 0).toFixed(2));
    this.totalRecebido = this.totalPago();
    this.salvarRascunhoLocal();
  }

  adicionarPagamento(): void {
    const valor = this.numero(this.valorPagamento);
    if (valor <= 0) {
      this.mensagem = 'Informe o valor do pagamento.';
      return;
    }
    if (this.formaPagamento === 'CARTAO' && !this.autorizacaoCartao.trim()) {
      this.mensagem = 'Informe a autorização do cartão.';
      return;
    }
    this.pagamentosVenda.push({
      forma: this.formaPagamento,
      descricao: this.descricaoFormaPagamento(),
      valor,
      autorizacao: this.formaPagamento === 'CARTAO' ? this.autorizacaoCartao.trim() : undefined
    });
    this.autorizacaoCartao = '';
    this.mensagem = '';
    this.atualizarValorPagamento();
    this.salvarRascunhoLocal();
  }

  removerPagamento(index: number): void {
    this.pagamentosVenda.splice(index, 1);
    this.atualizarValorPagamento();
    this.salvarRascunhoLocal();
  }

  finalizar(): void {
    if (!this.lojaId || !this.caixaId || !this.clienteId || !this.vendedorId) {
      this.finalizarLeitura('Informe loja, caixa, cliente e vendedor para finalizar.');
      return;
    }
    if (!this.caixaLocalAberto) {
      this.finalizarLeitura('Caixa não está aberto.');
      return;
    }
    if (!this.carrinho.length) {
      this.finalizarLeitura('Inclua ao menos um item para finalizar a venda.');
      return;
    }
    if (!this.pagamentosVenda.length) {
      this.finalizarLeitura('Adicione uma forma de pagamento antes de finalizar a venda.');
      return;
    }
    if (this.totalPago() < this.total()) {
      this.finalizarLeitura(`Pagamento insuficiente. Falta ${this.formatar(this.pendente())}.`);
      return;
    }

    const payload = {
      loja: this.lojaId,
      caixa: this.caixaId,
      cliente: this.clienteId,
      vendedor: this.vendedorId,
      forma_pagamento: this.pagamentosVenda[0]?.forma || this.formaPagamento,
      desconto_geral: Number(this.desconto || 0),
      valor_recebido: Number(this.totalPago() || 0),
      pagamentos: this.pagamentosVenda.map(pagamento => ({
        forma: pagamento.forma,
        descricao: pagamento.descricao,
        valor: Number(pagamento.valor || 0),
        autorizacao: pagamento.autorizacao
      })),
      itens: this.carrinho.map(item => ({
        ean: item.codigo,
        descricao: item.descricao,
        cor: item.cor,
        tamanho: item.tamanho,
        quantidade: Number(item.qtd || 0),
        preco_unitario: Number(item.valorUnitario || 0),
        desconto: Number(item.desconto || 0)
      }))
    };

    this.finalizando = true;
    if (this.status?.online === false) {
      if (!this.caixaLocalAberto) {
        this.finalizando = false;
        this.finalizarLeitura('Abra o caixa local para vender offline.');
        return;
      }
      if (!this.bridge.isDesktop) {
        const vendaLocal = this.offlineQueue.adicionar(payload);
        this.offlineCatalog.baixarEstoque(this.carrinho.map(item => ({ codigo: item.codigo, qtd: item.qtd })));
        this.finalizando = false;
        this.finalizarLeitura(`Venda offline gravada: ${vendaLocal.documento}`);
        this.numeroVendaAtual = vendaLocal.documento;
        this.imprimirCupom();
        this.limpar();
        this.numeroVendaAtual = vendaLocal.documento;
        this.atualizarPendentesOffline();
        return;
      }

      this.bridge.finalizarVenda(payload).then(resultado => {
        this.finalizando = false;
        if (!resultado) {
          this.finalizarLeitura('Venda offline indisponível neste terminal.');
          return;
        }
        this.finalizarLeitura(`Venda offline gravada: ${resultado.documento}`);
        this.numeroVendaAtual = resultado.documento;
        this.imprimirCupom();
        this.limpar();
        this.numeroVendaAtual = resultado.documento;
        this.atualizarPendentesOffline();
      });
      return;
    }

    this.vendasApi.finalizar(payload).subscribe({
      next: venda => {
        this.finalizando = false;
        this.finalizarLeitura(`Venda finalizada: ${venda.documento}`);
        this.numeroVendaAtual = venda.documento;
        this.imprimirCupom();
        this.limpar();
        this.numeroVendaAtual = venda.documento;
        this.buscarProdutos();
      },
      error: err => {
        this.finalizando = false;
        this.finalizarLeitura(err?.error?.detail || 'Falha ao finalizar a venda.');
      }
    });
  }

  sincronizarPendentes(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.atualizarPendentesOffline();
    if (this.finalizando || !this.pendentesOffline) return;
    this.finalizando = true;
    this.sincronizacaoOffline = 'Sincronizando...';
    if (this.bridge.isDesktop) {
      this.bridge.sincronizar({
        apiBaseUrl: this.auth.apiBaseUrl,
        token: this.auth.getToken() || ''
      }).then(async resumo => {
        const despesas = await this.sincronizarDespesasOffline();
        this.finalizando = false;
        this.atualizarPendentesOffline();
        const texto = resumo.erros
          ? `Falha ao sincronizar: ${resumo.mensagem || 'verifique conexão e dados da venda.'}`
          : `${resumo.enviados} venda(s) e ${despesas.enviadas} despesa(s) sincronizada(s). ${resumo.pendentes + despesas.pendentes} pendente(s).`;
        this.mensagem = texto;
        this.sincronizacaoOffline = texto;
        if (resumo.enviados || despesas.enviadas) {
          this.buscarProdutos();
          if (this.modalAtalho === 'pagamentos' || this.modalAtalho === 'fechamento') this.carregarResumoPagamentosDia();
        }
      }).catch(error => {
        this.finalizando = false;
        this.atualizarPendentesOffline();
        const texto = error?.message || 'Falha ao sincronizar vendas pendentes.';
        this.mensagem = texto;
        this.sincronizacaoOffline = texto;
      });
      return;
    }
    this.offlineQueue.sincronizar().then(async resumo => {
      const despesas = await this.sincronizarDespesasOffline();
      this.finalizando = false;
      this.atualizarPendentesOffline();
      const temErro = resumo.erros || despesas.erros;
      const texto = temErro
        ? `Falha ao sincronizar: ${resumo.erro || despesas.erro || 'verifique conexão e dados pendentes.'}`
        : `${resumo.enviados} venda(s) e ${despesas.enviadas} despesa(s) sincronizada(s). ${resumo.pendentes + despesas.pendentes} pendente(s).`;
      this.mensagem = texto;
      this.sincronizacaoOffline = texto;
      if (resumo.enviados || despesas.enviadas) {
        this.buscarProdutos();
        if (this.modalAtalho === 'pagamentos' || this.modalAtalho === 'fechamento') this.carregarResumoPagamentosDia();
      }
    }).catch(error => {
      this.finalizando = false;
      this.atualizarPendentesOffline();
      const texto = error?.message || 'Falha ao sincronizar vendas pendentes.';
      this.mensagem = texto;
      this.sincronizacaoOffline = texto;
    });
  }

  sincronizarVendaPendente(venda: any, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.finalizando || !venda?.localUuid) return;
    this.finalizando = true;
    this.sincronizacaoOffline = 'Sincronizando venda...';
    this.offlineQueue.sincronizarUma(venda.localUuid).then(resumo => {
      this.finalizando = false;
      this.atualizarPendentesOffline();
      const texto = resumo.erro ? `Falha ao sincronizar venda: ${resumo.erro}` : 'Venda sincronizada.';
      this.mensagem = texto;
      this.sincronizacaoOffline = texto;
      if (resumo.enviada) {
        this.buscarProdutos();
        if (this.modalAtalho === 'pagamentos' || this.modalAtalho === 'fechamento') this.carregarResumoPagamentosDia();
      }
    }).catch(error => {
      this.finalizando = false;
      this.atualizarPendentesOffline();
      const texto = error?.message || 'Falha ao sincronizar venda pendente.';
      this.mensagem = texto;
      this.sincronizacaoOffline = texto;
    });
  }

  sincronizarDespesaPendente(despesa: any, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.finalizando || !despesa) return;
    const caixa = Number(despesa.caixa || 0);
    if (!caixa) {
      this.salvarDespesaOfflineComErro(despesa, 'Despesa sem caixa informado.');
      return;
    }
    this.finalizando = true;
    this.sincronizacaoOffline = 'Sincronizando despesa...';
    this.caixasApi.lancarDespesa(caixa, despesa.payload).subscribe({
      next: () => {
        this.removerDespesaOffline(despesa);
        this.finalizando = false;
        this.atualizarPendentesOffline();
        this.mensagem = 'Despesa sincronizada.';
        this.sincronizacaoOffline = 'Despesa sincronizada.';
        if (this.modalAtalho === 'pagamentos' || this.modalAtalho === 'fechamento') this.carregarResumoPagamentosDia();
      },
      error: error => {
        const texto = error?.error?.detail || error?.message || 'Falha ao sincronizar despesa.';
        this.salvarDespesaOfflineComErro(despesa, texto);
        this.finalizando = false;
        this.atualizarPendentesOffline();
        this.mensagem = texto;
        this.sincronizacaoOffline = texto;
      }
    });
  }

  atualizarCatalogoOffline(): void {
    if (this.atualizandoCatalogo) return;
    this.atualizandoCatalogo = true;
    this.produtosApi.list({ page_size: 500, ativo: 'true' }).subscribe({
      next: resp => {
        const lista = Array.isArray(resp) ? resp : resp.results;
        const vendaveis = lista.filter(p => p.tipo_produto === '1' || p.tipo_produto === '3');
        if (!vendaveis.length) {
          this.atualizandoCatalogo = false;
          this.sincronizacaoOffline = 'Nenhum produto para atualizar.';
          return;
        }
        forkJoin(vendaveis.map(p => this.skusApi.list({ produto: p.Idproduto, page_size: 200 } as any))).subscribe({
          next: skusResp => {
            const linhas: PdvProdutoLinha[] = [];
            vendaveis.forEach((produto, produtoIndex) => {
              const respSku = skusResp[produtoIndex];
              const skus = Array.isArray(respSku) ? respSku : respSku.results;
              skus.forEach(sku => {
                const preco = this.numero(sku.preco_venda) || this.precoFallback(produto);
                linhas.push({
                  item: linhas.length + 1,
                  produto,
                  sku,
                  codigo: sku.ean13 || produto.referencia || '',
                  descricao: produto.descricao,
                  qtd: 1,
                  unidade: 'UN',
                  valorUnitario: preco,
                  total: preco,
                  estoque: this.numero(sku.estoque_total)
                });
              });
            });
            this.offlineCatalog.salvarProdutos(linhas);
            const finalizar = (total: number) => {
              this.atualizandoCatalogo = false;
              this.sincronizacaoOffline = `${total} SKU(s) atualizados no catálogo offline.`;
            };
            if (this.bridge.isDesktop) {
              this.bridge.atualizarCatalogo(linhas.map(linha => ({
                produtoId: Number(linha.produto.Idproduto),
                skuId: Number(linha.sku?.IdprodutoDetalhe || linha.sku?.id || 0),
                descricao: linha.descricao,
                referencia: linha.produto.referencia || linha.sku?.codigo_item_ref || '',
                ean: linha.codigo,
                cor: linha.sku?.cor_descricao || '',
                tamanho: linha.sku?.tamanho_descricao || '',
                preco: linha.valorUnitario,
                estoque: linha.estoque,
                imagemUrl: ''
              })).filter(item => item.skuId > 0)).then(resultado => {
                finalizar(resultado?.total ?? linhas.length);
              }).catch(() => {
                this.atualizandoCatalogo = false;
                this.sincronizacaoOffline = 'Falha ao gravar catálogo na base local.';
              });
              return;
            }
            finalizar(linhas.length);
          },
          error: () => {
            this.atualizandoCatalogo = false;
            this.sincronizacaoOffline = 'Falha ao atualizar catálogo offline.';
          }
        });
      },
      error: () => {
        this.atualizandoCatalogo = false;
        this.sincronizacaoOffline = 'Falha ao carregar produtos para catálogo offline.';
      }
    });
  }

  abrirCaixaLocal(): void {
    if (!this.lojaId || !this.caixaId) {
      this.mensagem = 'Informe loja e caixa para abrir o caixa local.';
      return;
    }
    if (this.caixaLocalAberto) {
      this.finalizarLeitura('Caixa local já está aberto.');
      return;
    }
    const user = this.auth.getCurrentUser();
    this.caixaLocal.abrir(this.lojaId, this.caixaId, user?.username || this.vendedor);
    this.atualizarCaixaLocal();
    this.sincronizacaoOffline = 'Caixa local aberto.';
  }

  fecharCaixaLocal(): void {
    this.caixaLocal.fechar();
    this.atualizarCaixaLocal();
    this.sincronizacaoOffline = 'Caixa local fechado.';
  }

  fecharCaixaAtalho(): void {
    if (!this.caixaLocalAberto) {
      this.finalizarLeitura('Caixa já está fechado.');
      return;
    }
    if (this.carrinho.length) {
      this.finalizarLeitura('Cancele ou finalize a venda antes de fechar o caixa.');
      return;
    }
    this.atualizarPendentesOffline();
    if (this.pendentesOffline) {
      this.finalizarLeitura('Sincronize as pendências antes de fechar o caixa.');
      return;
    }
    this.modalAtalho = 'fechamento';
    this.carregarResumoPagamentosDia();
  }

  confirmarFechamentoCaixa(): void {
    this.fecharCaixaLocal();
    this.fecharAtalho();
    this.finalizarLeitura('Caixa local fechado.');
  }

  carregarTiposDespesa(): void {
    this.tiposDespesaApi.list({ ativo: true, page_size: 500, ordering: 'descricao' }).subscribe({
      next: res => {
        this.tiposDespesaPdv = this.unwrap<TipoDespesaPdv>(res).filter(t => t.ativo !== false);
        if (!this.despesaForm.tipoDespesa && this.tiposDespesaPdv.length) {
          this.despesaForm.tipoDespesa = this.tiposDespesaPdv[0].Idtipodespesapdv || null;
        }
      },
      error: () => this.tiposDespesaPdv = []
    });
  }

  lancarDespesaLoja(): void {
    if (!this.caixaLocalAberto) {
      this.finalizarLeitura('Caixa não está aberto.');
      return;
    }
    if (!this.caixaId) {
      this.finalizarLeitura('Selecione o caixa.');
      return;
    }
    if (this.despesaForm.operacao !== 'DESPESA') {
      this.lancarMovimentoCaixa();
      return;
    }
    if (!this.despesaForm.tipoDespesa) {
      this.finalizarLeitura('Selecione o tipo de despesa.');
      return;
    }
    const valor = Number(this.despesaForm.valor || 0);
    if (!valor || valor <= 0) {
      this.finalizarLeitura('Informe o valor da despesa.');
      return;
    }
    const payload = {
      tipo_despesa: this.despesaForm.tipoDespesa,
      valor,
      documento: this.despesaForm.documento || null,
      historico: this.despesaForm.historico || null,
      data_movimento: this.dataLocalIso()
    };
    if (this.status?.online === false) {
      const documento = this.registrarDespesaOffline(payload);
      this.resetarDespesaForm();
      this.fecharAtalho();
      this.finalizarLeitura(`Despesa offline registrada: ${documento}`);
      this.atualizarPendentesOffline();
      return;
    }
    this.caixasApi.lancarDespesa(this.caixaId, payload).subscribe({
      next: res => {
        const caixaAtualizado = res?.caixa as Caixa | undefined;
        if (caixaAtualizado) {
          this.caixas = this.caixas.map(c => Number(c.Idcaixa) === Number(caixaAtualizado.Idcaixa) ? caixaAtualizado : c);
        }
        this.resetarDespesaForm();
        this.fecharAtalho();
        this.finalizarLeitura('Despesa lançada no caixa.');
      },
      error: err => {
        if (err?.status === 0 || !navigator.onLine) {
          const documento = this.registrarDespesaOffline(payload);
          this.resetarDespesaForm();
          this.fecharAtalho();
          this.finalizarLeitura(`Despesa offline registrada: ${documento}`);
          this.atualizarPendentesOffline();
          return;
        }
        this.finalizarLeitura(err?.error?.detail || 'Falha ao lançar despesa no caixa.');
      }
    });
  }

  private lancarMovimentoCaixa(): void {
    if (this.status?.online === false || !navigator.onLine) {
      this.finalizarLeitura('Sangria e suprimento exigem conexão com a retaguarda.');
      return;
    }
    const valor = Number(this.despesaForm.valor || 0);
    if (!valor || valor <= 0) {
      this.finalizarLeitura('Informe o valor da movimentação.');
      return;
    }
    const caixaAtual = Number(this.caixaId);
    const caixaMaster = this.caixas.find(c => c.tipo_caixa === 'MASTER' && Number(c.Idcaixa) !== caixaAtual);
    if (!caixaMaster?.Idcaixa) {
      this.finalizarLeitura('Cadastre um caixa master para registrar sangria ou suprimento.');
      return;
    }
    const sangria = this.despesaForm.operacao === 'SANGRIA';
    const documento = this.despesaForm.documento || `${sangria ? 'SANG' : 'SUP'}-${Date.now()}`;
    this.caixasApi.transferir({
      caixa_origem: sangria ? caixaAtual : Number(caixaMaster.Idcaixa),
      caixa_destino: sangria ? Number(caixaMaster.Idcaixa) : caixaAtual,
      documento,
      valor,
      data_movimento: this.dataLocalIso(),
      observacao: this.despesaForm.historico || (sangria ? 'Sangria PDV' : 'Suprimento PDV')
    }).subscribe({
      next: () => {
        this.resetarDespesaForm();
        this.fecharAtalho();
        this.carregarContexto();
        this.finalizarLeitura(sangria ? 'Sangria registrada.' : 'Suprimento registrado.');
      },
      error: err => this.finalizarLeitura(err?.error?.detail || 'Falha ao registrar movimentação do caixa.')
    });
  }

  labelDespesaAcao(): string {
    if (this.despesaForm.operacao === 'SANGRIA') return 'Registrar sangria';
    if (this.despesaForm.operacao === 'SUPRIMENTO') return 'Registrar suprimento';
    return 'Lançar despesa';
  }

  abrirAtalho(event: Event | null, modal: typeof this.modalAtalho): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.modalAtalho = modal;
    this.buscaModal = '';
    this.produtosPreco = [];
    if (modal === 'resumo') this.carregarResumoDia();
    if (modal === 'pagamentos') this.carregarResumoPagamentosDia();
    if (modal === 'despesa' && !this.tiposDespesaPdv.length) this.carregarTiposDespesa();
    if (modal === 'pendentes') this.atualizarPendentesOffline();
  }

  fecharAtalho(): void {
    this.modalAtalho = '';
    this.buscaModal = '';
    this.produtosPreco = [];
  }

  confirmarCancelarVenda(): void {
    this.limpar();
    this.fecharAtalho();
    this.finalizarLeitura('Venda cancelada.');
  }

  selecionarClienteModal(cliente: Cliente): void {
    this.selecionarCliente(cliente.id || null);
    this.fecharAtalho();
  }

  selecionarVendedorModal(vendedor: Funcionario): void {
    this.selecionarVendedor(vendedor.id || null);
    this.fecharAtalho();
  }

  clientesAtalho(): Cliente[] {
    const termo = this.buscaModal.trim().toLowerCase();
    if (!termo) return this.clientes.slice(0, 20);
    const digitos = termo.replace(/\D/g, '');
    return this.clientes.filter(c => {
      const texto = [c.nome_cliente, c.apelido, c.email, c.cidade, c.telefone1, c.telefone2].join(' ').toLowerCase();
      const doc = String(c.cpf || '').replace(/\D/g, '');
      return texto.includes(termo) || (!!digitos && doc.includes(digitos));
    }).slice(0, 30);
  }

  vendedoresAtalho(): Funcionario[] {
    const termo = this.buscaModal.trim().toLowerCase();
    const lista = this.vendedoresDaLoja();
    if (!termo) return lista;
    return lista.filter(v => [v.nomefuncionario, v.categoria, v.apelido].join(' ').toLowerCase().includes(termo));
  }

  vendasOfflinePendentes(): any[] {
    return this.offlineQueue.listar();
  }

  despesasOfflinePendentes(): any[] {
    return this.despesasOffline();
  }

  buscarPrecoAtalho(): void {
    const anterior = this.busca;
    this.busca = this.buscaModal;
    this.buscarProdutos(false);
    setTimeout(() => {
      this.produtosPreco = this.produtos.slice(0, 20);
      this.busca = anterior;
    }, 350);
  }

  carregarResumoDia(): void {
    const hoje = this.dataLocalIso();
    this.resumoCarregando = true;
    this.resumoVendedores = [];
    this.vendasApi.relatorioVendas({ loja: this.lojaId, data_ini: hoje, data_fim: hoje }).subscribe({
      next: relatorio => {
        this.resumoVendedores = relatorio.vendedores || [];
        this.resumoCarregando = false;
      },
      error: () => {
        this.resumoCarregando = false;
        this.resumoVendedores = [];
      }
    });
  }

  carregarResumoPagamentosDia(): void {
    const hoje = this.dataLocalIso();
    this.resumoPagamentosCarregando = true;
    this.resumoPagamentos = [];
    this.despesasCaixaDia = [];
    forkJoin({
      relatorio: this.vendasApi.relatorioVendas({ loja: this.lojaId, data_ini: hoje, data_fim: hoje }),
      despesas: this.movimentacoesApi.list({
        loja: this.lojaId,
        caixa: this.caixaId,
        status: 'EFETIVA',
        data_ini: hoje,
        data_fim: hoje
      })
    }).subscribe({
      next: ({ relatorio, despesas }) => {
        this.resumoPagamentos = relatorio.pagamentos || [];
        this.despesasCaixaDia = this.unwrap<MovimentacaoFinanceira>(despesas);
        this.resumoPagamentosCarregando = false;
      },
      error: () => {
        this.resumoPagamentosCarregando = false;
        this.resumoPagamentos = [];
        this.despesasCaixaDia = [];
      }
    });
  }

  totalResumoPagamentos(): number {
    return this.resumoPagamentos.reduce((total, p) => total + this.numero(p.total), 0);
  }

  resumoVendasOfflinePorPagamento(): { descricao: string; vendas: number; total: number }[] {
    const mapa = new Map<string, { descricao: string; vendas: number; total: number }>();
    this.vendasOfflinePendentes().forEach(venda => {
      const pagamentos = Array.isArray(venda?.payload?.pagamentos) ? venda.payload.pagamentos : [];
      const linhas = pagamentos.length ? pagamentos : [{ forma: venda?.payload?.forma_pagamento || 'PENDENTE', valor: venda?.payload?.total || 0 }];
      linhas.forEach((pagamento: any) => {
        const descricao = String(pagamento.descricao || pagamento.forma_pagamento_descricao || pagamento.forma_pagamento || pagamento.forma || 'Pendente');
        const valor = this.numero(pagamento.valor ?? pagamento.valor_pago ?? pagamento.total ?? venda?.payload?.total ?? 0);
        const atual = mapa.get(descricao) || { descricao, vendas: 0, total: 0 };
        atual.vendas += 1;
        atual.total += valor;
        mapa.set(descricao, atual);
      });
    });
    return Array.from(mapa.values());
  }

  totalVendasOfflinePendentes(): number {
    return this.resumoVendasOfflinePorPagamento().reduce((total, p) => total + p.total, 0);
  }

  resumoDespesasOfflinePorTipo(): { descricao: string; qtd: number; total: number }[] {
    const mapa = new Map<string, { descricao: string; qtd: number; total: number }>();
    this.despesasOfflinePendentes().forEach(despesa => {
      const descricao = String(despesa.tipo_despesa_descricao || despesa.payload?.historico || 'Despesa offline');
      const valor = this.numero(despesa.payload?.valor);
      const atual = mapa.get(descricao) || { descricao, qtd: 0, total: 0 };
      atual.qtd += 1;
      atual.total += valor;
      mapa.set(descricao, atual);
    });
    return Array.from(mapa.values());
  }

  totalDespesasOfflinePendentes(): number {
    return this.resumoDespesasOfflinePorTipo().reduce((total, d) => total + d.total, 0);
  }

  resumoDespesasCaixaDia(): { descricao: string; qtd: number; total: number }[] {
    const mapa = new Map<string, { descricao: string; qtd: number; total: number }>();
    this.despesasCaixaDia.forEach(mov => {
      if (String(mov.origem || '').toUpperCase() === 'TRANSFERENCIA') return;
      if (String(mov.tipo || '').toUpperCase() !== 'SAIDA') return;
      const descricao = String(mov.historico || mov.documento || 'Despesa do caixa');
      const atual = mapa.get(descricao) || { descricao, qtd: 0, total: 0 };
      atual.qtd += 1;
      atual.total += this.numero(mov.valor);
      mapa.set(descricao, atual);
    });
    return Array.from(mapa.values());
  }

  totalDespesasCaixaDia(): number {
    return this.resumoDespesasCaixaDia().reduce((total, d) => total + d.total, 0);
  }

  resumoSangriasCaixaDia(): { descricao: string; qtd: number; total: number }[] {
    return this.resumoTransferenciasCaixaDia('SAIDA', 'Sangria');
  }

  resumoSuprimentosCaixaDia(): { descricao: string; qtd: number; total: number }[] {
    return this.resumoTransferenciasCaixaDia('ENTRADA', 'Suprimento');
  }

  totalSangriasCaixaDia(): number {
    return this.resumoSangriasCaixaDia().reduce((total, d) => total + d.total, 0);
  }

  totalSuprimentosCaixaDia(): number {
    return this.resumoSuprimentosCaixaDia().reduce((total, d) => total + d.total, 0);
  }

  private resumoTransferenciasCaixaDia(tipo: 'ENTRADA' | 'SAIDA', fallback: string): { descricao: string; qtd: number; total: number }[] {
    const mapa = new Map<string, { descricao: string; qtd: number; total: number }>();
    this.despesasCaixaDia.forEach(mov => {
      if (String(mov.origem || '').toUpperCase() !== 'TRANSFERENCIA') return;
      if (String(mov.tipo || '').toUpperCase() !== tipo) return;
      const historico = String(mov.historico || '');
      const descricao = historico.includes('|') ? historico.split('|').pop()?.trim() || fallback : fallback;
      const atual = mapa.get(descricao) || { descricao, qtd: 0, total: 0 };
      atual.qtd += 1;
      atual.total += this.numero(mov.valor);
      mapa.set(descricao, atual);
    });
    return Array.from(mapa.values());
  }

  formatarRelatorio(valor: string | number): string {
    return this.formatar(this.numero(valor));
  }

  private dataLocalIso(): string {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  pagarCom(forma: 'DINHEIRO' | 'CARTAO' | 'PIX'): void {
    this.formaPagamento = forma;
    this.atualizarValorPagamento();
  }

  imprimirCupom(): void {
    if (!this.carrinho.length) {
      this.mensagem = 'Inclua itens para imprimir o cupom.';
      return;
    }
    const documento = this.numeroVendaAtual && this.numeroVendaAtual !== 'Venda em aberto'
      ? this.numeroVendaAtual
      : `PRE-${new Date().getTime()}`;
    const cliente = this.clientes.find(c => Number(c.id) === Number(this.clienteId));
    const loja = this.lojas.find(l => Number(l.Idloja) === Number(this.lojaId));
    const vendedor = this.vendedores.find(v => Number(v.id) === Number(this.vendedorId));
    const descontosCupom = this.carrinho.reduce((total, item) => total + this.numero(item.desconto), 0) + this.numero(this.desconto);
    const itens = this.carrinho.map(item => `
      <tr>
        <td>${this.escapeHtml(item.descricao)}<br><small>${this.escapeHtml(item.codigo)} ${this.escapeHtml(item.cor)} ${this.escapeHtml(item.tamanho)}</small></td>
        <td>${item.qtd}</td>
        <td>${this.formatar(item.valorUnitario)}</td>
        <td>${this.formatar(item.desconto)}</td>
        <td>${this.formatar(item.total)}</td>
      </tr>
    `).join('');
    const pagamentos = this.pagamentosVenda.map(p => `
      <tr>
        <td>${this.escapeHtml(p.descricao)}</td>
        <td colspan="3">${this.escapeHtml(p.autorizacao || '')}</td>
        <td>${this.formatar(p.valor)}</td>
      </tr>
    `).join('');
    const html = `
      <html>
        <head>
          <title>Cupom ${this.escapeHtml(documento)}</title>
          <style>
            body{font-family:Arial,sans-serif;margin:0;padding:10px;color:#000}
            .cupom{width:302px}
            h1{font-size:16px;text-align:center;margin:0 0 8px}
            p{font-size:11px;margin:2px 0}
            .center{text-align:center}
            .sep{border-top:1px dashed #999;margin:8px 0}
            table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
            td{border-top:1px dashed #999;padding:4px 0;vertical-align:top}
            th{font-size:10px;text-align:left;border-top:1px solid #000;border-bottom:1px solid #000;padding:3px 0}
            td:nth-child(2),td:nth-child(3),td:nth-child(4),td:nth-child(5),th:nth-child(2),th:nth-child(3),th:nth-child(4),th:nth-child(5){text-align:right}
            .total{font-size:16px;font-weight:700;text-align:right;border-top:1px solid #000;margin-top:8px;padding-top:8px}
            .line{display:flex;justify-content:space-between;font-size:11px;margin:3px 0}
            @media print{body{padding:0}.cupom{width:72mm}}
          </style>
        </head>
        <body>
          <div class="cupom">
            <h1>SYSVAR PDV</h1>
            <p class="center">CUPOM NAO FISCAL EM CONTINGENCIA</p>
            <p class="center">Documento: <strong>${this.escapeHtml(documento)}</strong></p>
            <div class="sep"></div>
            <p>Loja: ${this.escapeHtml(loja?.nome_loja || '-')}</p>
            <p>Caixa: ${this.escapeHtml(this.caixa)}</p>
            <p>Vendedor: ${this.escapeHtml(vendedor?.nomefuncionario || this.vendedor || '-')}</p>
            <p>Cliente: ${this.escapeHtml(cliente?.nome_cliente || this.cliente || '-')}</p>
            <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
            <table>
              <thead><tr><th>Item</th><th>Qtd</th><th>Unit.</th><th>Desc.</th><th>Total</th></tr></thead>
              <tbody>${itens}</tbody>
            </table>
            <div class="line"><span>Subtotal</span><strong>${this.formatar(this.subtotal())}</strong></div>
            <div class="line"><span>Descontos</span><strong>${this.formatar(descontosCupom)}</strong></div>
            <div class="total">TOTAL ${this.formatar(this.total())}</div>
            <table>
              <thead><tr><th>Pagamento</th><th colspan="3">Aut.</th><th>Valor</th></tr></thead>
              <tbody>${pagamentos}</tbody>
            </table>
            <p class="center">NFC-e em contingencia. A autorizacao fiscal sera processada pela retaguarda.</p>
          </div>
          <script>window.print(); setTimeout(() => window.close(), 300);</script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank', 'width=340,height=640');
    if (!win) {
      this.mensagem = 'Não foi possível abrir a impressão do cupom.';
      return;
    }
    win.document.write(html);
    win.document.close();
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private localParaLinha(row: PdvProdutoLocal, item: number): PdvProdutoLinha {
    return {
      item,
      produto: {
        Idproduto: row.produtoId,
        tipo_produto: '1',
        descricao: row.descricao,
        referencia: row.referencia,
        unidade: null,
        grupo: null,
        colecao: null
      },
      codigo: row.ean,
      descricao: row.descricao,
      qtd: 1,
      unidade: 'UN',
      valorUnitario: row.preco,
      total: row.preco,
      estoque: row.estoque
    };
  }

  private skuParaLinha(sku: ProdutoSku, item: number, produto?: Produto): PdvProdutoLinha {
    const preco = this.numero(sku.preco_venda) || (produto ? this.precoFallback(produto) : 0);
    const produtoLinha: Produto = produto || {
      Idproduto: sku.produto,
      tipo_produto: sku.produto_tipo || '1',
      descricao: sku.produto_descricao || '',
      referencia: sku.produto_referencia || '',
      unidade: null,
      grupo: null,
      colecao: null
    };
    return {
      item,
      produto: produtoLinha,
      sku,
      codigo: sku.ean13 || sku.codigo_item_ref || produtoLinha.referencia || '',
      descricao: produtoLinha.descricao,
      qtd: 1,
      unidade: 'UN',
      valorUnitario: preco,
      total: preco,
      estoque: this.numero(sku.estoque_total)
    };
  }

  private atualizarRelogio(): void {
    const now = new Date();
    this.hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    this.data = now.toLocaleDateString('pt-BR');
  }

  private numero(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  private precoFallback(produto: Produto): number {
    return produto.tipo_produto === '3' ? 399.9 : 199.9;
  }

  private descricaoFormaPagamento(): string {
    if (this.formaPagamento === 'CARTAO') return this.tipoCartao === 'DEBITO' ? 'Cartão débito' : 'Cartão crédito';
    if (this.formaPagamento === 'PIX') return 'Pix';
    return 'Dinheiro';
  }

  private atualizarPendentesOffline(): void {
    this.pendentesOffline = this.offlineQueue.quantidade() + this.despesasOffline().length;
  }

  private async sincronizarDespesasOffline(): Promise<{ enviadas: number; pendentes: number; erros: number; erro?: string }> {
    const fila = this.despesasOffline();
    const restantes: any[] = [];
    let enviadas = 0;
    let erros = 0;

    for (const despesa of fila) {
      const caixa = Number(despesa.caixa || 0);
      if (!caixa) {
        erros += 1;
        restantes.push({ ...despesa, erro: 'Despesa sem caixa informado.' });
        continue;
      }
      try {
        await firstValueFrom(this.caixasApi.lancarDespesa(caixa, despesa.payload));
        enviadas += 1;
      } catch (error: any) {
        erros += 1;
        restantes.push({
          ...despesa,
          erro: error?.error?.detail || error?.message || 'Falha ao sincronizar despesa.'
        });
      }
    }

    localStorage.setItem(this.despesasOfflineKey, JSON.stringify(restantes));
    return { enviadas, pendentes: restantes.length, erros, erro: restantes[0]?.erro };
  }

  private resetarDespesaForm(): void {
    this.despesaForm = {
      operacao: 'DESPESA',
      tipoDespesa: this.tiposDespesaPdv[0]?.Idtipodespesapdv || null,
      valor: 0,
      documento: '',
      historico: ''
    };
  }

  private despesasOffline(): any[] {
    try {
      const raw = localStorage.getItem(this.despesasOfflineKey);
      const lista = raw ? JSON.parse(raw) : [];
      return Array.isArray(lista) ? lista : [];
    } catch {
      return [];
    }
  }

  private removerDespesaOffline(despesa: any): void {
    const lista = this.despesasOffline().filter(item => !this.mesmaDespesaOffline(item, despesa));
    localStorage.setItem(this.despesasOfflineKey, JSON.stringify(lista));
  }

  private salvarDespesaOfflineComErro(despesa: any, erro: string): void {
    const lista = this.despesasOffline().map(item => this.mesmaDespesaOffline(item, despesa) ? { ...item, erro } : item);
    localStorage.setItem(this.despesasOfflineKey, JSON.stringify(lista));
    this.mensagem = erro;
    this.sincronizacaoOffline = erro;
  }

  private mesmaDespesaOffline(a: any, b: any): boolean {
    if (a?.id && b?.id) return a.id === b.id;
    return a?.payload?.documento && a.payload.documento === b?.payload?.documento;
  }

  private registrarDespesaOffline(payload: {
    tipo_despesa?: number | null;
    natureza?: number | null;
    valor: number;
    documento?: string | null;
    historico?: string | null;
    data_movimento?: string | null;
  }): string {
    const documento = payload.documento || `DESP-${Date.now()}`;
    const tipo = this.tiposDespesaPdv.find(t => Number(t.Idtipodespesapdv) === Number(payload.tipo_despesa));
    const user: any = this.auth.getCurrentUser();
    const lista = this.despesasOffline();
    lista.push({
      id: `desp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'PENDENTE_SYNC',
      criado_em: new Date().toISOString(),
      loja: this.lojaId,
      caixa: this.caixaId,
      usuario: user?.id || user?.username || null,
      tipo_despesa_descricao: tipo?.descricao || '',
      payload: { ...payload, documento }
    });
    localStorage.setItem(this.despesasOfflineKey, JSON.stringify(lista));
    return documento;
  }

  private atualizarCaixaLocal(): void {
    this.caixaLocalAberto = this.caixaLocal.aberto(this.lojaId, this.caixaId);
  }

  private salvarRascunhoLocal(): void {
    if (!this.carrinho.length) {
      this.removerRascunhoLocal();
      return;
    }
    try {
      localStorage.setItem(this.vendaRascunhoKey, JSON.stringify({
        lojaId: this.lojaId,
        caixaId: this.caixaId,
        clienteId: this.clienteId,
        vendedorId: this.vendedorId,
        cliente: this.cliente,
        buscaCliente: this.buscaCliente,
        vendedor: this.vendedor,
        caixa: this.caixa,
        desconto: this.desconto,
        pagamentosVenda: this.pagamentosVenda,
        carrinho: this.carrinho,
        itemCodigo: this.itemSelecionado?.codigo || null,
        updatedAt: new Date().toISOString()
      }));
    } catch {
      undefined;
    }
  }

  private restaurarRascunhoLocal(): void {
    if (this.carrinho.length) return;
    try {
      const raw = localStorage.getItem(this.vendaRascunhoKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!Array.isArray(data?.carrinho) || !data.carrinho.length) return;
      this.lojaId = data.lojaId ?? this.lojaId;
      this.caixaId = data.caixaId ?? this.caixaId;
      this.clienteId = data.clienteId ?? this.clienteId;
      this.vendedorId = data.vendedorId ?? this.vendedorId;
      this.cliente = data.cliente || this.cliente;
      this.buscaCliente = data.buscaCliente || this.cliente;
      this.vendedor = data.vendedor || this.vendedor;
      this.caixa = data.caixa || this.caixa;
      this.desconto = this.numero(data.desconto);
      this.pagamentosVenda = Array.isArray(data.pagamentosVenda) ? data.pagamentosVenda : [];
      this.carrinho = data.carrinho;
      this.itemSelecionado = this.carrinho.find(item => item.codigo === data.itemCodigo) || this.carrinho[0] || null;
      if (this.itemSelecionado) this.selecionarItem(this.itemSelecionado);
      this.atualizarCaixaLocal();
      this.atualizarValorPagamento();
      this.mensagem = 'Venda em andamento recuperada.';
    } catch {
      this.removerRascunhoLocal();
    }
  }

  private removerRascunhoLocal(): void {
    try {
      localStorage.removeItem(this.vendaRascunhoKey);
    } catch {
      undefined;
    }
  }

  private configurarTerminalLocal(): void {
    if (!this.bridge.isDesktop || !this.lojaId || !this.caixaId) return;
    const user: any = this.auth.getCurrentUser();
    const empresaId = Number(user?.empresa_id || user?.Idempresa || user?.empresa?.id || user?.empresa?.Idempresa || 0) || null;
    const usuarioId = Number(user?.id || user?.Idusuario || 0) || null;
    this.bridge.configurarTerminal({
      apiBaseUrl: this.auth.apiBaseUrl,
      empresaId,
      lojaId: this.lojaId,
      caixaId: this.caixaId,
      usuarioId
    }).catch(() => undefined);
  }

  private avaliarEstoqueDaBusca(termo: string): void {
    if (!termo || !this.produtos.length) return;
    if (this.produtos.every(p => p.estoque <= 0)) {
      this.mensagem = 'Produto localizado, mas sem estoque disponível.';
    }
  }

  private finalizarLeitura(mensagem?: string): void {
    this.busca = '';
    this.produtos = [];
    if (mensagem) {
      this.mensagem = mensagem;
      this.mensagemAlerta = mensagem;
    }
  }

  private unwrap<T>(resp: T[] | { results: T[] }): T[] {
    return Array.isArray(resp) ? resp : resp.results || [];
  }
}
