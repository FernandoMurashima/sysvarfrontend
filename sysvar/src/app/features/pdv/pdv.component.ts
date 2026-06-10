import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Caixa } from '../../core/models/caixa';
import { CashbackConfig } from '../../core/models/cashback';
import { Cliente } from '../../core/models/clientes';
import { Cor } from '../../core/models/cor';
import { Estoque } from '../../core/models/estoque';
import { FormaPagamento } from '../../core/models/forma-pagamento';
import { Funcionario } from '../../core/models/funcionario';
import { Loja } from '../../core/models/loja';
import { Produto } from '../../core/models/produto';
import { PromocaoAplicavel } from '../../core/models/promocao';
import { TamanhoModel } from '../../core/models/tamanho';
import { CupomPdv, VendaDevolucaoConsulta, VendaDevolucaoItemConsulta, VendaPdvPagamentoPayload } from '../../core/models/venda-pdv';
import { ValeTroca } from '../../core/models/vale-troca';
import { AuthService } from '../../core/auth.service';
import { CaixasService } from '../../core/services/caixas.service';
import { CashbackService } from '../../core/services/cashback.service';
import { ClientesService } from '../../core/services/clientes.service';
import { CoresService } from '../../core/services/cores.service';
import { EstoqueService } from '../../core/services/estoque.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { FuncionariosService } from '../../core/services/funcionarios.service';
import { LojasService } from '../../core/services/lojas.service';
import { ProdutoDetalheService, ProdutoSku } from '../../core/services/produto-detalhe.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { PromocoesService } from '../../core/services/promocoes.service';
import { TabelaprecoProdutoService, TabelaPrecoProduto } from '../../core/services/tabelapreco-produto.service';
import { TamanhosService } from '../../core/services/tamanhos.service';
import { VendaPdvService } from '../../core/services/venda-pdv.service';
import { ValeTrocaService } from '../../core/services/vale-troca.service';

interface CatalogoItem {
  produto: Produto;
  preco: number;
  imagem: string;
  estoqueTotal: number;
  skus: ProdutoSku[];
  promocao?: PromocaoAplicavel | null;
}

interface CarrinhoItem {
  produto: Produto;
  sku: ProdutoSku;
  ean: string;
  descricao: string;
  cor: string;
  tamanho: string;
  imagem: string;
  qtd: number;
  preco: number;
  desconto: number;
  promocao?: string;
}

interface PdvSession {
  lojaId: number;
  caixaId: number;
  operadorNome: string;
  operadorTipo: string;
  abertoEm: string;
}

interface PagamentoVenda {
  forma: string;
  descricao: string;
  valor: number;
  autorizacao: string;
}

@Component({
  selector: 'app-pdv',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pdv.component.html',
  styleUrls: ['./pdv.component.css']
})
export class PdvComponent implements OnInit {
  private readonly sessionKey = 'sysvar.pdv.session';
  private auth = inject(AuthService);
  private produtosApi = inject(ProdutosService);
  private skusApi = inject(ProdutoDetalheService);
  private estoqueApi = inject(EstoqueService);
  private precosApi = inject(TabelaprecoProdutoService);
  private lojasApi = inject(LojasService);
  private clientesApi = inject(ClientesService);
  private funcionariosApi = inject(FuncionariosService);
  private formasApi = inject(FormasPagamentoService);
  private cashbackApi = inject(CashbackService);
  private caixasApi = inject(CaixasService);
  private coresApi = inject(CoresService);
  private tamanhosApi = inject(TamanhosService);
  private vendasApi = inject(VendaPdvService);
  private promocoesApi = inject(PromocoesService);
  private valeTrocaApi = inject(ValeTrocaService);

  loading = false;
  finalizando = false;
  pdvAberto = false;
  abertoEm = '';
  operadorNome = '';
  operadorTipo = '';
  vendaIniciada = false;
  cadastroClienteAberto = false;
  salvandoCliente = false;
  errorMsg = '';
  successMsg = '';
  busca = '';
  consultaProdutoAberta = false;
  buscaProdutoConsulta = '';
  produtoConsultaId: number | null = null;
  skuConsultaEan: string | null = null;
  qtdConsulta = 1;
  codigoRapido = '';
  descontoGeral = 0;
  valorRecebido = 0;
  saldoCashback = 0;
  saldoValeTroca = 0;
  cashbackAtivo = false;
  cashbackConfig: CashbackConfig | null = null;
  pagamentos: PagamentoVenda[] = [];
  cupom: CupomPdv | null = null;
  telaCheia = false;
  trocaAberta = false;
  trocaDocumento = '';
  trocaCodigoBarra = '';
  trocaMotivo = 'Troca no PDV';
  trocaLoading = false;
  trocaSaving = false;
  trocaVenda: VendaDevolucaoConsulta | null = null;
  trocaVendas: VendaDevolucaoConsulta[] = [];
  trocaQuantidades: Record<number, number> = {};

  lojaId: number | null = null;
  clienteId: number | null = null;
  vendedorId: number | null = null;
  caixaId: number | null = null;
  formaCodigo = 'AV';

  caixas: Caixa[] = [];
  lojas: Loja[] = [];
  clientes: Cliente[] = [];
  funcionarios: Funcionario[] = [];
  formas: FormaPagamento[] = [];
  valesTroca: ValeTroca[] = [];
  produtos: Produto[] = [];
  skus: ProdutoSku[] = [];
  estoques: Estoque[] = [];
  precos: TabelaPrecoProduto[] = [];
  promocoesAplicaveis: PromocaoAplicavel[] = [];
  cores: Cor[] = [];
  tamanhos: TamanhoModel[] = [];
  novoCliente = {
    nome_cliente: '',
    apelido: '',
    cpf: '',
    telefone1: '',
    email: ''
  };

  catalogo: CatalogoItem[] = [];
  selecionado: CatalogoItem | null = null;
  skuSelecionado: ProdutoSku | null = null;
  carrinho: CarrinhoItem[] = [];

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.telaCheia = !!document.fullscreenElement;
  }

  async alternarTelaCheia(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await document.documentElement.requestFullscreen();
    } catch {
      this.errorMsg = 'Não foi possível ativar a tela cheia neste navegador.';
    }
  }

  ngOnInit(): void {
    this.load();
  }

  get subtotal(): number {
    return this.carrinho.reduce((sum, item) => sum + item.qtd * item.preco, 0);
  }

  get descontoItens(): number {
    return this.carrinho.reduce((sum, item) => sum + item.desconto, 0);
  }

  get total(): number {
    return this.moeda(Math.max(0, this.subtotal - this.descontoItens - Number(this.descontoGeral || 0)));
  }

  get troco(): number {
    return this.moeda(Math.max(0, this.totalPago - this.total));
  }

  get totalPago(): number {
    return this.moeda(this.pagamentos.reduce((sum, pagamento) => sum + Number(pagamento.valor || 0), 0));
  }

  get saldoPendente(): number {
    return this.moeda(Math.max(0, this.total - this.totalPago));
  }

  get podeFinalizarVenda(): boolean {
    return !this.finalizando && this.carrinho.length > 0 && this.totalPago + 0.009 >= this.total;
  }

  get cashbackUsado(): number {
    return this.moeda(this.pagamentos
      .filter(pagamento => pagamento.forma === 'CASHBACK')
      .reduce((sum, pagamento) => sum + Number(pagamento.valor || 0), 0));
  }

  get cashbackPrevisto(): number {
    if (!this.cashbackAtivo || !this.cashbackConfig || !this.clienteId || this.clienteEhPadrao(this.clienteId)) return 0;
    const percentual = Number(this.cashbackConfig.percentual || 0);
    const minimo = Number(this.cashbackConfig.valor_minimo_geracao || 0);
    const base = this.moeda(Math.max(0, this.total - this.cashbackUsado));
    if (percentual <= 0 || base < minimo) return 0;
    return this.moeda(base * percentual / 100);
  }

  get cashbackMensagem(): string {
    if (!this.cashbackAtivo || !this.cashbackConfig) return 'Cashback inativo';
    if (!this.clienteId) return 'Selecione o cliente';
    if (this.clienteEhPadrao(this.clienteId)) return 'Cliente padrão não participa';
    if (Number(this.cashbackConfig.percentual || 0) <= 0) return 'Percentual zerado';
    return this.cashbackPrevisto > 0 ? 'Cashback previsto' : 'Sem cashback nesta venda';
  }

  get valesTrocaValidos(): ValeTroca[] {
    return this.valesTroca.filter(vale => vale.status === 'ABERTO' && Number(vale.saldo || 0) > 0);
  }

  get catalogoFiltrado(): CatalogoItem[] {
    const q = this.busca.trim().toLowerCase();
    if (!q) return this.catalogo;
    return this.catalogo.filter(item =>
      (item.produto.descricao || '').toLowerCase().includes(q) ||
      (item.produto.referencia || '').toLowerCase().includes(q) ||
      item.skus.some(s => (s.ean13 || '').includes(q))
    );
  }

  get produtosConsulta(): CatalogoItem[] {
    const q = this.buscaProdutoConsulta.trim().toLowerCase();
    const base = q ? this.catalogo.filter(item =>
      (item.produto.descricao || '').toLowerCase().includes(q) ||
      (item.produto.descricao_reduzida || '').toLowerCase().includes(q) ||
      (item.produto.referencia || '').toLowerCase().includes(q) ||
      String(item.produto.Idproduto || '').includes(q) ||
      item.skus.some(sku => (sku.ean13 || '').includes(q) || (sku.codigo_item_ref || '').includes(q))
    ) : this.catalogo;
    return base.slice(0, 80);
  }

  get produtoConsultaSelecionado(): CatalogoItem | null {
    return this.catalogo.find(item => item.produto.Idproduto === this.produtoConsultaId) ?? null;
  }

  get skusConsultaSelecionada(): ProdutoSku[] {
    return this.produtoConsultaSelecionado?.skus ?? [];
  }

  get caixasDaLoja(): Caixa[] {
    return this.caixas.filter(caixa => caixa.tipo_caixa !== 'MASTER' && (!this.lojaId || caixa.idloja === this.lojaId));
  }

  get vendedoresDaLoja(): Funcionario[] {
    return this.funcionarios.filter(func => {
      const categoria = (func.categoria || '').toLowerCase().trim();
      return func.ativo !== false && categoria === 'vendedor' && (!this.lojaId || func.idloja === this.lojaId);
    });
  }

  get statusTopo(): string {
    if (this.successMsg) return this.successMsg;
    if (this.vendaIniciada) return 'Venda em andamento';
    if (this.cupom) return 'Venda concluída';
    if (this.pdvAberto) return 'PDV aberto';
    return 'PDV fechado';
  }

  get podeAbrirPdv(): boolean {
    return ['caixa', 'gerente', 'admin', 'administrador'].includes(this.usuarioTipoNormalizado());
  }

  load(): void {
    const session = this.readSession();
    this.operadorNome = session?.operadorNome || this.auth.getUserName() || '';
    this.operadorTipo = session?.operadorTipo || this.auth.getUserType() || '';
    this.loading = true;
    forkJoin({
      caixas: this.caixasApi.list({ ativo: true }),
      lojas: this.lojasApi.list(),
      clientes: this.clientesApi.list(),
      funcionarios: this.funcionariosApi.list({ page_size: 200 }),
      formas: this.formasApi.list({ ativo: true }),
      cashback: this.cashbackApi.configAtiva(),
      produtos: this.produtosApi.list({ ativo: 'true', page_size: 500 }),
      skus: this.skusApi.list({ page_size: 5000 }),
      estoques: this.estoqueApi.list({ page_size: 5000 }),
      precos: this.precosApi.list(),
      cores: this.coresApi.list({ page_size: 500 }),
      tamanhos: this.tamanhosApi.list()
    }).subscribe({
      next: data => {
        this.caixas = this.unwrap<Caixa>(data.caixas);
        this.lojas = this.unwrap<Loja>(data.lojas);
        this.clientes = this.unwrap<Cliente>(data.clientes);
        this.funcionarios = this.unwrap<Funcionario>(data.funcionarios);
        this.formas = this.unwrap<FormaPagamento>(data.formas);
        this.cashbackConfig = data.cashback ?? null;
        this.cashbackAtivo = !!data.cashback?.ativo;
        this.produtos = this.unwrap<Produto>(data.produtos).filter(p => p.tipo_produto === '1' && p.ativo !== false && p.bloqueado_venda !== true);
        this.skus = this.unwrap<ProdutoSku>(data.skus).filter(s => s.ativo !== false && s.bloqueado_venda !== true);
        this.estoques = this.unwrap<Estoque>(data.estoques);
        this.precos = this.unwrap<TabelaPrecoProduto>(data.precos);
        this.cores = this.unwrap<Cor>(data.cores);
        this.tamanhos = this.unwrap<TamanhoModel>(data.tamanhos);
        if (session) {
          this.pdvAberto = true;
          this.lojaId = session.lojaId;
          this.caixaId = session.caixaId;
          this.vendedorId = null;
          this.abertoEm = session.abertoEm;
        } else {
          this.pdvAberto = false;
          this.lojaId = null;
          this.vendedorId = null;
          this.caixaId = null;
          this.abertoEm = '';
        }
        this.clienteId = this.clientePadraoId();
        this.carregarCreditosCliente();
        this.formaCodigo = this.formas.find(forma => forma.codigo === 'AV')?.codigo ?? this.formas[0]?.codigo ?? 'AV';
        if (!this.pagamentos.length) this.pagamentos = [this.novoPagamento('DINHEIRO')];
        this.montarCatalogo();
        this.carregarPromocoesAplicaveis();
        this.selecionarProduto(null);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar dados do PDV.';
      }
    });
  }

  abrirPdv(): void {
    if (!this.podeAbrirPdv) {
      this.errorMsg = 'Seu usuário não tem permissão para abrir o PDV.';
      return;
    }
    if (!this.lojaId || !this.caixaId) {
      this.errorMsg = 'Informe loja e caixa para abrir o PDV.';
      return;
    }
    const session: PdvSession = {
      lojaId: this.lojaId,
      caixaId: this.caixaId,
      operadorNome: this.auth.getUserName() || this.operadorNome || 'Usuário',
      operadorTipo: this.auth.getUserType() || this.operadorTipo || 'Regular',
      abertoEm: new Date().toISOString()
    };
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    this.pdvAberto = true;
    this.abertoEm = session.abertoEm;
    this.operadorNome = session.operadorNome;
    this.operadorTipo = session.operadorTipo;
    this.vendedorId = null;
    this.clienteId = this.clientePadraoId();
    this.carregarCreditosCliente();
    this.errorMsg = '';
    this.successMsg = 'PDV aberto.';
  }

  fecharPdv(): void {
    if (this.vendaIniciada && !confirm('Existe uma venda em andamento. Fechar o PDV mesmo assim?')) return;
    localStorage.removeItem(this.sessionKey);
    this.pdvAberto = false;
    this.vendaIniciada = false;
    this.carrinho = [];
    this.cupom = null;
    this.lojaId = null;
    this.vendedorId = null;
    this.caixaId = null;
    this.abertoEm = '';
    this.operadorNome = this.auth.getUserName() || '';
    this.operadorTipo = this.auth.getUserType() || '';
    this.descontoGeral = 0;
    this.valorRecebido = 0;
    this.pagamentos = [this.novoPagamento('DINHEIRO')];
    this.selecionarProduto(null);
    this.successMsg = 'PDV fechado.';
    this.errorMsg = '';
  }

  selecionarLojaOperacao(): void {
    const caixas = this.caixasDaLoja;
    this.caixaId = caixas.length === 1 ? caixas[0].Idcaixa ?? null : null;
    this.vendedorId = null;
    this.carregarPromocoesAplicaveis();
  }

  selecionarProduto(item: CatalogoItem | null): void {
    if (!this.vendaIniciada && item) return;
    this.selecionado = item;
    this.skuSelecionado = item?.skus[0] ?? null;
  }

  lancarProdutoConsulta(): void {
    const sku = this.skusConsultaSelecionada.find(item => item.ean13 === this.skuConsultaEan);
    if (!sku) {
      this.errorMsg = 'Selecione uma cor/tamanho para lançar.';
      return;
    }
    const quantidade = Math.max(1, Number(this.qtdConsulta || 1));
    if (this.disponivelSku(sku) < quantidade) {
      this.errorMsg = 'Saldo insuficiente para a quantidade informada.';
      return;
    }
    this.adicionarSku(sku.ean13, quantidade);
    this.qtdConsulta = 1;
  }

  selecionarProdutoConsulta(): void {
    const primeiroComSaldo = this.skusConsultaSelecionada.find(sku => this.disponivelSku(sku) > 0);
    this.skuConsultaEan = primeiroComSaldo?.ean13 ?? this.skusConsultaSelecionada[0]?.ean13 ?? null;
    this.qtdConsulta = 1;
  }

  iniciarVenda(): void {
    if (!this.pdvAberto || !this.lojaId || !this.caixaId) {
      this.errorMsg = 'Abra o PDV antes de iniciar a venda.';
      return;
    }
    if (!this.clienteId || !this.vendedorId) {
      this.errorMsg = 'Informe cliente e vendedor para iniciar a venda.';
      return;
    }
    if (!this.vendedoresDaLoja.some(vendedor => vendedor.id === this.vendedorId)) {
      this.errorMsg = 'Selecione um vendedor vinculado a esta loja.';
      return;
    }
    this.vendaIniciada = true;
    this.errorMsg = '';
    this.successMsg = 'Venda iniciada.';
    this.montarCatalogo();
    this.carregarPromocoesAplicaveis();
    this.selecionarProduto(null);
  }

  cancelarVenda(): void {
    if (this.carrinho.length && !confirm('Cancelar a venda atual?')) return;
    this.vendaIniciada = false;
    this.carrinho = [];
    this.selecionarProduto(null);
    this.descontoGeral = 0;
    this.valorRecebido = 0;
    this.pagamentos = [this.novoPagamento('DINHEIRO')];
    this.cupom = null;
    this.successMsg = '';
    this.errorMsg = '';
  }

  abrirCadastroCliente(): void {
    this.cadastroClienteAberto = true;
    this.novoCliente = {
      nome_cliente: '',
      apelido: '',
      cpf: '',
      telefone1: '',
      email: ''
    };
  }

  salvarClienteRapido(): void {
    const nome = this.novoCliente.nome_cliente.trim();
    if (!nome) {
      this.errorMsg = 'Informe o nome do cliente.';
      return;
    }
    this.salvandoCliente = true;
    this.clientesApi.create({
      nome_cliente: nome,
      apelido: this.novoCliente.apelido.trim() || nome.slice(0, 18),
      cpf: this.novoCliente.cpf.trim() || undefined,
      telefone1: this.novoCliente.telefone1.trim() || undefined,
      email: this.novoCliente.email.trim() || undefined,
      categoria: 'Varejo',
      ativo: true,
      bloqueio: false,
      mala_direta: false
    } as Cliente).subscribe({
      next: cliente => {
        this.salvandoCliente = false;
        this.cadastroClienteAberto = false;
        this.clientes = [cliente, ...this.clientes.filter(c => c.id !== cliente.id)];
        this.clienteId = cliente.id ?? null;
        this.carregarCreditosCliente();
        this.successMsg = 'Cliente cadastrado e selecionado.';
        this.errorMsg = '';
      },
      error: () => {
        this.salvandoCliente = false;
        this.errorMsg = 'Falha ao cadastrar cliente.';
      }
    });
  }

  adicionarSelecionado(): void {
    if (!this.vendaIniciada) return;
    if (!this.selecionado || !this.skuSelecionado) return;
    this.adicionarSku(this.skuSelecionado.ean13, 1);
  }

  adicionarCodigoRapido(): void {
    if (!this.vendaIniciada) {
      this.errorMsg = 'Inicie a venda antes de lançar itens.';
      return;
    }
    const codigo = this.codigoRapido.trim();
    if (!codigo) return;
    const ok = this.adicionarSku(codigo, 1);
    if (ok) this.codigoRapido = '';
  }

  adicionarSku(ean: string, quantidade = 1): boolean {
    if (!this.vendaIniciada) {
      this.errorMsg = 'Inicie a venda antes de lançar itens.';
      return false;
    }
    const codigo = String(ean || '').trim().toLowerCase();
    const sku = this.encontrarSkuPorCodigo(codigo);
    if (!sku) {
      this.errorMsg = 'Código, SKU ou produto não encontrado.';
      return false;
    }
    const produto = this.produtos.find(p => p.Idproduto === sku.produto);
    if (!produto) {
      this.errorMsg = 'Produto não disponível para venda.';
      return false;
    }
    const catalogo = this.catalogo.find(c => c.produto.Idproduto === produto.Idproduto);
    if (catalogo) {
      this.selecionado = catalogo;
      this.skuSelecionado = sku;
    }
    const disponivel = this.disponivelSku(sku);
    const existente = this.carrinho.find(i => i.ean === sku.ean13);
    if ((existente?.qtd ?? 0) + quantidade > disponivel) {
      this.errorMsg = 'Saldo insuficiente para este SKU.';
      return false;
    }
    if (existente) {
      existente.qtd += quantidade;
    } else {
      this.carrinho.push({
        produto,
        sku,
        ean: sku.ean13,
        descricao: produto.descricao,
        cor: this.corNome(sku.idcor),
        tamanho: this.tamanhoNome(sku.idtamanho),
        imagem: catalogo?.imagem ?? this.imagemProduto(produto),
        qtd: quantidade,
        preco: catalogo?.preco ?? this.precoProduto(produto.Idproduto),
        desconto: 0,
        promocao: catalogo?.promocao?.nome
      });
    }
    this.sugerirPagamentoTotal();
    this.successMsg = '';
    this.errorMsg = '';
    return true;
  }

  removerItem(index: number): void {
    this.carrinho.splice(index, 1);
    this.sugerirPagamentoTotal();
  }

  limparVenda(): void {
    if (this.carrinho.length && !confirm('Limpar a venda atual?')) return;
    this.carrinho = [];
    this.descontoGeral = 0;
    this.valorRecebido = 0;
    this.pagamentos = [this.novoPagamento('DINHEIRO')];
  }

  abrirTroca(): void {
    if (!this.clienteId || this.clienteEhPadrao(this.clienteId)) {
      this.errorMsg = 'Troca exige cliente identificado.';
      return;
    }
    this.trocaAberta = !this.trocaAberta;
    this.errorMsg = '';
  }

  buscarTrocaPorDocumento(): void {
    const documento = this.trocaDocumento.trim();
    if (!documento) {
      this.errorMsg = 'Informe o cupom da venda original.';
      return;
    }
    this.trocaLoading = true;
    this.errorMsg = '';
    this.vendasApi.buscarVendaParaDevolucao(documento).subscribe({
      next: venda => {
        if (venda.cliente !== this.clienteId) {
          this.trocaLoading = false;
          this.errorMsg = 'Venda encontrada, mas não pertence ao cliente selecionado.';
          return;
        }
        this.prepararTrocaVenda(venda);
        this.trocaLoading = false;
      },
      error: err => {
        this.trocaLoading = false;
        this.trocaVenda = null;
        this.trocaQuantidades = {};
        this.errorMsg = err?.error?.detail || 'Venda não encontrada para troca.';
      }
    });
  }

  buscarTrocaPorCodigo(): void {
    const ean = this.trocaCodigoBarra.trim();
    if (!this.clienteId || this.clienteEhPadrao(this.clienteId)) {
      this.errorMsg = 'Informe um cliente identificado antes de buscar a troca.';
      return;
    }
    if (!ean) {
      this.errorMsg = 'Informe ou bipe o código de barras da peça devolvida.';
      return;
    }
    this.trocaLoading = true;
    this.errorMsg = '';
    this.vendasApi.vendasDevolviveis({
      loja: this.lojaId,
      cliente: this.clienteId,
      ean
    }).subscribe({
      next: vendas => {
        this.trocaVendas = vendas;
        this.trocaLoading = false;
        if (!vendas.length) {
          this.trocaVenda = null;
          this.trocaQuantidades = {};
          this.errorMsg = 'Referência não consta para o cliente.';
          return;
        }
        this.carregarVendaTroca(vendas[0], ean);
      },
      error: () => {
        this.trocaLoading = false;
        this.trocaVendas = [];
        this.trocaVenda = null;
        this.trocaQuantidades = {};
        this.errorMsg = 'Referência não consta para o cliente.';
      }
    });
  }

  carregarVendaTroca(venda: VendaDevolucaoConsulta, eanSelecionado = ''): void {
    this.trocaLoading = true;
    this.errorMsg = '';
    this.vendasApi.buscarVendaParaDevolucao(venda.documento, venda.id).subscribe({
      next: vendaAtualizada => {
        this.prepararTrocaVenda(vendaAtualizada, eanSelecionado);
        this.trocaLoading = false;
      },
      error: err => {
        this.trocaLoading = false;
        this.errorMsg = err?.error?.detail || 'Falha ao carregar venda para troca.';
      }
    });
  }

  finalizarTroca(): void {
    if (!this.trocaVenda) return;
    const itens = this.trocaVenda.itens
      .map(item => ({ venda_item: item.id, quantidade: Math.trunc(Number(this.trocaQuantidades[item.id] || 0)) }))
      .filter(item => item.quantidade > 0);
    if (!itens.length) {
      this.errorMsg = 'Informe a quantidade de ao menos uma peça para troca.';
      return;
    }
    const invalido = itens.some(row => {
      const item = this.trocaVenda?.itens.find(i => i.id === row.venda_item);
      return !item || row.quantidade > item.quantidade_disponivel;
    });
    if (invalido) {
      this.errorMsg = 'Existe item com quantidade maior que o saldo disponível para troca.';
      return;
    }
    this.trocaSaving = true;
    this.errorMsg = '';
    this.vendasApi.finalizarDevolucao({
      venda: this.trocaVenda.id,
      motivo: this.trocaMotivo,
      itens
    }).subscribe({
      next: devolucao => {
        this.trocaSaving = false;
        this.successMsg = `Troca ${devolucao.vale_troca?.documento || devolucao.documento} gerada.`;
        this.trocaAberta = false;
        this.trocaVenda = null;
        this.trocaQuantidades = {};
        this.trocaDocumento = '';
        this.trocaCodigoBarra = '';
        const creditoGerado = this.moeda(Number(devolucao.vale_troca?.saldo || devolucao.credito_cliente || 0));
        this.saldoValeTroca = this.moeda(this.saldoValeTroca + creditoGerado);
        if (devolucao.vale_troca && this.clienteId && this.lojaId) {
          this.valesTroca = [{
            Idvaletroca: devolucao.vale_troca.id,
            documento: devolucao.vale_troca.documento,
            cliente: this.clienteId,
            cliente_nome: this.clienteNome(this.clienteId),
            loja: this.lojaId,
            loja_nome: this.lojaNome(this.lojaId),
            devolucao: devolucao.id,
            devolucao_documento: devolucao.documento,
            valor_original: devolucao.vale_troca.valor_original,
            saldo: devolucao.vale_troca.saldo,
            status: devolucao.vale_troca.status
          }, ...this.valesTroca.filter(vale => vale.Idvaletroca !== devolucao.vale_troca?.id)];
        }
        this.carregarCreditosCliente();
        this.aplicarPagamentoTroca(creditoGerado);
      },
      error: err => {
        this.trocaSaving = false;
        this.errorMsg = err?.error?.detail || 'Falha ao gerar troca.';
      }
    });
  }

  totalTrocaSelecionado(): number {
    if (!this.trocaVenda) return 0;
    return this.trocaVenda.itens.reduce((total, item) => total + this.totalTrocaItemSelecionado(item), 0);
  }

  totalTrocaItemSelecionado(item: VendaDevolucaoItemConsulta): number {
    const quantidade = Math.max(0, Math.trunc(Number(this.trocaQuantidades[item.id] || 0)));
    if (!quantidade) return 0;
    const valorUnitarioLiquido = Number(item.total_item || 0) / Math.max(1, Number(item.quantidade || 1));
    return this.moeda(quantidade * valorUnitarioLiquido);
  }

  private prepararTrocaVenda(venda: VendaDevolucaoConsulta, eanSelecionado = ''): void {
    this.trocaVenda = venda;
    this.trocaQuantidades = {};
    venda.itens.forEach(item => {
      const selecionado = !eanSelecionado || item.ean === eanSelecionado;
      this.trocaQuantidades[item.id] = item.quantidade_disponivel > 0 && selecionado ? 1 : 0;
    });
  }

  private aplicarPagamentoTroca(valorDisponivel: number): void {
    const valorTroca = this.moeda(Math.min(this.total, valorDisponivel));
    if (valorTroca <= 0) return;
    let pagamentoTroca = this.pagamentos.find(p => p.forma === 'TROCA');
    if (!pagamentoTroca) {
      pagamentoTroca = this.novoPagamento('TROCA');
      this.pagamentos.push(pagamentoTroca);
    }
    pagamentoTroca.autorizacao = this.valesTrocaValidos[0]?.documento || pagamentoTroca.autorizacao;
    pagamentoTroca.valor = this.moeda(Math.min(valorTroca, this.saldoValeTrocaPagamento(pagamentoTroca)));

    let excesso = this.moeda(this.totalPago - this.total);
    for (const pagamento of this.pagamentos) {
      if (excesso <= 0 || pagamento.forma === 'TROCA') continue;
      const reducao = this.moeda(Math.min(Number(pagamento.valor || 0), excesso));
      pagamento.valor = this.moeda(Number(pagamento.valor || 0) - reducao);
      excesso = this.moeda(excesso - reducao);
    }
  }

  adicionarPagamento(): void {
    const pagamento = this.novoPagamento('DINHEIRO');
    pagamento.valor = Number(this.saldoPendente.toFixed(2));
    this.pagamentos.push(pagamento);
  }

  removerPagamento(index: number): void {
    if (this.pagamentos.length === 1) {
      this.pagamentos[0] = this.novoPagamento('DINHEIRO');
      return;
    }
    this.pagamentos.splice(index, 1);
  }

  preencherSaldoPagamento(index: number): void {
    const pagosOutros = this.pagamentos.reduce((sum, pagamento, i) => i === index ? sum : sum + Number(pagamento.valor || 0), 0);
    const pendente = this.moeda(Math.max(0, this.total - pagosOutros));
    if (this.pagamentos[index].forma === 'CASHBACK') {
      this.pagamentos[index].valor = this.moeda(Math.min(pendente, this.saldoCashback));
      return;
    }
    if (this.pagamentos[index].forma === 'TROCA') {
      this.pagamentos[index].valor = this.moeda(Math.min(pendente, this.saldoValeTrocaPagamento(this.pagamentos[index])));
      return;
    }
    this.pagamentos[index].valor = pendente;
  }

  sugerirPagamentoTotal(): void {
    if (this.pagamentos.length !== 1) return;
    this.pagamentos[0].valor = this.moeda(this.total);
  }

  atualizarDescontoCupom(): void {
    this.descontoGeral = this.moeda(Math.max(0, Number(this.descontoGeral || 0)));
    if (!this.pagamentos.length) return;
    const index = this.pagamentos.length === 1 ? 0 : this.pagamentos.length - 1;
    this.preencherSaldoPagamento(index);
  }

  finalizar(): void {
    const pagamentos = this.pagamentosValidos();
    if (!this.lojaId || !this.caixaId || !this.clienteId || !this.vendedorId || this.carrinho.length === 0) {
      this.errorMsg = 'Informe loja, caixa, cliente, vendedor e ao menos um item.';
      return;
    }
    if (!pagamentos.length) {
      this.errorMsg = 'Informe pelo menos uma forma de pagamento com valor.';
      return;
    }
    if (!this.podeFinalizarVenda) {
      this.errorMsg = 'O valor pago pelo cliente ainda não cobre o total da venda.';
      return;
    }

    this.finalizando = true;

    this.vendasApi.finalizar({
      loja: this.lojaId!,
      caixa: this.caixaId!,
      cliente: this.clienteId!,
      vendedor: this.vendedorId!,
      forma_pagamento: pagamentos.length === 1 ? pagamentos[0].forma : 'MULTIPLO',
      desconto_geral: Number(this.descontoGeral || 0),
      valor_recebido: Number(this.totalPago || 0),
      pagamentos,
      itens: this.carrinho.map(item => ({
        ean: item.ean,
        descricao: item.descricao,
        cor: item.cor,
        tamanho: item.tamanho,
        quantidade: Number(item.qtd || 0),
        preco_unitario: Number(item.preco || 0),
        desconto: Number(item.desconto || 0)
      }))
    }).subscribe({
      next: venda => this.finalizarOk(venda.documento, venda.cupom ?? null),
      error: err => {
        this.finalizando = false;
        this.errorMsg = err?.error?.detail || 'Falha ao finalizar a venda e emitir a NFC-e.';
      }
    });
  }

  private finalizarOk(documento: string, cupom: CupomPdv | null): void {
    this.finalizando = false;
    this.cupom = cupom;
    const fiscal = cupom?.nfce?.status === 'AUTORIZADA' ? ` NFC-e ${cupom.nfce.serie}/${cupom.nfce.numero} autorizada.` : '';
    this.successMsg = `Venda finalizada: ${documento}.${fiscal}`;
    this.vendaIniciada = false;
    this.carrinho = [];
    this.selecionarProduto(null);
    this.descontoGeral = 0;
    this.valorRecebido = 0;
    this.pagamentos = [this.novoPagamento('DINHEIRO')];
    this.load();
  }

  imprimirCupom(): void {
    setTimeout(() => window.print(), 50);
  }

  novaVenda(): void {
    this.cupom = null;
    this.successMsg = '';
    this.errorMsg = '';
    this.cadastroClienteAberto = false;
    this.clienteId = this.clientePadraoId();
    this.carregarCreditosCliente();
    this.vendedorId = null;
    this.pagamentos = [this.novoPagamento('DINHEIRO')];
  }

  pagamentoDescricao(forma: string): string {
    const labels: Record<string, string> = {
      DINHEIRO: 'Dinheiro',
      DEBITO: 'Cartão débito',
      CREDITO: 'Cartão crédito',
      PIX: 'Pix',
      CASHBACK: 'Cashback',
      TROCA: 'Troca',
      OUTRO: 'Outro'
    };
    return labels[forma] || forma;
  }

  alterarFormaPagamento(index: number): void {
    const pagamento = this.pagamentos[index];
    pagamento.descricao = this.pagamentoDescricao(pagamento.forma);
    if (pagamento.forma === 'CASHBACK') {
      pagamento.autorizacao = '';
      this.preencherSaldoPagamento(index);
    }
    if (pagamento.forma === 'TROCA') {
      pagamento.autorizacao = this.valesTrocaValidos[0]?.documento || '';
      this.preencherSaldoPagamento(index);
    }
  }

  alterarCupomTrocaPagamento(index: number): void {
    this.preencherSaldoPagamento(index);
  }

  saldoValeTrocaPagamento(pagamento: PagamentoVenda): number {
    if (!pagamento.autorizacao) return this.saldoValeTroca;
    const vale = this.valesTrocaValidos.find(item => item.documento === pagamento.autorizacao);
    return this.moeda(Number(vale?.saldo || 0));
  }

  valorCupom(value: string | number | null | undefined): number {
    return Number(value || 0);
  }

  caixaDescricao(id: number | null): string {
    const caixa = this.caixas.find(c => c.Idcaixa === id);
    return caixa ? `${caixa.codigo} - ${caixa.descricao}` : '';
  }

  private montarCatalogo(): void {
    this.catalogo = this.produtos.map(produto => {
      const skus = this.skus.filter(s => s.produto === produto.Idproduto);
      const precoBase = this.precoProduto(produto.Idproduto);
      const promocao = this.promocaoProduto(produto.Idproduto);
      return {
        produto,
        preco: promocao ? this.precoComPromocao(precoBase, promocao) : precoBase,
        imagem: this.imagemProduto(produto),
        estoqueTotal: skus.reduce((sum, sku) => sum + this.disponivelSku(sku), 0),
        skus,
        promocao
      };
    }).filter(item => item.skus.length > 0);
  }

  private carregarPromocoesAplicaveis(): void {
    const ids = this.produtos.map(p => p.Idproduto).filter((id): id is number => !!id);
    if (!ids.length) {
      this.promocoesAplicaveis = [];
      return;
    }
    this.promocoesApi.aplicaveis(this.lojaId, ids).subscribe({
      next: res => {
        this.promocoesAplicaveis = res.results ?? [];
        this.montarCatalogo();
      },
      error: () => this.promocoesAplicaveis = []
    });
  }

  private promocaoProduto(produtoId?: number): PromocaoAplicavel | null {
    return this.promocoesAplicaveis.find(p => p.produto === produtoId) ?? null;
  }

  private precoComPromocao(precoBase: number, promocao: PromocaoAplicavel): number {
    const valor = Number(promocao.valor || 0);
    if (promocao.tipo === 'PRECO_FIXO') return this.moeda(Math.max(0, valor));
    if (promocao.tipo === 'DESCONTO_VALOR') return this.moeda(Math.max(0, precoBase - valor));
    if (promocao.tipo === 'DESCONTO_PERCENTUAL') return this.moeda(Math.max(0, precoBase - (precoBase * valor / 100)));
    return precoBase;
  }

  disponivelSku(sku: ProdutoSku): number {
    const saldo = this.estoques
      .filter(e => e.CodigodeBarra === sku.ean13 && (!this.lojaId || e.Idloja === this.lojaId))
      .reduce((sum, e) => sum + Number(e.Estoque || 0) - Number(e.reserva || 0), 0);
    return Math.max(0, saldo);
  }

  private precoProduto(produtoId?: number): number {
    const preco = this.precos.find(p => p.produto === produtoId && (p.ativo ?? true));
    return Number(preco?.preco_promocional || preco?.preco || 0);
  }

  private imagemProduto(produto: Produto): string {
    const desc = `${produto.descricao} ${produto.descricao_reduzida || ''}`.toLowerCase();
    if (desc.includes('jeans') || desc.includes('calca')) return 'assets/jeans1.jpeg';
    if (desc.includes('vestido')) return 'assets/vestido1.jpeg';
    if (desc.includes('blusa')) return 'assets/blusa1.jpeg';
    return 'assets/vestido2.jpeg';
  }

  corNome(id: number): string {
    return this.cores.find(c => c.Idcor === id)?.Descricao || `Cor #${id}`;
  }

  tamanhoNome(id: number): string {
    return this.tamanhos.find(t => t.Idtamanho === id)?.Tamanho || `Tam #${id}`;
  }

  clienteNome(id: number | null): string {
    return this.clientes.find(c => c.id === id)?.nome_cliente || '';
  }

  lojaNome(id: number | null): string {
    return this.lojas.find(l => l.id === id)?.nome_loja || '';
  }

  vendedorNome(id: number | null): string {
    return this.vendedoresDaLoja.find(f => f.id === id)?.nomefuncionario || '';
  }

  abertoEmFormatado(): string {
    if (!this.abertoEm) return '';
    return new Date(this.abertoEm).toLocaleString('pt-BR');
  }

  usuarioTipoLabel(): string {
    return this.operadorTipo || 'Regular';
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }

  private clientePadraoId(): number | null {
    const padrao = this.clientes.find(c =>
      (c.cpf || '').replace(/\D/g, '') === '00000000000' ||
      (c.nome_cliente || '').toLowerCase().includes('consumidor final')
    );
    return padrao?.id ?? this.clientes[0]?.id ?? null;
  }

  carregarCreditosCliente(): void {
    this.carregarSaldoCashback();
    this.carregarSaldoValeTroca();
  }

  carregarSaldoCashback(): void {
    this.saldoCashback = 0;
    if (!this.clienteId || !this.cashbackAtivo || this.clienteEhPadrao(this.clienteId)) return;
    this.cashbackApi.saldo(this.clienteId).subscribe({
      next: saldo => this.saldoCashback = this.moeda(Number(saldo.saldo || 0)),
      error: () => this.saldoCashback = 0
    });
  }

  carregarSaldoValeTroca(): void {
    this.saldoValeTroca = 0;
    this.valesTroca = [];
    if (!this.clienteId || this.clienteEhPadrao(this.clienteId)) return;
    this.valeTrocaApi.saldo(this.clienteId).subscribe({
      next: saldo => this.saldoValeTroca = this.moeda(Number(saldo.saldo || 0)),
      error: () => this.saldoValeTroca = 0
    });
    this.valeTrocaApi.disponiveis(this.clienteId).subscribe({
      next: vales => this.valesTroca = vales ?? [],
      error: () => this.valesTroca = []
    });
  }

  private clienteEhPadrao(clienteId: number): boolean {
    const cliente = this.clientes.find(c => c.id === clienteId);
    const cpf = String(cliente?.cpf || '').replace(/\D/g, '');
    return cpf === '00000000000' || String(cliente?.nome_cliente || '').toLowerCase().includes('consumidor final');
  }

  private readSession(): PdvSession | null {
    try {
      const raw = localStorage.getItem(this.sessionKey);
      if (!raw) return null;
      const session = JSON.parse(raw) as PdvSession;
      if (!session.lojaId || !session.caixaId) return null;
      return session;
    } catch {
      return null;
    }
  }

  private usuarioTipoNormalizado(): string {
    return (this.auth.getUserType() || this.operadorTipo || '').toLowerCase().trim();
  }

  private novoPagamento(forma: string): PagamentoVenda {
    return { forma, descricao: this.pagamentoDescricao(forma), valor: 0, autorizacao: '' };
  }

  private encontrarSkuPorCodigo(codigo: string): ProdutoSku | undefined {
    const skuDireto = this.skus.find(s =>
      (s.ean13 || '').toLowerCase() === codigo ||
      (s.codigo_item_ref || '').toLowerCase() === codigo
    );
    if (skuDireto) return skuDireto;

    const produto = this.produtos.find(p =>
      String(p.Idproduto || '').toLowerCase() === codigo ||
      (p.referencia || '').toLowerCase() === codigo ||
      (p.descricao_reduzida || '').toLowerCase() === codigo
    );
    return produto ? this.primeiroSkuDisponivel(produto.Idproduto) : undefined;
  }

  private primeiroSkuDisponivel(produtoId?: number): ProdutoSku | undefined {
    const skusProduto = this.skus.filter(s => s.produto === produtoId);
    return skusProduto.find(s => this.disponivelSku(s) > 0) ?? skusProduto[0];
  }

  private pagamentosValidos(): VendaPdvPagamentoPayload[] {
    return this.pagamentos
      .map(pagamento => ({
        forma: String(pagamento.forma || '').toUpperCase(),
        descricao: this.pagamentoDescricao(String(pagamento.forma || '').toUpperCase()),
        valor: Number(pagamento.valor || 0),
        autorizacao: String(pagamento.autorizacao || '').trim()
      }))
      .filter(pagamento => pagamento.forma && pagamento.valor > 0);
  }

  private moeda(value: number): number {
    return Number(Number(value || 0).toFixed(2));
  }

}
