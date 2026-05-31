import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Caixa } from '../../core/models/caixa';
import { Cliente } from '../../core/models/clientes';
import { Cor } from '../../core/models/cor';
import { Estoque } from '../../core/models/estoque';
import { FormaPagamento } from '../../core/models/forma-pagamento';
import { Funcionario } from '../../core/models/funcionario';
import { Loja } from '../../core/models/loja';
import { Produto } from '../../core/models/produto';
import { TamanhoModel } from '../../core/models/tamanho';
import { CupomPdv } from '../../core/models/venda-pdv';
import { AuthService } from '../../core/auth.service';
import { CaixasService } from '../../core/services/caixas.service';
import { ClientesService } from '../../core/services/clientes.service';
import { CoresService } from '../../core/services/cores.service';
import { EstoqueService } from '../../core/services/estoque.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { FuncionariosService } from '../../core/services/funcionarios.service';
import { LojasService } from '../../core/services/lojas.service';
import { ProdutoDetalheService, ProdutoSku } from '../../core/services/produto-detalhe.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { TabelaprecoProdutoService, TabelaPrecoProduto } from '../../core/services/tabelapreco-produto.service';
import { TamanhosService } from '../../core/services/tamanhos.service';
import { VendaPdvService } from '../../core/services/venda-pdv.service';

interface CatalogoItem {
  produto: Produto;
  preco: number;
  imagem: string;
  estoqueTotal: number;
  skus: ProdutoSku[];
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
}

interface PdvSession {
  lojaId: number;
  caixaId: number;
  operadorNome: string;
  operadorTipo: string;
  abertoEm: string;
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
  private caixasApi = inject(CaixasService);
  private coresApi = inject(CoresService);
  private tamanhosApi = inject(TamanhosService);
  private vendasApi = inject(VendaPdvService);

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
  codigoRapido = '';
  descontoGeral = 0;
  valorRecebido = 0;
  cupom: CupomPdv | null = null;

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
  produtos: Produto[] = [];
  skus: ProdutoSku[] = [];
  estoques: Estoque[] = [];
  precos: TabelaPrecoProduto[] = [];
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
    return Math.max(0, this.subtotal - this.descontoItens - Number(this.descontoGeral || 0));
  }

  get troco(): number {
    return Math.max(0, Number(this.valorRecebido || 0) - this.total);
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

  get caixasDaLoja(): Caixa[] {
    return this.caixas.filter(caixa => caixa.tipo_caixa !== 'MASTER' && (!this.lojaId || caixa.idloja === this.lojaId));
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
      produtos: this.produtosApi.list({ ativo: 'true', page_size: 500 }),
      skus: this.skusApi.list(),
      estoques: this.estoqueApi.list(),
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
        this.formaCodigo = this.formas.find(forma => forma.codigo === 'AV')?.codigo ?? this.formas[0]?.codigo ?? 'AV';
        this.montarCatalogo();
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
    this.selecionarProduto(null);
    this.successMsg = 'PDV fechado.';
    this.errorMsg = '';
  }

  selecionarLojaOperacao(): void {
    const caixas = this.caixasDaLoja;
    this.caixaId = caixas.length === 1 ? caixas[0].Idcaixa ?? null : null;
  }

  selecionarProduto(item: CatalogoItem | null): void {
    if (!this.vendaIniciada && item) return;
    this.selecionado = item;
    this.skuSelecionado = item?.skus[0] ?? null;
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
    this.vendaIniciada = true;
    this.errorMsg = '';
    this.successMsg = 'Venda iniciada.';
    this.montarCatalogo();
    this.selecionarProduto(this.catalogo[0] ?? null);
  }

  cancelarVenda(): void {
    if (this.carrinho.length && !confirm('Cancelar a venda atual?')) return;
    this.vendaIniciada = false;
    this.carrinho = [];
    this.selecionarProduto(null);
    this.descontoGeral = 0;
    this.valorRecebido = 0;
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
    this.adicionarSku(this.skuSelecionado.ean13);
  }

  adicionarCodigoRapido(): void {
    if (!this.vendaIniciada) {
      this.errorMsg = 'Inicie a venda antes de lançar itens.';
      return;
    }
    const codigo = this.codigoRapido.trim();
    if (!codigo) return;
    const ok = this.adicionarSku(codigo);
    if (ok) this.codigoRapido = '';
  }

  adicionarSku(ean: string): boolean {
    if (!this.vendaIniciada) {
      this.errorMsg = 'Inicie a venda antes de lançar itens.';
      return false;
    }
    const sku = this.skus.find(s => s.ean13 === ean);
    if (!sku) {
      this.errorMsg = 'SKU/EAN não encontrado.';
      return false;
    }
    const produto = this.produtos.find(p => p.Idproduto === sku.produto);
    if (!produto) {
      this.errorMsg = 'Produto não disponível para venda.';
      return false;
    }
    const disponivel = this.disponivelSku(sku);
    const existente = this.carrinho.find(i => i.ean === ean);
    if ((existente?.qtd ?? 0) + 1 > disponivel) {
      this.errorMsg = 'Saldo insuficiente para este SKU.';
      return false;
    }
    const catalogo = this.catalogo.find(c => c.produto.Idproduto === produto.Idproduto);
    if (existente) {
      existente.qtd += 1;
    } else {
      this.carrinho.push({
        produto,
        sku,
        ean,
        descricao: produto.descricao,
        cor: this.corNome(sku.idcor),
        tamanho: this.tamanhoNome(sku.idtamanho),
        imagem: catalogo?.imagem ?? this.imagemProduto(produto),
        qtd: 1,
        preco: catalogo?.preco ?? this.precoProduto(produto.Idproduto),
        desconto: 0
      });
    }
    this.successMsg = '';
    this.errorMsg = '';
    return true;
  }

  removerItem(index: number): void {
    this.carrinho.splice(index, 1);
  }

  limparVenda(): void {
    if (this.carrinho.length && !confirm('Limpar a venda atual?')) return;
    this.carrinho = [];
    this.descontoGeral = 0;
    this.valorRecebido = 0;
  }

  finalizar(): void {
    if (!this.lojaId || !this.caixaId || !this.clienteId || !this.vendedorId || !this.formaCodigo || this.carrinho.length === 0) {
      this.errorMsg = 'Informe loja, caixa, cliente, vendedor, forma e ao menos um item.';
      return;
    }
    if (Number(this.valorRecebido || 0) < this.total && this.formaCodigo === 'AV') {
      this.errorMsg = 'Valor recebido menor que o total.';
      return;
    }

    this.finalizando = true;

    this.vendasApi.finalizar({
      loja: this.lojaId!,
      caixa: this.caixaId!,
      cliente: this.clienteId!,
      vendedor: this.vendedorId!,
      forma_pagamento: this.formaCodigo,
      desconto_geral: Number(this.descontoGeral || 0),
      valor_recebido: Number(this.valorRecebido || 0),
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
      error: () => {
        this.finalizando = false;
        this.errorMsg = 'Falha ao finalizar a venda e emitir a NFC-e.';
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
    this.vendedorId = null;
  }

  caixaDescricao(id: number | null): string {
    const caixa = this.caixas.find(c => c.Idcaixa === id);
    return caixa ? `${caixa.codigo} - ${caixa.descricao}` : '';
  }

  private montarCatalogo(): void {
    this.catalogo = this.produtos.map(produto => {
      const skus = this.skus.filter(s => s.produto === produto.Idproduto);
      return {
        produto,
        preco: this.precoProduto(produto.Idproduto),
        imagem: this.imagemProduto(produto),
        estoqueTotal: skus.reduce((sum, sku) => sum + this.disponivelSku(sku), 0),
        skus
      };
    }).filter(item => item.skus.length > 0);
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
    return this.funcionarios.find(f => f.id === id)?.nomefuncionario || '';
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

}
