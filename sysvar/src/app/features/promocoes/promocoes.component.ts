import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Colecao } from '../../core/models/colecao';
import { GrupoModel } from '../../core/models/grupo';
import { Loja } from '../../core/models/loja';
import { Produto } from '../../core/models/produto';
import { Promocao, PromocaoEscopo, PromocaoTipo } from '../../core/models/promocao';
import { SubgrupoModel } from '../../core/models/subgrupo';
import { ColecoesService } from '../../core/services/colecoes.service';
import { GruposService } from '../../core/services/grupos.service';
import { LojasService } from '../../core/services/lojas.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { PromocoesService } from '../../core/services/promocoes.service';
import { SubgruposService } from '../../core/services/subgrupos.service';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-promocoes',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSuggestComponent],
  templateUrl: './promocoes.component.html',
  styleUrls: ['./promocoes.component.css']
})
export class PromocoesComponent implements OnInit {
  private promocoesApi = inject(PromocoesService);
  private lojasApi = inject(LojasService);
  private produtosApi = inject(ProdutosService);
  private colecoesApi = inject(ColecoesService);
  private gruposApi = inject(GruposService);
  private subgruposApi = inject(SubgruposService);
  private auth = inject(AuthService);

  loading = false;
  saving = false;
  editingId: number | null = null;
  consultando = false;
  errorMsg = '';
  successMsg = '';
  todasLojas = true;
  produtoBusca = '';
  produtoAdicionarId: number | null = null;
  excluirModal: Promocao | null = null;
  get podeEditarModulo(): boolean { return this.auth.podeAcessarModulo('vendas', true) !== false; }

  promocoes: Promocao[] = [];
  lojas: Loja[] = [];
  produtos: Produto[] = [];
  colecoes: Colecao[] = [];
  grupos: GrupoModel[] = [];
  subgrupos: SubgrupoModel[] = [];

  form: Promocao = this.novaPromocao();

  tipos: Array<{ value: PromocaoTipo; label: string }> = [
    { value: 'DESCONTO_PERCENTUAL', label: 'Desconto %' },
    { value: 'DESCONTO_VALOR', label: 'Desconto R$' },
    { value: 'PRECO_FIXO', label: 'Preço fixo' },
  ];

  escopos: Array<{ value: PromocaoEscopo; label: string }> = [
    { value: 'PRODUTO', label: 'Produto' },
    { value: 'GRUPO', label: 'Grupo' },
    { value: 'SUBGRUPO', label: 'Subgrupo' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    forkJoin({
      promocoes: this.promocoesApi.list(),
      lojas: this.lojasApi.list({ page_size: 100 }),
      produtos: this.produtosApi.list({ ativo: 'true', tipo_produto: '1', page_size: 500 }),
      colecoes: this.colecoesApi.list(),
      grupos: this.gruposApi.list({ page_size: 200 }),
      subgrupos: this.subgruposApi.list(),
    }).subscribe({
      next: data => {
        this.promocoes = this.unwrap<Promocao>(data.promocoes);
        this.lojas = this.unwrap<Loja>(data.lojas);
        this.produtos = this.unwrap<Produto>(data.produtos);
        this.colecoes = this.unwrap<Colecao>(data.colecoes);
        this.grupos = this.unwrap<GrupoModel>(data.grupos);
        this.subgrupos = this.unwrap<SubgrupoModel>(data.subgrupos);
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar promoções.';
      }
    });
  }

  novo(forcar = false): void {
    if (!forcar && !this.podeEditarModulo) return;
    this.editingId = null;
    this.consultando = false;
    this.form = this.novaPromocao();
    this.todasLojas = true;
    this.produtoBusca = '';
    this.produtoAdicionarId = null;
    this.successMsg = '';
    this.errorMsg = '';
  }

  editar(promocao: Promocao, modoConsulta = false): void {
    if (!modoConsulta && !this.podeEditarModulo) return;
    this.editingId = promocao.Idpromocao ?? null;
    this.consultando = modoConsulta;
    this.form = {
      ...promocao,
      lojas: [...(promocao.lojas ?? [])],
      produtos: [...(promocao.produtos ?? [])],
      colecoes: [...(promocao.colecoes ?? [])],
      grupos: [...(promocao.grupos ?? [])],
      subgrupos: [...(promocao.subgrupos ?? [])],
    };
    this.todasLojas = !this.form.lojas?.length;
    this.produtoBusca = '';
    this.produtoAdicionarId = null;
  }

  consultar(promocao: Promocao): void {
    this.editar(promocao, true);
  }

  salvar(): void {
    if (!this.podeEditarModulo) return;
    if (this.consultando) return;
    const erro = this.validar();
    if (erro) {
      this.errorMsg = erro;
      return;
    }
    this.saving = true;
    const payload = this.payload();
    const req = this.editingId
      ? this.promocoesApi.update(this.editingId, payload)
      : this.promocoesApi.create(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Promoção salva.';
        this.errorMsg = '';
        this.novo();
        this.load();
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Falha ao salvar promoção.';
      }
    });
  }

  excluir(promocao: Promocao): void {
    if (!this.podeEditarModulo) return;
    const id = promocao.Idpromocao;
    if (!id) return;
    this.excluirModal = promocao;
  }

  confirmarExclusao(): void {
    if (!this.podeEditarModulo) return;
    const promocao = this.excluirModal;
    const id = promocao?.Idpromocao;
    if (!id) return;
    this.promocoesApi.remove(id).subscribe({
      next: () => {
        this.excluirModal = null;
        this.successMsg = 'Promoção excluída.';
        this.load();
      },
      error: () => this.errorMsg = 'Falha ao excluir promoção.'
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  toggleLista(field: keyof Promocao, id: number | undefined): void {
    if (!this.podeEditarModulo) return;
    if (this.consultando) return;
    if (!id) return;
    const atual = [...((this.form[field] as number[] | undefined) ?? [])];
    const index = atual.indexOf(id);
    if (index >= 0) atual.splice(index, 1);
    else atual.push(id);
    (this.form as any)[field] = atual;
  }

  selecionado(field: keyof Promocao, id: number | undefined): boolean {
    return !!id && (((this.form[field] as number[] | undefined) ?? []).includes(id));
  }

  alternarTodasLojas(): void {
    if (!this.podeEditarModulo) return;
    if (this.consultando) return;
    if (this.todasLojas) this.form.lojas = [];
  }

  alterarEscopo(): void {
    if (!this.podeEditarModulo) return;
    if (this.consultando) return;
    this.form.produtos = [];
    this.form.colecoes = [];
    this.form.grupos = [];
    this.form.subgrupos = [];
    this.produtoBusca = '';
    this.produtoAdicionarId = null;
  }

  get produtosBusca(): Produto[] {
    const q = this.produtoBusca.trim().toLowerCase();
    const ids = new Set(this.form.produtos ?? []);
    const base = this.produtos.filter(produto => !ids.has(produto.Idproduto ?? 0));
    if (!q) return base.slice(0, 20);
    return base.filter(produto =>
      String(produto.Idproduto || '').includes(q) ||
      String(produto.referencia || '').toLowerCase().includes(q) ||
      String(produto.descricao || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }

  get produtoSearchSuggestions(): string[] {
    const valores = this.produtos.flatMap(produto => [
      produto.descricao,
      produto.descricao_reduzida,
      produto.referencia,
      String(produto.Idproduto || '')
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  get produtosSelecionados(): Produto[] {
    const ids = new Set(this.form.produtos ?? []);
    return this.produtos.filter(produto => ids.has(produto.Idproduto ?? 0));
  }

  adicionarProduto(): void {
    if (!this.podeEditarModulo) return;
    if (this.consultando) return;
    if (!this.produtoAdicionarId) return;
    const atual = [...(this.form.produtos ?? [])];
    if (!atual.includes(this.produtoAdicionarId)) atual.push(this.produtoAdicionarId);
    this.form.produtos = atual;
    this.produtoAdicionarId = null;
    this.produtoBusca = '';
  }

  removerProduto(id: number | undefined): void {
    if (!this.podeEditarModulo) return;
    if (this.consultando) return;
    if (!id) return;
    this.form.produtos = (this.form.produtos ?? []).filter(item => item !== id);
  }

  escopoLabel(value: string): string {
    return this.escopos.find(e => e.value === value)?.label ?? value;
  }

  tipoLabel(value: string): string {
    return this.tipos.find(t => t.value === value)?.label ?? value;
  }

  private payload(): Promocao {
    const payload = { ...this.form };
    if (this.todasLojas) payload.lojas = [];
    if (payload.escopo !== 'PRODUTO') payload.produtos = [];
    if (payload.escopo !== 'COLECAO') payload.colecoes = [];
    if (payload.escopo !== 'GRUPO') payload.grupos = [];
    if (payload.escopo !== 'SUBGRUPO') payload.subgrupos = [];
    return payload;
  }

  private validar(): string {
    if (!this.form.nome.trim()) return 'Informe o nome da promoção.';
    if (!this.form.data_inicio) return 'Informe a data inicial.';
    if (Number(this.form.valor || 0) <= 0) return 'Informe o valor da promoção.';
    if (this.form.tipo === 'DESCONTO_PERCENTUAL' && Number(this.form.valor) > 100) return 'Desconto percentual não pode passar de 100%.';
    if (this.form.escopo === 'PRODUTO' && !(this.form.produtos ?? []).length) return 'Inclua ao menos um produto.';
    if (this.form.escopo === 'GRUPO' && !(this.form.grupos ?? []).length) return 'Selecione ao menos um grupo.';
    if (this.form.escopo === 'SUBGRUPO' && !(this.form.subgrupos ?? []).length) return 'Selecione ao menos um subgrupo.';
    return '';
  }

  private novaPromocao(): Promocao {
    const hoje = new Date().toISOString().slice(0, 10);
    return {
      nome: '',
      ativo: true,
      data_inicio: hoje,
      data_fim: null,
      tipo: 'DESCONTO_PERCENTUAL',
      valor: 10,
      escopo: 'PRODUTO',
      prioridade: 10,
      acumula_cashback: true,
      observacao: '',
      lojas: [],
      produtos: [],
      colecoes: [],
      grupos: [],
      subgrupos: [],
    };
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }
}
