import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FichaTecnica, FichaTecnicaItem, FichaTecnicaItemTipo } from '../../core/models/ficha-tecnica';
import { Produto } from '../../core/models/produto';
import { Fornecedor } from '../../core/models/fornecedor';
import { Unidade } from '../../core/models/unidade';
import { FichaTecnicaService } from '../../core/services/ficha-tecnica.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-ficha-tecnica',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ficha-tecnica.component.html',
  styleUrls: ['./ficha-tecnica.component.css'],
})
export class FichaTecnicaComponent implements OnInit {
  private api = inject(FichaTecnicaService);
  private produtosApi = inject(ProdutosService);
  private fornecedoresApi = inject(FornecedoresService);
  private unidadesApi = inject(UnidadesService);
  private auth = inject(AuthService);

  loading = false;
  saving = false;
  search = '';
  successMsg = '';
  errorMsg = '';

  fichas: FichaTecnica[] = [];
  produtosProprios: Produto[] = [];
  insumos: Produto[] = [];
  fornecedores: Fornecedor[] = [];
  unidades: Unidade[] = [];
  private unidadeMap = new Map<number, Unidade>();

  fichaAtual: FichaTecnica | null = null;
  form: Partial<FichaTecnica> = this.blankFicha();
  itemForm: Partial<FichaTecnicaItem> = this.blankItem();

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('producao', true) !== false;
  }

  ngOnInit(): void {
    this.loadOptions();
    this.load();
  }

  loadOptions(): void {
    this.produtosApi.list({ tipo_produto: '3', ativo: 'true', page_size: 500 }).subscribe({
      next: res => this.produtosProprios = this.unwrap<Produto>(res),
      error: () => this.produtosProprios = [],
    });
    this.produtosApi.list({ tipo_produto: '2,4', ativo: 'true', page_size: 1000 }).subscribe({
      next: res => this.insumos = this.unwrap<Produto>(res),
      error: () => this.insumos = [],
    });
    this.fornecedoresApi.list({ page_size: 1000 }).subscribe({
      next: res => this.fornecedores = this.unwrap<Fornecedor>(res),
      error: () => this.fornecedores = [],
    });
    this.unidadesApi.list({ page_size: 1000, ordering: 'Descricao' }).subscribe({
      next: res => {
        this.unidades = this.unwrap<Unidade>(res);
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

  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 200 }).subscribe({
      next: res => {
        this.fichas = this.unwrap<FichaTecnica>(res);
        if (this.fichaAtual?.id) {
          const atualizada = this.fichas.find(f => f.id === this.fichaAtual?.id);
          if (atualizada) this.selectFicha(atualizada, false);
        }
      },
      error: () => this.showError('Falha ao carregar fichas técnicas.'),
      complete: () => this.loading = false,
    });
  }

  nova(): void {
    this.fichaAtual = null;
    this.form = this.blankFicha();
    this.itemForm = this.blankItem();
    this.clearMsgs();
  }

  selectFicha(ficha: FichaTecnica, clear = true): void {
    this.fichaAtual = ficha;
    this.form = { ...ficha };
    this.itemForm = this.blankItem();
    if (clear) this.clearMsgs();
  }

  salvarFicha(): void {
    if (!this.podeEditarModulo) {
      this.showError('Seu usuário tem acesso apenas para consulta em produção.');
      return;
    }
    if (!this.form.produto_final) {
      this.showError('Informe o produto próprio da ficha.');
      return;
    }
    this.saving = true;
    const body: Partial<FichaTecnica> = {
      produto_final: Number(this.form.produto_final),
      versao: String(this.form.versao || '1'),
      descricao: this.form.descricao || null,
      rendimento: this.round2(this.form.rendimento || 1),
      status: this.form.status || 'RASCUNHO',
      ativa: this.form.ativa !== false,
      observacoes: this.form.observacoes || null,
    };
    const req = this.fichaAtual?.id ? this.api.update(this.fichaAtual.id, body) : this.api.create(body);
    req.subscribe({
      next: ficha => {
        this.showSuccess(this.fichaAtual?.id ? 'Ficha técnica atualizada.' : 'Ficha técnica criada.');
        this.fichaAtual = ficha;
        this.form = { ...ficha };
        this.load();
      },
      error: err => {
        this.showError(this.errorText(err, 'Não foi possível salvar a ficha técnica.'));
        this.saving = false;
      },
      complete: () => this.saving = false,
    });
  }

  adicionarItem(): void {
    if (!this.podeEditarModulo) {
      this.showError('Seu usuário tem acesso apenas para consulta em produção.');
      return;
    }
    if (!this.fichaAtual?.id) {
      this.showError('Salve a ficha técnica antes de incluir itens.');
      return;
    }
    if (!this.itemForm.quantidade || Number(this.itemForm.quantidade) <= 0) {
      this.showError('Informe a quantidade do item.');
      return;
    }
    const tipo = (this.itemForm.tipo || 'INSUMO') as FichaTecnicaItemTipo;
    if (!this.validarQuantidadePorUnidade(tipo)) {
      return;
    }
    const body: Partial<FichaTecnicaItem> = {
      ficha: this.fichaAtual.id,
      tipo,
      produto: tipo === 'SERVICO' ? null : Number(this.itemForm.produto || 0) || null,
      fornecedor: tipo === 'SERVICO' ? Number(this.itemForm.fornecedor || 0) || null : (Number(this.itemForm.fornecedor || 0) || null),
      descricao: this.itemForm.descricao || null,
      quantidade: this.round2(this.itemForm.quantidade || 0),
      perda_percentual: this.round2(this.itemForm.perda_percentual || 0),
      custo_unitario_previsto: this.round2(this.itemForm.custo_unitario_previsto || 0),
      observacoes: this.itemForm.observacoes || null,
      ordem: Number(this.itemForm.ordem || ((this.fichaAtual.itens?.length || 0) + 1)),
    };
    this.api.createItem(body).subscribe({
      next: () => {
        this.showSuccess('Item incluído na ficha.');
        this.itemForm = this.blankItem();
        this.load();
      },
      error: err => this.showError(this.errorText(err, 'Não foi possível incluir o item.')),
    });
  }

  removerItem(item: FichaTecnicaItem): void {
    if (!this.podeEditarModulo) {
      this.showError('Seu usuário tem acesso apenas para consulta em produção.');
      return;
    }
    if (!item.id) return;
    this.api.removeItem(item.id).subscribe({
      next: () => {
        this.showSuccess('Item removido.');
        this.load();
      },
      error: () => this.showError('Não foi possível remover o item.'),
    });
  }

  aprovar(): void {
    if (!this.podeEditarModulo) {
      this.showError('Seu usuário tem acesso apenas para consulta em produção.');
      return;
    }
    if (!this.fichaAtual?.id) return;
    this.api.aprovar(this.fichaAtual.id).subscribe({
      next: ficha => {
        this.showSuccess('Ficha técnica aprovada.');
        this.selectFicha(ficha, false);
        this.load();
      },
      error: err => this.showError(this.errorText(err, 'Não foi possível aprovar a ficha.')),
    });
  }

  produtoLabel(id?: number | null): string {
    const produto = this.produtosProprios.find(p => p.Idproduto === Number(id)) || this.insumos.find(p => p.Idproduto === Number(id));
    return produto ? `${produto.referencia || produto.Idproduto} - ${produto.descricao}` : '';
  }

  fornecedorLabel(id?: number | null): string {
    const fornecedor = this.fornecedores.find(f => f.id === Number(id));
    return fornecedor ? `${fornecedor.apelido || fornecedor.nome_fornecedor}` : '';
  }

  fornecedoresDoItem(): Fornecedor[] {
    if (this.itemForm.tipo === 'SERVICO') {
      return this.fornecedores.filter(f => String(f.categoria || '').toUpperCase() === 'FACCAO');
    }
    return this.fornecedores;
  }

  unidadeSelecionadaLabel(): string {
    const unidade = this.unidadeDoProduto(Number(this.itemForm.produto || 0));
    if (!unidade) return '';
    return `${unidade.Descricao}${unidade.permite_decimal ? ' - aceita decimal' : ' - somente inteiro'}`;
  }

  formatMoney(value: any): string {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatQtd(value: any): string {
    return Number(value || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  private blankFicha(): Partial<FichaTecnica> {
    return { produto_final: undefined as any, versao: '1', rendimento: 1, status: 'RASCUNHO', ativa: true };
  }

  private blankItem(): Partial<FichaTecnicaItem> {
    return { tipo: 'INSUMO', quantidade: 1, perda_percentual: 0, custo_unitario_previsto: 0 };
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results || []);
  }

  private unidadeDoProduto(produtoId?: number | null): Unidade | null {
    if (!produtoId) return null;
    const produto = this.insumos.find(p => p.Idproduto === Number(produtoId));
    const unidadeId = Number(produto?.unidade || 0);
    return unidadeId ? (this.unidadeMap.get(unidadeId) || null) : null;
  }

  private validarQuantidadePorUnidade(tipo: FichaTecnicaItemTipo): boolean {
    if (tipo === 'SERVICO') return true;
    const unidade = this.unidadeDoProduto(Number(this.itemForm.produto || 0));
    const quantidade = Number(this.itemForm.quantidade || 0);
    if (unidade && !unidade.permite_decimal && !Number.isInteger(quantidade)) {
      this.showError(`A unidade ${unidade.Descricao} não aceita quantidade decimal.`);
      return false;
    }
    return true;
  }

  private round2(value: any): number {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  private clearMsgs(): void {
    this.successMsg = '';
    this.errorMsg = '';
  }

  private showSuccess(msg: string): void {
    this.successMsg = msg;
    this.errorMsg = '';
  }

  private showError(msg: string): void {
    this.errorMsg = msg;
    this.successMsg = '';
  }

  private errorText(err: any, fallback: string): string {
    const detail = err?.error?.detail;
    if (detail) return String(detail);
    const fieldLabels: Record<string, string> = {
      empresa: 'Empresa',
      produto_final: 'Produto próprio',
      versao: 'Versão',
      rendimento: 'Rendimento',
      ficha: 'Ficha técnica',
      produto: 'Produto/Insumo',
      fornecedor: 'Fornecedor/Facção',
      quantidade: 'Quantidade',
    };
    const firstEntry = err?.error && Object.entries(err.error)[0] as [string, any] | undefined;
    if (firstEntry) {
      const [field, value] = firstEntry;
      const label = fieldLabels[field] || field;
      const msg = Array.isArray(value) ? value[0] : value;
      return `${label}: ${msg}`;
    }
    return fallback;
  }
}
